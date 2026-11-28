import assert from 'node:assert/strict'
import test from 'node:test'
import { parseTransactionExtraction } from '../src/lib/ai/schemas.ts'
import { localTransactionSchema } from '../src/lib/db/schema.ts'
import { amountToMinor } from '../src/lib/db/transactionRepository.ts'
import {
  calculateLocalMetrics,
  filterByDateWindow,
  filterLocalTransactions,
  getDateWindow,
  getPreviousDateWindow,
  sumByCurrency,
} from '../src/lib/finance/localTransactionAnalytics.ts'
import { findPotentialDuplicates } from '../src/lib/finance/transactionDuplicates.ts'
import { transactionsToCsv } from '../src/lib/finance/transactionCsv.ts'
import {
  createTransactionDraft,
  validateTransactionDraft,
} from '../src/features/transactions/transactionDrafts.ts'
import {
  formatDateOnly,
  getCountryTimeZoneDefault,
  getReferenceDateContext,
  isValidTimeZone,
  normalizeBusinessTimeZone,
  normalizeTimeZone,
  resolveBusinessTimeZone,
} from '../src/lib/time/timezone.ts'

function localTransaction(overrides = {}) {
  return localTransactionSchema.parse({
    id: 'tx-1',
    ownerId: 'owner-a',
    businessId: 'business-a',
    type: 'expense',
    amountMinor: 1250,
    currency: 'MAD',
    category: 'inventory',
    description: 'Market supplies',
    transactionDate: '2026-03-10',
    source: 'manual',
    createdAt: 1,
    updatedAt: 1,
    schemaVersion: 1,
    ...overrides,
  })
}

test('extraction drafts require explicit resolution of currency, dates, and warnings', () => {
  const parsed = parseTransactionExtraction(
    JSON.stringify({
      transactions: [{
        type: 'expense',
        amount: 125.5,
        currency: null,
        category: 'stock',
        description: 'Market supplies',
        date: null,
        missingInformation: ['Clarify the currency.'],
      }],
    }),
    'Paid 125.50 FCFA for market supplies.',
  )
  assert.equal(parsed.success, true)
  if (!parsed.success) return

  const [draft] = parsed.transactions.map((item) => createTransactionDraft(item, 'en'))
  assert.ok(draft)
  assert.ok(validateTransactionDraft(draft).errors.includes('currency'))
  assert.ok(validateTransactionDraft(draft).errors.includes('transactionDate'))
  assert.ok(validateTransactionDraft(draft).errors.includes('warnings'))

  const resolved = {
    ...draft,
    currency: 'MAD',
    transactionDate: '2026-03-10',
    warningsReviewed: true,
  }
  const validation = validateTransactionDraft(resolved)
  assert.deepEqual(validation.errors, [])
  assert.equal(validation.input?.amountMinor, 12550)
})

test('minor-unit precision is enforced for zero- and two-decimal currencies', () => {
  assert.equal(amountToMinor(123.45, 'EUR'), 12345)
  assert.equal(amountToMinor(123, 'XOF'), 123)
  assert.throws(() => amountToMinor(123.5, 'XAF'), /requires 0 decimal/)
  assert.throws(() => amountToMinor(12.345, 'MAD'), /requires 2 decimal/)
})

test('local analytics preserve currency separation and inclusive local date boundaries', () => {
  const records = [
    localTransaction({ id: 'a', amountMinor: 10000, type: 'income', transactionDate: '2026-03-04' }),
    localTransaction({ id: 'b', amountMinor: 2500, transactionDate: '2026-03-10' }),
    localTransaction({ id: 'c', amountMinor: 5000, currency: 'EUR', type: 'income', transactionDate: '2026-03-10' }),
    localTransaction({ id: 'd', transactionDate: '2026-03-03' }),
  ]
  const window = getDateWindow('7-days', new Date(2026, 2, 10, 12))
  assert.deepEqual(window, { start: '2026-03-04', end: '2026-03-10' })
  assert.deepEqual(filterByDateWindow(records, window).map(({ id }) => id), ['a', 'b', 'c'])
  const byCurrency = sumByCurrency(records)
  assert.equal(byCurrency.get('MAD')?.netMinor, 6250)
  assert.equal(byCurrency.get('EUR')?.netMinor, 5000)
  assert.equal(calculateLocalMetrics([]).netMinor, 0)
})

test('period comparisons cover the previous equivalent window without crossing date boundaries', () => {
  assert.deepEqual(
    getPreviousDateWindow('7-days', new Date(2026, 0, 10, 12)),
    { start: '2025-12-28', end: '2026-01-03' },
  )
  assert.deepEqual(
    getPreviousDateWindow('current-month', new Date(2026, 2, 31, 12)),
    { start: '2026-02-01', end: '2026-02-28' },
  )
})

test('business timezone determines date-only period boundaries', () => {
  const window = getDateWindow(
    '7-days',
    new Date('2026-03-10T02:00:00.000Z'),
    'America/Los_Angeles',
  )
  assert.deepEqual(window, { start: '2026-03-03', end: '2026-03-09' })
})

test('known business timezones and the legacy Morocco alias normalize safely', () => {
  assert.equal(isValidTimeZone('Africa/Casablanca'), true)
  assert.equal(normalizeTimeZone('Africa/Rabat'), 'Africa/Casablanca')
  assert.deepEqual(resolveBusinessTimeZone('Africa/Rabat', 'Morocco'), {
    timeZone: 'Africa/Casablanca',
    source: 'legacy-alias',
  })
  assert.equal(getCountryTimeZoneDefault('Cameroon'), 'Africa/Douala')
  assert.equal(getCountryTimeZoneDefault('Senegal'), 'Africa/Dakar')
  assert.equal(getCountryTimeZoneDefault('Côte d’Ivoire'), 'Africa/Abidjan')
  assert.equal(getCountryTimeZoneDefault('France'), 'Europe/Paris')
  assert.equal(normalizeTimeZone('UTC'), 'UTC')
})

test('missing and unknown timezones only use explicit validated defaults', () => {
  assert.equal(resolveBusinessTimeZone(undefined), undefined)
  assert.equal(resolveBusinessTimeZone(undefined, 'Cameroon')?.timeZone, 'Africa/Douala')
  assert.equal(resolveBusinessTimeZone('Invalid/Timezone', 'Unknown country'), undefined)
  assert.equal(resolveBusinessTimeZone('Invalid/Timezone', 'France')?.timeZone, 'Europe/Paris')
  assert.throws(
    () => getReferenceDateContext('Invalid/Timezone', 'Unknown country', new Date('2026-01-15T12:00:00Z')),
    /invalid and has no known country default/,
  )
  const deviceContext = getReferenceDateContext(undefined, undefined, new Date('2026-01-15T12:00:00Z'))
  assert.equal(isValidTimeZone(deviceContext.timeZone), true)
})

test('legacy business timezone remains usable for text and receipt date context', () => {
  const cachedBusinessProfile = {
    country: 'Morocco',
    timezone: 'Africa/Rabat',
  }
  assert.equal(
    normalizeBusinessTimeZone(cachedBusinessProfile.timezone, cachedBusinessProfile.country),
    'Africa/Casablanca',
  )

  const referenceInstant = new Date('2026-01-15T23:30:00.000Z')
  for (const captureKind of ['text', 'receipt']) {
    const context = getReferenceDateContext('Africa/Rabat', 'Morocco', referenceInstant)
    assert.equal(context.timeZone, 'Africa/Casablanca', captureKind)
    assert.equal(context.referenceDate, '2026-01-16', captureKind)
    assert.equal(context.source, 'legacy-alias', captureKind)
  }
})

test('business-local date formatting respects midnight boundaries in supported zones', () => {
  const instant = new Date('2026-01-15T23:30:00.000Z')
  assert.equal(formatDateOnly(instant, 'Africa/Casablanca'), '2026-01-16')
  assert.equal(formatDateOnly(instant, 'Africa/Douala'), '2026-01-16')
  assert.equal(formatDateOnly(instant, 'Africa/Dakar'), '2026-01-15')
  assert.equal(formatDateOnly(instant, 'Europe/Paris'), '2026-01-16')
  assert.equal(formatDateOnly(instant, 'UTC'), '2026-01-15')
  assert.equal(normalizeBusinessTimeZone('Invalid/Timezone', 'Unknown country'), '')
})

test('transaction filters search metadata and constrain amount ranges to a selected currency', () => {
  const records = [
    localTransaction({ id: 'small', amountMinor: 5000, notes: 'weekly restock' }),
    localTransaction({ id: 'large', amountMinor: 15000, merchant: 'Kora Market' }),
    localTransaction({ id: 'euro', currency: 'EUR', amountMinor: 10000 }),
  ]
  const filtered = filterLocalTransactions(records, {
    search: 'kora',
    type: 'all',
    category: '',
    currency: 'MAD',
    fromDate: '',
    toDate: '',
    sort: 'date-desc',
  })
  assert.deepEqual(filtered.map(({ id }) => id), ['large'])

  const byAmount = filterLocalTransactions(records, {
    search: '',
    type: 'all',
    category: '',
    currency: 'MAD',
    fromDate: '',
    toDate: '',
    minAmountMinor: 10000,
    sort: 'amount-desc',
  })
  assert.deepEqual(byAmount.map(({ id }) => id), ['large'])
})

test('duplicate detection warns only for same-scope matching records and never removes them', () => {
  const existing = localTransaction()
  const duplicateInput = {
    type: existing.type,
    amountMinor: existing.amountMinor,
    currency: existing.currency,
    category: existing.category,
    description: '  MARKET   supplies ',
    transactionDate: existing.transactionDate,
    source: 'ai',
  }
  const duplicate = findPotentialDuplicates(
    [{ id: 'proposal-1', input: duplicateInput }],
    [existing, { ...existing, id: 'other-owner', ownerId: 'owner-b' }],
    'owner-a',
    'business-a',
  )
  assert.deepEqual([...duplicate], ['proposal-1'])

  const repeated = findPotentialDuplicates(
    [
      { id: 'proposal-1', input: duplicateInput },
      { id: 'proposal-2', input: { ...duplicateInput, description: 'market supplies' } },
    ],
    [],
    'owner-a',
    'business-a',
  )
  assert.deepEqual([...repeated].sort(), ['proposal-1', 'proposal-2'])
})

test('CSV export preserves French text and prefixes spreadsheet formula content', () => {
  const csv = transactionsToCsv([
    localTransaction({
      description: '=HYPERLINK("https://example.invalid","ouvrir")',
      category: 'inventory',
      notes: '@SUM(1,1)',
    }),
  ], 'fr')
  assert.ok(csv.startsWith('\uFEFF'))
  assert.ok(csv.includes('Catégorie'))
  assert.ok(csv.includes('Stock'))
  assert.ok(csv.includes(`"'=HYPERLINK(""https://example.invalid"",""ouvrir"")"`))
  assert.ok(csv.includes("'@SUM(1,1)"))
})

import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  calculateDashboardMetrics,
  calculateDocumentationReadiness,
  filterTransactionsByRange,
  formatCurrency,
  groupExpensesByCategory,
  groupMonthlyCashFlow,
} from '../src/lib/finance/calculations.ts'
import {
  createDemoRepository,
  DemoRepositoryError,
  DemoTransactionInputSchema,
} from '../src/demo/repository.ts'
import { onboardingSchema } from '../src/demo/validation/onboardingSchema.ts'

const sampleTransactions = [
  {
    id: 'income-1',
    date: '2026-03-15',
    type: 'income',
    description: 'Market sales',
    category: 'Sales',
    amount: 1200,
    currency: 'MAD',
  },
  {
    id: 'expense-1',
    date: '2026-02-14',
    type: 'expense',
    description: 'Stock purchase',
    category: 'Inventory',
    amount: 450,
    currency: 'MAD',
  },
  {
    id: 'expense-2',
    date: '2026-01-03',
    type: 'expense',
    description: 'Transport',
    category: 'Transport',
    amount: 80,
    currency: 'MAD',
  },
]

class MemoryStorage {
  values = new Map()
  getItem(key) { return this.values.get(key) ?? null }
  setItem(key, value) { this.values.set(key, value) }
  removeItem(key) { this.values.delete(key) }
}

test('dashboard calculations derive income, expenses, and net cash flow from records', () => {
  assert.deepEqual(calculateDashboardMetrics(sampleTransactions), {
    income: 1200,
    expenses: 530,
    netCashFlow: 670,
    transactionCount: 3,
  })

  assert.deepEqual(groupMonthlyCashFlow(sampleTransactions).map(({ month, net }) => ({
    month,
    net,
  })), [
    { month: '2026-01', net: -80 },
    { month: '2026-02', net: -450 },
    { month: '2026-03', net: 1200 },
  ])
})

test('date range filtering uses the supplied current date and includes the boundary day', () => {
  const filtered = filterTransactionsByRange(
    sampleTransactions,
    '30-days',
    new Date('2026-03-15T12:00:00.000Z'),
  )
  assert.deepEqual(filtered.map((item) => item.id), ['income-1', 'expense-1'])
  assert.equal(
    filterTransactionsByRange(sampleTransactions, 'year', new Date('2026-03-15T00:00:00.000Z')).length,
    3,
  )
})

test('expense categories are aggregated and sorted by amount', () => {
  const result = groupExpensesByCategory(sampleTransactions)
  assert.deepEqual(result, [
    { category: 'Inventory', amount: 450 },
    { category: 'Transport', amount: 80 },
  ])
})

test('currency formatting uses the requested locale and does not convert values', () => {
  assert.match(formatCurrency(1250, 'MAD', 'en'), /MAD/)
  assert.match(formatCurrency(1250, 'MAD', 'fr'), /MAD/)
})

test('documentation readiness is based on explicit record completeness, not a credit score', () => {
  const readiness = calculateDocumentationReadiness(sampleTransactions)
  assert.equal(readiness.percent, 75)
  assert.equal(readiness.total, 4)
  assert.equal(readiness.checks.some((check) => check.label.toLowerCase().includes('score')), false)
})

test('demo repository creates, edits, deletes, resets, and atomically validates records', () => {
  const storage = new MemoryStorage()
  const seed = [sampleTransactions[0]]
  const repository = createDemoRepository(storage, seed)

  assert.deepEqual(repository.list(), seed)
  const created = repository.create({
    date: '2026-04-02',
    type: 'expense',
    description: 'Paper bags',
    category: 'Packaging',
    amount: 35,
    currency: 'MAD',
  })
  assert.equal(repository.list().length, 2)

  const updated = repository.update(created.id, {
    date: '2026-04-03',
    type: 'expense',
    description: 'Recycled paper bags',
    category: 'Packaging',
    amount: 42,
    currency: 'MAD',
  })
  assert.equal(updated.amount, 42)
  repository.remove(created.id)
  assert.equal(repository.list().length, 1)

  assert.throws(() => repository.createMany([
    {
      date: '2026-04-04',
      type: 'income',
      description: 'Good order',
      category: 'Sales',
      amount: 100,
      currency: 'MAD',
    },
    {
      date: '2026-04-04',
      type: 'expense',
      description: 'Invalid amount',
      category: 'Fees',
      amount: -1,
      currency: 'MAD',
    },
  ]), DemoRepositoryError)
  assert.equal(repository.list().length, 1)
  assert.equal(repository.reset().length, 1)
})

test('transaction and onboarding forms reject invalid and unsafe defaults', () => {
  assert.equal(
    DemoTransactionInputSchema.safeParse({
      date: '2026-04-01',
      type: 'expense',
      description: 'Supplies',
      category: 'Stock',
      amount: 50,
      currency: 'MAD',
    }).success,
    true,
  )
  assert.equal(
    DemoTransactionInputSchema.safeParse({
      date: 'not-a-date',
      type: 'expense',
      description: 'Supplies',
      category: 'Stock',
      amount: -50,
      currency: 'USD',
    }).success,
    false,
  )
  const onboarding = {
    businessName: 'Sample shop',
    sector: 'Retail',
    businessType: 'sole-trader',
    country: 'Morocco',
    currency: 'MAD',
    goals: ['track-finances'],
    cloudEducationConsent: false,
    cloudSyncConsent: false,
  }
  assert.equal(onboardingSchema.safeParse(onboarding).success, true)
  assert.equal(
    onboardingSchema.safeParse({ ...onboarding, cloudSyncConsent: true }).success,
    false,
  )
})

test('corrupt local demo data is surfaced rather than silently replaced', () => {
  const storage = new MemoryStorage()
  const repository = createDemoRepository(storage, [sampleTransactions[0]])
  repository.list()
  storage.setItem('creditbridge.demo.transactions.v1', '{invalid')
  assert.throws(() => repository.list(), DemoRepositoryError)
})

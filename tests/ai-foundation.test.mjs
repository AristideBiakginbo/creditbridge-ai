import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  PrivacyPolicyViolation,
  runUnderPrivacyPolicy,
} from '../src/lib/ai/privacyPolicy.ts'
import {
  getPlaygroundScenario,
  playgroundScenarios,
} from '../src/lib/ai/scenarios.ts'
import { parseTransactionExtraction } from '../src/lib/ai/schemas.ts'

const transaction = (overrides = {}) => ({
  type: 'expense',
  amount: 125,
  currency: 'XAF',
  category: 'stock',
  description: 'Market supplies',
  date: '2025-01-12',
  missingInformation: [],
  ...overrides,
})

test('sensitive cloud inference is blocked before the model callback runs', async () => {
  let modelCalls = 0

  await assert.rejects(
    runUnderPrivacyPolicy(
      {
        classification: 'financial_transactions',
        mode: 'only_in_cloud',
        cloudConsent: true,
      },
      async () => {
        modelCalls += 1
      },
    ),
    (error) => {
      assert.ok(error instanceof PrivacyPolicyViolation)
      assert.equal(error.code, 'SENSITIVE_DATA_ON_DEVICE_ONLY')
      return true
    },
  )

  assert.equal(modelCalls, 0)
})

test('receipt contents cannot request cloud inference even with consent', async () => {
  let modelCalls = 0
  await assert.rejects(
    runUnderPrivacyPolicy(
      {
        classification: 'receipt_contents',
        mode: 'only_in_cloud',
        cloudConsent: true,
      },
      async () => {
        modelCalls += 1
      },
    ),
    (error) => error?.code === 'SENSITIVE_DATA_ON_DEVICE_ONLY',
  )
  assert.equal(modelCalls, 0)
})

test('cloud-capable inference requires fresh explicit consent', async () => {
  let modelCalls = 0

  await assert.rejects(
    runUnderPrivacyPolicy(
      {
        classification: 'general_education',
        mode: 'prefer_in_cloud',
        cloudConsent: false,
      },
      async () => {
        modelCalls += 1
      },
    ),
    (error) => {
      assert.ok(error instanceof PrivacyPolicyViolation)
      assert.equal(error.code, 'CLOUD_CONSENT_REQUIRED')
      return true
    },
  )

  assert.equal(modelCalls, 0)
})

test('on-device requests allow sensitive information without cloud consent', async () => {
  const result = await runUnderPrivacyPolicy(
    {
      classification: 'financial_transactions',
      mode: 'only_on_device',
      cloudConsent: false,
    },
    async () => 'local-result',
  )

  assert.equal(result, 'local-result')
})

test('transaction extraction validates multiple records', () => {
  const parsed = parseTransactionExtraction(
    JSON.stringify({
      transactions: [
        transaction(),
        transaction({
          type: 'income',
          amount: 800,
          description: 'Retail sale',
          date: null,
        }),
      ],
    }),
    'Two transactions, both in XAF.',
  )

  assert.equal(parsed.success, true)
  if (parsed.success) assert.equal(parsed.transactions.length, 2)
})

test('malformed JSON and invalid transaction shapes are rejected', () => {
  assert.equal(
    parseTransactionExtraction('{broken', 'expense').success,
    false,
  )
  assert.equal(
    parseTransactionExtraction(
      JSON.stringify({ transactions: [transaction({ amount: -1 })] }),
      'expense',
    ).success,
    false,
  )
  assert.equal(
    parseTransactionExtraction(
      JSON.stringify({ transactions: [{ type: 'expense', amount: 10 }] }),
      'expense',
    ).success,
    false,
  )
})

test('ambiguous FCFA is left unresolved unless a business currency is explicit', () => {
  const response = JSON.stringify({ transactions: [transaction()] })
  const unresolved = parseTransactionExtraction(
    response,
    'Paid 500 FCFA for supplies.',
  )

  assert.equal(unresolved.success, true)
  if (unresolved.success) {
    assert.equal(unresolved.transactions[0].currency, null)
    assert.ok(
      unresolved.transactions[0].missingInformation.some((item) =>
        item.includes('Clarify whether FCFA'),
      ),
    )
  }

  const resolved = parseTransactionExtraction(
    response,
    'Paid 500 FCFA for supplies.',
    'XOF',
  )
  assert.equal(resolved.success, true)
  if (resolved.success) {
    assert.equal(resolved.transactions[0].currency, 'XOF')
  }
})

test('education prompts are predefined, non-sensitive, and available in English and French', () => {
  const educationPrompts = playgroundScenarios.filter(
    (scenario) => scenario.kind === 'education',
  )

  assert.equal(educationPrompts.length, 4)
  assert.ok(educationPrompts.every((scenario) =>
    scenario.classification === 'general_education'
      || scenario.classification === 'general_business_guidance',
  ))
  assert.ok(educationPrompts.some((scenario) => scenario.language === 'en'))
  assert.ok(educationPrompts.some((scenario) => scenario.language === 'fr'))
  assert.equal(getPlaygroundScenario('arbitrary-user-prompt'), undefined)
})

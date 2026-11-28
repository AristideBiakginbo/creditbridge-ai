import assert from 'node:assert/strict'
import test from 'node:test'
import {
  amountToMinor,
  minorToAmount,
} from '../src/lib/db/transactionRepository.ts'
import { mapAuthError } from '../src/lib/auth/authErrors.ts'
import { localTransactionSchema } from '../src/lib/db/schema.ts'

test('authentication errors are mapped to safe stable categories', () => {
  assert.equal(mapAuthError(Object.assign(new Error('bad'), { code: 'auth/wrong-password' })).code, 'invalid-credentials')
  assert.equal(mapAuthError(Object.assign(new Error('weak'), { code: 'auth/weak-password' })).code, 'weak-password')
  assert.equal(mapAuthError(Object.assign(new Error('popup'), { code: 'auth/popup-closed-by-user' })).code, 'popup-closed')
})

test('minor-unit conversion preserves currency precision', () => {
  assert.equal(amountToMinor(123.45, 'MAD'), 12345)
  assert.equal(minorToAmount(12345, 'MAD'), 123.45)
  assert.equal(amountToMinor(500, 'XAF'), 500)
  assert.throws(() => amountToMinor(1.001, 'EUR'), /requires 2 decimal/)
  assert.throws(() => amountToMinor(12.5, 'XOF'), /requires 0 decimal/)
})

test('local transaction records require account and business scope', () => {
  const alice = localTransactionSchema.parse({
    id: 'alice-transaction',
    ownerId: 'alice',
    businessId: 'alice-business',
    type: 'expense',
    amountMinor: 1250,
    currency: 'MAD',
    category: 'Supplies',
    description: 'Fictional supplies',
    transactionDate: '2026-01-10',
    source: 'manual',
    createdAt: 1,
    updatedAt: 1,
    schemaVersion: 1,
  })
  const bob = localTransactionSchema.parse({
    id: 'bob-transaction',
    ownerId: 'bob',
    businessId: 'bob-business',
    type: 'income',
    amountMinor: 5000,
    currency: 'MAD',
    category: 'Sales',
    description: 'Fictional sales',
    transactionDate: '2026-01-11',
    source: 'manual',
    createdAt: 1,
    updatedAt: 1,
    schemaVersion: 1,
  })
  assert.notEqual(alice.ownerId, bob.ownerId)
  assert.notEqual(alice.businessId, bob.businessId)
})

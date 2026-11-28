import 'fake-indexeddb/auto'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import test from 'node:test'

const { CreditBridgeDatabase } = await import('../src/lib/db/database.ts')
const { AccountTransactionRepository } = await import('../src/lib/db/transactionRepository.ts')

const transactionInput = {
  type: 'expense',
  amountMinor: 1250,
  currency: 'MAD',
  category: 'Supplies',
  description: 'Fictional supplies',
  transactionDate: '2026-01-10',
  source: 'manual',
}

test('Dexie persists records and isolates accounts and businesses across repository instances', async () => {
  const name = `creditbridge-test-${randomUUID()}`
  let database = new CreditBridgeDatabase(name)
  await database.open()
  try {
    const aliceBusinessA = new AccountTransactionRepository('alice', 'alice-business-a', database)
    const aliceBusinessB = new AccountTransactionRepository('alice', 'alice-business-b', database)
    const bobBusinessA = new AccountTransactionRepository('bob', 'alice-business-a', database)

    const original = await aliceBusinessA.create(transactionInput)
    await aliceBusinessB.create({ ...transactionInput, description: 'Second fictional business' })
    await bobBusinessA.create({ ...transactionInput, description: 'Another account' })

    assert.equal((await aliceBusinessA.list()).length, 1)
    assert.equal((await aliceBusinessB.list()).length, 1)
    assert.equal((await bobBusinessA.list()).length, 1)

    const changed = await aliceBusinessA.update(original.id, {
      ...transactionInput,
      description: 'Updated fictional supplies',
    })
    assert.equal(changed.description, 'Updated fictional supplies')

    database.close()
    database = new CreditBridgeDatabase(name)
    await database.open()
    const reopenedAlice = new AccountTransactionRepository('alice', 'alice-business-a', database)
    const reopenedBob = new AccountTransactionRepository('bob', 'alice-business-a', database)
    assert.equal((await reopenedAlice.list())[0]?.description, 'Updated fictional supplies')
    assert.equal((await reopenedBob.list()).length, 1)

    await assert.rejects(
      new AccountTransactionRepository('alice', 'alice-business-b', database).remove(original.id),
      /not available/,
    )
    await reopenedAlice.remove(original.id)
    assert.equal((await reopenedAlice.list()).length, 0)
    assert.equal((await reopenedBob.list()).length, 1)
  } finally {
    database.close()
    await database.delete()
  }
})

test('local data deletion is limited to the scoped account and does not target another account', async () => {
  const database = new CreditBridgeDatabase(`creditbridge-delete-test-${randomUUID()}`)
  await database.open()
  try {
    const alice = new AccountTransactionRepository('alice', 'alice-business', database)
    const bob = new AccountTransactionRepository('bob', 'bob-business', database)
    await alice.create(transactionInput)
    await bob.create({ ...transactionInput, description: 'Bob fictional supplies' })
    await alice.clearLocalData()
    assert.equal((await alice.list()).length, 0)
    assert.equal((await bob.list()).length, 1)
  } finally {
    database.close()
    await database.delete()
  }
})

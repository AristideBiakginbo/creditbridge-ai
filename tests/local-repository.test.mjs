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
    await alice.createMany([transactionInput], 'alice-batch')
    await bob.createMany([{ ...transactionInput, description: 'Bob fictional supplies' }], 'bob-batch')
    await alice.clearLocalData()
    assert.equal((await alice.list()).length, 0)
    assert.equal((await bob.list()).length, 1)
    assert.equal(await database.batches.where('ownerId').equals('alice').count(), 0)
    assert.equal(await database.batches.where('ownerId').equals('bob').count(), 1)
  } finally {
    database.close()
    await database.delete()
  }
})

test('batch writes are atomic, idempotent, and scoped to the active account and business', async () => {
  const database = new CreditBridgeDatabase(`creditbridge-batch-test-${randomUUID()}`)
  await database.open()
  try {
    const alice = new AccountTransactionRepository('alice', 'alice-business', database)
    const bob = new AccountTransactionRepository('bob', 'bob-business', database)

    const failOnSecondRecord = (_primaryKey, record) => {
      if (record.description === 'Trigger rollback') throw new Error('forced atomic rollback')
    }
    database.transactions.hook('creating', failOnSecondRecord)
    try {
      await assert.rejects(
        alice.createMany([
          transactionInput,
          { ...transactionInput, description: 'Trigger rollback' },
        ], 'rollback-batch'),
        /forced atomic rollback/,
      )
    } finally {
      database.transactions.hook('creating').unsubscribe(failOnSecondRecord)
    }
    assert.equal((await alice.list()).length, 0)
    assert.equal(await database.batches.count(), 0)

    let activeScope = true
    const switchScopeDuringWrite = () => {
      activeScope = false
    }
    database.transactions.hook('creating', switchScopeDuringWrite)
    try {
      await assert.rejects(
        alice.createMany([transactionInput], 'switched-account', () => activeScope),
        /active account changed/,
      )
    } finally {
      database.transactions.hook('creating').unsubscribe(switchScopeDuringWrite)
    }
    assert.equal((await alice.list()).length, 0)
    assert.equal(await database.batches.count(), 0)

    const first = await alice.createMany(
      [transactionInput, { ...transactionInput, description: 'Second fictional expense' }],
      'confirmed-batch',
    )
    assert.equal(first.alreadyCommitted, false)
    assert.equal(first.records.length, 2)
    assert.ok(first.records.every((item) => item.ownerId === 'alice' && item.businessId === 'alice-business'))

    const replay = await alice.createMany(
      [{ ...transactionInput, description: 'Changed retry payload' }],
      'confirmed-batch',
    )
    assert.equal(replay.alreadyCommitted, true)
    assert.deepEqual(
      replay.records.map(({ id }) => id),
      first.records.map(({ id }) => id),
    )
    assert.equal((await alice.list()).length, 2)

    const isolatedBobBatch = await bob.createMany([transactionInput], 'confirmed-batch')
    assert.ok(isolatedBobBatch.records.every((item) => item.ownerId === 'bob' && item.businessId === 'bob-business'))
    assert.equal((await bob.list()).length, 1)

    await assert.rejects(
      bob.createMany([transactionInput], 'confirmed-batch', () => false),
      /active account changed/,
    )
    assert.equal((await bob.list()).length, 1)

    const aliceRecords = await alice.list()
    const bobRecord = (await bob.list())[0]
    assert.ok(bobRecord)
    await assert.rejects(
      alice.removeMany([aliceRecords[0].id, bobRecord.id]),
      /not available/,
    )
    assert.equal((await alice.list()).length, 2)
    assert.equal((await bob.list()).length, 1)
    await alice.removeMany([aliceRecords[0].id])
    assert.equal((await alice.list()).length, 1)
  } finally {
    database.close()
    await database.delete()
  }
})

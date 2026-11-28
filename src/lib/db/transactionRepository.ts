import { creditBridgeDatabase, type CreditBridgeDatabase } from './database.ts'
import { localTransactionSchema, type LocalTransaction, type LocalTransactionInput } from './schema.ts'

export function createId(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `tx-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function amountToMinor(amountMajor: number, currency: 'MAD' | 'XAF' | 'XOF' | 'EUR' | 'USD'): number {
  const precision = currency === 'XAF' || currency === 'XOF' ? 0 : 2
  const factor = 10 ** precision
  if (!Number.isFinite(amountMajor)) throw new Error('Enter a valid amount.')
  const scaled = amountMajor * factor
  const minor = Math.round(scaled)
  if (Math.abs(scaled - minor) > 1e-8) {
    throw new Error(`This currency requires ${precision === 0 ? '0' : '2'} decimal places maximum.`)
  }
  if (!Number.isSafeInteger(minor) || minor <= 0) throw new Error('The amount is outside the supported range.')
  return minor
}

export function minorToAmount(amountMinor: number, currency: 'MAD' | 'XAF' | 'XOF' | 'EUR' | 'USD'): number {
  const precision = currency === 'XAF' || currency === 'XOF' ? 0 : 2
  return amountMinor / (10 ** precision)
}

export interface BatchCreateResult {
  records: LocalTransaction[]
  alreadyCommitted: boolean
}

export class AccountTransactionRepository {
  private readonly ownerId: string
  private readonly businessId: string
  private readonly database: CreditBridgeDatabase

  constructor(
    ownerId: string,
    businessId: string,
    database: CreditBridgeDatabase = creditBridgeDatabase,
  ) {
    this.ownerId = ownerId
    this.businessId = businessId
    this.database = database
    if (!ownerId || !businessId) throw new Error('An authenticated account and business are required.')
  }

  async list(): Promise<LocalTransaction[]> {
    return this.database.transactions
      .where('[ownerId+businessId]')
      .equals([this.ownerId, this.businessId])
      .reverse()
      .sortBy('transactionDate')
  }

  async create(input: LocalTransactionInput): Promise<LocalTransaction> {
    const now = Date.now()
    const record = localTransactionSchema.parse({
      ...input,
      id: createId(),
      ownerId: this.ownerId,
      businessId: this.businessId,
      createdAt: now,
      updatedAt: now,
      schemaVersion: 1,
    })
    await this.database.transactions.add(record)
    return record
  }

  async createMany(
    inputs: LocalTransactionInput[],
    batchId: string,
    isScopeCurrent?: () => boolean,
  ): Promise<BatchCreateResult> {
    if (inputs.length === 0 || inputs.length > 10) {
      throw new Error('Choose between 1 and 10 transactions to save.')
    }
    if (!batchId || batchId.length > 128) {
      throw new Error('A valid capture batch identifier is required.')
    }

    const now = Date.now()
    const records = inputs.map((input) =>
      localTransactionSchema.parse({
        ...input,
        id: createId(),
        ownerId: this.ownerId,
        businessId: this.businessId,
        createdAt: now,
        updatedAt: now,
        schemaVersion: 1,
      }),
    )
    const scopedBatchId = JSON.stringify([this.ownerId, this.businessId, batchId])

    return this.database.transaction(
      'rw',
      this.database.transactions,
      this.database.batches,
      async () => {
        if (isScopeCurrent && !isScopeCurrent()) {
          throw new Error('The active account changed before these transactions could be saved.')
        }
        const existingBatch = await this.database.batches.get(scopedBatchId)
        if (existingBatch) {
          if (
            existingBatch.ownerId !== this.ownerId
            || existingBatch.businessId !== this.businessId
          ) {
            throw new Error('That capture batch is not available in this workspace.')
          }
          const existingRecords = await this.database.transactions.bulkGet(
            existingBatch.transactionIds,
          )
          if (isScopeCurrent && !isScopeCurrent()) {
            throw new Error('The active account changed before these transactions could be saved.')
          }
          return {
            records: existingRecords.filter(
              (record): record is LocalTransaction =>
                Boolean(
                  record
                  && record.ownerId === this.ownerId
                  && record.businessId === this.businessId,
                ),
            ),
            alreadyCommitted: true,
          }
        }

        await this.database.transactions.bulkAdd(records)
        if (isScopeCurrent && !isScopeCurrent()) {
          throw new Error('The active account changed before these transactions could be saved.')
        }
        await this.database.batches.add({
          id: scopedBatchId,
          ownerId: this.ownerId,
          businessId: this.businessId,
          transactionIds: records.map(({ id }) => id),
          createdAt: now,
        })
        if (isScopeCurrent && !isScopeCurrent()) {
          throw new Error('The active account changed before these transactions could be saved.')
        }
        return { records, alreadyCommitted: false }
      },
    )
  }

  async update(id: string, input: LocalTransactionInput): Promise<LocalTransaction> {
    const existing = await this.database.transactions.get(id)
    if (!existing || existing.ownerId !== this.ownerId || existing.businessId !== this.businessId) {
      throw new Error('That transaction is not available in this workspace.')
    }
    const updated = localTransactionSchema.parse({
      ...existing,
      ...input,
      id,
      ownerId: this.ownerId,
      businessId: this.businessId,
      updatedAt: Date.now(),
    })
    await this.database.transactions.put(updated)
    return updated
  }

  async remove(id: string): Promise<void> {
    const existing = await this.database.transactions.get(id)
    if (!existing || existing.ownerId !== this.ownerId || existing.businessId !== this.businessId) {
      throw new Error('That transaction is not available in this workspace.')
    }
    await this.database.transactions.delete(id)
  }

  async removeMany(ids: string[]): Promise<void> {
    const uniqueIds = [...new Set(ids)]
    if (uniqueIds.length === 0) return

    await this.database.transaction('rw', this.database.transactions, async () => {
      const records = await this.database.transactions.bulkGet(uniqueIds)
      if (
        records.some(
          (record) =>
            !record
            || record.ownerId !== this.ownerId
            || record.businessId !== this.businessId,
        )
      ) {
        throw new Error('One or more transactions are not available in this workspace.')
      }
      await this.database.transactions.bulkDelete(uniqueIds)
    })
  }

  async clearLocalData(): Promise<void> {
    await this.database.transaction(
      'rw',
      this.database.transactions,
      this.database.batches,
      this.database.preferences,
      this.database.profiles,
      this.database.businesses,
      async () => {
        await this.database.transactions.where('ownerId').equals(this.ownerId).delete()
        await this.database.batches.where('ownerId').equals(this.ownerId).delete()
        await this.database.preferences.where('ownerId').equals(this.ownerId).delete()
        await this.database.businesses.where('ownerId').equals(this.ownerId).delete()
        await this.database.profiles.delete(this.ownerId)
      },
    )
  }
}

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

  async clearLocalData(): Promise<void> {
    await this.database.transaction(
      'rw',
      this.database.transactions,
      this.database.preferences,
      this.database.profiles,
      this.database.businesses,
      async () => {
        await this.database.transactions.where('ownerId').equals(this.ownerId).delete()
        await this.database.preferences.where('ownerId').equals(this.ownerId).delete()
        await this.database.businesses.where('ownerId').equals(this.ownerId).delete()
        await this.database.profiles.delete(this.ownerId)
      },
    )
  }
}

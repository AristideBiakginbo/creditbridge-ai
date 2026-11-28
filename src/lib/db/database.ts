import Dexie, { type EntityTable } from 'dexie'
import type { LocalTransaction } from './schema.ts'

export interface LocalProfile {
  uid: string
  displayName: string
  email: string | null
  activeBusinessId: string | null
  onboardingCompleted: boolean
  updatedAt: number
  schemaVersion: 1
}

export interface LocalBusiness {
  id: string
  ownerId: string
  name: string
  sector: string
  businessType: 'sole-trader' | 'family-business' | 'small-team'
  country: string
  currency: 'MAD' | 'XAF' | 'XOF' | 'EUR' | 'USD'
  timezone: string
  financialGoals: string[]
  updatedAt: number
  schemaVersion: 1
}

export interface LocalPreference {
  id: string
  ownerId: string
  language: 'en' | 'fr'
  theme: 'system' | 'light' | 'dark'
  syncEnabled: false
  updatedAt: number
  schemaVersion: 1
}

export class CreditBridgeDatabase extends Dexie {
  profiles!: EntityTable<LocalProfile, 'uid'>
  businesses!: EntityTable<LocalBusiness, 'id'>
  transactions!: EntityTable<LocalTransaction, 'id'>
  preferences!: EntityTable<LocalPreference, 'id'>

  constructor(name = 'creditbridge-local-v1') {
    super(name)
    this.version(1).stores({
      profiles: 'uid, updatedAt',
      businesses: 'id, ownerId, updatedAt',
      transactions: 'id, ownerId, businessId, [ownerId+businessId], transactionDate, type, category, updatedAt, [ownerId+businessId+transactionDate]',
      preferences: 'id, ownerId, updatedAt',
    })
  }
}

export const creditBridgeDatabase = new CreditBridgeDatabase()

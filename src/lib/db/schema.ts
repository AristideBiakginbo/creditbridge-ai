import { z } from 'zod'
import { currencies } from '../finance/currencies.ts'

export const localTransactionSchema = z.object({
  id: z.string().min(1).max(128),
  ownerId: z.string().min(1).max(128),
  businessId: z.string().min(1).max(128),
  type: z.enum(['income', 'expense']),
  amountMinor: z.number().int().positive().max(10_000_000_000),
  currency: z.enum(currencies),
  category: z.string().trim().min(2).max(48),
  description: z.string().trim().min(2).max(140),
  notes: z.string().trim().max(500).optional(),
  merchant: z.string().trim().max(120).optional(),
  receiptReference: z.string().trim().max(120).optional(),
  transactionDate: z.iso.date(),
  source: z.enum(['manual', 'ai']),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
  schemaVersion: z.literal(1),
})

export type LocalTransaction = z.infer<typeof localTransactionSchema>
export const localTransactionInputSchema = localTransactionSchema.omit({
  id: true,
  ownerId: true,
  businessId: true,
  createdAt: true,
  updatedAt: true,
  schemaVersion: true,
})
export type LocalTransactionInput = z.infer<typeof localTransactionInputSchema>

export interface LocalTransactionBatch {
  id: string
  ownerId: string
  businessId: string
  transactionIds: string[]
  createdAt: number
}

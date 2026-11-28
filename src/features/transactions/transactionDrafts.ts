import { amountToMinor, createId } from '../../lib/db/transactionRepository.ts'
import {
  localTransactionInputSchema,
  type LocalTransactionInput,
} from '../../lib/db/schema.ts'
import { currencies, type Currency } from '../../lib/finance/currencies.ts'
import { normalizeSuggestedCategory } from '../../lib/finance/transactionCategories.ts'
import type { ExtractedTransaction } from '../../lib/ai/schemas.ts'

export interface TransactionDraft {
  id: string
  selected: boolean
  type: 'income' | 'expense'
  amount: string
  currency: Currency | ''
  category: string
  description: string
  transactionDate: string
  notes: string
  merchant: string
  receiptReference: string
  warnings: string[]
  warningsReviewed: boolean
  duplicateConfirmed: boolean
  source: 'manual' | 'ai'
}

export interface DraftValidation {
  input?: LocalTransactionInput
  errors: string[]
}

export function createTransactionDraft(
  transaction: ExtractedTransaction,
  language: 'en' | 'fr' = 'en',
): TransactionDraft {
  const category = normalizeSuggestedCategory(transaction.category, transaction.type)
  const genericCategory = transaction.type === 'income' ? 'other_income' : 'other_expense'
  const normalizedSuggestion = transaction.category.trim().toLowerCase().replace(/[\s-]+/g, '_')
  const warnings = [...transaction.missingInformation]
  if (category === genericCategory && normalizedSuggestion !== genericCategory) {
    warnings.push(language === 'fr'
      ? 'La catégorie proposée n’est pas reconnue et a été classée dans une catégorie générale. Vérifiez-la.'
      : 'The suggested category was not recognized and was mapped to a general category. Please review it.')
  }
  return {
    id: createId(),
    selected: true,
    type: transaction.type,
    amount: String(transaction.amount),
    currency: transaction.currency ?? '',
    category,
    description: transaction.description,
    transactionDate: transaction.date ?? '',
    notes: '',
    merchant: '',
    receiptReference: '',
    warnings,
    warningsReviewed: warnings.length === 0,
    duplicateConfirmed: false,
    source: 'ai',
  }
}

export function createManualTransactionDraft(
  currency: Currency,
): TransactionDraft {
  return {
    id: createId(),
    selected: true,
    type: 'expense',
    amount: '',
    currency,
    category: 'other_expense',
    description: '',
    transactionDate: '',
    notes: '',
    merchant: '',
    receiptReference: '',
    warnings: [],
    warningsReviewed: true,
    duplicateConfirmed: false,
    source: 'manual',
  }
}

export function validateTransactionDraft(draft: TransactionDraft): DraftValidation {
  const errors: string[] = []
  if (!currencies.includes(draft.currency as Currency)) errors.push('currency')

  let amountMinor: number | undefined
  if (draft.currency) {
    try {
      amountMinor = amountToMinor(Number(draft.amount), draft.currency)
    } catch {
      errors.push('amount')
    }
  } else {
    errors.push('amount')
  }

  if (!draft.transactionDate) errors.push('transactionDate')
  if (!draft.description.trim()) errors.push('description')
  if (!draft.category.trim()) errors.push('category')
  if (draft.warnings.length > 0 && !draft.warningsReviewed) errors.push('warnings')

  if (amountMinor === undefined || errors.some((error) =>
    ['currency', 'amount', 'transactionDate', 'description', 'category'].includes(error),
  )) {
    return { errors }
  }

  const parsed = localTransactionInputSchema.safeParse({
    type: draft.type,
    amountMinor,
    currency: draft.currency,
    category: draft.category,
    description: draft.description.trim(),
    transactionDate: draft.transactionDate,
    source: draft.source,
    ...(draft.notes.trim() ? { notes: draft.notes.trim() } : {}),
    ...(draft.merchant.trim() ? { merchant: draft.merchant.trim() } : {}),
    ...(draft.receiptReference.trim()
      ? { receiptReference: draft.receiptReference.trim() }
      : {}),
  })

  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = issue.path[0]
      if (typeof field === 'string' && !errors.includes(field)) errors.push(field)
    }
    return { errors }
  }
  return { input: parsed.data, errors }
}

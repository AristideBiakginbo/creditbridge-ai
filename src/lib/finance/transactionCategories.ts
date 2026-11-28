import type { LocalTransaction } from '../db/schema.ts'

export const transactionCategories = {
  income: [
    'sales',
    'services',
    'customer_payments',
    'other_income',
  ],
  expense: [
    'inventory',
    'transportation',
    'rent',
    'utilities',
    'marketing',
    'salaries',
    'equipment',
    'other_expense',
  ],
} as const

export type TransactionDirection = keyof typeof transactionCategories
export type TransactionCategory =
  (typeof transactionCategories)[TransactionDirection][number]

const categoryLabels: Record<TransactionCategory, { en: string; fr: string }> = {
  sales: { en: 'Sales', fr: 'Ventes' },
  services: { en: 'Services', fr: 'Services' },
  customer_payments: { en: 'Customer payments', fr: 'Paiements clients' },
  other_income: { en: 'Other income', fr: 'Autres revenus' },
  inventory: { en: 'Inventory', fr: 'Stock' },
  transportation: { en: 'Transportation', fr: 'Transport' },
  rent: { en: 'Rent', fr: 'Loyer' },
  utilities: { en: 'Utilities', fr: 'Services publics' },
  marketing: { en: 'Marketing', fr: 'Marketing' },
  salaries: { en: 'Salaries', fr: 'Salaires' },
  equipment: { en: 'Equipment', fr: 'Équipement' },
  other_expense: { en: 'Other expense', fr: 'Autres dépenses' },
}

export function getTransactionCategoryLabel(
  category: string,
  language: 'en' | 'fr',
): string {
  if (category in categoryLabels) {
    return categoryLabels[category as TransactionCategory][language]
  }
  return category
}

export function getCategoriesForDirection(
  direction: TransactionDirection,
): readonly TransactionCategory[] {
  return transactionCategories[direction]
}

export function normalizeSuggestedCategory(
  suggestion: string,
  direction: TransactionDirection,
): TransactionCategory {
  const normalized = suggestion.trim().toLowerCase().replace(/[\s-]+/g, '_')
  const aliases: Record<string, TransactionCategory> = {
    sale: 'sales',
    ventes: 'sales',
    service: 'services',
    prestations: 'services',
    customer_payment: 'customer_payments',
    paiement_client: 'customer_payments',
    stock: 'inventory',
    supplies: 'inventory',
    transport: 'transportation',
    salary: 'salaries',
    wages: 'salaries',
  }
  const candidate = aliases[normalized] ?? normalized
  const allowed = transactionCategories[direction] as readonly string[]
  return allowed.includes(candidate)
    ? candidate as TransactionCategory
    : direction === 'income'
      ? 'other_income'
      : 'other_expense'
}

export function inferTransactionDirection(
  transaction: Pick<LocalTransaction, 'type'>,
): TransactionDirection {
  return transaction.type
}

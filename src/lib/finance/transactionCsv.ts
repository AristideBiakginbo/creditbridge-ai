import Papa from 'papaparse'
import type { LocalTransaction } from '../db/schema.ts'
import { minorToAmount } from '../db/transactionRepository.ts'
import { getTransactionCategoryLabel } from './transactionCategories.ts'

function protectSpreadsheetFormula(value: string): string {
  return /^[=+\-@]/.test(value.trimStart()) ? `'${value}` : value
}

export function transactionsToCsv(
  transactions: LocalTransaction[],
  language: 'en' | 'fr',
): string {
  const headers = language === 'fr'
    ? ['Date', 'Description', 'Type', 'Catégorie', 'Montant', 'Devise', 'Notes']
    : ['Date', 'Description', 'Direction', 'Category', 'Amount', 'Currency', 'Notes']
  const rows = transactions.map((item) => [
    item.transactionDate,
    protectSpreadsheetFormula(item.description),
    language === 'fr'
      ? item.type === 'income' ? 'Revenu' : 'Dépense'
      : item.type,
    protectSpreadsheetFormula(getTransactionCategoryLabel(item.category, language)),
    String(minorToAmount(item.amountMinor, item.currency)),
    item.currency,
    protectSpreadsheetFormula(item.notes ?? ''),
  ])
  return `\uFEFF${Papa.unparse([headers, ...rows], { newline: '\r\n', quotes: true })}`
}

export function downloadTransactionsCsv(
  transactions: LocalTransaction[],
  language: 'en' | 'fr',
): void {
  const blob = new Blob([transactionsToCsv(transactions, language)], {
    type: 'text/csv;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `creditbridge-transactions-${new Date().toISOString().slice(0, 10)}.csv`
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

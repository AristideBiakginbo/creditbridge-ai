import type { DemoTransaction } from '../../demo/repository'

export type DateRange = 'all' | '30-days' | '90-days' | 'year'

export interface DashboardMetrics {
  income: number
  expenses: number
  netCashFlow: number
  transactionCount: number
}

export interface MonthlyCashFlow {
  month: string
  income: number
  expenses: number
  net: number
}

export interface CategoryTotal {
  category: string
  amount: number
}

export interface DocumentationReadiness {
  percent: number
  completed: number
  total: number
  checks: Array<{ label: string; complete: boolean }>
}

export function filterTransactionsByRange(
  transactions: DemoTransaction[],
  range: DateRange,
  now: Date = new Date(),
): DemoTransaction[] {
  if (range === 'all') return transactions

  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const start = range === 'year'
    ? Date.UTC(now.getUTCFullYear(), 0, 1)
    : end - (range === '30-days' ? 29 : 89) * 24 * 60 * 60 * 1000

  return transactions.filter((transaction) => {
    const transactionDate = Date.parse(`${transaction.date}T00:00:00.000Z`)
    return transactionDate >= start && transactionDate <= end
  })
}

export function calculateDashboardMetrics(
  transactions: DemoTransaction[],
): DashboardMetrics {
  const income = transactions.reduce(
    (total, transaction) => total + (transaction.type === 'income' ? transaction.amount : 0),
    0,
  )
  const expenses = transactions.reduce(
    (total, transaction) => total + (transaction.type === 'expense' ? transaction.amount : 0),
    0,
  )

  return {
    income,
    expenses,
    netCashFlow: income - expenses,
    transactionCount: transactions.length,
  }
}

export function groupMonthlyCashFlow(
  transactions: DemoTransaction[],
): MonthlyCashFlow[] {
  const months = new Map<string, Omit<MonthlyCashFlow, 'month'>>()
  for (const transaction of transactions) {
    const monthKey = transaction.date.slice(0, 7)
    const month = months.get(monthKey) ?? { income: 0, expenses: 0, net: 0 }
    if (transaction.type === 'income') month.income += transaction.amount
    else month.expenses += transaction.amount
    month.net = month.income - month.expenses
    months.set(monthKey, month)
  }

  return [...months.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([month, values]) => ({ month, ...values }))
}

export function groupExpensesByCategory(
  transactions: DemoTransaction[],
): CategoryTotal[] {
  const totals = new Map<string, number>()
  for (const transaction of transactions) {
    if (transaction.type !== 'expense') continue
    totals.set(
      transaction.category,
      (totals.get(transaction.category) ?? 0) + transaction.amount,
    )
  }
  return [...totals.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((left, right) => right.amount - left.amount)
}

export function calculateDocumentationReadiness(
  transactions: DemoTransaction[],
): DocumentationReadiness {
  const checks = [
    { label: 'Business activity recorded', complete: transactions.length >= 5 },
    { label: 'Income and expenses represented', complete: transactions.some((item) => item.type === 'income') && transactions.some((item) => item.type === 'expense') },
    { label: 'Transactions dated', complete: transactions.length > 0 && transactions.every((item) => Boolean(item.date)) },
    { label: 'Multiple categories used', complete: new Set(transactions.map((item) => item.category)).size >= 3 },
  ]
  const completed = checks.filter((check) => check.complete).length
  return {
    percent: Math.round((completed / checks.length) * 100),
    completed,
    total: checks.length,
    checks,
  }
}

export function formatCurrency(
  amount: number,
  currency: string,
  language: 'en' | 'fr' = 'en',
): string {
  return new Intl.NumberFormat(language === 'fr' ? 'fr-FR' : 'en-MA', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(
  date: string,
  language: 'en' | 'fr' = 'en',
): string {
  return new Intl.DateTimeFormat(language === 'fr' ? 'fr-FR' : 'en-MA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00.000Z`))
}

import type { Currency } from './currencies.ts'
import type { LocalTransaction } from '../db/schema.ts'
import { formatDateOnly, getDeviceTimeZone } from '../time/timezone.ts'

export type TransactionPeriod = '7-days' | '30-days' | 'current-month' | 'all'
export type TransactionSort = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc' | 'description'

export interface LocalTransactionFilters {
  search: string
  type: 'all' | 'income' | 'expense'
  category: string
  currency: Currency | 'all'
  fromDate: string
  toDate: string
  minAmountMinor?: number
  maxAmountMinor?: number
  sort: TransactionSort
}

export interface DateWindow {
  start: string
  end: string
}

export interface LocalFinancialMetrics {
  incomeMinor: number
  expenseMinor: number
  netMinor: number
  transactionCount: number
}

function dateKey(date: Date, timeZone?: string): string {
  return formatDateOnly(date, timeZone ?? getDeviceTimeZone().timeZone)
}

function dateFromKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

function shiftDate(date: Date, days: number): Date {
  const shifted = new Date(date)
  shifted.setUTCDate(shifted.getUTCDate() + days)
  return shifted
}

export function getDateWindow(
  period: TransactionPeriod,
  now: Date = new Date(),
  timeZone?: string,
): DateWindow | undefined {
  if (period === 'all') return undefined
  const todayKey = dateKey(now, timeZone)
  const today = dateFromKey(todayKey)
  const start = period === 'current-month'
    ? new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1))
    : shiftDate(today, period === '7-days' ? -6 : -29)
  return { start: dateKey(start, 'UTC'), end: todayKey }
}

export function getPreviousDateWindow(
  period: Exclude<TransactionPeriod, 'all'>,
  now: Date = new Date(),
  timeZone?: string,
): DateWindow {
  const today = dateFromKey(dateKey(now, timeZone))
  if (period === 'current-month') {
    const previousMonthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1))
    const previousMonthLastDay = new Date(
      previousMonthStart.getUTCFullYear(),
      previousMonthStart.getUTCMonth() + 1,
      0,
    ).getUTCDate()
    const endDay = Math.min(today.getUTCDate(), previousMonthLastDay)
    return {
      start: dateKey(previousMonthStart, 'UTC'),
      end: dateKey(
        new Date(Date.UTC(previousMonthStart.getUTCFullYear(), previousMonthStart.getUTCMonth(), endDay)),
        'UTC',
      ),
    }
  }
  const days = period === '7-days' ? 7 : 30
  return {
    start: dateKey(shiftDate(today, -(days * 2 - 1)), 'UTC'),
    end: dateKey(shiftDate(today, -days), 'UTC'),
  }
}

export function filterByDateWindow(
  transactions: LocalTransaction[],
  window?: DateWindow,
): LocalTransaction[] {
  if (!window) return transactions
  return transactions.filter(
    ({ transactionDate }) =>
      transactionDate >= window.start && transactionDate <= window.end,
  )
}

export function calculateLocalMetrics(
  transactions: LocalTransaction[],
): LocalFinancialMetrics {
  const incomeMinor = transactions.reduce(
    (total, item) => total + (item.type === 'income' ? item.amountMinor : 0),
    0,
  )
  const expenseMinor = transactions.reduce(
    (total, item) => total + (item.type === 'expense' ? item.amountMinor : 0),
    0,
  )
  return {
    incomeMinor,
    expenseMinor,
    netMinor: incomeMinor - expenseMinor,
    transactionCount: transactions.length,
  }
}

export function filterLocalTransactions(
  transactions: LocalTransaction[],
  filters: LocalTransactionFilters,
): LocalTransaction[] {
  const query = filters.search.trim().toLocaleLowerCase()
  return transactions
    .filter((item) => {
      if (filters.type !== 'all' && item.type !== filters.type) return false
      if (filters.category && item.category !== filters.category) return false
      if (filters.currency !== 'all' && item.currency !== filters.currency) return false
      if (filters.fromDate && item.transactionDate < filters.fromDate) return false
      if (filters.toDate && item.transactionDate > filters.toDate) return false
      if (
        filters.minAmountMinor !== undefined
        && (filters.currency === 'all' || item.amountMinor < filters.minAmountMinor)
      ) return false
      if (
        filters.maxAmountMinor !== undefined
        && (filters.currency === 'all' || item.amountMinor > filters.maxAmountMinor)
      ) return false
      if (!query) return true
      return [
        item.description,
        item.category,
        item.notes ?? '',
        item.merchant ?? '',
        item.receiptReference ?? '',
      ].some((value) => value.toLocaleLowerCase().includes(query))
    })
    .sort((left, right) => {
      switch (filters.sort) {
        case 'date-asc':
          return left.transactionDate.localeCompare(right.transactionDate)
        case 'amount-desc':
          return filters.currency === 'all'
            ? right.transactionDate.localeCompare(left.transactionDate)
            : right.amountMinor - left.amountMinor
        case 'amount-asc':
          return filters.currency === 'all'
            ? right.transactionDate.localeCompare(left.transactionDate)
            : left.amountMinor - right.amountMinor
        case 'description':
          return left.description.localeCompare(right.description)
        default:
          return right.transactionDate.localeCompare(left.transactionDate)
      }
    })
}

export function sumByCurrency(
  transactions: LocalTransaction[],
): Map<Currency, LocalFinancialMetrics> {
  const grouped = new Map<Currency, LocalTransaction[]>()
  for (const item of transactions) {
    const group = grouped.get(item.currency) ?? []
    group.push(item)
    grouped.set(item.currency, group)
  }
  return new Map(
    [...grouped].map(([currency, items]) => [currency, calculateLocalMetrics(items)]),
  )
}

export function groupExpensesByCategoryMinor(
  transactions: LocalTransaction[],
): Array<{ category: string; amountMinor: number }> {
  const totals = new Map<string, number>()
  for (const item of transactions) {
    if (item.type === 'expense') {
      totals.set(item.category, (totals.get(item.category) ?? 0) + item.amountMinor)
    }
  }
  return [...totals]
    .map(([category, amountMinor]) => ({ category, amountMinor }))
    .sort((left, right) => right.amountMinor - left.amountMinor)
}

export function groupDailyCashFlow(
  transactions: LocalTransaction[],
): Array<{ date: string; incomeMinor: number; expenseMinor: number }> {
  const days = new Map<string, { incomeMinor: number; expenseMinor: number }>()
  for (const item of transactions) {
    const values = days.get(item.transactionDate) ?? { incomeMinor: 0, expenseMinor: 0 }
    if (item.type === 'income') values.incomeMinor += item.amountMinor
    else values.expenseMinor += item.amountMinor
    days.set(item.transactionDate, values)
  }
  return [...days]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, values]) => ({ date, ...values }))
}

export function groupMonthlyCashFlow(
  transactions: LocalTransaction[],
): Array<{ month: string; incomeMinor: number; expenseMinor: number }> {
  const months = new Map<string, { incomeMinor: number; expenseMinor: number }>()
  for (const item of transactions) {
    const monthKey = item.transactionDate.slice(0, 7)
    const values = months.get(monthKey) ?? { incomeMinor: 0, expenseMinor: 0 }
    if (item.type === 'income') values.incomeMinor += item.amountMinor
    else values.expenseMinor += item.amountMinor
    months.set(monthKey, values)
  }
  return [...months]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([month, values]) => ({ month, ...values }))
}

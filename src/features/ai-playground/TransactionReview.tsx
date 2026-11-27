import { useState } from 'react'
import { CheckCircle2, CircleAlert } from 'lucide-react'
import {
  ExtractedTransactionSchema,
  supportedCurrencies,
  type ExtractedTransaction,
} from '../../lib/ai/schemas'

interface EditableTransaction {
  type: 'income' | 'expense'
  amount: string
  currency: string
  category: string
  description: string
  date: string
  missingInformation: string[]
}

interface TransactionReviewProps {
  transactions: ExtractedTransaction[]
}

function toEditableTransaction(
  transaction: ExtractedTransaction,
): EditableTransaction {
  return {
    type: transaction.type,
    amount: String(transaction.amount),
    currency: transaction.currency ?? '',
    category: transaction.category,
    description: transaction.description,
    date: transaction.date ?? '',
    missingInformation: transaction.missingInformation,
  }
}

export function TransactionReview({
  transactions,
}: TransactionReviewProps) {
  const [rows, setRows] = useState(() => transactions.map(toEditableTransaction))
  const [errors, setErrors] = useState<string[]>([])
  const [confirmed, setConfirmed] = useState(false)

  function updateRow<Field extends keyof EditableTransaction>(
    index: number,
    field: Field,
    value: EditableTransaction[Field],
  ) {
    setRows((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row,
      ),
    )
    setConfirmed(false)
  }

  function confirmReview() {
    const candidate = rows.map((row) => ({
      ...row,
      amount: Number(row.amount),
      currency: row.currency === '' ? null : row.currency,
      date: row.date === '' ? null : row.date,
    }))
    const parsed = ExtractedTransactionSchema.array().safeParse(candidate)
    if (!parsed.success) {
      setErrors(
        parsed.error.issues.map((issue) => {
          const path = issue.path.length > 0 ? issue.path.join('.') : 'transaction'
          return `${path}: ${issue.message}`
        }),
      )
      return
    }

    const unresolvedCurrency = parsed.data.some(
      (transaction) => transaction.currency === null,
    )
    if (unresolvedCurrency) {
      setErrors(['Choose an unambiguous currency for every transaction before confirming.'])
      return
    }

    setErrors([])
    setConfirmed(true)
  }

  return (
    <section
      aria-labelledby="transaction-review-heading"
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
            Human review
          </p>
          <h2
            className="mt-1 text-lg font-semibold text-text"
            id="transaction-review-heading"
          >
            Transaction preview
          </h2>
        </div>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900 ring-1 ring-amber-200">
          Not saved
        </span>
      </div>

      <p className="mt-2 text-sm leading-6 text-slate-600">
        Review and edit the model output. Confirming marks this preview as
        reviewed only; no transaction repository is connected in this phase.
      </p>

      <div className="mt-5 space-y-4">
        {rows.map((row, index) => {
          const visibleWarnings = row.currency
            ? row.missingInformation.filter(
                (warning) => !/FCFA means XAF or XOF/i.test(warning),
              )
            : row.missingInformation

          return (
            <fieldset
              className="grid gap-3 rounded-xl border border-slate-200 p-4 sm:grid-cols-2"
              key={index}
            >
              <legend className="px-1 text-sm font-semibold text-slate-700">
                Transaction {index + 1}
              </legend>
              <label className="text-sm font-medium text-slate-700">
                Type
                <select
                  className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
                  value={row.type}
                  onChange={(event) =>
                    updateRow(
                      index,
                      'type',
                      event.target.value === 'income' ? 'income' : 'expense',
                    )
                  }
                >
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
              </label>
              <label className="text-sm font-medium text-slate-700">
                Amount
                <input
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm tabular-nums text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  type="number"
                  value={row.amount}
                  onChange={(event) => updateRow(index, 'amount', event.target.value)}
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Currency
                <select
                  className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
                  value={row.currency}
                  onChange={(event) => updateRow(index, 'currency', event.target.value)}
                >
                  <option value="">Clarify currency</option>
                  {supportedCurrencies.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium text-slate-700">
                Category
                <input
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
                  maxLength={64}
                  value={row.category}
                  onChange={(event) => updateRow(index, 'category', event.target.value)}
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Description
                <input
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
                  maxLength={240}
                  value={row.description}
                  onChange={(event) =>
                    updateRow(index, 'description', event.target.value)
                  }
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Date (optional)
                <input
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
                  type="date"
                  value={row.date}
                  onChange={(event) => updateRow(index, 'date', event.target.value)}
                />
              </label>
              {visibleWarnings.length > 0 && (
                <ul className="space-y-1 text-sm text-amber-900 sm:col-span-2">
                  {visibleWarnings.map((warning, warningIndex) => (
                    <li className="flex items-start gap-2" key={warningIndex}>
                      <CircleAlert
                        aria-hidden="true"
                        className="mt-0.5 shrink-0"
                        size={15}
                      />
                      {warning}
                    </li>
                  ))}
                </ul>
              )}
            </fieldset>
          )
        })}
      </div>

      {errors.length > 0 && (
        <ul
          className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900"
          role="alert"
        >
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          onClick={confirmReview}
          type="button"
        >
          Confirm review (not saved)
        </button>
        {confirmed && (
          <p className="inline-flex items-center gap-2 text-sm font-medium text-emerald-800" role="status">
            <CheckCircle2 aria-hidden="true" size={17} />
            Review confirmed locally; nothing was persisted.
          </p>
        )}
      </div>
    </section>
  )
}

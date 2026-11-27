import { useState, type FormEvent } from 'react'
import {
  ExtractedTransactionSchema,
  supportedCurrencies,
  type ExtractedTransaction,
} from '../../lib/ai/schemas'

export function ManualTransactionEntry() {
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')
  const [preview, setPreview] = useState<ExtractedTransaction>()
  const [errors, setErrors] = useState<string[]>([])

  function createPreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const candidate = {
      type,
      amount: Number(amount),
      currency: supportedCurrencies.find((code) => code === currency) ?? null,
      category,
      description,
      date: date || null,
      missingInformation: currency ? [] : ['Currency is not specified.'],
    }
    const parsed = ExtractedTransactionSchema.safeParse(candidate)
    if (!parsed.success) {
      setErrors(
        parsed.error.issues.map((issue) => {
          const path = issue.path.length > 0 ? issue.path.join('.') : 'transaction'
          return `${path}: ${issue.message}`
        }),
      )
      setPreview(undefined)
      return
    }

    setErrors([])
    setPreview(parsed.data)
  }

  return (
    <section
      aria-labelledby="manual-entry-heading"
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <h2 className="text-lg font-semibold text-text" id="manual-entry-heading">
        Manual entry
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Use this local, non-AI preview if an on-device model is unavailable. It
        is not stored or sent anywhere.
      </p>
      <form
        autoComplete="off"
        className="mt-4 grid gap-3 sm:grid-cols-2"
        onSubmit={createPreview}
      >
        <label className="text-sm font-medium text-slate-700">
          Type
          <select
            className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
            onChange={(event) =>
              setType(event.target.value === 'income' ? 'income' : 'expense')
            }
            value={type}
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Amount
          <input
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
            inputMode="decimal"
            min="0.01"
            onChange={(event) => setAmount(event.target.value)}
            required
            step="any"
            type="number"
            value={amount}
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Currency
          <select
            className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
            onChange={(event) => setCurrency(event.target.value)}
            value={currency}
          >
            <option value="">Unspecified</option>
            {supportedCurrencies.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Category
          <input
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
            maxLength={64}
            onChange={(event) => setCategory(event.target.value)}
            required
            value={category}
          />
        </label>
        <label className="text-sm font-medium text-slate-700 sm:col-span-2">
          Description
          <input
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
            maxLength={240}
            onChange={(event) => setDescription(event.target.value)}
            required
            value={description}
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Date (optional)
          <input
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
            onChange={(event) => setDate(event.target.value)}
            type="date"
            value={date}
          />
        </label>
        <div className="flex items-end">
          <button
            className="rounded-lg border border-primary px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            type="submit"
          >
            Create manual preview
          </button>
        </div>
      </form>
      {errors.length > 0 && (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-rose-800" role="alert">
          {errors.map((error) => <li key={error}>{error}</li>)}
        </ul>
      )}
      {preview && (
        <dl
          aria-live="polite"
          className="mt-4 grid gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm sm:grid-cols-2"
        >
          <div>
            <dt className="text-xs text-slate-600">Type and amount</dt>
            <dd className="font-semibold text-slate-900">
              {preview.type} · {preview.amount} {preview.currency ?? '(currency unspecified)'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-600">Category</dt>
            <dd className="font-semibold text-slate-900">{preview.category}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-600">Description</dt>
            <dd className="font-semibold text-slate-900">{preview.description}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-600">Date</dt>
            <dd className="font-semibold text-slate-900">{preview.date ?? 'Unspecified'}</dd>
          </div>
          <p className="text-xs font-medium text-emerald-950 sm:col-span-2">
            Preview only. This entry has not been saved.
          </p>
        </dl>
      )}
    </section>
  )
}

import { useState, type FormEvent } from 'react'
import { useLanguage } from '../../app/providers/useLanguage'
import { DemoTransactionInputSchema, type DemoTransaction, type DemoTransactionInput } from '../../demo/repository'
import { Button } from '../../components/ui/Button'
import { inputClasses, selectClasses } from '../../components/ui/fields'

interface TransactionFormProps {
  initial?: DemoTransaction
  onSubmit: (input: DemoTransactionInput) => void
  submitLabel?: string
}

type TransactionDraft = Omit<DemoTransactionInput, 'amount'> & { amount: string }

const emptyDraft: TransactionDraft = {
  date: '',
  type: 'expense',
  description: '',
  category: '',
  amount: '',
  currency: 'MAD',
}

export function TransactionForm({
  initial,
  onSubmit,
  submitLabel,
}: TransactionFormProps) {
  const { language } = useLanguage()
  const [draft, setDraft] = useState<TransactionDraft>(() => initial
    ? {
        date: initial.date,
        type: initial.type,
        description: initial.description,
        category: initial.category,
        amount: String(initial.amount),
        currency: initial.currency,
      }
    : { ...emptyDraft })
  const [errors, setErrors] = useState<string[]>([])

  function update<Field extends keyof TransactionDraft>(
    field: Field,
    value: TransactionDraft[Field],
  ) {
    setDraft((current) => ({ ...current, [field]: value }))
    setErrors([])
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = DemoTransactionInputSchema.safeParse({
      ...draft,
      amount: Number(draft.amount),
      currency: 'MAD',
    })
    if (!parsed.success) {
      setErrors(parsed.error.issues.map((issue) =>
        `${issue.path.join('.') || 'transaction'}: ${issue.message}`,
      ))
      return
    }
    try {
      onSubmit(parsed.data)
    } catch (error) {
      setErrors([
        error instanceof Error
          ? error.message
          : language === 'fr'
            ? 'La transaction n’a pas pu être enregistrée.'
            : 'The transaction could not be saved.',
      ])
    }
  }

  const french = language === 'fr'
  const labelClass = 'grid gap-1.5 text-xs font-semibold text-foreground'

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          {french ? 'Type' : 'Type'}
          <select
            className={selectClasses}
            onChange={(event) => update('type', event.target.value === 'income' ? 'income' : 'expense')}
            value={draft.type}
          >
            <option value="income">{french ? 'Revenu' : 'Income'}</option>
            <option value="expense">{french ? 'Dépense' : 'Expense'}</option>
          </select>
        </label>
        <label className={labelClass}>
          {french ? 'Date' : 'Date'}
          <input
            className={inputClasses}
            onChange={(event) => update('date', event.target.value)}
            required
            type="date"
            value={draft.date}
          />
        </label>
      </div>
      <label className={labelClass}>
        {french ? 'Description' : 'Description'}
        <input
          autoComplete="off"
          className={inputClasses}
          maxLength={140}
          minLength={2}
          onChange={(event) => update('description', event.target.value)}
          required
          value={draft.description}
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          {french ? 'Catégorie' : 'Category'}
          <input
            className={inputClasses}
            maxLength={48}
            minLength={2}
            onChange={(event) => update('category', event.target.value)}
            required
            value={draft.category}
          />
        </label>
        <label className={labelClass}>
          {french ? 'Montant (MAD)' : 'Amount (MAD)'}
          <input
            className={`${inputClasses} financial-value`}
            inputMode="decimal"
            max="100000000"
            min="0.01"
            onChange={(event) => update('amount', event.target.value)}
            required
            step="0.01"
            type="number"
            value={draft.amount}
          />
        </label>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
        <p className="text-xs leading-5 text-muted-foreground">
          {french
            ? 'Donnée synthétique conservée uniquement dans ce navigateur.'
            : 'Synthetic record stored in this browser only.'}
        </p>
        <Button type="submit">{submitLabel ?? (french ? 'Enregistrer' : 'Save transaction')}</Button>
      </div>
      {errors.length > 0 && (
        <ul className="grid gap-1 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-xs text-destructive" role="alert">
          {errors.map((error, index) => <li key={`${error}-${index}`}>{error}</li>)}
        </ul>
      )}
    </form>
  )
}

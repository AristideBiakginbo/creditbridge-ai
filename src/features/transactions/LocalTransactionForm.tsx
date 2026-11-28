import { useState, type FormEvent } from 'react'
import { useLanguage } from '../../app/providers/useLanguage'
import { Button } from '../../components/ui/Button'
import { inputClasses, selectClasses } from '../../components/ui/fields'
import {
  localTransactionInputSchema,
  type LocalTransaction,
  type LocalTransactionInput,
} from '../../lib/db/schema'
import { currencies, type Currency } from '../../lib/finance/currencies'
import {
  getCategoriesForDirection,
  getTransactionCategoryLabel,
} from '../../lib/finance/transactionCategories'
import { amountToMinor, minorToAmount } from '../../lib/db/transactionRepository'

interface LocalTransactionFormProps {
  initial?: LocalTransaction
  currency: Currency
  submitLabel?: string
  onSubmit: (input: LocalTransactionInput) => void | Promise<void>
}

export function LocalTransactionForm({
  initial,
  currency,
  submitLabel,
  onSubmit,
}: LocalTransactionFormProps) {
  const { language } = useLanguage()
  const french = language === 'fr'
  const [type, setType] = useState<LocalTransaction['type']>(initial?.type ?? 'expense')
  const [amount, setAmount] = useState(
    initial ? String(minorToAmount(initial.amountMinor, initial.currency)) : '',
  )
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(
    initial?.currency ?? currency,
  )
  const [category, setCategory] = useState(initial?.category ?? 'other_expense')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [date, setDate] = useState(initial?.transactionDate ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [merchant, setMerchant] = useState(initial?.merchant ?? '')
  const [receiptReference, setReceiptReference] = useState(initial?.receiptReference ?? '')
  const [errorMessage, setErrorMessage] = useState('')
  const labelClass = 'grid min-w-0 gap-1.5 text-xs font-semibold'
  const categories: readonly string[] = getCategoriesForDirection(type)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage('')
    let amountMinor: number
    try {
      amountMinor = amountToMinor(Number(amount), selectedCurrency)
    } catch (error) {
      setErrorMessage(error instanceof Error
        ? error.message
        : french ? 'Saisissez un montant valide.' : 'Enter a valid amount.')
      return
    }

    const parsed = localTransactionInputSchema.safeParse({
      type,
      amountMinor,
      currency: selectedCurrency,
      category,
      description: description.trim(),
      transactionDate: date,
      source: initial?.source ?? 'manual',
      ...(notes.trim() ? { notes: notes.trim() } : {}),
      ...(merchant.trim() ? { merchant: merchant.trim() } : {}),
      ...(receiptReference.trim() ? { receiptReference: receiptReference.trim() } : {}),
    })
    if (!parsed.success) {
      const fields = [...new Set(parsed.error.issues.map((issue) => String(issue.path[0])))]
      setErrorMessage(
        french
          ? `Vérifiez les champs : ${fields.join(', ')}.`
          : `Please check these fields: ${fields.join(', ')}.`,
      )
      return
    }
    try {
      await onSubmit(parsed.data)
    } catch (error) {
      setErrorMessage(error instanceof Error
        ? error.message
        : french ? 'La transaction n’a pas pu être enregistrée.' : 'The transaction could not be saved.')
    }
  }

  return (
    <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          {french ? 'Type' : 'Direction'}
          <select
            className={selectClasses}
            onChange={(event) => {
              const nextType = event.target.value as LocalTransaction['type']
              setType(nextType)
              setCategory(nextType === 'income' ? 'other_income' : 'other_expense')
            }}
            value={type}
          >
            <option value="income">{french ? 'Revenu' : 'Income'}</option>
            <option value="expense">{french ? 'Dépense' : 'Expense'}</option>
          </select>
        </label>
        <label className={labelClass}>
          {french ? 'Date' : 'Date'}
          <input className={inputClasses} onChange={(event) => setDate(event.target.value)} required type="date" value={date} />
        </label>
      </div>
      <label className={labelClass}>
        {french ? 'Description' : 'Description'}
        <input className={inputClasses} maxLength={140} minLength={2} onChange={(event) => setDescription(event.target.value)} required value={description} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          {french ? 'Catégorie' : 'Category'}
          <select className={selectClasses} onChange={(event) => setCategory(event.target.value)} value={category}>
            {!categories.includes(category) && (
              <option value={category}>{category}</option>
            )}
            {getCategoriesForDirection(type).map((option) => (
              <option key={option} value={option}>{getTransactionCategoryLabel(option, language)}</option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          {french ? 'Devise' : 'Currency'}
          <select className={selectClasses} onChange={(event) => setSelectedCurrency(event.target.value as Currency)} value={selectedCurrency}>
            {currencies.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
      </div>
      <label className={labelClass}>
        {french ? 'Montant' : 'Amount'} ({selectedCurrency})
        <input
          className={`${inputClasses} financial-value`}
          inputMode="decimal"
          min={selectedCurrency === 'XAF' || selectedCurrency === 'XOF' ? '1' : '0.01'}
          onChange={(event) => setAmount(event.target.value)}
          required
          step={selectedCurrency === 'XAF' || selectedCurrency === 'XOF' ? '1' : '0.01'}
          type="number"
          value={amount}
        />
      </label>
      <p className="text-xs leading-5 text-muted-foreground">
        {french
          ? 'Si vous enregistrez le paiement d’une vente déjà comptée comme revenu, évitez de la compter une seconde fois. Ce journal ne gère pas la comptabilité d’engagement complète.'
          : 'If recording payment for a sale already counted as income, avoid counting it a second time. This cash log does not implement full accrual accounting.'}
      </p>
      <label className={labelClass}>
        {french ? 'Marchand (facultatif)' : 'Merchant (optional)'}
        <input className={inputClasses} maxLength={120} onChange={(event) => setMerchant(event.target.value)} value={merchant} />
      </label>
      <label className={labelClass}>
        {french ? 'Référence du reçu (facultative)' : 'Receipt reference (optional)'}
        <input className={inputClasses} maxLength={120} onChange={(event) => setReceiptReference(event.target.value)} value={receiptReference} />
      </label>
      <label className={labelClass}>
        {french ? 'Notes (facultatif)' : 'Notes (optional)'}
        <input className={inputClasses} maxLength={500} onChange={(event) => setNotes(event.target.value)} value={notes} />
      </label>
      {errorMessage && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive" role="alert">
          {errorMessage}
        </p>
      )}
      <Button type="submit">{submitLabel ?? (french ? 'Enregistrer localement' : 'Save locally')}</Button>
    </form>
  )
}

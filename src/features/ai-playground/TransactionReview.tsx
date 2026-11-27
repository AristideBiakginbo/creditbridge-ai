import { useState } from 'react'
import { CheckCircle2, CircleAlert } from 'lucide-react'
import { useLanguage } from '../../app/providers/useLanguage'
import { Button } from '../../components/ui/Button'
import { inputClasses, selectClasses } from '../../components/ui/fields'
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
  madConfirmed: boolean
}

interface TransactionReviewProps {
  transactions: ExtractedTransaction[]
  saveToDemo?: boolean
  onConfirm?: (transactions: ExtractedTransaction[]) => string | null
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
    madConfirmed: transaction.currency === 'MAD',
  }
}

export function TransactionReview({
  transactions,
  saveToDemo = false,
  onConfirm,
}: TransactionReviewProps) {
  const { language } = useLanguage()
  const french = language === 'fr'
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
        rowIndex === index
          ? {
              ...row,
              [field]: value,
              ...(field === 'currency' ? { madConfirmed: false } : {}),
            }
          : row,
      ),
    )
    setConfirmed(false)
  }

  function confirmReview() {
    const candidate = rows.map((row) => ({
      type: row.type,
      amount: Number(row.amount),
      currency: row.currency === '' ? null : row.currency,
      category: row.category,
      description: row.description,
      date: row.date === '' ? null : row.date,
      missingInformation: row.missingInformation,
    }))
    const parsed = ExtractedTransactionSchema.array().safeParse(candidate)
    if (!parsed.success) {
      setErrors([french
        ? 'Vérifiez les dates, montants, devises et descriptions avant de continuer.'
        : 'Review the dates, amounts, currencies, and descriptions before continuing.'])
      return
    }

    const unresolvedCurrency = parsed.data.some(
      (transaction) => transaction.currency === null,
    )
    if (unresolvedCurrency) {
      setErrors([french
        ? 'Choisissez une devise non ambiguë pour chaque transaction avant de confirmer.'
        : 'Choose an unambiguous currency for every transaction before confirming.'])
      return
    }
    if (
      saveToDemo &&
      rows.some((row, index) => parsed.data[index]?.currency === 'MAD' && !row.madConfirmed)
    ) {
      setErrors([french
        ? 'Confirmez que chaque montant est déjà libellé en MAD ; aucune conversion ne sera effectuée.'
        : 'Confirm that each amount is already denominated in MAD; no currency conversion will be applied.'])
      return
    }

    const confirmationError = onConfirm?.(parsed.data)
    if (confirmationError) {
      setErrors([confirmationError])
      return
    }
    setErrors([])
    setConfirmed(true)
  }

  return (
    <section
      aria-labelledby="transaction-review-heading"
      className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
            {french ? 'Vérification humaine' : 'Human review'}
          </p>
          <h2
            className="mt-1 text-lg font-semibold text-foreground"
            id="transaction-review-heading"
          >
            {french ? 'Aperçu de transaction' : 'Transaction preview'}
          </h2>
        </div>
        <span className="rounded-full bg-warning/10 px-3 py-1 text-xs font-semibold text-foreground ring-1 ring-warning/25">
          {saveToDemo
            ? (french ? 'Démo synthétique uniquement' : 'Synthetic demo only')
            : (french ? 'Non enregistré' : 'Not saved')}
        </span>
      </div>

      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {saveToDemo
          ? (french
              ? 'Vérifiez chaque champ. La confirmation ajoute ces valeurs uniquement au dépôt de démonstration synthétique de ce navigateur. Rien n’est envoyé au cloud. La démo accepte MAD uniquement et ne convertit aucune devise.'
              : 'Review each field. Confirming adds these values only to this browser’s separate synthetic demo repository. Nothing is sent to cloud storage. The demo supports MAD only; no currency conversion is performed.')
          : (french
              ? 'Vérifiez et modifiez le résultat du modèle. La confirmation indique uniquement que l’aperçu a été vérifié ; aucun dépôt de transactions n’est connecté ici.'
              : 'Review and edit the model output. Confirming marks this preview as reviewed only; no transaction repository is connected here.')}
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
              className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-2"
              disabled={saveToDemo && confirmed}
              key={index}
            >
              <legend className="px-1 text-sm font-semibold text-foreground">
                {french ? 'Transaction' : 'Transaction'} {index + 1}
              </legend>
              <label className="grid gap-1.5 text-xs font-semibold text-foreground">
                {french ? 'Type' : 'Type'}
                <select
                  className={selectClasses}
                  value={row.type}
                  onChange={(event) =>
                    updateRow(
                      index,
                      'type',
                      event.target.value === 'income' ? 'income' : 'expense',
                    )
                  }
                >
                  <option value="income">{french ? 'Revenu' : 'Income'}</option>
                  <option value="expense">{french ? 'Dépense' : 'Expense'}</option>
                </select>
              </label>
              <label className="grid gap-1.5 text-xs font-semibold text-foreground">
                {french ? 'Montant' : 'Amount'}
                <input
                  className={`${inputClasses} financial-value`}
                  inputMode="decimal"
                  min="0.01"
                  step="any"
                  type="number"
                  value={row.amount}
                  onChange={(event) => updateRow(index, 'amount', event.target.value)}
                />
              </label>
              <label className="grid gap-1.5 text-xs font-semibold text-foreground">
                {french ? 'Devise' : 'Currency'}
                <select
                  className={selectClasses}
                  value={row.currency}
                  onChange={(event) => updateRow(index, 'currency', event.target.value)}
                >
                  <option value="">{french ? 'Préciser la devise' : 'Clarify currency'}</option>
                  {supportedCurrencies.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
                {saveToDemo && row.currency === 'MAD' && (
                  <span className="mt-1 flex items-start gap-2 rounded-lg bg-warning/10 p-2.5 font-normal leading-5 text-foreground">
                    <input
                      checked={row.madConfirmed}
                      className="mt-0.5 size-4 shrink-0 accent-primary"
                      onChange={(event) => updateRow(index, 'madConfirmed', event.target.checked)}
                      type="checkbox"
                    />
                    {french
                      ? 'Je confirme que ce montant est déjà en MAD. Aucune conversion ne sera appliquée.'
                      : 'I confirm this amount is already in MAD. No conversion will be applied.'}
                  </span>
                )}
              </label>
              <label className="grid gap-1.5 text-xs font-semibold text-foreground">
                {french ? 'Catégorie' : 'Category'}
                <input
                  className={inputClasses}
                  maxLength={saveToDemo ? 48 : 64}
                  value={row.category}
                  onChange={(event) => updateRow(index, 'category', event.target.value)}
                />
              </label>
              <label className="grid gap-1.5 text-xs font-semibold text-foreground">
                {french ? 'Description' : 'Description'}
                <input
                  className={inputClasses}
                  maxLength={saveToDemo ? 140 : 240}
                  value={row.description}
                  onChange={(event) =>
                    updateRow(index, 'description', event.target.value)
                  }
                />
              </label>
              <label className="grid gap-1.5 text-xs font-semibold text-foreground">
                {french ? 'Date' : 'Date'}{saveToDemo ? '' : ` (${french ? 'facultative' : 'optional'})`}
                <input
                  className={inputClasses}
                  required={saveToDemo}
                  type="date"
                  value={row.date}
                  onChange={(event) => updateRow(index, 'date', event.target.value)}
                />
              </label>
              {visibleWarnings.length > 0 && (
                <ul className="space-y-1 text-xs leading-5 text-foreground sm:col-span-2">
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
          className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button disabled={confirmed} onClick={confirmReview}>
          {saveToDemo
            ? (french ? 'Confirmer et ajouter à la démo' : 'Confirm and add to demo')
            : (french ? 'Confirmer la vérification (non enregistré)' : 'Confirm review (not saved)')}
        </Button>
        {confirmed && (
          <p className="inline-flex items-center gap-2 text-sm font-medium text-success" role="status">
            <CheckCircle2 aria-hidden="true" size={17} />
            {saveToDemo
              ? (french ? 'Ajouté uniquement à l’espace de démonstration local.' : 'Added to the local demonstration workspace only.')
              : (french ? 'Vérification confirmée localement ; rien n’a été enregistré.' : 'Review confirmed locally; nothing was persisted.')}
          </p>
        )}
      </div>
    </section>
  )
}

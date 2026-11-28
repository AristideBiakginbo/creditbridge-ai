import { Check, Plus, Trash2 } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { inputClasses, selectClasses } from '../../components/ui/fields'
import type { LocalTransactionInput } from '../../lib/db/schema'
import { currencies, type Currency } from '../../lib/finance/currencies'
import {
  getCategoriesForDirection,
  getTransactionCategoryLabel,
} from '../../lib/finance/transactionCategories'
import { minorToAmount } from '../../lib/db/transactionRepository'
import {
  validateTransactionDraft,
  type TransactionDraft,
} from './transactionDrafts'

interface TransactionProposalReviewProps {
  drafts: TransactionDraft[]
  duplicateIds: Set<string>
  language: 'en' | 'fr'
  onChange: (id: string, changes: Partial<TransactionDraft>) => void
  onRemove: (id: string) => void
  onAddManual: () => void
  onSave: (inputs: LocalTransactionInput[]) => void
  saving: boolean
}

export function TransactionProposalReview({
  drafts,
  duplicateIds,
  language,
  onChange,
  onRemove,
  onAddManual,
  onSave,
  saving,
}: TransactionProposalReviewProps) {
  const french = language === 'fr'
  const selected = drafts.filter((draft) => draft.selected)
  const validations = new Map(
    selected.map((draft) => [draft.id, validateTransactionDraft(draft)]),
  )
  const selectedValid = selected.every((draft) => {
    const validation = validations.get(draft.id)
    return Boolean(
      validation?.input
      && validation.errors.length === 0
      && (!duplicateIds.has(draft.id) || draft.duplicateConfirmed),
    )
  })
  const validInputs = selected
    .map((draft) => validations.get(draft.id)?.input)
    .filter((input): input is LocalTransactionInput => Boolean(input))
  const totals = new Map<Currency, { income: number; expense: number }>()

  for (const draft of selected) {
    const input = validations.get(draft.id)?.input
    if (!input) continue
    const total = totals.get(input.currency) ?? { income: 0, expense: 0 }
    if (input.type === 'income') total.income += input.amountMinor
    else total.expense += input.amountMinor
    totals.set(input.currency, total)
  }

  const format = (amountMinor: number, currency: Currency) =>
    new Intl.NumberFormat(french ? 'fr-FR' : 'en-MA', {
      style: 'currency',
      currency,
    }).format(minorToAmount(amountMinor, currency))

  function submit() {
    if (!selectedValid || selected.length === 0 || saving) return
    onSave(validInputs)
  }

  const labelClass = 'grid min-w-0 gap-1.5 text-xs font-semibold text-foreground'

  return (
    <Card className="p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-extrabold">
            {french ? 'Vérifier les transactions proposées' : 'Review proposed transactions'}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {french
              ? 'Rien n’est enregistré avant votre confirmation. Ne comptez pas une seconde fois le paiement d’une vente déjà enregistrée comme revenu ; ce journal ne gère pas la comptabilité d’engagement complète.'
              : 'Nothing is saved until you confirm. Do not count payment for a sale again if that sale was already recorded as income; this log does not implement full accrual accounting.'}
          </p>
        </div>
        <Button onClick={onAddManual} type="button" variant="outline">
          <Plus aria-hidden="true" size={16} />
          {french ? 'Ajouter manuellement' : 'Add manually'}
        </Button>
      </header>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border p-3">
          <p className="text-xs text-muted-foreground">{french ? 'Sélectionnées' : 'Selected'}</p>
          <p className="financial-value mt-1 text-lg font-bold">{selected.length}</p>
        </div>
        {totals.size === 0 ? (
          <div className="rounded-xl border border-border p-3 sm:col-span-1">
            <p className="text-xs text-muted-foreground">{french ? 'Totaux par devise' : 'Totals by currency'}</p>
            <p className="mt-1 text-sm font-semibold">—</p>
          </div>
        ) : [...totals].map(([currency, total]) => (
          <div className="rounded-xl border border-border p-3" key={currency}>
            <p className="text-xs text-muted-foreground">{currency} · {french ? 'Flux net' : 'Net cash flow'}</p>
            <p className="financial-value mt-1 text-sm font-bold">
              {format(total.income - total.expense, currency)}
            </p>
            <p className="mt-1 text-[0.7rem] text-muted-foreground">
              {french ? 'Revenus' : 'Income'} {format(total.income, currency)} · {french ? 'Dépenses' : 'Expenses'} {format(total.expense, currency)}
            </p>
          </div>
        ))}
      </div>

      {drafts.length === 0 ? (
        <div className="mt-5 grid min-h-32 place-items-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
          {french ? 'Aucune proposition à vérifier.' : 'No proposals to review.'}
        </div>
      ) : (
        <div className="mt-5 grid gap-3">
          {drafts.map((draft, index) => {
            const validation = validations.get(draft.id)
            const errors = validation?.errors ?? []
            const duplicate = duplicateIds.has(draft.id)
            const categories = getCategoriesForDirection(draft.type)

            return (
              <article
                className={`min-w-0 rounded-2xl border p-4 ${draft.selected ? 'border-border' : 'border-border/60 opacity-70'}`}
                key={draft.id}
              >
                <header className="flex items-center gap-3">
                  <input
                    aria-label={`${french ? 'Sélectionner la transaction' : 'Select transaction'} ${index + 1}`}
                    checked={draft.selected}
                    className="size-4 accent-primary"
                    onChange={(event) => onChange(draft.id, { selected: event.target.checked })}
                    type="checkbox"
                  />
                  <p className="min-w-0 flex-1 truncate text-sm font-bold">
                    {draft.description || (french ? `Proposition ${index + 1}` : `Proposal ${index + 1}`)}
                  </p>
                  <button
                    aria-label={`${french ? 'Retirer la proposition' : 'Remove proposal'} ${index + 1}`}
                    className="grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                    onClick={() => onRemove(draft.id)}
                    type="button"
                  >
                    <Trash2 aria-hidden="true" size={16} />
                  </button>
                </header>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <label className={labelClass}>
                    {french ? 'Description' : 'Description'}
                    <input
                      className={inputClasses}
                      maxLength={140}
                      onChange={(event) => onChange(draft.id, { description: event.target.value, duplicateConfirmed: false })}
                      value={draft.description}
                    />
                  </label>
                  <label className={labelClass}>
                    {french ? 'Sens' : 'Direction'}
                    <select
                      className={selectClasses}
                      onChange={(event) => {
                        const type = event.target.value as TransactionDraft['type']
                        onChange(draft.id, {
                          type,
                          category: type === 'income' ? 'other_income' : 'other_expense',
                          duplicateConfirmed: false,
                        })
                      }}
                      value={draft.type}
                    >
                      <option value="income">{french ? 'Revenu' : 'Income'}</option>
                      <option value="expense">{french ? 'Dépense' : 'Expense'}</option>
                    </select>
                  </label>
                  <label className={labelClass}>
                    {french ? 'Montant' : 'Amount'}
                    <input
                      className={`${inputClasses} financial-value`}
                      inputMode="decimal"
                      min="0.01"
                      onChange={(event) => onChange(draft.id, { amount: event.target.value, duplicateConfirmed: false })}
                      step={draft.currency === 'XAF' || draft.currency === 'XOF' ? '1' : '0.01'}
                      type="number"
                      value={draft.amount}
                    />
                  </label>
                  <label className={labelClass}>
                    {french ? 'Devise' : 'Currency'}
                    <select
                      className={selectClasses}
                      onChange={(event) => onChange(draft.id, { currency: event.target.value as Currency | '', duplicateConfirmed: false })}
                      value={draft.currency}
                    >
                      <option value="">{french ? 'À préciser' : 'Choose currency'}</option>
                      {currencies.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
                    </select>
                  </label>
                  <label className={labelClass}>
                    {french ? 'Catégorie' : 'Category'}
                    <select
                      className={selectClasses}
                      onChange={(event) => onChange(draft.id, { category: event.target.value, duplicateConfirmed: false })}
                      value={draft.category}
                    >
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {getTransactionCategoryLabel(category, language)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={labelClass}>
                    {french ? 'Date' : 'Date'}
                    <input
                      className={inputClasses}
                      onChange={(event) => onChange(draft.id, { transactionDate: event.target.value, duplicateConfirmed: false })}
                      type="date"
                      value={draft.transactionDate}
                    />
                  </label>
                  <label className={labelClass}>
                    {french ? 'Marchand (facultatif)' : 'Merchant (optional)'}
                    <input
                      className={inputClasses}
                      maxLength={120}
                      onChange={(event) => onChange(draft.id, { merchant: event.target.value })}
                      value={draft.merchant}
                    />
                  </label>
                  <label className={labelClass}>
                    {french ? 'Référence du reçu (facultative)' : 'Receipt reference (optional)'}
                    <input
                      className={inputClasses}
                      maxLength={120}
                      onChange={(event) => onChange(draft.id, { receiptReference: event.target.value, duplicateConfirmed: false })}
                      value={draft.receiptReference}
                    />
                  </label>
                  <label className={`${labelClass} sm:col-span-2 lg:col-span-1`}>
                    {french ? 'Notes (facultatif)' : 'Notes (optional)'}
                    <input
                      className={inputClasses}
                      maxLength={500}
                      onChange={(event) => onChange(draft.id, { notes: event.target.value })}
                      value={draft.notes}
                    />
                  </label>
                </div>

                {draft.selected && errors.length > 0 && (
                  <p className="mt-3 text-xs text-destructive" role="alert">
                    {french ? 'À corriger : ' : 'Please fix: '}
                    {errors.map((error) => ({
                      amount: french ? 'montant' : 'amount',
                      currency: french ? 'devise' : 'currency',
                      transactionDate: french ? 'date' : 'date',
                      description: french ? 'description' : 'description',
                      category: french ? 'catégorie' : 'category',
                      warnings: french ? 'vérifier les notes' : 'review extraction notes',
                    }[error] ?? error)).join(', ')}
                  </p>
                )}

                {draft.warnings.length > 0 && (
                  <div className="mt-3 rounded-xl border border-warning/30 bg-warning/5 p-3">
                    <p className="text-xs font-bold">{french ? 'Informations à vérifier' : 'Information to review'}</p>
                    <ul className="mt-1 list-disc pl-5 text-xs text-muted-foreground">
                      {draft.warnings.map((warning, warningIndex) => <li key={`${draft.id}-warning-${warningIndex}`}>{warning}</li>)}
                    </ul>
                    <label className="mt-3 flex items-start gap-2 text-xs">
                      <input
                        checked={draft.warningsReviewed}
                        className="mt-0.5 size-4 accent-primary"
                        onChange={(event) => onChange(draft.id, { warningsReviewed: event.target.checked })}
                        type="checkbox"
                      />
                      {french ? 'J’ai vérifié ces informations et corrigé les champs nécessaires.' : 'I reviewed this information and corrected any necessary fields.'}
                    </label>
                  </div>
                )}

                {duplicate && (
                  <div className="mt-3 rounded-xl border border-warning/30 bg-warning/5 p-3">
                    <p className="text-xs font-bold">
                      {french ? 'Doublon possible' : 'Possible duplicate'}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {french
                        ? 'Une transaction similaire existe déjà ou apparaît dans cette sélection. Vérifiez-la avant de continuer.'
                        : 'A similar transaction already exists or appears in this selection. Review it before continuing.'}
                    </p>
                    <label className="mt-3 flex items-start gap-2 text-xs">
                      <input
                        checked={draft.duplicateConfirmed}
                        className="mt-0.5 size-4 accent-primary"
                        onChange={(event) => onChange(draft.id, { duplicateConfirmed: event.target.checked })}
                        type="checkbox"
                      />
                      {french ? 'Confirmer qu’il s’agit d’une transaction distincte.' : 'Confirm this is a separate transaction.'}
                    </label>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <p className="text-xs text-muted-foreground">
          {french
            ? 'Les montants sont présentés séparément par devise. Vérifiez chaque proposition.'
            : 'Amounts are shown separately by currency. Review each proposal.'}
        </p>
        <Button
          disabled={!selectedValid || selected.length === 0 || saving}
          onClick={submit}
          type="button"
        >
          <Check aria-hidden="true" size={16} />
          {saving
            ? french ? 'Enregistrement…' : 'Saving…'
            : french ? 'Confirmer les transactions sélectionnées' : 'Confirm selected transactions'}
        </Button>
      </div>
    </Card>
  )
}

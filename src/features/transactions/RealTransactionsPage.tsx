import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Download, Pencil, Plus, Search, Trash2, WandSparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../app/providers/useAuth'
import { useLanguage } from '../../app/providers/useLanguage'
import { Dialog } from '../../components/common/Dialog'
import { PageHeader } from '../../components/common/PageHeader'
import { PageMeta } from '../../components/common/PageMeta'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { buttonClasses } from '../../components/ui/buttonStyles'
import { inputClasses, selectClasses } from '../../components/ui/fields'
import { creditBridgeDatabase } from '../../lib/db/database'
import type { LocalTransaction, LocalTransactionInput } from '../../lib/db/schema'
import {
  AccountTransactionRepository,
  amountToMinor,
  minorToAmount,
} from '../../lib/db/transactionRepository'
import { currencies, type Currency } from '../../lib/finance/currencies'
import {
  filterLocalTransactions,
  sumByCurrency,
  type LocalTransactionFilters,
} from '../../lib/finance/localTransactionAnalytics'
import { downloadTransactionsCsv } from '../../lib/finance/transactionCsv'
import { getTransactionCategoryLabel } from '../../lib/finance/transactionCategories'
import { LocalTransactionForm } from './LocalTransactionForm'

const pageSize = 10
const emptyTransactions: LocalTransaction[] = []

const defaultFilters: LocalTransactionFilters = {
  search: '',
  type: 'all',
  category: '',
  currency: 'all',
  fromDate: '',
  toDate: '',
  sort: 'date-desc',
}

export function RealTransactionsPage() {
  const { uid, profile } = useAuth()
  const { language } = useLanguage()
  const french = language === 'fr'
  const businessId = profile?.activeBusinessId
  const [filters, setFilters] = useState<LocalTransactionFilters>(defaultFilters)
  const [page, setPage] = useState(0)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [editing, setEditing] = useState<LocalTransaction>()
  const [deleteIds, setDeleteIds] = useState<string[]>([])
  const [isDeleting, setIsDeleting] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [filterError, setFilterError] = useState('')

  const transactionQuery = useLiveQuery(
    () => uid && businessId
      ? creditBridgeDatabase.transactions
        .where('[ownerId+businessId]')
        .equals([uid, businessId])
        .toArray()
      : [],
    [uid, businessId],
  )
  const transactions = transactionQuery ?? emptyTransactions
  const loading = Boolean(uid && businessId && transactionQuery === undefined)

  const filtered = filterLocalTransactions(transactions, filters)
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const visible = filtered.slice(page * pageSize, (page + 1) * pageSize)
  const totals = sumByCurrency(filtered)
  const visibleSelected = visible.length > 0
    && visible.every((item) => selectedIds.includes(item.id))

  function updateFilters(changes: Partial<LocalTransactionFilters>) {
    setFilters((current) => ({ ...current, ...changes }))
    setPage(0)
    setSelectedIds([])
    setFeedback('')
    setFilterError('')
  }

  function changeCurrency(currency: Currency | 'all') {
    updateFilters({
      currency,
      minAmountMinor: undefined,
      maxAmountMinor: undefined,
      sort: currency === 'all' && filters.sort.startsWith('amount-')
        ? 'date-desc'
        : filters.sort,
    })
  }

  function setAmountFilter(field: 'minAmountMinor' | 'maxAmountMinor', value: string) {
    if (!value) {
      if (field === 'minAmountMinor') updateFilters({ minAmountMinor: undefined })
      else updateFilters({ maxAmountMinor: undefined })
      return
    }
    if (filters.currency === 'all') {
      setFilterError(french
        ? 'Choisissez une devise avant de filtrer par montant.'
        : 'Choose a currency before filtering by amount.')
      return
    }
    try {
      const amountMinor = amountToMinor(Number(value), filters.currency)
      if (field === 'minAmountMinor') updateFilters({ minAmountMinor: amountMinor })
      else updateFilters({ maxAmountMinor: amountMinor })
    } catch {
      setFilterError(french
        ? 'Saisissez un montant valide pour cette devise.'
        : 'Enter a valid amount for this currency.')
    }
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((selectedId) => selectedId !== id)
        : [...current, id],
    )
    setFeedback('')
  }

  function toggleVisible() {
    setSelectedIds((current) => visibleSelected
      ? current.filter((id) => !visible.some((item) => item.id === id))
      : [...new Set([...current, ...visible.map((item) => item.id)])])
  }

  function format(amountMinor: number, currency: Currency) {
    return new Intl.NumberFormat(french ? 'fr-FR' : 'en-MA', {
      style: 'currency',
      currency,
    }).format(minorToAmount(amountMinor, currency))
  }

  function formatDate(date: string) {
    return new Intl.DateTimeFormat(french ? 'fr-FR' : 'en-MA', {
      dateStyle: 'medium',
      timeZone: 'UTC',
    }).format(new Date(`${date}T00:00:00.000Z`))
  }

  function exportRows(rows: LocalTransaction[]) {
    if (rows.length === 0) {
      setFeedback(french ? 'Aucune transaction à exporter.' : 'There are no transactions to export.')
      return
    }
    downloadTransactionsCsv(rows, language)
    setFeedback(french
      ? `${rows.length} transaction${rows.length > 1 ? 's' : ''} exportée${rows.length > 1 ? 's' : ''} localement.`
      : `${rows.length} transaction${rows.length > 1 ? 's' : ''} exported locally.`)
  }

  async function saveEdit(input: LocalTransactionInput) {
    if (!uid || !businessId || !editing) {
      throw new Error(french
        ? 'Aucun espace professionnel actif.'
        : 'There is no active business workspace.')
    }
    await new AccountTransactionRepository(uid, businessId).update(editing.id, input)
    setEditing(undefined)
    setFeedback(french ? 'Transaction mise à jour localement.' : 'Transaction updated locally.')
  }

  async function confirmDelete() {
    if (!uid || !businessId || deleteIds.length === 0 || isDeleting) return
    setIsDeleting(true)
    setFeedback('')
    try {
      await new AccountTransactionRepository(uid, businessId).removeMany(deleteIds)
      setSelectedIds((current) => current.filter((id) => !deleteIds.includes(id)))
      setFeedback(french
        ? `${deleteIds.length} transaction${deleteIds.length > 1 ? 's' : ''} supprimée${deleteIds.length > 1 ? 's' : ''} localement.`
        : `${deleteIds.length} transaction${deleteIds.length > 1 ? 's' : ''} deleted locally.`)
      setDeleteIds([])
    } catch {
      setFeedback(french
        ? 'La suppression a échoué. Les enregistrements locaux n’ont pas été modifiés.'
        : 'Deletion failed. Local records were not changed.')
    } finally {
      setIsDeleting(false)
    }
  }

  function startSingleDelete(id: string) {
    setDeleteIds([id])
  }

  const labelClass = 'grid min-w-0 gap-1.5 text-xs font-semibold'

  return (
    <>
      <PageMeta
        description={french ? 'Transactions locales protégées par votre compte.' : 'Local transactions scoped to your account.'}
        title={french ? 'Transactions' : 'Transactions'}
      />
      <PageHeader
        description={french
          ? 'Consultez et gérez les transactions locales de cette entreprise.'
          : 'Review and manage this business’s local transactions.'}
        eyebrow={french ? 'Données locales' : 'Local data'}
        title={french ? 'Transactions' : 'Transactions'}
      >
        <div className="flex flex-wrap gap-2">
          <Link className={buttonClasses('outline')} to="/app/capture?mode=receipt">
            <WandSparkles aria-hidden="true" size={16} />
            {french ? 'Scanner un reçu' : 'Scan receipt'}
          </Link>
          <Link className={buttonClasses('outline')} to="/app/capture">
            <WandSparkles aria-hidden="true" size={16} />
            {french ? 'Saisie intelligente' : 'Smart Capture'}
          </Link>
          <Link className={buttonClasses('primary')} to="/app/transactions/new">
            <Plus aria-hidden="true" size={16} />
            {french ? 'Ajouter' : 'Add transaction'}
          </Link>
        </div>
      </PageHeader>

      <Card className="p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className={`${labelClass} sm:col-span-2`}>
            {french ? 'Rechercher' : 'Search'}
            <span className="relative">
              <Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <input
                className={`${inputClasses} pl-9`}
                onChange={(event) => updateFilters({ search: event.target.value })}
                placeholder={french ? 'Description, marchand, notes, référence' : 'Description, merchant, notes, reference'}
                value={filters.search}
              />
            </span>
          </label>
          <label className={labelClass}>
            {french ? 'Type' : 'Direction'}
            <select className={selectClasses} onChange={(event) => updateFilters({ type: event.target.value as LocalTransactionFilters['type'] })} value={filters.type}>
              <option value="all">{french ? 'Tous les types' : 'All directions'}</option>
              <option value="income">{french ? 'Revenus' : 'Income'}</option>
              <option value="expense">{french ? 'Dépenses' : 'Expenses'}</option>
            </select>
          </label>
          <label className={labelClass}>
            {french ? 'Devise' : 'Currency'}
            <select className={selectClasses} onChange={(event) => changeCurrency(event.target.value as Currency | 'all')} value={filters.currency}>
              <option value="all">{french ? 'Toutes' : 'All currencies'}</option>
              {currencies.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
            </select>
          </label>
          <label className={labelClass}>
            {french ? 'Catégorie' : 'Category'}
            <select className={selectClasses} onChange={(event) => updateFilters({ category: event.target.value })} value={filters.category}>
              <option value="">{french ? 'Toutes les catégories' : 'All categories'}</option>
              {[...new Set(transactions.map((item) => item.category))].sort().map((category) => (
                <option key={category} value={category}>{getTransactionCategoryLabel(category, language)}</option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            {french ? 'Du' : 'From'}
            <input className={inputClasses} onChange={(event) => updateFilters({ fromDate: event.target.value })} type="date" value={filters.fromDate} />
          </label>
          <label className={labelClass}>
            {french ? 'Au' : 'To'}
            <input className={inputClasses} onChange={(event) => updateFilters({ toDate: event.target.value })} type="date" value={filters.toDate} />
          </label>
          <label className={labelClass}>
            {french ? 'Montant minimum' : 'Minimum amount'}
            <input
              className={inputClasses}
              disabled={filters.currency === 'all'}
              inputMode="decimal"
              onChange={(event) => setAmountFilter('minAmountMinor', event.target.value)}
              placeholder={filters.currency === 'all' ? '—' : filters.currency}
              type="number"
            />
          </label>
          <label className={labelClass}>
            {french ? 'Montant maximum' : 'Maximum amount'}
            <input
              className={inputClasses}
              disabled={filters.currency === 'all'}
              inputMode="decimal"
              onChange={(event) => setAmountFilter('maxAmountMinor', event.target.value)}
              placeholder={filters.currency === 'all' ? '—' : filters.currency}
              type="number"
            />
          </label>
          <label className={labelClass}>
            {french ? 'Trier par' : 'Sort by'}
            <select className={selectClasses} onChange={(event) => updateFilters({ sort: event.target.value as LocalTransactionFilters['sort'] })} value={filters.sort}>
              <option value="date-desc">{french ? 'Date : récentes' : 'Date: newest'}</option>
              <option value="date-asc">{french ? 'Date : anciennes' : 'Date: oldest'}</option>
              <option disabled={filters.currency === 'all'} value="amount-desc">{french ? 'Montant : élevé' : 'Amount: high'}</option>
              <option disabled={filters.currency === 'all'} value="amount-asc">{french ? 'Montant : faible' : 'Amount: low'}</option>
              <option value="description">{french ? 'Description' : 'Description'}</option>
            </select>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-bold">{filtered.length} {french ? 'transactions' : 'transactions'}</span>
            {[...totals].map(([currency, total]) => (
              <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground" key={currency}>
                {currency}: {format(total.incomeMinor, currency)} {french ? 'revenus' : 'income'} · {format(total.expenseMinor, currency)} {french ? 'dépenses' : 'expenses'}
              </span>
            ))}
          </div>
          <button
            className="text-xs font-bold text-primary underline-offset-4 hover:underline"
            onClick={() => {
              setFilters(defaultFilters)
              setPage(0)
              setSelectedIds([])
              setFilterError('')
            }}
            type="button"
          >
            {french ? 'Effacer les filtres' : 'Clear filters'}
          </button>
        </div>
        {filterError && <p className="mt-2 text-xs text-destructive" role="alert">{filterError}</p>}
      </Card>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => exportRows(transactions)} type="button" variant="outline">
            <Download aria-hidden="true" size={15} />{french ? 'Exporter tout' : 'Export all'}
          </Button>
          <Button onClick={() => exportRows(filtered)} type="button" variant="outline">
            <Download aria-hidden="true" size={15} />{french ? 'Exporter filtrées' : 'Export filtered'}
          </Button>
          <Button disabled={selectedIds.length === 0} onClick={() => exportRows(visible.filter((item) => selectedIds.includes(item.id)))} type="button" variant="outline">
            <Download aria-hidden="true" size={15} />{french ? `Exporter sélection (${selectedIds.length})` : `Export selected (${selectedIds.length})`}
          </Button>
          <Button disabled={selectedIds.length === 0} onClick={() => setDeleteIds(selectedIds)} type="button" variant="outline">
            <Trash2 aria-hidden="true" size={15} />{french ? `Supprimer (${selectedIds.length})` : `Delete (${selectedIds.length})`}
          </Button>
        </div>
        <label className="flex min-h-10 items-center gap-2 text-xs font-semibold">
          <input checked={visibleSelected} className="size-4 accent-primary" onChange={toggleVisible} type="checkbox" />
          {french ? 'Sélectionner la page' : 'Select page'}
        </label>
      </div>

      {feedback && <p className="mt-3 text-sm text-muted-foreground" role="status">{feedback}</p>}

      <Card className="mt-3 overflow-hidden">
        {loading ? (
          <div className="grid min-h-56 place-items-center text-sm text-muted-foreground">
            {french ? 'Chargement des transactions locales…' : 'Loading local transactions…'}
          </div>
        ) : filtered.length === 0 ? (
          <div className="grid min-h-56 place-items-center px-5 text-center">
            <div>
              <p className="font-semibold">{transactions.length === 0
                ? french ? 'Aucune transaction enregistrée.' : 'No transactions recorded.'
                : french ? 'Aucune transaction ne correspond aux filtres.' : 'No transactions match these filters.'}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {french ? 'Ajoutez une transaction ou utilisez la saisie intelligente.' : 'Add a transaction or use Smart Capture.'}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="w-10 p-3"><span className="sr-only">{french ? 'Sélectionner' : 'Select'}</span></th>
                    <th className="p-3">{french ? 'Date' : 'Date'}</th>
                    <th className="p-3">{french ? 'Description' : 'Description'}</th>
                    <th className="p-3">{french ? 'Catégorie' : 'Category'}</th>
                    <th className="p-3">{french ? 'Type' : 'Direction'}</th>
                    <th className="p-3 text-right">{french ? 'Montant' : 'Amount'}</th>
                    <th className="p-3 text-right">{french ? 'Actions' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visible.map((item) => (
                    <tr key={item.id}>
                      <td className="p-3">
                        <input aria-label={`${french ? 'Sélectionner' : 'Select'} ${item.description}`} checked={selectedIds.includes(item.id)} className="size-4 accent-primary" onChange={() => toggleSelected(item.id)} type="checkbox" />
                      </td>
                      <td className="whitespace-nowrap p-3 text-xs text-muted-foreground">{formatDate(item.transactionDate)}</td>
                      <td className="max-w-56 p-3">
                        <p className="truncate font-semibold">{item.description}</p>
                        {item.merchant && <p className="truncate text-xs text-muted-foreground">{item.merchant}</p>}
                      </td>
                      <td className="p-3 text-xs">{getTransactionCategoryLabel(item.category, language)}</td>
                      <td className="p-3 text-xs">{item.type === 'income' ? french ? 'Revenu' : 'Income' : french ? 'Dépense' : 'Expense'}</td>
                      <td className={`financial-value whitespace-nowrap p-3 text-right font-bold ${item.type === 'income' ? 'text-secondary' : 'text-foreground'}`}>
                        {format(item.amountMinor, item.currency)}
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end gap-1">
                          <button aria-label={`${french ? 'Modifier' : 'Edit'} ${item.description}`} className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" onClick={() => setEditing(item)} type="button"><Pencil size={15} /></button>
                          <button aria-label={`${french ? 'Supprimer' : 'Delete'} ${item.description}`} className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" onClick={() => startSingleDelete(item.id)} type="button"><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-border md:hidden">
              {visible.map((item) => (
                <li className="p-4" key={item.id}>
                  <div className="flex items-start gap-3">
                    <input aria-label={`${french ? 'Sélectionner' : 'Select'} ${item.description}`} checked={selectedIds.includes(item.id)} className="mt-1 size-4 accent-primary" onChange={() => toggleSelected(item.id)} type="checkbox" />
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-bold">{item.description}</p>
                      <p className="mt-1 break-words text-xs text-muted-foreground">
                        {formatDate(item.transactionDate)} · {getTransactionCategoryLabel(item.category, language)}
                      </p>
                      <p className={`financial-value mt-2 text-sm font-bold ${item.type === 'income' ? 'text-secondary' : 'text-foreground'}`}>
                        {item.type === 'income' ? '+' : '−'}{format(item.amountMinor, item.currency)}
                      </p>
                    </div>
                    <div className="flex shrink-0">
                      <button aria-label={`${french ? 'Modifier' : 'Edit'} ${item.description}`} className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted" onClick={() => setEditing(item)} type="button"><Pencil size={15} /></button>
                      <button aria-label={`${french ? 'Supprimer' : 'Delete'} ${item.description}`} className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive" onClick={() => startSingleDelete(item.id)} type="button"><Trash2 size={15} /></button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <footer className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 text-xs">
              <p>{french ? 'Page' : 'Page'} {page + 1} {french ? 'sur' : 'of'} {pageCount}</p>
              <div className="flex gap-2">
                <Button disabled={page === 0} onClick={() => { setPage((current) => current - 1); setSelectedIds([]) }} type="button" variant="outline">{french ? 'Précédent' : 'Previous'}</Button>
                <Button disabled={page + 1 >= pageCount} onClick={() => { setPage((current) => current + 1); setSelectedIds([]) }} type="button" variant="outline">{french ? 'Suivant' : 'Next'}</Button>
              </div>
            </footer>
          </>
        )}
      </Card>

      <Dialog
        description={french
          ? 'Les champs immuables du compte et de la création sont conservés.'
          : 'Immutable account and creation fields are preserved.'}
        open={Boolean(editing)}
        title={french ? 'Modifier la transaction' : 'Edit transaction'}
        onClose={() => setEditing(undefined)}
      >
        {editing && (
          <LocalTransactionForm
            currency={editing.currency}
            initial={editing}
            onSubmit={saveEdit}
            submitLabel={french ? 'Enregistrer les modifications' : 'Save changes'}
          />
        )}
      </Dialog>

      <Dialog
        alert
        description={french
          ? 'Cette action supprime uniquement les enregistrements locaux sélectionnés. Elle est irréversible.'
          : 'This removes only the selected local records. This action cannot be undone.'}
        open={deleteIds.length > 0}
        title={french
          ? `Supprimer ${deleteIds.length} transaction${deleteIds.length > 1 ? 's' : ''} ?`
          : `Delete ${deleteIds.length} transaction${deleteIds.length > 1 ? 's' : ''}?`}
        onClose={() => setDeleteIds([])}
      >
        <div className="flex flex-wrap justify-end gap-2">
          <Button onClick={() => setDeleteIds([])} type="button" variant="outline">{french ? 'Annuler' : 'Cancel'}</Button>
          <Button disabled={isDeleting} onClick={() => void confirmDelete()} type="button" variant="danger">
            {isDeleting ? french ? 'Suppression…' : 'Deleting…' : french ? 'Supprimer' : 'Delete'}
          </Button>
        </div>
      </Dialog>
    </>
  )
}

import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  ArrowDown,
  ArrowDownUp,
  ArrowUp,
  Eye,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useDemoData } from '../../app/providers/useDemoData'
import { useLanguage } from '../../app/providers/useLanguage'
import { Dialog } from '../../components/common/Dialog'
import { PageHeader } from '../../components/common/PageHeader'
import { PageMeta } from '../../components/common/PageMeta'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { inputClasses, selectClasses } from '../../components/ui/fields'
import { buttonClasses } from '../../components/ui/buttonStyles'
import type { DemoTransaction } from '../../demo/repository'
import { formatCurrency, formatDate } from '../../lib/finance/calculations'
import { TransactionForm } from './TransactionForm'

type TransactionSort = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'
const pageSize = 8

export function TransactionsPage() {
  const {
    transactions,
    updateTransaction,
    deleteTransaction,
    resetDemoData,
    error: repositoryError,
  } = useDemoData()
  const { language, t } = useLanguage()
  const [query, setQuery] = useState('')
  const [type, setType] = useState<'all' | 'income' | 'expense'>('all')
  const [category, setCategory] = useState('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [sort, setSort] = useState<TransactionSort>('date-desc')
  const [requestedPage, setRequestedPage] = useState(1)
  const [selected, setSelected] = useState<DemoTransaction | null>(null)
  const [editing, setEditing] = useState<DemoTransaction | null>(null)
  const [deleting, setDeleting] = useState<DemoTransaction | null>(null)
  const [resetOpen, setResetOpen] = useState(false)
  const [actionError, setActionError] = useState('')

  const categories = useMemo(
    () => [...new Set(transactions.map((transaction) => transaction.category))].sort((a, b) => a.localeCompare(b)),
    [transactions],
  )
  const filteredTransactions = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase(language)
    return transactions
      .filter((transaction) => {
        const matchesQuery = normalizedQuery.length === 0 || [
          transaction.description,
          transaction.category,
          transaction.id,
        ].some((value) => value.toLocaleLowerCase(language).includes(normalizedQuery))
        const matchesType = type === 'all' || transaction.type === type
        const matchesCategory = category === 'all' || transaction.category === category
        const matchesFrom = !fromDate || transaction.date >= fromDate
        const matchesTo = !toDate || transaction.date <= toDate
        return matchesQuery && matchesType && matchesCategory && matchesFrom && matchesTo
      })
      .sort((left, right) => {
        if (sort === 'date-desc') return right.date.localeCompare(left.date)
        if (sort === 'date-asc') return left.date.localeCompare(right.date)
        return sort === 'amount-desc'
          ? right.amount - left.amount
          : left.amount - right.amount
      })
  }, [transactions, query, language, type, category, fromDate, toDate, sort])
  const pageCount = Math.max(1, Math.ceil(filteredTransactions.length / pageSize))
  const page = Math.min(requestedPage, pageCount)
  const pageTransactions = filteredTransactions.slice((page - 1) * pageSize, page * pageSize)
  const french = language === 'fr'

  function resetPage() {
    setRequestedPage(1)
  }

  function saveEdit(input: Parameters<typeof updateTransaction>[1]) {
    if (!editing) return
    updateTransaction(editing.id, input)
    setEditing(null)
    setActionError('')
  }

  function removeTransaction() {
    if (!deleting) return
    try {
      deleteTransaction(deleting.id)
      setDeleting(null)
      setActionError('')
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'The transaction could not be deleted.')
      setDeleting(null)
    }
  }

  function restoreDemoData() {
    try {
      resetDemoData()
      setResetOpen(false)
      setActionError('')
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'The demonstration data could not be restored.')
      setResetOpen(false)
    }
  }

  const typeLabel = (transactionType: 'income' | 'expense') => transactionType === 'income'
    ? (french ? 'Revenu' : 'Income')
    : (french ? 'Dépense' : 'Expense')

  return (
    <>
      <PageMeta description={t('transactions.subtitle')} title={t('transactions.title')} />
      <PageHeader description={t('transactions.subtitle')} eyebrow={t('common.demoLabel')} title={t('transactions.title')}>
        <Link className={buttonClasses('primary')} to="/app/transactions/new">
          <Plus aria-hidden="true" size={17} /> {t('transactions.add')}
        </Link>
      </PageHeader>

      <Card className="p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(12rem,1.5fr)_repeat(4,minmax(8rem,1fr))]">
          <label className="relative">
            <span className="sr-only">{t('transactions.search')}</span>
            <Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input
              className={`${inputClasses} pl-9`}
              onChange={(event) => { setQuery(event.target.value); resetPage() }}
              placeholder={t('transactions.search')}
              type="search"
              value={query}
            />
          </label>
          <label>
            <span className="sr-only">{t('common.type')}</span>
            <select className={selectClasses} onChange={(event) => { setType(event.target.value as typeof type); resetPage() }} value={type}>
              <option value="all">{french ? 'Tous les types' : 'All types'}</option>
              <option value="income">{french ? 'Revenu' : 'Income'}</option>
              <option value="expense">{french ? 'Dépense' : 'Expense'}</option>
            </select>
          </label>
          <label>
            <span className="sr-only">{t('common.category')}</span>
            <select className={selectClasses} onChange={(event) => { setCategory(event.target.value); resetPage() }} value={category}>
              <option value="all">{french ? 'Toutes catégories' : 'All categories'}</option>
              {categories.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label>
            <span className="sr-only">{french ? 'De la date' : 'From date'}</span>
            <input aria-label={french ? 'De la date' : 'From date'} className={inputClasses} onChange={(event) => { setFromDate(event.target.value); resetPage() }} type="date" value={fromDate} />
          </label>
          <label>
            <span className="sr-only">{french ? 'À la date' : 'To date'}</span>
            <input aria-label={french ? 'À la date' : 'To date'} className={inputClasses} onChange={(event) => { setToDate(event.target.value); resetPage() }} type="date" value={toDate} />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
          <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <ArrowDownUp aria-hidden="true" size={15} />
            {t('common.sortBy')}
            <select className={`${selectClasses} min-h-9 w-auto py-1 text-xs`} onChange={(event) => { setSort(event.target.value as TransactionSort); resetPage() }} value={sort}>
              <option value="date-desc">{french ? 'Date : récent' : 'Date: newest'}</option>
              <option value="date-asc">{french ? 'Date : ancien' : 'Date: oldest'}</option>
              <option value="amount-desc">{french ? 'Montant : décroissant' : 'Amount: high to low'}</option>
              <option value="amount-asc">{french ? 'Montant : croissant' : 'Amount: low to high'}</option>
            </select>
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {filteredTransactions.length} {french ? 'résultat(s) synthétique(s)' : 'synthetic result(s)'}
            </span>
            <Button onClick={() => setResetOpen(true)} variant="outline">
              <RotateCcw aria-hidden="true" size={15} /> {t('transactions.reset')}
            </Button>
          </div>
        </div>
      </Card>

      {(actionError || repositoryError) && (
        <p className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">
          {actionError || repositoryError}
        </p>
      )}

      <Card className="mt-4 overflow-hidden">
        {pageTransactions.length === 0 ? (
          <div className="grid min-h-56 place-items-center px-5 py-10 text-center">
            <div>
              <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground"><Search aria-hidden="true" size={20} /></span>
              <p className="mt-4 text-sm font-semibold text-foreground">{t('transactions.empty')}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {french ? 'Essayez de modifier les filtres ou créez une entrée synthétique.' : 'Try adjusting the filters or add a synthetic record.'}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">{french ? 'Transactions synthétiques' : 'Synthetic transactions'}</caption>
                <thead className="border-b border-border bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 font-semibold">{t('common.date')}</th>
                    <th className="px-5 py-3 font-semibold">{t('common.description')}</th>
                    <th className="px-5 py-3 font-semibold">{t('common.category')}</th>
                    <th className="px-5 py-3 font-semibold">{t('common.type')}</th>
                    <th className="px-5 py-3 text-right font-semibold">{t('common.amount')}</th>
                    <th className="px-5 py-3 text-right font-semibold">{french ? 'Actions' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pageTransactions.map((transaction) => (
                    <tr className="group hover:bg-muted/30" key={transaction.id}>
                      <td className="whitespace-nowrap px-5 py-3.5 text-xs text-muted-foreground">{formatDate(transaction.date, language)}</td>
                      <td className="max-w-60 truncate px-5 py-3.5 font-semibold text-foreground">{transaction.description}</td>
                      <td className="px-5 py-3.5 text-xs text-muted-foreground">{transaction.category}</td>
                      <td className="px-5 py-3.5">
                        <Badge tone={transaction.type === 'income' ? 'success' : 'warning'}>{typeLabel(transaction.type)}</Badge>
                      </td>
                      <td className={`financial-value whitespace-nowrap px-5 py-3.5 text-right font-semibold ${transaction.type === 'income' ? 'text-success' : 'text-foreground'}`}>
                        {transaction.type === 'income' ? '+' : '−'}{formatCurrency(transaction.amount, transaction.currency, language)}
                      </td>
                      <td className="px-5 py-3.5">
                        <TransactionActions
                          language={language}
                          onDelete={() => setDeleting(transaction)}
                          onDetails={() => setSelected(transaction)}
                          onEdit={() => setEditing(transaction)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-border md:hidden">
              {pageTransactions.map((transaction) => (
                <li className="p-4" key={transaction.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{transaction.description}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{formatDate(transaction.date, language)} · {transaction.category}</p>
                    </div>
                    <span className={`financial-value shrink-0 text-sm font-bold ${transaction.type === 'income' ? 'text-success' : 'text-foreground'}`}>
                      {transaction.type === 'income' ? '+' : '−'}{formatCurrency(transaction.amount, transaction.currency, language)}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <Badge tone={transaction.type === 'income' ? 'success' : 'warning'}>{typeLabel(transaction.type)}</Badge>
                    <TransactionActions
                      language={language}
                      onDelete={() => setDeleting(transaction)}
                      onDetails={() => setSelected(transaction)}
                      onEdit={() => setEditing(transaction)}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
        {filteredTransactions.length > pageSize && (
          <nav aria-label={french ? 'Pagination des transactions' : 'Transaction pagination'} className="flex items-center justify-between border-t border-border px-4 py-3 sm:px-5">
            <span className="text-xs text-muted-foreground">{t('common.page')} {page} {t('common.of')} {pageCount}</span>
            <div className="flex gap-2">
              <Button disabled={page <= 1} onClick={() => setRequestedPage((current) => Math.max(1, current - 1))} variant="outline">
                <ArrowUp aria-hidden="true" className="-rotate-90" size={14} /> {t('common.previous')}
              </Button>
              <Button disabled={page >= pageCount} onClick={() => setRequestedPage((current) => Math.min(pageCount, current + 1))} variant="outline">
                <ArrowDown aria-hidden="true" className="-rotate-90" size={14} /> {t('common.next')}
              </Button>
            </div>
          </nav>
        )}
      </Card>

      <Dialog
        description={selected ? `${selected.category} · ${typeLabel(selected.type)}` : undefined}
        onClose={() => setSelected(null)}
        open={selected !== null}
        title={selected?.description ?? (french ? 'Transaction' : 'Transaction')}
      >
        {selected && (
          <dl className="grid gap-3 sm:grid-cols-2">
            <DetailItem label={t('common.date')} value={formatDate(selected.date, language)} />
            <DetailItem label={t('common.amount')} value={formatCurrency(selected.amount, selected.currency, language)} />
            <DetailItem label={t('common.category')} value={selected.category} />
            <DetailItem label={t('common.type')} value={typeLabel(selected.type)} />
          </dl>
        )}
      </Dialog>

      <Dialog
        className="max-w-2xl"
        description={french ? 'Les modifications restent dans les données synthétiques de ce navigateur.' : 'Changes remain in the synthetic data stored in this browser.'}
        onClose={() => setEditing(null)}
        open={editing !== null}
        title={french ? 'Modifier la transaction démo' : 'Edit demo transaction'}
      >
        {editing && <TransactionForm initial={editing} onSubmit={saveEdit} submitLabel={t('common.save')} />}
      </Dialog>

      <Dialog
        alert
        description={french ? 'Cette action supprime uniquement cet enregistrement synthétique de ce navigateur.' : 'This removes only this synthetic record from this browser.'}
        onClose={() => setDeleting(null)}
        open={deleting !== null}
        title={french ? 'Supprimer la transaction ?' : 'Delete transaction?'}
      >
        <div className="flex justify-end gap-2">
          <Button onClick={() => setDeleting(null)} variant="outline">{t('common.cancel')}</Button>
          <Button onClick={removeTransaction} variant="danger"><Trash2 aria-hidden="true" size={15} /> {t('common.delete')}</Button>
        </div>
      </Dialog>

      <Dialog
        alert
        description={t('common.resetConfirm')}
        onClose={() => setResetOpen(false)}
        open={resetOpen}
        title={french ? 'Restaurer les données de démonstration ?' : 'Restore demonstration data?'}
      >
        <div className="flex justify-end gap-2">
          <Button onClick={() => setResetOpen(false)} variant="outline">{t('common.cancel')}</Button>
          <Button onClick={restoreDemoData} variant="primary"><RotateCcw aria-hidden="true" size={15} /> {french ? 'Restaurer les données' : 'Restore demo data'}</Button>
        </div>
      </Dialog>
    </>
  )
}

function TransactionActions({
  language,
  onDetails,
  onEdit,
  onDelete,
}: {
  language: 'en' | 'fr'
  onDetails: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="flex justify-end gap-1">
      <ActionButton label={language === 'fr' ? 'Détails' : 'Details'} onClick={onDetails}><Eye aria-hidden="true" size={15} /></ActionButton>
      <ActionButton label={language === 'fr' ? 'Modifier' : 'Edit'} onClick={onEdit}><Pencil aria-hidden="true" size={15} /></ActionButton>
      <ActionButton label={language === 'fr' ? 'Supprimer' : 'Delete'} onClick={onDelete}><Trash2 aria-hidden="true" size={15} /></ActionButton>
    </div>
  )
}

function ActionButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      aria-label={label}
      className="grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  )
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1.5 break-words text-sm font-semibold text-foreground">{value}</dd>
    </div>
  )
}

import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../app/providers/useAuth'
import { useLanguage } from '../../app/providers/useLanguage'
import { PageHeader } from '../../components/common/PageHeader'
import { PageMeta } from '../../components/common/PageMeta'
import { Card } from '../../components/ui/Card'
import { buttonClasses } from '../../components/ui/buttonStyles'
import { Dialog } from '../../components/common/Dialog'
import { creditBridgeDatabase } from '../../lib/db/database'
import { AccountTransactionRepository, minorToAmount } from '../../lib/db/transactionRepository'

export function RealTransactionsPage() {
  const { uid, profile } = useAuth()
  const { language } = useLanguage()
  const french = language === 'fr'
  const businessId = profile?.activeBusinessId
  const [deleting, setDeleting] = useState<string | null>(null)
  const transactions = useLiveQuery(
    () => uid && businessId
      ? creditBridgeDatabase.transactions.where('[ownerId+businessId]').equals([uid, businessId]).reverse().sortBy('transactionDate')
      : [],
    [uid, businessId],
  ) ?? []

  async function remove() {
    if (!uid || !businessId || !deleting) return
    await new AccountTransactionRepository(uid, businessId).remove(deleting)
    setDeleting(null)
  }

  return (
    <>
      <PageMeta description={french ? 'Transactions locales protégées par votre compte.' : 'Local transactions scoped to your account.'} title={french ? 'Transactions' : 'Transactions'} />
      <PageHeader description={french ? 'Vos transactions sont conservées uniquement dans IndexedDB.' : 'Your transactions are stored only in IndexedDB.'} eyebrow={french ? 'Données locales' : 'Local data'} title={french ? 'Transactions' : 'Transactions'}><Link className={buttonClasses('primary')} to="/app/transactions/new"><Plus size={16} />{french ? 'Ajouter' : 'Add transaction'}</Link></PageHeader>
      <Card className="overflow-hidden">
        {transactions.length === 0 ? <div className="grid min-h-56 place-items-center text-center"><p className="text-sm font-semibold">{french ? 'Aucune transaction enregistrée.' : 'No transactions recorded.'}</p></div> : <div className="divide-y divide-border">{transactions.map((item) => <div className="flex items-center gap-3 px-4 py-3" key={item.id}><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{item.description}</p><p className="text-xs text-muted-foreground">{item.category} · {item.transactionDate}</p></div><p className="financial-value text-sm font-bold">{new Intl.NumberFormat(french ? 'fr-FR' : 'en-MA', { style: 'currency', currency: item.currency }).format(minorToAmount(item.amountMinor, item.currency))}</p><button aria-label={french ? 'Modifier' : 'Edit'} className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted" type="button"><Pencil size={15} /></button><button aria-label={french ? 'Supprimer' : 'Delete'} className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive" onClick={() => setDeleting(item.id)} type="button"><Trash2 size={15} /></button></div>)}</div>}
      </Card>
      <Dialog description={french ? 'Cette action supprime uniquement la copie locale.' : 'This removes only the local copy.'} open={Boolean(deleting)} title={french ? 'Supprimer la transaction ?' : 'Delete transaction?'} onClose={() => setDeleting(null)}>
        <button className="min-h-10 rounded-xl border border-destructive/30 px-4 text-sm font-bold text-destructive" onClick={remove} type="button">{french ? 'Supprimer' : 'Delete'}</button>
      </Dialog>
    </>
  )
}

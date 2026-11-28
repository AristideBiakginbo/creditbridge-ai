import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowDownRight, ArrowUpRight, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../app/providers/useAuth'
import { useLanguage } from '../../app/providers/useLanguage'
import { PageMeta } from '../../components/common/PageMeta'
import { PageHeader } from '../../components/common/PageHeader'
import { StatCard } from '../../components/common/StatCard'
import { Card } from '../../components/ui/Card'
import { buttonClasses } from '../../components/ui/buttonStyles'
import { creditBridgeDatabase } from '../../lib/db/database'
import { minorToAmount } from '../../lib/db/transactionRepository'

export function RealDashboardPage() {
  const { uid, profile } = useAuth()
  const { language } = useLanguage()
  const french = language === 'fr'
  const businessId = profile?.activeBusinessId
  const business = useLiveQuery(
    () => businessId ? creditBridgeDatabase.businesses.get(businessId) : undefined,
    [businessId],
  )
  const transactions = useLiveQuery(
    () => uid && businessId
      ? creditBridgeDatabase.transactions.where('[ownerId+businessId]').equals([uid, businessId]).reverse().sortBy('transactionDate')
      : [],
    [uid, businessId],
  ) ?? []
  const currency = business?.currency ?? 'MAD'
  const incomeMinor = transactions.reduce((sum, item) => sum + (item.type === 'income' ? item.amountMinor : 0), 0)
  const expenseMinor = transactions.reduce((sum, item) => sum + (item.type === 'expense' ? item.amountMinor : 0), 0)
  const format = (minor: number) => new Intl.NumberFormat(french ? 'fr-FR' : 'en-MA', { style: 'currency', currency }).format(minorToAmount(minor, currency))

  return (
    <>
      <PageMeta description={french ? 'Vos données financières locales.' : 'Your local financial records.'} title={french ? 'Tableau de bord' : 'Dashboard'} />
      <PageHeader description={french ? 'Calculé uniquement à partir des transactions locales.' : 'Calculated only from your local transactions.'} eyebrow={french ? 'Espace réel' : 'Real workspace'} title={french ? 'Aperçu financier' : 'Financial overview'}>
        <Link className={buttonClasses('primary')} to="/app/transactions/new"><Plus size={16} />{french ? 'Ajouter une transaction' : 'Add transaction'}</Link>
      </PageHeader>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard icon={ArrowUpRight} label={french ? 'Revenus' : 'Income'} note={french ? 'Transactions locales' : 'Local transactions'} tone="teal" value={format(incomeMinor)} />
        <StatCard icon={ArrowDownRight} label={french ? 'Dépenses' : 'Expenses'} note={french ? 'Transactions locales' : 'Local transactions'} tone="amber" value={format(expenseMinor)} />
        <StatCard icon={ArrowUpRight} label={french ? 'Flux net' : 'Net cash flow'} note={french ? 'Revenus moins dépenses' : 'Income less expenses'} tone="primary" value={format(incomeMinor - expenseMinor)} />
      </div>
      <Card className="mt-4 p-5">
        {transactions.length === 0 ? <div className="grid min-h-48 place-items-center text-center"><div><p className="font-bold">{french ? 'Aucune transaction pour le moment' : 'No transactions yet'}</p><p className="mt-2 text-sm text-muted-foreground">{french ? 'Ajoutez votre première activité financière locale.' : 'Add your first local financial activity.'}</p></div></div> : <ul className="grid gap-2">{transactions.slice(0, 8).map((item) => <li className="flex items-center justify-between rounded-xl border border-border px-4 py-3 text-sm" key={item.id}><div><p className="font-semibold">{item.description}</p><p className="text-xs text-muted-foreground">{item.category} · {item.transactionDate}</p></div><span className="financial-value font-bold">{format(item.type === 'income' ? item.amountMinor : -item.amountMinor)}</span></li>)}</ul>}
      </Card>
    </>
  )
}

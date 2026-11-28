import { useMemo, useState } from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  FileImage,
  Plus,
  WandSparkles,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { useAuth } from '../../app/providers/useAuth'
import { useLanguage } from '../../app/providers/useLanguage'
import { ChartCard } from '../../components/common/ChartCard'
import { PageHeader } from '../../components/common/PageHeader'
import { PageMeta } from '../../components/common/PageMeta'
import { StatCard } from '../../components/common/StatCard'
import { Card } from '../../components/ui/Card'
import { buttonClasses } from '../../components/ui/buttonStyles'
import { selectClasses } from '../../components/ui/fields'
import { creditBridgeDatabase } from '../../lib/db/database'
import type { LocalTransaction } from '../../lib/db/schema'
import { minorToAmount } from '../../lib/db/transactionRepository'
import type { Currency } from '../../lib/finance/currencies'
import {
  calculateLocalMetrics,
  filterByDateWindow,
  getDateWindow,
  getPreviousDateWindow,
  groupDailyCashFlow,
  groupExpensesByCategoryMinor,
  groupMonthlyCashFlow,
  type TransactionPeriod,
} from '../../lib/finance/localTransactionAnalytics'
import { getTransactionCategoryLabel } from '../../lib/finance/transactionCategories'
import {
  normalizeBusinessTimeZone,
  resolveBusinessTimeZone,
} from '../../lib/time/timezone'

const chartColors = [
  'var(--cb-chart-1)',
  'var(--cb-chart-2)',
  'var(--cb-chart-3)',
  'var(--cb-chart-4)',
  'var(--cb-chart-5)',
]
const emptyTransactions: LocalTransaction[] = []

function formatCurrency(
  amountMinor: number,
  currency: Currency,
  language: 'en' | 'fr',
): string {
  return new Intl.NumberFormat(language === 'fr' ? 'fr-FR' : 'en-MA', {
    style: 'currency',
    currency,
  }).format(minorToAmount(amountMinor, currency))
}

function getComparison(
  current: number,
  previous: number,
  language: 'en' | 'fr',
): string {
  if (previous === 0) {
    return language === 'fr' ? 'Aucune activité antérieure comparable' : 'No comparable prior activity'
  }
  const percent = Math.round(((current - previous) / Math.abs(previous)) * 100)
  return language === 'fr'
    ? `${percent > 0 ? '+' : ''}${percent}% par rapport à la période précédente`
    : `${percent > 0 ? '+' : ''}${percent}% vs. previous period`
}

function ChartEmpty({ language }: { language: 'en' | 'fr' }) {
  return (
    <div className="grid h-56 place-items-center rounded-xl border border-dashed border-border px-4 text-center text-sm text-muted-foreground">
      {language === 'fr' ? 'Aucune donnée locale pour cette période.' : 'No local records in this period.'}
    </div>
  )
}

export function RealDashboardPage() {
  const { uid, profile } = useAuth()
  const { language } = useLanguage()
  const french = language === 'fr'
  const businessId = profile?.activeBusinessId
  const [period, setPeriod] = useState<TransactionPeriod>('30-days')
  const [currencySelection, setCurrencySelection] = useState<Currency | 'business'>('business')

  const business = useLiveQuery(async () => {
    if (!uid || !businessId) return undefined
    const record = await creditBridgeDatabase.businesses.get(businessId)
    return record?.ownerId === uid
      ? {
          ...record,
          timezone: normalizeBusinessTimeZone(record.timezone, record.country),
        }
      : undefined
  }, [uid, businessId])

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
  const activeCurrency = currencySelection === 'business'
    ? business?.currency ?? 'MAD'
    : currencySelection
  const currencyOptions = useMemo(
    () => [...new Set<Currency>([
      business?.currency ?? 'MAD',
      ...transactions.map((item) => item.currency),
    ])],
    [business?.currency, transactions],
  )
  const [today] = useState(() => new Date())
  const timeZoneResolution = business
    ? resolveBusinessTimeZone(business.timezone, business.country)
    : undefined
  const hasInvalidBusinessTimeZone = Boolean(business && !timeZoneResolution)
  const dashboardTimeZone = timeZoneResolution?.timeZone
  const window = getDateWindow(period, today, dashboardTimeZone)
  const currentPeriodTransactions = filterByDateWindow(transactions, window)
    .filter((item) => item.currency === activeCurrency)
  const metrics = calculateLocalMetrics(currentPeriodTransactions)
  const previousWindow = period === 'all'
    ? undefined
    : getPreviousDateWindow(period, today, dashboardTimeZone)
  const previousMetrics = period === 'all'
    ? undefined
    : calculateLocalMetrics(
        filterByDateWindow(transactions, previousWindow)
          .filter((item) => item.currency === activeCurrency),
      )
  const expensesByCategory = groupExpensesByCategoryMinor(currentPeriodTransactions)
  const recent = [...currentPeriodTransactions]
    .sort((left, right) => right.transactionDate.localeCompare(left.transactionDate))
    .slice(0, 6)
  const rawTrend = period === 'all'
    ? groupMonthlyCashFlow(currentPeriodTransactions).map((item) => ({
        key: item.month,
        incomeMinor: item.incomeMinor,
        expenseMinor: item.expenseMinor,
      }))
    : groupDailyCashFlow(currentPeriodTransactions).map((item) => ({
        key: item.date,
        incomeMinor: item.incomeMinor,
        expenseMinor: item.expenseMinor,
      }))
  const trend = rawTrend.map((item) => ({
    ...item,
    label: new Intl.DateTimeFormat(french ? 'fr-FR' : 'en-MA', {
      ...(period === 'all'
        ? { month: 'short', year: '2-digit' as const }
        : { day: 'numeric', month: 'short' }),
      timeZone: 'UTC',
    }).format(new Date(`${item.key}${period === 'all' ? '-01' : ''}T00:00:00.000Z`)),
  }))
  const periodOptions: Array<{ value: TransactionPeriod; label: string }> = [
    { value: '7-days', label: french ? '7 derniers jours' : 'Last 7 days' },
    { value: '30-days', label: french ? '30 derniers jours' : 'Last 30 days' },
    { value: 'current-month', label: french ? 'Mois en cours' : 'Current month' },
    { value: 'all', label: french ? 'Toute la période' : 'All time' },
  ]

  function formatDate(date: string) {
    return new Intl.DateTimeFormat(french ? 'fr-FR' : 'en-MA', {
      dateStyle: 'medium',
      timeZone: 'UTC',
    }).format(new Date(`${date}T00:00:00.000Z`))
  }

  const noData = currentPeriodTransactions.length === 0

  return (
    <>
      <PageMeta
        description={french ? 'Votre activité financière calculée à partir des enregistrements locaux.' : 'Financial activity calculated from local records.'}
        title={french ? 'Aperçu financier' : 'Financial overview'}
      />
      <PageHeader
        description={french
          ? 'Calculé uniquement à partir des transactions locales sélectionnées. Le flux net n’est ni un bénéfice comptable ni un solde bancaire ; ce journal ne gère pas la comptabilité d’engagement complète.'
          : 'Calculated only from selected local transactions. Net cash flow is not accounting profit or a bank balance; this log does not implement full accrual accounting.'}
        eyebrow={french ? 'Espace professionnel · données locales' : 'Business workspace · local data'}
        title={french ? 'Aperçu financier' : 'Financial overview'}
      >
        <div className="flex flex-wrap gap-2">
          <Link className={buttonClasses('outline')} to="/app/capture?mode=receipt">
            <FileImage aria-hidden="true" size={16} />{french ? 'Scanner un reçu' : 'Scan receipt'}
          </Link>
          <Link className={buttonClasses('outline')} to="/app/capture">
            <WandSparkles aria-hidden="true" size={16} />{french ? 'Saisie intelligente' : 'Smart Capture'}
          </Link>
          <Link className={buttonClasses('primary')} to="/app/transactions/new">
            <Plus aria-hidden="true" size={16} />{french ? 'Ajouter' : 'Add transaction'}
          </Link>
        </div>
      </PageHeader>

      {hasInvalidBusinessTimeZone && (
        <p className="mb-4 rounded-xl border border-warning/30 bg-warning/5 p-3 text-sm text-foreground" role="status">
          {french
            ? 'Fuseau horaire invalide : les périodes sont affichées selon le fuseau de cet appareil. Corrigez-le dans les paramètres de l’entreprise.'
            : 'Invalid business timezone: periods use this device’s timezone. Correct it in business settings.'}
          {' '}
          <Link className="font-semibold text-primary underline" to="/app/settings">
            {french ? 'Ouvrir les paramètres' : 'Open settings'}
          </Link>
        </p>
      )}

      <Card className="mb-4 flex flex-wrap items-center gap-3 p-4">
        <label className="grid gap-1 text-xs font-semibold text-muted-foreground">
          {french ? 'Période' : 'Period'}
          <select
            aria-label={french ? 'Période du tableau de bord' : 'Dashboard period'}
            className={`${selectClasses} min-h-10 min-w-40 rounded-lg px-3 text-xs`}
            onChange={(event) => setPeriod(event.target.value as TransactionPeriod)}
            value={period}
          >
            {periodOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-semibold text-muted-foreground">
          {french ? 'Devise' : 'Currency'}
          <select
            aria-label={french ? 'Devise du tableau de bord' : 'Dashboard currency'}
            className={`${selectClasses} min-h-10 min-w-32 rounded-lg px-3 text-xs`}
            onChange={(event) => setCurrencySelection(event.target.value as Currency | 'business')}
            value={currencySelection}
          >
            <option value="business">{french ? `Devise de l’entreprise (${business?.currency ?? 'MAD'})` : `Business currency (${business?.currency ?? 'MAD'})`}</option>
            {currencyOptions.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
          </select>
        </label>
        <p className="ml-auto text-xs text-muted-foreground">
          {loading
            ? french ? 'Chargement des données locales…' : 'Loading local data…'
            : `${metrics.transactionCount} ${french ? 'transactions dans la période sélectionnée' : 'transactions in the selected period'}`}
        </p>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={ArrowUpRight}
          label={french ? 'Revenus totaux' : 'Total income'}
          note={previousMetrics
            ? getComparison(metrics.incomeMinor, previousMetrics.incomeMinor, language)
            : french ? 'Toutes les dates enregistrées' : 'All recorded dates'}
          tone="teal"
          value={formatCurrency(metrics.incomeMinor, activeCurrency, language)}
        />
        <StatCard
          icon={ArrowDownRight}
          label={french ? 'Dépenses totales' : 'Total expenses'}
          note={previousMetrics
            ? getComparison(metrics.expenseMinor, previousMetrics.expenseMinor, language)
            : french ? 'Toutes les dates enregistrées' : 'All recorded dates'}
          tone="amber"
          value={formatCurrency(metrics.expenseMinor, activeCurrency, language)}
        />
        <StatCard
          icon={ArrowUpRight}
          label={french ? 'Flux de trésorerie net' : 'Net cash flow'}
          note={french ? 'Revenus moins dépenses · pas un bénéfice comptable' : 'Income less expenses · not accounting profit'}
          tone="primary"
          value={formatCurrency(metrics.netMinor, activeCurrency, language)}
        />
        <StatCard
          icon={FileImage}
          label={french ? 'Transactions' : 'Transactions'}
          note={french ? `Devise sélectionnée : ${activeCurrency}` : `Selected currency: ${activeCurrency}`}
          tone="violet"
          value={new Intl.NumberFormat(french ? 'fr-FR' : 'en-MA').format(metrics.transactionCount)}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
        <ChartCard
          description={french
            ? `Données locales en ${activeCurrency} ; aucune valeur historique n’est inventée.`
            : `Local ${activeCurrency} records; no historical values are fabricated.`}
          title={french ? 'Revenus et dépenses' : 'Income vs. expenses'}
        >
          {noData || trend.length === 0 ? (
            <ChartEmpty language={language} />
          ) : (
            <div aria-label={french ? 'Graphique des revenus et dépenses' : 'Income and expense chart'} className="h-64 w-full" role="img">
              <ResponsiveContainer height="100%" width="100%">
                <BarChart accessibilityLayer data={trend} margin={{ top: 4, right: 6, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke="var(--cb-border)" strokeDasharray="3 5" vertical={false} />
                  <XAxis axisLine={false} dataKey="label" tick={{ fill: 'var(--cb-muted-foreground)', fontSize: 10 }} tickLine={false} />
                  <YAxis
                    axisLine={false}
                    tick={{ fill: 'var(--cb-muted-foreground)', fontSize: 10 }}
                    tickFormatter={(value) => new Intl.NumberFormat(french ? 'fr-FR' : 'en-MA', {
                      maximumFractionDigits: 0,
                    }).format(minorToAmount(Number(value), activeCurrency))}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--cb-surface)', borderColor: 'var(--cb-border)', borderRadius: 12, color: 'var(--cb-foreground)' }}
                    formatter={(value) => formatCurrency(Number(value ?? 0), activeCurrency, language)}
                    labelStyle={{ color: 'var(--cb-foreground)', fontWeight: 700 }}
                  />
                  <Legend />
                  <Bar dataKey="incomeMinor" fill="var(--cb-chart-1)" name={french ? 'Revenus' : 'Income'} radius={[5, 5, 0, 0]} />
                  <Bar dataKey="expenseMinor" fill="var(--cb-chart-4)" name={french ? 'Dépenses' : 'Expenses'} radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        <ChartCard
          description={french
            ? 'Répartition des dépenses enregistrées pour la période et la devise choisies.'
            : 'Recorded expenses for the selected period and currency.'}
          title={french ? 'Catégories de dépenses' : 'Expense categories'}
        >
          {expensesByCategory.length === 0 ? (
            <ChartEmpty language={language} />
          ) : (
            <>
              <div aria-label={french ? 'Répartition des dépenses' : 'Expense category breakdown'} className="h-52 w-full" role="img">
                <ResponsiveContainer height="100%" width="100%">
                  <PieChart accessibilityLayer>
                    <Pie
                      data={expensesByCategory}
                      dataKey="amountMinor"
                      innerRadius="58%"
                      nameKey="category"
                      outerRadius="82%"
                      paddingAngle={3}
                      stroke="var(--cb-surface)"
                      strokeWidth={3}
                    >
                      {expensesByCategory.map((item, index) => (
                        <Cell fill={chartColors[index % chartColors.length]} key={item.category} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: 'var(--cb-surface)', borderColor: 'var(--cb-border)', borderRadius: 12, color: 'var(--cb-foreground)' }}
                      formatter={(value) => formatCurrency(Number(value ?? 0), activeCurrency, language)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-2 grid gap-2">
                {expensesByCategory.slice(0, 5).map(({ category, amountMinor }, index) => (
                  <li className="flex items-center justify-between gap-3 text-xs" key={category}>
                    <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
                      <i className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: chartColors[index % chartColors.length] }} />
                      <span className="truncate">{getTransactionCategoryLabel(category, language)}</span>
                    </span>
                    <span className="financial-value shrink-0 font-semibold text-foreground">
                      {formatCurrency(amountMinor, activeCurrency, language)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </ChartCard>
      </div>

      <ChartCard
        className="mt-4"
        description={french
          ? 'Transactions enregistrées localement dans la devise sélectionnée.'
          : 'Transactions saved locally in the selected currency.'}
        title={french ? 'Transactions récentes' : 'Recent transactions'}
        action={<Link className="text-xs font-bold text-primary hover:underline" to="/app/transactions">{french ? 'Tout afficher' : 'View all'}</Link>}
      >
        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{french ? 'Chargement…' : 'Loading…'}</p>
        ) : recent.length === 0 ? (
          <div className="grid min-h-44 place-items-center text-center">
            <div>
              <p className="font-bold">{french ? 'Aucune transaction dans cette période' : 'No transactions in this period'}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {french ? 'Ajoutez une activité ou choisissez une autre période ou devise.' : 'Add activity or select another period or currency.'}
              </p>
              <Link className={`${buttonClasses('outline')} mt-4`} to="/app/transactions/new">
                <Plus aria-hidden="true" size={15} />{french ? 'Ajouter une transaction' : 'Add a transaction'}
              </Link>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {recent.map((item: LocalTransaction) => (
              <li className="flex min-w-0 items-center gap-3 py-3" key={item.id}>
                <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${item.type === 'income' ? 'bg-secondary/10 text-secondary' : 'bg-muted text-muted-foreground'}`}>
                  {item.type === 'income' ? <ArrowUpRight aria-hidden="true" size={17} /> : <ArrowDownRight aria-hidden="true" size={17} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{item.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {getTransactionCategoryLabel(item.category, language)} · {formatDate(item.transactionDate)}
                  </p>
                </div>
                <p className={`financial-value shrink-0 text-sm font-bold ${item.type === 'income' ? 'text-secondary' : 'text-foreground'}`}>
                  {item.type === 'income' ? '+' : '−'}{formatCurrency(item.amountMinor, activeCurrency, language)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </ChartCard>
    </>
  )
}

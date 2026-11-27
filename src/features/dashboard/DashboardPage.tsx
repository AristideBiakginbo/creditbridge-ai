import { useMemo, useState } from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  ArrowRight,
  FileCheck2,
  Plus,
  Sparkles,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Link } from 'react-router-dom'
import { useDemoData } from '../../app/providers/useDemoData'
import { useLanguage } from '../../app/providers/useLanguage'
import { ChartCard } from '../../components/common/ChartCard'
import { PageHeader } from '../../components/common/PageHeader'
import { PageMeta } from '../../components/common/PageMeta'
import { StatCard } from '../../components/common/StatCard'
import { Badge } from '../../components/ui/Badge'
import { buttonClasses } from '../../components/ui/buttonStyles'
import { Card } from '../../components/ui/Card'
import { selectClasses } from '../../components/ui/fields'
import {
  calculateDashboardMetrics,
  calculateDocumentationReadiness,
  filterTransactionsByRange,
  formatCurrency,
  formatDate,
  groupExpensesByCategory,
  groupMonthlyCashFlow,
  type DateRange,
} from '../../lib/finance/calculations'

const chartColors = [
  'var(--cb-chart-1)',
  'var(--cb-chart-2)',
  'var(--cb-chart-3)',
  'var(--cb-chart-4)',
  'var(--cb-chart-5)',
]

export function DashboardPage() {
  const { transactions } = useDemoData()
  const { language, t } = useLanguage()
  const [range, setRange] = useState<DateRange>('all')
  const visibleTransactions = useMemo(
    () => filterTransactionsByRange(transactions, range),
    [transactions, range],
  )
  const metrics = useMemo(
    () => calculateDashboardMetrics(visibleTransactions),
    [visibleTransactions],
  )
  const monthlyData = useMemo(
    () => groupMonthlyCashFlow(visibleTransactions).map((item) => ({
      ...item,
      monthLabel: new Intl.DateTimeFormat(language === 'fr' ? 'fr-FR' : 'en-MA', {
        month: 'short',
        timeZone: 'UTC',
      }).format(new Date(`${item.month}-01T00:00:00.000Z`)),
    })),
    [visibleTransactions, language],
  )
  const expensesByCategory = useMemo(
    () => groupExpensesByCategory(visibleTransactions),
    [visibleTransactions],
  )
  const readiness = useMemo(
    () => calculateDocumentationReadiness(transactions),
    [transactions],
  )
  const ranges: Array<{ value: DateRange; label: string }> = [
    { value: 'all', label: language === 'fr' ? 'Toute la période' : 'All time' },
    { value: '30-days', label: language === 'fr' ? '30 derniers jours' : 'Last 30 days' },
    { value: '90-days', label: language === 'fr' ? '90 derniers jours' : 'Last 90 days' },
    { value: 'year', label: language === 'fr' ? 'Cette année' : 'This year' },
  ]
  const noData = visibleTransactions.length === 0

  return (
    <>
      <PageMeta description={t('dashboard.subtitle')} title={t('dashboard.title')} />
      <PageHeader
        description={t('dashboard.subtitle')}
        eyebrow={language === 'fr' ? 'Données synthétiques · espace de démonstration' : 'Synthetic data · demonstration workspace'}
        title={t('dashboard.title')}
      >
        <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          {t('dashboard.range')}
          <select
            aria-label={t('dashboard.range')}
            className={`${selectClasses} min-h-10 w-auto min-w-36 rounded-lg px-3 text-xs`}
            onChange={(event) => {
              const next = ranges.find((item) => item.value === event.target.value)
              if (next) setRange(next.value)
            }}
            value={range}
          >
            {ranges.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </label>
      </PageHeader>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={ArrowUpRight}
          label={t('dashboard.income')}
          note={`${metrics.transactionCount} ${language === 'fr' ? 'transactions dans la période sélectionnée' : 'transactions in the selected period'}`}
          tone="teal"
          value={formatCurrency(metrics.income, 'MAD', language)}
        />
        <StatCard
          icon={ArrowDownRight}
          label={t('dashboard.expenses')}
          note={language === 'fr' ? 'Montants synthétiques agrégés' : 'Synthetic amounts aggregated'}
          tone="amber"
          value={formatCurrency(metrics.expenses, 'MAD', language)}
        />
        <StatCard
          icon={Sparkles}
          label={t('dashboard.net')}
          note={language === 'fr' ? 'Revenus moins dépenses · pas un bénéfice comptable' : 'Income less expenses · not accounting profit'}
          tone="primary"
          value={formatCurrency(metrics.netCashFlow, 'MAD', language)}
        />
        <StatCard
          icon={FileCheck2}
          label={t('dashboard.count')}
          note={language === 'fr' ? 'Jeu de données de démonstration uniquement' : 'Demonstration dataset only'}
          tone="violet"
          value={new Intl.NumberFormat(language === 'fr' ? 'fr-FR' : 'en-MA').format(metrics.transactionCount)}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
        <ChartCard
          description={language === 'fr' ? 'Totaux calculés à partir des enregistrements filtrés.' : 'Totals calculated from the filtered records.'}
          title={t('dashboard.incomeExpenses')}
        >
          {noData ? (
            <ChartEmpty language={language} />
          ) : (
            <div aria-label={t('dashboard.incomeExpenses')} className="h-64 w-full" role="img">
              <ResponsiveContainer height="100%" width="100%">
                <BarChart accessibilityLayer data={monthlyData} margin={{ top: 4, right: 6, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke="var(--cb-border)" strokeDasharray="3 5" vertical={false} />
                  <XAxis axisLine={false} dataKey="monthLabel" tick={{ fill: 'var(--cb-muted-foreground)', fontSize: 11 }} tickLine={false} />
                  <YAxis axisLine={false} tick={{ fill: 'var(--cb-muted-foreground)', fontSize: 10 }} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--cb-surface)', borderColor: 'var(--cb-border)', borderRadius: 12, color: 'var(--cb-foreground)' }}
                    formatter={(value) => formatCurrency(Number(value ?? 0), 'MAD', language)}
                    labelStyle={{ color: 'var(--cb-foreground)', fontWeight: 700 }}
                  />
                  <Legend />
                  <Bar dataKey="income" fill="var(--cb-chart-1)" name={t('dashboard.income')} radius={[5, 5, 0, 0]} />
                  <Bar dataKey="expenses" fill="var(--cb-chart-4)" name={t('dashboard.expenses')} radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        <ChartCard
          description={language === 'fr' ? 'Basé sur les dépenses du même jeu de données.' : 'Based on expenses from the same dataset.'}
          title={t('dashboard.expenseMix')}
        >
          {expensesByCategory.length === 0 ? (
            <ChartEmpty language={language} />
          ) : (
            <>
              <div aria-label={t('dashboard.expenseMix')} className="h-52 w-full" role="img">
                <ResponsiveContainer height="100%" width="100%">
                  <PieChart accessibilityLayer>
                    <Pie
                      data={expensesByCategory}
                      dataKey="amount"
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
                      formatter={(value) => formatCurrency(Number(value ?? 0), 'MAD', language)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-2 grid gap-2">
                {expensesByCategory.slice(0, 4).map(({ category, amount }, index) => (
                  <li className="flex items-center justify-between gap-3 text-xs" key={category}>
                    <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
                      <i className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: chartColors[index % chartColors.length] }} />
                      <span className="truncate">{category}</span>
                    </span>
                    <span className="financial-value shrink-0 font-semibold text-foreground">{formatCurrency(amount, 'MAD', language)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </ChartCard>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
        <ChartCard
          description={language === 'fr' ? 'Le flux net est calculé comme revenus moins dépenses.' : 'Net cash flow is calculated as income minus expenses.'}
          title={t('dashboard.cashFlow')}
        >
          {monthlyData.length === 0 ? (
            <ChartEmpty language={language} />
          ) : (
            <div aria-label={t('dashboard.cashFlow')} className="h-56 w-full" role="img">
              <ResponsiveContainer height="100%" width="100%">
                <LineChart accessibilityLayer data={monthlyData} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke="var(--cb-border)" strokeDasharray="3 5" vertical={false} />
                  <XAxis axisLine={false} dataKey="monthLabel" tick={{ fill: 'var(--cb-muted-foreground)', fontSize: 11 }} tickLine={false} />
                  <YAxis axisLine={false} tick={{ fill: 'var(--cb-muted-foreground)', fontSize: 10 }} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--cb-surface)', borderColor: 'var(--cb-border)', borderRadius: 12, color: 'var(--cb-foreground)' }}
                    formatter={(value) => formatCurrency(Number(value ?? 0), 'MAD', language)}
                  />
                  <Line dataKey="net" dot={{ fill: 'var(--cb-chart-1)', r: 3 }} name={t('dashboard.net')} stroke="var(--cb-chart-1)" strokeWidth={3} type="monotone" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        <Card as="section" className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-foreground">{t('dashboard.passport')}</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {language === 'fr' ? 'Indicateur documentaire de démonstration, pas un score de crédit.' : 'Demonstration documentation checklist, not a credit score.'}
              </p>
            </div>
            <Badge tone="primary">{readiness.completed}/{readiness.total}</Badge>
          </div>
          <div className="mt-5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-muted-foreground">{language === 'fr' ? 'Éléments préparés' : 'Criteria met'}</span>
              <span className="financial-value font-bold text-foreground">{readiness.percent}%</span>
            </div>
            <div aria-label={`${readiness.percent}%`} aria-valuemax={100} aria-valuemin={0} aria-valuenow={readiness.percent} className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted" role="progressbar">
              <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${readiness.percent}%` }} />
            </div>
          </div>
          <ul className="mt-4 grid gap-2">
            {readiness.checks.map((check) => (
              <li className="flex items-center gap-2 text-xs text-muted-foreground" key={check.label}>
                <span aria-hidden="true" className={`grid size-4 place-items-center rounded-full ${check.complete ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                  {check.complete ? <CheckMark /> : <span className="size-1 rounded-full bg-current" />}
                </span>
                {check.label}
              </li>
            ))}
          </ul>
          <Link className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline" to="/app/passport">
            {language === 'fr' ? 'Voir le concept' : 'Explore passport preview'} <ArrowRight aria-hidden="true" size={14} />
          </Link>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
        <Card as="section" className="overflow-hidden">
          <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
            <div>
              <h2 className="text-sm font-bold text-foreground">{t('dashboard.recent')}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{language === 'fr' ? 'Dernières écritures synthétiques' : 'Latest synthetic entries'}</p>
            </div>
            <Link className="text-xs font-bold text-primary hover:underline" to="/app/transactions">
              {t('common.viewAll')}
            </Link>
          </header>
          <div className="divide-y divide-border">
            {visibleTransactions.slice().sort((left, right) => right.date.localeCompare(left.date)).slice(0, 5).map((transaction) => (
              <div className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5" key={transaction.id}>
                <div className="flex min-w-0 items-center gap-3">
                  <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${transaction.type === 'income' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                    {transaction.type === 'income' ? <ArrowUpRight aria-hidden="true" size={17} /> : <ArrowDownRight aria-hidden="true" size={17} />}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{transaction.description}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{transaction.category} · {formatDate(transaction.date, language)}</p>
                  </div>
                </div>
                <span className={`financial-value shrink-0 text-sm font-bold ${transaction.type === 'income' ? 'text-success' : 'text-foreground'}`}>
                  {transaction.type === 'income' ? '+' : '−'}{formatCurrency(transaction.amount, 'MAD', language)}
                </span>
              </div>
            ))}
            {visibleTransactions.length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                {language === 'fr' ? 'Aucune transaction. Ajoutez une entrée de démonstration.' : 'No transactions yet. Add a demonstration entry.'}
              </div>
            )}
          </div>
        </Card>

        <Card as="section" className="flex flex-col justify-between bg-primary p-5 text-primary-foreground sm:p-6">
          <div>
            <span className="grid size-10 place-items-center rounded-xl bg-white/10">
              <Sparkles aria-hidden="true" size={20} />
            </span>
            <h2 className="mt-5 font-display text-xl font-extrabold">
              {language === 'fr' ? 'Besoin de saisir une opération ?' : 'Ready to record a transaction?'}
            </h2>
            <p className="mt-2 text-sm leading-6 text-primary-foreground/75">
              {language === 'fr' ? 'Utilisez la saisie manuelle ou essayez l’extraction IA sur appareil.' : 'Use manual entry or try private on-device extraction when supported.'}
            </p>
          </div>
          <div className="mt-6 grid gap-2">
            <Link className={buttonClasses('outline', 'border-white bg-white text-primary hover:bg-emerald-50')} to="/app/transactions/new">
              <Plus aria-hidden="true" size={16} /> {t('workspace.add')}
            </Link>
            <Link className={buttonClasses('ghost', 'border border-white/30 text-primary-foreground hover:bg-white/10')} to="/app/assistant">
              {t('nav.assistant')} <ArrowRight aria-hidden="true" size={16} />
            </Link>
          </div>
        </Card>
      </div>
    </>
  )
}

function ChartEmpty({ language }: { language: 'en' | 'fr' }) {
  return (
    <div className="grid h-56 place-items-center rounded-xl border border-dashed border-border bg-background px-5 text-center">
      <p className="max-w-xs text-sm leading-6 text-muted-foreground">
        {language === 'fr' ? 'Aucune donnée dans cette période. Modifiez le filtre ou ajoutez une transaction de démonstration.' : 'No records in this period. Change the range or add a demonstration transaction.'}
      </p>
    </div>
  )
}

function CheckMark() {
  return <svg aria-hidden="true" className="size-3" fill="none" viewBox="0 0 16 16"><path d="m3.3 8.3 3 3 6.4-6.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" /></svg>
}

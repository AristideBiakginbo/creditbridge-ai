import { useState } from 'react'
import {
  ArrowDownUp,
  ArrowRight,
  Bot,
  Check,
  ChevronDown,
  Cloud,
  FileCheck2,
  LockKeyhole,
  PieChart,
  ShieldCheck,
  Sparkles,
  WalletCards,
  WifiOff,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../../app/providers/useLanguage'
import { PageMeta } from '../../components/common/PageMeta'
import { StatCard } from '../../components/common/StatCard'
import { Badge } from '../../components/ui/Badge'
import { buttonClasses } from '../../components/ui/buttonStyles'
import { Card } from '../../components/ui/Card'
import { calculateDashboardMetrics, formatCurrency } from '../../lib/finance/calculations'
import { seedTransactions } from '../../demo/data/seedTransactions'

const englishFeatures = [
  { icon: ArrowDownUp, title: 'Smart transaction capture', copy: 'Structure everyday notes with private on-device AI and editable review.', status: 'Working preview' },
  { icon: PieChart, title: 'Financial dashboard', copy: 'Explore a clear overview using one consistent synthetic business dataset.', status: 'Demo available' },
  { icon: FileCheck2, title: 'Financial Passport', copy: 'A future, user-controlled way to organize portable financial documentation.', status: 'Planned' },
  { icon: Bot, title: 'AI financial coach', copy: 'Start with predefined financial literacy prompts and privacy-aware inference.', status: 'Education preview' },
  { icon: WalletCards, title: 'Loan simulator', copy: 'Explore repayment scenarios without making credit decisions.', status: 'Planned' },
  { icon: WifiOff, title: 'Local-first foundation', copy: 'Designed for intermittent connectivity with processing choices made visible.', status: 'Foundation' },
]

const frenchFeatures = [
  { icon: ArrowDownUp, title: 'Saisie intelligente', copy: 'Structurez des notes avec une IA locale et vérifiez chaque champ.', status: 'Aperçu fonctionnel' },
  { icon: PieChart, title: 'Tableau de bord financier', copy: 'Consultez une vue claire basée sur un même jeu de données synthétiques.', status: 'Démo disponible' },
  { icon: FileCheck2, title: 'Passeport financier', copy: 'Un futur moyen de préparer des documents financiers portables et contrôlés par vous.', status: 'Planifié' },
  { icon: Bot, title: 'Coach financier IA', copy: 'Commencez avec des questions éducatives prédéfinies et une IA respectueuse de la vie privée.', status: 'Aperçu éducatif' },
  { icon: WalletCards, title: 'Simulateur de prêt', copy: 'Explorez des scénarios de remboursement sans décision de crédit.', status: 'Planifié' },
  { icon: WifiOff, title: 'Fondation locale', copy: 'Conçue pour les connexions intermittentes, avec des choix de traitement visibles.', status: 'Fondation' },
]

function ProductPreview() {
  const { language } = useLanguage()
  const metrics = calculateDashboardMetrics(seedTransactions)

  return (
    <Card className="surface-shadow overflow-hidden border-white/15 bg-surface">
      <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
        <div>
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Kora Goods Studio
          </p>
          <p className="mt-1 text-sm font-bold text-foreground">
            {language === 'fr' ? 'Aperçu financier' : 'Financial overview'}
          </p>
        </div>
        <Badge tone="warning">{language === 'fr' ? 'Données démo' : 'Synthetic data'}</Badge>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-2">
        <StatCard
          icon={ArrowDownUp}
          label={language === 'fr' ? 'Revenus enregistrés' : 'Income recorded'}
          note={language === 'fr' ? 'Exemple synthétique · MAD' : 'Synthetic sample · MAD'}
          tone="teal"
          value={formatCurrency(metrics.income, 'MAD', language)}
        />
        <StatCard
          icon={Sparkles}
          label={language === 'fr' ? 'Flux net de trésorerie' : 'Net cash flow'}
          note={language === 'fr' ? 'Revenus moins dépenses · pas un bénéfice comptable' : 'Income less expenses · not accounting profit'}
          tone="primary"
          value={formatCurrency(metrics.netCashFlow, 'MAD', language)}
        />
      </div>
      <div className="px-4 pb-4">
        <div className="rounded-xl border border-border bg-background p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-foreground">
              {language === 'fr' ? 'Activité mensuelle' : 'Monthly activity'}
            </p>
            <span className="text-[0.65rem] text-muted-foreground">MAD</span>
          </div>
          <div className="mt-3 h-24 w-full">
            <svg aria-label={language === 'fr' ? 'Aperçu illustratif des revenus et dépenses' : 'Illustrative income and expense chart'} className="h-full w-full" preserveAspectRatio="none" role="img" viewBox="0 0 420 100">
              <path d="M4 78 C50 68 64 40 112 50 S174 74 220 43 S292 55 336 28 S386 37 416 13" fill="none" stroke="var(--cb-chart-1)" strokeLinecap="round" strokeWidth="4" />
              <path d="M4 86 C52 82 66 66 112 72 S176 82 220 67 S292 73 336 57 S388 64 416 50" fill="none" stroke="var(--cb-chart-4)" strokeDasharray="5 7" strokeLinecap="round" strokeWidth="3" />
            </svg>
          </div>
          <div className="mt-2 flex gap-4 text-[0.65rem] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-full bg-chart-1" />{language === 'fr' ? 'Revenus' : 'Income'}</span>
            <span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-full bg-chart-4" />{language === 'fr' ? 'Dépenses' : 'Expenses'}</span>
          </div>
        </div>
      </div>
    </Card>
  )
}

export function LandingPage() {
  const { language, t } = useLanguage()
  const [openQuestion, setOpenQuestion] = useState<number | null>(0)
  const features = language === 'fr' ? frenchFeatures : englishFeatures
  const faq = language === 'fr'
    ? [
        ['Qu’est-ce que CreditBridge AI ?', 'Un prototype de technologie financière qui aide les petites entreprises à organiser et comprendre leurs activités.'],
        ['Puis-je l’utiliser sans Internet ?', 'Certaines fonctions locales peuvent fonctionner après préparation du modèle. La disponibilité dépend du navigateur et de l’appareil. Les fonctions cloud nécessitent une connexion.'],
        ['Où mes données financières sont-elles traitées ?', 'L’extraction de transactions est limitée au modèle local et échoue si le SDK ne confirme pas le traitement sur l’appareil. Les exemples éducatifs cloud nécessitent un consentement distinct.'],
        ['CreditBridge AI accorde-t-il des prêts ?', 'Non. L’application n’accorde pas de prêt et ne décide pas de l’éligibilité au crédit.'],
        ['Qu’est-ce qu’un passeport financier ?', 'Un concept de documentation portable générée par l’utilisateur, qui ne constitue pas un relevé bancaire certifié ni une évaluation de solvabilité.'],
        ['Quelles devises sont disponibles ?', 'Les outils prennent en charge MAD, XAF, XOF, EUR et USD. Le jeu de démonstration utilise MAD et ne convertit pas les montants.'],
        ['Et si mon appareil ne prend pas en charge l’IA locale ?', 'Vous pouvez saisir les transactions manuellement dans l’espace de démonstration. Les données de démonstration ne sont pas envoyées au cloud.'],
      ]
    : [
        ['What is CreditBridge AI?', 'A financial technology prototype that helps small businesses organize and understand their business activity.'],
        ['Can I use it without internet?', 'Some local features may work after model preparation. Availability depends on browser and device support. Cloud features require connectivity.'],
        ['Where is my financial information processed?', 'Transaction extraction is pinned to the on-device model and fails closed unless the SDK reports on-device inference. Cloud education examples require separate consent.'],
        ['Does CreditBridge AI provide loans?', 'No. The application does not issue loans or make credit eligibility decisions.'],
        ['What is a Financial Passport?', 'A concept for user-generated portable documentation; it is not a certified bank statement or a creditworthiness report.'],
        ['Which currencies are supported?', 'The tools support MAD, XAF, XOF, EUR and USD. The synthetic demo workspace uses MAD and does not convert values.'],
        ['What if my device cannot run on-device AI?', 'You can create a manual transaction preview in the demonstration workspace. Demo data is not sent to cloud AI.'],
      ]

  return (
    <>
      <PageMeta
        description={t('landing.subhead')}
        title={language === 'fr' ? 'Votre avenir financier' : 'Your financial future'}
      />
      <main id="main-content">
        <section className="relative overflow-hidden border-b border-border">
          <div aria-hidden="true" className="pointer-events-none absolute -right-36 -top-32 size-[34rem] rounded-full bg-accent/10 blur-3xl" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-24">
            <div className="max-w-2xl">
              <Badge className="mb-5" tone="primary">
                <Sparkles aria-hidden="true" size={13} />
                {t('landing.eyebrow')}
              </Badge>
              <h1 className="font-display text-[2.55rem] font-extrabold leading-[1.08] tracking-[-0.045em] text-foreground sm:text-5xl lg:text-[3.55rem]">
                {t('landing.headline')}
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
                {t('landing.subhead')}
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link className={buttonClasses('primary', 'min-h-12')} to="/onboarding">
                  {t('landing.primary')}
                  <ArrowRight aria-hidden="true" size={17} />
                </Link>
                <Link className={buttonClasses('outline', 'min-h-12')} to="/demo">
                  {t('landing.secondary')}
                </Link>
              </div>
              <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-muted-foreground">
                <span className="inline-flex items-center gap-2"><LockKeyhole className="text-primary" size={15} />{language === 'fr' ? 'Extraction sensible sur appareil' : 'Sensitive extraction stays on-device'}</span>
                <span className="inline-flex items-center gap-2"><WifiOff className="text-primary" size={15} />{language === 'fr' ? 'Pensé pour les connexions intermittentes' : 'Designed for intermittent connectivity'}</span>
              </div>
            </div>
            <div className="mx-auto w-full max-w-[42rem]">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  {t('landing.synthetic')}
                </p>
                <Badge tone="neutral">MAD · {seedTransactions.length} {language === 'fr' ? 'transactions' : 'transactions'}</Badge>
              </div>
              <ProductPreview />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8" id="features">
          <div className="max-w-2xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-secondary">
              {language === 'fr' ? 'Conçu pour les petites entreprises' : 'Built around small business'}
            </p>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              {t('landing.featuresTitle')}
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
              {t('landing.featuresBody')}
            </p>
          </div>
          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, copy, status }) => (
              <Card as="article" className="p-5 transition-transform duration-200 hover:-translate-y-0.5 sm:p-6" key={title}>
                <div className="flex items-center justify-between gap-3">
                  <span className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <Icon aria-hidden="true" size={21} />
                  </span>
                  <Badge tone={status.includes('Planned') || status.includes('Planifié') ? 'neutral' : 'primary'}>
                    {status}
                  </Badge>
                </div>
                <h3 className="mt-5 text-base font-bold text-foreground">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy}</p>
              </Card>
            ))}
          </div>
        </section>

        <section className="border-y border-border bg-surface" id="how-it-works">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
            <div className="max-w-2xl">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-secondary">
                {language === 'fr' ? 'Votre rythme, vos choix' : 'Your pace, your choices'}
              </p>
              <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                {t('landing.howTitle')}
              </h2>
            </div>
            <ol className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {(language === 'fr'
                ? ['Enregistrez votre activité', 'Vérifiez les données structurées', 'Comprenez les tendances', 'Préparez vos documents']
                : ['Record business activity', 'Review structured records', 'Understand your trends', 'Prepare your documentation']
              ).map((step, index) => (
                <li className="relative rounded-2xl border border-border bg-background p-5" key={step}>
                  <span className="grid size-9 place-items-center rounded-xl bg-primary text-sm font-extrabold text-primary-foreground">
                    0{index + 1}
                  </span>
                  <h3 className="mt-4 text-sm font-bold text-foreground">{step}</h3>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    {language === 'fr'
                      ? 'Gardez le contrôle et avancez étape par étape.'
                      : 'Stay in control and move one clear step at a time.'}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1fr_0.85fr] lg:items-center lg:px-8">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-secondary">
              Firebase AI Logic · Hybrid inference
            </p>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              {t('landing.privacyTitle')}
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
              {t('landing.privacyBody')}
            </p>
            <ul className="mt-6 grid gap-3 text-sm text-foreground">
              {(language === 'fr'
                ? ['Les transactions privées restent en traitement local.', 'Les requêtes cloud éducatives nécessitent un consentement explicite.', 'Aucun repli cloud automatique pour les données sensibles.']
                : ['Private transaction extraction uses on-device processing.', 'Cloud education requires explicit request-scoped consent.', 'Sensitive requests never automatically fall back to cloud.']
              ).map((item) => (
                <li className="flex items-start gap-2.5" key={item}>
                  <Check aria-hidden="true" className="mt-0.5 shrink-0 text-success" size={16} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-xs leading-5 text-muted-foreground">
              {language === 'fr'
                ? 'La disponibilité du modèle local varie selon le navigateur, le matériel, la langue et la préparation du modèle.'
                : 'On-device availability varies by browser, hardware, language and model preparation.'}
            </p>
          </div>
          <Card className="overflow-hidden p-5 sm:p-7">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                <ShieldCheck aria-hidden="true" size={22} />
              </span>
              <div>
                <h3 className="text-sm font-bold">{language === 'fr' ? 'Contrôles de confidentialité' : 'Privacy controls'}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{language === 'fr' ? 'Visibles et vérifiables' : 'Visible and explicit'}</p>
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              <div className="flex items-start gap-3 rounded-xl bg-muted/70 p-3.5">
                <LockKeyhole aria-hidden="true" className="mt-0.5 shrink-0 text-primary" size={17} />
                <div>
                  <p className="text-sm font-semibold">{language === 'fr' ? 'Transactions' : 'Transactions'}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">ONLY_ON_DEVICE · {language === 'fr' ? 'source vérifiée par le SDK' : 'SDK source checked'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl bg-muted/70 p-3.5">
                <Cloud aria-hidden="true" className="mt-0.5 shrink-0 text-secondary" size={17} />
                <div>
                  <p className="text-sm font-semibold">{language === 'fr' ? 'Éducation générale' : 'General education'}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{language === 'fr' ? 'Requête prédéfinie · consentement avant le cloud' : 'Allowlisted prompt · consent before cloud'}</p>
                </div>
              </div>
            </div>
          </Card>
        </section>

        <section className="border-y border-border bg-surface">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:items-center lg:px-8">
            <div className="order-2 lg:order-1">
              <Card className="relative overflow-hidden bg-background p-5 sm:p-7">
                <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-accent/10 blur-2xl" />
                <div className="relative flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                      <FileCheck2 aria-hidden="true" size={21} />
                    </span>
                    <div>
                      <p className="text-sm font-bold">Kora Goods Studio</p>
                      <p className="mt-1 text-xs text-muted-foreground">Financial Passport · illustrative</p>
                    </div>
                  </div>
                  <Badge tone="warning">Illustrative</Badge>
                </div>
                <div className="relative mt-6 grid grid-cols-2 gap-3">
                  {[
                    ['Business activity', 'Organized'],
                    ['Income and expenses', 'Included'],
                    ['Reporting period', '6 months'],
                    ['Currency', 'MAD'],
                  ].map(([label, value]) => (
                    <div className="rounded-xl border border-border bg-surface p-3" key={label}>
                      <p className="text-[0.68rem] text-muted-foreground">{label}</p>
                      <p className="mt-1 text-xs font-bold text-foreground">{value}</p>
                    </div>
                  ))}
                </div>
                <p className="relative mt-4 text-[0.68rem] leading-5 text-muted-foreground">
                  Illustrative concept only. Not a certified bank statement,
                  credit score, or creditworthiness report.
                </p>
              </Card>
            </div>
            <div className="order-1 lg:order-2">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-secondary">
                {language === 'fr' ? 'Documentation financière' : 'Financial documentation'}
              </p>
              <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                {t('landing.passportTitle')}
              </h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground sm:text-base">
                {t('landing.passportBody')}
              </p>
              <Link className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline" to="/app/passport">
                {language === 'fr' ? 'Découvrir le concept' : 'Explore the concept'}
                <ArrowRight aria-hidden="true" size={16} />
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20" id="faq">
          <div className="text-center">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-secondary">
              FAQ
            </p>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-foreground">
              {language === 'fr' ? 'Questions fréquentes' : 'Questions, answered clearly'}
            </h2>
          </div>
          <div className="mt-8 divide-y divide-border border-y border-border">
            {faq.map(([question, answer], index) => (
              <details
                className="group py-4"
                key={question}
                onToggle={(event) => {
                  if (event.currentTarget.open) setOpenQuestion(index)
                  else if (openQuestion === index) setOpenQuestion(null)
                }}
                open={openQuestion === index}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-sm font-bold text-foreground">
                  {question}
                  <ChevronDown aria-hidden="true" className="shrink-0 transition-transform group-open:rotate-180" size={17} />
                </summary>
                <p className="max-w-3xl pt-3 text-sm leading-6 text-muted-foreground">{answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="px-4 pb-16 sm:px-6 sm:pb-20">
          <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-primary px-6 py-10 text-primary-foreground sm:px-10 sm:py-14 lg:px-14">
            <div aria-hidden="true" className="absolute -right-10 -top-20 size-72 rounded-full border border-white/10" />
            <div aria-hidden="true" className="absolute -right-3 -top-12 size-56 rounded-full border border-white/10" />
            <div className="relative max-w-2xl">
              <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                {t('landing.ctaTitle')}
              </h2>
              <p className="mt-3 text-sm leading-6 text-primary-foreground/75 sm:text-base">
                {language === 'fr'
                  ? 'Explorez les outils de démonstration avec des données synthétiques.'
                  : 'Explore the product preview using clearly labeled synthetic data.'}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link className={buttonClasses('outline', 'border-white bg-white text-primary hover:bg-emerald-50')} to="/onboarding">
                  {t('landing.primary')}
                </Link>
                <Link className={buttonClasses('ghost', 'text-primary-foreground hover:bg-white/10')} to="/demo">
                  {t('landing.secondary')}
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}

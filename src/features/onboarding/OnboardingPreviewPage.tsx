import { useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight, Check, ShieldCheck } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useLanguage } from '../../app/providers/useLanguage'
import { PageHeader } from '../../components/common/PageHeader'
import { PageMeta } from '../../components/common/PageMeta'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { inputClasses, selectClasses } from '../../components/ui/fields'
import { buttonClasses } from '../../components/ui/buttonStyles'
import { onboardingSchema, type OnboardingDraft } from '../../demo/validation/onboardingSchema'

const initialDraft: OnboardingDraft = {
  businessName: '',
  sector: '',
  businessType: 'sole-trader',
  country: 'Morocco',
  currency: 'MAD',
  goals: [],
  cloudEducationConsent: false,
  cloudSyncConsent: false,
}

const goals = {
  en: [
    'Understand income and expenses',
    'Keep clearer daily records',
    'Prepare business documentation',
    'Learn financial basics',
    'Explore repayment scenarios',
  ],
  fr: [
    'Comprendre les revenus et dépenses',
    'Tenir des registres quotidiens plus clairs',
    'Préparer des documents professionnels',
    'Apprendre les bases financières',
    'Explorer des scénarios de remboursement',
  ],
} as const

export function OnboardingPreviewPage() {
  const { language, t } = useLanguage()
  const navigate = useNavigate()
  const french = language === 'fr'
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState<OnboardingDraft>({ ...initialDraft })
  const [errors, setErrors] = useState<string[]>([])
  const stepSchemas = [
    onboardingSchema.pick({ businessName: true, sector: true, businessType: true }),
    onboardingSchema.pick({ country: true, currency: true }),
    onboardingSchema.pick({ goals: true, cloudEducationConsent: true, cloudSyncConsent: true }),
  ] as const

  function update<Field extends keyof OnboardingDraft>(
    field: Field,
    value: OnboardingDraft[Field],
  ) {
    setDraft((current) => ({ ...current, [field]: value }))
    setErrors([])
  }

  function submitStep(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = stepSchemas[step].safeParse(draft)
    if (!parsed.success) {
      setErrors(parsed.error.issues.map((issue) => issue.message))
      return
    }
    if (step < 2) {
      setStep((current) => current + 1)
      return
    }
    const completeDraft = onboardingSchema.safeParse(draft)
    if (!completeDraft.success) {
      setErrors(completeDraft.error.issues.map((issue) => issue.message))
      return
    }
    navigate('/demo')
  }

  function toggleGoal(goal: string) {
    const updated = draft.goals.includes(goal)
      ? draft.goals.filter((item) => item !== goal)
      : [...draft.goals, goal]
    update('goals', updated)
  }

  const labelClass = 'grid gap-1.5 text-xs font-semibold text-foreground'
  const buttonText = step < 2
    ? t('onboarding.next')
    : (french ? 'Explorer la démo' : 'Explore demo')

  return (
    <main className="mx-auto min-h-[65vh] max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8" id="main-content">
      <PageMeta description={t('onboarding.preview')} title={french ? 'Aperçu de configuration' : 'Workspace setup preview'} />
      <PageHeader
        description={french ? 'Quelques préférences illustratives. Rien n’est envoyé, enregistré ou utilisé pour créer un compte.' : 'A few illustrative preferences. Nothing is submitted, stored, or used to create an account.'}
        eyebrow={t('onboarding.preview')}
        title={french ? 'Configurez votre démo' : 'Set up your demo'}
      >
        <Link className={buttonClasses('outline')} to="/">
          <ArrowLeft aria-hidden="true" size={16} /> {french ? 'Accueil' : 'Home'}
        </Link>
      </PageHeader>

      <div className="mx-auto grid max-w-4xl gap-4 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <Card className="min-w-0 p-5 sm:p-7">
          <div className="mb-6">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-wider text-secondary">{french ? `Étape ${step + 1} sur 3` : `Step ${step + 1} of 3`}</p>
              <span className="text-xs text-muted-foreground">{Math.round(((step + 1) / 3) * 100)}%</span>
            </div>
            <div aria-valuemax={3} aria-valuemin={1} aria-valuenow={step + 1} className="mt-2 h-2 overflow-hidden rounded-full bg-muted" role="progressbar">
              <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${((step + 1) / 3) * 100}%` }} />
            </div>
          </div>

          <form className="grid gap-4" onSubmit={submitStep}>
            {step === 0 && (
              <>
                <h2 className="font-display text-lg font-extrabold text-foreground">{french ? 'Parlez-nous de votre activité' : 'Tell us about your business'}</h2>
                <label className={labelClass}>
                  {french ? 'Nom fictif de l’entreprise' : 'Fictional business name'}
                  <input className={inputClasses} maxLength={80} minLength={2} onChange={(event) => update('businessName', event.target.value)} required value={draft.businessName} />
                </label>
                <label className={labelClass}>
                  {french ? 'Secteur' : 'Business sector'}
                  <input className={inputClasses} maxLength={60} minLength={2} onChange={(event) => update('sector', event.target.value)} required value={draft.sector} />
                </label>
                <label className={labelClass}>
                  {french ? 'Type d’activité' : 'Business type'}
                  <select className={selectClasses} onChange={(event) => update('businessType', event.target.value as OnboardingDraft['businessType'])} value={draft.businessType}>
                    <option value="sole-trader">{french ? 'Entrepreneur individuel' : 'Sole trader'}</option>
                    <option value="family-business">{french ? 'Entreprise familiale' : 'Family business'}</option>
                    <option value="small-team">{french ? 'Petite équipe' : 'Small team'}</option>
                  </select>
                </label>
              </>
            )}
            {step === 1 && (
              <>
                <h2 className="font-display text-lg font-extrabold text-foreground">{french ? 'Choisissez des préférences locales' : 'Choose local preferences'}</h2>
                <label className={labelClass}>
                  {french ? 'Pays' : 'Country'}
                  <input className={inputClasses} maxLength={60} minLength={2} onChange={(event) => update('country', event.target.value)} required value={draft.country} />
                </label>
                <label className={labelClass}>
                  {french ? 'Devise' : 'Currency'}
                  <select className={selectClasses} onChange={(event) => update('currency', event.target.value as OnboardingDraft['currency'])} value={draft.currency}>
                    {['MAD', 'XAF', 'XOF', 'EUR', 'USD'].map((currency) => <option key={currency} value={currency}>{currency}</option>)}
                  </select>
                </label>
                <div className="rounded-xl border border-border bg-background p-4">
                  <p className="flex items-start gap-2 text-sm font-semibold text-foreground">
                    <ShieldCheck aria-hidden="true" className="mt-0.5 shrink-0 text-primary" size={17} />
                    {french ? 'Synchronisation désactivée' : 'Cloud sync is off'}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    {french ? 'Aucune donnée de profil ou financière ne sera envoyée au cloud. La synchronisation n’est pas disponible dans cette démo.' : 'No profile or financial data will be sent to the cloud. Sync is not available in this demo.'}
                  </p>
                </div>
              </>
            )}
            {step === 2 && (
              <>
                <h2 className="font-display text-lg font-extrabold text-foreground">{french ? 'Quels sont vos objectifs ?' : 'What would you like to explore?'}</h2>
                <p className="text-sm leading-6 text-muted-foreground">{french ? 'Choisissez au moins un objectif. Cette préférence ne sera pas enregistrée.' : 'Choose at least one goal. This preference will not be saved.'}</p>
                <div className="grid gap-2">
                  {goals[language].map((goal) => {
                    const checked = draft.goals.includes(goal)
                    return (
                      <label className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 text-sm transition-colors ${checked ? 'border-primary/40 bg-primary/5 text-foreground' : 'border-border bg-surface text-muted-foreground hover:bg-muted/50'}`} key={goal}>
                        <input checked={checked} className="size-4 accent-primary" onChange={() => toggleGoal(goal)} type="checkbox" />
                        <span className="flex-1">{goal}</span>
                        {checked && <Check aria-hidden="true" className="text-primary" size={16} />}
                      </label>
                    )
                  })}
                </div>
                <p className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs leading-5 text-foreground">
                  {french
                    ? 'Aucun consentement global n’est demandé. Les éventuelles requêtes éducatives cloud demanderont un consentement pour cette requête uniquement.'
                    : 'No blanket consent is requested. Any cloud education request will ask for consent for that request only.'}
                </p>
              </>
            )}

            {errors.length > 0 && (
              <ul className="grid gap-1 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-xs text-destructive" role="alert">
                {errors.map((error, index) => <li key={`${error}-${index}`}>{error}</li>)}
              </ul>
            )}
            <div className="flex justify-between gap-3 border-t border-border pt-4">
              <Button disabled={step === 0} onClick={() => { setStep((current) => Math.max(0, current - 1)); setErrors([]) }} type="button" variant="outline">
                <ArrowLeft aria-hidden="true" size={15} /> {t('onboarding.back')}
              </Button>
              <Button type="submit">{buttonText} <ArrowRight aria-hidden="true" size={15} /></Button>
            </div>
          </form>
        </Card>

        <aside className="h-fit min-w-0 rounded-2xl border border-warning/25 bg-warning/5 p-5">
          <p className="text-xs font-extrabold uppercase tracking-wider text-warning">{french ? 'Aperçu uniquement' : 'Preview only'}</p>
          <p className="mt-2 text-sm leading-6 text-foreground">
            {french
              ? 'Cette configuration reste en mémoire pendant la navigation. Aucun compte n’est créé et aucune préférence n’est persistée.'
              : 'This setup stays in memory while you navigate. No account is created and no preferences are persisted.'}
          </p>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            {french ? 'Le bouton final ouvre l’espace de démonstration existant, qui utilise des données synthétiques.' : 'The final action opens the existing demo workspace, which uses synthetic records.'}
          </p>
        </aside>
      </div>
    </main>
  )
}

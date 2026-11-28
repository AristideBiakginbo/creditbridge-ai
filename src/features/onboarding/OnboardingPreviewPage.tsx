import { useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../app/providers/useAuth'
import { useLanguage } from '../../app/providers/useLanguage'
import { creditBridgeDatabase, type LocalBusiness } from '../../lib/db/database'
import { completeBusinessOnboarding, type BusinessInput } from '../../lib/repositories/businessRepository'
import { PageMeta } from '../../components/common/PageMeta'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { inputClasses, selectClasses } from '../../components/ui/fields'
import {
  businessTimeZoneOptions,
  getCountryTimeZoneDefault,
  resolveBusinessTimeZone,
} from '../../lib/time/timezone'

const initialDraft: BusinessInput & { timezone: string; cloudSyncConsent: false } = {
  name: '',
  sector: '',
  businessType: 'sole-trader',
  country: 'Morocco',
  currency: 'MAD',
  timezone: 'Africa/Casablanca',
  financialGoals: [],
  cloudSyncConsent: false,
}

function loadDraft(uid: string): typeof initialDraft {
  try {
    const stored = window.localStorage.getItem(`creditbridge.onboarding.${uid}`)
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<typeof initialDraft>
      const draft = { ...initialDraft, ...parsed }
      const timeZone = resolveBusinessTimeZone(draft.timezone, draft.country)
      return { ...draft, timezone: timeZone?.timeZone ?? '' }
    }
  } catch {
    return initialDraft
  }
  return initialDraft
}

export function OnboardingPreviewPage() {
  const { uid } = useAuth()
  if (!uid) return null
  return <BusinessOnboardingForm key={uid} uid={uid} />
}

function BusinessOnboardingForm({ uid }: { uid: string }) {
  const { language } = useLanguage()
  const french = language === 'fr'
  const navigate = useNavigate()
  const { refreshProfile } = useAuth()
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState(() => loadDraft(uid))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    try {
      window.localStorage.setItem(`creditbridge.onboarding.${uid}`, JSON.stringify(draft))
    } catch {
      // Onboarding remains usable in memory if browser storage is unavailable.
    }
  }, [draft, uid])

  function update<Field extends keyof typeof draft>(field: Field, value: (typeof draft)[Field]) {
    setDraft((current) => ({ ...current, [field]: value }))
    setError('')
  }

  function updateCountry(country: string) {
    setDraft((current) => ({
      ...current,
      country,
      timezone: getCountryTimeZoneDefault(country) ?? '',
    }))
    setError('')
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (step < 5) {
      if (step === 1 && (draft.name.trim().length < 2 || draft.sector.trim().length < 2)) {
        setError(french ? 'Saisissez le nom et le secteur de votre entreprise.' : 'Enter your business name and sector.')
        return
      }
      if (step === 2 && !resolveBusinessTimeZone(draft.timezone, draft.country)) {
        setError(french
          ? 'Choisissez un fuseau horaire IANA valide pour votre entreprise.'
          : 'Choose a valid IANA timezone for your business.')
        return
      }
      if (step === 3 && draft.financialGoals.length === 0) {
        setError(french ? 'Sélectionnez au moins un objectif.' : 'Select at least one goal.')
        return
      }
      setStep((current) => current + 1)
      return
    }
    if (!uid) return
    setBusy(true)
    setError('')
    try {
      const businessId = crypto.randomUUID()
      const savedBusiness = await completeBusinessOnboarding(uid, businessId, {
        name: draft.name,
        sector: draft.sector,
        businessType: draft.businessType,
        country: draft.country,
        currency: draft.currency,
        timezone: draft.timezone,
        financialGoals: draft.financialGoals,
      })
      const snapshot: LocalBusiness = {
        id: businessId,
        ownerId: uid,
        name: draft.name,
        sector: draft.sector,
        businessType: draft.businessType,
        country: draft.country,
        currency: draft.currency,
        timezone: savedBusiness.timezone,
        financialGoals: draft.financialGoals,
        updatedAt: Date.now(),
        schemaVersion: 1,
      }
      await creditBridgeDatabase.businesses.put(snapshot)
      await creditBridgeDatabase.preferences.put({
        id: `${uid}:settings`,
        ownerId: uid,
        language,
        theme: 'system',
        syncEnabled: false,
        updatedAt: Date.now(),
        schemaVersion: 1,
      })
      window.localStorage.removeItem(`creditbridge.onboarding.${uid}`)
      await refreshProfile()
      navigate('/app/dashboard', { replace: true })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : (french ? 'Le profil n’a pas pu être enregistré.' : 'The profile could not be saved.'))
    } finally {
      setBusy(false)
    }
  }

  const goals = french
    ? ['Tenir des registres quotidiens', 'Comprendre les revenus et dépenses', 'Préparer des documents', 'Apprendre les bases financières']
    : ['Keep clearer daily records', 'Understand income and expenses', 'Prepare business documentation', 'Learn financial basics']
  const label = 'grid gap-1.5 text-xs font-semibold text-foreground'
  const timeZoneOptions = [
    ...businessTimeZoneOptions,
    ...(draft.timezone && !businessTimeZoneOptions.some(({ value }) => value === draft.timezone)
      ? [{ value: draft.timezone, label: draft.timezone }]
      : []),
  ]

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6" id="main-content">
      <PageMeta description={french ? 'Configuration permanente de votre activité.' : 'Set up your business workspace.'} title={french ? 'Configuration' : 'Business setup'} />
      <div className="mb-6">
        <p className="text-xs font-bold text-primary">{french ? `Étape ${step + 1} sur 6` : `Step ${step + 1} of 6`}</p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${((step + 1) / 6) * 100}%` }} /></div>
      </div>
      <Card className="p-5 sm:p-8">
        <form className="grid gap-5" onSubmit={submit}>
          {step === 0 && <><h1 className="font-display text-2xl font-extrabold">{french ? 'Bienvenue dans votre espace' : 'Welcome to your workspace'}</h1><p className="text-sm leading-6 text-muted-foreground">{french ? 'Configurez votre activité une seule fois. Les données financières restent locales.' : 'Set up your business once. Financial data remains local by default.'}</p></>}
          {step === 1 && <><h1 className="font-display text-xl font-extrabold">{french ? 'Informations professionnelles' : 'Business information'}</h1><label className={label}>{french ? 'Nom de l’entreprise' : 'Business name'}<input className={inputClasses} maxLength={80} onChange={(event) => update('name', event.target.value)} value={draft.name} /></label><label className={label}>{french ? 'Secteur' : 'Sector'}<input className={inputClasses} maxLength={60} onChange={(event) => update('sector', event.target.value)} value={draft.sector} /></label><label className={label}>{french ? 'Type d’activité' : 'Business type'}<select className={selectClasses} onChange={(event) => update('businessType', event.target.value as typeof draft.businessType)} value={draft.businessType}><option value="sole-trader">{french ? 'Entrepreneur individuel' : 'Sole trader'}</option><option value="family-business">{french ? 'Entreprise familiale' : 'Family business'}</option><option value="small-team">{french ? 'Petite équipe' : 'Small team'}</option></select></label></>}
          {step === 2 && <><h1 className="font-display text-xl font-extrabold">{french ? 'Pays et devise' : 'Country and currency'}</h1><label className={label}>{french ? 'Pays' : 'Country'}<input className={inputClasses} onChange={(event) => updateCountry(event.target.value)} value={draft.country} /></label><label className={label}>{french ? 'Devise' : 'Currency'}<select className={selectClasses} onChange={(event) => update('currency', event.target.value as typeof draft.currency)} value={draft.currency}>{['MAD','XAF','XOF','EUR','USD'].map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label className={label}>{french ? 'Fuseau horaire' : 'Timezone'}<select className={selectClasses} onChange={(event) => update('timezone', event.target.value)} value={draft.timezone}><option value="">{french ? 'Sélectionnez un fuseau horaire' : 'Select a timezone'}</option>{timeZoneOptions.map((item) => <option key={item.value} value={item.value}>{item.value} · {item.label}</option>)}</select></label><p className="text-xs text-muted-foreground">{french ? 'Le pays propose un fuseau par défaut ; choisissez une autre région si nécessaire.' : 'The country suggests a default timezone; select another region if needed.'}</p></>}
          {step === 3 && <><h1 className="font-display text-xl font-extrabold">{french ? 'Vos objectifs financiers' : 'Financial objectives'}</h1><div className="grid gap-2">{goals.map((goal) => { const checked = draft.financialGoals.includes(goal); return <label className={`flex min-h-12 items-center gap-3 rounded-xl border px-3.5 ${checked ? 'border-primary/40 bg-primary/5' : 'border-border'}`} key={goal}><input checked={checked} className="size-4 accent-primary" onChange={() => update('financialGoals', checked ? draft.financialGoals.filter((item) => item !== goal) : [...draft.financialGoals, goal])} type="checkbox" /><span className="flex-1 text-sm">{goal}</span>{checked && <Check className="text-primary" size={16} />}</label> })}</div></>}
          {step === 4 && <><h1 className="font-display text-xl font-extrabold">{french ? 'Confidentialité locale' : 'Privacy preferences'}</h1><p className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm leading-6">{french ? 'Le profil professionnel est enregistré dans Firestore. Les transactions restent dans IndexedDB sur cet appareil. La synchronisation financière reste désactivée.' : 'Business metadata is stored in Firestore. Transactions remain in IndexedDB on this device. Financial synchronization remains disabled.'}</p></>}
          {step === 5 && <><h1 className="font-display text-xl font-extrabold">{french ? 'Confirmez votre configuration' : 'Review your setup'}</h1><dl className="grid gap-3 rounded-xl border border-border p-4 text-sm"><div className="flex justify-between gap-4"><dt className="text-muted-foreground">{french ? 'Entreprise' : 'Business'}</dt><dd className="font-bold">{draft.name}</dd></div><div className="flex justify-between gap-4"><dt className="text-muted-foreground">{french ? 'Secteur' : 'Sector'}</dt><dd className="font-bold">{draft.sector}</dd></div><div className="flex justify-between gap-4"><dt className="text-muted-foreground">{french ? 'Devise' : 'Currency'}</dt><dd className="font-bold">{draft.currency}</dd></div></dl></>}
          {error && <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive" role="alert">{error}</p>}
          <div className="flex justify-between gap-3 border-t border-border pt-4">
            <Button disabled={step === 0 || busy} onClick={() => setStep((current) => Math.max(0, current - 1))} type="button" variant="outline"><ArrowLeft size={15} />{french ? 'Retour' : 'Back'}</Button>
            <Button disabled={busy} type="submit">{busy ? (french ? 'Enregistrement…' : 'Saving…') : step === 5 ? (french ? 'Terminer' : 'Complete setup') : (french ? 'Continuer' : 'Continue')}<ArrowRight size={15} /></Button>
          </div>
        </form>
      </Card>
    </main>
  )
}

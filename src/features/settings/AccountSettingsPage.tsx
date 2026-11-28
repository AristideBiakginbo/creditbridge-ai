import { useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useAuth } from '../../app/providers/useAuth'
import { useLanguage } from '../../app/providers/useLanguage'
import { creditBridgeDatabase } from '../../lib/db/database'
import { updateBusinessTimeZone } from '../../lib/repositories/businessRepository'
import { updateUserDisplayName } from '../../lib/repositories/userRepository'
import {
  businessTimeZoneOptions,
  normalizeBusinessTimeZone,
  resolveBusinessTimeZone,
} from '../../lib/time/timezone'
import { PageMeta } from '../../components/common/PageMeta'
import { PageHeader } from '../../components/common/PageHeader'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { inputClasses, selectClasses } from '../../components/ui/fields'

export function AccountSettingsPage() {
  const { user, uid, profile, refreshProfile } = useAuth()
  const { language } = useLanguage()
  const french = language === 'fr'
  const business = useLiveQuery(
    async () => {
      if (!uid || !profile?.activeBusinessId) return undefined
      const record = await creditBridgeDatabase.businesses.get(profile.activeBusinessId)
      return record?.ownerId === uid
        ? {
            ...record,
            timezone: normalizeBusinessTimeZone(record.timezone, record.country),
          }
        : undefined
    },
    [uid, profile?.activeBusinessId],
  )
  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [timeZoneSelection, setTimeZoneSelection] = useState<{
    businessId: string
    value: string
  } | null>(null)
  const [timeZoneError, setTimeZoneError] = useState('')
  const [timeZoneSaved, setTimeZoneSaved] = useState(false)

  const savedTimeZone = business
    ? resolveBusinessTimeZone(business.timezone, business.country)?.timeZone
    : undefined
  const businessTimeZone = business && timeZoneSelection?.businessId === business.id
    ? timeZoneSelection.value
    : savedTimeZone ?? ''
  const timeZoneOptions = [
    ...businessTimeZoneOptions,
    ...(savedTimeZone && !businessTimeZoneOptions.some(({ value }) => value === savedTimeZone)
      ? [{ value: savedTimeZone, label: savedTimeZone }]
      : []),
  ]

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!uid) return
    setError('')
    setSaved(false)
    try {
      await updateUserDisplayName(uid, displayName)
      await refreshProfile()
      setSaved(true)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : (french ? 'Impossible d’enregistrer.' : 'Could not save.'))
    }
  }

  async function saveTimeZone(event: FormEvent) {
    event.preventDefault()
    if (!uid || !business || business.ownerId !== uid) return
    setTimeZoneError('')
    setTimeZoneSaved(false)
    const resolved = resolveBusinessTimeZone(businessTimeZone, business.country)
    if (!resolved) {
      setTimeZoneError(french
        ? 'Choisissez un fuseau horaire IANA valide.'
        : 'Choose a valid IANA timezone.')
      return
    }

    let savedZone: string
    try {
      savedZone = await updateBusinessTimeZone(uid, business.id, resolved.timeZone)
    } catch {
      setTimeZoneError(french
        ? 'Impossible d’enregistrer le fuseau horaire sur le profil. Vérifiez votre connexion et réessayez.'
        : 'Could not save the timezone to the profile. Check your connection and try again.')
      return
    }

    try {
      await creditBridgeDatabase.businesses.put({
        ...business,
        timezone: savedZone,
        updatedAt: Date.now(),
      })
      setTimeZoneSelection({ businessId: business.id, value: savedZone })
      setTimeZoneSaved(true)
    } catch {
      setTimeZoneError(french
        ? 'Le profil a été mis à jour, mais le cache local n’a pas pu être actualisé. Rechargez la page.'
        : 'The profile was updated, but the local cache could not be refreshed. Reload the page.')
    }
  }

  return (
    <>
      <PageMeta description={french ? 'Paramètres du compte et de l’activité.' : 'Account and business settings.'} title={french ? 'Paramètres' : 'Settings'} />
      <PageHeader description={french ? 'Gérez les informations prises en charge.' : 'Manage supported profile information.'} eyebrow={french ? 'Compte' : 'Account'} title={french ? 'Paramètres' : 'Settings'} />
      <Card className="max-w-2xl p-5 sm:p-7">
        <form className="grid gap-4" onSubmit={submit}>
          <label className="grid gap-1.5 text-xs font-semibold">{french ? 'Nom affiché' : 'Display name'}<input className={inputClasses} maxLength={80} onChange={(event) => setDisplayName(event.target.value)} value={displayName} /></label>
          <label className="grid gap-1.5 text-xs font-semibold">{french ? 'Adresse e-mail' : 'Email address'}<input className={inputClasses} disabled value={user?.email ?? ''} /></label>
          <p className="text-xs text-muted-foreground">{french ? 'Vérification de l’e-mail :' : 'Email verification:'} {user?.emailVerified ? (french ? 'vérifiée' : 'verified') : (french ? 'non vérifiée' : 'not verified')}</p>
          <dl className="grid gap-2 rounded-xl border border-border p-4 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{french ? 'Entreprise' : 'Business'}</dt><dd className="font-bold">{business?.name ?? '—'}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{french ? 'Secteur' : 'Sector'}</dt><dd className="font-bold">{business?.sector ?? '—'}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{french ? 'Devise' : 'Currency'}</dt><dd className="font-bold">{business?.currency ?? '—'}</dd></div>
          </dl>
          {error && <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive" role="alert">{error}</p>}
          {saved && <p className="text-xs font-semibold text-success" role="status">{french ? 'Paramètres enregistrés.' : 'Settings saved.'}</p>}
          <Button type="submit">{french ? 'Enregistrer' : 'Save changes'}</Button>
        </form>
      </Card>
      <Card className="mt-4 max-w-2xl p-5 sm:p-7">
        <form className="grid gap-4" onSubmit={saveTimeZone}>
          <div>
            <h2 className="font-display text-lg font-bold">{french ? 'Fuseau horaire de l’entreprise' : 'Business timezone'}</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {french
                ? 'Utilisé pour les dates de Smart Capture et du tableau de bord. Cette modification ne touche pas aux transactions.'
                : 'Used for Smart Capture and dashboard dates. Changing it does not modify transactions.'}
            </p>
          </div>
          <label className="grid gap-1.5 text-xs font-semibold">
            {french ? 'Fuseau horaire IANA' : 'IANA timezone'}
            <select
              className={selectClasses}
              disabled={!business}
              onChange={(event) => {
                if (business) {
                  setTimeZoneSelection({
                    businessId: business.id,
                    value: event.target.value,
                  })
                }
                setTimeZoneError('')
                setTimeZoneSaved(false)
              }}
              value={businessTimeZone}
            >
              <option value="">{french ? 'Sélectionnez un fuseau horaire' : 'Select a timezone'}</option>
              {timeZoneOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.value} · {option.label}</option>
              ))}
            </select>
          </label>
          {timeZoneError && <p className="text-xs text-destructive" role="alert">{timeZoneError}</p>}
          {timeZoneSaved && <p className="text-xs font-semibold text-success" role="status">{french ? 'Fuseau horaire enregistré.' : 'Timezone saved.'}</p>}
          <Button disabled={!business || !businessTimeZone} type="submit">
            {french ? 'Enregistrer le fuseau horaire' : 'Save timezone'}
          </Button>
        </form>
      </Card>
    </>
  )
}

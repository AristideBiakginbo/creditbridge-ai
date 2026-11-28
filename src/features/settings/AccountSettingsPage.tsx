import { useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useAuth } from '../../app/providers/useAuth'
import { useLanguage } from '../../app/providers/useLanguage'
import { creditBridgeDatabase } from '../../lib/db/database'
import { updateUserDisplayName } from '../../lib/repositories/userRepository'
import { PageMeta } from '../../components/common/PageMeta'
import { PageHeader } from '../../components/common/PageHeader'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { inputClasses } from '../../components/ui/fields'

export function AccountSettingsPage() {
  const { user, uid, profile, refreshProfile } = useAuth()
  const { language } = useLanguage()
  const french = language === 'fr'
  const business = useLiveQuery(
    () => profile?.activeBusinessId ? creditBridgeDatabase.businesses.get(profile.activeBusinessId) : undefined,
    [profile?.activeBusinessId],
  )
  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

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
    </>
  )
}

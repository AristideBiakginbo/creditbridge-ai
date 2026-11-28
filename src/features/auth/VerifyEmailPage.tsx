import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../../app/providers/useLanguage'
import { useAuth } from '../../app/providers/useAuth'
import { PageMeta } from '../../components/common/PageMeta'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { reloadAuthenticatedUser, resendEmailVerification, signOutUser } from '../../lib/auth/authService'

export function VerifyEmailPage() {
  const { language } = useLanguage()
  const french = language === 'fr'
  const navigate = useNavigate()
  const { user, refreshUser } = useAuth()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [cooldown, setCooldown] = useState(false)

  async function resend() {
    if (!user || cooldown) return
    setBusy(true)
    setMessage('')
    try {
      await resendEmailVerification(user)
      setCooldown(true)
      setMessage(french ? 'Un nouvel e-mail de vérification a été envoyé.' : 'A new verification email was sent.')
      window.setTimeout(() => setCooldown(false), 60_000)
    } catch {
      setMessage(french ? 'Impossible d’envoyer l’e-mail pour le moment.' : 'The verification email could not be sent right now.')
    } finally {
      setBusy(false)
    }
  }

  async function refresh() {
    if (!user) return
    setBusy(true)
    try {
      await reloadAuthenticatedUser(user)
      await refreshUser()
      if (user.emailVerified) navigate('/onboarding', { replace: true })
      else setMessage(french ? 'Votre adresse n’est pas encore vérifiée.' : 'Your email is not verified yet.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-12 sm:px-6" id="main-content">
      <PageMeta description={french ? 'Vérifiez votre adresse e-mail.' : 'Verify your email address.'} title={french ? 'Vérification' : 'Email verification'} />
      <Card className="p-5 sm:p-8">
        <h1 className="font-display text-2xl font-extrabold">{french ? 'Vérifiez votre adresse e-mail' : 'Verify your email address'}</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{french ? 'Ouvrez l’e-mail envoyé à votre adresse, puis actualisez ce statut.' : 'Open the email sent to your address, then refresh this status.'}</p>
        {message && <p className="mt-4 rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs" role="status">{message}</p>}
        <div className="mt-5 flex flex-wrap gap-3">
          <Button disabled={busy} onClick={refresh}>{french ? 'Actualiser le statut' : 'Refresh status'}</Button>
          <Button disabled={busy || cooldown} onClick={resend} variant="outline">{cooldown ? (french ? 'Renvoyer bientôt' : 'Resend in a minute') : (french ? 'Renvoyer l’e-mail' : 'Resend email')}</Button>
        </div>
        <button className="mt-5 text-xs font-bold text-muted-foreground hover:text-foreground" onClick={async () => { await signOutUser(); navigate('/login', { replace: true }) }} type="button">{french ? 'Se déconnecter' : 'Sign out'}</button>
      </Card>
    </main>
  )
}

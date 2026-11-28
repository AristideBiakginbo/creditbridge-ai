import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../../app/providers/useLanguage'
import { PageMeta } from '../../components/common/PageMeta'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { inputClasses } from '../../components/ui/fields'
import { sendPasswordReset } from '../../lib/auth/authService'
import { mapAuthError } from '../../lib/auth/authErrors'

export function ForgotPasswordPage() {
  const { language } = useLanguage()
  const french = language === 'fr'
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await sendPasswordReset(email)
      setSent(true)
    } catch (caught) {
      setError(mapAuthError(caught).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-12 sm:px-6" id="main-content">
      <PageMeta description={french ? 'Réinitialisez votre mot de passe.' : 'Reset your password.'} title={french ? 'Mot de passe oublié' : 'Password recovery'} />
      <Card className="p-5 sm:p-8">
        <h1 className="font-display text-2xl font-extrabold">{french ? 'Réinitialiser le mot de passe' : 'Reset your password'}</h1>
        {sent ? (
          <div className="mt-5">
            <p className="text-sm leading-6 text-muted-foreground">{french ? 'Si un compte correspond à cette adresse, un e-mail de récupération a été envoyé.' : 'If an account matches this address, a recovery email has been sent.'}</p>
            <Link className="mt-5 inline-flex font-bold text-primary hover:underline" to="/login">{french ? 'Retour à la connexion' : 'Return to sign in'}</Link>
          </div>
        ) : (
          <form className="mt-5 grid gap-4" onSubmit={submit}>
            <label className="grid gap-1.5 text-xs font-semibold">{french ? 'Adresse e-mail' : 'Email address'}<input autoComplete="email" className={inputClasses} onChange={(event) => setEmail(event.target.value)} required type="email" value={email} /></label>
            {error && <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive" role="alert">{error}</p>}
            <Button disabled={busy} type="submit">{busy ? (french ? 'Envoi…' : 'Sending…') : (french ? 'Envoyer le lien' : 'Send reset link')}</Button>
          </form>
        )}
      </Card>
    </main>
  )
}

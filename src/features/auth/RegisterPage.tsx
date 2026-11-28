import { useState, type FormEvent } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useLanguage } from '../../app/providers/useLanguage'
import { PageMeta } from '../../components/common/PageMeta'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { inputClasses } from '../../components/ui/fields'
import { registerWithEmail } from '../../lib/auth/authService'
import { mapAuthError } from '../../lib/auth/authErrors'

export function RegisterPage() {
  const { language } = useLanguage()
  const french = language === 'fr'
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [acknowledged, setAcknowledged] = useState(false)
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (password !== confirmation) {
      setError(french ? 'Les mots de passe ne correspondent pas.' : 'Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError(french ? 'Utilisez au moins 8 caractères.' : 'Use at least 8 characters.')
      return
    }
    if (!acknowledged) {
      setError(french ? 'Veuillez confirmer les conditions.' : 'Please acknowledge the privacy and terms.')
      return
    }
    setBusy(true)
    try {
      await registerWithEmail(email, password, displayName)
      navigate('/verify-email', { replace: true })
    } catch (caught) {
      setError(mapAuthError(caught).message)
    } finally {
      setBusy(false)
    }
  }

  const label = 'grid gap-1.5 text-xs font-semibold text-foreground'
  return (
    <main className="mx-auto min-h-[calc(100vh-4.5rem)] max-w-xl px-4 py-10 sm:px-6" id="main-content">
      <PageMeta description={french ? 'Créer un compte CreditBridge AI.' : 'Create a CreditBridge AI account.'} title={french ? 'Créer un compte' : 'Create account'} />
      <Card className="p-5 sm:p-8">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">{french ? 'Commencer' : 'Get started'}</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold">{french ? 'Créez votre espace' : 'Create your workspace'}</h1>
        <form className="mt-7 grid gap-4" onSubmit={submit}>
          <label className={label}>{french ? 'Nom complet' : 'Full name'}<input autoComplete="name" className={inputClasses} maxLength={80} minLength={2} onChange={(event) => setDisplayName(event.target.value)} required value={displayName} /></label>
          <label className={label}>{french ? 'Adresse e-mail' : 'Email address'}<input autoComplete="email" className={inputClasses} onChange={(event) => setEmail(event.target.value)} required type="email" value={email} /></label>
          <label className={label}>{french ? 'Mot de passe' : 'Password'}
            <span className="relative">
              <input autoComplete="new-password" className={`${inputClasses} pr-12`} minLength={8} onChange={(event) => setPassword(event.target.value)} required type={visible ? 'text' : 'password'} value={password} />
              <button aria-label={french ? 'Afficher le mot de passe' : 'Show password'} className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground" onClick={() => setVisible((current) => !current)} type="button">{visible ? <EyeOff size={16} /> : <Eye size={16} />}</button>
            </span>
          </label>
          <label className={label}>{french ? 'Confirmer le mot de passe' : 'Confirm password'}<input autoComplete="new-password" className={inputClasses} onChange={(event) => setConfirmation(event.target.value)} required type={visible ? 'text' : 'password'} value={confirmation} /></label>
          <label className="flex items-start gap-3 text-xs leading-5 text-muted-foreground"><input checked={acknowledged} className="mt-0.5 size-4 accent-primary" onChange={(event) => setAcknowledged(event.target.checked)} type="checkbox" /><span>{french ? 'J’ai lu et j’accepte les engagements de confidentialité.' : 'I have reviewed and accept the privacy commitments.'}</span></label>
          {error && <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive" role="alert">{error}</p>}
          <Button disabled={busy} type="submit">{busy ? (french ? 'Création…' : 'Creating…') : (french ? 'Créer le compte' : 'Create account')}</Button>
        </form>
        <p className="mt-5 text-sm text-muted-foreground">{french ? 'Déjà inscrit ?' : 'Already have an account?'} <Link className="font-bold text-primary hover:underline" to="/login">{french ? 'Se connecter' : 'Sign in'}</Link></p>
      </Card>
    </main>
  )
}

import { useState, type FormEvent } from 'react'
import { ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useLanguage } from '../../app/providers/useLanguage'
import { PageMeta } from '../../components/common/PageMeta'
import { Button } from '../../components/ui/Button'
import { buttonClasses } from '../../components/ui/buttonStyles'
import { Card } from '../../components/ui/Card'
import { inputClasses } from '../../components/ui/fields'
import { signInWithEmail, signInWithGoogle } from '../../lib/auth/authService'
import { mapAuthError } from '../../lib/auth/authErrors'

export function LoginPreviewPage() {
  const { language } = useLanguage()
  const french = language === 'fr'
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  function safeDestination(): string {
    const state = location.state as { from?: string } | null
    return state?.from && state.from.startsWith('/app') ? state.from : '/app/dashboard'
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      await signInWithEmail(email, password, remember)
      navigate(safeDestination(), { replace: true })
    } catch (caught) {
      setError(mapAuthError(caught).message)
    } finally {
      setBusy(false)
    }
  }

  async function googleSignIn() {
    setError('')
    setBusy(true)
    try {
      await signInWithGoogle(remember)
      navigate(safeDestination(), { replace: true })
    } catch (caught) {
      setError(mapAuthError(caught).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto min-h-[calc(100vh-4.5rem)] max-w-7xl px-4 py-8 sm:px-6 lg:px-8" id="main-content">
      <PageMeta description={french ? 'Connexion sécurisée à votre espace CreditBridge AI.' : 'Securely sign in to your CreditBridge AI workspace.'} title={french ? 'Connexion' : 'Sign in'} />
      <div className="grid min-h-[620px] overflow-hidden rounded-3xl border border-border bg-surface shadow-sm lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.75fr)]">
        <Card className="m-2 border-0 p-5 sm:p-8 lg:m-3 lg:p-10">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">{french ? 'Votre espace professionnel' : 'Your business workspace'}</p>
          <h1 className="mt-3 max-w-md font-display text-3xl font-extrabold text-foreground">{french ? 'Retrouvez vos registres financiers' : 'Return to your financial records'}</h1>
          <form className="mt-8 grid max-w-md gap-4" onSubmit={submit}>
            <label className="grid gap-1.5 text-xs font-semibold">
              {french ? 'Adresse e-mail' : 'Email address'}
              <input autoComplete="email" className={inputClasses} onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
            </label>
            <label className="grid gap-1.5 text-xs font-semibold">
              {french ? 'Mot de passe' : 'Password'}
              <span className="relative">
                <input autoComplete="current-password" className={`${inputClasses} pr-12`} onChange={(event) => setPassword(event.target.value)} required type={visible ? 'text' : 'password'} value={password} />
                <button aria-label={visible ? (french ? 'Masquer le mot de passe' : 'Hide password') : (french ? 'Afficher le mot de passe' : 'Show password')} className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground hover:bg-muted" onClick={() => setVisible((current) => !current)} type="button">
                  {visible ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </span>
            </label>
            <div className="flex items-center justify-between gap-3 text-xs">
              <label className="flex items-center gap-2">
                <input checked={remember} className="size-4 accent-primary" onChange={(event) => setRemember(event.target.checked)} type="checkbox" />
                {french ? 'Se souvenir de moi' : 'Remember me'}
              </label>
              <Link className="font-semibold text-primary hover:underline" to="/forgot-password">{french ? 'Mot de passe oublié ?' : 'Forgot password?'}</Link>
            </div>
            {error && <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive" role="alert">{error}</p>}
            <Button disabled={busy} type="submit" variant="primary">{busy ? (french ? 'Connexion…' : 'Signing in…') : (french ? 'Se connecter' : 'Sign in')}</Button>
            <Button disabled={busy} onClick={googleSignIn} type="button" variant="outline">{french ? 'Continuer avec Google' : 'Continue with Google'}</Button>
          </form>
          <p className="mt-6 text-sm text-muted-foreground">
            {french ? 'Nouveau sur CreditBridge ?' : 'New to CreditBridge?'}{' '}
            <Link className="font-bold text-primary hover:underline" to="/register">{french ? 'Créer un compte' : 'Create an account'}</Link>
          </p>
          <Link className={`${buttonClasses('outline')} mt-4`} to="/demo">{french ? 'Explorer la démo' : 'Explore demo'} <ArrowRight size={15} /></Link>
        </Card>
        <aside className="relative hidden overflow-hidden bg-primary p-8 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -right-24 -top-24 size-72 rounded-full border border-white/10" />
          <div className="absolute -bottom-28 -left-20 size-72 rounded-full border border-white/10" />
          <ShieldCheck className="relative" size={34} />
          <div className="relative">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-emerald-100">{french ? 'Confidentialité avant tout' : 'Privacy first'}</p>
            <h2 className="mt-3 max-w-sm font-display text-3xl font-extrabold">{french ? 'Vos activités restent sous votre contrôle.' : 'Your business activity stays under your control.'}</h2>
            <p className="mt-4 max-w-md text-sm leading-6 text-emerald-50/80">
              {french ? 'Les transactions sont conservées localement. Aucun stockage cloud financier n’est activé.' : 'Transactions remain local by default. No cloud financial storage is enabled.'}
            </p>
          </div>
          <div className="relative rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
            <p className="text-xs font-bold">{french ? 'Aperçu du tableau de bord' : 'Workspace preview'}</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[62, 82, 48].map((height, index) => <div className="flex h-24 items-end rounded-xl bg-white/10 p-2" key={index}><div className="w-full rounded-md bg-white/70" style={{ height: `${height}%` }} /></div>)}
            </div>
          </div>
        </aside>
      </div>
    </main>
  )
}

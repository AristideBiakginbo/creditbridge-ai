import { ArrowRight, LockKeyhole, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../../app/providers/useLanguage'
import { PageHeader } from '../../components/common/PageHeader'
import { PageMeta } from '../../components/common/PageMeta'
import { Button } from '../../components/ui/Button'
import { buttonClasses } from '../../components/ui/buttonStyles'
import { Card } from '../../components/ui/Card'

export function LoginPreviewPage() {
  const { language, t } = useLanguage()
  const french = language === 'fr'

  return (
    <main className="mx-auto min-h-[65vh] max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8" id="main-content">
      <PageMeta description={t('auth.unavailable')} title={t('auth.preview')} />
      <PageHeader
        description={french ? 'Un aperçu de l’expérience de connexion prévue, sans authentification simulée.' : 'A preview of the intended sign-in experience, without simulated authentication.'}
        eyebrow={t('auth.preview')}
        title={french ? 'Votre espace, sous votre contrôle' : 'Your workspace, on your terms'}
      />
      <div className="mx-auto grid max-w-4xl gap-5 md:grid-cols-[1fr_0.85fr]">
        <Card className="p-5 sm:p-7">
          <div className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
            <LockKeyhole aria-hidden="true" size={22} />
          </div>
          <h2 className="mt-5 font-display text-xl font-extrabold text-foreground">
            {french ? 'Authentification bientôt disponible' : 'Authentication is not connected'}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{t('auth.unavailable')}</p>
          <div className="mt-6 grid gap-2">
            <Button disabled variant="primary">
              {french ? 'Connexion indisponible' : 'Sign-in unavailable'}
            </Button>
            <Link className={buttonClasses('outline')} to="/demo">
              {french ? 'Continuer vers la démo synthétique' : 'Continue to synthetic demo'}
              <ArrowRight aria-hidden="true" size={16} />
            </Link>
          </div>
        </Card>
        <Card className="bg-primary p-5 text-primary-foreground sm:p-7">
          <ShieldCheck aria-hidden="true" size={24} />
          <h2 className="mt-5 text-lg font-bold">
            {french ? 'Pas de faux compte' : 'No pretend account'}
          </h2>
          <p className="mt-2 text-sm leading-6 text-primary-foreground/75">
            {french
              ? 'Aucun mot de passe n’est demandé, accepté ou stocké. Les fonctions de compte et de synchronisation nécessitent une implémentation réelle avant activation.'
              : 'No password is requested, accepted or stored. Account and synchronization features need a real implementation before they can be enabled.'}
          </p>
          <Link className="mt-6 inline-flex min-h-10 items-center gap-2 text-sm font-bold text-white hover:underline" to="/privacy">
            {french ? 'Lire les engagements de confidentialité' : 'Review privacy commitments'}
            <ArrowRight aria-hidden="true" size={15} />
          </Link>
        </Card>
      </div>
    </main>
  )
}

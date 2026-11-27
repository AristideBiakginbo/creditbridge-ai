import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../../app/providers/useLanguage'
import { PageMeta } from '../../components/common/PageMeta'
import { buttonClasses } from '../../components/ui/buttonStyles'

export function NotFoundPage() {
  const { language } = useLanguage()
  const french = language === 'fr'

  return (
    <main className="grid min-h-[65vh] place-items-center px-4 py-12 text-center" id="main-content">
      <PageMeta description={french ? 'Cette page est introuvable.' : 'This page could not be found.'} title={french ? 'Page introuvable' : 'Page not found'} />
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-secondary">404</p>
        <h1 className="mt-3 font-display text-3xl font-extrabold text-foreground">
          {french ? 'Cette page est introuvable' : 'This page could not be found'}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {french ? 'Vérifiez l’adresse ou revenez à la page d’accueil.' : 'Check the address or return to the homepage.'}
        </p>
        <Link className={`${buttonClasses('primary')} mt-6`} to="/">
          <ArrowLeft aria-hidden="true" size={16} /> {french ? 'Retour à l’accueil' : 'Back to home'}
        </Link>
      </div>
    </main>
  )
}

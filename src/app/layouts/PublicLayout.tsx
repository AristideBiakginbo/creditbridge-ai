import { useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { useLanguage } from '../providers/useLanguage'
import { Brand } from '../../components/brand/Brand'
import { LanguageControl, ThemeControl } from '../../components/common/ThemeLanguageControls'
import { buttonClasses } from '../../components/ui/buttonStyles'

const publicLinks = [
  { to: '/features', key: 'nav.features' as const },
  { to: '/how-it-works', key: 'nav.howItWorks' as const },
  { to: '/privacy', key: 'nav.privacy' as const },
  { to: '/about', key: 'nav.about' as const },
]
const copyrightYear = new Date().getFullYear()

export function PublicLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { t } = useLanguage()

  return (
    <div className="min-h-screen bg-background text-foreground">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link aria-label="CreditBridge AI home" className="shrink-0" to="/">
            <span className="sm:hidden"><Brand compact /></span>
            <span className="hidden sm:inline-flex"><Brand /></span>
          </Link>
          <nav aria-label="Main navigation" className="hidden items-center gap-6 lg:flex">
            {publicLinks.map(({ to, key }) => (
              <Link
                className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
                key={to}
                to={to}
              >
                {t(key)}
              </Link>
            ))}
          </nav>
          <div className="hidden items-center gap-2 lg:flex">
            <LanguageControl />
            <ThemeControl />
            <Link
              className="rounded-xl px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted"
              to="/login"
            >
              {t('nav.signIn')}
            </Link>
            <Link className={buttonClasses('primary', 'min-h-10')} to="/onboarding">
              {t('nav.getStarted')}
            </Link>
          </div>
          <div className="flex items-center gap-2 lg:hidden">
            <LanguageControl />
            <button
              aria-expanded={menuOpen}
              aria-label={menuOpen ? t('common.closeMenu') : t('common.openMenu')}
              className="grid size-10 place-items-center rounded-xl border border-border bg-surface text-foreground"
              onClick={() => setMenuOpen((open) => !open)}
              type="button"
            >
              {menuOpen ? <X size={19} /> : <Menu size={19} />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav
            aria-label="Mobile main navigation"
            className="border-t border-border bg-surface px-4 py-4 shadow-xl lg:hidden"
          >
            <div className="mx-auto flex max-w-7xl flex-col gap-1">
              {publicLinks.map(({ to, key }) => (
                <Link
                  className="rounded-xl px-3 py-3 text-sm font-semibold text-foreground hover:bg-muted"
                  key={to}
                  onClick={() => setMenuOpen(false)}
                  to={to}
                >
                  {t(key)}
                </Link>
              ))}
              <div className="my-2 flex items-center justify-between border-t border-border pt-3">
                <ThemeControl />
                <Link
                  className="rounded-xl px-3 py-2 text-sm font-semibold text-foreground"
                  onClick={() => setMenuOpen(false)}
                  to="/login"
                >
                  {t('nav.signIn')}
                </Link>
              </div>
              <Link
                className={buttonClasses('primary', 'w-full')}
                onClick={() => setMenuOpen(false)}
                to="/onboarding"
              >
                {t('nav.getStarted')}
              </Link>
            </div>
          </nav>
        )}
      </header>

      <Outlet />

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
          <div>
            <Link aria-label="CreditBridge AI home" to="/">
              <Brand />
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">
              Practical financial tools for small businesses, designed with
              privacy and intermittent connectivity in mind.
            </p>
          </div>
          <div>
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-foreground">
              Product
            </h2>
            <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
              <Link className="hover:text-foreground" to="/features">{t('nav.features')}</Link>
              <Link className="hover:text-foreground" to="/how-it-works">{t('nav.howItWorks')}</Link>
              <Link className="hover:text-foreground" to="/demo">{t('nav.demo')}</Link>
            </div>
          </div>
          <div>
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-foreground">
              Trust &amp; project
            </h2>
            <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
              <Link className="hover:text-foreground" to="/privacy">{t('nav.privacy')}</Link>
              <Link className="hover:text-foreground" to="/about">{t('nav.about')}</Link>
              <a
                className="hover:text-foreground"
                href="https://github.com/AristideBiakginbo/creditbridge-ai"
                rel="noreferrer"
                target="_blank"
              >
                GitHub repository
              </a>
            </div>
          </div>
        </div>
        <div className="border-t border-border px-4 py-4 text-center text-xs text-muted-foreground">
          © {copyrightYear} CreditBridge AI · Independent hackathon
          project; not endorsed by Google.
        </div>
      </footer>
    </div>
  )
}

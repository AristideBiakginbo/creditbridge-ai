import { useEffect, useRef, useState } from 'react'
import {
  Activity,
  ArrowDownUp,
  BarChart3,
  Bell,
  CircleHelp,
  FileCheck2,
  LayoutDashboard,
  Menu,
  MessageCircle,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Settings,
  Shield,
  Sparkles,
  Target,
  WalletCards,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react'
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
} from 'react-router-dom'
import { DemoDataProvider } from '../providers/DemoDataProvider'
import { useDemoData } from '../providers/useDemoData'
import { useLanguage } from '../providers/useLanguage'
import { Brand } from '../../components/brand/Brand'
import { LanguageControl, ThemeControl } from '../../components/common/ThemeLanguageControls'
import { Badge } from '../../components/ui/Badge'
import { buttonClasses } from '../../components/ui/buttonStyles'

const primaryNavigation = [
  { path: 'dashboard', key: 'nav.dashboard' as const, icon: LayoutDashboard },
  { path: 'transactions', key: 'nav.transactions' as const, icon: ArrowDownUp },
  { path: 'assistant', key: 'nav.assistant' as const, icon: MessageCircle },
]

const financialNavigation = [
  { path: 'analytics', key: 'nav.analytics' as const, icon: BarChart3 },
  { path: 'passport', key: 'nav.passport' as const, icon: FileCheck2 },
  { path: 'loans', key: 'nav.loans' as const, icon: WalletCards },
  { path: 'budgets', key: 'nav.budgets' as const, icon: Target },
  { path: 'debts', key: 'nav.debts' as const, icon: ArrowDownUp },
]

const managementNavigation = [
  { path: 'notifications', key: 'nav.notifications' as const, icon: Bell },
  { path: 'privacy', key: 'nav.privacy' as const, icon: Shield },
  { path: 'settings', key: 'nav.settings' as const, icon: Settings },
  { path: 'help', key: 'nav.help' as const, icon: CircleHelp },
]

function useBrowserOnline() {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])
  return online
}

function usePageTitle(pathname: string): string {
  const { t } = useLanguage()
  const path = pathname.split('/').filter(Boolean).at(-1) ?? 'dashboard'
  if (path === 'new') return t('workspace.newTransaction')
  if (path === 'dashboard' || path === 'app' || path === 'demo') return t('dashboard.title')

  const translationKey: Record<string, Parameters<typeof t>[0] | undefined> = {
    transactions: 'nav.transactions',
    assistant: 'nav.assistant',
    analytics: 'nav.analytics',
    passport: 'nav.passport',
    loans: 'nav.loans',
    budgets: 'nav.budgets',
    goals: 'nav.budgets',
    debts: 'nav.debts',
    notifications: 'nav.notifications',
    privacy: 'nav.privacy',
    settings: 'nav.settings',
    help: 'nav.help',
  }
  const key = translationKey[path]
  return key ? t(key) : t('workspace.title')
}

function RouteNavigation({
  basePath,
  collapsed,
  mobile = false,
  onNavigate,
}: {
  basePath: string
  collapsed: boolean
  mobile?: boolean
  onNavigate?: () => void
}) {
  const { t } = useLanguage()
  const groups = [
    { title: t('nav.overviewGroup'), items: primaryNavigation },
    { title: t('nav.financeGroup'), items: financialNavigation },
    { title: t('nav.manageGroup'), items: managementNavigation },
  ]

  return (
    <nav aria-label={mobile ? t('workspace.mobile') : t('workspace.menu')} className="space-y-5">
      {groups.map((group) => (
        <div key={group.title}>
          {!collapsed && (
            <p className="mb-2 px-3 text-[0.65rem] font-extrabold uppercase tracking-[0.14em] text-muted-foreground">
              {group.title}
            </p>
          )}
          <div className="grid gap-1">
            {group.items.map(({ path, key, icon: Icon }) => (
              <NavLink
                aria-label={t(key)}
                className={({ isActive }) =>
                  `group flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  } ${collapsed ? 'justify-center px-0' : ''}`
                }
                key={path}
                onClick={onNavigate}
                title={collapsed ? t(key) : undefined}
                to={`${basePath}/${path}`}
              >
                <Icon aria-hidden="true" size={18} />
                {!collapsed && <span className="truncate">{t(key)}</span>}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  )
}

function WorkspaceFrame() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const mobileDialogRef = useRef<HTMLElement>(null)
  const mobileTriggerRef = useRef<HTMLButtonElement>(null)
  const mobileCloseRef = useRef<HTMLButtonElement>(null)
  const location = useLocation()
  const online = useBrowserOnline()
  const { t } = useLanguage()
  const { error } = useDemoData()
  const basePath = location.pathname.startsWith('/demo') ? '/demo' : '/app'
  const pageTitle = usePageTitle(location.pathname)

  useEffect(() => {
    if (!mobileOpen) return
    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
    mobileCloseRef.current?.focus()
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileOpen(false)
        return
      }
      if (event.key !== 'Tab' || !mobileDialogRef.current) return
      const items = [...mobileDialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), select:not([disabled]), input:not([disabled])',
      )]
      const first = items[0]
      const last = items.at(-1)
      if (!first || !last) return
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      window.removeEventListener('keydown', closeOnEscape)
      if (mobileOpen) previousFocus?.focus()
    }
  }, [mobileOpen])

  const OnlineIcon = online ? Wifi : WifiOff

  return (
    <div className="min-h-screen bg-background text-foreground">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <div className="flex min-h-screen">
        <aside
          className={`hidden shrink-0 border-r border-border bg-surface transition-[width] duration-200 lg:fixed lg:inset-y-0 lg:flex lg:flex-col ${
            collapsed ? 'lg:w-[5.25rem]' : 'lg:w-64'
          }`}
        >
          <div className={`flex h-[4.5rem] items-center border-b border-border px-4 ${collapsed ? 'justify-center' : ''}`}>
            <Link aria-label="CreditBridge AI home" to="/">
              <Brand compact={collapsed} />
            </Link>
          </div>
          {!collapsed && (
            <div className="mx-3 mt-4 rounded-xl border border-border bg-background px-3 py-3">
              <p className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">
                {t('workspace.title')}
              </p>
              <p className="mt-1 truncate text-sm font-bold text-foreground">
                {t('workspace.business')}
              </p>
              <Badge className="mt-2" tone="warning">Synthetic demo · MAD</Badge>
            </div>
          )}
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-5">
            <RouteNavigation basePath={basePath} collapsed={collapsed} />
          </div>
          <div className="border-t border-border p-3">
            {!collapsed && (
              <div className="mb-3 flex items-center gap-2 rounded-xl bg-muted/70 px-3 py-2.5">
                <OnlineIcon aria-hidden="true" className={online ? 'text-success' : 'text-warning'} size={16} />
                <span className="text-xs font-medium text-muted-foreground">
                  {online ? t('common.online') : t('common.offline')} · browser status
                </span>
              </div>
            )}
            <div className={`flex items-center gap-2 ${collapsed ? 'justify-center' : ''}`}>
              <div className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-extrabold text-primary">
                KB
              </div>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold">Preview workspace</p>
                  <Link className="text-[0.68rem] text-muted-foreground hover:text-primary" to="/login">
                    Authentication not connected
                  </Link>
                </div>
              )}
              <button
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                className="hidden size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground lg:flex"
                onClick={() => setCollapsed((value) => !value)}
                title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                type="button"
              >
                {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
              </button>
            </div>
          </div>
        </aside>

        <div className={`flex min-h-screen min-w-0 flex-1 flex-col ${collapsed ? 'lg:pl-[5.25rem]' : 'lg:pl-64'}`}>
          <header className="sticky top-0 z-30 flex h-[4.5rem] items-center justify-between gap-3 border-b border-border bg-background/90 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                aria-expanded={mobileOpen}
                aria-label={mobileOpen ? t('common.closeMenu') : t('common.openMenu')}
                className="grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-surface text-foreground lg:hidden"
                onClick={() => setMobileOpen((open) => !open)}
                ref={mobileTriggerRef}
                type="button"
              >
                {mobileOpen ? <X size={19} /> : <Menu size={19} />}
              </button>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-foreground sm:text-base">
                  {pageTitle}
                </p>
                <p className="hidden text-[0.68rem] text-muted-foreground sm:block">
                  {t('workspace.title')} · all records are synthetic
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="hidden md:block"><Badge tone={online ? 'success' : 'warning'}><OnlineIcon aria-hidden="true" size={13} />{online ? t('common.online') : t('common.offline')}</Badge></span>
              <LanguageControl />
              <span className="hidden sm:block"><ThemeControl /></span>
              <Link
                aria-label={t('nav.notifications')}
                className="hidden size-10 place-items-center rounded-xl border border-border bg-surface text-muted-foreground hover:text-foreground sm:grid"
                onClick={() => setMobileOpen(false)}
                to={`${basePath}/notifications`}
              >
                <Bell aria-hidden="true" size={17} />
              </Link>
              <span className="hidden sm:block">
                <Link
                  className={buttonClasses('primary', 'min-h-10 px-3')}
                  onClick={() => setMobileOpen(false)}
                  to={`${basePath}/transactions/new`}
                >
                  <Plus aria-hidden="true" size={16} />
                  <span>{t('workspace.add')}</span>
                </Link>
              </span>
            </div>
          </header>

          <main className="flex-1 px-4 pb-28 pt-5 sm:px-6 sm:pt-7 lg:px-8 lg:pb-10" id="main-content">
            <div className="mx-auto max-w-[1480px]">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-warning/25 bg-warning/5 px-3.5 py-2.5 text-xs leading-5 text-foreground sm:px-4">
                <span className="flex items-center gap-2 font-semibold">
                  <Activity aria-hidden="true" className="text-warning" size={15} />
                  {t('common.syntheticNotice')}
                </span>
                <Badge tone="warning">Demo only</Badge>
              </div>
              {error && (
                <div className="mb-5 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">
                  <strong>{t('workspace.localDataError')}:</strong> {error}
                </div>
              )}
              <Outlet />
            </div>
          </main>
          <footer className="hidden border-t border-border px-8 py-4 text-xs text-muted-foreground lg:block">
            Data stays in this browser&apos;s separate demo repository. No sync status is claimed.
          </footer>
        </div>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/45 lg:hidden">
          <button
            aria-label={t('common.closeMenu')}
            className="absolute inset-0 cursor-default"
            onClick={() => setMobileOpen(false)}
            type="button"
          />
          <aside
            aria-label={t('workspace.menu')}
            aria-modal="true"
            className="relative flex h-full w-[min(19rem,88vw)] flex-col border-r border-border bg-surface p-4 shadow-2xl"
            ref={mobileDialogRef}
            role="dialog"
          >
            <div className="flex items-center justify-between border-b border-border pb-4">
              <Brand />
              <button
                aria-label={t('common.closeMenu')}
                className="grid size-10 place-items-center rounded-xl text-muted-foreground hover:bg-muted"
                onClick={() => setMobileOpen(false)}
                ref={mobileCloseRef}
                type="button"
              >
                <X size={19} />
              </button>
            </div>
            <div className="my-4 rounded-xl border border-border bg-background px-3 py-3">
              <p className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">{t('workspace.title')}</p>
              <p className="mt-1 text-sm font-bold">{t('workspace.business')}</p>
              <Badge className="mt-2" tone="warning">Synthetic demo · MAD</Badge>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              <RouteNavigation basePath={basePath} collapsed={false} mobile onNavigate={() => setMobileOpen(false)} />
            </div>
            <Link
              className={buttonClasses('primary', 'mt-4 w-full')}
              onClick={() => setMobileOpen(false)}
              to={`${basePath}/transactions/new`}
            >
              <Plus aria-hidden="true" size={17} />
              {t('workspace.add')}
            </Link>
            <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
              <ThemeControl />
              <LanguageControl />
            </div>
          </aside>
        </div>
      )}

      <nav aria-label="Mobile quick navigation" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        {[
          { path: 'dashboard', key: 'nav.dashboard' as const, icon: LayoutDashboard },
          { path: 'transactions', key: 'nav.transactions' as const, icon: ArrowDownUp },
          { path: 'assistant', key: 'nav.assistant' as const, icon: Sparkles },
        ].map(({ path, key, icon: Icon }) => (
          <NavLink
            aria-label={t(key)}
            className={({ isActive }) => `flex min-h-14 flex-col items-center justify-center gap-1 text-[0.62rem] font-semibold ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
            key={path}
            to={`${basePath}/${path}`}
          >
            <Icon aria-hidden="true" size={18} />
            {t(key)}
          </NavLink>
        ))}
        <Link
          aria-label={t('workspace.quickAction')}
          className="flex min-h-14 flex-col items-center justify-center gap-1 text-[0.62rem] font-semibold text-primary"
          to={`${basePath}/transactions/new`}
        >
          <Plus aria-hidden="true" size={18} />
          {t('workspace.quickAction')}
        </Link>
      </nav>
    </div>
  )
}

export function DemoWorkspaceLayout() {
  return (
    <DemoDataProvider>
      <WorkspaceFrame />
    </DemoDataProvider>
  )
}

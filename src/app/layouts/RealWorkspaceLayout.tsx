import { useState } from 'react'
import { ArrowDownUp, LayoutDashboard, LogOut, Menu, MessageCircle, Settings, Shield, X } from 'lucide-react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../providers/useAuth'
import { useLanguage } from '../providers/useLanguage'
import { Brand } from '../../components/brand/Brand'
import { LanguageControl, ThemeControl } from '../../components/common/ThemeLanguageControls'

const items = [
  { path: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: 'transactions', icon: ArrowDownUp, label: 'Transactions' },
  { path: 'assistant', icon: MessageCircle, label: 'AI Assistant' },
  { path: 'settings', icon: Settings, label: 'Settings' },
  { path: 'privacy', icon: Shield, label: 'Privacy' },
] as const

export function RealWorkspaceLayout() {
  const { user, profile, signOut } = useAuth()
  const { language } = useLanguage()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const french = language === 'fr'

  async function logout() {
    await signOut()
    navigate('/login', { replace: true })
  }

  const nav = (
    <nav aria-label={french ? 'Navigation principale' : 'Primary navigation'} className="grid gap-1">
      {items.map(({ path, icon: Icon }) => (
        <NavLink
          className={({ isActive }) => `flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold ${isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
          key={path}
          onClick={() => setOpen(false)}
          to={`/app/${path}`}
        >
          <Icon size={18} />{french && path === 'dashboard' ? 'Tableau de bord' : french && path === 'transactions' ? 'Transactions' : french && path === 'assistant' ? 'Assistant IA' : french && path === 'settings' ? 'Paramètres' : french && path === 'privacy' ? 'Confidentialité' : path === 'dashboard' ? 'Dashboard' : path === 'transactions' ? 'Transactions' : path === 'assistant' ? 'AI Assistant' : path === 'settings' ? 'Settings' : 'Privacy'}
        </NavLink>
      ))}
    </nav>
  )

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-border bg-surface p-4 lg:flex">
        <Link to="/"><Brand /></Link>
        <div className="mt-5">{nav}</div>
        <div className="mt-auto border-t border-border pt-4">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">{(user?.displayName || user?.email || 'CB').slice(0, 2).toUpperCase()}</div>
            <div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">{user?.displayName || user?.email}</p><p className="text-[0.68rem] text-muted-foreground">{profile?.onboardingCompleted ? (french ? 'Compte vérifié' : 'Account workspace') : (french ? 'Configuration' : 'Setup')}</p></div>
          </div>
          <button className="mt-3 flex min-h-10 w-full items-center gap-2 rounded-xl px-3 text-xs font-semibold text-muted-foreground hover:bg-muted" onClick={logout} type="button"><LogOut size={16} />{french ? 'Se déconnecter' : 'Sign out'}</button>
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-50 bg-slate-950/45 lg:hidden"><button aria-label={french ? 'Fermer' : 'Close'} className="absolute inset-0" onClick={() => setOpen(false)} type="button" /><aside className="relative h-full w-[min(19rem,88vw)] bg-surface p-4"><div className="flex items-center justify-between"><Brand /><button aria-label={french ? 'Fermer' : 'Close'} className="grid size-10 place-items-center" onClick={() => setOpen(false)} type="button"><X size={18} /></button></div><div className="mt-5">{nav}</div></aside></div>}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-[4.5rem] items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur lg:px-8">
          <button aria-label={french ? 'Ouvrir le menu' : 'Open menu'} className="grid size-10 place-items-center rounded-xl border border-border lg:hidden" onClick={() => setOpen(true)} type="button"><Menu size={18} /></button>
          <p className="hidden text-sm font-bold sm:block">{french ? 'Espace professionnel' : 'Business workspace'}</p>
          <div className="ml-auto flex items-center gap-2"><LanguageControl /><span className="hidden sm:block"><ThemeControl /></span></div>
        </header>
        <main className="px-4 pb-10 pt-6 sm:px-6 lg:px-8" id="main-content"><div className="mx-auto max-w-[1480px]"><Outlet /></div></main>
      </div>
    </div>
  )
}

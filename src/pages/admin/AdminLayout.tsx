import {
  ArrowUpRight,
  BadgeDollarSign,
  BarChart3,
  ClipboardList,
  Gauge,
  Gavel,
  Languages,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  PackageCheck,
  RotateCcw,
  Settings,
  ShieldCheck,
  Undo2,
  Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import { DemoBanner, LogoMark } from '../../components/Brand'
import { useToast } from '../../components/Toast'
import { IconButton, cn } from '../../components/ui'
import { useStore } from '../../store/useStore'
import type { Language } from '../../types'

export interface AdminNavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
  badge?: string
}

export const adminNav: AdminNavItem[] = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/auctions', label: 'Auctions', icon: Gavel },
  { to: '/admin/payments', label: 'Payments', icon: Wallet },
  { to: '/admin/reconciliation', label: 'Reconciliation', icon: ClipboardList },
  { to: '/admin/refunds', label: 'Refunds', icon: Undo2 },
  { to: '/admin/fulfilment', label: 'Fulfilment', icon: PackageCheck },
  { to: '/admin/audit', label: 'Audit log', icon: ShieldCheck },
  { to: '/admin/economics', label: 'Unit economics', icon: BarChart3 },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
]

export function AdminLayout() {
  const adminAuthed = useStore((state) => state.adminAuthed)
  const language = useStore((state) => state.language)
  const setLanguage = useStore((state) => state.setLanguage)
  const adminLogout = useStore((state) => state.adminLogout)
  const resetDemo = useStore((state) => state.resetDemo)
  const { showToast } = useToast()
  const location = useLocation()

  if (!adminAuthed) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />

  const toggleLanguage = () => {
    const next: Language = language === 'en' ? 'am' : 'en'
    setLanguage(next)
  }

  const activeLabel = adminNav.find((item) => (item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)))?.label

  return (
    <div className="admin-bg flex min-h-screen bg-page text-ink">
      <aside className="no-print sticky top-0 hidden h-screen w-[248px] flex-none flex-col overflow-y-auto bg-ink px-3 py-4 text-white lg:flex">
        <Link to="/admin" className="focus-ring flex items-center gap-2.5 rounded-xl px-2 py-1.5">
          <LogoMark tone="green" className="h-9 w-9" />
          <div className="leading-none">
            <p className="text-[17px] font-extrabold tracking-[-0.045em]">
              How<span className="text-brand">Low</span>
            </p>
            <p className="mt-1 text-[7px] font-bold uppercase tracking-[0.24em] text-white/45">Operations console</p>
          </div>
        </Link>

        <div className="mt-5 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.045] px-2.5 py-2">
          <span className="relative flex h-7 w-7 flex-none items-center justify-center rounded-full bg-brand text-[10px] font-black text-white">
            SM
            <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-ink bg-brand" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-bold">Sara Mekonnen</p>
            <p className="truncate text-[9px] text-white/45">Operations admin</p>
          </div>
          <ShieldCheck className="h-3.5 w-3.5 text-brand" />
        </div>

        <nav className="mt-5 flex-1 space-y-0.5" aria-label="Admin navigation">
          {adminNav.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'focus-ring group flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[12px] font-semibold transition',
                    isActive
                      ? 'bg-brand text-white shadow-[0_8px_20px_rgba(67,176,42,0.22)]'
                      : 'text-white/60 hover:bg-white/[0.06] hover:text-white',
                  )
                }
              >
                <Icon className="h-4 w-4 flex-none" strokeWidth={2} />
                <span className="flex-1">{item.label}</span>
                {item.badge ? (
                  <span className="rounded-full bg-accent px-1.5 py-0.5 text-[8px] font-black text-white">{item.badge}</span>
                ) : null}
              </NavLink>
            )
          })}
        </nav>

        <div className="mt-4 space-y-2">
          <Link
            to="/"
            className="focus-ring flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2.5 text-[11px] font-semibold text-white/70 transition hover:bg-white/[0.08] hover:text-white"
          >
            <span className="inline-flex items-center gap-2">
              <ArrowUpRight className="h-3.5 w-3.5" /> Open mobile app
            </span>
            <span className="rounded-full bg-brand/20 px-1.5 py-0.5 text-[8px] font-bold text-brand">390px</span>
          </Link>
          <button
            type="button"
            onClick={() => {
              resetDemo()
              showToast({ tone: 'success', title: 'Demo data reset', message: 'All auctions, payments and bids were reseeded.' })
            }}
            className="focus-ring flex w-full items-center gap-2 rounded-xl px-3 py-2 text-[10.5px] font-semibold text-white/45 transition hover:bg-white/[0.06] hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset demo data
          </button>
          <div className="flex items-center gap-1.5 px-3 pb-1 text-[8.5px] text-white/25">
            <LifeBuoy className="h-3 w-3" /> Client-side prototype · v1.0
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-50 border-b border-line bg-white/95 backdrop-blur">
          <div className="flex h-14 items-center justify-between gap-3 px-4 lg:px-6">
            <div className="flex min-w-0 items-center gap-2.5">
              <Link to="/admin" className="focus-ring flex items-center gap-2 lg:hidden">
                <LogoMark tone="green" className="h-7 w-7" />
                <span className="text-[15px] font-extrabold tracking-[-0.04em] text-ink">
                  How<span className="text-brand">Low</span>
                </span>
              </Link>
              <span className="hidden h-4 w-px bg-line lg:block" />
              <div className="hidden min-w-0 lg:block">
                <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-ink-soft">Operations console</p>
                <p className="truncate text-[13px] font-bold tracking-[-0.01em] text-ink">{activeLabel ?? 'Admin'}</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="hidden items-center gap-1.5 rounded-full border border-[#CFE3C6] bg-brand-tint px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wide text-brand-dark sm:inline-flex">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" /> Demo environment
              </span>
              <IconButton
                label="Toggle language"
                onClick={toggleLanguage}
                className="h-8 w-8 border border-line bg-white text-[10px] font-extrabold text-brand-dark hover:bg-brand-soft"
              >
                <span className="inline-flex items-center gap-1">
                  <Languages className="h-3.5 w-3.5" />
                  {language === 'en' ? 'EN' : 'አማ'}
                </span>
              </IconButton>
              <Link
                to="/"
                className="focus-ring hidden items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-1.5 text-[10.5px] font-bold text-ink-muted transition hover:border-brand/40 hover:text-brand-dark sm:inline-flex"
              >
                <ArrowUpRight className="h-3.5 w-3.5" /> Mobile app
              </Link>
              <span className="mx-0.5 hidden h-5 w-px bg-line sm:block" />
              <div className="hidden items-center gap-2 sm:flex">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-[9px] font-black text-white">SM</span>
                <div className="leading-tight">
                  <p className="text-[10.5px] font-bold text-ink">Sara M.</p>
                  <p className="text-[8.5px] text-ink-muted">Admin</p>
                </div>
              </div>
              <IconButton
                label="Sign out of admin"
                onClick={() => {
                  adminLogout()
                  showToast({ tone: 'info', title: 'Signed out', message: 'Admin session ended.' })
                }}
                className="h-8 w-8 text-ink-muted hover:bg-page hover:text-accent"
              >
                <LogOut className="h-3.5 w-3.5" />
              </IconButton>
            </div>
          </div>
          <div className="no-scrollbar flex gap-1 overflow-x-auto border-t border-line px-3 py-1.5 lg:hidden">
            {adminNav.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'focus-ring inline-flex flex-none items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[10px] font-bold transition',
                      isActive ? 'bg-brand text-white' : 'bg-page text-ink-muted',
                    )
                  }
                >
                  <Icon className="h-3 w-3" /> {item.label}
                </NavLink>
              )
            })}
          </div>
        </header>

        <DemoBanner language={language} compact className="no-print" right={<span className="hidden text-[8px] font-bold uppercase tracking-wide text-brand-dark/60 sm:block">Admin · client-side</span>} />

        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 pb-24 pt-5 lg:px-6 lg:pb-10">
          <Outlet />
        </main>

        <footer className="no-print flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-3 text-[9px] text-ink-soft lg:px-6">
          <span>How Low operations console · demo data only</span>
          <span className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" /> Idempotent payment callbacks
            </span>
            <span className="inline-flex items-center gap-1">
              <Gauge className="h-3 w-3" /> Client-side engine
            </span>
            <span className="inline-flex items-center gap-1 text-brand-dark">
              <BadgeDollarSign className="h-3 w-3" /> No official M-PESA assets
            </span>
          </span>
        </footer>
      </div>
    </div>
  )
}

import {
  Bell,
  ChevronLeft,
  Heart,
  Languages,
  LayoutGrid,
  Search,
  Share2,
  Ticket,
  Trophy,
  UserRound,
} from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useT } from '../i18n'
import { useAuction, useStore, useUnreadCount } from '../store/useStore'
import { DemoBanner, StatusBar, Wordmark } from './Brand'
import { IconButton, cn } from './ui'
import { useToast } from './Toast'
import type { Language } from '../types'

export function PhoneStage({ children }: { children: ReactNode }) {
  return (
    <div className="showcase-bg showcase-grid relative flex min-h-[100dvh] items-center justify-center overflow-hidden p-0 sm:p-5">
      <div className="pointer-events-none absolute inset-0 hidden xl:block">
        <div className="absolute left-[max(2rem,calc(50%-500px))] top-1/2 -translate-y-1/2 text-white">
          <div className="mb-4 flex items-center gap-3">
            <span className="h-px w-10 bg-brand" />
            <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-brand">Interactive prototype</span>
          </div>
          <h1 className="max-w-[300px] text-[54px] font-black leading-[0.92] tracking-[-0.06em]">
            Bid
            <br />
            small.
            <br />
            <span className="text-brand">Win big.</span>
          </h1>
          <p className="mt-6 max-w-[280px] text-[13px] leading-relaxed text-white/55">
            A lowest-unique-bid auction for mobile money. Pay a small entry fee, submit one sealed bid, and let the
            lowest unique amount win.
          </p>
          <div className="mt-8 grid max-w-[280px] grid-cols-2 gap-3">
            {[
              ['566', 'live entries'],
              ['ETB 0.07', 'winning bid'],
              ['3', 'entries / user'],
              ['7 days', 'ID window'],
            ].map(([value, label]) => (
              <div key={label} className="rounded-xl border border-white/10 bg-white/[0.045] px-3.5 py-2.5">
                <div className="text-[16px] font-extrabold tracking-tight text-white">{value}</div>
                <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/40">{label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="absolute right-[max(2rem,calc(50%-510px))] top-1/2 -translate-y-1/2">
          <div className="w-[190px] rounded-2xl border border-white/10 bg-white/[0.045] p-4 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-brand">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
              Partnership demo
            </div>
            <p className="mt-3 text-[12px] leading-relaxed text-white/55">
              Every payment, bid and refund is client-side. The auction maths is real.
            </p>
            <div className="mt-4 h-px bg-white/10" />
            <div className="mt-3 flex items-center justify-between text-[10px] text-white/40">
              <span>Mobile app</span>
              <span className="rounded-full bg-brand/20 px-2 py-0.5 font-bold text-brand">390 px</span>
            </div>
          </div>
        </div>
      </div>
      <div className="phone-shell">
        <div className="phone-notch" />
        <div className="phone-screen">{children}</div>
      </div>
    </div>
  )
}

export function UserLayout() {
  const currentUserId = useStore((state) => state.currentUserId)
  if (!currentUserId) {
    return <LoginRedirect />
  }
  return (
    <PhoneStage>
      <AppShell />
    </PhoneStage>
  )
}

function LoginRedirect() {
  const navigate = useNavigate()
  useEffect(() => {
    navigate('/login', { replace: true })
  }, [navigate])
  return null
}

export function AppShell() {
  const t = useT()
  const navigate = useNavigate()
  const location = useLocation()
  const language = useStore((state) => state.language)
  const setLanguage = useStore((state) => state.setLanguage)
  const unread = useUnreadCount()
  const { showToast } = useToast()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('howlow-favs') ?? '[]') as string[]
    } catch {
      return []
    }
  })

  const path = location.pathname
  const segments = path.split('/').filter(Boolean)
  const auctionId = segments[0] === 'auction' ? segments[1] : segments[0] === 'winner' ? segments[1] : undefined
  const auction = useAuction(auctionId)
  const isHome = path === '/'
  const isDetail = segments[0] === 'auction'
  const isWinner = segments[0] === 'winner'
  const isNotifications = segments[0] === 'notifications'
  const isResultsDetail = segments[0] === 'results' && Boolean(segments[1])
  const showNav = isHome || path === '/entries' || path === '/results' || path === '/profile' || isResultsDetail

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
  }, [path])

  const toggleLanguage = () => {
    const next: Language = language === 'en' ? 'am' : 'en'
    setLanguage(next)
  }

  const toggleFavorite = () => {
    if (!auction) return
    const next = favorites.includes(auction.id)
      ? favorites.filter((id) => id !== auction.id)
      : [...favorites, auction.id]
    setFavorites(next)
    localStorage.setItem('howlow-favs', JSON.stringify(next))
  }

  const share = async () => {
    const url = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ title: auction?.title ?? 'Bidora', text: 'Bid small. Win big.', url })
      } else {
        await navigator.clipboard.writeText(url)
        showToast({ tone: 'success', title: t('toastCopied') })
      }
    } catch {
      // User cancelled the share sheet.
    }
  }

  let title = ''
  if (path === '/entries') title = t('myEntries')
  else if (path === '/results') title = t('results')
  else if (path === '/profile') title = t('profile')
  else if (isNotifications) title = t('notifications')
  else if (isResultsDetail) title = t('results')
  else if (segments[0] === 'auction' && segments[2] === 'bid') title = t('submitSealedBid')
  else if (segments[0] === 'auction' && segments[2] === 'receipt') title = t('receipt')
  else if (isDetail) title = auction?.title ?? t('navAuctions')
  else if (isWinner) title = t('winner')

  const back = () => {
    if (window.history.length > 1) navigate(-1)
    else navigate('/')
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-page">
      <div className="flex-none bg-brand-dark">
        <StatusBar tone="green" />
        <div className="flex items-center justify-between gap-2 px-3.5 pb-2.5">
          {isHome ? (
            <>
              <Wordmark tone="light" />
              <div className="flex items-center gap-0.5 text-white">
                <IconButton label={t('search')} onClick={() => navigate('/?search=1')} className="hover:bg-white/10">
                  <Search className="h-[18px] w-[18px]" />
                </IconButton>
                <button
                  type="button"
                  aria-label={t('notifications')}
                  onClick={() => navigate('/notifications')}
                  className="focus-ring relative flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10"
                >
                  <Bell className="h-[18px] w-[18px]" />
                  {unread > 0 ? (
                    <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-brand-dark bg-accent px-0.5 text-[8px] font-bold text-white">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  ) : null}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex min-w-0 items-center gap-1">
                {!showNav || isDetail || isWinner || isNotifications || isResultsDetail ? (
                  <IconButton label={t('back')} onClick={back} className="hover:bg-white/10">
                    <ChevronLeft className="h-5 w-5" />
                  </IconButton>
                ) : null}
                <h1 className="truncate text-[15px] font-bold tracking-[-0.01em] text-white">{title}</h1>
              </div>
              <div className="flex items-center gap-0.5 text-white">
                {isDetail && segments.length === 2 ? (
                  <>
                    <IconButton label="Share" onClick={share} className="hover:bg-white/10">
                      <Share2 className="h-[17px] w-[17px]" />
                    </IconButton>
                    <IconButton
                      label="Save auction"
                      onClick={toggleFavorite}
                      className={cn('hover:bg-white/10', auction && favorites.includes(auction.id) && 'text-[#FFD7DD]')}
                    >
                      <Heart
                        className="h-[17px] w-[17px]"
                        fill={auction && favorites.includes(auction.id) ? 'currentColor' : 'none'}
                      />
                    </IconButton>
                  </>
                ) : null}
                <IconButton
                  label={t('notifications')}
                  onClick={() => navigate('/notifications')}
                  className="relative hover:bg-white/10"
                >
                  <Bell className="h-[18px] w-[18px]" />
                  {unread > 0 ? (
                    <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-brand-dark bg-accent px-0.5 text-[8px] font-bold text-white">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  ) : null}
                </IconButton>
              </div>
            </>
          )}
        </div>
      </div>

      <DemoBanner
        language={language}
        right={
          <button
            type="button"
            onClick={toggleLanguage}
            className="focus-ring flex flex-none items-center gap-1 rounded-full border border-[#CFE3C6] bg-white px-1.5 py-0.5 text-[8.5px] font-extrabold uppercase tracking-wide text-brand-dark shadow-sm"
            aria-label="Toggle language"
            title={language === 'en' ? 'አማርኛ' : 'English'}
          >
            <Languages className="h-2.5 w-2.5" />
            {language === 'en' ? 'EN' : 'አማ'}
          </button>
        }
      />

      <div ref={scrollRef} className="no-scrollbar relative flex-1 overflow-y-auto overscroll-contain">
        <div key={path} className="page-enter min-h-full">
          <Outlet />
        </div>
      </div>

      {showNav ? <BottomNav /> : null}
    </div>
  )
}

function BottomNav() {
  const t = useT()
  const items = [
    { to: '/', label: t('navAuctions'), icon: LayoutGrid, end: true },
    { to: '/entries', label: t('navEntries'), icon: Ticket },
    { to: '/results', label: t('navResults'), icon: Trophy },
    { to: '/profile', label: t('navProfile'), icon: UserRound },
  ]
  return (
    <nav className="safe-bottom z-40 flex-none border-t border-line bg-white/95 px-2 pb-1.5 pt-1.5 backdrop-blur" aria-label="Main navigation">
      <div className="grid grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'focus-ring group flex flex-col items-center gap-1 rounded-xl py-1.5 transition',
                  isActive ? 'text-brand-dark' : 'text-ink-soft hover:text-ink-muted',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span className={cn('flex h-7 w-11 items-center justify-center rounded-full transition', isActive && 'bg-brand-tint')}>
                    <Icon className="h-[19px] w-[19px]" strokeWidth={isActive ? 2.4 : 1.9} />
                  </span>
                  <span className={cn('text-[9px] font-semibold leading-none', isActive && 'font-bold')}>{item.label}</span>
                </>
              )}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}

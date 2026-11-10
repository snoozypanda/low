import { ChevronRight, Clock3, Search, Sparkles, Ticket, Trophy, Users, Wallet, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useT } from '../../i18n'
import { formatETB, formatPercent, formatPhoneDisplay } from '../../lib/format'
import { useAuctionStats, useCurrentUser, useStore } from '../../store/useStore'
import type { Auction } from '../../types'
import { Countdown } from '../../components/Countdown'
import { ProductImage } from '../../components/ProductImage'
import { Badge, EmptyState, Progress, Tabs, cn } from '../../components/ui'

export default function AuctionsList() {
  const t = useT()
  const language = useStore((state) => state.language)
  const auctions = useStore((state) => state.auctions)
  const user = useCurrentUser()
  const [searchParams, setSearchParams] = useSearchParams()
  const [tab, setTab] = useState<'live' | 'upcoming' | 'closed'>('live')
  const [searchOpen, setSearchOpen] = useState(searchParams.get('search') === '1')
  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (searchParams.get('search') === '1') {
      setSearchOpen(true)
      const timer = window.setTimeout(() => searchRef.current?.focus(), 180)
      return () => window.clearTimeout(timer)
    }
  }, [searchParams])

  const live = auctions.filter((a) => a.status === 'live')
  const upcoming = auctions.filter((a) => a.status === 'upcoming')
  const closed = auctions.filter((a) => ['closed', 'void', 'cancelled'].includes(a.status))

  const base = tab === 'live' ? live : tab === 'upcoming' ? upcoming : closed
  const normalized = query.trim().toLowerCase()
  const filtered = normalized
    ? base.filter((a) =>
        [a.title, a.titleAm, a.category, a.description].some((value) =>
          value.toLowerCase().includes(normalized),
        ),
      )
    : base

  const featured = tab === 'live' ? live[0] : undefined
  const list = featured ? filtered.filter((a) => a.id !== featured.id) : filtered

  const closeSearch = () => {
    setQuery('')
    setSearchOpen(false)
    setSearchParams({}, { replace: true })
  }

  return (
    <div className="min-h-full bg-page pb-5">
      <div className="flex items-center justify-between gap-3 px-4 pb-1 pt-3">
        <div className="min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-ink-soft">{t('welcomeBack')}</p>
          <h2 className="mt-0.5 truncate text-[20px] font-extrabold tracking-[-0.03em] text-ink">
            {t('homeGreeting', { name: user?.name?.split(' ')[0] ?? 'Selam' })}
          </h2>
        </div>
        <Link
          to="/profile"
          className="focus-ring flex flex-none items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-1.5 shadow-sm"
          aria-label={t('walletBalance')}
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-tint text-brand-dark">
            <Wallet className="h-3.5 w-3.5" />
          </span>
          <span className="text-[11px] font-extrabold text-ink amount-tabular">{formatETB(user?.walletBalance ?? 0)}</span>
        </Link>
      </div>

      {searchOpen ? (
        <div className="px-4 pb-2 pt-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('searchPlaceholder')}
              className="h-11 w-full rounded-full border border-line bg-white pl-10 pr-11 text-[13px] font-medium text-ink outline-none transition placeholder:text-ink-soft focus:border-brand focus:ring-4 focus:ring-brand/10"
              aria-label={t('searchPlaceholder')}
            />
            <button
              type="button"
              onClick={closeSearch}
              aria-label={t('close')}
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-page text-ink-muted"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          {query ? (
            <p className="mt-1.5 px-1 text-[10px] font-semibold text-ink-muted">
              {t('searchResults', { count: filtered.length })}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="px-4 pt-2.5">
        {featured ? <FeaturedAuction auction={featured} /> : null}
      </div>

      <div className="px-4 pt-4">
        <Tabs
          items={[
            { value: 'live', label: t('live'), count: live.length },
            { value: 'upcoming', label: t('upcoming'), count: upcoming.length },
            { value: 'closed', label: t('closed'), count: closed.length },
          ]}
          value={tab}
          onChange={(value) => setTab(value as 'live' | 'upcoming' | 'closed')}
        />
      </div>

      <div className="space-y-2.5 px-4 pt-3">
        {list.length ? (
          list.map((auction) => <AuctionListCard key={auction.id} auction={auction} />)
        ) : filtered.length === 0 && normalized ? (
          <EmptyState
            icon={<Search className="h-5 w-5" />}
            title={t('noSearchResults')}
            body={t('noSearchBody')}
            action={
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-[12px] font-bold text-brand-dark underline decoration-brand/30 underline-offset-4"
              >
                {t('clear')}
              </button>
            }
          />
        ) : featured && filtered.length === 1 ? (
          <div className="py-2 text-center text-[11px] font-medium text-ink-muted">
            {t('featured')} · {featured.category}
          </div>
        ) : (
          <EmptyState
            icon={<Ticket className="h-5 w-5" />}
            title={t('noAuctions')}
            body={t('noAuctionsBody')}
          />
        )}
      </div>

      <div className="mt-4 px-4">
        <div className="flex items-center gap-2 rounded-2xl border border-[#DDEBD7] bg-brand-soft px-3.5 py-3">
          <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-white text-brand-dark shadow-sm">
            <Sparkles className="h-4 w-4" />
          </span>
          <p className="text-[10.5px] leading-relaxed text-[#4A6B40]">
            <span className="font-bold text-brand-dark">{t('lowestUniqueWins')}</span>{' '}
            {language === 'am'
              ? 'ተመሳሳይ ጨረታዎች ይወገዳሉ። በትክክል አንድ ጊዜ የቀረበው ዝቅተኛ መጠን ያሸንፋል።'
              : 'Identical bids are eliminated. The lowest amount submitted exactly once wins.'}
          </p>
        </div>
      </div>
    </div>
  )
}

function FeaturedAuction({ auction }: { auction: Auction }) {
  const t = useT()
  const language = useStore((state) => state.language)
  const stats = useAuctionStats(auction.id)
  const progress = stats?.progressPct ?? 0
  const closingSoon = new Date(auction.endAt).getTime() - Date.now() < 3600_000

  return (
    <Link
      to={`/auction/${auction.id}`}
      className="focus-ring hero-card block overflow-hidden rounded-[20px] border border-[#DDEBD7] shadow-card transition active:scale-[0.995]"
    >
      <div className="flex gap-2 p-3.5 pb-3">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-1.5">
            <Badge tone="green" dot>
              {t('featured')}
            </Badge>
            {closingSoon ? <span className="text-[8.5px] font-bold uppercase tracking-wide text-accent">{t('closingSoon')}</span> : null}
          </div>
          <h3 className="mt-2.5 line-clamp-2 text-[19px] font-extrabold leading-[1.08] tracking-[-0.035em] text-ink">
            {language === 'am' ? auction.titleAm : auction.title}
          </h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-medium text-ink-muted">
            <span>
              {t('retail')} <span className="font-bold text-ink">{formatETB(auction.retailValue)}</span>
            </span>
            <span className="h-0.5 w-0.5 rounded-full bg-ink-soft" />
            <span className="text-brand-dark">
              {t('entry')} <span className="font-extrabold">{formatETB(auction.entryFee)}</span>
            </span>
          </div>

          <div className="mt-2.5 flex items-end justify-between gap-2">
            <div>
              <p className="mb-1 text-[8px] font-bold uppercase tracking-[0.16em] text-ink-soft">{t('endsIn')}</p>
              <Countdown target={auction.endAt} size="hero" />
            </div>
            <span className="mb-1 flex h-7 w-7 flex-none items-center justify-center rounded-full bg-brand text-white shadow-[0_4px_12px_rgba(67,176,42,0.35)]">
              <ChevronRight className="h-4 w-4" strokeWidth={2.6} />
            </span>
          </div>
        </div>

        <div className="relative w-[124px] flex-none">
          <ProductImage
            src={auction.image}
            alt={auction.title}
            eager
            className="h-[154px] w-full rounded-[16px]"
            imgClassName="transition duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-x-1.5 bottom-1.5 rounded-full bg-[#12251A]/90 px-2 py-1 text-center text-[8px] font-extrabold uppercase tracking-[0.06em] text-white backdrop-blur">
            {t('winToday')}
          </div>
        </div>
      </div>

      <div className="border-t border-[#E1EDDA] bg-white/55 px-3.5 py-2.5">
        <div className="flex items-center justify-between gap-2 text-[9.5px] font-semibold text-ink-muted">
          <span className="flex items-center gap-1.5">
            <Users className="h-3 w-3 text-brand-dark" />
            {t('minProgress', {
              current: (stats?.entries ?? 0).toLocaleString('en-US'),
              target: auction.minEntries.toLocaleString('en-US'),
            })}
          </span>
          <span className={cn('font-extrabold', progress >= 100 ? 'text-brand-dark' : 'text-ink')}>
            {formatPercent(progress)}
          </span>
        </div>
        <Progress value={progress} className="mt-1.5" height="h-1.5" />
        <div className="mt-1.5 flex items-center justify-between text-[8.5px] font-medium text-ink-soft">
          <span>
            {stats?.participants ?? 0} {t('participants')}
          </span>
          <span className={closingSoon ? 'font-bold text-accent' : ''}>
            {progress >= 100 ? t('minimumReached') : t('minimumProgress')}
          </span>
        </div>
      </div>
    </Link>
  )
}

function AuctionListCard({ auction }: { auction: Auction }) {
  const t = useT()
  const language = useStore((state) => state.language)
  const stats = useAuctionStats(auction.id)
  const progress = stats?.progressPct ?? 0
  const closingSoon =
    auction.status === 'live' && new Date(auction.endAt).getTime() - Date.now() < 3600_000

  const resultBadge =
    auction.status === 'closed' && auction.winningAmount !== undefined ? (
      <span className="inline-flex items-center gap-1 rounded-full bg-brand-tint px-2 py-0.5 text-[8.5px] font-bold text-brand-dark">
        <Trophy className="h-2.5 w-2.5" /> {t('winningBid')} ETB {auction.winningAmount.toFixed(2)}
      </span>
    ) : auction.status === 'void' ? (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#FDECEF] px-2 py-0.5 text-[8.5px] font-bold text-accent">
        {t('void')} · {t('refunded')}
      </span>
    ) : auction.status === 'cancelled' ? (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#FDECEF] px-2 py-0.5 text-[8.5px] font-bold text-accent">
        {t('cancelled')} · {t('refunded')}
      </span>
    ) : null

  return (
    <Link
      to={`/auction/${auction.id}`}
      className="focus-ring group flex items-center gap-3 rounded-2xl border border-line bg-white p-2.5 shadow-card transition hover:border-[#CFE3C6] active:scale-[0.995]"
    >
      <ProductImage
        src={auction.image}
        alt={auction.title}
        className="h-[72px] w-[72px] flex-none rounded-xl"
        imgClassName="transition duration-500 group-hover:scale-105"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 text-[13.5px] font-bold tracking-[-0.01em] text-ink">
            {language === 'am' ? auction.titleAm : auction.title}
          </h3>
          <ChevronRight className="mt-0.5 h-3.5 w-3.5 flex-none text-ink-soft transition group-hover:translate-x-0.5 group-hover:text-brand-dark" />
        </div>

        <div className="mt-0.5 flex items-center gap-1.5 text-[9.5px] font-medium text-ink-muted">
          <span className="font-bold text-brand-dark">{t('entry')} {formatETB(auction.entryFee)}</span>
          <span className="h-0.5 w-0.5 rounded-full bg-ink-soft" />
          <span>
            {t('retail')} {formatETB(auction.retailValue)}
          </span>
        </div>

        {auction.status === 'live' ? (
          <>
            <div className="mt-1.5 flex items-center justify-between gap-2 text-[9px] font-semibold">
              <span className="text-ink-muted">
                {(stats?.entries ?? 0).toLocaleString('en-US')} / {auction.minEntries.toLocaleString('en-US')} {t('entriesShort')}
              </span>
              <span className={closingSoon ? 'flex items-center gap-1 font-bold text-accent' : 'flex items-center gap-1 text-ink-muted'}>
                <Clock3 className="h-2.5 w-2.5" />
                <Countdown target={auction.endAt} size="tiny" muted={!closingSoon} className={closingSoon ? 'text-[9px] text-accent' : 'text-[9px]'} />
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <Progress value={progress} height="h-1" className="flex-1" />
              <span className={cn('text-[8.5px] font-bold', progress >= 100 ? 'text-brand-dark' : 'text-ink-muted')}>
                {formatPercent(progress)}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[8.5px] font-medium text-ink-soft">
              <span className="flex items-center gap-1">
                <Users className="h-2.5 w-2.5" /> {stats?.participants ?? 0} {t('participants')}
              </span>
              {closingSoon ? <span className="font-bold text-accent">{t('closingSoon')}</span> : <span>{t('live')}</span>}
            </div>
          </>
        ) : auction.status === 'upcoming' ? (
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-[9px] font-semibold text-ink-muted">
              {t('startsIn')} <Countdown target={auction.startAt} size="tiny" className="text-[9px]" />
            </span>
            <Badge tone="blue">{t('upcoming')}</Badge>
          </div>
        ) : (
          <div className="mt-1.5 flex items-center justify-between gap-2">
            {resultBadge}
            <span className="text-[8.5px] font-medium text-ink-soft">
              {auction.status === 'closed' && auction.winnerEntryId ? t('closed') : auction.status === 'closed' ? t('closed') : ''}
            </span>
          </div>
        )}
      </div>
    </Link>
  )
}

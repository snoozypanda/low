import {
  ArrowRight,
  BadgeCheck,
  ChevronRight,
  Clock3,
  Info,
  Lock,
  ShieldCheck,
  Sparkles,
  Ticket,
  Trophy,
  Users,
  Wallet,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Countdown } from '../../components/Countdown'
import { PaymentSheet } from '../../components/PaymentSheet'
import { ProductImage } from '../../components/ProductImage'
import { useToast } from '../../components/Toast'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Progress,
  StatusBadge,
  Tabs,
  cn,
} from '../../components/ui'
import { useT } from '../../i18n'
import { formatBid, formatDateTime, formatETB, formatPercent } from '../../lib/format'
import {
  useAuctionEntries,
  useAuctionStats,
  useAuction,
  useCurrentUser,
  useStore,
} from '../../store/useStore'
import type { Auction } from '../../types'

type DetailTab = 'overview' | 'how' | 'rules'

export default function AuctionDetail() {
  const { id } = useParams()
  const t = useT()
  const language = useStore((state) => state.language)
  const auction = useAuction(id)
  const stats = useAuctionStats(id)
  const user = useCurrentUser()
  const entries = useAuctionEntries(id)
  const bids = useStore((state) => state.bids)
  const payments = useStore((state) => state.payments)
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [tab, setTab] = useState<DetailTab>('overview')
  const [gallery, setGallery] = useState(0)
  const [payOpen, setPayOpen] = useState(false)

  if (!auction) {
    return (
      <div className="flex min-h-full items-center justify-center p-6">
        <EmptyState title="Auction not found" body="This auction may have been removed from the demo." />
      </div>
    )
  }

  const paymentById = new Map(payments.map((p) => [p.id, p]))
  const live = auction.status === 'live'
  const closed = ['closed', 'void', 'cancelled'].includes(auction.status)
  const myPaidEntries = entries.filter((entry) => paymentById.get(entry.paymentId)?.status === 'success')
  const unbidEntry = myPaidEntries.find((entry) => entry.status === 'active' && !entry.bidId)
  const limitReached = myPaidEntries.length >= auction.maxEntriesPerUser
  const progress = stats?.progressPct ?? 0
  const mine = entries.filter((e) => e.bidId)

  return (
    <div className="min-h-full bg-page pb-2">
      <Gallery auction={auction} index={gallery} onSelect={setGallery} />

      <div className="relative -mt-5 rounded-t-[26px] bg-page px-4 pb-3 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <StatusBadge status={auction.status} />
              <Badge tone="grey">{auction.category}</Badge>
              {live ? (
                <span className="inline-flex items-center gap-1 text-[8.5px] font-bold uppercase tracking-wide text-accent">
                  <Clock3 className="h-2.5 w-2.5" /> {t('closingSoon')}
                </span>
              ) : null}
            </div>
            <h1 className="mt-2 text-[22px] font-extrabold leading-[1.08] tracking-[-0.04em] text-ink">
              {language === 'am' ? auction.titleAm : auction.title}
            </h1>
          </div>
          <div className="flex-none text-right">
            <p className="text-[8px] font-bold uppercase tracking-[0.13em] text-ink-soft">{t('retail')}</p>
            <p className="text-[14px] font-extrabold text-ink amount-tabular">{formatETB(auction.retailValue)}</p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <Metric
            label={t('entries')}
            value={`${(stats?.entries ?? 0).toLocaleString('en-US')}`}
            sub={`/ ${auction.minEntries.toLocaleString('en-US')}`}
          />
          <Metric label={t('participants')} value={`${stats?.participants ?? 0}`} sub={t('bidders')} />
          <Metric label={t('entry')} value={formatETB(auction.entryFee)} sub={t('perEntry')} accent />
        </div>

        <Card className="mt-2.5 overflow-hidden border-[#DDEBD7]">
          <div className="flex items-center justify-between gap-2 px-3.5 pt-3">
            <div>
              <p className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-ink-soft">
                {live ? t('endsIn') : closed ? t('ended') : t('startsIn')}
              </p>
              <div className="mt-1">
                <Countdown target={live ? auction.endAt : closed ? auction.closedAt ?? auction.endAt : auction.startAt} size="hero" />
              </div>
            </div>
            <div className="flex h-11 w-11 flex-none items-center justify-center rounded-2xl bg-brand-tint text-brand-dark">
              {closed ? <Trophy className="h-5 w-5" /> : <Clock3 className="h-5 w-5" />}
            </div>
          </div>
          <div className="px-3.5 pb-3 pt-3">
            <div className="flex items-center justify-between gap-2 text-[10px] font-semibold text-ink-muted">
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
            <div className="mt-1.5 flex items-center justify-between text-[9px] font-medium text-ink-soft">
              <span>{progress >= 100 ? t('minimumReached') : t('minimumProgress')}</span>
              <span className="flex items-center gap-1">
                <Lock className="h-2.5 w-2.5" /> {t('bidsSealed')}
              </span>
            </div>
          </div>
        </Card>

        {closed ? <ResultBanner auction={auction} /> : null}

        {!closed && mine.length ? (
          <Card className="mt-2.5 p-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-ink-soft">{t('yourEntries')}</p>
              <Link to="/entries" className="text-[10px] font-bold text-brand-dark">
                {t('viewAll')}
              </Link>
            </div>
            <div className="mt-2 space-y-1.5">
              {mine.map((entry) => {
                const bid = bids.find((b) => b.id === entry.bidId)
                return (
                  <div key={entry.id} className="flex items-center justify-between gap-2 rounded-xl bg-page px-2.5 py-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white text-brand-dark shadow-sm">
                        <Ticket className="h-3 w-3" />
                      </span>
                      <div>
                        <p className="text-[10.5px] font-bold text-ink">
                          #{entry.id.slice(-5).toUpperCase()} · ETB {formatBid(bid?.amount ?? 0)}
                        </p>
                        <p className="text-[9px] font-medium text-ink-soft">{formatDateTime(entry.createdAt, language)}</p>
                      </div>
                    </div>
                    <StatusBadge status={entry.status} />
                  </div>
                )
              })}
            </div>
            <p className="mt-1.5 text-[9.5px] leading-relaxed text-ink-soft">{t('sealedBidNote')}</p>
          </Card>
        ) : null}

        <div className="mt-3">
          <Tabs
            variant="underline"
            value={tab}
            onChange={(value) => setTab(value as DetailTab)}
            items={[
              { value: 'overview', label: t('aboutProduct') },
              { value: 'how', label: t('howItWorks') },
              { value: 'rules', label: t('rules') },
            ]}
          />
        </div>

        {tab === 'overview' ? (
          <div className="mt-3 space-y-2.5">
            <Card className="p-3.5">
              <p className="text-[12px] leading-relaxed text-ink-muted">
                {language === 'am' ? auction.descriptionAm : auction.description}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Spec label={t('bidRange')} value={`ETB ${auction.bidMin.toFixed(2)} – ${auction.bidMax.toFixed(2)}`} />
                <Spec label={t('step')} value={`ETB ${auction.bidStep.toFixed(2)}`} />
                <Spec label={t('maxEntries')} value={`${auction.maxEntriesPerUser} / user`} />
                <Spec label={t('minEntries')} value={auction.minEntries.toLocaleString('en-US')} />
              </div>
            </Card>

            <div className="grid grid-cols-3 gap-2">
              <Feature icon={<Ticket className="h-4 w-4" />} text={t('oneEntryPerBid')} />
              <Feature icon={<BadgeCheck className="h-4 w-4" />} text={t('verifiedWinner')} />
              <Feature icon={<Wallet className="h-4 w-4" />} text={t('refundNotice')} />
            </div>

            <Card className="border-[#DDEBD7] bg-brand-soft p-3.5">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-brand-dark shadow-sm">
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
                <p className="text-[12px] font-bold text-brand-dark">{t('example')}</p>
              </div>
              <p className="mt-1.5 text-[10.5px] leading-relaxed text-[#4A6B40]">{t('exampleText')}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {[0.05, 0.05, 0.07, 0.09, 0.09, 0.12].map((amount, index) => (
                  <span
                    key={`${amount}-${index}`}
                    className={cn(
                      'rounded-full border px-2 py-0.5 text-[9px] font-bold',
                      amount === 0.07
                        ? 'border-brand bg-brand text-white'
                        : 'border-[#CFE3C6] bg-white text-brand-dark/70 line-through decoration-[#B7D4AB]',
                    )}
                  >
                    {['A', 'B', 'C', 'D', 'E', 'F'][index]} · {amount.toFixed(2)}
                  </span>
                ))}
              </div>
            </Card>
          </div>
        ) : tab === 'how' ? (
          <div className="mt-3 space-y-2">
            {[
              [t('step1Title'), t('step1Body')],
              [t('step2Title'), t('step2Body')],
              [t('step3Title'), t('step3Body')],
            ].map(([title, body], index) => (
              <div key={title} className="flex gap-3 rounded-2xl border border-line bg-white p-3 shadow-card">
                <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-brand-tint text-[11px] font-extrabold text-brand-dark">
                  {index + 1}
                </span>
                <div>
                  <p className="text-[12px] font-bold text-ink">{title}</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-ink-muted">{body}</p>
                </div>
              </div>
            ))}
            <Card className="bg-ink p-3.5 text-white">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-brand" />
                <p className="text-[11px] font-bold">{t('example')}</p>
              </div>
              <p className="mt-1.5 text-[10.5px] leading-relaxed text-white/70">{t('exampleText')}</p>
            </Card>
          </div>
        ) : (
          <Card className="mt-3 p-3.5">
            <ol className="space-y-2.5">
              {[t('rule1'), t('rule2'), t('rule3'), t('rule4'), t('rule5'), t('rule6')].map((rule, index) => (
                <li key={rule} className="flex gap-2.5">
                  <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-page text-[9px] font-extrabold text-ink-muted">
                    {index + 1}
                  </span>
                  <p className="text-[11px] leading-relaxed text-ink-muted">{rule}</p>
                </li>
              ))}
            </ol>
            <div className="mt-3 border-t border-line pt-2.5 text-[10px] leading-relaxed text-ink-soft">
              {t('auctionWindow')}: {formatDateTime(auction.startAt, language)} → {formatDateTime(auction.endAt, language)}
            </div>
          </Card>
        )}
      </div>

      <div className="sticky bottom-0 z-30 border-t border-line bg-white/95 px-4 py-2.5 backdrop-blur">
        {auction.status === 'live' ? (
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[8.5px] font-bold uppercase tracking-[0.13em] text-ink-soft">{t('entryFee')}</p>
              <p className="text-[16px] font-extrabold leading-tight text-ink amount-tabular">{formatETB(auction.entryFee)}</p>
            </div>
            {unbidEntry ? (
              <Button
                size="lg"
                className="flex-1"
                rightIcon={<ArrowRight className="h-4 w-4" />}
                onClick={() => navigate(`/auction/${auction.id}/bid?entry=${unbidEntry.id}`)}
              >
                {t('submitYourBid')}
              </Button>
            ) : limitReached ? (
              <Button size="lg" className="flex-1" disabled>
                {t('entryLimitReached')}
              </Button>
            ) : (
              <div className="flex flex-1 gap-1.5">
                <Button
                  size="lg"
                  className="flex-1"
                  leftIcon={<Wallet className="h-4 w-4" />}
                  onClick={() => setPayOpen(true)}
                >
                  {t('payEntryFee')}
                </Button>
              </div>
            )}
          </div>
        ) : auction.status === 'upcoming' ? (
          <Button size="lg" full disabled leftIcon={<Clock3 className="h-4 w-4" />}>
            {t('startsIn')} · {formatDateTime(auction.startAt, language)}
          </Button>
        ) : (
          <Button
            size="lg"
            full
            variant={auction.status === 'closed' && auction.winnerEntryId ? 'dark' : 'secondary'}
            rightIcon={<ChevronRight className="h-4 w-4" />}
            onClick={() => navigate(`/results/${auction.id}`)}
          >
            {auction.status === 'closed' && auction.winnerEntryId ? t('viewResults') : t('viewDetails')}
          </Button>
        )}
      </div>

      <PaymentSheet
        open={payOpen}
        auction={auction}
        onClose={() => setPayOpen(false)}
        onSuccess={(entry) => {
          setPayOpen(false)
          showToast({ tone: 'success', title: t('toastPaymentSuccess') })
          navigate(`/auction/${auction.id}/bid?entry=${entry.id}`)
        }}
      />
    </div>
  )
}

function Gallery({ auction, index, onSelect }: { auction: Auction; index: number; onSelect: (index: number) => void }) {
  const language = useStore((state) => state.language)
  return (
    <div className="relative bg-[#10241A]">
      <div className="relative h-[252px] w-full">
        <ProductImage src={auction.gallery[index] ?? auction.image} alt={language === 'am' ? auction.titleAm : auction.title} eager className="h-full w-full" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0B1A10]/55 via-transparent to-[#0B1A10]/25" />
        <div className="absolute left-4 top-3 flex items-center gap-1.5">
          <span className="rounded-full bg-white/90 px-2 py-1 text-[8px] font-extrabold uppercase tracking-[0.12em] text-ink backdrop-blur">
            {auction.category}
          </span>
        </div>
        <div className="absolute bottom-7 left-4 flex gap-1.5">
          {auction.gallery.map((image, i) => (
            <button
              key={`${image}-${i}`}
              type="button"
              onClick={() => onSelect(i)}
              aria-label={`View image ${i + 1}`}
              className={cn(
                'h-7 w-7 overflow-hidden rounded-lg border-2 transition',
                i === index ? 'border-white' : 'border-white/30 opacity-70',
              )}
            >
              <ProductImage src={image} alt="" className="h-full w-full" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function Metric({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string
  sub: string
  accent?: boolean
}) {
  return (
    <div className={cn('rounded-xl border px-2.5 py-2', accent ? 'border-[#CFE3C6] bg-brand-tint' : 'border-line bg-white')}>
      <p className="text-[8px] font-bold uppercase tracking-[0.11em] text-ink-soft">{label}</p>
      <p className={cn('mt-0.5 truncate text-[13px] font-extrabold leading-tight', accent ? 'text-brand-dark' : 'text-ink')}>
        {value}
      </p>
      <p className="text-[8px] font-medium text-ink-soft">{sub}</p>
    </div>
  )
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-page px-2.5 py-2">
      <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-ink-soft">{label}</p>
      <p className="mt-0.5 text-[11px] font-bold text-ink">{value}</p>
    </div>
  )
}

function Feature({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-xl border border-line bg-white px-2 py-2.5 text-center">
      <span className="text-brand-dark">{icon}</span>
      <span className="text-[8px] font-semibold leading-tight text-ink-muted">{text}</span>
    </div>
  )
}

function ResultBanner({ auction }: { auction: Auction }) {
  const t = useT()
  const language = useStore((state) => state.language)
  const won = auction.status === 'closed' && auction.winningAmount !== undefined
  const tone = won ? 'border-[#CFE3C6] bg-brand-tint' : 'border-[#F4CDD4] bg-[#FDECEF]'
  return (
    <div className={cn('mt-2.5 rounded-2xl border p-3.5', tone)}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className={cn('text-[9px] font-extrabold uppercase tracking-[0.14em]', won ? 'text-brand-dark' : 'text-accent')}>
            {won ? t('resultWinner') : auction.status === 'void' ? t('resultVoid') : t('resultCancelled')}
          </p>
          <p className={cn('mt-0.5 text-[22px] font-extrabold tracking-[-0.04em]', won ? 'text-ink' : 'text-[#A50020]')}>
            {won ? `ETB ${auction.winningAmount?.toFixed(2)}` : auction.status === 'void' ? t('noWinner') : t('cancelled')}
          </p>
        </div>
        <div className={cn('flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm', won ? 'text-brand-dark' : 'text-accent')}>
          {won ? <Trophy className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
        </div>
      </div>
      <p className="mt-1 text-[10px] leading-relaxed text-ink-muted">
        {won ? t('publicResults') : auction.status === 'void' ? t('voidNoUnique') : t('cancelledMin')}
      </p>
      <div className="mt-2 flex items-center justify-between text-[9px] font-medium text-ink-soft">
        <span>{formatDateTime(auction.closedAt ?? auction.endAt, language)}</span>
        <span>{language === 'am' ? auction.titleAm : auction.title}</span>
      </div>
    </div>
  )
}

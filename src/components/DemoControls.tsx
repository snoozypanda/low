import {
  ArrowRight,
  Ban,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Gauge,
  Monitor,
  Play,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Users,
  Wallet,
  X,
  Zap,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useToast } from './Toast'
import { StatusBadge, cn } from './ui'
import { formatETB } from '../lib/format'
import { useAuctionStats, useCurrentUser, useStore } from '../store/useStore'
import type { Auction } from '../types'

type ConfirmAction = 'reset' | 'cancel' | null

const outcomes: Array<{
  key: 'success' | 'failed' | 'cancelled' | 'timeout' | 'reversed'
  label: string
  icon: typeof CheckCircle2
  tone: string
}> = [
  { key: 'success', label: 'Success', icon: CheckCircle2, tone: 'border-[#CFE7C5] bg-brand-tint text-brand-dark' },
  { key: 'failed', label: 'Failed', icon: Ban, tone: 'border-[#F4CDD4] bg-[#FDECEF] text-[#A50020]' },
  { key: 'cancelled', label: 'Cancelled', icon: X, tone: 'border-line bg-white text-ink-muted' },
  { key: 'timeout', label: 'Timeout', icon: Clock3, tone: 'border-[#F2DFB8] bg-[#FFF7E8] text-[#8A5200]' },
  { key: 'reversed', label: 'Reverse', icon: RotateCcw, tone: 'border-[#E3D7F8] bg-[#F7F2FF] text-[#6236B4]' },
]

export function DemoControls() {
  const [open, setOpen] = useState(false)
  const [selectedId, setSelectedId] = useState('tv')
  const [confirm, setConfirm] = useState<ConfirmAction>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const { showToast } = useToast()
  const user = useCurrentUser()

  const auctions = useStore((state) => state.auctions)
  const generateBotEntries = useStore((state) => state.generateBotEntries)
  const reachMinimum = useStore((state) => state.reachMinimum)
  const fastForwardAuction = useStore((state) => state.fastForwardAuction)
  const cancelAuction = useStore((state) => state.cancelAuction)
  const triggerPaymentOutcome = useStore((state) => state.triggerPaymentOutcome)
  const startGuidedDemo = useStore((state) => state.startGuidedDemo)
  const resetDemo = useStore((state) => state.resetDemo)
  const guidedActive = useStore((state) => state.guided.active)

  const stats = useAuctionStats(selectedId)
  const selected = auctions.find((auction) => auction.id === selectedId) ?? auctions[0]

  useEffect(() => {
    const match = location.pathname.match(/^\/(?:auction|results|winner)\/([^/]+)/)
    if (match && auctions.some((auction) => auction.id === match[1])) {
      setSelectedId(match[1])
    }
  }, [location.pathname, auctions])

  const sortedAuctions = useMemo(() => {
    const rank: Record<Auction['status'], number> = {
      live: 0,
      upcoming: 1,
      closed: 2,
      void: 3,
      cancelled: 4,
    }
    return [...auctions].sort((a, b) => rank[a.status] - rank[b.status] || a.title.localeCompare(b.title))
  }, [auctions])

  const needed = selected ? Math.max(0, selected.minEntries - (stats?.entries ?? 0)) : 0
  const isOpen = selected ? selected.status === 'live' || selected.status === 'upcoming' : false

  const announce = (ok: boolean, title: string, message?: string, tone?: 'success' | 'error' | 'warning' | 'info') => {
    showToast({ tone: tone ?? (ok ? 'success' : 'error'), title, message })
  }

  const simulatePayment = (outcome: (typeof outcomes)[number]['key']) => {
    if (!selected) return
    const result = triggerPaymentOutcome(selected.id, outcome)
    if (!result.ok) {
      announce(false, 'Payment could not be simulated', result.error)
      return
    }
    if (outcome === 'success') {
      announce(true, 'Payment confirmed', 'A paid entry was created for the signed-in demo user.')
    } else if (outcome === 'reversed') {
      announce(true, 'Payment reversed', 'Linked bids are invalidated and a refund is queued.', 'warning')
    } else {
      announce(true, `Payment ${outcome}`, 'No entry was created and no money moved.', 'warning')
    }
  }

  const addBots = (count: number) => {
    if (!selected) return
    const result = generateBotEntries(selected.id, count)
    if (!result.ok) {
      announce(false, 'Could not add participants', result.error)
      return
    }
    announce(true, `${result.created} simulated entrants added`, 'Each bot pays the entry fee and locks a sealed bid.')
  }

  const fillToMinimum = () => {
    if (!selected) return
    const result = reachMinimum(selected.id)
    if (!result.ok) {
      announce(false, 'Could not reach the minimum', result.error)
      return
    }
    announce(
      true,
      result.created ? `${result.created} entrants added` : 'Minimum already reached',
      result.created
        ? `${selected.title} now meets its ${selected.minEntries.toLocaleString('en-US')} entry minimum.`
        : 'No bots were needed.',
    )
  }

  const closeNow = () => {
    if (!selected) return
    const result = fastForwardAuction(selected.id)
    if (!result.ok) {
      announce(false, 'Could not close auction', result.error)
      return
    }
    const message =
      result.outcome === 'winner'
        ? `Winning unique bid: ETB ${result.winningAmount?.toFixed(2)}.`
        : result.outcome === 'void'
          ? 'No unique bid existed, so the auction was voided and refunds were queued.'
          : 'The minimum was not reached, so the auction was cancelled and refunds were queued.'
    announce(
      true,
      result.outcome === 'winner' ? 'Winner declared' : result.outcome === 'void' ? 'Auction void' : 'Auction cancelled',
      message,
      result.outcome === 'winner' ? 'success' : 'warning',
    )
  }

  const cancelNow = () => {
    if (!selected) return
    const result = cancelAuction(selected.id)
    setConfirm(null)
    if (!result.ok) {
      announce(false, 'Could not cancel auction', result.error)
      return
    }
    announce(true, 'Auction cancelled', 'Every paid entry fee has been queued for refund.', 'warning')
  }

  const doReset = () => {
    resetDemo()
    setConfirm(null)
    setSelectedId('tv')
    setOpen(false)
    navigate('/')
    showToast({
      tone: 'success',
      title: 'Demo reset',
      message: 'Seed auctions, payments, bids and notifications were restored.',
    })
  }

  const startGuided = () => {
    startGuidedDemo()
    setOpen(false)
    navigate('/auction/tv')
    showToast({
      tone: 'info',
      title: 'Guided demo started',
      message: 'Follow the eight-step story from payment to admin reconciliation.',
    })
  }

  return (
    <>
      {open ? (
        <div className="no-print fixed inset-x-3 bottom-20 z-[210] sm:inset-x-auto sm:right-4 sm:w-[368px]">
          <div className="max-h-[calc(100dvh-7rem)] overflow-y-auto rounded-2xl border border-white/10 bg-ink text-white shadow-float thin-scroll">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-white/10 bg-ink/95 px-4 py-3 backdrop-blur">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/20 text-brand">
                  <SlidersHorizontal className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[12px] font-extrabold tracking-[-0.01em]">Demo controls</p>
                  <p className="text-[9px] text-white/45">Client-side auction simulator</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="focus-ring flex h-8 w-8 items-center justify-center rounded-full text-white/55 hover:bg-white/10 hover:text-white"
                aria-label="Close demo controls"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 px-4 py-3">
              <div>
                <label htmlFor="demo-auction" className="text-[8.5px] font-extrabold uppercase tracking-[0.16em] text-white/40">
                  Auction
                </label>
                <div className="relative mt-1.5">
                  <select
                    id="demo-auction"
                    value={selectedId}
                    onChange={(event) => setSelectedId(event.target.value)}
                    className="h-10 w-full appearance-none rounded-xl border border-white/15 bg-white/[0.07] px-3 pr-8 text-[11.5px] font-bold text-white outline-none focus:border-brand"
                  >
                    {sortedAuctions.map((auction) => (
                      <option key={auction.id} value={auction.id} className="bg-ink text-white">
                        {auction.title} · {auction.status}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/50" />
                </div>

                {selected ? (
                  <div className="mt-2 rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <StatusBadge status={selected.status} />
                      <span className="text-[9px] text-white/40">{formatETB(selected.entryFee)} / entry</span>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-1 text-center">
                      <Metric label="Entries" value={`${(stats?.entries ?? 0).toLocaleString('en-US')}`} />
                      <Metric label="Bids" value={`${(stats?.bids ?? 0).toLocaleString('en-US')}`} />
                      <Metric label="Unique" value={`${stats?.uniqueBidCount ?? 0}`} />
                    </div>
                    <p className="mt-1.5 flex items-center gap-1 text-[9px] text-white/45">
                      <Gauge className="h-2.5 w-2.5" />
                      {needed
                        ? `${needed.toLocaleString('en-US')} entries needed to meet the ${selected.minEntries.toLocaleString('en-US')} minimum`
                        : 'Entry minimum reached'}
                      {selected.winningAmount !== undefined ? ` · Winner ETB ${selected.winningAmount.toFixed(2)}` : ''}
                    </p>
                  </div>
                ) : null}
              </div>

              <Section title="Participants" icon={<Users className="h-3 w-3" />}>
                <div className="grid grid-cols-3 gap-1.5">
                  <TinyButton onClick={() => addBots(25)} disabled={!isOpen}>+25 bots</TinyButton>
                  <TinyButton onClick={() => addBots(100)} disabled={!isOpen}>+100 bots</TinyButton>
                  <TinyButton onClick={fillToMinimum} disabled={!isOpen || needed === 0} tone="green">
                    Reach min
                  </TinyButton>
                </div>
                <p className="mt-1.5 text-[8.5px] leading-relaxed text-white/35">
                  Live bots bid at 0.05, 0.09 or at least 0.13, keeping the guided 0.07 bid unique.
                </p>
              </Section>

              <Section title="Payment simulator" icon={<Wallet className="h-3 w-3" />}>
                <div className="grid grid-cols-5 gap-1">
                  {outcomes.map((outcome) => {
                    const Icon = outcome.icon
                    return (
                      <button
                        key={outcome.key}
                        type="button"
                        disabled={!isOpen}
                        onClick={() => simulatePayment(outcome.key)}
                        className={cn(
                          'focus-ring flex h-11 flex-col items-center justify-center gap-0.5 rounded-lg border text-[7.5px] font-extrabold uppercase tracking-wide transition hover:brightness-[0.98] disabled:cursor-not-allowed disabled:opacity-35',
                          outcome.tone,
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {outcome.label}
                      </button>
                    )
                  })}
                </div>
                <p className="mt-1.5 text-[8.5px] leading-relaxed text-white/35">
                  Success creates an entry for {user?.name ?? 'the demo user'}. Reverse invalidates its bid and queues a refund.
                </p>
              </Section>

              <Section title="Clock & outcome" icon={<Zap className="h-3 w-3" />}>
                <div className="grid grid-cols-2 gap-1.5">
                  <TinyButton onClick={closeNow} disabled={!isOpen} tone="amber">
                    <Clock3 className="h-3 w-3" /> Fast-forward close
                  </TinyButton>
                  <TinyButton onClick={() => setConfirm('cancel')} disabled={!isOpen} tone="red">
                    <Ban className="h-3 w-3" /> Cancel auction
                  </TinyButton>
                </div>
                {selected && isOpen && needed > 0 ? (
                  <p className="mt-1.5 rounded-lg bg-[#FFF7E8] px-2 py-1.5 text-[8.5px] font-semibold leading-relaxed text-[#8A5200]">
                    Closing below the minimum cancels the auction and refunds every entry. Use “Reach min” first for a winner.
                  </p>
                ) : null}
              </Section>

              <Section title="Walkthrough" icon={<Sparkles className="h-3 w-3" />}>
                <button
                  type="button"
                  onClick={startGuided}
                  className="focus-ring flex w-full items-center justify-between gap-2 rounded-xl border border-brand/40 bg-brand/15 px-3 py-2.5 text-left transition hover:bg-brand/20"
                >
                  <span>
                    <span className="block text-[11px] font-extrabold text-white">
                      {guidedActive ? 'Restart guided demo' : 'Start guided demo'}
                    </span>
                    <span className="mt-0.5 block text-[8.5px] text-white/45">
                      Pay → bid 0.07 → close → claim → reconcile
                    </span>
                  </span>
                  <Play className="h-4 w-4 flex-none text-brand" />
                </button>
              </Section>

              {confirm === 'reset' ? (
                <ConfirmInline
                  title="Reset all demo data?"
                  body="This restores the seed auctions, users, payments, bids and notifications."
                  confirmLabel="Reset demo"
                  onCancel={() => setConfirm(null)}
                  onConfirm={doReset}
                  danger
                />
              ) : confirm === 'cancel' ? (
                <ConfirmInline
                  title={`Cancel ${selected?.title ?? 'auction'}?`}
                  body="Every paid entry fee is queued for refund and the result becomes CANCELLED."
                  confirmLabel="Cancel auction"
                  onCancel={() => setConfirm(null)}
                  onConfirm={cancelNow}
                  danger
                />
              ) : null}

              <div className="flex items-center justify-between gap-1.5 border-t border-white/10 pt-3">
                <div className="flex gap-1.5">
                  <NavChip onClick={() => navigate('/')}>
                    <Monitor className="h-3 w-3" /> Mobile app
                  </NavChip>
                  <NavChip onClick={() => navigate('/admin')}>
                    <ArrowRight className="h-3 w-3" /> Admin
                  </NavChip>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirm('reset')}
                  className="focus-ring inline-flex items-center gap-1 rounded-full px-2 py-1 text-[8.5px] font-bold text-white/40 transition hover:bg-white/10 hover:text-white"
                >
                  <RotateCcw className="h-2.5 w-2.5" /> Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'no-print focus-ring fixed bottom-4 right-4 z-[210] flex h-12 items-center gap-2 rounded-full border border-white/15 bg-ink px-4 text-[11px] font-extrabold text-white shadow-float transition hover:bg-[#0d1720] active:scale-95',
          open && 'bg-brand-dark hover:bg-brand-dark',
        )}
        aria-expanded={open}
        aria-label="Toggle demo controls"
      >
        {open ? <X className="h-4 w-4" /> : <SlidersHorizontal className="h-4 w-4 text-brand" />}
        Demo
        {guidedActive ? <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" /> : null}
      </button>
    </>
  )
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 flex items-center gap-1 text-[8.5px] font-extrabold uppercase tracking-[0.16em] text-white/40">
        <span className="text-brand">{icon}</span>
        {title}
      </p>
      {children}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/[0.055] px-1 py-1">
      <p className="text-[11px] font-extrabold leading-none text-white">{value}</p>
      <p className="mt-0.5 text-[7px] font-bold uppercase tracking-[0.1em] text-white/35">{label}</p>
    </div>
  )
}

function TinyButton({
  children,
  onClick,
  disabled,
  tone = 'default',
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  tone?: 'default' | 'green' | 'amber' | 'red'
}) {
  const tones = {
    default: 'border-white/15 bg-white/[0.07] text-white/80 hover:bg-white/[0.12]',
    green: 'border-brand/40 bg-brand/15 text-brand hover:bg-brand/25',
    amber: 'border-[#F2DFB8]/30 bg-[#FFF7E8]/10 text-[#F2C879] hover:bg-[#FFF7E8]/15',
    red: 'border-[#F4CDD4]/30 bg-[#FDECEF]/10 text-[#FF9DB0] hover:bg-[#FDECEF]/15',
  }[tone]
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'focus-ring inline-flex h-8 items-center justify-center gap-1 rounded-lg border px-1.5 text-[8.5px] font-extrabold transition disabled:cursor-not-allowed disabled:opacity-35',
        tones,
      )}
    >
      {children}
    </button>
  )
}

function NavChip({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="focus-ring inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/[0.07] px-2.5 py-1 text-[8.5px] font-bold text-white/65 transition hover:bg-white/[0.12] hover:text-white"
    >
      {children}
    </button>
  )
}

function ConfirmInline({
  title,
  body,
  confirmLabel,
  onCancel,
  onConfirm,
  danger,
}: {
  title: string
  body: string
  confirmLabel: string
  onCancel: () => void
  onConfirm: () => void
  danger?: boolean
}) {
  return (
    <div className={cn('rounded-xl border p-3', danger ? 'border-accent/40 bg-accent/10' : 'border-white/15 bg-white/[0.06]')}>
      <p className="text-[11px] font-extrabold text-white">{title}</p>
      <p className="mt-1 text-[9px] leading-relaxed text-white/55">{body}</p>
      <div className="mt-2 flex gap-1.5">
        <button
          type="button"
          onClick={onCancel}
          className="focus-ring h-8 flex-1 rounded-lg border border-white/15 bg-white/[0.07] text-[9px] font-bold text-white/70 hover:bg-white/[0.12]"
        >
          Keep it
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={cn(
            'focus-ring h-8 flex-1 rounded-lg text-[9px] font-extrabold text-white',
            danger ? 'bg-accent hover:bg-[#c00024]' : 'bg-brand-dark hover:bg-brand',
          )}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  )
}

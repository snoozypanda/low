import {
  ArrowRight,
  BadgeCheck,
  Check,
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  Gavel,
  Lock,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from './Toast'
import { Progress, cn } from './ui'
import { formatETB } from '../lib/format'
import { useCurrentUser, useStore } from '../store/useStore'

const TOTAL_STEPS = 8

interface StepCopy {
  eyebrow: string
  title: string
  body: string
  cta: string
  icon: typeof Sparkles
  hint?: string
}

export function GuidedCoach() {
  const guided = useStore((state) => state.guided)
  const auctions = useStore((state) => state.auctions)
  const entries = useStore((state) => state.entries)
  const payments = useStore((state) => state.payments)
  const bids = useStore((state) => state.bids)
  const winners = useStore((state) => state.winners)
  const currentUserId = useStore((state) => state.currentUserId)
  const setGuidedStep = useStore((state) => state.setGuidedStep)
  const endGuidedDemo = useStore((state) => state.endGuidedDemo)
  const initiatePayment = useStore((state) => state.initiatePayment)
  const resolvePayment = useStore((state) => state.resolvePayment)
  const submitBid = useStore((state) => state.submitBid)
  const reachMinimum = useStore((state) => state.reachMinimum)
  const fastForwardAuction = useStore((state) => state.fastForwardAuction)
  const verifyWinnerIdentity = useStore((state) => state.verifyWinnerIdentity)
  const setWinnerFulfilmentMethod = useStore((state) => state.setWinnerFulfilmentMethod)
  const processRefunds = useStore((state) => state.processRefunds)
  const resetDemo = useStore((state) => state.resetDemo)
  const showToast = useToast().showToast
  const navigate = useNavigate()
  const user = useCurrentUser()
  const [collapsed, setCollapsed] = useState(false)

  const step = guided.step
  const tv = auctions.find((auction) => auction.id === 'tv')
  const winner = winners.find((record) => record.auctionId === 'tv')

  const paymentById = new Map(payments.map((payment) => [payment.id, payment]))
  const myTvEntries = entries.filter(
    (entry) =>
      entry.auctionId === 'tv' &&
      entry.userId === currentUserId &&
      paymentById.get(entry.paymentId)?.status === 'success',
  )
  const unbidEntry = myTvEntries.find((entry) => entry.status === 'active' && !entry.bidId)
  const bidEntry = myTvEntries.find((entry) => entry.bidId)
  const lockedBid = bidEntry ? bids.find((bid) => bid.id === bidEntry.bidId) : undefined
  const paidEntries = tv
    ? entries.filter((entry) => {
        if (entry.auctionId !== 'tv') return false
        const payment = paymentById.get(entry.paymentId)
        return payment?.status === 'success' && !['invalidated', 'refunded', 'void', 'cancelled'].includes(entry.status)
      }).length
    : 0

  if (!guided.active) return null

  const go = (nextStep: number) => setGuidedStep(nextStep)

  const alreadyPaid = () => {
    if (!unbidEntry) return false
    showToast({
      tone: 'info',
      title: 'Entry already paid',
      message: 'Skipping ahead to the sealed-bid step.',
    })
    go(2)
    navigate('/auction/tv')
    return true
  }

  const payEntry = () => {
    if (alreadyPaid()) return
    const intent = initiatePayment('tv')
    if (!intent.ok || !intent.payment) {
      showToast({ tone: 'error', title: 'Payment could not start', message: intent.error })
      return
    }
    const resolved = resolvePayment(intent.payment.id, 'success')
    if (!resolved.ok || !resolved.entry) {
      showToast({ tone: 'error', title: 'Entry not created', message: resolved.error })
      return
    }
    go(2)
    showToast({
      tone: 'success',
      title: `Entry paid · ${formatETB(intent.payment.amount)}`,
      message: `Entry ${resolved.entry.id.slice(-5).toUpperCase()} is active. One sealed bid is now unlocked.`,
    })
    navigate('/auction/tv')
  }

  const lockBid = () => {
    if (lockedBid) {
      showToast({ tone: 'info', title: 'Bid already locked', message: 'Opening the sealed receipt.' })
      go(3)
      navigate(`/auction/tv/receipt/${lockedBid.id}`)
      return
    }
    if (!unbidEntry) {
      showToast({
        tone: 'warning',
        title: 'No paid entry available',
        message: 'Use the payment step first, or reset the guided demo.',
      })
      go(1)
      return
    }
    const result = submitBid(unbidEntry.id, 0.07)
    if (!result.ok || !result.bid) {
      showToast({ tone: 'error', title: 'Bid not accepted', message: result.error })
      return
    }
    go(3)
    showToast({
      tone: 'success',
      title: 'Sealed bid locked at ETB 0.07',
      message: 'A SHA-256 receipt is now available for verification.',
    })
    navigate(`/auction/tv/receipt/${result.bid.id}`)
  }

  const closeAuction = () => {
    if (tv) {
      const isOpen = tv.status === 'live' || tv.status === 'upcoming'
      if (isOpen) {
        const filled = reachMinimum('tv')
        const result = fastForwardAuction('tv')
        if (!result.ok) {
          showToast({ tone: 'error', title: 'Could not close the auction', message: result.error })
          return
        }
        showToast({
          tone: result.outcome === 'winner' ? 'success' : 'warning',
          title:
            result.outcome === 'winner'
              ? 'Winner declared'
              : result.outcome === 'void'
                ? 'Auction void'
                : 'Auction cancelled',
          message:
            result.outcome === 'winner'
              ? `Your ETB 0.07 bid is the lowest unique bid after ${filled.created ? `adding ${filled.created} entrants.` : 'the minimum was reached.'}`
              : 'Check the grouped bid table and queued refunds.',
        })
      }
    }
    go(4)
    navigate('/results/tv')
  }

  const claimPrize = () => {
    if (!winner) {
      showToast({
        tone: 'warning',
        title: 'No winner yet',
        message: 'Close the TV auction before claiming the prize.',
      })
      return
    }
    if (winner.verification !== 'verified') {
      const verified = verifyWinnerIdentity('tv', {
        name: user?.name ?? 'Selam Tesfaye',
        idNumber: '123456789012',
      })
      if (!verified.ok) {
        showToast({ tone: 'error', title: 'Verification failed', message: verified.error })
        return
      }
    }
    if (!winner.method) {
      const method = setWinnerFulfilmentMethod(
        'tv',
        'pickup',
        undefined,
        'Bole, Addis Ababa — How Low pickup desk',
      )
      if (!method.ok) {
        showToast({ tone: 'error', title: 'Fulfilment not saved', message: method.error })
        return
      }
    }
    go(6)
    navigate('/winner/tv')
    showToast({
      tone: 'success',
      title: 'Prize claimed',
      message: 'Identity verified and Bole pickup selected. The fulfilment tracker is now live.',
    })
  }

  const openAdmin = () => {
    go(7)
    navigate('/admin/reconciliation')
    showToast({
      tone: 'info',
      title: 'Admin reconciliation',
      message: 'The TV auction, queued refund and complete audit trail are ready to review.',
    })
  }

  const settleRefunds = () => {
    const result = processRefunds('tv')
    if (!result.count) {
      showToast({ tone: 'info', title: 'Nothing pending', message: 'There are no queued TV refunds to process.' })
      return
    }
    showToast({
      tone: 'success',
      title: `${result.count} refund${result.count === 1 ? '' : 's'} processed`,
      message: `${formatETB(result.total, 2)} returned to bidder wallets.`,
    })
  }

  const finish = () => {
    endGuidedDemo()
    navigate('/admin/auctions/tv')
    showToast({
      tone: 'success',
      title: 'Guided demo complete',
      message: 'Payment, sealed bid, close, win, claim and reconciliation are all in the audit log.',
    })
  }

  const restart = () => {
    resetDemo()
    go(0)
    navigate('/auction/tv')
    showToast({ tone: 'info', title: 'Guided demo restarted', message: 'Fresh seed state loaded.' })
  }

  const copy: StepCopy = (() => {
    switch (step) {
      case 0:
        return {
          eyebrow: 'Welcome',
          title: 'A full auction in eight steps',
          body: 'This walkthrough uses the Smart TV 55" auction. You will pay ETB 10, lock a sealed 0.07 bid, close the auction, win it, claim the prize and reconcile the refund in admin.',
          cta: 'Start the walkthrough',
          icon: Sparkles,
          hint: 'Real client-side engine. Every action writes to the shared store and audit log.',
        }
      case 1:
        return {
          eyebrow: 'Payment',
          title: 'Pay the ETB 10 entry fee',
          body: unbidEntry
            ? 'You already have a confirmed paid entry. Continue to the sealed-bid step.'
            : 'A simulated STK push will be approved instantly. Only a confirmed success creates an entry.',
          cta: unbidEntry ? 'Continue to bid' : 'Pay entry fee',
          icon: CircleDollarSign,
          hint: 'Try failed, timeout and cancelled outcomes any time from Demo controls.',
        }
      case 2:
        return {
          eyebrow: 'Sealed bid',
          title: 'Lock a 0.07 bid',
          body: lockedBid
            ? `Your sealed bid of ${formatETB(lockedBid.amount, 2)} is already locked. A SHA-256 receipt proves it was never altered.`
            : 'ETB 0.07 is a deliberately awkward amount. Existing bot bids sit at 0.05, 0.09 or 0.13+, so this bid can win without colliding.',
          cta: lockedBid ? 'Open the receipt' : 'Lock ETB 0.07 bid',
          icon: Lock,
          hint: 'Your amount stays hidden until the auction closes.',
        }
      case 3:
        return {
          eyebrow: 'Close',
          title: 'Reach the minimum and close',
          body: `The TV auction has ${paidEntries.toLocaleString('en-US')} of ${(tv?.minEntries ?? 500).toLocaleString('en-US')} paid entries. The demo adds the missing simulated bidders, then closes the auction and runs the winner calculation.`,
          cta: 'Reach minimum & close',
          icon: Gavel,
          hint: 'Bots never bid below 0.13, so your 0.07 stays the lowest unique amount.',
        }
      case 4:
        return {
          eyebrow: 'Results',
          title: 'Inspect the calculation',
          body: 'The public results page groups every bid by amount, strikes out duplicates and highlights the winning unique bid. The audit log records the same calculation.',
          cta: 'Review results',
          icon: Trophy,
          hint: 'You can open any bid group to verify the SHA-256 receipt.',
        }
      case 5:
        return {
          eyebrow: 'Claim',
          title: 'Verify identity and claim',
          body: winner
            ? `Your ${formatETB(winner.amount, 2)} bid won the TV. The demo verifies Selam’s ID and selects Bole pickup, starting the fulfilment tracker.`
            : 'A winner record will appear once the TV auction closes.',
          cta: 'Verify & choose pickup',
          icon: ShieldCheck,
          hint: 'Admins can also verify the winner or offer the prize to the next unique bidder.',
        }
      case 6:
        return {
          eyebrow: 'Admin',
          title: 'Reconcile the refund',
          body: 'The close queued a refund for a paid entry that never submitted a bid. Open reconciliation to see the match, then process it into the bidder’s wallet.',
          cta: 'Open admin reconciliation',
          icon: BadgeCheck,
          hint: 'Auction detail, audit log, refunds and unit economics all reflect the result.',
        }
      default:
        return {
          eyebrow: 'Complete',
          title: 'The loop is closed',
          body: 'Payment → entry → sealed bid → close → winner → claim → refund → audit. You can reset the demo and run it again, or explore the other seeded auctions.',
          cta: 'Finish tour',
          icon: Check,
          hint: 'Smartphone, laptop, void, cancelled and delivered-prize examples are all seeded.',
        }
    }
  })()

  const Icon = copy.icon
  const primaryAction = (() => {
    switch (step) {
      case 0:
        return () => {
          go(1)
          navigate('/auction/tv')
        }
      case 1:
        return payEntry
      case 2:
        return lockBid
      case 3:
        return closeAuction
      case 4:
        return () => {
          go(5)
          navigate('/results/tv')
        }
      case 5:
        return claimPrize
      case 6:
        return openAdmin
      default:
        return finish
    }
  })()

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        className="no-print focus-ring fixed bottom-20 left-3 z-[205] flex max-w-[calc(100vw-5rem)] items-center gap-2 rounded-full border border-white/15 bg-ink px-3 py-2 text-left text-white shadow-float sm:bottom-4 sm:left-4"
      >
        <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-brand text-[10px] font-black">
          {step + 1}
        </span>
        <span className="truncate text-[10px] font-bold">{copy.title}</span>
        <ChevronUp className="h-3.5 w-3.5 flex-none text-brand" />
      </button>
    )
  }

  return (
    <div className="no-print fixed inset-x-3 bottom-20 z-[205] sm:inset-x-auto sm:bottom-4 sm:left-4 sm:w-[384px]">
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-ink text-white shadow-float">
        <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="flex h-6 items-center gap-1 rounded-full bg-brand/20 px-2 text-[8px] font-black uppercase tracking-[0.14em] text-brand">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" /> Guided demo
            </span>
            <span className="text-[9px] font-bold text-white/40">
              Step {step + 1} of {TOTAL_STEPS}
            </span>
          </div>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="focus-ring flex h-7 w-7 items-center justify-center rounded-full text-white/45 hover:bg-white/10 hover:text-white"
              aria-label="Minimise guided demo"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={endGuidedDemo}
              className="focus-ring flex h-7 w-7 items-center justify-center rounded-full text-white/45 hover:bg-white/10 hover:text-white"
              aria-label="Close guided demo"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="px-4 pb-3 pt-3">
          <div className="flex gap-1">
            {Array.from({ length: TOTAL_STEPS }, (_, index) => (
              <span
                key={index}
                className={cn(
                  'h-1 flex-1 rounded-full transition-colors',
                  index < step ? 'bg-brand/60' : index === step ? 'bg-brand' : 'bg-white/12',
                )}
              />
            ))}
          </div>

          <div className="mt-3 flex items-start gap-2.5">
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-brand/15 text-brand">
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[8px] font-extrabold uppercase tracking-[0.16em] text-brand">{copy.eyebrow}</p>
              <h3 className="mt-0.5 text-[15px] font-extrabold leading-tight tracking-[-0.02em]">{copy.title}</h3>
            </div>
          </div>

          <p className="mt-2 text-[10.5px] leading-relaxed text-white/60">{copy.body}</p>

          {step === 3 ? (
            <div className="mt-2.5 rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2">
              <div className="flex items-center justify-between text-[8.5px] font-bold text-white/55">
                <span>Paid entries</span>
                <span className="text-white">
                  {paidEntries.toLocaleString('en-US')} / {(tv?.minEntries ?? 500).toLocaleString('en-US')}
                </span>
              </div>
              <Progress
                value={((paidEntries / Math.max(1, tv?.minEntries ?? 500)) * 100) || 0}
                height="h-1.5"
                className="mt-1.5 bg-white/10"
              />
            </div>
          ) : null}

          {step === 6 ? (
            <button
              type="button"
              onClick={settleRefunds}
              className="focus-ring mt-2.5 flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2 text-left transition hover:bg-white/[0.08]"
            >
              <span className="flex items-center gap-2 text-[9.5px] font-bold text-white/75">
                <RotateCcw className="h-3 w-3 text-brand" /> Process pending TV refunds
              </span>
              <ArrowRight className="h-3 w-3 text-white/40" />
            </button>
          ) : null}

          <div className="mt-3 flex items-center gap-1.5">
            <button
              type="button"
              onClick={primaryAction}
              className="focus-ring flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-brand px-3 text-[10.5px] font-extrabold text-white transition hover:bg-brand-dark"
            >
              {copy.cta}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
            {step > 0 && step < TOTAL_STEPS - 1 ? (
              <button
                type="button"
                onClick={() => go(step + 1)}
                className="focus-ring flex h-9 items-center justify-center rounded-full border border-white/15 px-3 text-[9px] font-bold text-white/55 transition hover:bg-white/10 hover:text-white"
              >
                Skip
              </button>
            ) : null}
            {step === TOTAL_STEPS - 1 ? (
              <button
                type="button"
                onClick={restart}
                className="focus-ring flex h-9 items-center justify-center rounded-full border border-white/15 px-3 text-[9px] font-bold text-white/55 transition hover:bg-white/10 hover:text-white"
                aria-label="Restart guided demo"
              >
                <RotateCcw className="h-3 w-3" />
              </button>
            ) : null}
          </div>

          {copy.hint ? <p className="mt-2 text-[8.5px] leading-relaxed text-white/35">{copy.hint}</p> : null}
        </div>
      </div>
    </div>
  )
}

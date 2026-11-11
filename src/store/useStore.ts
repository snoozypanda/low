import { useMemo } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Auction,
  AuctionStatus,
  AuditEvent,
  AuditType,
  Bid,
  EconomicsInputs,
  Entry,
  FulfilmentMethod,
  FulfilmentStatus,
  GuidedState,
  Language,
  Notification,
  NotificationKind,
  Payment,
  PaymentStatus,
  Refund,
  RefundReason,
  Settings,
  User,
  WinnerRecord,
} from '../types'
import {
  defaultEconomics,
  determineWinner,
  hashBid,
  maskPhone,
  nextUniqueBid,
  randomSalt,
  validateBidAmount,
} from '../lib/engine'
import { formatETB, slugify } from '../lib/format'
import { createSeedState, type DemoState } from '../lib/seed'

export interface AuctionDraft {
  title: string
  titleAm: string
  description: string
  descriptionAm: string
  category: string
  image: string
  gallery: string[]
  retailValue: number
  entryFee: number
  bidMin: number
  bidMax?: number
  bidStep: number
  minEntries: number
  maxEntriesPerUser: number
  startAt: string
  endAt: string
}

interface ActionResult {
  ok: boolean
  error?: string
}

interface PaymentIntentResult extends ActionResult {
  payment?: Payment
  reused?: boolean
}

interface BidResult extends ActionResult {
  bid?: Bid
  entry?: Entry
}

interface CloseResult extends ActionResult {
  outcome?: 'winner' | 'void' | 'cancelled'
  winningAmount?: number
  winnerEntryId?: string
}

type ResolveOutcome = 'success' | 'failed' | 'cancelled' | 'timeout'

interface StoreState extends DemoState {
  setLanguage: (language: Language) => void
  login: (phone: string) => { ok: boolean; error?: string; user?: User }
  logout: () => void
  adminLogin: (email: string, password: string) => ActionResult
  adminLogout: () => void

  markNotificationRead: (id: string) => void
  markAllNotificationsRead: () => void
  addWalletCredit: (amount: number) => void

  initiatePayment: (auctionId: string, userId?: string) => PaymentIntentResult
  resolvePayment: (paymentId: string, outcome: ResolveOutcome) => ActionResult & { entry?: Entry; replayed?: boolean }
  reversePayment: (paymentId: string) => ActionResult
  submitBid: (entryId: string, amount: number) => BidResult

  closeAuction: (auctionId: string, reason?: 'scheduled' | 'manual') => CloseResult
  cancelAuction: (auctionId: string) => CloseResult
  fastForwardAuction: (auctionId: string) => CloseResult
  sweepExpiredAuctions: () => void
  recordAuctionView: (auctionId: string) => void

  createAuction: (draft: AuctionDraft) => ActionResult & { auction?: Auction }
  updateAuction: (id: string, patch: Partial<Auction>) => ActionResult
  updateEconomics: (auctionId: string, patch: Partial<EconomicsInputs>) => void
  updateSettings: (patch: Partial<Settings>) => void

  processRefunds: (auctionId?: string) => { count: number; total: number }
  queueManualRefund: (paymentId: string, reason: RefundReason, note?: string) => ActionResult
  invalidateEntryForReconciliation: (entryId: string, note?: string) => ActionResult
  setWinnerFulfilmentMethod: (
    auctionId: string,
    method: FulfilmentMethod,
    address?: string,
    pickupLocation?: string,
  ) => ActionResult
  advanceFulfilment: (auctionId: string) => ActionResult
  failWinnerAndOfferNext: (auctionId: string) => { ok: boolean; error?: string; nextAmount?: number }
  offerToNextWinner: (auctionId: string) => { ok: boolean; error?: string; nextAmount?: number }

  generateBotEntries: (auctionId: string, count: number) => { ok: boolean; created: number; error?: string }
  reachMinimum: (auctionId: string) => { ok: boolean; created: number; error?: string }
  triggerPaymentOutcome: (auctionId: string, outcome: ResolveOutcome | 'reversed') => ActionResult

  startGuidedDemo: () => void
  setGuidedStep: (step: number) => void
  endGuidedDemo: () => void
  resetDemo: () => void
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const nowIso = () => new Date().toISOString()
const uid = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`
const ref = () => `MP${Date.now().toString(36).slice(-5).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`
const round2 = (n: number) => Math.round(n * 100) / 100

function makeAudit(input: {
  auctionId: string
  type: AuditType
  actor: string
  message: string
  hash?: string
  meta?: Record<string, string | number | boolean | null>
}): AuditEvent {
  return {
    id: uid('aud'),
    auctionId: input.auctionId,
    type: input.type,
    actor: input.actor,
    message: input.message,
    timestamp: nowIso(),
    hash: input.hash,
    meta: input.meta,
  }
}

function makeNotification(input: {
  userId: string
  kind: NotificationKind
  title: string
  titleAm: string
  body: string
  bodyAm: string
  sms?: boolean
  auctionId?: string
}): Notification {
  return {
    id: uid('ntf'),
    userId: input.userId,
    kind: input.kind,
    title: input.title,
    titleAm: input.titleAm,
    body: input.body,
    bodyAm: input.bodyAm,
    createdAt: nowIso(),
    read: false,
    sms: input.sms ?? false,
    auctionId: input.auctionId,
  }
}

function makeRefund(input: {
  auctionId: string
  entryId?: string
  paymentId?: string
  userId: string
  amount: number
  reason: RefundReason
  note?: string
}): Refund {
  return {
    id: uid('ref'),
    auctionId: input.auctionId,
    entryId: input.entryId,
    paymentId: input.paymentId,
    userId: input.userId,
    amount: input.amount,
    reason: input.reason,
    status: 'pending',
    createdAt: nowIso(),
    note: input.note,
  }
}

function addRefundOnce(
  refunds: Refund[],
  input: {
    auctionId: string
    entryId?: string
    paymentId?: string
    userId: string
    amount: number
    reason: RefundReason
    note?: string
  },
): Refund {
  const existing = refunds.find(
    (r) =>
      r.reason === input.reason &&
      r.status !== 'processed' &&
      (input.entryId ? r.entryId === input.entryId : r.entryId === undefined && r.paymentId === input.paymentId),
  )
  if (existing) return existing
  const refund = makeRefund(input)
  refunds.push(refund)
  return refund
}

function notifyUser(
  notifications: Notification[],
  user: User | undefined,
  input: {
    kind: NotificationKind
    title: string
    titleAm: string
    body: string
    bodyAm: string
    sms?: boolean
    auctionId?: string
  },
) {
  if (!user || user.isBot) return
  notifications.push(makeNotification({ userId: user.id, ...input }))
}

function statusFromDates(startAt: string, endAt: string): AuctionStatus {
  const now = Date.now()
  const start = new Date(startAt).getTime()
  const end = new Date(endAt).getTime()
  if (end <= now) return 'closed'
  if (start <= now) return 'live'
  return 'upcoming'
}

function paidEntry(
  entry: Entry,
  paymentById: Map<string, Payment>,
): boolean {
  const payment = paymentById.get(entry.paymentId)
  return (
    payment?.status === 'success' &&
    !['invalidated', 'refunded', 'void', 'cancelled'].includes(entry.status)
  )
}

function paidEntryCount(state: StoreState, auctionId: string): number {
  const paymentById = new Map(state.payments.map((p) => [p.id, p]))
  return state.entries.filter((e) => e.auctionId === auctionId && paidEntry(e, paymentById)).length
}

function participationCount(state: StoreState, auctionId: string): number {
  const paymentById = new Map(state.payments.map((p) => [p.id, p]))
  return new Set(
    state.entries
      .filter((e) => e.auctionId === auctionId && paidEntry(e, paymentById))
      .map((e) => e.userId),
  ).size
}

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */

const seed = createSeedState()

const BOT_NAMES_RUNTIME = [
  'Hanna T.',
  'Dawit M.',
  'Liya B.',
  'Nahom A.',
  'Meron K.',
  'Yonas S.',
  'Sara G.',
  'Bereket W.',
  'Eden H.',
  'Kaleb F.',
]

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      ...seed,

      setLanguage: (language) => {
        const state = get()
        set({
          language,
          users: state.users.map((u) =>
            u.id === state.currentUserId ? { ...u, language } : u,
          ),
        })
      },

      login: (phone) => {
        const cleaned = phone.replace(/[^\d+]/g, '')
        const digits = cleaned.replace(/\D/g, '')
        if (!/^2517\d{8}$/.test(digits) && !/^07\d{8}$/.test(digits) && !/^7\d{8}$/.test(digits)) {
          return { ok: false, error: 'Enter a valid Safaricom phone number in +251 7XX XXX XXX format.' }
        }
        const normalized = digits.startsWith('251')
          ? `+${digits}`
          : digits.startsWith('0')
            ? `+251${digits.slice(1)}`
            : `+251${digits}`
        const state = get()
        let user = state.users.find((u) => u.phone === normalized)
        if (!user) {
          user = {
            id: uid('u'),
            phone: normalized,
            name: 'New Bidder',
            walletBalance: 0,
            language: state.language,
            createdAt: nowIso(),
          }
        }
        set({
          currentUserId: user.id,
          users: state.users.some((u) => u.id === user?.id)
            ? state.users.map((u) => (u.id === user?.id ? { ...u, language: state.language } : u))
            : [...state.users, user],
          language: state.language,
        })
        return { ok: true, user }
      },

      logout: () => set({ currentUserId: null }),

      adminLogin: (email, password) => {
        if (!email.trim() || !password.trim()) {
          return { ok: false, error: 'Enter both email and password.' }
        }
        set({ adminAuthed: true })
        return { ok: true }
      },

      adminLogout: () => set({ adminAuthed: false }),

      markNotificationRead: (id) => {
        set({ notifications: get().notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) })
      },

      markAllNotificationsRead: () => {
        const state = get()
        set({
          notifications: state.notifications.map((n) =>
            n.userId === state.currentUserId ? { ...n, read: true } : n,
          ),
        })
      },

      addWalletCredit: (amount) => {
        const state = get()
        set({
          users: state.users.map((u) =>
            u.id === state.currentUserId ? { ...u, walletBalance: round2(u.walletBalance + amount) } : u,
          ),
        })
      },

      initiatePayment: (auctionId, userId) => {
        const state = get()
        const user = state.users.find((u) => u.id === (userId ?? state.currentUserId))
        if (!user) return { ok: false, error: 'Sign in before entering an auction.' }
        const auction = state.auctions.find((a) => a.id === auctionId)
        if (!auction) return { ok: false, error: 'Auction not found.' }
        if (auction.status !== 'live') return { ok: false, error: 'This auction is not open for entries.' }
        if (new Date(auction.endAt).getTime() <= Date.now()) {
          return { ok: false, error: 'The bidding window has already closed.' }
        }

        const existingPending = state.payments
          .filter(
            (p) =>
              p.auctionId === auctionId &&
              p.userId === user.id &&
              p.status === 'pending',
          )
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
        if (existingPending) return { ok: true, payment: existingPending, reused: true }

        const alreadyPaid = state.payments.some(
          (p) =>
            p.auctionId === auctionId &&
            p.userId === user.id &&
            p.status === 'success',
        )
        if (alreadyPaid) {
          return {
            ok: false,
            error: 'You have already paid for this auction. 3 bids are unlocked with your entry.',
          }
        }

        const payment: Payment = {
          id: uid('pay'),
          ref: ref(),
          auctionId,
          userId: user.id,
          phone: user.phone,
          amount: auction.entryFee,
          status: 'pending',
          createdAt: nowIso(),
        }
        const audit = makeAudit({
          auctionId,
          type: 'payment.pending',
          actor: `User · ${user.name}`,
          message: `STK push simulated for ${payment.ref} — ETB ${auction.entryFee}.`,
          meta: { ref: payment.ref, amount: payment.amount },
        })
        set({
          payments: [...state.payments, payment],
          audit: [...state.audit, audit],
        })
        return { ok: true, payment }
      },

      resolvePayment: (paymentId, outcome) => {
        const state = get()
        const payment = state.payments.find((p) => p.id === paymentId)
        if (!payment) return { ok: false, error: 'Payment not found.' }

        if (payment.status !== 'pending') {
          const ignored = {
            id: uid('ign'),
            ref: payment.ref,
            paymentId: payment.id,
            reason: 'Payment event replayed',
            createdAt: nowIso(),
            note: `Payment was already ${payment.status}. Replayed "${outcome}" callback ignored by idempotency check.`,
          }
          const audit = makeAudit({
            auctionId: payment.auctionId,
            type: 'payment.replay_ignored',
            actor: 'Payment simulator',
            message: `Replayed ${outcome} event for ${payment.ref} ignored — payment is already ${payment.status}.`,
            meta: { ref: payment.ref },
          })
          set({
            ignoredEvents: [ignored, ...state.ignoredEvents],
            audit: [...state.audit, audit],
          })
          return {
            ok: false,
            error: 'This payment event was already processed. No duplicate entry was created.',
            replayed: true,
          }
        }

        const auction = state.auctions.find((a) => a.id === payment.auctionId)
        if (!auction) return { ok: false, error: 'Auction not found.' }
        const user = state.users.find((u) => u.id === payment.userId)

        const payments = state.payments.map((p) =>
          p.id === paymentId
            ? {
                ...p,
                status: outcome as PaymentStatus,
                confirmedAt: outcome === 'success' ? nowIso() : p.confirmedAt,
              }
            : p,
        )

        if (outcome !== 'success') {
          const audit = makeAudit({
            auctionId: payment.auctionId,
            type:
              outcome === 'failed'
                ? 'payment.failed'
                : outcome === 'timeout'
                  ? 'payment.timeout'
                  : 'payment.cancelled',
            actor: 'M-PESA simulator',
            message: `Payment ${payment.ref} ${outcome}. No entry was created.`,
            meta: { ref: payment.ref },
          })
          const notifications = [...state.notifications]
          notifyUser(notifications, user, {
            kind: 'payment',
            title: `Payment ${outcome}`,
            titleAm: `ክፍያው ${outcome === 'failed' ? 'አልተሳካም' : outcome === 'timeout' ? 'ጊዜው አልፏል' : 'ተሰርዟል'}`,
            body:
              outcome === 'failed'
                ? `Your ETB ${auction.entryFee} entry payment did not go through. You can try again.`
                : outcome === 'timeout'
                  ? `The payment request timed out. No money moved and no entry was created.`
                  : `You cancelled the payment request. No money moved and no entry was created.`,
            bodyAm:
              outcome === 'failed'
                ? `የ ETB ${auction.entryFee} የመግቢያ ክፍያዎ አልተሳካም። እንደገና ይሞክሩ።`
                : outcome === 'timeout'
                  ? `የክፍያ ጥያቄው ጊዜው አልፏል። ገንዘብ አልተንቀሳቀሰም፤ ግቤትም አልተፈጠረም።`
                  : `የክፍያ ጥያቄውን ሰርዘዋል። ገንዘብ አልተንቀሳቀሰም፤ ግቤትም አልተፈጠረም።`,
            sms: true,
            auctionId: auction.id,
          })
          set({ payments, audit: [...state.audit, audit], notifications })
          return { ok: true }
        }

        const duplicateEntry = state.entries.find((e) => e.paymentId === paymentId)
        if (duplicateEntry) {
          return { ok: true, entry: duplicateEntry, replayed: true }
        }

        const entriesCount = user?.isBot ? 1 : 3
        const createdEntries: Entry[] = Array.from({ length: entriesCount }).map((_, idx) => ({
          id: uid('ent'),
          auctionId: auction.id,
          userId: payment.userId,
          paymentId: payment.id,
          createdAt: new Date(Date.now() + idx * 50).toISOString(),
          status: 'active' as const,
          isBot: user?.isBot,
        }))

        const auditConfirmed = makeAudit({
          auctionId: auction.id,
          type: 'payment.confirmed',
          actor: 'M-PESA simulator',
          message: `Payment ${payment.ref} confirmed for ETB ${payment.amount} (3 bids unlocked).`,
          meta: { ref: payment.ref, amount: payment.amount },
        })
        const notifications = [...state.notifications]

        notifyUser(notifications, user, {
          kind: 'entry',
          title: 'Payment confirmed · 3 bids unlocked',
          titleAm: 'ክፍያ ተረጋግጧል · 3 ጨረታዎች ተፈቅደዋል',
          body: `Your ETB ${auction.entryFee} entry fee for ${auction.title} is confirmed. 3 sealed bids are unlocked — submit them before the auction closes.`,
          bodyAm: `ለ${auction.titleAm} የፈጸሙት ETB ${auction.entryFee} ክፍያ ተረጋግጧል። 3 ሚስጥራዊ ጨረታዎች ተፈቅደዋል — ጨረታው ከመዘጋቱ በፊት ያስገቡ።`,
          sms: true,
          auctionId: auction.id,
        })

        set({
          payments,
          entries: [...state.entries, ...createdEntries],
          notifications,
          audit: [...state.audit, auditConfirmed],
        })
        return { ok: true, entry: createdEntries[0] }
      },

      reversePayment: (paymentId) => {
        const state = get()
        const payment = state.payments.find((p) => p.id === paymentId)
        if (!payment) return { ok: false, error: 'Payment not found.' }
        if (payment.status === 'reversed') return { ok: false, error: 'Payment is already reversed.' }
        const auction = state.auctions.find((a) => a.id === payment.auctionId)
        if (!auction) return { ok: false, error: 'Auction not found.' }
        const user = state.users.find((u) => u.id === payment.userId)
        const entry = state.entries.find((e) => e.paymentId === paymentId)

        const beforeWinner = ['live', 'upcoming'].includes(auction.status)
        let entries = state.entries
        let bids = state.bids
        const refunds = [...state.refunds]
        const audit: AuditEvent[] = []

        if (entry && beforeWinner) {
          entries = state.entries.map((e) =>
            e.id === entry.id ? { ...e, status: 'invalidated' } : e,
          )
          if (entry.bidId) {
            const targetBid = state.bids.find((b) => b.id === entry.bidId)
            if (targetBid) {
              bids = state.bids.map((b) =>
                b.id === entry.bidId
                  ? {
                      ...b,
                      valid: false,
                      invalidatedAt: nowIso(),
                      invalidatedReason: 'Payment reversed before winner declaration',
                    }
                  : b,
              )
              audit.push(
                makeAudit({
                  auctionId: auction.id,
                  type: 'bid.invalidated',
                  actor: 'Auction engine',
                  message: `Bid on entry ${entry.id} invalidated because payment ${payment.ref} was reversed before winner declaration.`,
                  hash: targetBid.hash,
                }),
              )
            }
          }
          addRefundOnce(refunds, {
            auctionId: auction.id,
            entryId: entry.id,
            paymentId: payment.id,
            userId: payment.userId,
            amount: payment.amount,
            reason: 'reversed',
            note: 'Provider reversal',
          })
        }

        audit.push(
          makeAudit({
            auctionId: auction.id,
            type: 'payment.reversed',
            actor: 'M-PESA simulator',
            message: `Payment ${payment.ref} reversed for ${maskPhone(payment.phone)}.`,
            meta: { ref: payment.ref, amount: payment.amount },
          }),
        )

        const notifications = [...state.notifications]
        notifyUser(notifications, user, {
          kind: 'refund',
          title: 'Payment reversed',
          titleAm: 'ክፍያ ተመልሷል',
          body: `Your ETB ${payment.amount} payment for ${auction.title} was reversed. Any bid linked to it is invalid.`,
          bodyAm: `ለ${auction.titleAm} የከፈሉት ETB ${payment.amount} ተመልሷል። ከእሱ ጋር የተያያዘው ጨረታ ዋጋ የለውም።`,
          sms: true,
          auctionId: auction.id,
        })

        set({
          payments: state.payments.map((p) => (p.id === paymentId ? { ...p, status: 'reversed' } : p)),
          entries,
          bids,
          refunds,
          notifications,
          audit: [...state.audit, ...audit],
        })
        return { ok: true }
      },

      submitBid: (entryId, amount) => {
        const state = get()
        const entry = state.entries.find((e) => e.id === entryId)
        if (!entry) return { ok: false, error: 'Entry not found.' }
        const auction = state.auctions.find((a) => a.id === entry.auctionId)
        if (!auction) return { ok: false, error: 'Auction not found.' }
        if (entry.bidId) return { ok: false, error: 'A bid has already been locked for this entry.' }
        if (entry.status !== 'active') return { ok: false, error: 'This entry is not active.' }
        if (auction.status !== 'live' || new Date(auction.endAt).getTime() <= Date.now()) {
          return { ok: false, error: 'The bidding window is closed.' }
        }
        const payment = state.payments.find((p) => p.id === entry.paymentId)
        if (!payment || payment.status !== 'success') {
          return { ok: false, error: 'A confirmed payment is required before bidding.' }
        }
        const validation = validateBidAmount(amount, auction)
        if (!validation.valid) return { ok: false, error: validation.error }

        const timestamp = nowIso()
        const salt = randomSalt(8)
        const rounded = round2(amount)
        const bid: Bid = {
          id: uid('bid'),
          auctionId: auction.id,
          entryId: entry.id,
          userId: entry.userId,
          amount: rounded,
          timestamp,
          salt,
          hash: hashBid({
            auctionId: auction.id,
            userId: entry.userId,
            amount: rounded,
            timestamp,
            salt,
          }),
          valid: true,
        }
        const updatedEntry: Entry = { ...entry, bidId: bid.id }
        const user = state.users.find((u) => u.id === entry.userId)
        const audit = makeAudit({
          auctionId: auction.id,
          type: 'bid.locked',
          actor: user ? `User · ${user.name}` : 'System',
          message: `Sealed bid locked at ETB ${rounded.toFixed(2)} for entry ${entry.id}.`,
          hash: bid.hash,
          meta: { amount: rounded, entryId: entry.id },
        })
        const notifications = [...state.notifications]
        notifyUser(notifications, user, {
          kind: 'entry',
          title: 'Sealed bid locked',
          titleAm: 'ሚስጥራዊ ጨረታዎ ተቆልፏል',
          body: `Your bid of ETB ${rounded.toFixed(2)} for ${auction.title} is locked and cannot be edited. Keep your receipt hash.`,
          bodyAm: `ለ${auction.titleAm} ያስገቡት የ ETB ${rounded.toFixed(2)} ጨረታ ተቆልፏል እና መቀየር አይቻልም። ለማረጋገጫ የደረሰኝ ሃሽዎን ያስቀምጡ።`,
          sms: false,
          auctionId: auction.id,
        })
        set({
          bids: [...state.bids, bid],
          entries: state.entries.map((e) => (e.id === entry.id ? updatedEntry : e)),
          audit: [...state.audit, audit],
          notifications,
        })
        return { ok: true, bid, entry: updatedEntry }
      },

      closeAuction: (auctionId, reason = 'manual') => {
        const state = get()
        const auction = state.auctions.find((a) => a.id === auctionId)
        if (!auction) return { ok: false, error: 'Auction not found.' }
        if (['closed', 'void', 'cancelled'].includes(auction.status)) {
          return { ok: false, error: 'Auction is already closed.' }
        }

        const at = nowIso()
        const payments = state.payments.map((p) => ({ ...p }))
        const entries = state.entries.map((e) => ({ ...e }))
        const bids = state.bids.map((b) => ({ ...b }))
        const refunds = [...state.refunds]
        const notifications = [...state.notifications]
        const audit: AuditEvent[] = []
        const paymentById = new Map(payments.map((p) => [p.id, p]))
        const userById = new Map(state.users.map((u) => [u.id, u]))

        // Reverse-payment invalidation before the winner is declared.
        for (const entry of entries.filter((e) => e.auctionId === auctionId)) {
          const payment = paymentById.get(entry.paymentId)
          if (payment?.status === 'reversed') {
            if (entry.bidId) {
              const bid = bids.find((b) => b.id === entry.bidId)
              if (bid && bid.valid) {
                bid.valid = false
                bid.invalidatedAt = at
                bid.invalidatedReason = 'Payment reversed before winner declaration'
                audit.push(
                  makeAudit({
                    auctionId,
                    type: 'bid.invalidated',
                    actor: 'Auction engine',
                    message: `Bid on entry ${entry.id} invalidated at close: payment ${payment.ref} was reversed.`,
                    hash: bid.hash,
                  }),
                )
              }
            }
            if (['active', 'unspent'].includes(entry.status)) entry.status = 'invalidated'
            addRefundOnce(refunds, {
              auctionId,
              entryId: entry.id,
              paymentId: payment.id,
              userId: payment.userId,
              amount: payment.amount,
              reason: 'reversed',
              note: 'Payment reversed before close',
            })
          }
        }

        const paidEntries = entries.filter((e) => {
          const payment = paymentById.get(e.paymentId)
          return (
            e.auctionId === auctionId &&
            payment?.status === 'success' &&
            ['active', 'unspent', 'won', 'lost', 'not_unique'].includes(e.status)
          )
        })

        const newAuction: Auction = {
          ...auction,
          closedAt: at,
          closeReason: reason,
        }

        if (paidEntries.length < auction.minEntries) {
          newAuction.status = 'cancelled'
          newAuction.closeReason = 'min_entries'
          for (const entry of paidEntries) {
            entry.status = 'cancelled'
            const payment = paymentById.get(entry.paymentId)
            addRefundOnce(refunds, {
              auctionId,
              entryId: entry.id,
              paymentId: entry.paymentId,
              userId: entry.userId,
              amount: payment?.amount ?? auction.entryFee,
              reason: 'cancelled',
              note: `Minimum entries not reached (${paidEntries.length}/${auction.minEntries})`,
            })
            notifyUser(notifications, userById.get(entry.userId), {
              kind: 'refund',
              title: 'Auction cancelled — refund queued',
              titleAm: 'ጨረታው ተሰርዟል — ተመላሽ ተመዝግቧል',
              body: `${auction.title} did not reach its minimum of ${auction.minEntries} entries. Your ETB ${auction.entryFee} entry fee is queued for refund.`,
              bodyAm: `${auction.titleAm} ዝቅተኛውን ${auction.minEntries} ግቤቶች አላሳካም። የ ETB ${auction.entryFee} የመግቢያ ክፍያዎ ለተመላሽ ተመዝግቧል።`,
              sms: true,
              auctionId,
            })
          }
          audit.push(
            makeAudit({
              auctionId,
              type: 'auction.cancelled',
              actor: 'Auction engine',
              message: `Auction cancelled at close: ${paidEntries.length} paid entries, below the minimum of ${auction.minEntries}. ${paidEntries.length} refunds queued.`,
              meta: { entries: paidEntries.length, minEntries: auction.minEntries },
            }),
          )
          set({
            auctions: state.auctions.map((a) => (a.id === auctionId ? newAuction : a)),
            entries,
            bids,
            payments,
            refunds,
            notifications,
            audit: [...state.audit, ...audit],
          })
          return { ok: true, outcome: 'cancelled' }
        }

        const entryById = new Map(entries.map((e) => [e.id, e]))
        const eligibleBids = bids.filter((b) => {
          if (b.auctionId !== auctionId || !b.valid) return false
          const entry = entryById.get(b.entryId)
          const payment = entry ? paymentById.get(entry.paymentId) : undefined
          return Boolean(entry && payment?.status === 'success')
        })

        const calculation = determineWinner(eligibleBids)

        if (!calculation.winner) {
          newAuction.status = 'void'
          newAuction.closeReason = 'void'
          newAuction.winnerEntryId = undefined
          newAuction.winningAmount = undefined
          const amountCounts = new Map<string, number>()
          for (const bid of eligibleBids) {
            const key = bid.amount.toFixed(2)
            amountCounts.set(key, (amountCounts.get(key) ?? 0) + 1)
          }
          for (const entry of paidEntries) {
            const bid = entry.bidId ? bids.find((b) => b.id === entry.bidId) : undefined
            entry.status = bid ? 'not_unique' : 'void'
            const payment = paymentById.get(entry.paymentId)
            addRefundOnce(refunds, {
              auctionId,
              entryId: entry.id,
              paymentId: entry.paymentId,
              userId: entry.userId,
              amount: payment?.amount ?? auction.entryFee,
              reason: 'void',
              note: 'No unique bid',
            })
            notifyUser(notifications, userById.get(entry.userId), {
              kind: 'refund',
              title: 'Auction void — refund queued',
              titleAm: 'ጨረታው ዋጋ የለውም — ተመላሽ ተመዝግቧል',
              body: `${auction.title} ended without a unique bid. Your ETB ${auction.entryFee} entry fee is queued for refund.`,
              bodyAm: `${auction.titleAm} ልዩ ጨረታ ሳይኖር ተጠናቋል። የ ETB ${auction.entryFee} የመግቢያ ክፍያዎ ለተመላሽ ተመዝግቧል።`,
              sms: true,
              auctionId,
            })
          }
          audit.push(
            makeAudit({
              auctionId,
              type: 'auction.closed',
              actor: 'Auction engine',
              message: `Auction closed with ${paidEntries.length} paid entries. Minimum of ${auction.minEntries} reached.`,
              meta: { entries: paidEntries.length },
            }),
            makeAudit({
              auctionId,
              type: 'winner.calculated',
              actor: 'Auction engine',
              message: calculation.steps.join(' '),
              meta: { uniqueBids: 0, winningAmount: null },
            }),
            makeAudit({
              auctionId,
              type: 'auction.void',
              actor: 'Auction engine',
              message: `No unique bid exists. Auction VOID; ${paidEntries.length} refunds queued.`,
            }),
            makeAudit({
              auctionId,
              type: 'refund.created',
              actor: 'System',
              message: `${paidEntries.length} entry fees queued for refund after the auction was marked VOID.`,
            }),
          )
          set({
            auctions: state.auctions.map((a) => (a.id === auctionId ? newAuction : a)),
            entries,
            bids,
            payments,
            refunds,
            notifications,
            audit: [...state.audit, ...audit],
          })
          return { ok: true, outcome: 'void' }
        }

        const winningBid = calculation.winner
        const groupByEntry = new Map<string, { count: number; unique: boolean }>()
        for (const group of calculation.groups) {
          for (const bid of group.bids) {
            groupByEntry.set(bid.entryId, { count: group.count, unique: group.unique })
          }
        }

        newAuction.status = 'closed'
        newAuction.closeReason = reason
        newAuction.winnerEntryId = winningBid.entryId
        newAuction.winningAmount = winningBid.amount

        for (const entry of paidEntries) {
          const group = groupByEntry.get(entry.id)
          if (entry.id === winningBid.entryId) {
            entry.status = 'won'
          } else if (group) {
            entry.status = group.unique ? 'lost' : 'not_unique'
          } else {
            entry.status = 'unspent'
            const payment = paymentById.get(entry.paymentId)
            addRefundOnce(refunds, {
              auctionId,
              entryId: entry.id,
              paymentId: entry.paymentId,
              userId: entry.userId,
              amount: payment?.amount ?? auction.entryFee,
              reason: 'unspent_credit',
              note: 'Payment succeeded but no bid was submitted before close',
            })
          }
        }

        const winnerUser = userById.get(winningBid.userId)
        const existingWinner = state.winners.find((w) => w.auctionId === auctionId)
        const winnerRecord: WinnerRecord = {
          auctionId,
          entryId: winningBid.entryId,
          userId: winningBid.userId,
          amount: winningBid.amount,
          fulfilment: 'none',
          deadlineAt: new Date(Date.now() + 7 * 24 * 3600_000).toISOString(),
          createdAt: at,
          updatedAt: at,
        }
        const winners = existingWinner
          ? state.winners.map((w) => (w.auctionId === auctionId ? winnerRecord : w))
          : [...state.winners, winnerRecord]

        audit.push(
          makeAudit({
            auctionId,
            type: 'auction.closed',
            actor: 'Auction engine',
            message: `Auction closed with ${paidEntries.length} paid entries. Minimum of ${auction.minEntries} reached.`,
            meta: { entries: paidEntries.length },
          }),
          makeAudit({
            auctionId,
            type: 'winner.calculated',
            actor: 'Auction engine',
            message: calculation.steps.join(' '),
            meta: {
              winningAmount: winningBid.amount,
              winningEntryId: winningBid.entryId,
              uniqueBids: calculation.uniqueGroups.length,
            },
          }),
        )

        notifyUser(notifications, winnerUser, {
          kind: 'won',
          title: 'Congratulations — you won!',
          titleAm: 'እንኳን ደስ አለዎት — አሸንፈዋል!',
          body: `Your unique bid of ETB ${winningBid.amount.toFixed(2)} won ${auction.title}. Choose delivery or pickup within 7 days to claim it.`,
          bodyAm: `የ ETB ${winningBid.amount.toFixed(2)} ልዩ ጨረታዎ ${auction.titleAm}ን አሸንፏል። ለመረከብ በ7 ቀናት ውስጥ ማድረስ ወይም መረከብ ይምረጡ።`,
          sms: true,
          auctionId,
        })

        set({
          auctions: state.auctions.map((a) => (a.id === auctionId ? newAuction : a)),
          entries,
          bids,
          payments,
          refunds,
          winners,
          notifications,
          audit: [...state.audit, ...audit],
        })
        return {
          ok: true,
          outcome: 'winner',
          winningAmount: winningBid.amount,
          winnerEntryId: winningBid.entryId,
        }
      },

      cancelAuction: (auctionId) => {
        const state = get()
        const auction = state.auctions.find((a) => a.id === auctionId)
        if (!auction) return { ok: false, error: 'Auction not found.' }
        if (['closed', 'void', 'cancelled'].includes(auction.status)) {
          return { ok: false, error: 'Auction is already closed.' }
        }
        const at = nowIso()
        const refunds = [...state.refunds]
        const notifications = [...state.notifications]
        const audit: AuditEvent[] = []
        const paymentById = new Map(state.payments.map((p) => [p.id, p]))
        const userById = new Map(state.users.map((u) => [u.id, u]))
        const entries = state.entries.map((e) => ({ ...e }))
        const paid = entries.filter((e) => {
          const p = paymentById.get(e.paymentId)
          return (
            e.auctionId === auctionId &&
            p?.status === 'success' &&
            !['refunded', 'invalidated', 'void', 'cancelled'].includes(e.status)
          )
        })
        for (const entry of paid) {
          entry.status = 'cancelled'
          addRefundOnce(refunds, {
            auctionId,
            entryId: entry.id,
            paymentId: entry.paymentId,
            userId: entry.userId,
            amount: paymentById.get(entry.paymentId)?.amount ?? auction.entryFee,
            reason: 'cancelled',
            note: 'Auction cancelled by admin',
          })
          notifyUser(notifications, userById.get(entry.userId), {
            kind: 'refund',
            title: 'Auction cancelled — refund queued',
            titleAm: 'ጨረታው ተሰርዟል — ተመላሽ ተመዝግቧል',
            body: `${auction.title} was cancelled. Your ETB ${auction.entryFee} entry fee is queued for refund.`,
            bodyAm: `${auction.titleAm} ተሰርዟል። የ ETB ${auction.entryFee} የመግቢያ ክፍያዎ ለተመላሽ ተመዝግቧል።`,
            sms: true,
            auctionId,
          })
        }
        audit.push(
          makeAudit({
            auctionId,
            type: 'auction.cancelled',
            actor: 'Admin · Sara M.',
            message: `Auction cancelled manually by admin. ${paid.length} refunds queued.`,
            meta: { entries: paid.length },
          }),
          makeAudit({
            auctionId,
            type: 'refund.created',
            actor: 'System',
            message: `${paid.length} entry fees queued for refund after manual cancellation.`,
          }),
        )
        set({
          auctions: state.auctions.map((a) =>
            a.id === auctionId
              ? { ...a, status: 'cancelled', closedAt: at, closeReason: 'cancelled' }
              : a,
          ),
          entries,
          refunds,
          notifications,
          audit: [...state.audit, ...audit],
        })
        return { ok: true, outcome: 'cancelled' }
      },

      fastForwardAuction: (auctionId) => {
        const state = get()
        const auction = state.auctions.find((a) => a.id === auctionId)
        if (!auction) return { ok: false, error: 'Auction not found.' }
        if (['closed', 'void', 'cancelled'].includes(auction.status)) {
          return { ok: false, error: 'Auction is already closed.' }
        }
        const at = new Date()
        set({
          auctions: state.auctions.map((a) =>
            a.id === auctionId
              ? {
                  ...a,
                  startAt:
                    new Date(a.startAt).getTime() > at.getTime()
                      ? new Date(at.getTime() - 60_000).toISOString()
                      : a.startAt,
                  endAt: at.toISOString(),
                }
              : a,
          ),
        })
        return get().closeAuction(auctionId, 'manual')
      },

      sweepExpiredAuctions: () => {
        const state = get()
        const expired = state.auctions.filter(
          (a) => a.status === 'live' && new Date(a.endAt).getTime() <= Date.now(),
        )
        for (const auction of expired) {
          get().closeAuction(auction.id, 'scheduled')
        }
      },

      recordAuctionView: (auctionId) => {
        set((state) => ({
          auctions: state.auctions.map((a) =>
            a.id === auctionId ? { ...a, views: (a.views ?? 0) + 1 } : a,
          ),
        }))
      },

      createAuction: (draft) => {
        const state = get()
        if (!draft.title.trim()) return { ok: false, error: 'Product name is required.' }
        if (draft.retailValue <= 0) return { ok: false, error: 'Retail value must be greater than zero.' }
        if (draft.entryFee <= 0) return { ok: false, error: 'Entry fee must be greater than zero.' }
        if (draft.minEntries < 1) return { ok: false, error: 'Minimum entries must be at least 1.' }
        if (draft.maxEntriesPerUser < 1) return { ok: false, error: 'Max entries per user must be at least 1.' }
        if (new Date(draft.startAt).getTime() >= new Date(draft.endAt).getTime()) {
          return { ok: false, error: 'The end time must be after the start time.' }
        }
        let id = slugify(draft.title)
        let counter = 2
        while (state.auctions.some((a) => a.id === id)) {
          id = `${slugify(draft.title)}-${counter++}`
        }
        const auction: Auction = {
          ...draft,
          id,
          views: 0,
          status: statusFromDates(draft.startAt, draft.endAt),
          createdAt: nowIso(),
          economics: {
            ...defaultEconomics(
              {
                ...draft,
                id,
                status: 'upcoming',
                createdAt: nowIso(),
              } as Auction,
              state.settings,
            ),
          },
        }
        const audit = makeAudit({
          auctionId: id,
          type: 'auction.created',
          actor: 'Admin · Sara M.',
          message: `Auction "${auction.title}" created with ${auction.minEntries} minimum entries and ETB ${auction.entryFee} entry fee.`,
        })
        set({ auctions: [...state.auctions, auction], audit: [...state.audit, audit] })
        return { ok: true, auction }
      },

      updateAuction: (id, patch) => {
        const state = get()
        const auction = state.auctions.find((a) => a.id === id)
        if (!auction) return { ok: false, error: 'Auction not found.' }
        const updated: Auction = { ...auction, ...patch, id: auction.id }
        const audit = makeAudit({
          auctionId: id,
          type: 'auction.updated',
          actor: 'Admin · Sara M.',
          message: `Auction details updated.`,
        })
        set({
          auctions: state.auctions.map((a) => (a.id === id ? updated : a)),
          audit: [...state.audit, audit],
        })
        return { ok: true }
      },

      updateEconomics: (auctionId, patch) => {
        const state = get()
        set({
          auctions: state.auctions.map((a) =>
            a.id === auctionId
              ? { ...a, economics: { ...(a.economics ?? {}), ...patch } }
              : a,
          ),
        })
      },

      updateSettings: (patch) => {
        set({ settings: { ...get().settings, ...patch } })
      },

      processRefunds: (auctionId) => {
        const state = get()
        const pending = state.refunds.filter(
          (r) => r.status === 'pending' && (!auctionId || r.auctionId === auctionId),
        )
        if (!pending.length) return { count: 0, total: 0 }
        const at = nowIso()
        const userIds = [...new Set(pending.map((r) => r.userId))]
        const users = state.users.map((u) =>
          userIds.includes(u.id)
            ? {
                ...u,
                walletBalance:
                  u.walletBalance +
                  pending.filter((r) => r.userId === u.id).reduce((sum, r) => sum + r.amount, 0),
              }
            : u,
        )
        const userById = new Map(users.map((u) => [u.id, u]))
        const notifications = [...state.notifications]
        const audit: AuditEvent[] = []

        for (const refund of pending) {
          const user = userById.get(refund.userId)
          const auction = state.auctions.find((a) => a.id === refund.auctionId)
          notifyUser(notifications, user, {
            kind: 'refund',
            title: `Refund issued — ${formatETB(refund.amount, 2)}`,
            titleAm: `ተመላሽ ተደርጓል — ${formatETB(refund.amount, 2)}`,
            body: `Your refund for ${auction?.title ?? 'an auction'} has been paid into your Bidora wallet.`,
            bodyAm: `ለ${auction?.titleAm ?? 'ጨረታ'} የሚደረግ ተመላሽ ወደ Bidora ኪስ ቦርሳዎ ተከፍሏል።`,
            sms: true,
            auctionId: refund.auctionId,
          })
          audit.push(
            makeAudit({
              auctionId: refund.auctionId,
              type: 'refund.processed',
              actor: 'Admin · Sara M.',
              message: `Refund ${refund.id} of ETB ${refund.amount.toFixed(2)} paid to ${maskPhone(
                user?.phone ?? '',
              )} via simulated M-PESA.`,
              meta: { refundId: refund.id, amount: refund.amount, reason: refund.reason },
            }),
          )
        }

        const processed = state.refunds.map((r) =>
          r.status === 'pending' && (!auctionId || r.auctionId === auctionId)
            ? { ...r, status: 'processed' as const, processedAt: at }
            : r,
        )
        const processedIds = new Set(pending.map((r) => r.id))
        const entries = state.entries.map((e) => {
          const relevant = processed.find(
            (r) => r.entryId === e.id && processedIds.has(r.id),
          )
          if (relevant && e.status !== 'won') return { ...e, status: 'refunded' as const }
          return e
        })

        set({
          users,
          refunds: processed,
          entries,
          notifications,
          audit: [...state.audit, ...audit],
        })
        return { count: pending.length, total: pending.reduce((sum, r) => sum + r.amount, 0) }
      },

      queueManualRefund: (paymentId, reason, note) => {
        const state = get()
        const payment = state.payments.find((p) => p.id === paymentId)
        if (!payment) return { ok: false, error: 'Payment not found.' }
        const auction = state.auctions.find((a) => a.id === payment.auctionId)
        if (!auction) return { ok: false, error: 'Auction not found.' }
        const entry = state.entries.find((e) => e.paymentId === payment.id)
        if (entry) {
          const existing = state.refunds.find(
            (r) =>
              r.entryId === entry.id &&
              r.status === 'pending' &&
              r.reason === reason,
          )
          if (existing) return { ok: false, error: 'A refund is already queued for this entry.' }
        }
        const refunds = [...state.refunds]
        addRefundOnce(refunds, {
          auctionId: payment.auctionId,
          entryId: entry?.id,
          paymentId: payment.id,
          userId: payment.userId,
          amount: payment.amount,
          reason,
          note: note ?? 'Queued from reconciliation review',
        })
        const user = state.users.find((u) => u.id === payment.userId)
        const notifications = [...state.notifications]
        notifyUser(notifications, user, {
          kind: 'refund',
          title: 'Refund queued',
          titleAm: 'ተመላሽ ተመዝግቧል',
          body: `A ${formatETB(payment.amount, 2)} refund for ${auction.title} has been queued after a reconciliation review.`,
          bodyAm: `ከማስታረቅ ግምገማ በኋላ ለ${auction.titleAm} የ ${formatETB(payment.amount, 2)} ተመላሽ ተመዝግቧል።`,
          sms: true,
          auctionId: auction.id,
        })
        const audit = makeAudit({
          auctionId: auction.id,
          type: 'refund.created',
          actor: 'Admin · Sara M.',
          message: `Manual refund queued for payment ${payment.ref} (${reason}) from reconciliation.`,
          meta: { ref: payment.ref, amount: payment.amount, reason },
        })
        set({ refunds, notifications, audit: [...state.audit, audit] })
        return { ok: true }
      },

      invalidateEntryForReconciliation: (entryId, note) => {
        const state = get()
        const entry = state.entries.find((e) => e.id === entryId)
        if (!entry) return { ok: false, error: 'Entry not found.' }
        if (['invalidated', 'refunded', 'void', 'cancelled'].includes(entry.status)) {
          return { ok: false, error: 'This entry is already invalidated.' }
        }
        const auction = state.auctions.find((a) => a.id === entry.auctionId)
        if (!auction) return { ok: false, error: 'Auction not found.' }
        const payment = state.payments.find((p) => p.id === entry.paymentId)
        const user = state.users.find((u) => u.id === entry.userId)
        const at = nowIso()
        const refunds = [...state.refunds]
        if (payment?.status === 'success' || payment?.status === 'reversed') {
          addRefundOnce(refunds, {
            auctionId: auction.id,
            entryId: entry.id,
            paymentId: payment.id,
            userId: entry.userId,
            amount: payment.amount,
            reason: 'reversed',
            note: note ?? 'Entry invalidated during reconciliation',
          })
        }
        const entries = state.entries.map((e) =>
          e.id === entry.id ? { ...e, status: 'invalidated' as const } : e,
        )
        let bids = state.bids
        if (entry.bidId) {
          bids = state.bids.map((b) =>
            b.id === entry.bidId
              ? {
                  ...b,
                  valid: false,
                  invalidatedAt: at,
                  invalidatedReason: note ?? 'Payment did not settle',
                }
              : b,
          )
        }
        const notifications = [...state.notifications]
        notifyUser(notifications, user, {
          kind: 'refund',
          title: 'Entry invalidated',
          titleAm: 'ግቤትዎ ዋጋ የለውም',
          body: `Your entry for ${auction.title} was invalidated because its payment did not settle. A refund has been queued where needed.`,
          bodyAm: `የ${auction.titleAm} ግቤትዎ ክፍያው ስላልተረጋገጠ ዋጋ የለውም። አስፈላጊ ሆኖ ሲገኝ ተመላሽ ተመዝግቧል።`,
          sms: true,
          auctionId: auction.id,
        })
        const audit = makeAudit({
          auctionId: auction.id,
          type: 'bid.invalidated',
          actor: 'Admin · Sara M.',
          message: `Entry ${entry.id} invalidated from reconciliation. ${note ?? 'Payment did not settle.'}`,
          meta: { entryId: entry.id, payment: payment?.ref ?? null },
        })
        set({ entries, bids, refunds, notifications, audit: [...state.audit, audit] })
        return { ok: true }
      },

      setWinnerFulfilmentMethod: (auctionId, method, address, pickupLocation) => {
        const state = get()
        const winner = state.winners.find((w) => w.auctionId === auctionId)
        if (!winner) return { ok: false, error: 'Winner record not found.' }
        if (method === 'delivery' && !address?.trim()) {
          return { ok: false, error: 'Enter a delivery address.' }
        }
        if (method === 'pickup' && !pickupLocation?.trim()) {
          return { ok: false, error: 'Choose a pickup location.' }
        }
        const at = nowIso()
        const winners = state.winners.map((w) =>
          w.auctionId === auctionId
            ? {
                ...w,
                method,
                address: method === 'delivery' ? address : undefined,
                pickupLocation: method === 'pickup' ? pickupLocation : undefined,
                updatedAt: at,
              }
            : w,
        )
        const audit = makeAudit({
          auctionId,
          type: 'fulfilment.updated',
          actor: 'User · Winner',
          message: `Fulfilment method set to ${method}${address ? ` — ${address}` : pickupLocation ? ` — ${pickupLocation}` : ''}.`,
        })
        set({ winners, audit: [...state.audit, audit] })
        return { ok: true }
      },

      advanceFulfilment: (auctionId) => {
        const state = get()
        const winner = state.winners.find((w) => w.auctionId === auctionId)
        if (!winner) return { ok: false, error: 'Winner record not found.' }
        const next: FulfilmentStatus | null =
          winner.fulfilment === 'none'
            ? 'dispatched'
            : winner.fulfilment === 'dispatched'
              ? 'delivered'
              : null
        if (!next) return { ok: false, error: 'This prize is already delivered.' }
        const at = nowIso()
        const winners = state.winners.map((w) =>
          w.auctionId === auctionId ? { ...w, fulfilment: next, updatedAt: at } : w,
        )
        const user = state.users.find((u) => u.id === winner.userId)
        const auction = state.auctions.find((a) => a.id === auctionId)
        const notifications = [...state.notifications]
        notifyUser(notifications, user, {
          kind: 'fulfilment',
          title: next === 'dispatched' ? 'Your prize has been dispatched' : 'Your prize has been delivered',
          titleAm: next === 'dispatched' ? 'ሽልማትዎ ተልኳል' : 'ሽልማትዎ ደርሷል',
          body:
            next === 'dispatched'
              ? `Your prize is on the way. Keep your phone available for the courier.`
              : `Your prize has been delivered. Thank you for playing Bidora.`,
          bodyAm:
            next === 'dispatched'
              ? `ሽልማትዎ በመንገድ ላይ ነው። ለአስረካቢው ስልክዎን ይያዙ።`
              : `ሽልማትዎ ደርሷል። Bidora ስለተጫወቱ እናመሰግናለን።`,
          sms: true,
          auctionId,
        })
        const audit = makeAudit({
          auctionId,
          type: 'fulfilment.updated',
          actor: 'Admin · Sara M.',
          message: `Fulfilment advanced to ${next}.`,
          meta: { status: next },
        })
        set({ winners, notifications, audit: [...state.audit, audit] })
        return { ok: true }
      },

      failWinnerAndOfferNext: (auctionId) => {
        const state = get()
        const winner = state.winners.find((w) => w.auctionId === auctionId)
        if (!winner) return { ok: false, error: 'Winner record not found.' }
        const audit = makeAudit({
          auctionId,
          type: 'winner.next',
          actor: 'Admin · Sara M.',
          message: 'Winner did not claim the prize within 7 days.',
        })
        set({ audit: [...state.audit, audit] })
        return get().offerToNextWinner(auctionId)
      },

      offerToNextWinner: (auctionId) => {
        const state = get()
        const auction = state.auctions.find((a) => a.id === auctionId)
        const current = state.winners.find((w) => w.auctionId === auctionId)
        if (!auction) return { ok: false, error: 'Auction not found.' }
        if (!current) return { ok: false, error: 'No current winner to replace.' }

        const paymentById = new Map(state.payments.map((p) => [p.id, p]))
        const entryById = new Map(state.entries.map((e) => [e.id, e]))
        const eligibleBids = state.bids.filter((b) => {
          if (b.auctionId !== auctionId || !b.valid) return false
          const entry = entryById.get(b.entryId)
          const payment = entry ? paymentById.get(entry.paymentId) : undefined
          return Boolean(entry && payment?.status === 'success')
        })
        const excluded = [
          ...(auction.priorWinnerEntryIds ?? []),
          ...(auction.winnerEntryId ? [auction.winnerEntryId] : []),
          current.entryId,
        ]
        const next = nextUniqueBid(eligibleBids, excluded)
        if (!next) {
          const refunds = [...state.refunds]
          const notifications = [...state.notifications]
          const userById = new Map(state.users.map((u) => [u.id, u]))
          const entries = state.entries.map((e) =>
            e.auctionId === auctionId && e.status !== 'refunded' ? { ...e, status: 'void' as const } : e,
          )
          for (const entry of entries.filter((e) => e.auctionId === auctionId)) {
            const p = paymentById.get(entry.paymentId)
            if (p?.status === 'success') {
              addRefundOnce(refunds, {
                auctionId,
                entryId: entry.id,
                paymentId: entry.paymentId,
                userId: entry.userId,
                amount: p.amount,
                reason: 'void',
                note: 'No further unique bid after winner did not claim the prize',
              })
              notifyUser(notifications, userById.get(entry.userId), {
                kind: 'refund',
                title: 'Prize could not be awarded — refund queued',
                titleAm: 'ሽልማቱ ሊሰጥ አልቻለም — ተመላሽ ተመዝግቧል',
                body: `No further unique bid was available for ${auction.title}. Your entry fee is queued for refund.`,
                bodyAm: `ለ${auction.titleAm} ተጨማሪ ልዩ ጨረታ አልተገኘም። የመግቢያ ክፍያዎ ለተመላሽ ተመዝግቧል።`,
                sms: true,
                auctionId,
              })
            }
          }
          const audit = makeAudit({
            auctionId,
            type: 'auction.void',
            actor: 'Auction engine',
            message: 'No further unique bid exists after the winner did not claim the prize. Auction VOID and refunds queued.',
          })
          set({
            auctions: state.auctions.map((a) =>
              a.id === auctionId
                ? { ...a, status: 'void', closeReason: 'void', winnerEntryId: undefined, winningAmount: undefined }
                : a,
            ),
            entries,
            refunds,
            notifications,
            winners: state.winners.filter((w) => w.auctionId !== auctionId),
            audit: [...state.audit, audit],
          })
          return { ok: false, error: 'No further unique bid exists. The auction is now VOID and refunds are queued.' }
        }

        const nextUser = state.users.find((u) => u.id === next.userId)
        const at = nowIso()
        const newWinner: WinnerRecord = {
          auctionId,
          entryId: next.entryId,
          userId: next.userId,
          amount: next.amount,
          fulfilment: 'none',
          deadlineAt: new Date(Date.now() + 7 * 24 * 3600_000).toISOString(),
          createdAt: at,
          updatedAt: at,
        }
        const entries = state.entries.map((e) => {
          if (e.id === next.entryId) return { ...e, status: 'won' as const }
          if (excluded.includes(e.id) && e.status === 'won') return { ...e, status: 'lost' as const }
          return e
        })
        const notifications = [...state.notifications]
        notifyUser(notifications, nextUser, {
          kind: 'won',
          title: 'The prize is yours',
          titleAm: 'ሽልማቱ የእርስዎ ነው',
          body: `The previous winner could not claim the prize in time. Your unique bid of ETB ${next.amount.toFixed(2)} now wins ${auction.title}. Choose delivery or pickup within 7 days.`,
          bodyAm: `ቀድሞው አሸናፊ ሽልማቱን በጊዜ መረከብ አልቻለም። የ ETB ${next.amount.toFixed(2)} ልዩ ጨረታዎ አሁን ${auction.titleAm}ን አሸንፏል። በ7 ቀናት ውስጥ ማድረስ ወይም መረከብ ይምረጡ።`,
          sms: true,
          auctionId,
        })
        const audit = makeAudit({
          auctionId,
          type: 'winner.next',
          actor: 'Auction engine',
          message: `Previous winner excluded. Next lowest unique bid is ETB ${next.amount.toFixed(2)}. Prize offered to the next eligible participant.`,
          meta: { winningAmount: next.amount, entryId: next.entryId },
        })
        set({
          auctions: state.auctions.map((a) =>
            a.id === auctionId
              ? {
                  ...a,
                  winnerEntryId: next.entryId,
                  winningAmount: next.amount,
                  priorWinnerEntryIds: excluded,
                }
              : a,
          ),
          entries,
          winners: state.winners.map((w) => (w.auctionId === auctionId ? newWinner : w)),
          notifications,
          audit: [...state.audit, audit],
        })
        return { ok: true, nextAmount: next.amount }
      },

      generateBotEntries: (auctionId, count) => {
        const state = get()
        const auction = state.auctions.find((a) => a.id === auctionId)
        if (!auction) return { ok: false, created: 0, error: 'Auction not found.' }
        if (auction.status !== 'live' && auction.status !== 'upcoming') {
          return { ok: false, created: 0, error: 'Bots can only join an open or upcoming auction.' }
        }
        const n = Math.max(0, Math.min(5000, Math.floor(count)))
        if (!n) return { ok: true, created: 0 }

        const currentUserId = state.currentUserId
        const reservedAmounts = new Set(
          state.bids
            .filter((b) => b.auctionId === auctionId && b.userId === currentUserId)
            .map((b) => b.amount.toFixed(2)),
        )
        const users = [...state.users]
        const payments = [...state.payments]
        const entries = [...state.entries]
        const bids = [...state.bids]
        const audit = [...state.audit]
        const now = Date.now()
        const windowStart = Math.max(new Date(auction.startAt).getTime(), now - 3 * 24 * 3600_000)
        let created = 0
        let sampleBid: Bid | null = null

        for (let i = 0; i < n; i++) {
          const suffix = crypto.randomUUID().slice(0, 8)
          const user: User = {
            id: `u-gen-${suffix}`,
            phone: `+2517${String(Math.floor(10000000 + Math.random() * 89999999))}`,
            name: BOT_NAMES_RUNTIME[i % BOT_NAMES_RUNTIME.length],
            walletBalance: 0,
            language: 'en',
            isBot: true,
            createdAt: nowIso(),
          }
          users.push(user)
          const at = new Date(windowStart + Math.random() * Math.max(60_000, now - windowStart - 30_000)).toISOString()
          const payment: Payment = {
            id: uid('pay'),
            ref: ref(),
            auctionId,
            userId: user.id,
            phone: user.phone,
            amount: auction.entryFee,
            status: 'success',
            createdAt: at,
            confirmedAt: new Date(new Date(at).getTime() + Math.floor(8000 + Math.random() * 22000)).toISOString(),
          }
          payments.push(payment)
          const entry: Entry = {
            id: uid('ent'),
            auctionId,
            userId: user.id,
            paymentId: payment.id,
            createdAt: payment.confirmedAt as string,
            status: 'active',
            isBot: true,
          }
          entries.push(entry)

          let amount = round2(0.13 + Math.random() * 8.0)
          let guard = 0
          while (reservedAmounts.has(amount.toFixed(2)) && guard++ < 40) {
            amount = round2(amount + 0.01)
          }
          const timestamp = new Date(new Date(entry.createdAt).getTime() + 20_000).toISOString()
          const salt = randomSalt(8)
          const bid: Bid = {
            id: uid('bid'),
            auctionId,
            entryId: entry.id,
            userId: user.id,
            amount,
            timestamp,
            salt,
            hash: hashBid({ auctionId, userId: user.id, amount, timestamp, salt }),
            valid: true,
          }
          bids.push(bid)
          entry.bidId = bid.id
          if (!sampleBid) sampleBid = bid
          created++
        }

        audit.push(
          makeAudit({
            auctionId,
            type: 'demo.generated',
            actor: 'Demo controls',
            message: `${created} simulated participant${created === 1 ? '' : 's'} joined with sealed random bids.`,
            meta: { created },
          }),
        )
        if (sampleBid) {
          audit.push(
            makeAudit({
              auctionId,
              type: 'bid.locked',
              actor: 'System',
              message: `Sample simulated sealed bid locked at ETB ${sampleBid.amount.toFixed(2)}.`,
              hash: sampleBid.hash,
            }),
          )
        }
        set({ users, payments, entries, bids, audit })
        return { ok: true, created }
      },

      reachMinimum: (auctionId) => {
        const state = get()
        const auction = state.auctions.find((a) => a.id === auctionId)
        if (!auction) return { ok: false, created: 0, error: 'Auction not found.' }
        const current = paidEntryCount(state, auctionId)
        const needed = Math.max(0, auction.minEntries - current)
        if (!needed) return { ok: true, created: 0 }
        return get().generateBotEntries(auctionId, needed)
      },

      triggerPaymentOutcome: (auctionId, outcome) => {
        const state = get()
        const user = state.users.find((u) => u.id === state.currentUserId)
        if (!user) return { ok: false, error: 'Sign in first.' }

        if (outcome === 'reversed') {
          const latestSuccess = state.payments
            .filter(
              (p) =>
                p.auctionId === auctionId &&
                p.userId === user.id &&
                p.status === 'success',
            )
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
          if (latestSuccess) return get().reversePayment(latestSuccess.id)
          const intent = get().initiatePayment(auctionId)
          if (!intent.ok || !intent.payment) return { ok: false, error: intent.error }
          const resolved = get().resolvePayment(intent.payment.id, 'success')
          if (!resolved.ok) return { ok: false, error: resolved.error }
          return get().reversePayment(intent.payment.id)
        }

        const pending = state.payments
          .filter(
            (p) =>
              p.auctionId === auctionId &&
              p.userId === user.id &&
              p.status === 'pending',
          )
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
        if (pending) return get().resolvePayment(pending.id, outcome)
        const intent = get().initiatePayment(auctionId)
        if (!intent.ok || !intent.payment) return { ok: false, error: intent.error }
        return get().resolvePayment(intent.payment.id, outcome)
      },

      startGuidedDemo: () => {
        const fresh = createSeedState()
        set({ ...fresh, guided: { active: true, step: 0 }, adminAuthed: true })
      },

      setGuidedStep: (step) => {
        const guided: GuidedState = { active: true, step }
        set({ guided })
      },

      endGuidedDemo: () => set({ guided: { active: false, step: 0 } }),

      resetDemo: () => {
        const fresh = createSeedState()
        set({ ...fresh })
      },
    }),
    {
      name: 'bidora-demo-v2',
      version: 1,
      migrate: () => createSeedState(),
    },
  ),
)

/* ------------------------------------------------------------------ */
/* Shared selectors                                                    */
/* ------------------------------------------------------------------ */

export function useCurrentUser(): User | undefined {
  return useStore((state) => state.users.find((u) => u.id === state.currentUserId))
}

export function useAuction(id: string | undefined): Auction | undefined {
  return useStore((state) => state.auctions.find((a) => a.id === id))
}

export function getAuctionBids(state: StoreState, auctionId: string): Bid[] {
  return state.bids.filter((b) => b.auctionId === auctionId)
}

export function getAuctionStats(state: StoreState, auctionId: string) {
  const auction = state.auctions.find((a) => a.id === auctionId)
  const paymentById = new Map(state.payments.map((p) => [p.id, p]))
  const auctionEntries = state.entries.filter((e) => e.auctionId === auctionId)
  const paid = auctionEntries.filter((e) => paidEntry(e, paymentById))
  const validBids = state.bids.filter((b) => b.auctionId === auctionId && b.valid)
  const successPayments = state.payments.filter(
    (p) => p.auctionId === auctionId && p.status === 'success',
  )
  const amountCounts = new Map<string, number>()
  for (const bid of validBids) {
    const key = bid.amount.toFixed(2)
    amountCounts.set(key, (amountCounts.get(key) ?? 0) + 1)
  }
  const uniqueCount = [...amountCounts.values()].filter((count) => count === 1).length
  return {
    participants: new Set(paid.map((e) => e.userId)).size,
    entries: paid.length,
    bids: validBids.length,
    grossRevenue: successPayments.reduce((sum, p) => sum + p.amount, 0),
    progressPct: auction ? Math.min(100, (paid.length / Math.max(1, auction.minEntries)) * 100) : 0,
    uniqueBidCount: uniqueCount,
  }
}

export function useAuctionStats(auctionId: string | undefined) {
  const state = useStore((s) => s)
  return useMemo(() => (auctionId ? getAuctionStats(state, auctionId) : undefined), [state, auctionId])
}

export function useMyEntries() {
  const state = useStore((s) => s)
  return useMemo(() => {
    const paymentById = new Map(state.payments.map((p) => [p.id, p]))
    return state.entries
      .filter((e) => e.userId === state.currentUserId)
      .map((entry) => {
        const auction = state.auctions.find((a) => a.id === entry.auctionId)
        const payment = paymentById.get(entry.paymentId)
        const bid = entry.bidId ? state.bids.find((b) => b.id === entry.bidId) : undefined
        const refund = state.refunds
          .filter((r) => r.entryId === entry.id)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
        return { entry, auction, payment, bid, refund }
      })
      .sort((a, b) => new Date(b.entry.createdAt).getTime() - new Date(a.entry.createdAt).getTime())
  }, [state])
}

export function useMyPendingPayments() {
  const state = useStore((s) => s)
  return useMemo(() => {
    const user = state.users.find((u) => u.id === state.currentUserId)
    if (!user) return []
    return state.payments
      .filter((p) => p.userId === user.id && p.status === 'pending')
      .map((payment) => ({
        payment,
        auction: state.auctions.find((a) => a.id === payment.auctionId),
      }))
      .sort((a, b) => new Date(b.payment.createdAt).getTime() - new Date(a.payment.createdAt).getTime())
  }, [state])
}

export function useMyNotifications() {
  const state = useStore((s) => s)
  return useMemo(
    () =>
      state.notifications
        .filter((n) => n.userId === state.currentUserId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [state],
  )
}

export function useUnreadCount() {
  return useStore(
    (state) =>
      state.notifications.filter((n) => n.userId === state.currentUserId && !n.read).length,
  )
}

export function useAuctionEntries(auctionId: string | undefined) {
  const state = useStore((s) => s)
  return useMemo(
    () =>
      auctionId
        ? state.entries.filter(
            (e) => e.auctionId === auctionId && e.userId === state.currentUserId,
          )
        : [],
    [state, auctionId],
  )
}

export function usePendingRefunds(auctionId?: string) {
  const state = useStore((s) => s)
  return useMemo(
    () =>
      state.refunds.filter(
        (r) => r.status === 'pending' && (!auctionId || r.auctionId === auctionId),
      ),
    [state, auctionId],
  )
}

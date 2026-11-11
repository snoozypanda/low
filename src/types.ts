export type Language = 'en' | 'am'

export type AuctionStatus = 'upcoming' | 'live' | 'closed' | 'void' | 'cancelled'
export type PaymentStatus = 'pending' | 'success' | 'failed' | 'cancelled' | 'timeout' | 'reversed'
export type EntryStatus =
  | 'active'
  | 'won'
  | 'lost'
  | 'not_unique'
  | 'refunded'
  | 'void'
  | 'cancelled'
  | 'invalidated'
  | 'unspent'
export type RefundReason = 'void' | 'cancelled' | 'reversed' | 'unspent_credit' | 'max_entries'
export type RefundStatus = 'pending' | 'processed'
export type FulfilmentStatus = 'none' | 'dispatched' | 'delivered'
export type FulfilmentMethod = 'delivery' | 'pickup'
export type NotificationKind = 'entry' | 'closing' | 'won' | 'refund' | 'system' | 'fulfilment' | 'payment'
export type AuditType =
  | 'auction.created'
  | 'auction.updated'
  | 'auction.closed'
  | 'auction.cancelled'
  | 'auction.void'
  | 'payment.pending'
  | 'payment.confirmed'
  | 'payment.failed'
  | 'payment.cancelled'
  | 'payment.timeout'
  | 'payment.reversed'
  | 'payment.replay_ignored'
  | 'bid.locked'
  | 'bid.invalidated'
  | 'winner.calculated'
  | 'winner.next'
  | 'refund.created'
  | 'refund.processed'
  | 'fulfilment.updated'
  | 'demo.generated'

export interface User {
  id: string
  phone: string
  name: string
  walletBalance: number
  language: Language
  isBot?: boolean
  createdAt: string
}

export interface EconomicsInputs {
  productCost: number
  vatPct: number
  paymentFeePct: number
  refundReservePct: number
  revenueSharePct: number
  deliveryCost: number
  marketingPct: number
  supportCost: number
  hostingCost: number
}

export interface Auction {
  id: string
  title: string
  titleAm: string
  description: string
  descriptionAm: string
  category: string
  image: string
  gallery: string[]
  retailValue: number
  entryFee: number
  views: number
  bidMin: number
  bidMax?: number
  bidStep: number
  minEntries: number
  maxEntriesPerUser: number
  startAt: string
  endAt: string
  status: AuctionStatus
  createdAt: string
  closedAt?: string
  closeReason?: 'scheduled' | 'manual' | 'void' | 'cancelled' | 'min_entries'
  winnerEntryId?: string
  winningAmount?: number
  priorWinnerEntryIds?: string[]
  economics?: Partial<EconomicsInputs>
}

export interface Payment {
  id: string
  ref: string
  auctionId: string
  userId: string
  phone: string
  amount: number
  status: PaymentStatus
  createdAt: string
  confirmedAt?: string
  note?: string
  replayed?: boolean
}

export interface Bid {
  id: string
  auctionId: string
  entryId: string
  userId: string
  amount: number
  timestamp: string
  salt: string
  hash: string
  valid: boolean
  invalidatedAt?: string
  invalidatedReason?: string
}

export interface Entry {
  id: string
  auctionId: string
  userId: string
  paymentId: string
  createdAt: string
  bidId?: string
  status: EntryStatus
  isBot?: boolean
}

export interface Refund {
  id: string
  auctionId: string
  entryId?: string
  paymentId?: string
  userId: string
  amount: number
  reason: RefundReason
  status: RefundStatus
  createdAt: string
  processedAt?: string
  note?: string
}

export interface WinnerRecord {
  auctionId: string
  entryId: string
  userId: string
  amount: number
  fulfilment: FulfilmentStatus
  method?: FulfilmentMethod
  address?: string
  pickupLocation?: string
  deadlineAt: string
  createdAt: string
  updatedAt: string
}

export interface AuditEvent {
  id: string
  auctionId: string
  type: AuditType
  actor: string
  message: string
  timestamp: string
  hash?: string
  meta?: Record<string, string | number | boolean | null>
}

export interface Notification {
  id: string
  userId: string
  kind: NotificationKind
  title: string
  titleAm: string
  body: string
  bodyAm: string
  createdAt: string
  read: boolean
  sms: boolean
  auctionId?: string
}

export interface IgnoredPaymentEvent {
  id: string
  ref: string
  paymentId?: string
  reason: string
  createdAt: string
  note: string
}

export interface Settings {
  revenueSharePct: number
  vatPct: number
  paymentFeePct: number
  defaultMaxEntries: number
  defaultMinEntries: number
}

export interface GuidedState {
  active: boolean
  step: number
}

export interface Toast {
  id: string
  title: string
  message?: string
  tone: 'success' | 'error' | 'info' | 'warning'
}

export interface BidGroup {
  amount: number
  label: string
  bids: Bid[]
  count: number
  unique: boolean
  isWinning: boolean
}

export interface WinnerCalculation {
  groups: BidGroup[]
  uniqueGroups: BidGroup[]
  winner: Bid | null
  outcome: 'winner' | 'void'
  steps: string[]
  totalBids: number
  eliminatedCount: number
}

export interface EconomicsResult {
  grossFees: number
  vat: number
  paymentFees: number
  refunds: number
  netRegistration: number
  safaricomShare: number
  productCost: number
  otherCosts: number
  marketing: number
  deliveryCost: number
  supportCost: number
  hostingCost: number
  contribution: number
  breakEvenEntrants: number
  currentEntrants: number
  breakEvenReached: boolean
}

export interface AuctionStats {
  participants: number
  entries: number
  paidEntries: number
  bids: number
  grossRevenue: number
  progressPct: number
  uniqueBidCount: number
}

import { sha256 } from '@noble/hashes/sha256'
import { bytesToHex } from '@noble/hashes/utils'
import type {
  Auction,
  Bid,
  BidGroup,
  EconomicsInputs,
  EconomicsResult,
  Entry,
  Payment,
  Refund,
  Settings,
  WinnerCalculation,
} from '../types'

/* ------------------------------------------------------------------ */
/* Hashing — every sealed bid gets a salted SHA-256 receipt            */
/* ------------------------------------------------------------------ */

export function randomSalt(bytes = 16): string {
  const arr = new Uint8Array(bytes)
  crypto.getRandomValues(arr)
  return bytesToHex(arr)
}

export function hashBid(input: {
  auctionId: string
  userId: string
  amount: number
  timestamp: string
  salt: string
}): string {
  const payload = [
    input.auctionId,
    input.userId,
    input.amount.toFixed(2),
    input.timestamp,
    input.salt,
  ].join('|')
  return bytesToHex(sha256(new TextEncoder().encode(payload)))
}

export function shortHash(hash: string, length = 12): string {
  if (!hash) return '—'
  return `${hash.slice(0, length)}…${hash.slice(-6)}`
}

/* ------------------------------------------------------------------ */
/* Sealed bid validation                                               */
/* ------------------------------------------------------------------ */

export function validateBidAmount(amount: number, auction: Auction): { valid: boolean; error?: string } {
  if (!Number.isFinite(amount)) return { valid: false, error: 'Enter a bid amount.' }
  if (amount < auction.bidMin) {
    return { valid: false, error: `Minimum bid is ETB ${auction.bidMin.toFixed(2)}.` }
  }
  if (amount > auction.bidMax) {
    return { valid: false, error: `Maximum bid is ETB ${auction.bidMax.toFixed(2)}.` }
  }
  const steps = Math.round((amount - auction.bidMin) / auction.bidStep)
  const snapped = auction.bidMin + steps * auction.bidStep
  if (Math.abs(snapped - amount) > 0.000001) {
    return { valid: false, error: `Bids must use ETB ${auction.bidStep.toFixed(2)} steps.` }
  }
  return { valid: true }
}

/* ------------------------------------------------------------------ */
/* Winner determination                                                */
/* ------------------------------------------------------------------ */

/**
 * Group bids by exact amount. The winner is the lowest amount with a
 * count of exactly one. Ties are eliminated. Excluded entries (e.g. a
 * previous winner who failed verification) are skipped.
 */
export function determineWinner(bids: Bid[], excludeEntryIds: string[] = []): WinnerCalculation {
  const excluded = new Set(excludeEntryIds)
  const validBids = bids.filter((b) => b.valid && !excluded.has(b.entryId))
  const map = new Map<string, Bid[]>()

  for (const bid of validBids) {
    const key = bid.amount.toFixed(2)
    const list = map.get(key) ?? []
    list.push(bid)
    map.set(key, list)
  }

  const groups: BidGroup[] = [...map.entries()]
    .map(([label, list]) => ({
      amount: Number(label),
      label,
      bids: list,
      count: list.length,
      unique: list.length === 1,
      isWinning: false,
    }))
    .sort((a, b) => a.amount - b.amount)

  const uniqueGroups = groups.filter((g) => g.unique)
  const winnerBid = uniqueGroups[0]?.bids[0] ?? null
  if (winnerBid) {
    const group = groups.find((g) => g.label === winnerBid.amount.toFixed(2))
    if (group) group.isWinning = true
  }

  const duplicateBids = groups.filter((g) => !g.unique).reduce((sum, g) => sum + g.count, 0)
  const steps: string[] = [
    `${validBids.length} valid sealed bid${validBids.length === 1 ? '' : 's'} received.`,
    `Bids grouped into ${groups.length} distinct amount${groups.length === 1 ? '' : 's'}.`,
    `${duplicateBids} bid${duplicateBids === 1 ? '' : 's'} eliminated because the same amount was submitted more than once.`,
    uniqueGroups.length
      ? `Unique amounts: ${uniqueGroups.map((g) => `ETB ${g.label}`).join(', ')}.`
      : 'No amount was submitted by exactly one participant.',
    winnerBid
      ? `Lowest unique amount: ETB ${winnerBid.amount.toFixed(2)} — exactly one bid.`
      : 'No unique bid exists, so the auction is void and entry fees are refunded.',
  ]

  return {
    groups,
    uniqueGroups,
    winner: winnerBid,
    outcome: winnerBid ? 'winner' : 'void',
    steps,
    totalBids: validBids.length,
    eliminatedCount: duplicateBids,
  }
}

/** The next lowest unique bid, skipping entries that already had their turn. */
export function nextUniqueBid(bids: Bid[], excludeEntryIds: string[] = []): Bid | null {
  return determineWinner(bids, excludeEntryIds).winner
}

export function auctionMinReached(auction: Auction, entries: Entry[]): boolean {
  const paid = entries.filter(
    (e) => e.auctionId === auction.id && ['active', 'won', 'lost', 'not_unique'].includes(e.status),
  )
  return paid.length >= auction.minEntries
}

export function paidEntriesForAuction(auctionId: string, entries: Entry[]): Entry[] {
  return entries.filter(
    (e) =>
      e.auctionId === auctionId &&
      ['active', 'won', 'lost', 'not_unique', 'unspent'].includes(e.status),
  )
}

export function auctionWindowState(auction: Auction, now = Date.now()): 'upcoming' | 'open' | 'ended' {
  const start = new Date(auction.startAt).getTime()
  const end = new Date(auction.endAt).getTime()
  if (now < start) return 'upcoming'
  if (now >= end) return 'ended'
  return 'open'
}

/* ------------------------------------------------------------------ */
/* Unit economics                                                      */
/* ------------------------------------------------------------------ */

export function defaultEconomics(auction: Auction, settings: Settings): EconomicsInputs {
  return {
    productCost: Math.round(auction.retailValue * 0.62),
    vatPct: settings.vatPct,
    paymentFeePct: settings.paymentFeePct,
    refundReservePct: 1,
    revenueSharePct: settings.revenueSharePct,
    deliveryCost: 350,
    marketingPct: 5,
    supportCost: 1800,
    hostingCost: 650,
    ...(auction.economics ?? {}),
  }
}

export function calculateEconomics(input: {
  auction: Auction
  settings: Settings
  payments: Payment[]
  refunds: Refund[]
  currentEntrants: number
}): { inputs: EconomicsInputs; result: EconomicsResult } {
  const { auction, settings, payments, refunds, currentEntrants } = input
  const inputs = defaultEconomics(auction, settings)

  const successful = payments.filter((p) => p.auctionId === auction.id && p.status === 'success')
  const grossFees = successful.length * auction.entryFee
  const vat = grossFees * (inputs.vatPct / (100 + inputs.vatPct))
  const paymentFees = grossFees * (inputs.paymentFeePct / 100)
  const refunded = refunds
    .filter((r) => r.auctionId === auction.id)
    .reduce((sum, r) => sum + r.amount, 0)
  const netRegistration = grossFees - vat - paymentFees - refunded
  const safaricomShare = Math.max(0, netRegistration) * (inputs.revenueSharePct / 100)
  const marketing = grossFees * (inputs.marketingPct / 100)
  const otherCosts =
    inputs.deliveryCost + marketing + inputs.supportCost + inputs.hostingCost
  const contribution =
    netRegistration - safaricomShare - inputs.productCost - otherCosts

  const vatPer = auction.entryFee * (inputs.vatPct / (100 + inputs.vatPct))
  const payPer = auction.entryFee * (inputs.paymentFeePct / 100)
  const reservePer = auction.entryFee * (inputs.refundReservePct / 100)
  const marketingPer = auction.entryFee * (inputs.marketingPct / 100)
  const netPerBeforeShare = auction.entryFee - vatPer - payPer - reservePer
  const sharePer = netPerBeforeShare * (inputs.revenueSharePct / 100)
  const contributionPerEntrant = netPerBeforeShare - sharePer - marketingPer
  const fixedCosts = inputs.productCost + inputs.deliveryCost + inputs.supportCost + inputs.hostingCost
  const breakEvenEntrants =
    contributionPerEntrant > 0 ? Math.ceil(fixedCosts / contributionPerEntrant) : Number.POSITIVE_INFINITY

  return {
    inputs,
    result: {
      grossFees,
      vat,
      paymentFees,
      refunds: refunded,
      netRegistration,
      safaricomShare,
      productCost: inputs.productCost,
      otherCosts,
      marketing,
      deliveryCost: inputs.deliveryCost,
      supportCost: inputs.supportCost,
      hostingCost: inputs.hostingCost,
      contribution,
      breakEvenEntrants,
      currentEntrants,
      breakEvenReached: currentEntrants >= breakEvenEntrants,
    },
  }
}

/* ------------------------------------------------------------------ */
/* Small formatting / masking helpers used by the auction engine UI    */
/* ------------------------------------------------------------------ */

export function maskPhone(phone: string): string {
  let digits = phone.replace(/\D/g, '')
  if (digits.startsWith('2519')) digits = `2517${digits.slice(4)}`
  else if (digits.startsWith('09')) digits = `07${digits.slice(2)}`
  else if (digits.startsWith('9') && digits.length === 9) digits = `7${digits.slice(1)}`

  const local = digits.startsWith('251')
    ? `0${digits.slice(3)}`
    : digits.startsWith('0')
      ? digits
      : `0${digits}`
  if (local.length < 7) return '07XX XXX XXX'
  return `${local.slice(0, 2)}XX XXX ${local.slice(-3)}`
}

export function paymentSuccessRate(payments: Payment[]): number {
  const resolved = payments.filter((p) => !p.replayed)
  if (!resolved.length) return 0
  const success = resolved.filter((p) => p.status === 'success').length
  return (success / resolved.length) * 100
}

export function avgConfirmationSeconds(payments: Payment[]): number {
  const confirmed = payments.filter((p) => p.status === 'success' && p.confirmedAt)
  if (!confirmed.length) return 0
  const total = confirmed.reduce((sum, p) => {
    return sum + (new Date(p.confirmedAt as string).getTime() - new Date(p.createdAt).getTime()) / 1000
  }, 0)
  return total / confirmed.length
}

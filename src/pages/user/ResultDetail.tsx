import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  Clock3,
  Eye,
  EyeOff,
  FileClock,
  Hash,
  Lock,
  ReceiptText,
  ShieldAlert,
  Trophy,
  Users,
  XCircle,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ProductImage } from '../../components/ProductImage'
import { Badge, Button, Card, CopyButton, EmptyState, Progress, StatusBadge, cn } from '../../components/ui'
import { useT } from '../../i18n'
import { determineWinner, maskPhone } from '../../lib/engine'
import { formatBid, formatDateTime, formatETB, formatPercent } from '../../lib/format'
import { useAuction, useStore } from '../../store/useStore'
import type { BidGroup } from '../../types'

export default function ResultDetail() {
  const { id } = useParams()
  const t = useT()
  const language = useStore((state) => state.language)
  const navigate = useNavigate()
  const auction = useAuction(id)
  const bids = useStore((state) => state.bids)
  const entries = useStore((state) => state.entries)
  const users = useStore((state) => state.users)
  const currentUserId = useStore((state) => state.currentUserId)
  const refunds = useStore((state) => state.refunds)
  const audit = useStore((state) => state.audit)
  const [showBids, setShowBids] = useState(true)
  const [showAudit, setShowAudit] = useState(true)

  if (!auction) {
    return (
      <div className="flex min-h-full items-center justify-center p-6">
        <EmptyState title="Result not found" body="This auction is no longer in the demo results." />
      </div>
    )
  }

  const auctionBids = bids.filter((b) => b.auctionId === auction.id && b.valid)
  const calculation = determineWinner(auctionBids)
  const auctionEntries = entries
    .filter((e) => e.auctionId === auction.id)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  const entryLabel = new Map(auctionEntries.map((entry, index) => [entry.id, String.fromCharCode(65 + index)]))
  const myEntries = auctionEntries.filter((e) => e.userId === currentUserId)
  const myEntry = myEntries[0]
  const myBid = myEntry?.bidId ? bids.find((b) => b.id === myEntry.bidId) : undefined
  const myRefund = refunds
    .filter((r) => r.auctionId === auction.id && r.userId === currentUserId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
  const winnerEntry = auction.winnerEntryId ? entries.find((e) => e.id === auction.winnerEntryId) : undefined
  const winnerUser = winnerEntry ? users.find((u) => u.id === winnerEntry.userId) : undefined
  const iWon = winnerEntry?.userId === currentUserId && auction.status === 'closed'
  const closed = ['closed', 'void', 'cancelled'].includes(auction.status)
  const isVoid = auction.status === 'void'
  const isCancelled = auction.status === 'cancelled'
  const userMap = new Map(users.map((u) => [u.id, u]))
  const relevantAudit = audit.filter((event) => event.auctionId === auction.id)

  const timeline = [...relevantAudit].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  )

  const groups: BidGroup[] = calculation.groups

  return (
    <div className="min-h-full bg-page pb-6">
      <div className="relative h-[176px] w-full bg-[#10241A]">
        <ProductImage src={auction.image} alt={auction.title} eager className="h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B1A10]/85 via-[#0B1A10]/20 to-transparent" />
        <div className="absolute inset-x-4 bottom-3 text-white">
          <div className="flex items-center gap-1.5">
            {auction.status === 'closed' && auction.winningAmount !== undefined ? (
              <Badge tone="green">{t('resultWinner')}</Badge>
            ) : (
              <Badge tone="red">{isVoid ? t('resultVoid') : t('resultCancelled')}</Badge>
            )}
            <span className="text-[8.5px] font-bold uppercase tracking-[0.12em] text-white/70">{auction.category}</span>
          </div>
          <h1 className="mt-1.5 text-[20px] font-extrabold leading-tight tracking-[-0.035em]">
            {language === 'am' ? auction.titleAm : auction.title}
          </h1>
        </div>
      </div>

      <div className="px-4 pt-3">
        <Card className={cn('overflow-hidden', iWon ? 'border-[#CFE3C6]' : '')}>
          <div className={cn('px-4 py-3', iWon ? 'bg-brand-tint' : isVoid || isCancelled ? 'bg-[#FDECEF]' : 'bg-[#F7F9F6]')}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-ink-soft">
                  {isVoid ? t('resultVoid') : isCancelled ? t('resultCancelled') : t('winningBid')}
                </p>
                <p className={cn('mt-1 text-[28px] font-extrabold leading-none tracking-[-0.05em] amount-tabular', iWon ? 'text-brand-dark' : isVoid || isCancelled ? 'text-accent' : 'text-ink')}>
                  {auction.status === 'closed' && auction.winningAmount !== undefined
                    ? `ETB ${formatBid(auction.winningAmount)}`
                    : t('noWinner')}
                </p>
                <p className="mt-1 text-[10.5px] font-medium text-ink-muted">
                  {auction.status === 'closed' && winnerUser
                    ? `${t('wonBy')} ${entryLabel.get(winnerEntry?.id ?? '') ?? '—'} · ${maskPhone(winnerUser.phone)}`
                    : isVoid
                      ? t('voidNoUnique')
                      : t('cancelledMin')}
                </p>
              </div>
              <span className={cn('flex h-11 w-11 flex-none items-center justify-center rounded-2xl bg-white shadow-sm', iWon ? 'text-brand-dark' : 'text-accent')}>
                {iWon ? <Trophy className="h-5 w-5" /> : isVoid || isCancelled ? <XCircle className="h-5 w-5" /> : <CircleDollarSign className="h-5 w-5" />}
              </span>
            </div>
            <div className="mt-2.5 flex items-center justify-between text-[9px] font-semibold text-ink-muted">
              <span className="flex items-center gap-1"><Users className="h-2.5 w-2.5" /> {auctionEntries.length} {t('entries')}</span>
              <span className="flex items-center gap-1"><Clock3 className="h-2.5 w-2.5" /> {formatDateTime(auction.closedAt ?? auction.endAt, language)}</span>
            </div>
          </div>

          {myEntry ? (
            <div className="flex items-center gap-2 border-t border-line px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink-soft">{t('yourBid')}</p>
                <p className="text-[12px] font-extrabold text-ink">
                  {myBid ? `ETB ${formatBid(myBid.amount)}` : t('noBidSubmitted')}
                  <span className="ml-1.5 font-semibold text-ink-muted">
                    · {entryLabel.get(myEntry.id)} · {myEntry.status.replace(/_/g, ' ')}
                  </span>
                </p>
              </div>
              {myBid ? (
                <Link to={`/auction/${auction.id}/receipt/${myBid.id}`}>
                  <Button variant="secondary" size="sm" leftIcon={<ReceiptText className="h-3 w-3" />}>
                    {t('showReceipt')}
                  </Button>
                </Link>
              ) : null}
            </div>
          ) : (
            <div className="border-t border-line px-4 py-2.5 text-[10px] font-medium text-ink-muted">
              {t('noBidSubmitted')}
            </div>
          )}
        </Card>

        {iWon ? (
          <div className="mt-2.5 overflow-hidden rounded-2xl border border-[#CFE3C6] bg-gradient-to-br from-brand-dark to-brand p-3.5 text-white">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              <p className="text-[13px] font-extrabold">{t('congratulations')}</p>
            </div>
            <p className="mt-1 text-[10.5px] leading-relaxed text-white/80">{t('verifyToClaim')}</p>
            <Button
              variant="outlineWhite"
              size="sm"
              className="mt-2"
              rightIcon={<ArrowRight className="h-3 w-3" />}
              onClick={() => navigate(`/winner/${auction.id}`)}
            >
              {t('winnerFlow')}
            </Button>
          </div>
        ) : null}

        {myRefund ? (
          <div className="mt-2.5 flex items-center gap-2 rounded-2xl border border-[#D6E6FF] bg-[#EFF6FF] px-3 py-2.5 text-[#1D4F91]">
            <CircleDollarSign className="h-4 w-4 flex-none" />
            <p className="flex-1 text-[10px] leading-relaxed">
              {t('refundQueued')}: {formatETB(myRefund.amount)} · {myRefund.reason.replace(/_/g, ' ')}
            </p>
            <StatusBadge status={myRefund.status} />
          </div>
        ) : null}

        {isCancelled ? (
          <Card className="mt-2.5 p-3.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10.5px] font-bold text-ink">{t('minimumProgress')}</p>
              <span className="text-[10px] font-extrabold text-accent">{auctionEntries.length} / {auction.minEntries}</span>
            </div>
            <Progress value={(auctionEntries.length / Math.max(1, auction.minEntries)) * 100} tone="red" className="mt-1.5" />
            <p className="mt-1.5 text-[10px] leading-relaxed text-ink-muted">{t('cancelledMin')}</p>
          </Card>
        ) : null}

        <Card className="mt-2.5 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowBids((value) => !value)}
            className="flex w-full items-center justify-between gap-2 px-3.5 py-3"
          >
            <div className="text-left">
              <p className="text-[12px] font-bold text-ink">{t('allBids')}</p>
              <p className="text-[9px] font-medium text-ink-soft">{t('publicResults')}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone="grey">{calculation.totalBids} {t('entries')}</Badge>
              {showBids ? <ChevronUp className="h-4 w-4 text-ink-soft" /> : <ChevronDown className="h-4 w-4 text-ink-soft" />}
            </div>
          </button>

          {showBids ? (
            <div className="border-t border-line">
              {groups.length ? (
                <div className="divide-y divide-line">
                  {groups.map((group) => {
                    const mine = group.bids.some((bid) => bid.userId === currentUserId)
                    return (
                      <div
                        key={group.label}
                        className={cn(
                          'flex items-start gap-2 px-3.5 py-2.5',
                          group.isWinning && 'bg-brand-tint/70',
                          mine && !group.isWinning && 'bg-[#FFF9E9]',
                        )}
                      >
                        <div className={cn('mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-lg text-[10px] font-extrabold', group.isWinning ? 'bg-brand text-white' : group.unique ? 'bg-[#EAF2FF] text-[#1D5FB8]' : 'bg-[#FDECEF] text-accent')}>
                          {group.isWinning ? <Trophy className="h-3 w-3" /> : group.count}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[12px] font-extrabold text-ink amount-tabular">ETB {group.label}</span>
                            {group.isWinning ? (
                              <Badge tone="green">{t('winningBid')}</Badge>
                            ) : group.unique ? (
                              <Badge tone="blue">{t('unique')}</Badge>
                            ) : (
                              <Badge tone="red">{t('duplicate')}</Badge>
                            )}
                            {mine ? <Badge tone="amber">{t('yourBid')}</Badge> : null}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {group.bids.map((bid) => {
                              const user = userMap.get(bid.userId)
                              const entry = auctionEntries.find((e) => e.id === bid.entryId)
                              return (
                                <span
                                  key={bid.id}
                                  className="inline-flex items-center gap-1 rounded-full bg-white/80 px-1.5 py-0.5 text-[8.5px] font-semibold text-ink-muted ring-1 ring-line"
                                >
                                  <span className="font-bold text-ink">{entry ? entryLabel.get(entry.id) : '—'}</span>
                                  {bid.userId === currentUserId ? 'you' : maskPhone(user?.phone ?? '')}
                                </span>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="px-3.5 py-4 text-center text-[10.5px] text-ink-muted">{t('noBidSubmitted')}</p>
              )}
              <div className="flex items-center justify-between border-t border-line bg-[#FAFBF9] px-3.5 py-2">
                <span className="flex items-center gap-1 text-[9px] text-ink-soft">
                  <Lock className="h-2.5 w-2.5" /> {calculation.eliminatedCount} {t('duplicateEliminated')}
                </span>
                <span className="text-[9px] font-semibold text-ink-soft">{formatPercent((calculation.uniqueGroups.length / Math.max(1, groups.length)) * 100)} {t('unique')}</span>
              </div>
            </div>
          ) : null}
        </Card>

        <Card className="mt-2.5 overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-b border-line px-3.5 py-3">
            <div>
              <p className="text-[12px] font-bold text-ink">{t('calcSteps')}</p>
              <p className="text-[9px] font-medium text-ink-soft">{t('howItWorks')}</p>
            </div>
            <Hash className="h-4 w-4 text-brand-dark" />
          </div>
          <div className="space-y-1 px-3.5 py-3">
            {calculation.steps.map((step, index) => (
              <div key={step} className="flex gap-2">
                <span className="mt-0.5 flex h-4 w-4 flex-none items-center justify-center rounded-full bg-page text-[8px] font-extrabold text-ink-muted">
                  {index + 1}
                </span>
                <p className="text-[10px] leading-relaxed text-ink-muted">{step}</p>
              </div>
            ))}
          </div>
          {winnerUser ? (
            <div className="border-t border-line bg-[#FAFBF9] px-3.5 py-2">
              <p className="text-[9px] text-ink-soft">
                {t('winner')}: <span className="font-bold text-ink">{entryLabel.get(winnerEntry?.id ?? '')}</span> ·{' '}
                <span className="font-semibold text-ink-muted">{formatETB(auction.winningAmount ?? 0, 2)}</span> ·{' '}
                {maskPhone(winnerUser.phone)}
              </p>
            </div>
          ) : null}
        </Card>

        <Card className="mt-2.5 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAudit((value) => !value)}
            className="flex w-full items-center justify-between gap-2 px-3.5 py-3"
          >
            <div className="text-left">
              <p className="text-[12px] font-bold text-ink">{t('auditLog')}</p>
              <p className="text-[9px] font-medium text-ink-soft">{timeline.length} {t('auditEvent')}s</p>
            </div>
            <div className="flex items-center gap-1.5">
              <FileClock className="h-3.5 w-3.5 text-ink-soft" />
              {showAudit ? <ChevronUp className="h-4 w-4 text-ink-soft" /> : <ChevronDown className="h-4 w-4 text-ink-soft" />}
            </div>
          </button>
          {showAudit ? (
            <div className="border-t border-line px-3.5 py-2">
              {timeline.map((event, index) => (
                <div key={event.id} className="relative flex gap-2.5 pb-2.5 last:pb-0">
                  {index !== timeline.length - 1 ? <span className="absolute left-[7px] top-4 h-full w-px bg-line" /> : null}
                  <span className="relative mt-0.5 flex h-4 w-4 flex-none items-center justify-center rounded-full border-2 border-white bg-brand-tint">
                    <span className="h-1 w-1 rounded-full bg-brand-dark" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[9.5px] font-bold text-ink">{event.type.replace(/\./g, ' · ')}</p>
                      <span className="flex-none text-[8px] text-ink-soft">{formatDateTime(event.timestamp, language)}</span>
                    </div>
                    <p className="mt-0.5 text-[9.5px] leading-relaxed text-ink-muted">{event.message}</p>
                    <p className="mt-0.5 text-[8px] font-medium text-ink-soft">{event.actor}</p>
                    {event.hash ? (
                      <div className="mt-0.5 flex items-center gap-1">
                        <span className="truncate font-mono text-[8px] text-ink-soft">{event.hash.slice(0, 22)}…</span>
                        <CopyButton value={event.hash} label={t('copy')} language={language} />
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </Card>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button
            variant="secondary"
            size="md"
            full
            leftIcon={showBids ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            onClick={() => setShowBids((value) => !value)}
          >
            {showBids ? t('hideBids') : t('showBids')}
          </Button>
          <Link to={`/auction/${auction.id}`} className="contents">
            <Button size="md" full rightIcon={<ArrowRight className="h-4 w-4" />}>
              {t('viewAuction')}
            </Button>
          </Link>
        </div>

        {!closed ? (
          <div className="mt-2 flex items-center justify-center gap-1.5 rounded-xl bg-[#FFF7E8] px-3 py-2 text-[10px] font-semibold text-[#8A5200]">
            <ShieldAlert className="h-3 w-3" /> {t('bidsSealed')}
          </div>
        ) : null}
      </div>
    </div>
  )
}

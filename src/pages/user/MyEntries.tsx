import {
  ChevronRight,
  Clock3,
  CreditCard,
  Lock,
  Ticket,
  Trophy,
  Undo2,
  Wallet,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Countdown } from '../../components/Countdown'
import { ProductImage } from '../../components/ProductImage'
import { Badge, Button, Card, EmptyState, StatusBadge, Tabs, cn } from '../../components/ui'
import { useT } from '../../i18n'
import { formatBid, formatDateTime, formatETB } from '../../lib/format'
import { useCurrentUser, useMyEntries, useMyPendingPayments, useStore } from '../../store/useStore'

type EntryTab = 'all' | 'open' | 'history'

export default function MyEntries() {
  const t = useT()
  const language = useStore((state) => state.language)
  const user = useCurrentUser()
  const rows = useMyEntries()
  const pendingPayments = useMyPendingPayments()
  const [tab, setTab] = useState<EntryTab>('all')

  const liveRows = rows.filter(({ auction }) => auction?.status === 'live')
  const historyRows = rows.filter(({ auction }) => auction && auction.status !== 'live')
  const wonRows = rows.filter(({ entry }) => entry.status === 'won')
  const shown = tab === 'all' ? rows : tab === 'open' ? liveRows : historyRows

  return (
    <div className="min-h-full bg-page pb-5">
      <div className="px-4 pb-2 pt-3">
        <h2 className="text-[20px] font-extrabold tracking-[-0.03em] text-ink">{t('myEntries')}</h2>
        <p className="mt-0.5 text-[11px] text-ink-muted">{t('bidOnce')}</p>
      </div>

      <div className="grid grid-cols-3 gap-2 px-4">
        <StatCard icon={<Ticket className="h-3.5 w-3.5" />} label={t('active')} value={String(liveRows.length)} />
        <StatCard icon={<Trophy className="h-3.5 w-3.5" />} label={t('won')} value={String(wonRows.length)} accent={wonRows.length > 0} />
        <StatCard icon={<Wallet className="h-3.5 w-3.5" />} label={t('owedCredit')} value={formatETB(user?.walletBalance ?? 0)} />
      </div>

      {pendingPayments.length ? (
        <div className="mt-3 px-4">
          <p className="mb-1.5 text-[9px] font-extrabold uppercase tracking-[0.15em] text-ink-soft">{t('pendingPayment')}</p>
          <div className="space-y-1.5">
            {pendingPayments.map(({ payment, auction }) => (
              <Link
                key={payment.id}
                to={auction ? `/auction/${auction.id}` : '/'}
                className="flex items-center gap-2.5 rounded-2xl border border-[#F2DFB8] bg-[#FFF7E8] p-2.5"
              >
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-white text-[#8A5200] shadow-sm">
                  <CreditCard className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11.5px] font-bold text-ink">{auction?.title ?? 'Auction'}</p>
                  <p className="text-[9.5px] font-medium text-[#8A5200]">
                    {payment.ref} · {formatETB(payment.amount)} · {t('pendingApproval')}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 flex-none text-[#8A5200]" />
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <div className="px-4 pt-3">
        <Tabs
          items={[
            { value: 'all', label: t('allEntries'), count: rows.length },
            { value: 'open', label: t('openEntries'), count: liveRows.length },
            { value: 'history', label: t('historyEntries'), count: historyRows.length },
          ]}
          value={tab}
          onChange={(value) => setTab(value as EntryTab)}
        />
      </div>

      <div className="space-y-2.5 px-4 pt-3">
        {shown.length ? (
          shown.map(({ entry, auction, bid, refund }) => {
            if (!auction) return null
            const claimable = entry.status === 'won'
            const canBid = entry.status === 'active' && !bid && auction.status === 'live'
            return (
              <Card key={entry.id} className="overflow-hidden p-2.5">
                <div className="flex gap-2.5">
                  <ProductImage
                    src={auction.image}
                    alt={auction.title}
                    className="h-[68px] w-[68px] flex-none rounded-xl"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="line-clamp-1 text-[12.5px] font-bold text-ink">
                          {language === 'am' ? auction.titleAm : auction.title}
                        </p>
                        <p className="mt-0.5 text-[9px] font-medium text-ink-soft">
                          {t('entry')} #{entry.id.slice(-5).toUpperCase()} · {formatDateTime(entry.createdAt, language)}
                        </p>
                      </div>
                      <StatusBadge status={entry.status} />
                    </div>

                    <div className="mt-1.5 grid grid-cols-3 gap-1">
                      <MiniStat label={t('paid')} value={formatETB(auction.entryFee)} />
                      <MiniStat
                        label={t('yourBid')}
                        value={bid ? `ETB ${formatBid(bid.amount)}` : '—'}
                        highlight={Boolean(bid)}
                      />
                      <MiniStat
                        label={auction.status === 'live' ? t('endsIn') : t('ended')}
                        value={
                          auction.status === 'live' ? (
                            <Countdown target={auction.endAt} size="tiny" className="text-[10px]" />
                          ) : (
                            auction.closedAt ? formatDateTime(auction.closedAt, language).split(',')[0] : '—'
                          )
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-2 flex items-center gap-1.5 border-t border-line pt-2">
                  {claimable ? (
                    <>
                      <span className="flex items-center gap-1 text-[9px] font-bold text-brand-dark">
                        <Trophy className="h-3 w-3" /> {t('lowestUniqueWins')}
                      </span>
                      <Link to={`/winner/${auction.id}`} className="ml-auto">
                        <Button size="sm" rightIcon={<ChevronRight className="h-3 w-3" />}>
                          {t('winnerFlow')}
                        </Button>
                      </Link>
                    </>
                  ) : canBid ? (
                    <>
                      <span className="flex items-center gap-1 text-[9px] font-semibold text-ink-muted">
                        <Lock className="h-3 w-3" /> {t('noBidYet')}
                      </span>
                      <Link to={`/auction/${auction.id}/bid?entry=${entry.id}`} className="ml-auto">
                        <Button size="sm">{t('submitBid')}</Button>
                      </Link>
                    </>
                  ) : entry.status === 'refunded' || entry.status === 'void' || entry.status === 'cancelled' ? (
                    <>
                      <span className="flex items-center gap-1 text-[9px] font-semibold text-[#1D5FB8]">
                        <Undo2 className="h-3 w-3" />
                        {refund
                          ? refund.status === 'processed'
                            ? t('refundedToWallet')
                            : t('refundPending')
                          : t('refundedNote')}
                      </span>
                      {refund ? (
                        <span className="ml-auto text-[10px] font-bold text-ink">{formatETB(refund.amount)}</span>
                      ) : null}
                    </>
                  ) : entry.status === 'unspent' ? (
                    <span className="flex items-center gap-1 text-[9px] font-semibold text-[#9A5B00]">
                      <Undo2 className="h-3 w-3" /> {t('unspent')} · {t('refundPending')}
                    </span>
                  ) : (
                    <>
                      <span className="flex items-center gap-1 text-[9px] font-semibold text-ink-muted">
                        <Clock3 className="h-3 w-3" /> {auction.status === 'live' ? t('bidsSealed') : t('ended')}
                      </span>
                      <Link
                        to={auction.status === 'live' ? `/auction/${auction.id}` : `/results/${auction.id}`}
                        className="ml-auto flex items-center gap-0.5 text-[10px] font-bold text-brand-dark"
                      >
                        {auction.status === 'live' ? t('viewAuction') : t('viewResults')}
                        <ChevronRight className="h-3 w-3" />
                      </Link>
                    </>
                  )}
                  {bid ? (
                    <Link
                      to={`/auction/${auction.id}/receipt/${bid.id}`}
                      className="ml-auto flex flex-none items-center gap-0.5 text-[9px] font-bold text-ink-muted underline decoration-line underline-offset-2"
                    >
                      {t('showReceipt')}
                    </Link>
                  ) : null}
                </div>
              </Card>
            )
          })
        ) : (
          <EmptyState
            icon={<Ticket className="h-5 w-5" />}
            title={t('noEntries')}
            body={t('noEntriesBody')}
            action={
              <Link to="/">
                <Button size="sm">{t('browseAuctions')}</Button>
              </Link>
            }
          />
        )}
      </div>

      <div className="mt-3 px-4">
        <div className={cn('rounded-2xl border border-line bg-white p-3 text-[10px] leading-relaxed text-ink-muted')}>
          <span className="font-bold text-ink">{t('owedCredit')}: </span>
          {t('walletNote')}
        </div>
      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: ReactNode
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className={cn('rounded-xl border px-2.5 py-2', accent ? 'border-[#CFE3C6] bg-brand-tint' : 'border-line bg-white')}>
      <span className={cn('flex items-center gap-1 text-[8px] font-bold uppercase tracking-[0.1em]', accent ? 'text-brand-dark' : 'text-ink-soft')}>
        {icon} {label}
      </span>
      <p className="mt-1 truncate text-[15px] font-extrabold leading-none text-ink amount-tabular">{value}</p>
    </div>
  )
}

function MiniStat({ label, value, highlight }: { label: string; value: ReactNode; highlight?: boolean }) {
  return (
    <div className="rounded-lg bg-page px-1.5 py-1">
      <p className="text-[7px] font-bold uppercase tracking-[0.08em] text-ink-soft">{label}</p>
      <p className={cn('mt-0.5 truncate text-[10px] font-extrabold', highlight ? 'text-brand-dark' : 'text-ink')}>{value}</p>
    </div>
  )
}

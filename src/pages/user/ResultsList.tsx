import { ArrowRight, CalendarDays, ChevronRight, Gavel, Hash, Trophy, Users, XCircle } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ProductImage } from '../../components/ProductImage'
import { Badge, Button, Card, EmptyState, StatusBadge, Tabs, cn } from '../../components/ui'
import { useT } from '../../i18n'
import { maskPhone } from '../../lib/engine'
import { formatDate, formatDateTime } from '../../lib/format'
import { useStore } from '../../store/useStore'

type ResultTab = 'all' | 'winners' | 'void'

export default function ResultsList() {
  const t = useT()
  const language = useStore((state) => state.language)
  const auctions = useStore((state) => state.auctions)
  const bids = useStore((state) => state.bids)
  const entries = useStore((state) => state.entries)
  const users = useStore((state) => state.users)
  const currentUserId = useStore((state) => state.currentUserId)
  const [tab, setTab] = useState<ResultTab>('all')

  const closed = auctions
    .filter((a) => ['closed', 'void', 'cancelled'].includes(a.status))
    .sort((a, b) => new Date(b.closedAt ?? b.endAt).getTime() - new Date(a.closedAt ?? a.endAt).getTime())

  const winners = closed.filter((a) => a.status === 'closed' && a.winnerEntryId)
  const empty = closed.filter((a) => a.status !== 'closed' || !a.winnerEntryId)
  const shown = tab === 'all' ? closed : tab === 'winners' ? winners : empty

  return (
    <div className="min-h-full bg-page pb-5">
      <div className="px-4 pb-2 pt-3">
        <h2 className="text-[20px] font-extrabold tracking-[-0.03em] text-ink">{t('results')}</h2>
        <p className="mt-0.5 text-[11px] leading-relaxed text-ink-muted">{t('publicResults')}</p>
      </div>

      <div className="px-4">
        <Card className="overflow-hidden border-[#CFE3C6] bg-gradient-to-br from-brand-dark to-brand p-3.5 text-white">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-2xl bg-white/15">
              <Gavel className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-white/65">{t('howItWorks')}</p>
              <p className="mt-0.5 text-[13px] font-bold">{t('lowestUniqueWins')}</p>
            </div>
          </div>
          <p className="mt-2.5 text-[10.5px] leading-relaxed text-white/75">{t('exampleText')}</p>
          <div className="mt-2.5 flex flex-wrap gap-1">
            {[
              ['A', 0.05, false],
              ['B', 0.05, false],
              ['C', 0.07, true],
              ['D', 0.09, false],
              ['E', 0.09, false],
              ['F', 0.12, false],
            ].map(([name, amount, win]) => (
              <span
                key={String(name)}
                className={cn(
                  'rounded-full border px-2 py-0.5 text-[8.5px] font-bold',
                  win ? 'border-white bg-white text-brand-dark' : 'border-white/25 bg-white/10 text-white/70 line-through',
                )}
              >
                {name} · {Number(amount).toFixed(2)}
              </span>
            ))}
          </div>
        </Card>
      </div>

      <div className="px-4 pt-3">
        <Tabs
          items={[
            { value: 'all', label: t('all'), count: closed.length },
            { value: 'winners', label: t('resultWinner'), count: winners.length },
            { value: 'void', label: `${t('void')} / ${t('cancelled')}`, count: empty.length },
          ]}
          value={tab}
          onChange={(value) => setTab(value as ResultTab)}
        />
      </div>

      <div className="space-y-2.5 px-4 pt-3">
        {shown.length ? (
          shown.map((auction) => {
            const winner = auction.winnerEntryId ? entries.find((e) => e.id === auction.winnerEntryId) : undefined
            const winnerUser = winner ? users.find((u) => u.id === winner.userId) : undefined
            const myEntry = entries.find((e) => e.auctionId === auction.id && e.userId === currentUserId)
            const bidCount = bids.filter((b) => b.auctionId === auction.id && b.valid).length
            const won = winner?.userId === currentUserId
            const wonBid = winner?.bidId ? bids.find((b) => b.id === winner.bidId) : undefined
            const isVoid = auction.status === 'void'
            const isCancelled = auction.status === 'cancelled'

            return (
              <Link key={auction.id} to={`/results/${auction.id}`} className="focus-ring block">
                <Card className="overflow-hidden transition hover:border-[#CFE3C6] active:scale-[0.997]">
                  <div className="flex gap-2.5 p-2.5">
                    <div className="relative flex-none">
                      <ProductImage src={auction.image} alt={auction.title} className="h-[82px] w-[82px] rounded-xl" />
                      <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-white text-brand-dark shadow-sm">
                        {auction.status === 'closed' && auction.winnerEntryId ? (
                          <Trophy className="h-3.5 w-3.5" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-accent" />
                        )}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-1 text-[13px] font-bold text-ink">
                          {language === 'am' ? auction.titleAm : auction.title}
                        </p>
                        <ChevronRight className="mt-0.5 h-3.5 w-3.5 flex-none text-ink-soft" />
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                        {auction.status === 'closed' && auction.winningAmount !== undefined ? (
                          <Badge tone="green">{t('winningBid')} ETB {auction.winningAmount.toFixed(2)}</Badge>
                        ) : isVoid ? (
                          <Badge tone="red">{t('resultVoid')}</Badge>
                        ) : (
                          <Badge tone="red">{t('resultCancelled')}</Badge>
                        )}
                        {won ? <Badge tone="dark">{t('won')}</Badge> : null}
                      </div>
                      <div className="mt-1.5 flex items-center gap-2 text-[9.5px] font-medium text-ink-muted">
                        <span className="flex items-center gap-1">
                          <Users className="h-2.5 w-2.5" /> {bidCount} {t('entries')}
                        </span>
                        <span className="h-0.5 w-0.5 rounded-full bg-ink-soft" />
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-2.5 w-2.5" /> {formatDate(auction.closedAt ?? auction.endAt, language)}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-1 text-[9.5px] font-semibold text-ink-soft">
                        {won
                          ? t('winnerCongratsBody', { amount: `ETB ${wonBid?.amount.toFixed(2) ?? auction.winningAmount?.toFixed(2)}` })
                          : auction.status === 'closed' && winnerUser
                            ? `${t('wonBy')} ${maskPhone(winnerUser.phone)}`
                            : isVoid
                              ? t('voidNoUnique')
                              : isCancelled
                                ? t('cancelledMin')
                                : t('noWinner')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-line bg-[#FAFBF9] px-3 py-1.5">
                    <span className="flex items-center gap-1 text-[9px] font-medium text-ink-soft">
                      <Hash className="h-2.5 w-2.5" /> {t('bidsSealed')} · {formatDateTime(auction.closedAt ?? auction.endAt, language)}
                    </span>
                    <span className="text-[9px] font-bold text-brand-dark">{t('viewDetails')}</span>
                  </div>
                </Card>
              </Link>
            )
          })
        ) : (
          <EmptyState
            icon={<Trophy className="h-5 w-5" />}
            title={t('noResults')}
            body={t('noResultsBody')}
            action={
              <Link to="/">
                <Button size="sm" rightIcon={<ArrowRight className="h-3 w-3" />}>
                  {t('browseAuctions')}
                </Button>
              </Link>
            }
          />
        )}
      </div>

      <div className="mt-3 flex items-center justify-center gap-1.5 text-[9px] font-medium text-ink-soft">
        <StatusBadge status="closed" dot={false} />
        {t('publicResults')}
      </div>
    </div>
  )
}

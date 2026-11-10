import {
  CalendarClock,
  ChevronRight,
  FastForward,
  Gavel,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Ticket,
  TrendingUp,
  Users,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Badge, Button, Card, Input, StatusBadge, Tabs, cn } from '../../components/ui'
import { useToast } from '../../components/Toast'
import { formatDate, formatDateTime, formatETB, formatNumber, formatPercent } from '../../lib/format'
import { useStore } from '../../store/useStore'
import type { AuctionStatus } from '../../types'
import { AdminPageHeader, AdminStat, AdminTableWrap, DataTable, EmptyTableRow, ExportButton, StatBar, Td, Th } from './components'

type Filter = 'all' | AuctionStatus

const filters: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'live', label: 'Live' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'closed', label: 'Closed' },
  { value: 'void', label: 'Void' },
  { value: 'cancelled', label: 'Cancelled' },
]

export default function AdminAuctions() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const state = useStore((s) => s)
  const fastForwardAuction = useStore((s) => s.fastForwardAuction)
  const closeAuction = useStore((s) => s.closeAuction)
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')

  const rows = useMemo(() => {
    const paymentById = new Map(state.payments.map((p) => [p.id, p]))
    const paid = state.entries.filter((entry) => {
      const payment = paymentById.get(entry.paymentId)
      return payment?.status === 'success' && !['invalidated', 'refunded', 'void', 'cancelled'].includes(entry.status)
    })
    return state.auctions
      .map((auction) => {
        const entries = paid.filter((e) => e.auctionId === auction.id).length
        const revenue = state.payments
          .filter((p) => p.auctionId === auction.id && p.status === 'success')
          .reduce((sum, p) => sum + p.amount, 0)
        return { auction, entries, revenue, participants: new Set(paid.filter((e) => e.auctionId === auction.id).map((e) => e.userId)).size }
      })
      .sort((a, b) => {
        const order: Record<AuctionStatus, number> = { live: 0, upcoming: 1, closed: 2, void: 3, cancelled: 4 }
        return order[a.auction.status] - order[b.auction.status] || new Date(b.auction.createdAt).getTime() - new Date(a.auction.createdAt).getTime()
      })
  }, [state])

  const filtered = rows.filter((row) => {
    if (filter !== 'all' && row.auction.status !== filter) return false
    const q = query.trim().toLowerCase()
    if (!q) return true
    return [row.auction.title, row.auction.titleAm, row.auction.category, row.auction.id]
      .some((value) => value.toLowerCase().includes(q))
  })

  const counts = {
    live: rows.filter((r) => r.auction.status === 'live').length,
    upcoming: rows.filter((r) => r.auction.status === 'upcoming').length,
    closed: rows.filter((r) => r.auction.status === 'closed').length,
    gross: rows.reduce((sum, r) => sum + r.revenue, 0),
    entries: rows.reduce((sum, r) => sum + r.entries, 0),
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Auction management"
        title="Auctions"
        description="Create products, follow entry minimums and use the real auction engine to close or fast-forward a sale."
        actions={
          <>
            <ExportButton
              filename="howlow-auctions.csv"
              rows={filtered.map(({ auction, entries, revenue, participants }) => ({
                id: auction.id,
                title: auction.title,
                category: auction.category,
                status: auction.status,
                retail_value_etb: auction.retailValue,
                entry_fee_etb: auction.entryFee,
                entries,
                participants,
                min_entries: auction.minEntries,
                revenue_etb: revenue,
                start_at: auction.startAt,
                end_at: auction.endAt,
                winner_entry_id: auction.winnerEntryId ?? '',
                winning_amount_etb: auction.winningAmount ?? '',
              }))}
            />
            <Button size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => navigate('/admin/auctions/new')}>
              New auction
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <AdminStat label="Total auctions" value={formatNumber(rows.length)} icon={Gavel} tone="dark" />
        <AdminStat label="Live now" value={formatNumber(counts.live)} icon={Sparkles} tone="green" sub={`${counts.upcoming} upcoming`} />
        <AdminStat label="Closed with winner" value={formatNumber(counts.closed)} icon={TrendingUp} tone="blue" />
        <AdminStat label="Paid entries" value={formatNumber(counts.entries)} icon={Ticket} tone="purple" />
        <AdminStat label="Gross fees" value={formatETB(counts.gross)} icon={Users} tone="amber" />
      </div>

      <Card className="p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Tabs
            items={filters.map((item) => ({
              ...item,
              count:
                item.value === 'all'
                  ? rows.length
                  : rows.filter((row) => row.auction.status === item.value).length,
            }))}
            value={filter}
            onChange={(value) => setFilter(value as Filter)}
            className="max-w-full overflow-x-auto"
          />
          <div className="relative w-full lg:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-soft" />
            <Input
              placeholder="Search auctions"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-9 pl-9 text-[11.5px]"
            />
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <AdminTableWrap>
          <DataTable className="min-w-[980px]">
            <thead>
              <tr>
                <Th>Auction</Th>
                <Th>Status</Th>
                <Th>Entries / minimum</Th>
                <Th>Entry fee</Th>
                <Th>Retail</Th>
                <Th>Gross fees</Th>
                <Th>Window</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <EmptyTableRow colSpan={8}>No auctions match this filter. Reset the demo to restore the seed set.</EmptyTableRow>
              ) : (
                filtered.map(({ auction, entries, revenue }) => {
                  const open = ['live', 'upcoming'].includes(auction.status)
                  return (
                    <tr key={auction.id} className="group transition hover:bg-brand-soft/40">
                      <Td>
                        <Link to={`/admin/auctions/${auction.id}`} className="focus-ring flex items-center gap-2.5">
                          <img
                            src={auction.image}
                            alt=""
                            className="h-9 w-11 flex-none rounded-lg border border-line object-cover"
                            loading="lazy"
                          />
                          <span className="min-w-0">
                            <span className="block truncate text-[12px] font-bold text-ink group-hover:text-brand-dark">{auction.title}</span>
                            <span className="block text-[9.5px] text-ink-muted">{auction.category} · {auction.id}</span>
                          </span>
                        </Link>
                      </Td>
                      <Td>
                        <StatusBadge status={auction.status} />
                      </Td>
                      <Td>
                        <div className="w-36">
                          <StatBar label={`${entries} of ${auction.minEntries}`} value={entries} max={auction.minEntries} tone={entries >= auction.minEntries ? 'green' : 'blue'} />
                        </div>
                      </Td>
                      <Td className="font-semibold amount-tabular">{formatETB(auction.entryFee)}</Td>
                      <Td className="text-[11px] text-ink-muted amount-tabular">{formatETB(auction.retailValue)}</Td>
                      <Td>
                        <span className="text-[11.5px] font-bold text-ink amount-tabular">{formatETB(revenue)}</span>
                        <span className="block text-[9px] text-ink-muted">{entries} entries · {formatPercent(auction.minEntries ? (entries / auction.minEntries) * 100 : 0)}</span>
                      </Td>
                      <Td>
                        <span className="flex items-center gap-1 text-[10.5px] text-ink-muted">
                          <CalendarClock className="h-3 w-3 flex-none" /> {formatDate(auction.endAt)}
                        </span>
                        <span className="block text-[9px] text-ink-soft">{auction.status === 'live' ? 'Closes' : 'Ended'} {formatDateTime(auction.endAt)}</span>
                      </Td>
                      <Td align="right">
                        <div className="flex items-center justify-end gap-1">
                          {open ? (
                            <button
                              type="button"
                              title="Fast-forward and close"
                              onClick={() => {
                                const result = fastForwardAuction(auction.id)
                                showToast({
                                  tone: result.ok ? 'success' : 'error',
                                  title: result.ok
                                    ? result.outcome === 'winner'
                                      ? `Closed · winner at ${formatETB(result.winningAmount ?? 0, 2)}`
                                      : `Closed · ${result.outcome}`
                                    : 'Could not close',
                                  message: result.ok ? auction.title : result.error,
                                })
                              }}
                              className="focus-ring flex h-7 w-7 items-center justify-center rounded-lg border border-line text-ink-muted hover:border-brand/40 hover:text-brand-dark"
                            >
                              <FastForward className="h-3.5 w-3.5" />
                            </button>
                          ) : null}
                          {auction.status === 'live' ? (
                            <button
                              type="button"
                              title="Close now"
                              onClick={() => {
                                const result = closeAuction(auction.id, 'manual')
                                showToast({
                                  tone: result.ok ? 'success' : 'error',
                                  title: result.ok ? 'Auction closed' : 'Could not close',
                                  message: result.ok ? `${auction.title} · ${result.outcome}` : result.error,
                                })
                              }}
                              className="focus-ring flex h-7 w-7 items-center justify-center rounded-lg border border-line text-ink-muted hover:border-brand/40 hover:text-brand-dark"
                            >
                              <Gavel className="h-3.5 w-3.5" />
                            </button>
                          ) : null}
                          <Link
                            to={`/admin/auctions/${auction.id}/edit`}
                            title="Edit auction"
                            className="focus-ring flex h-7 w-7 items-center justify-center rounded-lg border border-line text-ink-muted hover:border-brand/40 hover:text-brand-dark"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Link>
                          <Link
                            to={`/admin/auctions/${auction.id}`}
                            title="Open auction"
                            className="focus-ring flex h-7 w-7 items-center justify-center rounded-lg bg-page text-ink-muted hover:bg-brand-tint hover:text-brand-dark"
                          >
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </Td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </DataTable>
        </AdminTableWrap>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-3 py-2.5 text-[10px] text-ink-muted">
          <span>
            Showing <strong className="text-ink">{filtered.length}</strong> of {rows.length} auctions
          </span>
          <span className="inline-flex items-center gap-2">
            <Badge tone="green" dot>{counts.live} live</Badge>
            <Badge tone="blue">{counts.upcoming} upcoming</Badge>
            <Badge tone="grey">{rows.length - counts.live - counts.upcoming} closed</Badge>
          </span>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { title: 'Lowest unique bid', body: 'Bids are grouped by amount at close. The lowest amount submitted exactly once wins; duplicates are eliminated.', icon: Sparkles },
          { title: 'Minimum entries', body: 'If paid entries stay below the minimum, the auction is cancelled automatically and every entry fee is refunded.', icon: Ticket },
          { title: 'Idempotent payments', body: 'A replayed M-PESA callback never creates a duplicate entry. Ignored events stay visible in reconciliation.', icon: TrendingUp },
        ].map((item) => {
          const Icon = item.icon
          return (
            <Card key={item.title} className="p-3.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-tint text-brand-dark">
                <Icon className="h-4 w-4" />
              </span>
              <p className="mt-2 text-[11.5px] font-bold text-ink">{item.title}</p>
              <p className="mt-1 text-[10.5px] leading-relaxed text-ink-muted">{item.body}</p>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

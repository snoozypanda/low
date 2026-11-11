import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Eye,
  MapPin,
  PackageCheck,
  Search,
  ShieldCheck,
  Truck,
  Trophy,
  XCircle,
} from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AlertBox, Badge, Button, Card, Input, Modal, Tabs, cn } from '../../components/ui'
import { useToast } from '../../components/Toast'
import { formatBid, formatDate, formatDateTime, formatETB, formatNumber, timeAgo } from '../../lib/format'
import { maskPhone } from '../../lib/engine'
import { useStore } from '../../store/useStore'
import type { WinnerRecord } from '../../types'
import {
  AdminCard,
  AdminPageHeader,
  AdminStat,
  AdminTableWrap,
  DataTable,
  EmptyTableRow,
  ExportButton,
  Td,
  Th,
} from './components'

type Tab = 'all' | 'awaiting' | 'ready' | 'dispatched' | 'delivered'

const fulfilmentLabel: Record<string, string> = {
  none: 'Not started',
  dispatched: 'Dispatched',
  delivered: 'Delivered',
}

export default function AdminFulfilment() {
  const state = useStore((s) => s)
  const advanceFulfilment = useStore((s) => s.advanceFulfilment)
  const failWinnerAndOfferNext = useStore((s) => s.failWinnerAndOfferNext)
  const { showToast } = useToast()
  const [tab, setTab] = useState<Tab>('all')
  const [query, setQuery] = useState('')
  const [detailId, setDetailId] = useState<string | null>(null)
  const [failId, setFailId] = useState<string | null>(null)

  const data = useMemo(() => {
    const auctionById = new Map(state.auctions.map((a) => [a.id, a]))
    const userById = new Map(state.users.map((u) => [u.id, u]))
    const entryById = new Map(state.entries.map((e) => [e.id, e]))
    const bidByEntry = new Map(state.bids.map((b) => [b.entryId, b]))
    const rows = state.winners
      .map((winner) => {
        const auction = auctionById.get(winner.auctionId)
        const user = userById.get(winner.userId)
        const entry = entryById.get(winner.entryId)
        const bid = bidByEntry.get(winner.entryId)
        return { winner, auction, user, entry, bid }
      })
      .sort((a, b) => {
        const pendingA = isUnclaimed(a.winner) ? 0 : 1
        const pendingB = isUnclaimed(b.winner) ? 0 : 1
        if (pendingA !== pendingB) return pendingA - pendingB
        return new Date(a.winner.deadlineAt).getTime() - new Date(b.winner.deadlineAt).getTime()
      })

    return {
      rows,
      awaiting: state.winners.filter(isUnclaimed),
      ready: state.winners.filter((w) => w.fulfilment === 'none' && Boolean(w.method)),
      dispatched: state.winners.filter((w) => w.fulfilment === 'dispatched'),
      delivered: state.winners.filter((w) => w.fulfilment === 'delivered'),
      overdue: state.winners.filter(
        (w) => isUnclaimed(w) && new Date(w.deadlineAt).getTime() < Date.now(),
      ),
      prizeValue: state.winners.reduce((sum, w) => {
        const auction = auctionById.get(w.auctionId)
        return sum + (auction?.retailValue ?? 0)
      }, 0),
    }
  }, [state])

  const filtered = data.rows.filter(({ winner, user, auction }) => {
    if (tab === 'awaiting' && !isUnclaimed(winner)) return false
    if (tab === 'ready' && !(winner.fulfilment === 'none' && winner.method)) return false
    if (tab === 'dispatched' && winner.fulfilment !== 'dispatched') return false
    if (tab === 'delivered' && winner.fulfilment !== 'delivered') return false
    const q = query.trim().toLowerCase()
    if (!q) return true
    return [user?.name, user?.phone, auction?.title, winner.auctionId, winner.entryId]
      .some((value) => String(value ?? '').toLowerCase().includes(q))
  })

  const selected = data.rows.find((row) => row.winner.auctionId === detailId)
  const failTarget = data.rows.find((row) => row.winner.auctionId === failId)

  const advance = (winner: WinnerRecord) => {
    const result = advanceFulfilment(winner.auctionId)
    showToast({
      tone: result.ok ? 'success' : 'error',
      title: result.ok ? 'Fulfilment advanced' : 'Could not advance',
      message: result.ok ? `${winner.auctionId} · prize status updated and the winner notified.` : result.error,
    })
  }

  const failAndOffer = () => {
    if (!failTarget) return
    const result = failWinnerAndOfferNext(failTarget.winner.auctionId)
    showToast({
      tone: result.ok ? 'warning' : 'error',
      title: result.ok ? 'Prize offered to the next winner' : 'No next winner',
      message: result.ok
        ? result.nextAmount
          ? `New winning bid ETB ${result.nextAmount.toFixed(2)}.`
          : 'The next eligible bid was offered the prize.'
        : result.error,
    })
    setFailId(null)
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Prize operations"
        title="Fulfilment"
        description="Track dispatch and delivery, and reoffer a prize when a winner does not claim it in time."
        actions={
          <>
            <Link
              to="/admin/audit"
              className="focus-ring inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-white px-3.5 text-[12px] font-semibold text-ink-muted hover:border-brand/40 hover:text-brand-dark"
            >
              <ShieldCheck className="h-3.5 w-3.5" /> Audit trail
            </Link>
            <ExportButton
              filename="bidora-fulfilment.csv"
              rows={filtered.map(({ winner, auction, user, bid }) => ({
                auction: auction?.title ?? winner.auctionId,
                winner: user?.name ?? '',
                phone: user?.phone ?? '',
                winning_bid_etb: winner.amount,
                retail_value_etb: auction?.retailValue ?? '',
                fulfilment: winner.fulfilment,
                method: winner.method ?? '',
                address: winner.address ?? '',
                pickup: winner.pickupLocation ?? '',
                deadline: winner.deadlineAt,
                entry_id: winner.entryId,
                bid_hash: bid?.hash ?? '',
              }))}
            />
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStat
          label="Awaiting claim"
          value={formatNumber(data.awaiting.length)}
          icon={Clock3}
          tone={data.overdue.length ? 'red' : 'amber'}
          sub={`${data.overdue.length} past the 7-day deadline`}
        />
        <AdminStat
          label="Ready to dispatch"
          value={formatNumber(data.ready.length)}
          icon={ClipboardCheck}
          tone="blue"
          sub={`${data.dispatched.length} already dispatched`}
        />
        <AdminStat
          label="Delivered prizes"
          value={formatNumber(data.delivered.length)}
          icon={PackageCheck}
          tone="green"
          sub={`${formatETB(data.prizeValue)} total retail value in scope`}
        />
        <AdminStat
          label="Total winners"
          value={formatNumber(data.rows.length)}
          icon={Trophy}
          tone="purple"
          sub="Across all closed auctions"
        />
      </div>

      <Card className="p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Tabs
            items={[
              { value: 'all', label: 'All', count: data.rows.length },
              { value: 'awaiting', label: 'Awaiting claim', count: data.awaiting.length },
              { value: 'ready', label: 'Ready', count: data.ready.length },
              { value: 'dispatched', label: 'Dispatched', count: data.dispatched.length },
              { value: 'delivered', label: 'Delivered', count: data.delivered.length },
            ]}
            value={tab}
            onChange={(value) => setTab(value as Tab)}
            className="max-w-full overflow-x-auto"
          />
          <div className="relative w-full lg:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-soft" />
            <Input
              placeholder="Search winner, phone or auction"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-9 pl-9 text-[11.5px]"
            />
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <AdminTableWrap>
          <DataTable className="min-w-[1100px]">
            <thead>
              <tr>
                <Th>Prize</Th>
                <Th>Winner</Th>
                <Th>Winning bid</Th>
                <Th>Fulfilment</Th>
                <Th>Method</Th>
                <Th>Deadline</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <EmptyTableRow colSpan={7}>No winners match this view.</EmptyTableRow>
              ) : (
                filtered.map(({ winner, auction, user, bid }) => {
                  const overdue = isUnclaimed(winner) && new Date(winner.deadlineAt).getTime() < Date.now()
                  return (
                    <tr key={winner.auctionId} className="transition hover:bg-brand-soft/30">
                      <Td>
                        <Link to={`/admin/auctions/${winner.auctionId}`} className="focus-ring block">
                          <span className="block max-w-[190px] truncate text-[11.5px] font-bold text-ink">{auction?.title ?? winner.auctionId}</span>
                          <span className="text-[9px] text-ink-muted">{auction?.category} · {winner.auctionId}</span>
                        </Link>
                      </Td>
                      <Td>
                        <span className="block text-[11px] font-semibold text-ink">{user?.name ?? 'Unknown winner'}</span>
                        <span className="block text-[9px] text-ink-muted">{maskPhone(user?.phone ?? '')}</span>
                        <span className="block font-mono text-[8px] text-ink-soft">{winner.entryId}</span>
                      </Td>
                      <Td>
                        <span className="block font-bold amount-tabular">{formatETB(winner.amount, 2)}</span>
                        <span className="block text-[8.5px] text-ink-soft">of {formatETB(auction?.retailValue ?? 0)} retail</span>
                      </Td>
                      <Td>
                        <Badge
                          tone={
                            winner.fulfilment === 'delivered'
                              ? 'green'
                              : winner.fulfilment === 'dispatched'
                                ? 'blue'
                                : winner.method
                                  ? 'amber'
                                  : 'grey'
                          }
                          dot
                        >
                          {fulfilmentLabel[winner.fulfilment]}
                        </Badge>
                      </Td>
                      <Td className="text-[9.5px] capitalize text-ink-muted">
                        {winner.method ?? 'Not chosen'}
                        {winner.address ? <span className="mt-0.5 block max-w-[140px] truncate text-[8.5px] text-ink-soft">{winner.address}</span> : null}
                        {winner.pickupLocation ? <span className="mt-0.5 block max-w-[140px] truncate text-[8.5px] text-ink-soft">{winner.pickupLocation}</span> : null}
                      </Td>
                      <Td>
                        <span className={cn('block text-[9.5px]', overdue ? 'font-bold text-accent' : 'text-ink-muted')}>
                          {formatDate(winner.deadlineAt)}
                        </span>
                        <span className={cn('block text-[8.5px]', overdue ? 'text-accent' : 'text-ink-soft')}>
                          {overdue ? 'Deadline passed' : timeAgo(winner.createdAt)}
                        </span>
                      </Td>
                      <Td align="right">
                        <div className="flex items-center justify-end gap-1">
                          {winner.fulfilment !== 'delivered' ? (
                            <Button size="sm" variant="secondary" className="h-7 px-2.5 text-[10px]" onClick={() => advance(winner)}>
                              {winner.fulfilment === 'none' ? 'Dispatch' : 'Mark delivered'}
                            </Button>
                          ) : null}
                          {winner.fulfilment === 'none' ? (
                            <button
                              type="button"
                              title="Winner did not claim: offer the next unique bid"
                              onClick={() => setFailId(winner.auctionId)}
                              className="focus-ring flex h-7 w-7 items-center justify-center rounded-lg border border-line text-ink-muted hover:border-accent/30 hover:text-accent"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </button>
                          ) : null}
                          <button
                            type="button"
                            title="View winner record"
                            onClick={() => setDetailId(winner.auctionId)}
                            className="focus-ring flex h-7 w-7 items-center justify-center rounded-lg bg-page text-ink-muted hover:bg-brand-tint hover:text-brand-dark"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
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
            <strong className="text-ink">{filtered.length}</strong> winner{filtered.length === 1 ? '' : 's'} shown
          </span>
          <span className="inline-flex items-center gap-2">
            <Badge tone={data.overdue.length ? 'red' : 'green'}>{data.overdue.length} overdue</Badge>
            <Badge tone="blue">{data.dispatched.length} in transit</Badge>
            <Link to="/admin/reconciliation" className="inline-flex items-center gap-1 font-bold text-brand-dark">
              Reconciliation <ArrowRight className="h-3 w-3" />
            </Link>
          </span>
        </div>
      </Card>

      <div className="grid gap-3 lg:grid-cols-3">
        <AdminCard title="Fulfilment workflow" bodyClassName="p-4">
          <div className="space-y-3">
            {[
              { icon: ClipboardCheck, label: 'Method confirmed', body: 'Winner chooses delivery or a pickup branch.' },
              { icon: Truck, label: 'Dispatched', body: 'Courier handoff recorded and the winner is notified by SMS.' },
              { icon: PackageCheck, label: 'Delivered', body: 'Prize is handed over and the record is closed.' },
            ].map((item) => {
              const Icon = item.icon
              return (
                <div key={item.label} className="flex items-start gap-2.5">
                  <span className="flex h-7 w-7 flex-none items-center justify-center rounded-xl bg-brand-tint text-brand-dark">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <p className="text-[10.5px] font-bold text-ink">{item.label}</p>
                    <p className="mt-0.5 text-[9.5px] leading-snug text-ink-muted">{item.body}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </AdminCard>

        <AdminCard title="Deadline policy" bodyClassName="p-4">
          <div className="rounded-xl border border-[#F6E2B8] bg-[#FFFBF2] px-3 py-2.5">
            <p className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-wide text-[#8A5200]">
              <CalendarClock className="h-3 w-3" /> Seven-day window
            </p>
            <p className="mt-1 text-[10px] leading-relaxed text-[#8A5200]">
              A winner has seven days to choose a fulfilment method. After that the operations
              desk can fail the record and offer the prize to the next lowest unique bid.
            </p>
          </div>
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between rounded-lg border border-line px-2.5 py-2 text-[10px]">
              <span className="text-ink-muted">Winners awaiting claim</span>
              <span className="font-bold text-ink">{data.awaiting.length}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-line px-2.5 py-2 text-[10px]">
              <span className="text-ink-muted">Past deadline</span>
              <span className="font-bold text-accent">{data.overdue.length}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-line px-2.5 py-2 text-[10px]">
              <span className="text-ink-muted">Prize value in scope</span>
              <span className="font-bold text-ink">{formatETB(data.prizeValue)}</span>
            </div>
          </div>
        </AdminCard>

        <AdminCard title="Requirement checks" bodyClassName="divide-y divide-line">
          {[
            ['One prize, one winner', 'Reoffering a prize excludes their entry and reoffers the next unique bid.'],
            ['Void if nobody remains', 'If no further unique bid exists, the auction becomes void and refunds are queued.'],
            ['Every step audited', 'Dispatch and reassignment write immutable audit events.'],
          ].map(([title, body]) => (
            <div key={title} className="flex items-start gap-2 px-4 py-2.5">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-none text-brand-dark" />
              <div>
                <p className="text-[10.5px] font-bold text-ink">{title}</p>
                <p className="mt-0.5 text-[9.5px] leading-snug text-ink-muted">{body}</p>
              </div>
            </div>
          ))}
        </AdminCard>
      </div>

      <Modal
        open={Boolean(selected)}
        onClose={() => setDetailId(null)}
        title={selected ? selected.auction?.title ?? 'Winner record' : 'Winner record'}
        description={selected ? `${selected.user?.name ?? 'Winner'} · winning bid ${formatETB(selected.winner.amount, 2)}` : undefined}
        width="max-w-xl"
        footer={
          selected ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => setDetailId(null)}>Close</Button>
              {selected.winner.fulfilment !== 'delivered' ? (
                <Button size="sm" onClick={() => advance(selected.winner)} leftIcon={<Truck className="h-3.5 w-3.5" />}>
                  {selected.winner.fulfilment === 'none' ? 'Mark dispatched' : 'Mark delivered'}
                </Button>
              ) : null}
            </>
          ) : null
        }
      >
        {selected ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-line bg-page/60 px-3 py-2.5">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wide text-ink-muted">Winning bid</p>
                <p className="text-[22px] font-black leading-none text-ink amount-tabular">{formatBid(selected.winner.amount)}</p>
                <p className="mt-0.5 text-[9px] text-ink-muted">Retail value {formatETB(selected.auction?.retailValue ?? 0)}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge tone="grey">{fulfilmentLabel[selected.winner.fulfilment]}</Badge>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Detail label="Winner" value={selected.user?.name ?? 'Unknown'} />
              <Detail label="Phone" value={maskPhone(selected.user?.phone ?? '')} />
              <Detail label="Entry" value={<span className="font-mono text-[9px]">{selected.winner.entryId}</span>} />
              <Detail label="Method" value={selected.winner.method ? selected.winner.method : 'Not chosen'} />
              <Detail label="Deadline" value={formatDate(selected.winner.deadlineAt)} />
              <Detail label="Declared" value={formatDateTime(selected.winner.createdAt)} />
            </div>

            {selected.winner.address ? (
              <div className="flex items-start gap-2 rounded-xl border border-line px-3 py-2">
                <MapPin className="mt-0.5 h-3.5 w-3.5 flex-none text-brand-dark" />
                <div>
                  <p className="text-[8.5px] font-bold uppercase tracking-wide text-ink-muted">Delivery address</p>
                  <p className="mt-0.5 text-[10.5px] text-ink">{selected.winner.address}</p>
                </div>
              </div>
            ) : null}
            {selected.winner.pickupLocation ? (
              <div className="flex items-start gap-2 rounded-xl border border-line px-3 py-2">
                <MapPin className="mt-0.5 h-3.5 w-3.5 flex-none text-brand-dark" />
                <div>
                  <p className="text-[8.5px] font-bold uppercase tracking-wide text-ink-muted">Pickup location</p>
                  <p className="mt-0.5 text-[10.5px] text-ink">{selected.winner.pickupLocation}</p>
                </div>
              </div>
            ) : null}

            <div className="rounded-xl border border-line p-3">
              <p className="text-[9px] font-bold uppercase tracking-wide text-ink-muted">Sealed bid evidence</p>
              <p className="mt-1 break-all font-mono text-[8.5px] leading-relaxed text-ink-muted">
                {selected.bid?.hash ?? 'No bid hash linked to this entry'}
              </p>
              <p className="mt-1.5 text-[8.5px] text-ink-soft">
                Submitted {selected.bid ? formatDateTime(selected.bid.timestamp) : '—'}
              </p>
            </div>

            <div className="rounded-xl border border-line p-3">
              <p className="mb-2 text-[9px] font-bold uppercase tracking-wide text-ink-muted">Progress</p>
              <div className="space-y-2">
                {[
                  { label: 'Winner declared', done: true, icon: Trophy },
                  { label: 'Method chosen', done: Boolean(selected.winner.method), icon: ClipboardCheck },
                  { label: 'Dispatched', done: ['dispatched', 'delivered'].includes(selected.winner.fulfilment), icon: Truck },
                  { label: 'Delivered', done: selected.winner.fulfilment === 'delivered', icon: PackageCheck },
                ].map((step) => {
                  const Icon = step.icon
                  return (
                    <div key={step.label} className="flex items-center gap-2">
                      <span
                        className={cn(
                          'flex h-5 w-5 items-center justify-center rounded-full',
                          step.done ? 'bg-brand text-white' : 'bg-page text-ink-soft',
                        )}
                      >
                        <Icon className="h-2.5 w-2.5" />
                      </span>
                      <span className={cn('text-[10px]', step.done ? 'font-semibold text-ink' : 'text-ink-muted')}>
                        {step.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {isUnclaimed(selected.winner) && new Date(selected.winner.deadlineAt).getTime() < Date.now() ? (
              <AlertBox tone="warning" title="Deadline has passed">
                The prize can be offered to the next lowest unique bid.
              </AlertBox>
            ) : null}
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(failTarget)}
        onClose={() => setFailId(null)}
        title="Offer the prize to the next bid?"
        description="This excludes the current winner and searches for the next lowest unique bid."
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setFailId(null)}>Cancel</Button>
            <Button variant="danger" size="sm" onClick={failAndOffer}>Offer to next</Button>
          </>
        }
      >
        {failTarget ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-line bg-page/60 px-3 py-2.5">
              <p className="text-[11px] font-bold text-ink">{failTarget.auction?.title ?? failTarget.winner.auctionId}</p>
              <p className="mt-0.5 text-[10px] text-ink-muted">
                Current winner {failTarget.user?.name ?? 'Unknown'} · {formatETB(failTarget.winner.amount, 2)}
              </p>
            </div>
            <AlertBox tone="warning" title="This is a real state change">
              The current bid is excluded from future winner calculations. The next lowest unique bid is offered the prize
              with a new seven-day deadline. If no unique bid remains, the auction is void and every entry fee is queued
              for refund.
            </AlertBox>
            <div className="flex items-center gap-2 text-[10px] text-ink-muted">
              <Clock3 className="h-3.5 w-3.5" /> Deadline {formatDate(failTarget.winner.deadlineAt)}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

function isUnclaimed(winner: WinnerRecord) {
  return winner.fulfilment === 'none' && !winner.method
}

function Detail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-white px-2.5 py-1.5">
      <p className="text-[8.5px] font-bold uppercase tracking-wide text-ink-muted">{label}</p>
      <div className="mt-0.5 text-[10.5px] font-semibold capitalize text-ink">{value}</div>
    </div>
  )
}

import {
  Activity,
  ArrowLeft,
  ArrowUpRight,
  Ban,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FastForward,
  Gavel,
  Hash,
  ListChecks,
  MapPin,
  PackageCheck,
  Phone,
  ReceiptText,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Ticket,
  Trophy,
  Truck,
  Undo2,
  UserRound,
  Users,
  Wand2,
  XCircle,
} from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  AlertBox,
  Badge,
  Button,
  Card,
  CopyButton,
  EmptyState,
  Input,
  Modal,
  StatusBadge,
  Tabs,
  cn,
} from '../../components/ui'
import { useToast } from '../../components/Toast'
import { determineWinner, maskPhone, shortHash } from '../../lib/engine'
import { formatDateTime, formatETB, formatNumber, formatPercent } from '../../lib/format'
import { useAuction, useStore } from '../../store/useStore'
import type { Auction, Entry, Payment, Bid } from '../../types'
import { AdminCard, AdminPageHeader, AdminStat, AdminTableWrap, DataTable, EmptyTableRow, ExportButton, StatBar, Td, Th } from './components'

type Tab = 'overview' | 'entries' | 'audit'

export default function AdminAuctionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const auction = useAuction(id)
  const state = useStore((s) => s)
  const fastForwardAuction = useStore((s) => s.fastForwardAuction)
  const closeAuction = useStore((s) => s.closeAuction)
  const cancelAuction = useStore((s) => s.cancelAuction)
  const generateBotEntries = useStore((s) => s.generateBotEntries)
  const reachMinimum = useStore((s) => s.reachMinimum)
  const processRefunds = useStore((s) => s.processRefunds)
  const advanceFulfilment = useStore((s) => s.advanceFulfilment)
  const failWinnerAndOfferNext = useStore((s) => s.failWinnerAndOfferNext)
  const updateEconomics = useStore((s) => s.updateEconomics)

  const [tab, setTab] = useState<Tab>('overview')
  const [query, setQuery] = useState('')
  const [entryFilter, setEntryFilter] = useState<'all' | 'unique' | 'duplicate' | 'no_bid' | 'bots'>('all')
  const [cancelOpen, setCancelOpen] = useState(false)
  const [botsOpen, setBotsOpen] = useState(false)
  const [botCount, setBotCount] = useState('50')

  const data = useMemo(() => {
    if (!auction) return null
    const paymentById = new Map(state.payments.map((p) => [p.id, p]))
    const entries = state.entries.filter((e) => e.auctionId === auction.id)
    const bids = state.bids.filter((b) => b.auctionId === auction.id)
    const bidByEntry = new Map(bids.map((b) => [b.entryId, b]))
    const paid = entries.filter((entry) => {
      const payment = paymentById.get(entry.paymentId)
      return payment?.status === 'success' && !['invalidated', 'refunded', 'void', 'cancelled'].includes(entry.status)
    })
    const validBids = bids.filter((b) => {
      if (!b.valid) return false
      const entry = entries.find((e) => e.id === b.entryId)
      return entry ? paymentById.get(entry.paymentId)?.status === 'success' : false
    })
    const calc = determineWinner(validBids)
    const uniqueByEntry = new Set(calc.uniqueGroups.flatMap((group) => group.bids.map((b) => b.entryId)))
    const successPayments = state.payments.filter((p) => p.auctionId === auction.id && p.status === 'success')
    const gross = successPayments.reduce((sum, p) => sum + p.amount, 0)
    const refunds = state.refunds.filter((r) => r.auctionId === auction.id)
    const pendingRefunds = refunds.filter((r) => r.status === 'pending')
    const winner = state.winners.find((w) => w.auctionId === auction.id)
    const winnerUser = winner ? state.users.find((u) => u.id === winner.userId) : undefined
    const audit = state.audit
      .filter((event) => event.auctionId === auction.id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    const participants = new Set(paid.map((e) => e.userId)).size
    const uniqueBids = calc.uniqueGroups.length
    const minReached = paid.length >= auction.minEntries
    return { entries, bids, bidByEntry, paid, validBids, calc, uniqueByEntry, gross, refunds, pendingRefunds, winner, winnerUser, audit, participants, uniqueBids, minReached }
  }, [auction, state])

  if (!auction || !data) {
    return (
      <div className="space-y-4">
        <EmptyState icon={<Gavel className="h-5 w-5" />} title="Auction not found" body="This auction is not in the current demo state." action={<Button onClick={() => navigate('/admin/auctions')}>Back to auctions</Button>} />
      </div>
    )
  }

  const open = ['live', 'upcoming'].includes(auction.status)
  const remaining = Math.max(0, auction.minEntries - data.paid.length)

  const rows = data.entries
    .map((entry) => {
      const bid = data.bidByEntry.get(entry.id)
      const payment = state.payments.find((p) => p.id === entry.paymentId)
      const user = state.users.find((u) => u.id === entry.userId)
      const unique = bid ? data.uniqueByEntry.has(entry.id) : false
      return { entry, bid, payment, user, unique }
    })
    .filter((row) => {
      if (entryFilter === 'unique' && !row.unique) return false
      if (entryFilter === 'duplicate' && (!row.bid || row.unique)) return false
      if (entryFilter === 'no_bid' && row.bid) return false
      if (entryFilter === 'bots' && !row.user?.isBot) return false
      if (!query.trim()) return true
      const q = query.trim().toLowerCase()
      return [row.entry.id, row.user?.name, row.user?.phone, row.bid?.amount.toFixed(2), row.entry.status]
        .some((value) => String(value ?? '').toLowerCase().includes(q))
    })
    .sort((a, b) => (a.bid?.amount ?? Number.POSITIVE_INFINITY) - (b.bid?.amount ?? Number.POSITIVE_INFINITY))

  const handleBots = () => {
    const count = Math.max(1, Math.min(5000, Math.floor(Number(botCount) || 0)))
    const result = generateBotEntries(auction.id, count)
    setBotsOpen(false)
    showToast({
      tone: result.ok ? 'success' : 'error',
      title: result.ok ? `${result.created} simulated bidders joined` : 'Could not add bidders',
      message: result.ok ? auction.title : result.error,
    })
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow={`${auction.category} · ${auction.id}`}
        title={auction.title}
        description={`${formatETB(auction.retailValue)} retail · ${formatETB(auction.entryFee)} entry fee · minimum ${formatNumber(auction.minEntries)} entries`}
        actions={
          <>
            <Link to="/admin/auctions" className="focus-ring inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-white px-3.5 text-[12px] font-semibold text-ink-muted hover:border-brand/40 hover:text-brand-dark">
              <ArrowLeft className="h-3.5 w-3.5" /> All auctions
            </Link>
            <Link to={`/results/${auction.id}`} className="focus-ring inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-white px-3.5 text-[12px] font-semibold text-ink-muted hover:border-brand/40 hover:text-brand-dark">
              <ArrowUpRight className="h-3.5 w-3.5" /> Public result
            </Link>
            <Link to={`/admin/auctions/${auction.id}/edit`} className="focus-ring inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-3.5 text-[12px] font-semibold text-white hover:bg-black">
              Edit auction
            </Link>
          </>
        }
      />

      <Card className="overflow-hidden">
        <div className="grid gap-0 md:grid-cols-[260px_1fr]">
          <div className="relative h-44 md:h-full">
            <img src={auction.image} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent md:bg-gradient-to-r" />
            <div className="absolute left-3 top-3 flex gap-1.5">
              <StatusBadge status={auction.status} />
              {data.minReached ? <Badge tone="green" dot>Minimum reached</Badge> : <Badge tone="amber">{remaining} to minimum</Badge>}
            </div>
          </div>
          <div className="flex flex-col justify-between gap-3 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">{auction.category}</p>
                <h2 className="mt-0.5 text-[18px] font-extrabold tracking-[-0.03em] text-ink">{auction.title}</h2>
                <p className="mt-1.5 line-clamp-2 max-w-2xl text-[11px] leading-relaxed text-ink-muted">{auction.description}</p>
              </div>
              <div className="flex flex-none flex-wrap gap-1.5">
                <Badge tone="blue">{formatBidRange(auction)}</Badge>
                <Badge tone="grey">{auction.maxEntriesPerUser} entries / user</Badge>
                <Badge tone="purple">{auction.bidStep.toFixed(2)} step</Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: 'Entries', value: `${formatNumber(data.paid.length)} / ${formatNumber(auction.minEntries)}` },
                { label: 'Participants', value: formatNumber(data.participants) },
                { label: 'Unique bids', value: formatNumber(data.uniqueBids) },
                { label: 'Gross fees', value: formatETB(data.gross) },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border border-line bg-page/60 px-2.5 py-1.5">
                  <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-ink-muted">{item.label}</p>
                  <p className="mt-0.5 text-[12px] font-extrabold text-ink amount-tabular">{item.value}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-ink-muted">
              <span className="inline-flex items-center gap-1"><CalendarClock className="h-3 w-3" /> Starts {formatDateTime(auction.startAt)}</span>
              <span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" /> Ends {formatDateTime(auction.endAt)}</span>
              {auction.closedAt ? <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Closed {formatDateTime(auction.closedAt)} · {auction.closeReason}</span> : null}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStat label="Paid entries" value={formatNumber(data.paid.length)} icon={Ticket} tone="green" sub={`${formatPercent((data.paid.length / Math.max(1, auction.minEntries)) * 100)} of minimum`} />
        <AdminStat label="Gross entry fees" value={formatETB(data.gross)} icon={BarChart3} tone="blue" sub={`${data.paid.length} paid × ${formatETB(auction.entryFee)}`} />
        <AdminStat
          label={auction.status === 'closed' ? 'Winning bid' : 'Lowest unique bid now'}
          value={data.calc.winner ? `ETB ${data.calc.winner.amount.toFixed(2)}` : '—'}
          icon={Trophy}
          tone={data.calc.winner ? 'purple' : 'dark'}
          sub={`${data.uniqueBids} unique amount${data.uniqueBids === 1 ? '' : 's'} · ${data.validBids.length} valid bids`}
        />
        <AdminStat
          label="Pending refunds"
          value={formatETB(data.pendingRefunds.reduce((sum, r) => sum + r.amount, 0), 2)}
          icon={Undo2}
          tone={data.pendingRefunds.length ? 'amber' : 'green'}
          sub={`${data.pendingRefunds.length} refund${data.pendingRefunds.length === 1 ? '' : 's'} queued`}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.65fr_1fr]">
        <div className="space-y-4">
          <Card className="p-1.5">
            <Tabs
              items={[
                { value: 'overview', label: 'Overview', count: undefined },
                { value: 'entries', label: 'Entries & bids', count: data.entries.length },
                { value: 'audit', label: 'Audit', count: data.audit.length },
              ]}
              value={tab}
              onChange={(value) => setTab(value as Tab)}
              variant="underline"
              className="px-2"
            />
            <div className="p-3">
              {tab === 'overview' ? (
                <div className="space-y-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <Card className="p-3.5">
                      <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-ink-muted"><BarChart3 className="h-3 w-3" /> Unit economics</p>
                      <div className="mt-2 space-y-1.5 text-[10.5px]">
                        {(() => {
                          const economics = auction.economics ?? {}
                          const productCost = economics.productCost ?? Math.round(auction.retailValue * 0.62)
                          const contribution = data.gross - data.pendingRefunds.reduce((s, r) => s + r.amount, 0) - productCost
                          return (
                            <>
                              <Row label="Product cost" value={formatETB(productCost)} />
                              <Row label="Gross fees" value={formatETB(data.gross)} />
                              <Row label="Refunds queued" value={formatETB(data.pendingRefunds.reduce((s, r) => s + r.amount, 0), 2)} />
                              <Row label="Contribution before share" value={formatETB(contribution)} tone={contribution >= 0 ? 'green' : 'red'} />
                              <Link to="/admin/economics" className="mt-2 inline-flex items-center gap-1 text-[9.5px] font-bold text-brand-dark">
                                Open full economics <ArrowUpRight className="h-3 w-3" />
                              </Link>
                            </>
                          )
                        })()}
                      </div>
                    </Card>

                    <Card className="p-3.5">
                      <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-ink-muted"><ListChecks className="h-3 w-3" /> Auction terms</p>
                      <div className="mt-2 space-y-1.5 text-[10.5px]">
                        <Row label="Retail value" value={formatETB(auction.retailValue)} />
                        <Row label="Entry fee" value={formatETB(auction.entryFee)} />
                        <Row label="Minimum bid" value={formatBidRange(auction)} />
                        <Row label="Max entries / user" value={String(auction.maxEntriesPerUser)} />
                        <Row label="Entry limit reached" value={`${data.paid.length} / ${auction.minEntries}`} />
                      </div>
                    </Card>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <Card className="p-3.5">
                      <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-ink-muted"><Trophy className="h-3 w-3" /> Winner & prize</p>
                      {data.winner ? (
                        <div className="mt-2 space-y-1.5 text-[10.5px]">
                          <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-tint text-[9px] font-black text-brand-dark">
                              {data.winnerUser?.name.split(' ').map((p) => p[0]).slice(0, 2).join('') ?? '—'}
                            </span>
                            <div>
                              <p className="font-bold text-ink">{data.winnerUser?.name ?? 'Winner'}</p>
                              <p className="text-[9px] text-ink-muted">{maskPhone(data.winnerUser?.phone ?? '')}</p>
                            </div>
                          </div>
                          <Row label="Winning bid" value={`ETB ${data.winner.amount.toFixed(2)}`} tone="green" />
                          <Row label="Fulfilment" value={data.winner.fulfilment} />
                          <Row label="Claim deadline" value={formatDateTime(data.winner.deadlineAt)} />
                          <Link to={`/winner/${auction.id}`} className="mt-1 inline-flex items-center gap-1 text-[9.5px] font-bold text-brand-dark">
                            Open winner flow <ArrowUpRight className="h-3 w-3" />
                          </Link>
                        </div>
                      ) : (
                        <div className="mt-2 rounded-xl border border-dashed border-[#D8DFD5] bg-page/50 px-3 py-4 text-center">
                          <p className="text-[10.5px] font-semibold text-ink-muted">
                            {auction.status === 'live' ? 'No winner yet — the auction is still open.' : auction.status === 'void' ? 'Auction void: no unique bid existed.' : auction.status === 'cancelled' ? 'Auction cancelled before a winner.' : 'No winner record.'}
                          </p>
                        </div>
                      )}
                    </Card>

                    <Card className="p-3.5">
                      <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-ink-muted"><Undo2 className="h-3 w-3" /> Refunds</p>
                      <div className="mt-2 space-y-1.5 text-[10.5px]">
                        <Row label="Queued" value={String(data.pendingRefunds.length)} tone={data.pendingRefunds.length ? 'red' : undefined} />
                        <Row label="Processed" value={String(data.refunds.filter((r) => r.status === 'processed').length)} />
                        <Row label="Total queued value" value={formatETB(data.pendingRefunds.reduce((sum, r) => sum + r.amount, 0), 2)} />
                        {data.pendingRefunds.length ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="mt-1 h-7 px-2.5 text-[10px]"
                            onClick={() => {
                              const result = processRefunds(auction.id)
                              showToast({ tone: 'success', title: `${result.count} refunds processed`, message: formatETB(result.total, 2) })
                            }}
                          >
                            Process refunds
                          </Button>
                        ) : (
                          <p className="text-[9.5px] text-ink-soft">No refunds waiting.</p>
                        )}
                      </div>
                    </Card>
                  </div>

                  <Card className="border-[#F6E2B8] bg-[#FFFBF2] p-3.5">
                    <div className="flex items-start gap-2.5">
                      <Sparkles className="mt-0.5 h-4 w-4 flex-none text-[#9A5B00]" />
                      <div>
                        <p className="text-[10.5px] font-bold text-[#7A4A00]">Worked example for the demo</p>
                        <p className="mt-0.5 text-[10px] leading-relaxed text-[#8A5200]">
                          Bids .05, .05, .07, .09, .09, .12 → duplicates .05 and .09 are eliminated. The lowest remaining
                          unique amount is <strong>.07</strong>, so that participant wins. The voucher auction in this demo
                          shows exactly this result.
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>
              ) : null}

              {tab === 'entries' ? (
                <div className="space-y-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap gap-1.5">
                      {([
                        ['all', `All ${data.entries.length}`],
                        ['unique', `Unique ${data.uniqueBids}`],
                        ['duplicate', 'Duplicates'],
                        ['no_bid', 'No bid'],
                        ['bots', 'Bots'],
                      ] as const).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setEntryFilter(value)}
                          className={cn(
                            'focus-ring rounded-full px-2.5 py-1 text-[10px] font-bold transition',
                            entryFilter === value ? 'bg-brand text-white' : 'bg-page text-ink-muted hover:text-ink',
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search entries" className="h-8 w-44 text-[10.5px]" />
                      <ExportButton
                        filename={`auction-${auction.id}-entries.csv`}
                        label="CSV"
                        rows={rows.map(({ entry, bid, payment, user }) => ({
                          entry_id: entry.id,
                          participant: user?.name ?? '',
                          phone: user?.phone ?? '',
                          bot: Boolean(user?.isBot),
                          bid_amount_etb: bid?.amount ?? '',
                          bid_valid: bid?.valid ?? '',
                          bid_hash: bid?.hash ?? '',
                          entry_status: entry.status,
                          payment_ref: payment?.ref ?? '',
                          payment_status: payment?.status ?? '',
                          created_at: entry.createdAt,
                        }))}
                      />
                    </div>
                  </div>

                  <AdminTableWrap>
                    <DataTable className="min-w-[900px]">
                      <thead>
                        <tr>
                          <Th>Entry</Th>
                          <Th>Participant</Th>
                          <Th>Bid</Th>
                          <Th>Status</Th>
                          <Th>Payment</Th>
                          <Th>Hash</Th>
                          <Th align="right">Time</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.length === 0 ? (
                          <EmptyTableRow colSpan={7}>No entries match this filter.</EmptyTableRow>
                        ) : (
                          rows.slice(0, 250).map(({ entry, bid, payment, user, unique }) => (
                            <tr key={entry.id} className="transition hover:bg-brand-soft/30">
                              <Td>
                                <span className="font-mono text-[9.5px] text-ink-muted">{entry.id}</span>
                                {entry.id === auction.winnerEntryId ? <Badge tone="green" className="ml-1.5 px-1.5 py-0.5 text-[7.5px]">Winner</Badge> : null}
                              </Td>
                              <Td>
                                <span className="flex items-center gap-1.5">
                                  <span className="text-[11px] font-semibold text-ink">{user?.name ?? 'Unknown'}</span>
                                  {user?.isBot ? <Badge tone="grey" className="px-1.5 py-0.5 text-[7.5px]">Bot</Badge> : null}
                                </span>
                                <span className="block text-[9px] text-ink-muted">{maskPhone(user?.phone ?? '')}</span>
                              </Td>
                              <Td>
                                {bid ? (
                                  <span className={cn('text-[12px] font-extrabold amount-tabular', unique ? 'text-brand-dark' : 'text-accent')}>
                                    {bid.amount.toFixed(2)}
                                    {unique ? <span className="ml-1 text-[8px] font-bold uppercase text-brand">unique</span> : <span className="ml-1 text-[8px] font-bold uppercase text-accent">dup</span>}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-ink-soft">No bid</span>
                                )}
                              </Td>
                              <Td><StatusBadge status={entry.status} /></Td>
                              <Td>{payment ? <StatusBadge status={payment.status} /> : <span className="text-[10px] text-ink-soft">—</span>}</Td>
                              <Td>
                                {bid ? (
                                  <span className="inline-flex items-center gap-1">
                                    <span className="font-mono text-[9px] text-ink-muted">{shortHash(bid.hash, 8)}</span>
                                    <CopyButton value={bid.hash} label="" className="h-5 w-5 justify-center border-0 p-0" />
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-ink-soft">—</span>
                                )}
                              </Td>
                              <Td align="right" className="text-[9.5px] text-ink-muted">{formatDateTime(entry.createdAt)}</Td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </DataTable>
                  </AdminTableWrap>
                  {rows.length > 250 ? (
                    <p className="text-center text-[9.5px] text-ink-soft">Showing the first 250 filtered entries. Export CSV for the full set.</p>
                  ) : null}
                </div>
              ) : null}

              {tab === 'audit' ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-ink-muted">{data.audit.length} immutable events for this auction.</p>
                    <ExportButton
                      filename={`auction-${auction.id}-audit.csv`}
                      label="CSV"
                      rows={data.audit.map((event) => ({
                        id: event.id,
                        type: event.type,
                        actor: event.actor,
                        message: event.message,
                        timestamp: event.timestamp,
                        hash: event.hash ?? '',
                      }))}
                    />
                  </div>
                  <ol className="relative ml-1 space-y-2 border-l border-line pl-4">
                    {data.audit.slice(0, 80).map((event) => (
                      <li key={event.id} className="relative">
                        <span className="absolute -left-[22px] top-1.5 h-2 w-2 rounded-full border-2 border-white bg-brand" />
                        <div className="rounded-xl border border-line bg-[#FAFBF9] px-3 py-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded bg-white px-1.5 py-0.5 font-mono text-[8px] font-bold text-ink-muted">{event.type}</span>
                            <span className="text-[8.5px] text-ink-soft">{formatDateTime(event.timestamp)}</span>
                            <span className="ml-auto text-[8.5px] font-semibold text-ink-muted">{event.actor}</span>
                          </div>
                          <p className="mt-1 text-[10.5px] leading-relaxed text-ink">{event.message}</p>
                          {event.hash ? (
                            <div className="mt-1 flex items-center gap-1.5">
                              <Hash className="h-2.5 w-2.5 text-ink-soft" />
                              <span className="truncate font-mono text-[8.5px] text-ink-soft">{event.hash}</span>
                              <CopyButton value={event.hash} label="" className="h-5 border-0 px-1 text-[8px]" />
                            </div>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}
            </div>
          </Card>
        </div>

        <div className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <AdminCard title="Auction controls" description="Actions below use the real auction engine." bodyClassName="p-3.5 space-y-2">
            {open ? (
              <>
                <div className="rounded-xl border border-line bg-page/60 p-3">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold text-ink">Minimum progress</span>
                    <span className="text-ink-muted amount-tabular">{data.paid.length} / {auction.minEntries}</span>
                  </div>
                  <div className="mt-1.5">
                    <StatBar value={data.paid.length} max={auction.minEntries} label={data.minReached ? 'Minimum reached' : `${remaining} entries needed`} />
                  </div>
                </div>
                <Button
                  full
                  size="sm"
                  variant="secondary"
                  leftIcon={<FastForward className="h-3.5 w-3.5" />}
                  onClick={() => {
                    const result = fastForwardAuction(auction.id)
                    showToast({
                      tone: result.ok ? 'success' : 'error',
                      title: result.ok ? `Auction closed · ${result.outcome}` : 'Could not close auction',
                      message: result.ok
                        ? result.winningAmount
                          ? `Winning bid ETB ${result.winningAmount.toFixed(2)}`
                          : 'Refunds have been queued where needed.'
                        : result.error,
                    })
                  }}
                >
                  Fast-forward & close
                </Button>
                {auction.status === 'live' ? (
                  <Button
                    full
                    size="sm"
                    variant="secondary"
                    leftIcon={<Gavel className="h-3.5 w-3.5" />}
                    onClick={() => {
                      const result = closeAuction(auction.id, 'manual')
                      showToast({
                        tone: result.ok ? 'success' : 'error',
                        title: result.ok ? 'Auction closed now' : 'Could not close auction',
                        message: result.ok ? `${auction.title} · ${result.outcome}` : result.error,
                      })
                    }}
                  >
                    Close now
                  </Button>
                ) : null}
                <Button
                  full
                  size="sm"
                  variant="secondary"
                  leftIcon={<Wand2 className="h-3.5 w-3.5" />}
                  onClick={() => {
                    const result = reachMinimum(auction.id)
                    showToast({
                      tone: result.ok ? 'success' : 'error',
                      title: result.created ? `${result.created} entries generated` : 'Minimum already reached',
                      message: result.ok ? `${data.paid.length + result.created} paid entries total` : result.error,
                    })
                  }}
                >
                  Reach minimum with bots
                </Button>
                <Button
                  full
                  size="sm"
                  variant="ghost"
                  leftIcon={<Users className="h-3.5 w-3.5" />}
                  onClick={() => setBotsOpen(true)}
                >
                  Add simulated bidders
                </Button>
                <div className="border-t border-line pt-2">
                  <Button
                    full
                    size="sm"
                    variant="ghost"
                    className="text-accent hover:bg-[#FDECEF] hover:text-accent"
                    leftIcon={<Ban className="h-3.5 w-3.5" />}
                    onClick={() => setCancelOpen(true)}
                  >
                    Cancel auction
                  </Button>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <div className="rounded-xl border border-line bg-page/60 px-3 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-ink-muted">Final status</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <StatusBadge status={auction.status} />
                    {auction.closedAt ? <span className="text-[9px] text-ink-soft">{formatDateTime(auction.closedAt)}</span> : null}
                  </div>
                </div>
                {data.winner ? (
                  <>
                    <Button
                      full
                      size="sm"
                      variant="secondary"
                      leftIcon={<Truck className="h-3.5 w-3.5" />}
                      disabled={data.winner.fulfilment === 'delivered'}
                      onClick={() => {
                        const result = advanceFulfilment(auction.id)
                        showToast({ tone: result.ok ? 'success' : 'error', title: result.ok ? 'Fulfilment advanced' : 'Could not advance', message: result.error })
                      }}
                    >
                      Advance fulfilment
                    </Button>
                    <Button
                      full
                      size="sm"
                      variant="ghost"
                      leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
                      onClick={() => {
                        const result = failWinnerAndOfferNext(auction.id)
                        showToast({
                          tone: result.ok ? 'success' : 'warning',
                          title: result.ok ? `Prize offered to next unique bidder` : 'No next winner',
                          message: result.ok ? `New winning bid ETB ${result.nextAmount?.toFixed(2)}` : result.error,
                        })
                      }}
                    >
                      Offer to next bidder
                    </Button>
                  </>
                ) : null}
                {data.pendingRefunds.length ? (
                  <Button
                    full
                    size="sm"
                    variant="secondary"
                    leftIcon={<Undo2 className="h-3.5 w-3.5" />}
                    onClick={() => {
                      const result = processRefunds(auction.id)
                      showToast({ tone: 'success', title: `${result.count} refunds processed`, message: formatETB(result.total, 2) })
                    }}
                  >
                    Process {data.pendingRefunds.length} refunds
                  </Button>
                ) : null}
              </div>
            )}
            <Link
              to={`/results/${auction.id}`}
              className="focus-ring flex items-center justify-between rounded-xl border border-line px-3 py-2 text-[10.5px] font-bold text-ink-muted hover:border-brand/40 hover:text-brand-dark"
            >
              View public result page <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </AdminCard>

          <AdminCard title="Recent audit" description="Last six events for this auction." action={<Link to="/admin/audit" className="text-[9.5px] font-bold text-brand-dark">All</Link>}>
            <div className="divide-y divide-line/70">
              {data.audit.slice(0, 6).map((event) => (
                <div key={event.id} className="px-3.5 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[8px] font-bold text-ink-muted">{event.type}</span>
                    <span className="ml-auto text-[8px] text-ink-soft">{formatDateTime(event.timestamp)}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-ink">{event.message}</p>
                </div>
              ))}
            </div>
          </AdminCard>

          <Card className="border-[#D7EDCF] bg-brand-tint/40 p-3.5">
            <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-brand-dark">
              <Activity className="h-3 w-3" /> Engine truth
            </p>
            <p className="mt-1.5 text-[10px] leading-relaxed text-ink-muted">
              At close, {data.validBids.length} valid sealed bids are grouped into {data.calc.groups.length} amounts. Duplicates
              are removed, then the lowest remaining amount wins. This auction currently has{' '}
              <strong className="text-ink">{data.uniqueBids} unique amount{data.uniqueBids === 1 ? '' : 's'}</strong>.
            </p>
          </Card>
        </div>
      </div>

      <Modal
        open={botsOpen}
        onClose={() => setBotsOpen(false)}
        title="Add simulated bidders"
        description="Generate bot participants with random sealed bids. Bots avoid the current user's bid amounts."
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setBotsOpen(false)}>Cancel</Button>
            <Button size="sm" leftIcon={<Sparkles className="h-3.5 w-3.5" />} onClick={handleBots}>Generate</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input type="number" min="1" max="5000" value={botCount} onChange={(event) => setBotCount(event.target.value)} />
          <div className="flex flex-wrap gap-1.5">
            {[10, 25, 50, 100, 250].map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => setBotCount(String(count))}
                className={cn('focus-ring rounded-full px-2.5 py-1 text-[10px] font-bold', botCount === String(count) ? 'bg-brand text-white' : 'bg-page text-ink-muted')}
              >
                +{count}
              </button>
            ))}
          </div>
          <AlertBox tone="info">
            Simulated entries use successful payments and random amounts ≥ 0.13. Bots are tagged in the entry table.
          </AlertBox>
        </div>
      </Modal>

      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancel this auction?"
        description="Every paid entry gets a refund queued and the auction is marked cancelled. This cannot be undone in the demo."
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setCancelOpen(false)}>Keep auction</Button>
            <Button
              variant="danger"
              size="sm"
              leftIcon={<XCircle className="h-3.5 w-3.5" />}
              onClick={() => {
                const result = cancelAuction(auction.id)
                setCancelOpen(false)
                showToast({
                  tone: result.ok ? 'warning' : 'error',
                  title: result.ok ? 'Auction cancelled' : 'Could not cancel',
                  message: result.ok ? 'Refunds have been queued for paid entries.' : result.error,
                })
              }}
            >
              Cancel auction
            </Button>
          </>
        }
      >
        <div className="space-y-2 text-[11px] leading-relaxed text-ink-muted">
          <p><strong className="text-ink">{auction.title}</strong> has {data.paid.length} paid entries worth {formatETB(data.gross)}.</p>
          <p>Each paid participant will receive a notification and a queued refund. Process the batch from Refunds.</p>
        </div>
      </Modal>
    </div>
  )
}

function formatBidRange(auction: Auction) {
  return `from ${auction.bidMin.toFixed(2)} · no max`
}

function Row({ label, value, tone }: { label: string; value: ReactNode; tone?: 'green' | 'red' }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-ink-muted">{label}</span>
      <span className={cn('font-bold amount-tabular', tone === 'green' && 'text-brand-dark', tone === 'red' && 'text-accent', !tone && 'text-ink')}>{value}</span>
    </div>
  )
}

import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BadgeDollarSign,
  CalendarClock,
  ChartNoAxesCombined,
  Clock3,
  Gavel,
  HandCoins,
  PackageCheck,
  PlayCircle,
  ReceiptText,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Ticket,
  TrendingUp,
  Trophy,
  Undo2,
  Users,
  Wallet,
} from 'lucide-react'
import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Badge, Button, Card, Progress, StatusBadge, cn } from '../../components/ui'
import { useToast } from '../../components/Toast'
import { formatDateTime, formatETB, formatNumber, formatPercent, timeAgo } from '../../lib/format'
import { paymentSuccessRate } from '../../lib/engine'
import { useStore } from '../../store/useStore'
import type { Auction, PaymentStatus } from '../../types'
import { AdminCard, AdminPageHeader, AdminStat, AdminTableWrap, DataTable, EmptyTableRow, StatBar, Td, Th } from './components'

const paymentColors: Record<PaymentStatus, string> = {
  success: '#43B02A',
  failed: '#E4002B',
  pending: '#F2A900',
  cancelled: '#9AA3AE',
  timeout: '#F97316',
  reversed: '#8B5CF6',
}

function isPaidEntry(
  entry: { paymentId: string; status: string },
  paymentById: Map<string, { status: PaymentStatus }>,
) {
  const payment = paymentById.get(entry.paymentId)
  return payment?.status === 'success' && !['invalidated', 'refunded', 'void', 'cancelled'].includes(entry.status)
}

export default function AdminOverview() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const state = useStore((s) => s)
  const closeAuction = useStore((s) => s.closeAuction)
  const fastForwardAuction = useStore((s) => s.fastForwardAuction)
  const startGuidedDemo = useStore((s) => s.startGuidedDemo)
  const resetDemo = useStore((s) => s.resetDemo)

  const data = useMemo(() => {
    const { auctions, payments, entries, bids, refunds, winners, audit, ignoredEvents } = state
    const paymentById = new Map(payments.map((p) => [p.id, p]))
    const paidEntries = entries.filter((entry) => isPaidEntry(entry, paymentById))
    const successPayments = payments.filter((p) => p.status === 'success')
    const gross = successPayments.reduce((sum, p) => sum + p.amount, 0)
    const validBids = bids.filter((b) => b.valid)
    const amountCounts = new Map<string, number>()
    for (const bid of validBids) amountCounts.set(bid.amount.toFixed(2), (amountCounts.get(bid.amount.toFixed(2)) ?? 0) + 1)
    const uniqueBids = [...amountCounts.values()].filter((count) => count === 1).length
    const pendingRefunds = refunds.filter((r) => r.status === 'pending')
    const pendingRefundTotal = pendingRefunds.reduce((sum, r) => sum + r.amount, 0)
    const liveAuctions = auctions.filter((a) => a.status === 'live')
    const closingSoon = liveAuctions.filter((a) => {
      const diff = new Date(a.endAt).getTime() - Date.now()
      return diff > 0 && diff < 2 * 3600_000
    })
    const successRate = paymentSuccessRate(payments)

    const orphanPayments = payments.filter(
      (p) => p.status === 'success' && !entries.some((e) => e.paymentId === p.id),
    )
    const reversedActive = payments.filter((p) => {
      if (p.status !== 'reversed') return false
      const entry = entries.find((e) => e.paymentId === p.id)
      return Boolean(entry && !['invalidated', 'refunded', 'void', 'cancelled'].includes(entry.status))
    })
    const unverifiedWinners = winners.filter((w) => w.verification === 'pending')
    const mismatches = orphanPayments.length + reversedActive.length + ignoredEvents.length

    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date()
      date.setHours(0, 0, 0, 0)
      date.setDate(date.getDate() - (6 - index))
      return date
    })
    const revenueSeries = days.map((date) => {
      const next = new Date(date)
      next.setDate(next.getDate() + 1)
      const dayPayments = successPayments.filter((p) => {
        const at = new Date(p.confirmedAt ?? p.createdAt).getTime()
        return at >= date.getTime() && at < next.getTime()
      })
      const dayEntries = entries.filter((e) => {
        const at = new Date(e.createdAt).getTime()
        return at >= date.getTime() && at < next.getTime()
      })
      return {
        day: new Intl.DateTimeFormat('en-GB', { weekday: 'short' }).format(date),
        date: new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' }).format(date),
        revenue: dayPayments.reduce((sum, p) => sum + p.amount, 0),
        entries: dayEntries.length,
      }
    })

    const statusOrder: PaymentStatus[] = ['success', 'failed', 'pending', 'timeout', 'cancelled', 'reversed']
    const paymentMix = statusOrder
      .map((status) => ({
        name: status,
        value: payments.filter((p) => p.status === status).length,
        color: paymentColors[status],
      }))
      .filter((item) => item.value > 0)

    const auctionProgress = [...auctions]
      .filter((a) => ['live', 'upcoming'].includes(a.status))
      .map((auction) => ({
        auction,
        paid: paidEntries.filter((e) => e.auctionId === auction.id).length,
      }))
      .sort((a, b) => b.paid - a.paid)

    const revenueByAuction = [...auctions]
      .map((auction) => ({
        auction,
        revenue: successPayments.filter((p) => p.auctionId === auction.id).reduce((sum, p) => sum + p.amount, 0),
      }))
      .sort((a, b) => b.revenue - a.revenue)

    return {
      auctions,
      paidEntries,
      successPayments,
      gross,
      validBids,
      uniqueBids,
      pendingRefunds,
      pendingRefundTotal,
      liveAuctions,
      closingSoon,
      successRate,
      orphanPayments,
      reversedActive,
      unverifiedWinners,
      mismatches,
      revenueSeries,
      paymentMix,
      auctionProgress,
      revenueByAuction,
      audit: [...audit].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
      winners,
    }
  }, [state])

  const quickClose = (auction: Auction) => {
    const result = fastForwardAuction(auction.id)
    if (!result.ok) {
      showToast({ tone: 'error', title: 'Could not close auction', message: result.error })
      return
    }
    showToast({
      tone: result.outcome === 'winner' ? 'success' : 'warning',
      title: result.outcome === 'winner' ? 'Auction closed with a winner' : `Auction closed · ${result.outcome}`,
      message: result.winningAmount ? `Winning bid ETB ${result.winningAmount.toFixed(2)}` : auction.title,
    })
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Operations overview"
        title="Auction floor"
        description="Live entry counts, payment health and the next operational actions across the How Low demo."
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
              onClick={() => {
                resetDemo()
                showToast({ tone: 'success', title: 'Demo reset', message: 'Seed auctions, payments and bids restored.' })
              }}
            >
              Reset demo
            </Button>
            <Button
              size="sm"
              leftIcon={<PlayCircle className="h-3.5 w-3.5" />}
              onClick={() => {
                startGuidedDemo()
                navigate('/')
              }}
            >
              Start guided demo
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStat
          label="Gross entry fees"
          value={formatETB(data.gross)}
          icon={BadgeDollarSign}
          tone="green"
          trend={<span className="inline-flex items-center gap-1"><TrendingUp className="h-3 w-3" /> all-time</span>}
          sub={`${formatNumber(data.successPayments.length)} successful payments`}
        />
        <AdminStat
          label="Paid entries"
          value={formatNumber(data.paidEntries.length)}
          icon={Ticket}
          tone="blue"
          sub={`${formatNumber(new Set(data.paidEntries.map((e) => e.userId)).size)} unique participants`}
        />
        <AdminStat
          label="Live auctions"
          value={formatNumber(data.liveAuctions.length)}
          icon={Gavel}
          tone="dark"
          sub={`${data.closingSoon.length} closing in under 2 hours`}
        />
        <AdminStat
          label="Payment success rate"
          value={formatPercent(data.successRate, 1)}
          icon={ChartNoAxesCombined}
          tone={data.successRate >= 80 ? 'green' : 'amber'}
          sub={`${data.validBids.length} valid bids · ${data.uniqueBids} unique`}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
        <AdminCard
          title="Entry fee revenue"
          description="Successful M-PESA payments confirmed over the last 7 days."
          action={<Badge tone="green" dot>Live data</Badge>}
          bodyClassName="p-4"
        >
          <div className="h-[228px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.revenueSeries} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="overviewRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#43B02A" stopOpacity={0.32} />
                    <stop offset="100%" stopColor="#43B02A" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#EEF1ED" vertical={false} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tickMargin={8} />
                <YAxis axisLine={false} tickLine={false} width={54} tickFormatter={(value) => `ETB ${value}`} />
                <Tooltip
                  cursor={{ stroke: '#CFE3C6' }}
                  contentStyle={{ borderRadius: 12, border: '1px solid #E6EAE5', fontSize: 11, boxShadow: '0 10px 30px rgba(20,40,25,.12)' }}
                  formatter={(value: number) => [`ETB ${formatNumber(value)}`, 'Revenue']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#43B02A" strokeWidth={2.4} fill="url(#overviewRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 grid grid-cols-3 divide-x divide-line rounded-xl bg-page/70">
            {[
              ['Today', formatETB(data.revenueSeries[6]?.revenue ?? 0)],
              ['This week', formatETB(data.revenueSeries.reduce((sum, d) => sum + d.revenue, 0))],
              ['Avg / day', formatETB(data.revenueSeries.reduce((sum, d) => sum + d.revenue, 0) / 7)],
            ].map(([label, value]) => (
              <div key={label} className="px-3 py-2">
                <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink-muted">{label}</p>
                <p className="mt-0.5 text-[12.5px] font-extrabold text-ink amount-tabular">{value}</p>
              </div>
            ))}
          </div>
        </AdminCard>

        <AdminCard title="Payment mix" description="All simulated callbacks by final status." bodyClassName="p-4">
          <div className="flex items-center gap-4">
            <div className="relative h-[132px] w-[132px] flex-none">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.paymentMix} dataKey="value" innerRadius={42} outerRadius={63} paddingAngle={2} stroke="none">
                    {data.paymentMix.map((item) => (
                      <Cell key={item.name} fill={item.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #E6EAE5', fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[22px] font-black leading-none text-ink amount-tabular">{data.successPayments.length}</span>
                <span className="mt-1 text-[8px] font-bold uppercase tracking-[0.1em] text-ink-muted">Success</span>
              </div>
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              {data.paymentMix.map((item) => (
                <div key={item.name} className="flex items-center gap-2 text-[10.5px]">
                  <span className="h-2 w-2 flex-none rounded-full" style={{ background: item.color }} />
                  <span className="flex-1 capitalize text-ink-muted">{item.name}</span>
                  <span className="font-bold text-ink amount-tabular">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3 rounded-xl border border-[#F6E2B8] bg-[#FFF7E8] px-3 py-2 text-[10px] leading-relaxed text-[#8A5200]">
            <span className="font-bold">Payment health:</span> {formatPercent(data.successRate, 1)} of simulated callbacks
            succeed. Failures never create entries.
          </div>
        </AdminCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <AdminCard
          title="Auction progress"
          description="Paid entries against each auction's minimum."
          action={
            <Link to="/admin/auctions" className="focus-ring inline-flex items-center gap-1 text-[10px] font-bold text-brand-dark">
              All auctions <ArrowRight className="h-3 w-3" />
            </Link>
          }
          bodyClassName="p-4"
        >
          <div className="space-y-3.5">
            {data.auctionProgress.slice(0, 5).map(({ auction, paid }) => (
              <Link key={auction.id} to={`/admin/auctions/${auction.id}`} className="focus-ring block rounded-xl px-1 py-0.5 transition hover:bg-brand-soft/60">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-[12px] font-bold text-ink">{auction.title}</span>
                    <StatusBadge status={auction.status} />
                  </span>
                  <span className="text-[10.5px] font-bold text-ink-muted amount-tabular">
                    {formatETB(paid * auction.entryFee)}
                  </span>
                </div>
                <div className="mt-1.5">
                  <StatBar label={`${paid} of ${auction.minEntries} entries`} value={paid} max={auction.minEntries} />
                </div>
              </Link>
            ))}
          </div>
        </AdminCard>

        <AdminCard
          title="Needs attention"
          description="Operational exceptions ready for the demo."
          bodyClassName="divide-y divide-line"
        >
          {[
            {
              icon: ShieldAlert,
              tone: 'bg-[#FDECEF] text-accent',
              title: `${data.mismatches} reconciliation exceptions`,
              body: `${data.orphanPayments.length} orphan success payments · ${data.reversedActive.length} reversed with active entries`,
              to: '/admin/reconciliation',
              label: 'Review',
            },
            {
              icon: Undo2,
              tone: 'bg-[#EAF2FF] text-[#1D5FB8]',
              title: `${data.pendingRefunds.length} refunds pending`,
              body: `${formatETB(data.pendingRefundTotal, 2)} waiting to be paid to wallets`,
              to: '/admin/refunds',
              label: 'Process',
            },
            {
              icon: PackageCheck,
              tone: 'bg-[#F1EBFF] text-[#6236B4]',
              title: `${data.unverifiedWinners.length} winners awaiting ID`,
              body: `${data.winners.filter((w) => w.fulfilment === 'dispatched').length} prize dispatched · ${data.winners.filter((w) => w.fulfilment === 'delivered').length} delivered`,
              to: '/admin/fulfilment',
              label: 'Open',
            },
            {
              icon: Clock3,
              tone: 'bg-[#FFF5E6] text-[#9A5B00]',
              title: `${data.closingSoon.length} auctions closing soon`,
              body: data.closingSoon.map((a) => a.title).join(' · ') || 'No auctions in the next 2 hours',
              to: '/admin/auctions',
              label: 'View',
            },
          ].map((item) => {
            const Icon = item.icon
            return (
              <div key={item.title} className="flex items-start gap-3 px-4 py-3">
                <span className={cn('flex h-8 w-8 flex-none items-center justify-center rounded-xl', item.tone)}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11.5px] font-bold text-ink">{item.title}</p>
                  <p className="mt-0.5 truncate text-[10px] text-ink-muted">{item.body}</p>
                </div>
                <Link to={item.to} className="focus-ring inline-flex flex-none items-center gap-1 rounded-full border border-line px-2 py-1 text-[9px] font-bold text-ink-muted hover:border-brand/40 hover:text-brand-dark">
                  {item.label} <ArrowRight className="h-2.5 w-2.5" />
                </Link>
              </div>
            )
          })}
        </AdminCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <AdminCard
          title="Live auction desk"
          description="Quick controls use the real client-side auction engine."
          action={<Badge tone="green" dot>{data.liveAuctions.length} live</Badge>}
        >
          <AdminTableWrap>
            <DataTable>
              <thead>
                <tr>
                  <Th>Auction</Th>
                  <Th>Entries</Th>
                  <Th>Entry fee</Th>
                  <Th>Closes</Th>
                  <Th align="right">Quick action</Th>
                </tr>
              </thead>
              <tbody>
                {data.liveAuctions.length === 0 ? (
                  <EmptyTableRow colSpan={5}>No live auctions. Reset the demo or create one.</EmptyTableRow>
                ) : (
                  data.liveAuctions.map((auction) => {
                    const paid = data.paidEntries.filter((e) => e.auctionId === auction.id).length
                    return (
                      <tr key={auction.id} className="transition hover:bg-brand-soft/40">
                        <Td>
                          <Link to={`/admin/auctions/${auction.id}`} className="focus-ring block">
                            <span className="block text-[12px] font-bold text-ink">{auction.title}</span>
                            <span className="text-[9.5px] text-ink-muted">{auction.category} · {auction.id}</span>
                          </Link>
                        </Td>
                        <Td>
                          <div className="w-28">
                            <div className="mb-1 flex items-center justify-between text-[9px] text-ink-muted">
                              <span>{paid}</span>
                              <span>{auction.minEntries}</span>
                            </div>
                            <Progress value={(paid / auction.minEntries) * 100} height="h-1.5" />
                          </div>
                        </Td>
                        <Td className="font-semibold amount-tabular">{formatETB(auction.entryFee)}</Td>
                        <Td className="text-[10.5px] text-ink-muted">{formatDateTime(auction.endAt)}</Td>
                        <Td align="right">
                          <Button size="sm" variant="secondary" onClick={() => quickClose(auction)} className="h-7 px-2.5 text-[10px]">
                            Fast-forward
                          </Button>
                        </Td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </DataTable>
          </AdminTableWrap>
        </AdminCard>

        <AdminCard
          title="Recent activity"
          description="Audit events written by the auction engine."
          action={
            <Link to="/admin/audit" className="focus-ring inline-flex items-center gap-1 text-[10px] font-bold text-brand-dark">
              Audit log <ArrowRight className="h-3 w-3" />
            </Link>
          }
        >
          <div className="divide-y divide-line/70">
            {data.audit.slice(0, 7).map((event) => (
              <div key={event.id} className="flex gap-2.5 px-4 py-2.5">
                <span className="mt-1 h-1.5 w-1.5 flex-none rounded-full bg-brand" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-page px-1.5 py-0.5 font-mono text-[8px] font-bold text-ink-muted">{event.type}</span>
                    <span className="text-[8.5px] text-ink-soft">{timeAgo(event.timestamp)}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[10.5px] leading-snug text-ink">{event.message}</p>
                  <p className="mt-0.5 text-[8.5px] text-ink-soft">{event.actor}</p>
                </div>
              </div>
            ))}
          </div>
        </AdminCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr]">
        <AdminCard title="Revenue leaders" description="Successful entry fees by auction." bodyClassName="p-3">
          <div className="h-[170px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.revenueByAuction.slice(0, 5).map(({ auction, revenue }) => ({ name: auction.title.split(' ').slice(0, 2).join(' '), revenue }))} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="#EEF1ED" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 8.5 }} interval={0} angle={-12} textAnchor="end" height={38} />
                <YAxis axisLine={false} tickLine={false} width={48} tickFormatter={(value) => `${value}`} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #E6EAE5', fontSize: 11 }} formatter={(value: number) => [formatETB(value), 'Revenue']} />
                <Bar dataKey="revenue" fill="#43B02A" radius={[5, 5, 0, 0]} maxBarSize={38} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </AdminCard>

        <AdminCard title="Demo scenario" description="A one-click lowest-unique-bid story." bodyClassName="p-4">
          <div className="rounded-xl border border-[#CFE3C6] bg-brand-tint/60 p-3">
            <p className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-[0.12em] text-brand-dark">
              <Sparkles className="h-3 w-3" /> Recommended flow
            </p>
            <ol className="mt-2 space-y-1.5 text-[10.5px] leading-snug text-ink">
              <li>1. Pay ETB 10 to enter the Smart TV auction.</li>
              <li>2. Submit a sealed bid of ETB 0.07.</li>
              <li>3. Reach 500 entries with simulated bidders.</li>
              <li>4. Close and reveal the lowest unique bid.</li>
              <li>5. Claim the prize, then reconcile in admin.</li>
            </ol>
          </div>
          <Button
            full
            size="sm"
            className="mt-3"
            leftIcon={<PlayCircle className="h-3.5 w-3.5" />}
            onClick={() => {
              startGuidedDemo()
              navigate('/')
            }}
          >
            Run guided demo
          </Button>
        </AdminCard>

        <AdminCard title="Platform snapshot" description="Seeded operational totals." bodyClassName="p-4">
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { icon: Users, label: 'Users', value: formatNumber(state.users.length) },
              { icon: Wallet, label: 'Payments', value: formatNumber(state.payments.length) },
              { icon: ReceiptText, label: 'Entries', value: formatNumber(state.entries.length) },
              { icon: Trophy, label: 'Winners', value: formatNumber(state.winners.length) },
              { icon: HandCoins, label: 'Refunds', value: formatNumber(state.refunds.length) },
              { icon: CalendarClock, label: 'Ignored events', value: formatNumber(state.ignoredEvents.length) },
            ].map((item) => {
              const Icon = item.icon
              return (
                <div key={item.label} className="rounded-xl border border-line bg-page/60 p-2.5">
                  <Icon className="h-3.5 w-3.5 text-brand-dark" />
                  <p className="mt-2 text-[17px] font-black leading-none text-ink amount-tabular">{item.value}</p>
                  <p className="mt-1 text-[8.5px] font-bold uppercase tracking-wide text-ink-muted">{item.label}</p>
                </div>
              )
            })}
          </div>
          <Link
            to="/admin/settings"
            className="focus-ring mt-3 inline-flex w-full items-center justify-between rounded-xl border border-line px-3 py-2 text-[10px] font-bold text-ink-muted hover:border-brand/40 hover:text-brand-dark"
          >
            Platform settings & data export <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </AdminCard>
      </div>

      <Card className="flex flex-col items-start justify-between gap-3 border-[#CFE3C6] bg-gradient-to-r from-brand-dark to-brand p-4 text-white sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-white/15">
            <AlertTriangle className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[12px] font-bold">Everything here is a client-side simulation.</p>
            <p className="mt-0.5 text-[10.5px] leading-relaxed text-white/70">
              Payment callbacks, SMS notifications, refunds and identity checks are mocked. The auction winner maths is real
              and runs entirely in the browser.
            </p>
          </div>
        </div>
        <Link
          to="/admin/audit"
          className="focus-ring inline-flex flex-none items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[10px] font-extrabold text-brand-dark"
        >
          Inspect audit trail <ArrowRight className="h-3 w-3" />
        </Link>
      </Card>
    </div>
  )
}

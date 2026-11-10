import {
  ArrowRight,
  Banknote,
  CheckCircle2,
  Clock3,
  HandCoins,
  Search,
  Undo2,
  Wallet,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertBox, Badge, Button, Card, Input, StatusBadge, Tabs, cn } from '../../components/ui'
import { useToast } from '../../components/Toast'
import { formatDateTime, formatETB, formatNumber, timeAgo } from '../../lib/format'
import { maskPhone } from '../../lib/engine'
import { useStore } from '../../store/useStore'
import type { RefundReason } from '../../types'
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

type Tab = 'pending' | 'processed' | 'all'
type ReasonFilter = 'all' | RefundReason

const reasonCopy: Record<RefundReason, { label: string; tone: 'red' | 'amber' | 'blue' | 'purple' | 'green' }> = {
  void: { label: 'Auction void', tone: 'red' },
  cancelled: { label: 'Auction cancelled', tone: 'amber' },
  reversed: { label: 'Payment reversed', tone: 'purple' },
  unspent_credit: { label: 'Unspent entry', tone: 'blue' },
  max_entries: { label: 'Entry limit', tone: 'green' },
}

export default function AdminRefunds() {
  const state = useStore((s) => s)
  const processRefunds = useStore((s) => s.processRefunds)
  const { showToast } = useToast()
  const [tab, setTab] = useState<Tab>('pending')
  const [reason, setReason] = useState<ReasonFilter>('all')
  const [query, setQuery] = useState('')

  const data = useMemo(() => {
    const auctionById = new Map(state.auctions.map((a) => [a.id, a]))
    const userById = new Map(state.users.map((u) => [u.id, u]))
    const rows = [...state.refunds]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((refund) => ({
        refund,
        auction: auctionById.get(refund.auctionId),
        user: userById.get(refund.userId),
      }))

    const pending = state.refunds.filter((r) => r.status === 'pending')
    const processed = state.refunds.filter((r) => r.status === 'processed')
    const byAuction = new Map<
      string,
      { auctionId: string; title: string; pending: number; pendingTotal: number; processed: number; total: number }
    >()
    for (const refund of state.refunds) {
      const auction = auctionById.get(refund.auctionId)
      const item =
        byAuction.get(refund.auctionId) ?? {
          auctionId: refund.auctionId,
          title: auction?.title ?? refund.auctionId,
          pending: 0,
          pendingTotal: 0,
          processed: 0,
          total: 0,
        }
      item.total += refund.amount
      if (refund.status === 'pending') {
        item.pending += 1
        item.pendingTotal += refund.amount
      } else {
        item.processed += 1
      }
      byAuction.set(refund.auctionId, item)
    }

    return {
      rows,
      pending,
      processed,
      pendingTotal: pending.reduce((sum, r) => sum + r.amount, 0),
      processedTotal: processed.reduce((sum, r) => sum + r.amount, 0),
      queue: [...byAuction.values()].filter((item) => item.pending > 0).sort((a, b) => b.pendingTotal - a.pendingTotal),
      usersAffected: new Set(pending.map((r) => r.userId)).size,
    }
  }, [state])

  const filtered = data.rows.filter(({ refund, user, auction }) => {
    if (tab !== 'all' && refund.status !== tab) return false
    if (reason !== 'all' && refund.reason !== reason) return false
    const q = query.trim().toLowerCase()
    if (!q) return true
    return [refund.id, refund.note, refund.entryId, user?.name, user?.phone, auction?.title]
      .some((value) => String(value ?? '').toLowerCase().includes(q))
  })

  const pay = (auctionId?: string) => {
    const result = processRefunds(auctionId)
    showToast({
      tone: result.count ? 'success' : 'info',
      title: result.count ? `${result.count} refund${result.count === 1 ? '' : 's'} paid` : 'Nothing to process',
      message: result.count
        ? `${formatETB(result.total, 2)} credited to How Low wallets via simulated M-PESA.`
        : 'There are no pending refunds in this selection.',
    })
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Money back"
        title="Refunds"
        description="Pay entry fees back to wallets after a void, a cancellation, a reversal or an unused entry. Every payout writes an audit event."
        actions={
          <>
            <Link
              to="/admin/reconciliation"
              className="focus-ring inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-white px-3.5 text-[12px] font-semibold text-ink-muted hover:border-brand/40 hover:text-brand-dark"
            >
              <Wallet className="h-3.5 w-3.5" /> Reconciliation
            </Link>
            <Button
              size="sm"
              leftIcon={<Banknote className="h-3.5 w-3.5" />}
              onClick={() => pay()}
              disabled={!data.pending.length}
            >
              Process all · {formatETB(data.pendingTotal, 2)}
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStat
          label="Pending refunds"
          value={formatETB(data.pendingTotal, 2)}
          icon={Clock3}
          tone={data.pending.length ? 'amber' : 'green'}
          sub={`${formatNumber(data.pending.length)} queue${data.pending.length === 1 ? '' : 's'} across ${data.queue.length} auction${data.queue.length === 1 ? '' : 's'}`}
        />
        <AdminStat
          label="Refunded to date"
          value={formatETB(data.processedTotal, 2)}
          icon={CheckCircle2}
          tone="green"
          sub={`${formatNumber(data.processed.length)} payouts completed`}
        />
        <AdminStat
          label="Participants affected"
          value={formatNumber(data.usersAffected)}
          icon={HandCoins}
          tone="blue"
          sub="Unique users waiting for money back"
        />
        <AdminStat
          label="Reversals in queue"
          value={formatNumber(data.pending.filter((r) => r.reason === 'reversed').length)}
          icon={Undo2}
          tone="purple"
          sub="Provider reversals that need a wallet credit"
        />
      </div>

      {data.queue.length ? (
        <AdminCard
          title="Auction queues"
          description="Process a single auction without touching the rest of the ledger."
          action={<Badge tone="amber">{formatETB(data.pendingTotal, 2)} queued</Badge>}
          bodyClassName="grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-3"
        >
          {data.queue.map((item) => (
            <div key={item.auctionId} className="rounded-xl border border-line bg-page/50 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[11.5px] font-bold text-ink">{item.title}</p>
                  <p className="mt-0.5 text-[9px] text-ink-muted">
                    {item.pending} pending · {item.processed} already paid
                  </p>
                </div>
                <Badge tone="amber" className="px-1.5 py-0 text-[8px]">{formatETB(item.pendingTotal, 2)}</Badge>
              </div>
              <Button
                full
                size="sm"
                variant="secondary"
                className="mt-2.5 h-8 text-[10.5px]"
                onClick={() => pay(item.auctionId)}
              >
                Pay {item.pending} refund{item.pending === 1 ? '' : 's'}
              </Button>
            </div>
          ))}
        </AdminCard>
      ) : (
        <AlertBox tone="success" title="The refund queue is clear">
          Every entry fee owed to a participant has been paid back to their demo wallet.
        </AlertBox>
      )}

      <Card className="p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Tabs
            items={[
              { value: 'pending', label: 'Pending', count: data.pending.length },
              { value: 'processed', label: 'Processed', count: data.processed.length },
              { value: 'all', label: 'All', count: state.refunds.length },
            ]}
            value={tab}
            onChange={(value) => setTab(value as Tab)}
            className="max-w-md"
          />
          <div className="relative w-full lg:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-soft" />
            <Input
              placeholder="Search user, auction or refund ID"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-9 pl-9 text-[11.5px]"
            />
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {([
            ['all', 'All reasons'],
            ['void', 'Auction void'],
            ['cancelled', 'Cancelled'],
            ['reversed', 'Reversed'],
            ['unspent_credit', 'Unspent entry'],
            ['max_entries', 'Entry limit'],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setReason(value)}
              className={cn(
                'focus-ring rounded-full px-2.5 py-1 text-[10px] font-bold transition',
                reason === value ? 'bg-brand text-white' : 'bg-page text-ink-muted hover:text-ink',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <AdminTableWrap>
          <DataTable className="min-w-[960px]">
            <thead>
              <tr>
                <Th>Refund</Th>
                <Th>Participant</Th>
                <Th>Auction</Th>
                <Th>Amount</Th>
                <Th>Reason</Th>
                <Th>Status</Th>
                <Th>Created</Th>
                <Th align="right">Action</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <EmptyTableRow colSpan={8}>No refunds match this view.</EmptyTableRow>
              ) : (
                filtered.slice(0, 200).map(({ refund, user, auction }) => (
                  <tr key={refund.id} className="transition hover:bg-brand-soft/30">
                    <Td>
                      <span className="block font-mono text-[10px] font-bold text-brand-dark">{refund.id}</span>
                      <span className="mt-0.5 block font-mono text-[8px] text-ink-soft">
                        {refund.entryId ?? refund.paymentId ?? 'Manual queue'}
                      </span>
                    </Td>
                    <Td>
                      <span className="block text-[11px] font-semibold text-ink">{user?.name ?? 'Unknown user'}</span>
                      <span className="block text-[9px] text-ink-muted">{maskPhone(user?.phone ?? '')}</span>
                    </Td>
                    <Td>
                      <Link
                        to={`/admin/auctions/${refund.auctionId}`}
                        className="focus-ring block max-w-[160px] truncate text-[10.5px] font-semibold text-brand-dark hover:underline"
                      >
                        {auction?.title ?? refund.auctionId}
                      </Link>
                      <span className="block text-[8.5px] text-ink-soft">{refund.auctionId}</span>
                    </Td>
                    <Td className="font-bold amount-tabular">{formatETB(refund.amount, 2)}</Td>
                    <Td>
                      <Badge tone={reasonCopy[refund.reason].tone} className="px-2 py-0.5 text-[8px]">
                        {reasonCopy[refund.reason].label}
                      </Badge>
                      {refund.note ? <span className="mt-1 block max-w-[170px] text-[9px] leading-snug text-ink-muted">{refund.note}</span> : null}
                    </Td>
                    <Td><StatusBadge status={refund.status} /></Td>
                    <Td className="text-[9.5px] text-ink-muted">
                      {formatDateTime(refund.createdAt)}
                      <span className="block text-[8.5px] text-ink-soft">{timeAgo(refund.createdAt)}</span>
                    </Td>
                    <Td align="right">
                      {refund.status === 'pending' ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-7 px-2.5 text-[10px]"
                          onClick={() => pay(refund.auctionId)}
                        >
                          Process queue
                        </Button>
                      ) : (
                        <span className="text-[9px] text-ink-muted">
                          {refund.processedAt ? formatDateTime(refund.processedAt) : 'Paid'}
                        </span>
                      )}
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </DataTable>
        </AdminTableWrap>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-3 py-2.5 text-[10px] text-ink-muted">
          <span>
            <strong className="text-ink">{filtered.length}</strong> refund{filtered.length === 1 ? '' : 's'} shown
          </span>
          <span className="inline-flex items-center gap-2">
            <Badge tone="amber">{data.pending.length} pending</Badge>
            <Badge tone="blue">{data.processed.length} processed</Badge>
            <ExportButton
              filename="howlow-refunds.csv"
              label="Export refunds"
              rows={filtered.map(({ refund, user, auction }) => ({
                id: refund.id,
                auction: auction?.title ?? refund.auctionId,
                participant: user?.name ?? '',
                phone: user?.phone ?? '',
                amount_etb: refund.amount,
                reason: refund.reason,
                status: refund.status,
                entry_id: refund.entryId ?? '',
                payment_id: refund.paymentId ?? '',
                created_at: refund.createdAt,
                processed_at: refund.processedAt ?? '',
                note: refund.note ?? '',
              }))}
            />
          </span>
        </div>
      </Card>

      <div className="grid gap-3 lg:grid-cols-3">
        <AdminCard title="Refund rules" bodyClassName="divide-y divide-line">
          {[
            ['Auction void', 'No unique bid existed, so every entry fee is returned.'],
            ['Auction cancelled', 'The minimum entry count was not reached before close.'],
            ['Payment reversed', 'The provider took the money back; the entry and bid are invalid.'],
            ['Unspent entry', 'A payment settled but no sealed bid was submitted before close.'],
          ].map(([title, body]) => (
            <div key={title} className="px-4 py-2.5">
              <p className="text-[10.5px] font-bold text-ink">{title}</p>
              <p className="mt-0.5 text-[9.5px] leading-snug text-ink-muted">{body}</p>
            </div>
          ))}
        </AdminCard>

        <AdminCard title="How payout works" bodyClassName="p-4">
          <ol className="space-y-2.5">
            {[
              ['1', 'The auction engine queues a refund with an amount and a reason.'],
              ['2', 'The operations desk reviews the queue and pays one auction or everything.'],
              ['3', 'The amount is credited to the participant’s demo wallet instantly.'],
              ['4', 'The refund, wallet credit and audit event are stored in localStorage.'],
            ].map(([number, text]) => (
              <li key={number} className="flex gap-2.5">
                <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-ink text-[8px] font-black text-white">
                  {number}
                </span>
                <p className="text-[10px] leading-relaxed text-ink-muted">{text}</p>
              </li>
            ))}
          </ol>
          <AlertBox tone="info" className="mt-3">
            The seed deliberately leaves refunds pending so the payout flow is visible. Processed refunds also update the
            linked entry status to refunded.
          </AlertBox>
        </AdminCard>

        <AdminCard title="Settlement shortcuts" bodyClassName="p-4 space-y-2">
          <Link
            to="/admin/payments"
            className="focus-ring flex items-center justify-between rounded-xl border border-line px-3 py-2.5 text-[10.5px] font-bold text-ink-muted hover:border-brand/40 hover:text-brand-dark"
          >
            <span className="inline-flex items-center gap-2"><Wallet className="h-3.5 w-3.5" /> Inspect payments</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
          <Link
            to="/admin/reconciliation"
            className="focus-ring flex items-center justify-between rounded-xl border border-line px-3 py-2.5 text-[10.5px] font-bold text-ink-muted hover:border-brand/40 hover:text-brand-dark"
          >
            <span className="inline-flex items-center gap-2"><Undo2 className="h-3.5 w-3.5" /> Queue a manual refund</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
          <Link
            to="/admin/audit"
            className="focus-ring flex items-center justify-between rounded-xl border border-line px-3 py-2.5 text-[10.5px] font-bold text-ink-muted hover:border-brand/40 hover:text-brand-dark"
          >
            <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5" /> Review refund events</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
          <div className="rounded-xl border border-[#CFE3C6] bg-brand-tint/60 px-3 py-2.5">
            <p className="text-[9px] font-extrabold uppercase tracking-wide text-brand-dark">Queue snapshot</p>
            <p className="mt-1 text-[10px] leading-relaxed text-ink-muted">
              {formatNumber(state.refunds.length)} refunds recorded · {formatETB(data.pendingTotal, 2)} still owed to
              participants.
            </p>
          </div>
        </AdminCard>
      </div>
    </div>
  )
}

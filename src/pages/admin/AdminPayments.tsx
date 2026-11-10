import {
  ArrowRight,
  BadgeCheck,
  Ban,
  CheckCircle2,
  Clock3,
  CreditCard,
  Eye,
  Hash,
  RefreshCw,
  Search,
  ShieldAlert,
  Smartphone,
  Undo2,
  Wallet,
  XCircle,
} from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AlertBox, Badge, Button, Card, Input, Modal, StatusBadge, Tabs, cn } from '../../components/ui'
import { useToast } from '../../components/Toast'
import { formatDateTime, formatETB, formatNumber, formatPercent, formatPhoneDisplay } from '../../lib/format'
import { paymentSuccessRate, maskPhone } from '../../lib/engine'
import { useStore } from '../../store/useStore'
import type { Payment, PaymentStatus } from '../../types'
import { AdminPageHeader, AdminStat, AdminTableWrap, DataTable, EmptyTableRow, ExportButton, Td, Th } from './components'

type Filter = 'all' | PaymentStatus

const tabs: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'success', label: 'Success' },
  { value: 'pending', label: 'Pending' },
  { value: 'failed', label: 'Failed' },
  { value: 'timeout', label: 'Timeout' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'reversed', label: 'Reversed' },
]

export default function AdminPayments() {
  const { showToast } = useToast()
  const state = useStore((s) => s)
  const resolvePayment = useStore((s) => s.resolvePayment)
  const reversePayment = useStore((s) => s.reversePayment)
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const data = useMemo(() => {
    const auctionById = new Map(state.auctions.map((a) => [a.id, a]))
    const userById = new Map(state.users.map((u) => [u.id, u]))
    const entriesByPayment = new Map(state.entries.map((e) => [e.paymentId, e]))
    const rows = [...state.payments]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((payment) => ({
        payment,
        auction: auctionById.get(payment.auctionId),
        user: userById.get(payment.userId),
        entry: entriesByPayment.get(payment.id),
      }))
    const success = state.payments.filter((p) => p.status === 'success')
    return {
      rows,
      success,
      gross: success.reduce((sum, p) => sum + p.amount, 0),
      rate: paymentSuccessRate(state.payments),
      pending: state.payments.filter((p) => p.status === 'pending').length,
      failures: state.payments.filter((p) => ['failed', 'timeout', 'cancelled'].includes(p.status)).length,
      reversed: state.payments.filter((p) => p.status === 'reversed').length,
      ignored: state.ignoredEvents.length,
    }
  }, [state])

  const selected = data.rows.find((row) => row.payment.id === selectedId)

  const filtered = data.rows.filter(({ payment, user, auction }) => {
    if (filter !== 'all' && payment.status !== filter) return false
    const q = query.trim().toLowerCase()
    if (!q) return true
    return [payment.ref, payment.phone, user?.name, auction?.title, payment.id, payment.status]
      .some((value) => String(value ?? '').toLowerCase().includes(q))
  })

  const resolve = (payment: Payment, outcome: 'success' | 'failed' | 'cancelled' | 'timeout') => {
    const result = resolvePayment(payment.id, outcome)
    showToast({
      tone: result.ok ? (outcome === 'success' ? 'success' : 'warning') : 'error',
      title: result.ok ? `Callback processed · ${outcome}` : 'Callback ignored',
      message: result.ok
        ? `${payment.ref} · ${outcome === 'success' ? 'entry created if eligible' : 'no entry created'}`
        : result.error,
    })
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Payments & callbacks"
        title="Payments"
        description="Every simulated M-PESA intent and callback, with idempotency guards and a full entry trail."
        actions={
          <>
            <Link
              to="/admin/reconciliation"
              className="focus-ring inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-white px-3.5 text-[12px] font-semibold text-ink-muted hover:border-brand/40 hover:text-brand-dark"
            >
              <ShieldAlert className="h-3.5 w-3.5" /> Reconciliation
            </Link>
            <ExportButton
              filename="howlow-payments.csv"
              rows={filtered.map(({ payment, user, auction, entry }) => ({
                id: payment.id,
                ref: payment.ref,
                auction: auction?.title ?? '',
                user: user?.name ?? '',
                phone: payment.phone,
                amount_etb: payment.amount,
                status: payment.status,
                entry_id: entry?.id ?? '',
                entry_status: entry?.status ?? '',
                replayed: Boolean(payment.replayed),
                created_at: payment.createdAt,
                confirmed_at: payment.confirmedAt ?? '',
                note: payment.note ?? '',
              }))}
            />
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStat label="Gross successful" value={formatETB(data.gross)} icon={Wallet} tone="green" sub={`${formatNumber(data.success.length)} success payments`} />
        <AdminStat label="Success rate" value={formatPercent(data.rate, 1)} icon={BadgeCheck} tone={data.rate >= 80 ? 'green' : 'amber'} sub={`${formatNumber(state.payments.length)} total callbacks`} />
        <AdminStat label="Pending approval" value={formatNumber(data.pending)} icon={Clock3} tone="amber" sub="STK prompts awaiting a response" />
        <AdminStat label="Failures & reversals" value={formatNumber(data.failures + data.reversed)} icon={Ban} tone="red" sub={`${data.ignored} ignored replays`} />
      </div>

      <Card className="p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Tabs
            items={tabs.map((tab) => ({
              ...tab,
              count: tab.value === 'all' ? data.rows.length : data.rows.filter(({ payment }) => payment.status === tab.value).length,
            }))}
            value={filter}
            onChange={(value) => setFilter(value as Filter)}
            className="max-w-full overflow-x-auto"
          />
          <div className="relative w-full lg:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-soft" />
            <Input
              placeholder="Search ref, phone, user or auction"
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
                <Th>Reference</Th>
                <Th>Participant</Th>
                <Th>Auction</Th>
                <Th>Amount</Th>
                <Th>Status</Th>
                <Th>Entry</Th>
                <Th>Created</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <EmptyTableRow colSpan={8}>No payments match this filter.</EmptyTableRow>
              ) : (
                filtered.slice(0, 200).map(({ payment, auction, user, entry }) => (
                  <tr key={payment.id} className="transition hover:bg-brand-soft/30">
                    <Td>
                      <button type="button" onClick={() => setSelectedId(payment.id)} className="focus-ring text-left">
                        <span className="block font-mono text-[10.5px] font-bold text-brand-dark">{payment.ref}</span>
                        <span className="block font-mono text-[8.5px] text-ink-soft">{payment.id}</span>
                      </button>
                      {payment.replayed ? <Badge tone="purple" className="mt-0.5 px-1.5 py-0 text-[7px]">Replay</Badge> : null}
                    </Td>
                    <Td>
                      <span className="block text-[11px] font-semibold text-ink">{user?.name ?? 'Unknown'}</span>
                      <span className="block text-[9px] text-ink-muted">{maskPhone(payment.phone)}</span>
                    </Td>
                    <Td>
                      <span className="block max-w-[150px] truncate text-[10.5px] text-ink">{auction?.title ?? payment.auctionId}</span>
                      <span className="block text-[8.5px] text-ink-soft">{auction?.category}</span>
                    </Td>
                    <Td className="font-bold amount-tabular">{formatETB(payment.amount)}</Td>
                    <Td><StatusBadge status={payment.status} /></Td>
                    <Td>
                      {entry ? <StatusBadge status={entry.status} /> : <span className="text-[9.5px] text-ink-soft">No entry</span>}
                    </Td>
                    <Td className="text-[9.5px] text-ink-muted">{formatDateTime(payment.createdAt)}</Td>
                    <Td align="right">
                      <div className="flex items-center justify-end gap-1">
                        {payment.status === 'pending' ? (
                          <>
                            <button type="button" title="Confirm success" onClick={() => resolve(payment, 'success')} className="focus-ring flex h-7 w-7 items-center justify-center rounded-lg border border-line text-brand-dark hover:border-brand/40">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </button>
                            <button type="button" title="Fail payment" onClick={() => resolve(payment, 'failed')} className="focus-ring flex h-7 w-7 items-center justify-center rounded-lg border border-line text-accent hover:border-accent/30">
                              <XCircle className="h-3.5 w-3.5" />
                            </button>
                          </>
                        ) : null}
                        {payment.status === 'success' ? (
                          <button
                            type="button"
                            title="Reverse payment"
                            onClick={() => {
                              const result = reversePayment(payment.id)
                              showToast({ tone: result.ok ? 'warning' : 'error', title: result.ok ? 'Payment reversed' : 'Could not reverse', message: result.ok ? `${payment.ref} · linked bid invalidated` : result.error })
                            }}
                            className="focus-ring flex h-7 w-7 items-center justify-center rounded-lg border border-line text-ink-muted hover:border-accent/30 hover:text-accent"
                          >
                            <Undo2 className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                        <button type="button" title="View payment" onClick={() => setSelectedId(payment.id)} className="focus-ring flex h-7 w-7 items-center justify-center rounded-lg bg-page text-ink-muted hover:bg-brand-tint hover:text-brand-dark">
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </DataTable>
        </AdminTableWrap>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-3 py-2.5 text-[10px] text-ink-muted">
          <span>Showing {Math.min(200, filtered.length)} of {filtered.length} payments</span>
          <span className="inline-flex items-center gap-2">
            <Badge tone="green" dot>{data.pending} pending</Badge>
            <Badge tone="purple">{data.ignored} ignored events</Badge>
            <Link to="/admin/reconciliation" className="inline-flex items-center gap-1 font-bold text-brand-dark">
              Open reconciliation <ArrowRight className="h-3 w-3" />
            </Link>
          </span>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { icon: ShieldAlert, title: 'Idempotent callbacks', body: 'A replayed callback is logged as an ignored event and never creates a second entry.' },
          { icon: CreditCard, title: 'Only success enters', body: 'Failed, cancelled and timed-out payments never create entries or bids.' },
          { icon: Undo2, title: 'Reversal safety', body: 'Reversing before close invalidates the linked bid and queues a refund.' },
        ].map((item) => {
          const Icon = item.icon
          return (
            <Card key={item.title} className="p-3.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-tint text-brand-dark"><Icon className="h-4 w-4" /></span>
              <p className="mt-2 text-[11.5px] font-bold text-ink">{item.title}</p>
              <p className="mt-1 text-[10.5px] leading-relaxed text-ink-muted">{item.body}</p>
            </Card>
          )
        })}
      </div>

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelectedId(null)}
        title={selected ? `Payment ${selected.payment.ref}` : 'Payment'}
        description={selected ? `${selected.auction?.title ?? selected.payment.auctionId} · ${formatDateTime(selected.payment.createdAt)}` : undefined}
        footer={
          selected ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)}>Close</Button>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
                onClick={() => {
                  const result = resolvePayment(selected.payment.id, 'success')
                  showToast({
                    tone: 'info',
                    title: result.replayed ? 'Replay blocked by idempotency' : result.ok ? 'Callback processed' : 'Ignored',
                    message: result.error ?? 'The duplicate callback was recorded in ignored events.',
                  })
                }}
              >
                Replay callback
              </Button>
              {selected.payment.status === 'pending' ? (
                <Button size="sm" onClick={() => resolve(selected.payment, 'success')}>Approve success</Button>
              ) : null}
              {selected.payment.status === 'success' ? (
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    const result = reversePayment(selected.payment.id)
                    showToast({ tone: result.ok ? 'warning' : 'error', title: result.ok ? 'Payment reversed' : 'Could not reverse', message: result.error })
                    setSelectedId(null)
                  }}
                >
                  Reverse payment
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
                <p className="text-[9px] font-bold uppercase tracking-wide text-ink-muted">Amount</p>
                <p className="text-[22px] font-black leading-none text-ink amount-tabular">{formatETB(selected.payment.amount)}</p>
              </div>
              <StatusBadge status={selected.payment.status} />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Detail label="Reference" value={<span className="font-mono">{selected.payment.ref}</span>} />
              <Detail label="Payment ID" value={<span className="font-mono text-[9px]">{selected.payment.id}</span>} />
              <Detail label="Participant" value={selected.user?.name ?? 'Unknown'} />
              <Detail label="Phone" value={formatPhoneDisplay(selected.payment.phone)} />
              <Detail label="Auction" value={selected.auction?.title ?? selected.payment.auctionId} />
              <Detail label="Entry" value={selected.entry ? <StatusBadge status={selected.entry.status} /> : 'No entry created'} />
              <Detail label="Created" value={formatDateTime(selected.payment.createdAt)} />
              <Detail label="Confirmed" value={selected.payment.confirmedAt ? formatDateTime(selected.payment.confirmedAt) : '—'} />
            </div>
            {selected.payment.note ? <AlertBox tone="info" title="Processor note">{selected.payment.note}</AlertBox> : null}
            {selected.payment.replayed ? <AlertBox tone="warning" title="Flagged as a replayed callback">This payment was recorded after a duplicate callback. It did not create a second entry.</AlertBox> : null}
            {selected.entry?.bidId ? (
              <div className="rounded-xl border border-line px-3 py-2">
                <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wide text-ink-muted"><Hash className="h-3 w-3" /> Linked bid</p>
                <p className="mt-1 font-mono text-[9px] text-ink-muted">{state.bids.find((b) => b.id === selected.entry?.bidId)?.hash ?? '—'}</p>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-white px-2.5 py-1.5">
      <p className="text-[8.5px] font-bold uppercase tracking-wide text-ink-muted">{label}</p>
      <div className="mt-0.5 text-[10.5px] font-semibold text-ink">{value}</div>
    </div>
  )
}

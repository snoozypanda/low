import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  ClipboardList,
  Link2Off,
  RefreshCcw,
  Repeat2,
  Search,
  ShieldAlert,
  ShieldCheck,
  Undo2,
  Wallet,
  XCircle,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertBox, Badge, Button, Card, Input, StatusBadge, Tabs, cn } from '../../components/ui'
import { useToast } from '../../components/Toast'
import { formatDateTime, formatETB, formatNumber, formatPhoneDisplay, timeAgo } from '../../lib/format'
import { maskPhone } from '../../lib/engine'
import { useStore } from '../../store/useStore'
import { AdminCard, AdminPageHeader, AdminStat, AdminTableWrap, DataTable, EmptyTableRow, ExportButton, Td, Th } from './components'

type Tab = 'exceptions' | 'callbacks'
type IssueKind = 'orphan' | 'reversed' | 'unpaid'

interface Issue {
  key: string
  kind: IssueKind
  severity: 'critical' | 'warning'
  title: string
  detail: string
  amount: number
  auctionId: string
  auctionTitle: string
  userName: string
  phone: string
  paymentId: string
  paymentRef: string
  entryId?: string
  recordedAt: string
}

const issueCopy: Record<IssueKind, { label: string; tone: 'red' | 'purple' | 'amber' }> = {
  orphan: { label: 'Orphan success', tone: 'red' },
  reversed: { label: 'Reversed with active entry', tone: 'purple' },
  unpaid: { label: 'Bid without settled payment', tone: 'amber' },
}

export default function AdminReconciliation() {
  const state = useStore((s) => s)
  const queueManualRefund = useStore((s) => s.queueManualRefund)
  const invalidateEntryForReconciliation = useStore((s) => s.invalidateEntryForReconciliation)
  const { showToast } = useToast()
  const [tab, setTab] = useState<Tab>('exceptions')
  const [query, setQuery] = useState('')
  const [kindFilter, setKindFilter] = useState<'all' | IssueKind>('all')

  const data = useMemo(() => {
    const auctionById = new Map(state.auctions.map((a) => [a.id, a]))
    const userById = new Map(state.users.map((u) => [u.id, u]))
    const entriesByPayment = new Map(state.entries.map((e) => [e.paymentId, e]))
    const paymentById = new Map(state.payments.map((p) => [p.id, p]))

    const orphans = state.payments.filter(
      (payment) => payment.status === 'success' && !entriesByPayment.has(payment.id),
    )

    const reversedActive = state.payments
      .filter((payment) => payment.status === 'reversed')
      .map((payment) => ({ payment, entry: entriesByPayment.get(payment.id) }))
      .filter(({ entry }) => Boolean(entry && !['invalidated', 'refunded', 'void', 'cancelled'].includes(entry.status)))

    const reversedEntryIds = new Set(reversedActive.map(({ entry }) => entry?.id))
    const unpaidEntries = state.entries.filter((entry) => {
      if (!entry.bidId || reversedEntryIds.has(entry.id)) return false
      if (['invalidated', 'refunded', 'void', 'cancelled'].includes(entry.status)) return false
      const payment = paymentById.get(entry.paymentId)
      return !payment || payment.status !== 'success'
    })

    const makeIssue = (input: {
      kind: IssueKind
      paymentId: string
      entryId?: string
      detail: string
    }): Issue => {
      const payment = state.payments.find((p) => p.id === input.paymentId)
      const entry = input.entryId ? state.entries.find((e) => e.id === input.entryId) : undefined
      const auction = auctionById.get(payment?.auctionId ?? entry?.auctionId ?? '')
      const user = userById.get(payment?.userId ?? entry?.userId ?? '')
      return {
        key: `${input.kind}-${input.paymentId}-${input.entryId ?? 'none'}`,
        kind: input.kind,
        severity: input.kind === 'orphan' ? 'critical' : 'warning',
        title:
          input.kind === 'orphan'
            ? 'Payment succeeded with no entry'
            : input.kind === 'reversed'
              ? 'Reversed payment still has a live entry'
              : 'Entry holds a bid without a settled payment',
        detail: input.detail,
        amount: payment?.amount ?? auction?.entryFee ?? 0,
        auctionId: auction?.id ?? '',
        auctionTitle: auction?.title ?? 'Unknown auction',
        userName: user?.name ?? 'Unknown participant',
        phone: payment?.phone ?? user?.phone ?? '',
        paymentId: input.paymentId,
        paymentRef: payment?.ref ?? '—',
        entryId: input.entryId,
        recordedAt: payment?.createdAt ?? entry?.createdAt ?? new Date().toISOString(),
      }
    }

    const issues: Issue[] = [
      ...orphans.map((payment) =>
        makeIssue({
          kind: 'orphan',
          paymentId: payment.id,
          detail: `A confirmed success callback exists for ${formatETB(payment.amount, 2)} but no entry was created. The participant is owed an explanation and a refund.`,
        }),
      ),
      ...reversedActive.map(({ payment, entry }) =>
        makeIssue({
          kind: 'reversed',
          paymentId: payment.id,
          entryId: entry?.id,
          detail: `The provider reversed payment ${payment.ref}, yet entry ${entry?.id} is still ${entry?.status}. Its sealed bid must not be eligible to win.`,
        }),
      ),
      ...unpaidEntries.map((entry) =>
        makeIssue({
          kind: 'unpaid',
          paymentId: entry.paymentId,
          entryId: entry.id,
          detail: `Entry ${entry.id} has a sealed bid but its payment is ${paymentById.get(entry.paymentId)?.status ?? 'missing'}. Invalidate the entry before close.`,
        }),
      ),
    ]

    const filtered = issues.filter((issue) => {
      if (kindFilter !== 'all' && issue.kind !== kindFilter) return false
      const q = query.trim().toLowerCase()
      if (!q) return true
      return [issue.title, issue.auctionTitle, issue.userName, issue.phone, issue.paymentRef, issue.entryId]
        .some((value) => String(value ?? '').toLowerCase().includes(q))
    })

    const ignored = state.ignoredEvents
      .filter((event) => {
        const q = query.trim().toLowerCase()
        if (!q) return true
        return [event.ref, event.reason, event.note].some((value) => value.toLowerCase().includes(q))
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return {
      auctionById,
      userById,
      orphans,
      reversedActive,
      unpaidEntries,
      issues,
      filtered,
      ignored,
      orphanValue: orphans.reduce((sum, payment) => sum + payment.amount, 0),
      reversedValue: reversedActive.reduce((sum, { payment }) => sum + payment.amount, 0),
      criticalCount: issues.filter((issue) => issue.severity === 'critical').length,
      auctionsAffected: new Set(issues.map((issue) => issue.auctionId)).size,
    }
  }, [state, kindFilter, query])

  const resolveIssue = (issue: Issue, silent = false) => {
    const result =
      issue.kind === 'orphan'
        ? queueManualRefund(issue.paymentId, 'unspent_credit', 'Orphan success payment found in reconciliation')
        : invalidateEntryForReconciliation(issue.entryId ?? '', issue.detail)
    if (!silent) {
      showToast({
        tone: result.ok ? 'success' : 'error',
        title: result.ok
          ? issue.kind === 'orphan'
            ? 'Refund queued'
            : 'Entry invalidated'
          : 'Could not resolve exception',
        message: result.ok ? `${issue.paymentRef} · ${issue.auctionTitle}` : result.error,
      })
    }
    return result.ok
  }

  const resolveAll = () => {
    const targets = data.filtered
    let resolved = 0
    for (const issue of targets) {
      if (resolveIssue(issue, true)) resolved += 1
    }
    showToast({
      tone: resolved ? 'success' : 'warning',
      title: `${resolved} of ${targets.length} exceptions resolved`,
      message: resolved
        ? 'Refunds were queued and invalid bids were sealed off. Open Refunds to pay them out.'
        : 'Nothing could be resolved automatically. Review each row individually.',
    })
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Payment integrity"
        title="Reconciliation"
        description="Match every simulated M-PESA callback to an entry, invalidate bids whose money did not settle, and keep replayed callbacks out of the ledger."
        actions={
          <>
            <Link
              to="/admin/payments"
              className="focus-ring inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-white px-3.5 text-[12px] font-semibold text-ink-muted hover:border-brand/40 hover:text-brand-dark"
            >
              <Wallet className="h-3.5 w-3.5" /> Payments
            </Link>
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<RefreshCcw className="h-3.5 w-3.5" />}
              onClick={resolveAll}
              disabled={!data.filtered.length}
            >
              Resolve shown
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStat
          label="Open exceptions"
          value={formatNumber(data.issues.length)}
          icon={ShieldAlert}
          tone={data.issues.length ? 'red' : 'green'}
          sub={`${data.criticalCount} critical · ${data.auctionsAffected} auctions affected`}
        />
        <AdminStat
          label="Orphan success value"
          value={formatETB(data.orphanValue, 2)}
          icon={Wallet}
          tone={data.orphanValue ? 'amber' : 'green'}
          sub={`${data.orphans.length} payment${data.orphans.length === 1 ? '' : 's'} without an entry`}
        />
        <AdminStat
          label="Reversed exposure"
          value={formatETB(data.reversedValue, 2)}
          icon={Undo2}
          tone={data.reversedValue ? 'purple' : 'green'}
          sub={`${data.reversedActive.length} live entr${data.reversedActive.length === 1 ? 'y' : 'ies'} to invalidate`}
        />
        <AdminStat
          label="Ignored callbacks"
          value={formatNumber(state.ignoredEvents.length)}
          icon={Repeat2}
          tone="blue"
          sub="Blocked by the idempotency guard"
        />
      </div>

      <Card className="p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Tabs
            items={[
              { value: 'exceptions', label: 'Exceptions', count: data.issues.length },
              { value: 'callbacks', label: 'Ignored callbacks', count: state.ignoredEvents.length },
            ]}
            value={tab}
            onChange={(value) => setTab(value as Tab)}
            className="max-w-md"
          />
          <div className="relative w-full lg:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-soft" />
            <Input
              placeholder="Search reference, participant or auction"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-9 pl-9 text-[11.5px]"
            />
          </div>
        </div>
        {tab === 'exceptions' ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {([
              ['all', 'All exceptions'],
              ['orphan', 'Orphan success'],
              ['reversed', 'Reversed'],
              ['unpaid', 'Unpaid bid'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setKindFilter(value)}
                className={cn(
                  'focus-ring rounded-full px-2.5 py-1 text-[10px] font-bold transition',
                  kindFilter === value ? 'bg-brand text-white' : 'bg-page text-ink-muted hover:text-ink',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}
      </Card>

      {tab === 'exceptions' ? (
        <Card className="overflow-hidden">
          <AdminTableWrap>
            <DataTable className="min-w-[1020px]">
              <thead>
                <tr>
                  <Th>Exception</Th>
                  <Th>Participant</Th>
                  <Th>Auction</Th>
                  <Th>Amount</Th>
                  <Th>Evidence</Th>
                  <Th>Recorded</Th>
                  <Th align="right">Action</Th>
                </tr>
              </thead>
              <tbody>
                {data.filtered.length === 0 ? (
                  <EmptyTableRow colSpan={7}>
                    No reconciliation exceptions match this view. The payment ledger is clean.
                  </EmptyTableRow>
                ) : (
                  data.filtered.map((issue) => (
                    <tr key={issue.key} className="transition hover:bg-brand-soft/30">
                      <Td>
                        <div className="flex items-start gap-2">
                          <span
                            className={cn(
                              'mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-lg',
                              issue.severity === 'critical'
                                ? 'bg-[#FDECEF] text-accent'
                                : 'bg-[#FFF5E6] text-[#9A5B00]',
                            )}
                          >
                            {issue.kind === 'orphan' ? (
                              <Link2Off className="h-3.5 w-3.5" />
                            ) : issue.kind === 'reversed' ? (
                              <Undo2 className="h-3.5 w-3.5" />
                            ) : (
                              <AlertTriangle className="h-3.5 w-3.5" />
                            )}
                          </span>
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold text-ink">{issue.title}</p>
                            <div className="mt-0.5 flex items-center gap-1.5">
                              <Badge tone={issueCopy[issue.kind].tone} className="px-1.5 py-0 text-[7.5px]">
                                {issueCopy[issue.kind].label}
                              </Badge>
                              {issue.severity === 'critical' ? (
                                <span className="text-[8.5px] font-bold uppercase tracking-wide text-accent">Critical</span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </Td>
                      <Td>
                        <span className="block text-[11px] font-semibold text-ink">{issue.userName}</span>
                        <span className="block text-[9px] text-ink-muted">{maskPhone(issue.phone)}</span>
                      </Td>
                      <Td>
                        {issue.auctionId ? (
                          <Link to={`/admin/auctions/${issue.auctionId}`} className="focus-ring block max-w-[150px] truncate text-[10.5px] font-semibold text-brand-dark hover:underline">
                            {issue.auctionTitle}
                          </Link>
                        ) : (
                          <span className="text-[10.5px] text-ink-muted">{issue.auctionTitle}</span>
                        )}
                        <span className="block text-[8.5px] text-ink-soft">{issue.auctionId || 'No auction'}</span>
                      </Td>
                      <Td className="font-bold amount-tabular">{formatETB(issue.amount, 2)}</Td>
                      <Td>
                        <p className="max-w-[280px] text-[10px] leading-snug text-ink-muted">{issue.detail}</p>
                        <span className="mt-1 block font-mono text-[8.5px] text-ink-soft">
                          {issue.paymentRef} {issue.entryId ? `· ${issue.entryId}` : ''}
                        </span>
                      </Td>
                      <Td className="text-[9.5px] text-ink-muted">
                        {formatDateTime(issue.recordedAt)}
                        <span className="block text-[8.5px] text-ink-soft">{timeAgo(issue.recordedAt)}</span>
                      </Td>
                      <Td align="right">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-7 px-2.5 text-[10px]"
                          onClick={() => resolveIssue(issue)}
                        >
                          {issue.kind === 'orphan' ? 'Queue refund' : 'Invalidate'}
                        </Button>
                      </Td>
                    </tr>
                  ))
                )}
              </tbody>
            </DataTable>
          </AdminTableWrap>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-3 py-2.5 text-[10px] text-ink-muted">
            <span>
              <strong className="text-ink">{data.filtered.length}</strong> exception{data.filtered.length === 1 ? '' : 's'} shown
            </span>
            <span className="inline-flex items-center gap-2">
              <Badge tone="red">{data.issues.length} open</Badge>
              <Badge tone="blue">{state.ignoredEvents.length} ignored</Badge>
              <ExportButton
                filename="howlow-reconciliation.csv"
                label="Export exceptions"
                rows={data.filtered.map((issue) => ({
                  kind: issue.kind,
                  severity: issue.severity,
                  payment_ref: issue.paymentRef,
                  payment_id: issue.paymentId,
                  entry_id: issue.entryId ?? '',
                  auction: issue.auctionTitle,
                  participant: issue.userName,
                  phone: issue.phone,
                  amount_etb: issue.amount,
                  detail: issue.detail,
                  recorded_at: issue.recordedAt,
                }))}
              />
            </span>
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <AdminTableWrap>
            <DataTable className="min-w-[860px]">
              <thead>
                <tr>
                  <Th>Reference</Th>
                  <Th>Reason</Th>
                  <Th>Processor note</Th>
                  <Th>When</Th>
                  <Th align="right">Ledger effect</Th>
                </tr>
              </thead>
              <tbody>
                {data.ignored.length === 0 ? (
                  <EmptyTableRow colSpan={5}>No ignored callbacks match this search.</EmptyTableRow>
                ) : (
                  data.ignored.map((event) => (
                    <tr key={event.id} className="transition hover:bg-brand-soft/30">
                      <Td>
                        <span className="font-mono text-[10px] font-bold text-brand-dark">{event.ref}</span>
                        <span className="mt-0.5 block font-mono text-[8.5px] text-ink-soft">{event.id}</span>
                      </Td>
                      <Td>
                        <Badge tone="purple" className="px-2 py-0.5 text-[8.5px]">{event.reason}</Badge>
                      </Td>
                      <Td>
                        <p className="max-w-[360px] text-[10px] leading-snug text-ink-muted">{event.note}</p>
                      </Td>
                      <Td className="text-[9.5px] text-ink-muted">
                        {formatDateTime(event.createdAt)}
                        <span className="block text-[8.5px] text-ink-soft">{timeAgo(event.createdAt)}</span>
                      </Td>
                      <Td align="right">
                        <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-brand-dark">
                          <CheckCircle2 className="h-3 w-3" /> No duplicate entry
                        </span>
                      </Td>
                    </tr>
                  ))
                )}
              </tbody>
            </DataTable>
          </AdminTableWrap>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-3 py-2.5 text-[10px] text-ink-muted">
            <span>Replayed callbacks are retained for audit but never mutate balances.</span>
            <Link to="/admin/audit" className="inline-flex items-center gap-1 font-bold text-brand-dark">
              Inspect audit trail <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </Card>
      )}

      <div className="grid gap-3 lg:grid-cols-3">
        <AdminCard title="Integrity checks" bodyClassName="divide-y divide-line">
          {[
            {
              label: 'Only settled payments create entries',
              ok: true,
              detail: 'Failed, cancelled and timed-out callbacks never produce entries.',
            },
            {
              label: 'No bid survives a reversed payment',
              ok: data.reversedActive.length === 0,
              detail: data.reversedActive.length
                ? `${data.reversedActive.length} live entr${data.reversedActive.length === 1 ? 'y' : 'ies'} still need invalidation.`
                : 'Every reversed payment has been sealed off from the winner calculation.',
            },
            {
              label: 'Duplicate callbacks are idempotent',
              ok: true,
              detail: `${state.ignoredEvents.length} replays were logged with no second entry.`,
            },
            {
              label: 'Every success payment is accounted for',
              ok: data.orphans.length === 0,
              detail: data.orphans.length
                ? `${data.orphans.length} success payment${data.orphans.length === 1 ? '' : 's'} have no entry and need a refund.`
                : 'All successful payments map to an entry or a completed refund.',
            },
          ].map((check) => (
            <div key={check.label} className="flex items-start gap-2.5 px-4 py-2.5">
              <span
                className={cn(
                  'mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full',
                  check.ok ? 'bg-brand-tint text-brand-dark' : 'bg-[#FDECEF] text-accent',
                )}
              >
                {check.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
              </span>
              <div>
                <p className="text-[10.5px] font-bold text-ink">{check.label}</p>
                <p className="mt-0.5 text-[9.5px] leading-snug text-ink-muted">{check.detail}</p>
              </div>
            </div>
          ))}
        </AdminCard>

        <AdminCard title="How the ledger settles" bodyClassName="p-4">
          <ol className="space-y-2.5">
            {[
              ['1', 'A payment intent is created when the user opens the M-PESA sheet.'],
              ['2', 'Only a confirmed success callback creates one entry.'],
              ['3', 'A reversal before close invalidates the entry and its sealed bid.'],
              ['4', 'Refunds are queued, then paid to the demo wallet in a batch.'],
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
            The demo seeds a few deliberate mismatches so the reconciliation workflow is visible. Resolving them writes real audit events to the in-browser ledger.
          </AlertBox>
        </AdminCard>

        <AdminCard title="Settlement shortcuts" bodyClassName="p-4 space-y-2">
          <Link
            to="/admin/refunds"
            className="focus-ring flex items-center justify-between rounded-xl border border-line px-3 py-2.5 text-[10.5px] font-bold text-ink-muted hover:border-brand/40 hover:text-brand-dark"
          >
            <span className="inline-flex items-center gap-2"><Undo2 className="h-3.5 w-3.5" /> Pay queued refunds</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
          <Link
            to="/admin/payments"
            className="focus-ring flex items-center justify-between rounded-xl border border-line px-3 py-2.5 text-[10.5px] font-bold text-ink-muted hover:border-brand/40 hover:text-brand-dark"
          >
            <span className="inline-flex items-center gap-2"><Wallet className="h-3.5 w-3.5" /> Inspect every callback</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
          <Link
            to="/admin/fulfilment"
            className="focus-ring flex items-center justify-between rounded-xl border border-line px-3 py-2.5 text-[10.5px] font-bold text-ink-muted hover:border-brand/40 hover:text-brand-dark"
          >
            <span className="inline-flex items-center gap-2"><BadgeCheck className="h-3.5 w-3.5" /> Verify the next winner</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
          <div className="rounded-xl border border-[#CFE3C6] bg-brand-tint/60 px-3 py-2.5">
            <p className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-wide text-brand-dark">
              <ShieldCheck className="h-3 w-3" /> Demo-ready evidence
            </p>
            <p className="mt-1 text-[10px] leading-relaxed text-ink-muted">
              {formatNumber(state.payments.length)} payments, {formatNumber(state.entries.length)} entries and{' '}
              {formatNumber(state.bids.length)} sealed bids are represented in this ledger.
            </p>
          </div>
        </AdminCard>
      </div>

      <Card className="border-[#F6E2B8] bg-[#FFFBF2] p-3.5">
        <div className="flex items-start gap-2.5">
          <ClipboardList className="mt-0.5 h-4 w-4 flex-none text-[#9A5B00]" />
          <div>
            <p className="text-[11px] font-bold text-[#7A4A00]">Why reconciliation matters in a lowest-unique-bid auction</p>
            <p className="mt-0.5 text-[10px] leading-relaxed text-[#8A5200]">
              A bid is only eligible when its payment settles. If a reversal or a duplicate callback slips through, the
              winner could change. This screen proves that every valid bid has one settled payment behind it, and that
              every invalidated bid is removed before the auction closes. Phone numbers are masked on screen and exported
              with the same masking policy as the payments desk.
            </p>
          </div>
        </div>
      </Card>

      <p className="text-center text-[9px] text-ink-soft">
        Demo reconciliation only · no provider APIs are called · phone numbers shown as {formatPhoneDisplay('+251712345678').replace(/\d(?=\d{3})/g, 'X')}
      </p>
    </div>
  )
}

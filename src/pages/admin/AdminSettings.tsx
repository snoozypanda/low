import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Database,
  Download,
  FileJson,
  Gavel,
  KeyRound,
  PlayCircle,
  ReceiptText,
  RotateCcw,
  Save,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trophy,
  Undo2,
  Users,
  Wallet,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertBox, Badge, Button, Card, Field, Input, Modal, cn } from '../../components/ui'
import { useToast } from '../../components/Toast'
import { formatDateTime, formatETB, formatNumber } from '../../lib/format'
import { useStore } from '../../store/useStore'
import type { Settings } from '../../types'
import {
  AdminCard,
  AdminPageHeader,
  AdminStat,
  AdminTableWrap,
  DataTable,
  ExportButton,
  Td,
  Th,
} from './components'

function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

const settingFields: Array<{
  key: keyof Settings
  label: string
  suffix: string
  step: number
  hint: string
}> = [
  { key: 'revenueSharePct', label: 'Revenue share', suffix: '%', step: 0.5, hint: 'Partner share of net registration on new auctions.' },
  { key: 'vatPct', label: 'VAT', suffix: '%', step: 0.5, hint: 'Tax rate used when modelling entry-fee revenue.' },
  { key: 'paymentFeePct', label: 'Payment fee', suffix: '%', step: 0.1, hint: 'Mobile-money processing cost used in the economics model.' },
  { key: 'defaultMaxEntries', label: 'Default max entries', suffix: '/ user', step: 1, hint: 'Suggested limit when creating a new auction.' },
  { key: 'defaultMinEntries', label: 'Default minimum entries', suffix: 'entries', step: 10, hint: 'Suggested threshold before a prize can be awarded.' },
]

export default function AdminSettings() {
  const state = useStore((s) => s)
  const updateSettings = useStore((s) => s.updateSettings)
  const resetDemo = useStore((s) => s.resetDemo)
  const startGuidedDemo = useStore((s) => s.startGuidedDemo)
  const endGuidedDemo = useStore((s) => s.endGuidedDemo)
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [form, setForm] = useState<Settings>(state.settings)
  const [resetOpen, setResetOpen] = useState(false)

  useEffect(() => {
    setForm(state.settings)
  }, [state.settings])

  const data = useMemo(() => {
    const success = state.payments.filter((payment) => payment.status === 'success')
    return {
      gross: success.reduce((sum, payment) => sum + payment.amount, 0),
      pendingRefunds: state.refunds.filter((refund) => refund.status === 'pending').length,
      winners: state.winners.length,
      dataPoints:
        state.users.length +
        state.auctions.length +
        state.payments.length +
        state.entries.length +
        state.bids.length +
        state.refunds.length +
        state.notifications.length +
        state.audit.length,
    }
  }, [state])

  const save = () => {
    const next: Settings = {
      revenueSharePct: Math.max(0, Math.min(100, Number(form.revenueSharePct) || 0)),
      vatPct: Math.max(0, Math.min(100, Number(form.vatPct) || 0)),
      paymentFeePct: Math.max(0, Math.min(100, Number(form.paymentFeePct) || 0)),
      defaultMaxEntries: Math.max(1, Math.floor(Number(form.defaultMaxEntries) || 1)),
      defaultMinEntries: Math.max(1, Math.floor(Number(form.defaultMinEntries) || 1)),
    }
    updateSettings(next)
    showToast({
      tone: 'success',
      title: 'Platform settings saved',
      message: 'New economics defaults apply to auctions created from now on.',
    })
  }

  const exportJson = () => {
    downloadJson('howlow-platform-snapshot.json', {
      exportedAt: new Date().toISOString(),
      version: state.version,
      seedAt: state.seedAt,
      settings: state.settings,
      users: state.users,
      auctions: state.auctions,
      payments: state.payments,
      entries: state.entries,
      bids: state.bids,
      refunds: state.refunds,
      winners: state.winners,
      notifications: state.notifications,
      audit: state.audit,
      ignoredEvents: state.ignoredEvents,
    })
    showToast({ tone: 'success', title: 'JSON snapshot exported', message: 'The full client-side demo state was downloaded.' })
  }

  const runGuided = () => {
    startGuidedDemo()
    navigate('/')
    showToast({ tone: 'info', title: 'Guided demo started', message: 'Fresh seed data loaded. Follow the coach card on the mobile app.' })
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Platform controls"
        title="Settings"
        description="Economics defaults, demo data controls and a portable snapshot of the entire client-side platform."
        actions={
          <>
            <Button size="sm" variant="secondary" leftIcon={<FileJson className="h-3.5 w-3.5" />} onClick={exportJson}>
              Export JSON
            </Button>
            <Button size="sm" leftIcon={<Save className="h-3.5 w-3.5" />} onClick={save}>
              Save settings
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStat label="Platform users" value={formatNumber(state.users.length)} icon={Users} tone="blue" sub={`${formatNumber(state.users.filter((u) => u.isBot).length)} simulated bidders`} />
        <AdminStat label="Entry-fee revenue" value={formatETB(data.gross, 2)} icon={Wallet} tone="green" sub={`${formatNumber(state.payments.length)} callbacks`} />
        <AdminStat label="Prize records" value={formatNumber(data.winners)} icon={Trophy} tone="dark" sub={`${data.pendingRefunds} refunds pending`} />
        <AdminStat label="Data points" value={formatNumber(data.dataPoints)} icon={Database} tone="purple" sub={`Seeded ${formatDateTime(state.seedAt)}`} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
        <AdminCard
          title="Economics defaults"
          description="Used by the unit-economics model for newly created auctions."
          action={<Badge tone="green" dot>Client-side</Badge>}
          bodyClassName="p-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {settingFields.map((field) => (
              <Field key={field.key} label={field.label} hint={field.hint}>
                <div className="relative">
                  <Input
                    type="number"
                    min={field.key === 'defaultMaxEntries' || field.key === 'defaultMinEntries' ? 1 : 0}
                    step={field.step}
                    value={form[field.key]}
                    onChange={(event) => setForm({ ...form, [field.key]: Number(event.target.value) })}
                    className="pr-20 text-[12px]"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-ink-soft">
                    {field.suffix}
                  </span>
                </div>
              </Field>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-page/60 px-3 py-2.5">
            <div className="text-[10px] leading-relaxed text-ink-muted">
              Existing auctions keep their own saved economics. Changing defaults never rewrites a closed auction.
            </div>
            <Button size="sm" variant="secondary" onClick={() => setForm(state.settings)} leftIcon={<RotateCcw className="h-3 w-3" />}>
              Revert
            </Button>
          </div>
          <AlertBox tone="info" className="mt-3">
            Settings are stored in localStorage with the rest of the demo. Use reset when you want the seeded assumptions
            back.
          </AlertBox>
        </AdminCard>

        <AdminCard title="Demo accounts & access" description="Everything is pre-authenticated in a fresh demo." bodyClassName="p-4">
          <div className="space-y-2.5">
            <div className="rounded-xl border border-line p-3">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-tint text-[9px] font-black text-brand-dark">ST</span>
                <div>
                  <p className="text-[11px] font-bold text-ink">Selam Tesfaye · bidder</p>
                  <p className="font-mono text-[9px] text-ink-muted">+251 712 345 678</p>
                </div>
              </div>
              <p className="mt-2 text-[9.5px] leading-relaxed text-ink-muted">
                Demo winner of the voucher and current bidder on the smartphone. Any 4-digit OTP works.
              </p>
            </div>
            <div className="rounded-xl border border-line p-3">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-[9px] font-black text-white">SM</span>
                <div>
                  <p className="text-[11px] font-bold text-ink">Sara Mekonnen · operations</p>
                  <p className="font-mono text-[9px] text-ink-muted">admin@howlow.et</p>
                </div>
              </div>
              <p className="mt-2 text-[9.5px] leading-relaxed text-ink-muted">
                Admin session starts authenticated. The sign-in screen accepts any email and password after sign-out.
              </p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link
              to="/"
              className="focus-ring flex items-center justify-between rounded-xl border border-line px-3 py-2 text-[10px] font-bold text-ink-muted hover:border-brand/40 hover:text-brand-dark"
            >
              Mobile app <ArrowUpRight className="h-3 w-3" />
            </Link>
            <Link
              to="/login"
              className="focus-ring flex items-center justify-between rounded-xl border border-line px-3 py-2 text-[10px] font-bold text-ink-muted hover:border-brand/40 hover:text-brand-dark"
            >
              Sign-in screen <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="mt-2 flex items-center gap-1.5 rounded-xl bg-page px-3 py-2 text-[9px] text-ink-soft">
            <KeyRound className="h-3 w-3 flex-none" /> No real credentials, OTPs or provider tokens exist in this demo.
          </div>
        </AdminCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
        <AdminCard
          title="Guided demo"
          description="Reset to fresh seed data, then follow the Smart TV story end to end."
          bodyClassName="p-4"
        >
          <div className="rounded-xl border border-[#CFE3C6] bg-brand-tint/60 p-3">
            <p className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-[0.12em] text-brand-dark">
              <Sparkles className="h-3 w-3" /> One-click narrative
            </p>
            <ol className="mt-2 space-y-1.5 text-[10.5px] leading-snug text-ink">
              <li>1. Pay ETB 10 to enter the Smart TV auction.</li>
              <li>2. Submit a sealed bid of ETB 0.07.</li>
              <li>3. Reach 500 entries with simulated bidders.</li>
              <li>4. Close the auction and reveal the lowest unique bid.</li>
              <li>5. Verify the winner, claim the prize and reconcile in admin.</li>
            </ol>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" leftIcon={<PlayCircle className="h-3.5 w-3.5" />} onClick={runGuided}>
              Start guided demo
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                endGuidedDemo()
                showToast({ tone: 'info', title: 'Guided demo closed' })
              }}
            >
              Stop coach
            </Button>
            <Button size="sm" variant="secondary" onClick={() => navigate('/admin')} className="hidden">
              Admin overview
            </Button>
          </div>
          <p className="mt-3 text-[9.5px] leading-relaxed text-ink-muted">
            The coach card appears on the mobile app and can be exited at any time. Every automated step calls the same
            auction engine used by the manual UI.
          </p>
        </AdminCard>

        <AdminCard
          title="Data export"
          description="Download a portable snapshot of the demo ledger."
          bodyClassName="p-4"
        >
          <div className="space-y-2">
            <button
              type="button"
              onClick={exportJson}
              className="focus-ring flex w-full items-center justify-between rounded-xl border border-line px-3 py-2.5 text-left text-[10.5px] font-bold text-ink hover:border-brand/40 hover:text-brand-dark"
            >
              <span className="inline-flex items-center gap-2"><FileJson className="h-3.5 w-3.5 text-brand-dark" /> Full JSON snapshot</span>
              <Download className="h-3.5 w-3.5" />
            </button>
            <div className="grid gap-2 sm:grid-cols-2">
              <ExportButton
                filename="howlow-auctions.csv"
                label="Auctions CSV"
                rows={state.auctions.map((auction) => ({
                  id: auction.id,
                  title: auction.title,
                  category: auction.category,
                  retail_value_etb: auction.retailValue,
                  entry_fee_etb: auction.entryFee,
                  min_entries: auction.minEntries,
                  max_entries_per_user: auction.maxEntriesPerUser,
                  start_at: auction.startAt,
                  end_at: auction.endAt,
                  status: auction.status,
                  winner_entry_id: auction.winnerEntryId ?? '',
                  winning_amount_etb: auction.winningAmount ?? '',
                }))}
              />
              <ExportButton
                filename="howlow-winners.csv"
                label="Winners CSV"
                rows={state.winners.map((winner) => ({
                  auction_id: winner.auctionId,
                  entry_id: winner.entryId,
                  user_id: winner.userId,
                  winning_amount_etb: winner.amount,
                  verification: winner.verification,
                  fulfilment: winner.fulfilment,
                  method: winner.method ?? '',
                  deadline: winner.deadlineAt,
                }))}
              />
              <ExportButton
                filename="howlow-refunds.csv"
                label="Refunds CSV"
                rows={state.refunds.map((refund) => ({
                  id: refund.id,
                  auction_id: refund.auctionId,
                  entry_id: refund.entryId ?? '',
                  amount_etb: refund.amount,
                  reason: refund.reason,
                  status: refund.status,
                  created_at: refund.createdAt,
                  processed_at: refund.processedAt ?? '',
                }))}
              />
              <ExportButton
                filename="howlow-audit.csv"
                label="Audit CSV"
                rows={state.audit.map((event) => ({
                  id: event.id,
                  auction_id: event.auctionId,
                  type: event.type,
                  actor: event.actor,
                  message: event.message,
                  timestamp: event.timestamp,
                  hash: event.hash ?? '',
                }))}
              />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[9px] text-ink-soft">
            <ShieldCheck className="h-3 w-3 flex-none" /> JSON includes the full ledger. CSV exports mask nothing on the
            admin side.
          </div>
        </AdminCard>
      </div>

      <AdminCard title="Platform snapshot" description="Current record counts and seed provenance." bodyClassName="p-0">
        <AdminTableWrap>
          <DataTable className="min-w-[760px]">
            <thead>
              <tr>
                <Th>Dataset</Th>
                <Th align="right">Records</Th>
                <Th>Source</Th>
                <Th>Notes</Th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'Users', count: state.users.length, source: 'Seed + runtime bots', note: 'Includes the demo bidder and simulated participants.', icon: Users },
                { name: 'Auctions', count: state.auctions.length, source: 'Seed + admin CRUD', note: 'Live, upcoming, closed, void and cancelled states.', icon: Gavel },
                { name: 'Payments', count: state.payments.length, source: 'Simulated M-PESA', note: 'Success, failure, timeout, cancellation and reversal callbacks.', icon: Wallet },
                { name: 'Entries', count: state.entries.length, source: 'Payment callbacks', note: 'Only settled payments create entries.', icon: ReceiptText },
                { name: 'Sealed bids', count: state.bids.length, source: 'Auction engine', note: 'Each bid has a salted SHA-256 receipt.', icon: ShieldCheck },
                { name: 'Refunds', count: state.refunds.length, source: 'Void, cancellation, reversal', note: 'Pending and processed payouts to demo wallets.', icon: Undo2 },
                { name: 'Winner records', count: state.winners.length, source: 'Winner calculation', note: 'Verification and fulfilment state for each prize.', icon: Trophy },
                { name: 'Audit events', count: state.audit.length, source: 'Every state change', note: 'Append-only in this client-side demo.', icon: Database },
              ].map((row) => {
                const Icon = row.icon
                return (
                  <tr key={row.name} className="transition hover:bg-brand-soft/30">
                    <Td>
                      <span className="inline-flex items-center gap-2 text-[11px] font-bold text-ink">
                        <Icon className="h-3.5 w-3.5 text-brand-dark" /> {row.name}
                      </span>
                    </Td>
                    <Td align="right" className="font-bold amount-tabular">{formatNumber(row.count)}</Td>
                    <Td className="text-[10px] text-ink-muted">{row.source}</Td>
                    <Td className="text-[10px] text-ink-muted">{row.note}</Td>
                  </tr>
                )
              })}
            </tbody>
          </DataTable>
        </AdminTableWrap>
      </AdminCard>

      <Card className="border-[#F4CDD4] bg-[#FDECEF]/50 p-4">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-white text-accent">
              <AlertTriangle className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[12px] font-bold text-[#8A0018]">Reset demo data</p>
              <p className="mt-0.5 max-w-2xl text-[10.5px] leading-relaxed text-[#8A0018]/75">
                Restore every auction, payment, bid, refund, winner and audit event to the original seed. Any changes you
                made in this browser will be lost.
              </p>
            </div>
          </div>
          <Button variant="danger" size="sm" leftIcon={<RotateCcw className="h-3.5 w-3.5" />} onClick={() => setResetOpen(true)}>
            Reset everything
          </Button>
        </div>
      </Card>

      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Reset the entire demo?"
        description="This deletes the current browser state and reseeds the product."
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setResetOpen(false)}>Cancel</Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                resetDemo()
                setResetOpen(false)
                showToast({ tone: 'success', title: 'Demo reset', message: 'All seed auctions, payments, bids and refunds restored.' })
              }}
            >
              Reset and reseed
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="rounded-xl border border-line bg-page/60 px-3 py-2.5">
            <p className="text-[10px] font-bold text-ink">You will return to the seeded state:</p>
            <ul className="mt-1.5 space-y-1 text-[10px] text-ink-muted">
              <li>• 3 live auctions with their original entry counts.</li>
              <li>• The exact 0.07 worked example on the voucher.</li>
              <li>• Pending refunds and reconciliation exceptions.</li>
              <li>• The demo bidder signed in and admin authenticated.</li>
            </ul>
          </div>
          <AlertBox tone="warning">
            This action cannot be undone. Export a JSON snapshot first if you want to keep your current changes.
          </AlertBox>
        </div>
      </Modal>

      <p className={cn('text-center text-[9px] text-ink-soft', 'flex items-center justify-center gap-1.5')}>
        <Settings2 className="h-3 w-3" /> How Low operations console · client-side prototype · demo data only
      </p>
    </div>
  )
}

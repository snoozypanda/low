import {
  ArrowRight,
  BarChart3,
  Calculator,
  CheckCircle2,
  Coins,
  Info,
  Pencil,
  ReceiptText,
  RotateCcw,
  TrendingDown,
  TrendingUp,
  Undo2,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { AlertBox, Badge, Button, Card, Field, Input, Modal, StatusBadge, cn } from '../../components/ui'
import { useToast } from '../../components/Toast'
import { defaultEconomics, calculateEconomics } from '../../lib/engine'
import { formatETB, formatNumber, formatPercent } from '../../lib/format'
import { useStore } from '../../store/useStore'
import type { Auction, EconomicsInputs } from '../../types'
import {
  AdminCard,
  AdminPageHeader,
  AdminStat,
  AdminTableWrap,
  DataTable,
  EmptyTableRow,
  ExportButton,
  StatBar,
  Td,
  Th,
} from './components'

interface EconomicsRow {
  auction: Auction
  inputs: EconomicsInputs
  result: ReturnType<typeof calculateEconomics>['result']
}

const inputFields: Array<{ key: keyof EconomicsInputs; label: string; suffix: string; step?: number; hint?: string }> = [
  { key: 'productCost', label: 'Product cost', suffix: 'ETB', step: 50, hint: 'What the prize costs Bidora.' },
  { key: 'vatPct', label: 'VAT', suffix: '%', step: 0.5, hint: 'Included in the entry fee.' },
  { key: 'paymentFeePct', label: 'Payment fee', suffix: '%', step: 0.1, hint: 'Mobile-money processing fee.' },
  { key: 'refundReservePct', label: 'Refund reserve', suffix: '%', step: 0.1, hint: 'Reserved per entry for refunds.' },
  { key: 'revenueSharePct', label: 'Revenue share', suffix: '%', step: 0.5, hint: 'Partner share of net registration.' },
  { key: 'deliveryCost', label: 'Delivery', suffix: 'ETB', step: 10, hint: 'Courier or pickup handling.' },
  { key: 'marketingPct', label: 'Marketing', suffix: '%', step: 0.5, hint: 'Share of gross entry fees.' },
  { key: 'supportCost', label: 'Support', suffix: 'ETB', step: 50, hint: 'Allocated operations support.' },
  { key: 'hostingCost', label: 'Hosting', suffix: 'ETB', step: 25, hint: 'Allocated platform hosting.' },
]

export default function AdminEconomics() {
  const state = useStore((s) => s)
  const updateEconomics = useStore((s) => s.updateEconomics)
  const { showToast } = useToast()
  const [editId, setEditId] = useState<string | null>(null)
  const [draft, setDraft] = useState<EconomicsInputs | null>(null)

  const data = useMemo(() => {
    const paymentById = new Map(state.payments.map((p) => [p.id, p]))
    const rows: EconomicsRow[] = state.auctions.map((auction) => {
      const currentEntrants = state.entries.filter((entry) => {
        if (entry.auctionId !== auction.id) return false
        const payment = paymentById.get(entry.paymentId)
        return payment?.status === 'success' && !['invalidated', 'refunded', 'void', 'cancelled'].includes(entry.status)
      }).length
      const calc = calculateEconomics({
        auction,
        settings: state.settings,
        payments: state.payments,
        refunds: state.refunds,
        currentEntrants,
      })
      return { auction, inputs: calc.inputs, result: calc.result }
    })

    const activeRows = rows.filter((row) => ['live', 'closed'].includes(row.auction.status))
    const totals = rows.reduce(
      (acc, row) => {
        acc.gross += row.result.grossFees
        acc.refunds += row.result.refunds
        acc.contribution += row.result.contribution
        acc.productCost += row.result.productCost
        acc.marketing += row.result.marketing
        acc.safaricomShare += row.result.safaricomShare
        acc.breakEvenReached += row.result.breakEvenReached ? 1 : 0
        return acc
      },
      { gross: 0, refunds: 0, contribution: 0, productCost: 0, marketing: 0, safaricomShare: 0, breakEvenReached: 0 },
    )

    const chart = rows
      .filter((row) => row.result.grossFees > 0)
      .sort((a, b) => b.result.grossFees - a.result.grossFees)
      .slice(0, 7)
      .map((row) => ({
        name: row.auction.title.split(' ').slice(0, 2).join(' '),
        gross: Math.round(row.result.grossFees),
        contribution: Math.round(row.result.contribution),
      }))

    return {
      rows: rows.sort((a, b) => b.result.grossFees - a.result.grossFees),
      activeRows,
      totals,
      chart,
      margin: totals.gross > 0 ? (totals.contribution / totals.gross) * 100 : 0,
    }
  }, [state])

  const selected = data.rows.find((row) => row.auction.id === editId)

  const openEditor = (row: EconomicsRow) => {
    setEditId(row.auction.id)
    setDraft({ ...row.inputs })
  }

  const save = () => {
    if (!editId || !draft) return
    const cleaned = Object.fromEntries(
      Object.entries(draft).map(([key, value]) => [key, Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0]),
    ) as unknown as Partial<EconomicsInputs>
    updateEconomics(editId, cleaned)
    showToast({ tone: 'success', title: 'Assumptions updated', message: 'Unit economics recalculated from the new inputs.' })
    setEditId(null)
    setDraft(null)
  }

  const resetRow = (row: EconomicsRow) => {
    const defaults = defaultEconomics({ ...row.auction, economics: {} }, state.settings)
    updateEconomics(row.auction.id, defaults)
    showToast({ tone: 'info', title: 'Assumptions reset', message: `${row.auction.title} restored to platform defaults.` })
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Profitability"
        title="Unit economics"
        description="Entry-fee revenue versus VAT, mobile-money fees, refunds, partner share, product cost and operations."
        actions={
          <>
            <Link
              to="/admin/refunds"
              className="focus-ring inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-white px-3.5 text-[12px] font-semibold text-ink-muted hover:border-brand/40 hover:text-brand-dark"
            >
              <Undo2 className="h-3.5 w-3.5" /> Refunds
            </Link>
            <ExportButton
              filename="howlow-unit-economics.csv"
              rows={data.rows.map(({ auction, inputs, result }) => ({
                auction: auction.title,
                status: auction.status,
                entry_fee_etb: auction.entryFee,
                retail_value_etb: auction.retailValue,
                paid_entrants: result.currentEntrants,
                break_even_entrants: Number.isFinite(result.breakEvenEntrants) ? result.breakEvenEntrants : 'not reachable',
                gross_fees_etb: result.grossFees,
                vat_etb: result.vat,
                payment_fees_etb: result.paymentFees,
                refunds_etb: result.refunds,
                net_registration_etb: result.netRegistration,
                revenue_share_etb: result.safaricomShare,
                product_cost_etb: result.productCost,
                marketing_etb: result.marketing,
                delivery_etb: result.deliveryCost,
                support_etb: result.supportCost,
                hosting_etb: result.hostingCost,
                contribution_etb: result.contribution,
                vat_pct: inputs.vatPct,
                payment_fee_pct: inputs.paymentFeePct,
                revenue_share_pct: inputs.revenueSharePct,
                refund_reserve_pct: inputs.refundReservePct,
                marketing_pct: inputs.marketingPct,
              }))}
            />
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStat
          label="Entry-fee revenue"
          value={formatETB(data.totals.gross, 2)}
          icon={Coins}
          tone="green"
          sub={`${formatNumber(data.rows.reduce((sum, row) => sum + row.result.currentEntrants, 0))} paid entrants`}
        />
        <AdminStat
          label="Contribution"
          value={formatETB(data.totals.contribution, 2)}
          icon={data.totals.contribution >= 0 ? TrendingUp : TrendingDown}
          tone={data.totals.contribution >= 0 ? 'green' : 'red'}
          sub={`${formatPercent(data.margin, 1)} of gross revenue`}
        />
        <AdminStat
          label="Refunds & reversals"
          value={formatETB(data.totals.refunds, 2)}
          icon={Undo2}
          tone="amber"
          sub={`${formatNumber(state.refunds.filter((r) => r.status === 'pending').length)} refunds still pending`}
        />
        <AdminStat
          label="Break-even auctions"
          value={`${data.totals.breakEvenReached}/${data.rows.length}`}
          icon={CheckCircle2}
          tone="blue"
          sub={`${formatETB(data.totals.productCost)} of prize cost in play`}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_1fr]">
        <AdminCard
          title="Revenue vs contribution"
          description="Gross entry fees compared with what each auction contributes after all costs."
          action={<Badge tone="green" dot>Live model</Badge>}
          bodyClassName="p-4"
        >
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.chart} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid stroke="#EEF1ED" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 8.5 }} interval={0} angle={-12} textAnchor="end" height={42} />
                <YAxis axisLine={false} tickLine={false} width={56} tickFormatter={(value) => `ETB ${value}`} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #E6EAE5', fontSize: 11, boxShadow: '0 10px 30px rgba(20,40,25,.12)' }}
                  formatter={(value: number) => formatETB(value)}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="gross" name="Gross fees" fill="#43B02A" radius={[5, 5, 0, 0]} maxBarSize={34} />
                <Bar dataKey="contribution" name="Contribution" fill="#1F2933" radius={[5, 5, 0, 0]} maxBarSize={34} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 grid grid-cols-3 divide-x divide-line rounded-xl bg-page/70">
            {[
              ['Partner share', formatETB(data.totals.safaricomShare, 2)],
              ['Marketing', formatETB(data.totals.marketing, 2)],
              ['Prize cost', formatETB(data.totals.productCost, 0)],
            ].map(([label, value]) => (
              <div key={label} className="px-3 py-2">
                <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink-muted">{label}</p>
                <p className="mt-0.5 text-[12.5px] font-extrabold text-ink amount-tabular">{value}</p>
              </div>
            ))}
          </div>
        </AdminCard>

        <AdminCard title="The formula" description="How contribution and break-even are calculated." bodyClassName="p-4">
          <div className="space-y-2.5">
            {[
              ['1', 'Net registration = gross entry fees − VAT − payment fees − refunds.'],
              ['2', 'Partner share = net registration × revenue share percentage.'],
              ['3', 'Contribution = net registration − partner share − product cost − delivery − marketing − support − hosting.'],
              ['4', 'Break-even entrants = fixed costs ÷ contribution per entrant.'],
            ].map(([number, text]) => (
              <div key={number} className="flex gap-2.5">
                <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-ink text-[8px] font-black text-white">
                  {number}
                </span>
                <p className="text-[10px] leading-relaxed text-ink-muted">{text}</p>
              </div>
            ))}
          </div>
          <AlertBox tone="info" className="mt-3">
            VAT is treated as tax-inclusive. The refund reserve is used for planning and does not double-count actual refunds
            in the contribution line.
          </AlertBox>
          <div className="mt-3 rounded-xl border border-[#CFE3C6] bg-brand-tint/60 px-3 py-2.5">
            <p className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-wide text-brand-dark">
              <Calculator className="h-3 w-3" /> Demo tip
            </p>
            <p className="mt-1 text-[10px] leading-relaxed text-ink-muted">
              Close the Smart TV auction with the guided flow, then return here. The entrants and contribution update
              immediately.
            </p>
          </div>
        </AdminCard>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
          <div>
            <h2 className="text-[13px] font-bold text-ink">Auction economics</h2>
            <p className="mt-0.5 text-[11px] text-ink-muted">Click a row to edit assumptions for that prize.</p>
          </div>
          <Badge tone="blue">{data.rows.length} auctions</Badge>
        </div>
        <AdminTableWrap>
          <DataTable className="min-w-[1140px]">
            <thead>
              <tr>
                <Th>Auction</Th>
                <Th align="right">Fee</Th>
                <Th align="right">Entrants</Th>
                <Th align="right">Gross fees</Th>
                <Th align="right">Costs</Th>
                <Th align="right">Contribution</Th>
                <Th>Break-even</Th>
                <Th align="right">Margin</Th>
                <Th align="right">Edit</Th>
              </tr>
            </thead>
            <tbody>
              {data.rows.length === 0 ? (
                <EmptyTableRow colSpan={9}>No auctions yet.</EmptyTableRow>
              ) : (
                data.rows.map((row) => {
                  const costs =
                    row.result.productCost +
                    row.result.otherCosts +
                    row.result.safaricomShare +
                    row.result.vat +
                    row.result.paymentFees +
                    row.result.refunds
                  const margin = row.result.grossFees > 0 ? (row.result.contribution / row.result.grossFees) * 100 : 0
                  return (
                    <tr key={row.auction.id} className="transition hover:bg-brand-soft/30">
                      <Td>
                        <div className="flex items-center gap-2">
                          <span className="min-w-0">
                            <span className="block max-w-[190px] truncate text-[11.5px] font-bold text-ink">{row.auction.title}</span>
                            <span className="mt-0.5 flex items-center gap-1.5">
                              <StatusBadge status={row.auction.status} className="px-1.5 py-0 text-[7.5px]" />
                              <span className="text-[8.5px] text-ink-soft">{formatETB(row.auction.retailValue)} retail</span>
                            </span>
                          </span>
                        </div>
                      </Td>
                      <Td align="right" className="font-bold amount-tabular">{formatETB(row.auction.entryFee)}</Td>
                      <Td align="right" className="amount-tabular">
                        {formatNumber(row.result.currentEntrants)}
                        <span className="block text-[8.5px] text-ink-soft">BE {Number.isFinite(row.result.breakEvenEntrants) ? formatNumber(row.result.breakEvenEntrants) : '—'}</span>
                      </Td>
                      <Td align="right" className="amount-tabular">{formatETB(row.result.grossFees, 2)}</Td>
                      <Td align="right" className="amount-tabular text-ink-muted">{formatETB(costs, 2)}</Td>
                      <Td align="right" className={cn('font-bold amount-tabular', row.result.contribution >= 0 ? 'text-brand-dark' : 'text-accent')}>
                        {formatETB(row.result.contribution, 2)}
                      </Td>
                      <Td>
                        <div className="w-28">
                          <StatBar
                            label={row.result.breakEvenReached ? 'Reached' : 'In progress'}
                            value={row.result.currentEntrants}
                            max={Math.max(row.result.currentEntrants, Number.isFinite(row.result.breakEvenEntrants) ? row.result.breakEvenEntrants : row.result.currentEntrants, 1)}
                            tone={row.result.breakEvenReached ? 'green' : 'red'}
                          />
                        </div>
                      </Td>
                      <Td align="right" className={cn('font-bold amount-tabular', margin >= 0 ? 'text-ink' : 'text-accent')}>
                        {formatPercent(margin, 0)}
                      </Td>
                      <Td align="right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            title="Reset assumptions"
                            onClick={() => resetRow(row)}
                            className="focus-ring flex h-7 w-7 items-center justify-center rounded-lg border border-line text-ink-muted hover:border-brand/40 hover:text-brand-dark"
                          >
                            <RotateCcw className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            title="Edit assumptions"
                            onClick={() => openEditor(row)}
                            className="focus-ring flex h-7 w-7 items-center justify-center rounded-lg bg-page text-ink-muted hover:bg-brand-tint hover:text-brand-dark"
                          >
                            <Pencil className="h-3 w-3" />
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
          <span>Contribution is before central overhead and excludes any real provider settlement.</span>
          <Link to="/admin/settings" className="inline-flex items-center gap-1 font-bold text-brand-dark">
            Platform defaults <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { icon: ReceiptText, title: 'Revenue is real ledger data', body: 'Gross fees come from successful simulated payments, not an estimate. Refunds are deducted from net registration.' },
          { icon: BarChart3, title: 'Editable assumptions', body: 'Product cost, VAT, payment fees, partner share, delivery, marketing, support and hosting can be tuned per auction.' },
          { icon: Info, title: 'Planning view only', body: 'Numbers support the demo narrative. No real settlements, taxes or payouts are produced by this page.' },
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

      <Modal
        open={Boolean(editId && draft && selected)}
        onClose={() => {
          setEditId(null)
          setDraft(null)
        }}
        title={selected ? `Edit ${selected.auction.title}` : 'Edit economics'}
        description="Adjust the assumptions used to calculate contribution and break-even."
        width="max-w-2xl"
        footer={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (selected) resetRow(selected)
                setEditId(null)
                setDraft(null)
              }}
            >
              Reset defaults
            </Button>
            <Button variant="secondary" size="sm" onClick={() => { setEditId(null); setDraft(null) }}>Cancel</Button>
            <Button size="sm" onClick={save}>Save assumptions</Button>
          </>
        }
      >
        {draft && selected ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 divide-x divide-line rounded-xl border border-line bg-page/60">
              {[
                ['Gross fees', formatETB(selected.result.grossFees, 2)],
                ['Contribution', formatETB(selected.result.contribution, 2)],
                ['Break-even', Number.isFinite(selected.result.breakEvenEntrants) ? `${formatNumber(selected.result.breakEvenEntrants)} entrants` : 'Not reachable'],
              ].map(([label, value]) => (
                <div key={label} className="px-3 py-2">
                  <p className="text-[8.5px] font-bold uppercase tracking-wide text-ink-muted">{label}</p>
                  <p className="mt-0.5 text-[11.5px] font-extrabold text-ink amount-tabular">{value}</p>
                </div>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {inputFields.map((field) => (
                <Field key={field.key} label={field.label} hint={field.hint}>
                  <div className="relative">
                    <Input
                      type="number"
                      min={0}
                      step={field.step ?? 1}
                      value={draft[field.key]}
                      onChange={(event) => setDraft({ ...draft, [field.key]: Number(event.target.value) })}
                      className="h-10 pr-12 text-[12px]"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-ink-soft">
                      {field.suffix}
                    </span>
                  </div>
                </Field>
              ))}
            </div>
            <AlertBox tone="info" title="What changes">
              These assumptions update this auction only. Platform-wide defaults live in Settings and apply to newly created
              auctions.
            </AlertBox>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

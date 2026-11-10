import {
  ArrowRight,
  Clock3,
  Fingerprint,
  Gavel,
  History,
  ListFilter,
  Printer,
  Search,
  ShieldCheck,
  Sparkles,
  Table2,
  Timer,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Button, Card, CopyButton, Input, Select, cn } from '../../components/ui'
import { formatDate, formatDateTime, formatNumber, timeAgo } from '../../lib/format'
import { shortHash } from '../../lib/engine'
import { useStore } from '../../store/useStore'
import type { AuditEvent, AuditType } from '../../types'
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

type View = 'timeline' | 'table'

const typeTone: Record<string, 'green' | 'red' | 'amber' | 'blue' | 'purple' | 'grey' | 'dark'> = {
  'auction.created': 'blue',
  'auction.updated': 'blue',
  'auction.closed': 'green',
  'auction.cancelled': 'amber',
  'auction.void': 'red',
  'payment.pending': 'amber',
  'payment.confirmed': 'green',
  'payment.failed': 'red',
  'payment.cancelled': 'grey',
  'payment.timeout': 'amber',
  'payment.reversed': 'purple',
  'payment.replay_ignored': 'purple',
  'bid.locked': 'blue',
  'bid.invalidated': 'red',
  'winner.calculated': 'green',
  'winner.next': 'blue',
  'refund.created': 'amber',
  'refund.processed': 'green',
  'fulfilment.updated': 'blue',
  'identity.verified': 'green',
  'demo.generated': 'dark',
}

function eventIcon(type: AuditType) {
  if (type.startsWith('payment.')) return Fingerprint
  if (type.startsWith('bid.')) return Gavel
  if (type.startsWith('winner.') || type.startsWith('identity.') || type.startsWith('fulfilment.')) return ShieldCheck
  if (type.startsWith('demo.')) return Sparkles
  return History
}

export default function AdminAudit() {
  const state = useStore((s) => s)
  const [query, setQuery] = useState('')
  const [type, setType] = useState<'all' | AuditType>('all')
  const [auctionId, setAuctionId] = useState('all')
  const [view, setView] = useState<View>('timeline')

  const data = useMemo(() => {
    const auctionById = new Map(state.auctions.map((a) => [a.id, a]))
    const events = [...state.audit].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    const types = new Map<string, number>()
    for (const event of events) types.set(event.type, (types.get(event.type) ?? 0) + 1)
    const dayMs = 24 * 3600_000
    const last24 = events.filter((event) => Date.now() - new Date(event.timestamp).getTime() < dayMs)
    const hashed = events.filter((event) => Boolean(event.hash))
    const auctions = new Set(events.map((event) => event.auctionId)).size
    return { auctionById, events, types: [...types.entries()].sort((a, b) => b[1] - a[1]), last24, hashed, auctions }
  }, [state])

  const filtered = data.events.filter((event) => {
    if (type !== 'all' && event.type !== type) return false
    if (auctionId !== 'all' && event.auctionId !== auctionId) return false
    const q = query.trim().toLowerCase()
    if (!q) return true
    return [event.message, event.actor, event.type, event.id, event.hash, data.auctionById.get(event.auctionId)?.title]
      .some((value) => String(value ?? '').toLowerCase().includes(q))
  })

  const print = () => window.print()

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Immutable evidence"
        title="Audit log"
        description="Every auction, payment, bid, refund, winner and fulfilment action written by the client-side engine."
        actions={
          <>
            <Button size="sm" variant="secondary" leftIcon={<Printer className="h-3.5 w-3.5" />} onClick={print}>
              Print view
            </Button>
            <ExportButton
              filename="howlow-audit.csv"
              rows={filtered.map((event) => ({
                id: event.id,
                type: event.type,
                auction: data.auctionById.get(event.auctionId)?.title ?? event.auctionId,
                auction_id: event.auctionId,
                actor: event.actor,
                message: event.message,
                timestamp: event.timestamp,
                hash: event.hash ?? '',
                meta: event.meta ? JSON.stringify(event.meta) : '',
              }))}
            />
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStat label="Total events" value={formatNumber(data.events.length)} icon={History} tone="dark" sub={`Across ${data.auctions} auctions`} />
        <AdminStat label="Last 24 hours" value={formatNumber(data.last24.length)} icon={Timer} tone="green" sub="Most recent engine activity" />
        <AdminStat label="Hashed events" value={formatNumber(data.hashed.length)} icon={Fingerprint} tone="blue" sub="Sealed bid SHA-256 receipts" />
        <AdminStat label="Event types" value={formatNumber(data.types.length)} icon={ListFilter} tone="purple" sub={`${state.ignoredEvents.length} ignored callbacks also retained`} />
      </div>

      <Card className="p-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-soft" />
              <Input
                placeholder="Search message, actor, hash or event ID"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-9 pl-9 text-[11.5px]"
              />
            </div>
            <Select value={auctionId} onChange={(event) => setAuctionId(event.target.value)} className="h-9 text-[11.5px] sm:w-52">
              <option value="all">All auctions</option>
              {state.auctions.map((auction) => (
                <option key={auction.id} value={auction.id}>{auction.title}</option>
              ))}
            </Select>
            <Select value={type} onChange={(event) => setType(event.target.value as 'all' | AuditType)} className="h-9 text-[11.5px] sm:w-56">
              <option value="all">All event types</option>
              {data.types.map(([eventType, count]) => (
                <option key={eventType} value={eventType}>{eventType} ({count})</option>
              ))}
            </Select>
          </div>
          <div className="flex rounded-full border border-line bg-white p-1">
            {([
              ['timeline', 'Timeline', History],
              ['table', 'Table', Table2],
            ] as const).map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                onClick={() => setView(value)}
                className={cn(
                  'focus-ring inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10.5px] font-bold transition',
                  view === value ? 'bg-brand text-white' : 'text-ink-muted hover:text-ink',
                )}
              >
                <Icon className="h-3 w-3" /> {label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {view === 'timeline' ? (
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5">
            <div className="flex items-center gap-2 text-[10px] text-ink-muted">
              <ShieldCheck className="h-3.5 w-3.5 text-brand-dark" />
              Newest first · {formatNumber(filtered.length)} events
            </div>
            <span className="text-[9px] text-ink-soft">Hashes are sealed bid receipts, not event signatures</span>
          </div>
          {filtered.length === 0 ? (
            <p className="px-4 py-14 text-center text-[12px] text-ink-muted">No audit events match this view.</p>
          ) : (
            <div className="divide-y divide-line/70">
              {filtered.slice(0, 250).map((event, index) => {
                const Icon = eventIcon(event.type)
                const auction = data.auctionById.get(event.auctionId)
                const showDay =
                  index === 0 ||
                  formatDate(filtered[index - 1].timestamp) !== formatDate(event.timestamp)
                return (
                  <div key={event.id}>
                    {showDay ? (
                      <div className="sticky top-0 z-10 border-b border-line bg-[#FAFBF9]/95 px-4 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.1em] text-ink-muted backdrop-blur">
                        {formatDate(event.timestamp)}
                      </div>
                    ) : null}
                    <div className="flex items-start gap-3 px-4 py-3 transition hover:bg-brand-soft/30">
                      <span className={cn('mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-xl', toneWrap(event.type))}>
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge tone={typeTone[event.type] ?? 'grey'} className="px-1.5 py-0 text-[7.5px]">
                            {event.type}
                          </Badge>
                          {auction ? (
                            <Link to={`/admin/auctions/${auction.id}`} className="focus-ring text-[9px] font-bold text-brand-dark hover:underline">
                              {auction.title}
                            </Link>
                          ) : (
                            <span className="text-[9px] text-ink-soft">No auction</span>
                          )}
                        </div>
                        <p className="mt-1 text-[11px] leading-relaxed text-ink">{event.message}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[8.5px] text-ink-soft">
                          <span>{event.actor}</span>
                          <span>·</span>
                          <span>{formatDateTime(event.timestamp)}</span>
                          <span>·</span>
                          <span>{timeAgo(event.timestamp)}</span>
                          <span>·</span>
                          <span className="font-mono">{event.id}</span>
                        </div>
                        {event.meta ? (
                          <details className="mt-1.5">
                            <summary className="cursor-pointer text-[8.5px] font-bold text-brand-dark">Metadata</summary>
                            <pre className="mt-1 overflow-x-auto rounded-lg bg-page px-2 py-1.5 font-mono text-[8px] leading-relaxed text-ink-muted thin-scroll">
                              {JSON.stringify(event.meta, null, 2)}
                            </pre>
                          </details>
                        ) : null}
                      </div>
                      {event.hash ? (
                        <div className="hidden w-40 flex-none text-right sm:block">
                          <p className="font-mono text-[8.5px] text-ink-muted" title={event.hash}>{shortHash(event.hash, 14)}</p>
                          <CopyButton value={event.hash} label="Hash" className="mt-1 px-2 py-0.5 text-[8px]" />
                        </div>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {filtered.length > 250 ? (
            <p className="border-t border-line px-4 py-2.5 text-center text-[9.5px] text-ink-muted">
              Showing the 250 newest of {filtered.length} matching events. Export the CSV for the full record.
            </p>
          ) : null}
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <AdminTableWrap>
            <DataTable className="min-w-[1000px]">
              <thead>
                <tr>
                  <Th>Event</Th>
                  <Th>Type</Th>
                  <Th>Auction</Th>
                  <Th>Actor</Th>
                  <Th>Hash</Th>
                  <Th>Timestamp</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <EmptyTableRow colSpan={6}>No audit events match this view.</EmptyTableRow>
                ) : (
                  filtered.slice(0, 300).map((event) => (
                    <AuditRow key={event.id} event={event} auctionTitle={data.auctionById.get(event.auctionId)?.title ?? event.auctionId} />
                  ))
                )}
              </tbody>
            </DataTable>
          </AdminTableWrap>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-3 py-2.5 text-[10px] text-ink-muted">
            <span>
              Showing {Math.min(300, filtered.length)} of {filtered.length} events
            </span>
            <Link to="/admin/settings" className="inline-flex items-center gap-1 font-bold text-brand-dark">
              Export platform data <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </Card>
      )}

      <div className="grid gap-3 lg:grid-cols-3">
        <AdminCard title="What gets written" bodyClassName="divide-y divide-line">
          {[
            ['Auction lifecycle', 'Created, updated, closed, void and cancelled events.'],
            ['Money movement', 'Payment intents, confirmations, failures, reversals and replays.'],
            ['Sealed bids', 'Hash, lock and invalidation events with the bid receipt.'],
            ['People & prizes', 'Winner calculation, identity verification, fulfilment and reassignment.'],
          ].map(([title, body]) => (
            <div key={title} className="px-4 py-2.5">
              <p className="text-[10.5px] font-bold text-ink">{title}</p>
              <p className="mt-0.5 text-[9.5px] leading-snug text-ink-muted">{body}</p>
            </div>
          ))}
        </AdminCard>

        <AdminCard title="Integrity notes" bodyClassName="p-4">
          <div className="space-y-2.5">
            {[
              ['Append-only in this demo', 'Events are never edited or deleted by the admin UI.'],
              ['Replays are retained', `${state.ignoredEvents.length} ignored callbacks stay visible in reconciliation and audit.`],
              ['Hashes are receipts', 'Bid hashes prove a sealed amount but do not sign the whole event log.'],
              ['Browser storage', 'The log survives refresh through localStorage and resets with demo data.'],
            ].map(([title, body]) => (
              <div key={title} className="flex items-start gap-2">
                <Clock3 className="mt-0.5 h-3.5 w-3.5 flex-none text-brand-dark" />
                <div>
                  <p className="text-[10px] font-bold text-ink">{title}</p>
                  <p className="mt-0.5 text-[9.5px] leading-snug text-ink-muted">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </AdminCard>

        <AdminCard title="Demo evidence" bodyClassName="p-4">
          <div className="rounded-xl border border-[#CFE3C6] bg-brand-tint/60 px-3 py-2.5">
            <p className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-wide text-brand-dark">
              <ShieldCheck className="h-3 w-3" /> Traceable by design
            </p>
            <p className="mt-1 text-[10px] leading-relaxed text-ink-muted">
              {formatNumber(state.audit.length)} audit events cover {formatNumber(state.payments.length)} payments,{' '}
              {formatNumber(state.entries.length)} entries, {formatNumber(state.bids.length)} sealed bids and{' '}
              {formatNumber(state.refunds.length)} refunds.
            </p>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Badge tone="green">{data.hashed.length} hashed bids</Badge>
            <Badge tone="blue">{data.auctions} auctions</Badge>
            <Badge tone="purple">{state.ignoredEvents.length} replays</Badge>
          </div>
          <p className="mt-3 text-[9px] leading-relaxed text-ink-soft">
            Use print view for a clean, chrome-free evidence sheet. CSV export includes metadata for every row.
          </p>
        </AdminCard>
      </div>
    </div>
  )
}

function toneWrap(type: AuditType) {
  const tone = typeTone[type] ?? 'grey'
  return {
    green: 'bg-brand-tint text-brand-dark',
    red: 'bg-[#FDECEF] text-accent',
    amber: 'bg-[#FFF5E6] text-[#9A5B00]',
    blue: 'bg-[#EAF2FF] text-[#1D5FB8]',
    purple: 'bg-[#F1EBFF] text-[#6236B4]',
    grey: 'bg-page text-ink-muted',
    dark: 'bg-ink text-white',
  }[tone]
}

function AuditRow({ event, auctionTitle }: { event: AuditEvent; auctionTitle: string }) {
  return (
    <tr className="transition hover:bg-brand-soft/30">
      <Td>
        <span className="block max-w-[340px] text-[10.5px] leading-snug text-ink">{event.message}</span>
        <span className="mt-0.5 block font-mono text-[8px] text-ink-soft">{event.id}</span>
      </Td>
      <Td>
        <Badge tone={typeTone[event.type] ?? 'grey'} className="px-1.5 py-0 text-[7.5px]">{event.type}</Badge>
      </Td>
      <Td>
        <span className="block max-w-[150px] truncate text-[10px] text-ink">{auctionTitle}</span>
        <span className="block text-[8px] text-ink-soft">{event.auctionId}</span>
      </Td>
      <Td className="text-[9.5px] text-ink-muted">{event.actor}</Td>
      <Td>
        {event.hash ? (
          <div>
            <span className="block font-mono text-[8.5px] text-ink-muted" title={event.hash}>{shortHash(event.hash, 12)}</span>
            <CopyButton value={event.hash} label="Copy" className="mt-0.5 px-1.5 py-0 text-[7.5px]" />
          </div>
        ) : (
          <span className="text-[9px] text-ink-soft">—</span>
        )}
      </Td>
      <Td className="text-[9.5px] text-ink-muted">
        {formatDateTime(event.timestamp)}
        <span className="block text-[8px] text-ink-soft">{timeAgo(event.timestamp)}</span>
      </Td>
    </tr>
  )
}

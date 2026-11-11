import { CheckCircle2, ChevronRight, Hash, Info, Lock, ShieldCheck, Ticket, Wallet } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useToast } from '../../components/Toast'
import { AlertBox, Badge, Button, Card, Checkbox, EmptyState, Field, cn } from '../../components/ui'
import { useT } from '../../i18n'
import { formatBid, formatDateTime, formatETB } from '../../lib/format'
import { useAuction, useAuctionEntries, useCurrentUser, useStore } from '../../store/useStore'

export default function BidPage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const t = useT()
  const language = useStore((state) => state.language)
  const auction = useAuction(id)
  const entries = useAuctionEntries(id)
  const payments = useStore((state) => state.payments)
  const bids = useStore((state) => state.bids)
  const submitBid = useStore((state) => state.submitBid)
  const user = useCurrentUser()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const paymentById = new Map(payments.map((p) => [p.id, p]))
  const eligible = entries.filter(
    (entry) => paymentById.get(entry.paymentId)?.status === 'success' && !entry.bidId && entry.status === 'active',
  )
  const prefilled = params.get('entry')
  const [selectedId, setSelectedId] = useState(prefilled && eligible.some((e) => e.id === prefilled) ? prefilled : eligible[0]?.id ?? '')
  const selected = eligible.find((entry) => entry.id === selectedId)
  const presetAmount = params.get('amount')

  const [amount, setAmount] = useState(presetAmount ?? '0.07')
  const [understood, setUnderstood] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const quickAmounts = useMemo(() => {
    if (!auction) return []
    const options = [0.01, 0.05, 0.07, 0.09, 0.12, 0.2].filter(
      (value) => value >= auction.bidMin,
    )
    return [...new Set(options)].slice(0, 5)
  }, [auction])

  const existingBid = selected?.bidId ? bids.find((b) => b.id === selected.bidId) : undefined

  if (!auction) {
    return (
      <div className="flex min-h-full items-center justify-center p-6">
        <EmptyState title="Auction not found" />
      </div>
    )
  }

  if (auction.status !== 'live') {
    return <Navigate to={`/auction/${auction.id}`} replace />
  }

  if (!eligible.length) {
    const mine = entries.filter((entry) => paymentById.get(entry.paymentId)?.status === 'success')
    const withBids = mine.filter((entry) => entry.bidId)
    return (
      <div className="min-h-full bg-page px-4 py-5">
        <EmptyState
          icon={withBids.length ? <CheckCircle2 className="h-5 w-5" /> : <Ticket className="h-5 w-5" />}
          title={withBids.length ? t('bidLockedTitle') : t('noBidYet')}
          body={
            withBids.length
              ? t('bidOnce')
              : `${t('entryFee')}: ${formatETB(auction.entryFee)}. ${t('onlySuccessCreatesEntry')}`
          }
          action={
            withBids.length ? (
              <div className="flex flex-col gap-2">
                <Button onClick={() => navigate(`/auction/${auction.id}/receipt/${withBids[0].bidId}`)}>
                  {t('viewReceipt')}
                </Button>
                <Link to="/entries" className="text-[12px] font-bold text-brand-dark underline decoration-brand/30 underline-offset-4">
                  {t('viewEntry')}
                </Link>
              </div>
            ) : (
              <Button onClick={() => navigate(`/auction/${auction.id}`)} leftIcon={<Wallet className="h-4 w-4" />}>
                {t('payEntryFee')}
              </Button>
            )
          }
        />
      </div>
    )
  }

  const validate = (): string | null => {
    const value = Number(amount)
    if (!amount.trim() || !Number.isFinite(value)) return t('validateBid')
    if (value < auction.bidMin) return t('bidTooLow')
    const steps = Math.round((value - auction.bidMin) / auction.bidStep)
    const snapped = auction.bidMin + steps * auction.bidStep
    if (Math.abs(snapped - value) > 0.000001) return t('bidStepError')
    return null
  }

  const submit = () => {
    if (!selected) return
    const validation = validate()
    if (validation) {
      setError(validation)
      return
    }
    if (!understood) {
      setError(t('iUnderstand'))
      return
    }
    setSubmitting(true)
    const result = submitBid(selected.id, Number(amount))
    setSubmitting(false)
    if (!result.ok || !result.bid) {
      setError(result.error ?? t('validateBid'))
      return
    }
    showToast({ tone: 'success', title: t('toastBidLocked') })
    navigate(`/auction/${auction.id}/receipt/${result.bid.id}`, { replace: true })
  }

  return (
    <div className="min-h-full bg-page pb-6">
      <div className="px-4 pb-2 pt-4">
        <div className="flex items-center gap-2">
          <Badge tone="green" dot>
            {t('sealedBidNote')}
          </Badge>
        </div>
        <h1 className="mt-2 text-[22px] font-extrabold tracking-[-0.04em] text-ink">{t('submitSealedBid')}</h1>
        <p className="mt-1 text-[11.5px] leading-relaxed text-ink-muted">
          {language === 'am' ? auction.titleAm : auction.title}
        </p>
      </div>

      <div className="space-y-2.5 px-4">
        {eligible.length > 1 ? (
          <Card className="p-3">
            <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-ink-soft">{t('yourEntries')}</p>
            <div className="mt-2 space-y-1.5">
              {eligible.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(entry.id)
                    setError(null)
                  }}
                  className={cn(
                    'flex w-full items-center justify-between rounded-xl border px-2.5 py-2 text-left transition',
                    selectedId === entry.id ? 'border-brand bg-brand-tint' : 'border-line bg-white',
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Ticket className="h-3.5 w-3.5 text-brand-dark" />
                    <span className="text-[11px] font-bold text-ink">#{entry.id.slice(-5).toUpperCase()}</span>
                  </span>
                  <span className="text-[9.5px] font-medium text-ink-muted">{formatDateTime(entry.createdAt, language)}</span>
                </button>
              ))}
            </div>
          </Card>
        ) : null}

        {existingBid ? (
          <AlertBox tone="warning" title={t('bidLockedTitle')}>
            {t('bidOnce')}
          </AlertBox>
        ) : null}

        <Card className="overflow-hidden">
          <div className="border-b border-line bg-gradient-to-br from-[#F6FCF3] to-white px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-tint text-brand-dark">
                <Lock className="h-3.5 w-3.5" />
              </span>
              <div>
                <p className="text-[11px] font-bold text-ink">{t('bidOnce')}</p>
                <p className="text-[9.5px] text-ink-muted">
                  {t('entry')} #{selected?.id.slice(-5).toUpperCase()} · {t('paid')} {formatETB(auction.entryFee)}
                </p>
              </div>
            </div>
          </div>

          <div className="p-4">
            <Field
              label={t('bidAmount')}
              error={error ?? undefined}
              hint={`${t('minBid')}: ETB ${auction.bidMin.toFixed(2)} (${t('noMax')}) · ${t('step')} ${auction.bidStep.toFixed(2)}`}
            >
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[13px] font-bold text-ink-muted">
                  ETB
                </span>
                <input
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => {
                    setAmount(event.target.value.replace(/[^\d.]/g, ''))
                    setError(null)
                  }}
                  className="h-14 w-full rounded-2xl border-2 border-line bg-white pl-14 pr-4 text-[28px] font-extrabold tracking-[-0.02em] text-ink outline-none transition amount-tabular placeholder:text-ink-soft focus:border-brand focus:ring-4 focus:ring-brand/10"
                  placeholder="0.07"
                  aria-label={t('bidAmount')}
                />
              </div>
            </Field>

            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {quickAmounts.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setAmount(value.toFixed(2))
                    setError(null)
                  }}
                  className={cn(
                    'focus-ring rounded-full border px-2.5 py-1 text-[10px] font-bold transition',
                    Number(amount) === value
                      ? 'border-brand bg-brand text-white'
                      : 'border-line bg-white text-ink-muted hover:border-brand/40 hover:text-brand-dark',
                  )}
                >
                  {value.toFixed(2)}
                </button>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-page px-2.5 py-2">
                <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-ink-soft">{t('entryFee')}</p>
                <p className="mt-0.5 text-[12px] font-extrabold text-ink">{formatETB(auction.entryFee)}</p>
              </div>
              <div className="rounded-xl bg-page px-2.5 py-2">
                <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-ink-soft">{t('yourEntries')}</p>
                <p className="mt-0.5 text-[12px] font-extrabold text-ink">
                  {entries.length} / {auction.maxEntriesPerUser}
                </p>
              </div>
            </div>
          </div>
        </Card>

        <AlertBox tone="warning" title={t('bidFinalWarning')}>
          {t('rule2')} {t('rule3')}
        </AlertBox>

        <Card className="p-3">
          <Checkbox label={t('iUnderstand')} checked={understood} onChange={setUnderstood} />
          <div className="mt-2 flex items-center gap-1.5 text-[9.5px] font-medium text-ink-soft">
            <ShieldCheck className="h-3 w-3 text-brand-dark" />
            {t('hashExplain')}
          </div>
        </Card>

        <Card className="flex items-center gap-2.5 border-[#DDEBD7] bg-brand-soft p-3">
          <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-white text-brand-dark shadow-sm">
            <Hash className="h-4 w-4" />
          </div>
          <p className="text-[10px] leading-relaxed text-[#4A6B40]">
            <span className="font-bold text-brand-dark">{t('bidHash')}</span> {t('sealedBidNote')}
          </p>
        </Card>
      </div>

      <div className="sticky bottom-0 z-30 mt-3 border-t border-line bg-white/95 px-4 py-2.5 backdrop-blur">
        <Button
          size="lg"
          full
          loading={submitting}
          disabled={Boolean(existingBid)}
          leftIcon={<Lock className="h-4 w-4" />}
          onClick={submit}
        >
          {t('lockBid')}
        </Button>
        <p className="mt-1 flex items-center justify-center gap-1 text-center text-[9px] font-medium text-ink-soft">
          <Info className="h-2.5 w-2.5" /> {t('bidFinalWarning')}
        </p>
      </div>
    </div>
  )
}

import {
  Ban,
  CheckCircle2,
  Clock3,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  TriangleAlert,
  XCircle,
} from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useT } from '../i18n'
import { formatETB, formatPhoneDisplay } from '../lib/format'
import { useCurrentUser, useStore } from '../store/useStore'
import type { Auction, Entry, PaymentStatus } from '../types'
import { AlertBox, BottomSheet, Button, StatusBadge } from './ui'
import { useToast } from './Toast'

type Outcome = 'success' | 'failed' | 'cancelled' | 'timeout'

export function PaymentSheet({
  open,
  auction,
  onClose,
  onSuccess,
}: {
  open: boolean
  auction: Auction
  onClose: () => void
  onSuccess?: (entry: Entry) => void
}) {
  const t = useT()
  const { showToast } = useToast()
  const user = useCurrentUser()
  const initiatePayment = useStore((state) => state.initiatePayment)
  const resolvePayment = useStore((state) => state.resolvePayment)
  const payments = useStore((state) => state.payments)

  const [paymentId, setPaymentId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<Outcome | null>(null)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState<string | null>(null)
  const [createdEntry, setCreatedEntry] = useState<Entry | null>(null)
  const started = useRef(false)

  const payment = payments.find((p) => p.id === paymentId)

  useEffect(() => {
    if (!open) {
      started.current = false
      setPaymentId(null)
      setError(null)
      setBusy(null)
      setPin('')
      setPinError(null)
      setCreatedEntry(null)
      return
    }
    if (started.current) return
    started.current = true
    const result = initiatePayment(auction.id)
    if (result.ok && result.payment) {
      setPaymentId(result.payment.id)
    } else {
      setError(result.error ?? 'Could not start the payment.')
    }
  }, [open, auction.id, initiatePayment])

  const status: PaymentStatus | undefined = payment?.status

  const resolve = async (outcome: Outcome) => {
    if (!paymentId || busy) return
    if (outcome === 'success' && pin.length !== 4) {
      setPinError(t('invalidCode'))
      return
    }
    setPinError(null)
    setBusy(outcome)
    await new Promise((resolvePromise) => setTimeout(resolvePromise, outcome === 'success' ? 1100 : 800))
    const result = resolvePayment(paymentId, outcome)
    setBusy(null)
    if (!result.ok && result.error) {
      setError(result.error)
      showToast({ tone: 'info', title: 'Callback ignored', message: result.error })
      return
    }
    if (outcome === 'success' && result.entry) {
      setCreatedEntry(result.entry)
    }
    if (outcome !== 'success') {
      showToast({ tone: 'warning', title: t('paymentFailed'), message: t('failureNote') })
    }
  }

  const retry = () => {
    setError(null)
    setPin('')
    setCreatedEntry(null)
    started.current = false
    setPaymentId(null)
    const result = initiatePayment(auction.id)
    if (result.ok && result.payment) setPaymentId(result.payment.id)
    else setError(result.error ?? 'Could not start the payment.')
  }

  const replayCallback = () => {
    if (!paymentId) return
    const result = resolvePayment(paymentId, 'success')
    if (!result.ok) {
      showToast({
        tone: 'info',
        title: 'Duplicate callback ignored',
        message: result.error ?? 'Idempotency check kept the original entry.',
      })
    } else {
      showToast({ tone: 'warning', title: 'Unexpected duplicate entry', message: 'This should not happen in production.' })
    }
  }

  const failed = status === 'failed' || status === 'cancelled' || status === 'timeout'
  const succeeded = status === 'success' && createdEntry !== null

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={succeeded ? t('entryConfirmed') : failed ? t('paymentFailed') : t('payEntryFee')}
      subtitle={succeeded ? undefined : t('simulatedPayment')}
      footer={
        succeeded ? (
          <div className="flex gap-2">
            <Button variant="secondary" size="md" full onClick={onClose}>
              {t('close')}
            </Button>
            <Button
              size="md"
              full
              onClick={() => {
                if (createdEntry) onSuccess?.(createdEntry)
              }}
            >
              {t('goToBid')}
            </Button>
          </div>
        ) : failed ? (
          <div className="flex gap-2">
            <Button variant="secondary" size="md" full onClick={onClose}>
              {t('close')}
            </Button>
            <Button size="md" full onClick={retry} leftIcon={<RefreshCw className="h-4 w-4" />}>
              {t('retry')}
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button variant="secondary" size="md" full onClick={onClose}>
              {t('cancel')}
            </Button>
            <Button
              size="md"
              full
              loading={busy === 'success'}
              leftIcon={<ShieldCheck className="h-4 w-4" />}
              onClick={() => resolve('success')}
            >
              {t('approvedDemo')}
            </Button>
          </div>
        )
      }
    >
      {error ? (
        <AlertBox tone="danger" title="Payment could not start" className="mb-3">
          {error}
        </AlertBox>
      ) : null}

      {succeeded && payment ? (
        <div className="pb-2 pt-1">
          <div className="flex flex-col items-center py-3 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-tint text-brand-dark">
              <CheckCircle2 className="h-9 w-9" strokeWidth={2.2} />
            </div>
            <p className="mt-3 text-[26px] font-extrabold tracking-[-0.04em] text-ink amount-tabular">
              {formatETB(payment.amount)}
            </p>
            <p className="mt-1 text-[12px] font-medium text-ink-muted">{t('successNote')}</p>
          </div>

          <div className="rounded-2xl border border-line bg-[#FAFBF9] p-3.5 text-[11.5px]">
            <Row label={t('entryNumber')} value={`#${createdEntry?.id.slice(-5).toUpperCase()}`} />
            <Row label={t('paymentRef')} value={payment.ref} mono />
            <Row label={t('phone')} value={formatPhoneDisplay(payment.phone)} />
            <Row label={t('amount')} value={formatETB(payment.amount)} />
            <Row label={t('entryStatus')} value={<StatusBadge status={createdEntry?.status ?? 'active'} />} />
          </div>

          <button
            type="button"
            onClick={replayCallback}
            className="focus-ring mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#CFD8CC] px-3 py-2 text-[10.5px] font-semibold text-ink-muted transition hover:border-brand/50 hover:text-brand-dark"
          >
            <RefreshCw className="h-3 w-3" />
            Replay the payment callback (idempotency demo)
          </button>
        </div>
      ) : failed && payment ? (
        <div className="pb-2 pt-1">
          <div className="flex flex-col items-center py-3 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FDECEF] text-accent">
              {status === 'timeout' ? (
                <Clock3 className="h-8 w-8" />
              ) : status === 'cancelled' ? (
                <Ban className="h-8 w-8" />
              ) : (
                <XCircle className="h-8 w-8" />
              )}
            </div>
            <p className="mt-3 text-[17px] font-bold text-ink">
              {status === 'timeout' ? t('paymentTimeout') : status === 'cancelled' ? t('paymentCancelled') : t('paymentFailed')}
            </p>
            <p className="mt-1 max-w-[260px] text-[12px] leading-relaxed text-ink-muted">{t('failureNote')}</p>
          </div>

          <div className="rounded-2xl border border-line bg-[#FAFBF9] p-3.5 text-[11.5px]">
            <Row label={t('paymentRef')} value={payment.ref} mono />
            <Row label={t('amount')} value={formatETB(payment.amount)} />
            <Row label={t('entryStatus')} value={<StatusBadge status={payment.status} />} />
          </div>
          <p className="mt-3 text-center text-[10.5px] font-medium text-ink-soft">{t('onlySuccessCreatesEntry')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="overflow-hidden rounded-2xl border border-[#D9EAD2] bg-gradient-to-br from-[#F6FCF3] to-[#EAF6E5]">
            <div className="flex items-center gap-2 border-b border-[#D9EAD2] px-3.5 py-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-brand text-white">
                <Smartphone className="h-3 w-3" />
              </span>
              <span className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-brand-dark">
                {t('paymentRequest')}
              </span>
              <span className="ml-auto">
                <StatusBadge status="pending" />
              </span>
            </div>
            <div className="px-3.5 py-3">
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-ink-soft">{t('amount')}</p>
              <p className="mt-0.5 text-[28px] font-extrabold leading-none tracking-[-0.04em] text-ink amount-tabular">
                {formatETB(auction.entryFee)}
              </p>
              <p className="mt-1 text-[11px] font-medium text-ink-muted">
                {auction.title} · <span className="text-ink">{t('entry')}</span>
              </p>
              <div className="mt-2.5 flex items-center justify-between rounded-lg bg-white/80 px-2.5 py-1.5 text-[10px] font-medium">
                <span className="text-ink-muted">{payment ? payment.ref : '—'}</span>
                <span className="font-bold text-ink">{formatPhoneDisplay(user?.phone ?? '')}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-white p-3.5">
            <div className="flex items-center gap-2 text-brand-dark">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
              </span>
              <p className="text-[12px] font-bold">{t('checkPhone')}</p>
            </div>
            <p className="mt-0.5 text-[10.5px] leading-relaxed text-ink-muted">{t('waitingNote')}</p>

            <div className="mt-3">
              <label className="text-[11px] font-semibold text-ink" htmlFor="demo-pin">
                {t('enterPin')}
              </label>
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  id="demo-pin"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={4}
                  value={pin}
                  onChange={(event) => {
                    setPin(event.target.value.replace(/\D/g, '').slice(0, 4))
                    setPinError(null)
                  }}
                  placeholder="••••"
                  className="h-11 w-28 rounded-xl border border-line bg-page px-3 text-center text-lg font-extrabold tracking-[0.35em] text-ink outline-none focus:border-brand focus:ring-4 focus:ring-brand/10"
                />
                <span className="text-[10px] font-medium text-ink-soft">{t('pinHint')}</span>
              </div>
              {pinError ? (
                <p className="mt-1 flex items-center gap-1 text-[10.5px] font-semibold text-accent">
                  <TriangleAlert className="h-3 w-3" /> {pinError}
                </p>
              ) : null}
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-ink-soft">{t('demoOutcomes')}</p>
              {busy ? (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-ink-muted">
                  <Loader2 className="h-3 w-3 animate-spin" /> {t('processing')}
                </span>
              ) : null}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <OutcomeButton
                label={t('paymentSuccess')}
                tone="green"
                disabled={Boolean(busy)}
                loading={busy === 'success'}
                onClick={() => resolve('success')}
              />
              <OutcomeButton
                label={t('paymentFailed')}
                tone="red"
                disabled={Boolean(busy)}
                loading={busy === 'failed'}
                onClick={() => resolve('failed')}
              />
              <OutcomeButton
                label={t('paymentCancelled')}
                tone="grey"
                disabled={Boolean(busy)}
                loading={busy === 'cancelled'}
                onClick={() => resolve('cancelled')}
              />
              <OutcomeButton
                label={t('paymentTimeout')}
                tone="amber"
                disabled={Boolean(busy)}
                loading={busy === 'timeout'}
                onClick={() => resolve('timeout')}
                className="col-span-3"
              />
            </div>
            <p className="mt-2 text-center text-[10px] leading-relaxed text-ink-soft">{t('onlySuccessCreatesEntry')}</p>
          </div>
        </div>
      )}
    </BottomSheet>
  )
}

function Row({
  label,
  value,
  mono,
}: {
  label: string
  value: ReactNode
  mono?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#EDF0EB] py-1.5 last:border-0 last:pb-0 first:pt-0">
      <span className="text-ink-muted">{label}</span>
      <span className={mono ? 'truncate font-mono text-[10.5px] font-semibold text-ink' : 'text-right font-semibold text-ink'}>
        {value}
      </span>
    </div>
  )
}

function OutcomeButton({
  label,
  tone,
  onClick,
  disabled,
  loading,
  className,
}: {
  label: string
  tone: 'green' | 'red' | 'grey' | 'amber'
  onClick: () => void
  disabled?: boolean
  loading?: boolean
  className?: string
}) {
  const tones = {
    green: 'border-[#CFE7C5] bg-brand-tint text-brand-dark hover:border-brand/60',
    red: 'border-[#F4CDD4] bg-[#FDECEF] text-[#A50020] hover:border-accent/50',
    grey: 'border-line bg-page text-ink-muted hover:border-[#C9D2C6]',
    amber: 'border-[#F2DFB8] bg-[#FFF7E8] text-[#8A5200] hover:border-[#E3C27F]',
  }[tone]
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`focus-ring flex h-9 items-center justify-center gap-1 rounded-xl border px-1 text-[10px] font-bold transition disabled:opacity-50 ${tones} ${className ?? ''}`}
    >
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
      {label}
    </button>
  )
}

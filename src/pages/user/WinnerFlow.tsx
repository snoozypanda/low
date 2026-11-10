import {
  BadgeCheck,
  Box,
  Check,
  CheckCircle2,
  Clock3,
  IdCard,
  MapPin,
  PackageCheck,
  ShieldCheck,
  Trophy,
  Truck,
  UserRoundCheck,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useToast } from '../../components/Toast'
import { ProductImage } from '../../components/ProductImage'
import {
  AlertBox,
  Badge,
  Button,
  Card,
  Checkbox,
  EmptyState,
  Field,
  Input,
  Select,
  Textarea,
  cn,
} from '../../components/ui'
import { useT } from '../../i18n'
import { formatBid, formatDateTime, formatETB } from '../../lib/format'
import { useAuction, useCurrentUser, useStore } from '../../store/useStore'
import type { FulfilmentMethod } from '../../types'

export default function WinnerFlow() {
  const { id } = useParams()
  const t = useT()
  const language = useStore((state) => state.language)
  const auction = useAuction(id)
  const user = useCurrentUser()
  const winner = useStore((state) => state.winners.find((w) => w.auctionId === id))
  const verifyWinnerIdentity = useStore((state) => state.verifyWinnerIdentity)
  const setWinnerFulfilmentMethod = useStore((state) => state.setWinnerFulfilmentMethod)
  const { showToast } = useToast()

  const [name, setName] = useState(user?.name ?? '')
  const [idNumber, setIdNumber] = useState('')
  const [consent, setConsent] = useState(false)
  const [method, setMethod] = useState<FulfilmentMethod>(winner?.method ?? 'delivery')
  const [address, setAddress] = useState(winner?.address ?? '')
  const [pickup, setPickup] = useState(winner?.pickupLocation ?? t('pickupLocationBole'))
  const [error, setError] = useState<string | null>(null)

  if (!auction) {
    return (
      <div className="flex min-h-full items-center justify-center p-6">
        <EmptyState title="Auction not found" />
      </div>
    )
  }

  if (!winner || winner.userId !== user?.id) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-3 p-6">
        <EmptyState
          icon={<Trophy className="h-5 w-5" />}
          title={t('notWinner')}
          body={t('winnerCongratsBody', { amount: `ETB ${auction.winningAmount?.toFixed(2) ?? '0.00'}` })}
          action={
            <Link to={`/results/${auction.id}`}>
              <Button size="sm">{t('viewResults')}</Button>
            </Link>
          }
        />
      </div>
    )
  }

  const verified = winner.verification === 'verified'
  const failed = winner.verification === 'failed'
  const delivered = winner.fulfilment === 'delivered'
  const deadlinePassed = new Date(winner.deadlineAt).getTime() < Date.now()
  const hasMethod = Boolean(winner.method)
  const amount = formatETB(winner.amount, 2)

  const submitIdentity = () => {
    if (!consent) {
      setError(t('consent'))
      return
    }
    const result = verifyWinnerIdentity(auction.id, { name, idNumber })
    if (!result.ok) {
      setError(result.error ?? t('verifyIdentity'))
      return
    }
    setError(null)
    showToast({ tone: 'success', title: t('identityVerified'), message: t('chooseMethod') })
  }

  const submitFulfilment = () => {
    const result = setWinnerFulfilmentMethod(
      auction.id,
      method,
      method === 'delivery' ? address : undefined,
      method === 'pickup' ? pickup : undefined,
    )
    if (!result.ok) {
      setError(result.error ?? t('saveChoice'))
      return
    }
    setError(null)
    showToast({ tone: 'success', title: t('saveChoice'), message: t('trackerNote') })
  }

  const trackerSteps = [
    { key: 'verified', label: t('verifiedStep'), icon: ShieldCheck },
    { key: 'dispatched', label: t('dispatchedStep'), icon: Truck },
    { key: 'delivered', label: t('deliveredStep'), icon: PackageCheck },
  ] as const
  const progressIndex = winner.fulfilment === 'delivered' ? 3 : winner.fulfilment === 'dispatched' ? 2 : verified ? 1 : 0

  return (
    <div className="min-h-full bg-page pb-6">
      <div className="relative overflow-hidden bg-gradient-to-br from-brand-deep via-brand-dark to-brand px-4 pb-5 pt-5 text-white">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-10 h-44 w-44 rounded-full bg-brand/30 blur-2xl" />
        <div className="relative flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
            <Trophy className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[8px] font-extrabold uppercase tracking-[0.2em] text-white/60">{t('winner')}</p>
            <p className="text-[10px] font-bold text-white/85">{language === 'am' ? auction.titleAm : auction.title}</p>
          </div>
          {winner.verification === 'verified' ? (
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-1 text-[8px] font-extrabold uppercase tracking-wide">
              <BadgeCheck className="h-3 w-3" /> {t('verified')}
            </span>
          ) : null}
        </div>

        <h1 className="relative mt-4 text-[25px] font-extrabold leading-[1.05] tracking-[-0.05em]">
          {t('congratulationsTitle')}
        </h1>
        <p className="relative mt-1.5 text-[11px] leading-relaxed text-white/75">
          {t('winnerCongratsBody', { amount })}
        </p>

        <div className="relative mt-3 flex items-end gap-3">
          <div>
            <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-white/55">{t('winningBid')}</p>
            <p className="text-[32px] font-extrabold leading-none tracking-[-0.05em] amount-tabular">{amount}</p>
          </div>
          <div className="ml-auto rounded-xl bg-white/10 px-2.5 py-1.5 text-right backdrop-blur">
            <p className="text-[7.5px] font-bold uppercase tracking-[0.12em] text-white/60">{t('verificationDeadline')}</p>
            <p className="mt-0.5 text-[10px] font-bold">{formatDateTime(winner.deadlineAt, language)}</p>
          </div>
        </div>
      </div>

      <div className="space-y-2.5 px-4 pt-3">
        <Card className="flex items-center gap-2.5 p-2.5">
          <ProductImage src={auction.image} alt={auction.title} className="h-[58px] w-[58px] flex-none rounded-xl" />
          <div className="min-w-0 flex-1">
            <p className="line-clamp-1 text-[11.5px] font-bold text-ink">
              {language === 'am' ? auction.titleAm : auction.title}
            </p>
            <p className="mt-0.5 text-[9px] font-medium text-ink-muted">
              {t('retail')} {formatETB(auction.retailValue)} · {t('entry')} {formatETB(auction.entryFee)}
            </p>
            <Link to={`/results/${auction.id}`} className="mt-0.5 inline-flex items-center gap-1 text-[9px] font-bold text-brand-dark">
              {t('viewPrize')} · {t('viewResults')}
            </Link>
          </div>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-tint text-brand-dark">
            <Trophy className="h-4 w-4" />
          </span>
        </Card>

        {deadlinePassed && !verified ? (
          <AlertBox tone="danger" title={t('claimWindowClosed')}>
            {t('verifyToClaim')}
          </AlertBox>
        ) : null}

        {failed ? (
          <AlertBox tone="danger" title={t('identityPending')}>
            {t('verifyToClaim')}
          </AlertBox>
        ) : null}

        <div className="grid grid-cols-3 gap-1.5">
          {[
            { label: t('verifyToClaim'), icon: IdCard, done: verified, current: !verified },
            { label: t('chooseFulfilment'), icon: Box, done: hasMethod, current: verified && !hasMethod },
            { label: t('fulfilmentTracker'), icon: Truck, done: delivered, current: hasMethod && !delivered },
          ].map((step, index) => {
            const Icon = step.icon
            return (
              <div
                key={index}
                className={cn(
                  'rounded-xl border px-2 py-2 text-center',
                  step.done ? 'border-[#CFE3C6] bg-brand-tint' : step.current ? 'border-brand/40 bg-white' : 'border-line bg-white/60',
                )}
              >
                <span className={cn('mx-auto flex h-6 w-6 items-center justify-center rounded-full', step.done ? 'bg-brand text-white' : step.current ? 'bg-brand-tint text-brand-dark' : 'bg-page text-ink-soft')}>
                  {step.done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <Icon className="h-3.5 w-3.5" />}
                </span>
                <p className={cn('mt-1 text-[7.5px] font-bold leading-tight', step.done ? 'text-brand-dark' : step.current ? 'text-ink' : 'text-ink-soft')}>
                  {step.label}
                </p>
              </div>
            )
          })}
        </div>

        {!verified ? (
          <Card className="p-3.5">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-tint text-brand-dark">
                <UserRoundCheck className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[12.5px] font-bold text-ink">{t('verifyIdentity')}</p>
                <p className="text-[9.5px] text-ink-muted">{t('verifyToClaim')}</p>
              </div>
            </div>

            <div className="mt-3 space-y-2.5">
              <Field label={t('fullName')} htmlFor="winner-name" required>
                <Input id="winner-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Selam Tesfaye" />
              </Field>
              <Field label={t('idNumber')} htmlFor="winner-id" hint={t('idHint')} required>
                <Input
                  id="winner-id"
                  inputMode="numeric"
                  value={idNumber}
                  onChange={(event) => setIdNumber(event.target.value.replace(/\D/g, '').slice(0, 16))}
                  placeholder="1234 5678 9012"
                />
              </Field>
              <Checkbox label={t('consent')} checked={consent} onChange={setConsent} />
              {error ? <AlertBox tone="danger">{error}</AlertBox> : null}
              <Button
                size="lg"
                full
                disabled={deadlinePassed || failed}
                leftIcon={<ShieldCheck className="h-4 w-4" />}
                onClick={submitIdentity}
              >
                {t('verifyIdentity')}
              </Button>
              <p className="text-center text-[9px] leading-relaxed text-ink-soft">{t('trackerNote')}</p>
            </div>
          </Card>
        ) : (
          <>
            <AlertBox tone="success" title={t('identityVerified')}>
              {t('chooseMethod')}
            </AlertBox>

            <Card className="p-3.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[12.5px] font-bold text-ink">{t('chooseFulfilment')}</p>
                {winner.method ? <Badge tone="green">{winner.method === 'delivery' ? t('delivery') : t('pickup')}</Badge> : null}
              </div>

              <div className="mt-2.5 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMethod('delivery')}
                  className={cn(
                    'rounded-xl border p-2.5 text-left transition',
                    method === 'delivery' ? 'border-brand bg-brand-soft' : 'border-line bg-white hover:border-brand/40',
                  )}
                >
                  <Truck className={cn('h-5 w-5', method === 'delivery' ? 'text-brand-dark' : 'text-ink-soft')} />
                  <p className="mt-1.5 text-[11px] font-bold text-ink">{t('delivery')}</p>
                  <p className="mt-0.5 text-[8.5px] leading-snug text-ink-muted">Addis Ababa · 1–3 days</p>
                </button>
                <button
                  type="button"
                  onClick={() => setMethod('pickup')}
                  className={cn(
                    'rounded-xl border p-2.5 text-left transition',
                    method === 'pickup' ? 'border-brand bg-brand-soft' : 'border-line bg-white hover:border-brand/40',
                  )}
                >
                  <MapPin className={cn('h-5 w-5', method === 'pickup' ? 'text-brand-dark' : 'text-ink-soft')} />
                  <p className="mt-1.5 text-[11px] font-bold text-ink">{t('pickup')}</p>
                  <p className="mt-0.5 text-[8.5px] leading-snug text-ink-muted">Bole · Piassa · Sarbet</p>
                </button>
              </div>

              {method === 'delivery' ? (
                <Field label={t('deliveryAddress')} htmlFor="winner-address" className="mt-2.5" required>
                  <Textarea
                    id="winner-address"
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                    placeholder={t('addressPlaceholder')}
                    className="min-h-[76px]"
                  />
                </Field>
              ) : (
                <Field label={t('pickupLocation')} className="mt-2.5" required>
                  <Select value={pickup} onChange={(event) => setPickup(event.target.value)}>
                    <option value={t('pickupLocationBole')}>{t('pickupLocationBole')}</option>
                    <option value={t('pickupLocationPiassa')}>{t('pickupLocationPiassa')}</option>
                    <option value={t('pickupLocationSarbet')}>{t('pickupLocationSarbet')}</option>
                  </Select>
                </Field>
              )}

              {error ? <AlertBox tone="danger" className="mt-2.5">{error}</AlertBox> : null}
              <Button size="lg" full className="mt-3" leftIcon={<CheckCircle2 className="h-4 w-4" />} onClick={submitFulfilment}>
                {hasMethod ? t('save') : t('saveChoice')}
              </Button>
            </Card>

            <Card className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-line px-3.5 py-2.5">
                <div>
                  <p className="text-[12px] font-bold text-ink">{t('fulfilmentTracker')}</p>
                  <p className="text-[9px] text-ink-muted">{t('trackerNote')}</p>
                </div>
                <Box className="h-4 w-4 text-brand-dark" />
              </div>
              <div className="px-4 py-3">
                {trackerSteps.map((step, index) => {
                  const Icon = step.icon
                  const active = progressIndex >= index + 1
                  const isCurrent = progressIndex === index
                  return (
                    <div key={step.key} className="relative flex gap-3 pb-4 last:pb-0">
                      {index < trackerSteps.length - 1 ? (
                        <span className={cn('absolute left-[13px] top-6 h-full w-[2px] rounded', active ? 'bg-brand' : 'bg-line')} />
                      ) : null}
                      <span
                        className={cn(
                          'relative z-10 flex h-7 w-7 flex-none items-center justify-center rounded-full border-2',
                          active ? 'border-brand bg-brand text-white' : isCurrent ? 'border-brand/40 bg-brand-tint text-brand-dark' : 'border-line bg-white text-ink-soft',
                        )}
                      >
                        {active ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <Icon className="h-3.5 w-3.5" />}
                      </span>
                      <div className="pt-0.5">
                        <p className={cn('text-[11px] font-bold', active || isCurrent ? 'text-ink' : 'text-ink-soft')}>{step.label}</p>
                        <p className="mt-0.5 text-[9px] text-ink-muted">
                          {step.key === 'verified'
                            ? winner.verification === 'verified'
                              ? t('identityVerified')
                              : t('awaiting')
                            : step.key === 'dispatched'
                              ? winner.fulfilment === 'dispatched' || delivered
                                ? winner.method === 'pickup'
                                  ? t('pickupLocation')
                                  : t('dispatchedStep')
                                : t('awaiting')
                              : delivered
                                ? t('alreadyDelivered')
                                : t('awaiting')}
                        </p>
                      </div>
                      {index === progressIndex && index < 3 ? (
                        <span className="ml-auto mt-1 flex-none rounded-full bg-brand-tint px-2 py-0.5 text-[7.5px] font-extrabold uppercase tracking-wide text-brand-dark">
                          {t('active')}
                        </span>
                      ) : null}
                    </div>
                  )
                })}
              </div>
              {winner.method ? (
                <div className="border-t border-line bg-[#FAFBF9] px-3.5 py-2.5 text-[9px] text-ink-muted">
                  <span className="font-bold text-ink">{winner.method === 'delivery' ? t('deliveryAddress') : t('pickupLocation')}: </span>
                  {winner.method === 'delivery' ? winner.address : winner.pickupLocation}
                </div>
              ) : null}
            </Card>
          </>
        )}

        <div className="flex items-center justify-center gap-1.5 pb-1 text-[9px] font-medium text-ink-soft">
          <Clock3 className="h-2.5 w-2.5" />
          {t('verificationDeadline')}: {formatDateTime(winner.deadlineAt, language)}
        </div>
      </div>
    </div>
  )
}

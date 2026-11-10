import { ArrowLeft, CheckCircle2, Hash, Lock, ReceiptText, ShieldCheck, Ticket, TriangleAlert } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AlertBox, Badge, Button, Card, CopyButton, EmptyState, StatusBadge } from '../../components/ui'
import { useT } from '../../i18n'
import { hashBid } from '../../lib/engine'
import { formatBid, formatDateTime, formatETB, formatPhoneDisplay } from '../../lib/format'
import { useAuction, useStore } from '../../store/useStore'

export default function ReceiptPage() {
  const { id, bidId } = useParams()
  const t = useT()
  const language = useStore((state) => state.language)
  const auction = useAuction(id)
  const bid = useStore((state) => state.bids.find((b) => b.id === bidId))
  const entry = useStore((state) => state.entries.find((e) => e.id === bid?.entryId))
  const user = useStore((state) => state.users.find((u) => u.id === bid?.userId))
  const navigate = useNavigate()
  const [verification, setVerification] = useState<'idle' | 'valid' | 'invalid'>('idle')

  if (!auction || !bid || !entry) {
    return (
      <div className="flex min-h-full items-center justify-center p-6">
        <EmptyState
          icon={<ReceiptText className="h-5 w-5" />}
          title={t('noBidYet')}
          body={t('bidOnce')}
          action={<Button onClick={() => navigate('/entries')}>{t('viewEntry')}</Button>}
        />
      </div>
    )
  }

  const verify = () => {
    const recomputed = hashBid({
      auctionId: bid.auctionId,
      userId: bid.userId,
      amount: bid.amount,
      timestamp: bid.timestamp,
      salt: bid.salt,
    })
    setVerification(recomputed === bid.hash ? 'valid' : 'invalid')
  }

  return (
    <div className="min-h-full bg-page pb-6">
      <div className="px-4 pb-2 pt-4">
        <div className="flex items-center justify-between">
          <Link to={`/auction/${auction.id}`} className="focus-ring flex items-center gap-1 text-[11px] font-bold text-ink-muted">
            <ArrowLeft className="h-3.5 w-3.5" />
            {t('viewAuction')}
          </Link>
          <Badge tone={bid.valid ? 'green' : 'red'} dot>
            {bid.valid ? t('sealedBidNote') : t('invalidated')}
          </Badge>
        </div>
        <h1 className="mt-2 text-[22px] font-extrabold tracking-[-0.04em] text-ink">{t('bidLockedTitle')}</h1>
        <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-muted">{t('bidLockedBody')}</p>
      </div>

      <div className="px-4">
        <div className="relative overflow-hidden rounded-[22px] border border-[#DDEBD7] bg-white shadow-card">
          <div className="bg-gradient-to-br from-brand-dark to-brand px-4 py-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
                  <Lock className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-white/70">{t('receipt')}</p>
                  <p className="text-[11px] font-bold">How Low · {auction.category}</p>
                </div>
              </div>
              <ReceiptText className="h-5 w-5 text-white/60" />
            </div>
            <div className="mt-4">
              <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-white/65">{t('bidAmount')}</p>
              <p className="mt-0.5 text-[34px] font-extrabold leading-none tracking-[-0.05em] amount-tabular">
                ETB {formatBid(bid.amount)}
              </p>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-white/20 pt-2 text-[9px] font-medium text-white/75">
              <span className="truncate pr-2">{language === 'am' ? auction.titleAm : auction.title}</span>
              <span>{t('entry')} #{entry.id.slice(-5).toUpperCase()}</span>
            </div>
          </div>

          <div className="relative border-b border-dashed border-[#D7DFD3]">
            <span className="absolute -left-2.5 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-page" />
            <span className="absolute -right-2.5 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-page" />
            <div className="px-4 py-3">
              <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-ink-soft">{t('entryStatus')}</p>
              <div className="mt-1 flex items-center gap-2">
                <StatusBadge status={bid.valid ? 'active' : 'invalidated'} />
                <span className="text-[10px] font-medium text-ink-muted">
                  {t('paid')} {formatETB(auction.entryFee)} · {t('entry')} #{entry.id.slice(-5).toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2.5 px-4 py-3.5 text-[11.5px]">
            <Row label={t('reference')} value={<span className="font-mono text-[10.5px] font-bold">{bid.id.toUpperCase()}</span>} />
            <Row label={t('timestamp')} value={formatDateTime(bid.timestamp, language)} />
            <Row label={t('phone')} value={user?.phone ? formatPhoneDisplay(user.phone) : '—'} />
            <Row label={t('bidHash')} value={<CopyButton value={bid.hash} label={t('copy')} language={language} />} />
            <p className="break-all rounded-lg bg-[#FAFBF9] px-2.5 py-2 font-mono text-[9px] leading-relaxed text-ink-muted">
              {bid.hash}
            </p>
            <div>
              <div className="flex items-center justify-between">
                <span className="text-ink-muted">{t('salt')}</span>
                <CopyButton value={bid.salt} label={t('copy')} language={language} />
              </div>
              <p className="mt-1 break-all rounded-lg bg-[#FAFBF9] px-2.5 py-2 font-mono text-[9px] text-ink-muted">{bid.salt}</p>
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-start gap-2.5 rounded-2xl border border-[#DDEBD7] bg-brand-soft p-3">
          <Hash className="mt-0.5 h-4 w-4 flex-none text-brand-dark" />
          <p className="text-[10px] leading-relaxed text-[#4A6B40]">
            <span className="font-bold text-brand-dark">{t('bidHash')}</span> {t('hashExplain')}
          </p>
        </div>

        {verification === 'valid' ? (
          <AlertBox tone="success" title={t('hashVerified')} className="mt-2.5">
            <span className="flex items-center gap-1 text-[10px]">
              <CheckCircle2 className="h-3 w-3" /> SHA-256 · {bid.hash.slice(0, 16)}…
            </span>
          </AlertBox>
        ) : verification === 'invalid' ? (
          <AlertBox tone="danger" title={t('hashMismatch')} className="mt-2.5">
            <span className="flex items-center gap-1 text-[10px]">
              <TriangleAlert className="h-3 w-3" /> {bid.hash.slice(0, 16)}…
            </span>
          </AlertBox>
        ) : null}

        <Button
          size="lg"
          full
          className="mt-3"
          leftIcon={<ShieldCheck className="h-4 w-4" />}
          onClick={verify}
        >
          {t('verifyHash')}
        </Button>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <Button
            variant="secondary"
            size="md"
            full
            leftIcon={<Ticket className="h-4 w-4" />}
            onClick={() => navigate('/entries')}
          >
            {t('yourEntries')}
          </Button>
          <Button variant="secondary" size="md" full onClick={() => navigate(`/auction/${auction.id}`)}>
            {t('viewAuction')}
          </Button>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-ink-muted">{label}</span>
      <span className="text-right font-semibold text-ink">{value}</span>
    </div>
  )
}

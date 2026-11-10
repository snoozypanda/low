import {
  Bell,
  ChevronRight,
  Globe2,
  Languages,
  LayoutDashboard,
  LogOut,
  Plus,
  RotateCcw,
  ShieldCheck,
  Ticket,
  Trophy,
  UserRound,
  Wallet,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useToast } from '../../components/Toast'
import { Wordmark } from '../../components/Brand'
import { AlertBox, Badge, Button, Card, Modal, cn } from '../../components/ui'
import { useT } from '../../i18n'
import { formatDate, formatPhoneDisplay } from '../../lib/format'
import { useCurrentUser, useStore } from '../../store/useStore'
import type { Language } from '../../types'

export default function Profile() {
  const t = useT()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const user = useCurrentUser()
  const language = useStore((state) => state.language)
  const setLanguage = useStore((state) => state.setLanguage)
  const addWalletCredit = useStore((state) => state.addWalletCredit)
  const resetDemo = useStore((state) => state.resetDemo)
  const logout = useStore((state) => state.logout)
  const [resetOpen, setResetOpen] = useState(false)

  if (!user) return null

  const initials = user.name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="min-h-full bg-page pb-5">
      <div className="relative overflow-hidden bg-gradient-to-br from-brand-deep via-brand-dark to-brand px-4 pb-5 pt-4 text-white">
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-14 w-14 flex-none items-center justify-center rounded-2xl border border-white/25 bg-white/15 text-[18px] font-extrabold tracking-tight backdrop-blur">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[19px] font-extrabold tracking-[-0.03em]">{user.name}</h1>
            <p className="mt-0.5 text-[10.5px] font-medium text-white/70">{formatPhoneDisplay(user.phone)}</p>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-wide">
                <ShieldCheck className="h-2.5 w-2.5" /> {t('demoAccount')}
              </span>
              <span className="text-[8.5px] text-white/55">
                {t('memberSince')} {formatDate(user.createdAt, language)}
              </span>
            </div>
          </div>
        </div>

        <div className="relative mt-4 rounded-2xl border border-white/15 bg-white/10 p-3.5 backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[8.5px] font-bold uppercase tracking-[0.16em] text-white/60">{t('walletBalance')}</p>
              <p className="mt-1 text-[28px] font-extrabold leading-none tracking-[-0.04em] amount-tabular">
                ETB {(user.walletBalance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="mt-1 text-[8.5px] text-white/55">{t('walletNote')}</p>
            </div>
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-white/15">
              <Wallet className="h-4 w-4" />
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              addWalletCredit(100)
              showToast({ tone: 'success', title: t('addMoneyDemo'), message: `+ ETB 100.00` })
            }}
            className="focus-ring mt-3 flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[10px] font-bold text-brand-dark shadow-sm transition active:scale-95"
          >
            <Plus className="h-3 w-3" /> {t('addMoneyDemo')}
          </button>
        </div>
      </div>

      <div className="space-y-2.5 px-4 pt-3">
        <div className="grid grid-cols-3 gap-2">
          <QuickLink to="/entries" icon={<Ticket className="h-4 w-4" />} label={t('navEntries')} />
          <QuickLink to="/results" icon={<Trophy className="h-4 w-4" />} label={t('navResults')} />
          <QuickLink to="/notifications" icon={<Bell className="h-4 w-4" />} label={t('notifications')} />
        </div>

        <Card className="overflow-hidden">
          <div className="flex items-center gap-2 border-b border-line px-3.5 py-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-tint text-brand-dark">
              <Languages className="h-3.5 w-3.5" />
            </span>
            <p className="text-[11.5px] font-bold text-ink">{t('language')}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 p-2.5">
            {(
              [
                { value: 'en', label: t('english'), sub: 'English' },
                { value: 'am', label: t('amharic'), sub: 'አማርኛ' },
              ] as Array<{ value: Language; label: string; sub: string }>
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setLanguage(option.value)}
                className={cn(
                  'flex items-center justify-between rounded-xl border px-2.5 py-2 text-left transition',
                  language === option.value ? 'border-brand bg-brand-soft' : 'border-line bg-white hover:border-brand/40',
                )}
              >
                <div>
                  <p className="text-[11px] font-bold text-ink">{option.sub}</p>
                  <p className="text-[8.5px] text-ink-muted">{option.label}</p>
                </div>
                {language === option.value ? (
                  <CheckCheck className="h-3.5 w-3.5 text-brand-dark" />
                ) : (
                  <Globe2 className="h-3.5 w-3.5 text-ink-soft" />
                )}
              </button>
            ))}
          </div>
        </Card>

        <Card className="divide-y divide-line overflow-hidden">
          <InfoRow icon={<UserRound className="h-4 w-4" />} label={t('phoneNumber')} value={formatPhoneDisplay(user.phone)} />
          <InfoRow
            icon={<ShieldCheck className="h-4 w-4" />}
            label={t('signedInAs')}
            value={<Badge tone="green">{t('demoAccount')}</Badge>}
          />
          <Link
            to="/admin"
            className="flex items-center gap-2.5 px-3.5 py-3 transition hover:bg-brand-soft"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-ink text-white">
              <LayoutDashboard className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11.5px] font-bold text-ink">{t('adminDashboard')}</p>
              <p className="text-[9px] text-ink-muted">Desktop operator console</p>
            </div>
            <ChevronRight className="h-4 w-4 text-ink-soft" />
          </Link>
        </Card>

        <AlertBox tone="info" title={t('demoAccount')}>
          {t('walletNote')} {t('demoHint')}
        </AlertBox>

        <Card className="overflow-hidden">
          <button
            type="button"
            onClick={() => setResetOpen(true)}
            className="flex w-full items-center gap-2.5 px-3.5 py-3 text-left transition hover:bg-[#FFF7E8]"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FFF5E6] text-[#9A5B00]">
              <RotateCcw className="h-4 w-4" />
            </span>
            <div className="flex-1">
              <p className="text-[11.5px] font-bold text-ink">{t('resetDemo')}</p>
              <p className="text-[9px] text-ink-muted">Restore the six seed auctions and demo activity</p>
            </div>
            <ChevronRight className="h-4 w-4 text-ink-soft" />
          </button>
          <button
            type="button"
            onClick={() => {
              logout()
              navigate('/login', { replace: true })
            }}
            className="flex w-full items-center gap-2.5 border-t border-line px-3.5 py-3 text-left transition hover:bg-[#FDECEF]"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FDECEF] text-accent">
              <LogOut className="h-4 w-4" />
            </span>
            <div className="flex-1">
              <p className="text-[11.5px] font-bold text-accent">{t('logout')}</p>
              <p className="text-[9px] text-ink-muted">{t('loginSubtitle')}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-ink-soft" />
          </button>
        </Card>

        <div className="flex flex-col items-center gap-1.5 pt-1">
          <Wordmark tone="dark" size="sm" showTagline={false} />
          <p className="text-[8.5px] font-medium text-ink-soft">{t('version')}</p>
          <p className="text-[8px] text-ink-soft">Not affiliated with Safaricom or M-PESA.</p>
        </div>
      </div>

      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title={t('resetConfirm')}
        description={t('resetConfirmBody')}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setResetOpen(false)}>
              {t('cancel')}
            </Button>
            <Button
              variant="danger"
              size="sm"
              leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
              onClick={() => {
                resetDemo()
                setResetOpen(false)
                navigate('/')
                showToast({ tone: 'success', title: t('toastDemoReset') })
              }}
            >
              {t('resetDemo')}
            </Button>
          </>
        }
      >
        <div className="rounded-xl bg-page p-3 text-[11px] leading-relaxed text-ink-muted">
          {t('walletNote')} {t('demoHint')}
        </div>
      </Modal>
    </div>
  )
}

function QuickLink({ to, icon, label }: { to: string; icon: ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center gap-1.5 rounded-xl border border-line bg-white py-2.5 text-ink shadow-card transition hover:border-brand/40 active:scale-[0.98]"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-tint text-brand-dark">{icon}</span>
      <span className="text-[8.5px] font-bold">{label}</span>
    </Link>
  )
}

function InfoRow({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 px-3.5 py-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-page text-ink-muted">{icon}</span>
      <p className="flex-1 text-[11px] font-semibold text-ink-muted">{label}</p>
      <div className="text-[11px] font-bold text-ink">{value}</div>
    </div>
  )
}

function CheckCheck({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m2 12 5 5L18 6" />
      <path d="m13 17 1.5 1.5L24 8" />
    </svg>
  )
}

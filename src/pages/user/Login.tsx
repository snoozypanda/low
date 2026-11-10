import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  Languages,
  LockKeyhole,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Ticket,
  Trophy,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DemoBanner, StatusBar, Wordmark } from '../../components/Brand'
import { useToast } from '../../components/Toast'
import { AlertBox, Button, Input, cn } from '../../components/ui'
import { useT } from '../../i18n'
import { formatPhoneDisplay } from '../../lib/format'
import { useCurrentUser, useStore } from '../../store/useStore'
import type { Language } from '../../types'

const DEMO_PHONE = '+251712345678'

export default function Login() {
  const t = useT()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const language = useStore((state) => state.language)
  const setLanguage = useStore((state) => state.setLanguage)
  const login = useStore((state) => state.login)
  const currentUser = useCurrentUser()

  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [resendIn, setResendIn] = useState(0)
  const codeRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (resendIn <= 0) return
    const timer = window.setInterval(() => setResendIn((value) => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [resendIn])

  useEffect(() => {
    if (step === 'otp') {
      const timer = window.setTimeout(() => codeRef.current?.focus(), 120)
      return () => window.clearTimeout(timer)
    }
  }, [step])

  const sendCode = () => {
    setError(null)
    if (!phone.trim()) {
      setError(t('invalidPhone'))
      return
    }
    setSending(true)
    window.setTimeout(() => {
      setSending(false)
      const result = login(phone)
      if (!result.ok) {
        setError(result.error ?? t('invalidPhone'))
        return
      }
      setStep('otp')
      setResendIn(30)
      setCode('')
      showToast({
        tone: 'success',
        title: t('otpSent'),
        message: `4-digit code sent to ${result.user?.phone ? formatPhoneDisplay(result.user.phone) : phone}. Any 4 digits work in demo mode.`,
      })
    }, 550)
  }

  const verify = () => {
    setError(null)
    if (!/^\d{4}$/.test(code)) {
      setError(t('invalidCode'))
      return
    }
    setVerifying(true)
    window.setTimeout(() => {
      const result = login(phone)
      setVerifying(false)
      if (!result.ok) {
        setError(result.error ?? t('invalidPhone'))
        return
      }
      showToast({
        tone: 'success',
        title: t('welcomeBack'),
        message: result.user ? `${result.user.name} · ${formatPhoneDisplay(result.user.phone)}` : undefined,
      })
      navigate('/', { replace: true })
    }, 650)
  }

  const toggleLanguage = () => {
    const next: Language = language === 'en' ? 'am' : 'en'
    setLanguage(next)
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-page">
      <div className="login-panel relative flex-none px-5 pb-11 pt-0 text-white">
        <StatusBar tone="green" />
        <div className="flex items-center justify-between">
          <Wordmark tone="light" />
          <button
            type="button"
            onClick={toggleLanguage}
            className="focus-ring flex items-center gap-1 rounded-full border border-white/25 bg-white/10 px-2.5 py-1.5 text-[9px] font-extrabold uppercase tracking-wide text-white backdrop-blur"
            aria-label="Toggle language"
          >
            <Languages className="h-3 w-3" />
            {language === 'en' ? 'EN' : 'አማ'}
          </button>
        </div>

        <div className="mt-7 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[8.5px] font-extrabold uppercase tracking-[0.16em] text-white/90 backdrop-blur">
          <Sparkles className="h-3 w-3" />
          {t('loginBadge')}
        </div>
        <h1 className="mt-3 max-w-[280px] text-[36px] font-black leading-[0.94] tracking-[-0.055em]">
          {t('loginTitle')}
        </h1>
        <p className="mt-3 max-w-[300px] text-[11.5px] leading-relaxed text-white/75">{t('loginSubtitle')}</p>

        <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-[9.5px] font-semibold text-white/80">
          {[
            { icon: Ticket, label: t('loginFeature1') },
            { icon: Trophy, label: t('loginFeature2') },
            { icon: ShieldCheck, label: t('loginFeature3') },
          ].map(({ icon: Icon, label }) => (
            <span key={label} className="inline-flex items-center gap-1.5">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/15">
                <Icon className="h-2.5 w-2.5" />
              </span>
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="no-scrollbar relative -mt-5 flex-1 overflow-y-auto rounded-t-[26px] bg-white px-5 pb-6 pt-4 shadow-[0_-16px_40px_rgba(20,60,30,0.12)]">
        <DemoBanner language={language} className="-mx-5 -mt-4 mb-4" />

        {currentUser ? (
          <div className="mb-4 rounded-xl border border-[#D7EDCF] bg-brand-tint/70 p-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-[12px] font-black text-white">
                {currentUser.name
                  .split(' ')
                  .map((part) => part[0])
                  .slice(0, 2)
                  .join('')}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-brand-dark">{t('signedInAs')}</p>
                <p className="truncate text-[13px] font-bold text-ink">{currentUser.name}</p>
                <p className="text-[10px] text-ink-muted">{formatPhoneDisplay(currentUser.phone)}</p>
              </div>
              <Button size="sm" onClick={() => navigate('/')} rightIcon={<ArrowRight className="h-3.5 w-3.5" />}>
                {t('continue')}
              </Button>
            </div>
          </div>
        ) : null}

        {step === 'phone' ? (
          <div className="animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-tint text-brand-dark">
                <Smartphone className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-[17px] font-extrabold tracking-[-0.02em] text-ink">{t('welcomeBack')}</h2>
                <p className="text-[10.5px] text-ink-muted">{t('phoneHint')}</p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <label htmlFor="login-phone" className="text-[11px] font-bold text-ink">
                {t('phoneNumberLabel')}
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] font-bold text-ink-muted">
                  +251
                </span>
                <Input
                  id="login-phone"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="71 234 5678"
                  value={phone.replace(/^\+?251/, '').replace(/^0/, '')}
                  onChange={(event) => {
                    const value = event.target.value.replace(/[^\d\s]/g, '')
                    setPhone(value.trim() ? `+251${value.replace(/\s/g, '').replace(/^0/, '')}` : '')
                    setError(null)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') sendCode()
                  }}
                  className="pl-[58px] tracking-wide"
                  error={Boolean(error)}
                />
              </div>
              {error ? (
                <AlertBox tone="danger" className="py-2.5">
                  {error}
                </AlertBox>
              ) : (
                <p className="text-[10.5px] leading-relaxed text-ink-muted">{t('demoHint')}</p>
              )}

              <button
                type="button"
                onClick={() => {
                  setPhone(DEMO_PHONE)
                  setError(null)
                }}
                className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-line bg-page px-2.5 py-1 text-[9.5px] font-bold text-ink-muted transition hover:border-brand/40 hover:text-brand-dark"
              >
                <Sparkles className="h-3 w-3" /> Use demo number · {formatPhoneDisplay(DEMO_PHONE)}
              </button>

              <Button
                full
                size="lg"
                loading={sending}
                onClick={sendCode}
                rightIcon={!sending ? <ArrowRight className="h-4 w-4" /> : undefined}
              >
                {t('sendCode')}
              </Button>

              <p className="flex items-start gap-1.5 text-[9.5px] leading-relaxed text-ink-soft">
                <LockKeyhole className="mt-0.5 h-3 w-3 flex-none" />
                Demo only. No SMS is sent, no password is stored and no real money moves.
              </p>
            </div>
          </div>
        ) : (
          <div className="animate-fade-in">
            <button
              type="button"
              onClick={() => {
                setStep('phone')
                setError(null)
              }}
              className="focus-ring -ml-1 mb-3 inline-flex items-center gap-1 rounded-full py-1 pr-2 text-[10.5px] font-bold text-ink-muted hover:text-ink"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> {t('back')}
            </button>

            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-tint text-brand-dark">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-[17px] font-extrabold tracking-[-0.02em] text-ink">{t('otpTitle')}</h2>
                <p className="text-[10.5px] leading-snug text-ink-muted">
                  {t('otpSubtitle', { phone: formatPhoneDisplay(phone) })}
                </p>
              </div>
            </div>

            <div className="mt-5">
              <label htmlFor="login-code" className="mb-2 block text-[11px] font-bold text-ink">
                {t('enterPin')}
              </label>
              <input
                ref={codeRef}
                id="login-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={4}
                value={code}
                onChange={(event) => {
                  setCode(event.target.value.replace(/\D/g, '').slice(0, 4))
                  setError(null)
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') verify()
                }}
                placeholder="• • • •"
                className={cn(
                  'h-14 w-full rounded-xl border bg-page text-center text-[24px] font-black tracking-[0.55em] text-ink outline-none transition placeholder:text-ink-soft focus:border-brand focus:bg-white focus:ring-4 focus:ring-brand/10',
                  error ? 'border-accent' : 'border-line',
                )}
              />
              {error ? (
                <div className="mt-2">
                  <AlertBox tone="danger" className="py-2.5">
                    {error}
                  </AlertBox>
                </div>
              ) : (
                <p className="mt-2 text-[10.5px] text-ink-muted">{t('pinAny4')}</p>
              )}

              <Button
                full
                size="lg"
                className="mt-4"
                loading={verifying}
                disabled={code.length !== 4}
                onClick={verify}
                rightIcon={!verifying ? <CheckCircle2 className="h-4 w-4" /> : undefined}
              >
                {t('verify')}
              </Button>

              <div className="mt-3 flex items-center justify-between text-[10px] text-ink-muted">
                <span>Sent to {formatPhoneDisplay(phone)}</span>
                <button
                  type="button"
                  disabled={resendIn > 0}
                  onClick={() => {
                    setResendIn(30)
                    showToast({ tone: 'info', title: t('otpSent'), message: 'A new 4-digit code is on its way (demo).' })
                  }}
                  className="focus-ring rounded-full font-bold text-brand-dark disabled:text-ink-soft"
                >
                  {resendIn > 0 ? `Resend in ${resendIn}s` : t('resend')}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-5 flex items-center justify-center gap-2 border-t border-line pt-4">
          <a
            href="/admin"
            className="focus-ring inline-flex items-center gap-1.5 rounded-full bg-page px-3 py-1.5 text-[9.5px] font-bold text-ink-muted transition hover:text-brand-dark"
          >
            <LockKeyhole className="h-3 w-3" /> {t('adminDashboard')}
          </a>
          <span className="text-[9px] text-ink-soft">›</span>
          <span className="text-[9px] text-ink-soft">No official Safaricom or M-PESA assets are used.</span>
        </div>
      </div>
    </div>
  )
}

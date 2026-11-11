import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Fingerprint,
  Gavel,
  KeyRound,
  Languages,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Wallet,
} from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { DemoBanner, LogoMark, StatusBar } from '../../components/Brand'
import { AlertBox, Button, Card, Field, Input } from '../../components/ui'
import { useStore } from '../../store/useStore'
import type { Language } from '../../types'

export default function AdminLogin() {
  const navigate = useNavigate()
  const location = useLocation()
  const adminAuthed = useStore((state) => state.adminAuthed)
  const adminLogin = useStore((state) => state.adminLogin)
  const language = useStore((state) => state.language)
  const setLanguage = useStore((state) => state.setLanguage)

  const [email, setEmail] = useState('admin@howlow.et')
  const [password, setPassword] = useState('demo1234')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (adminAuthed) return <Navigate to="/admin" replace />

  const from = (location.state as { from?: string } | null)?.from ?? '/admin'

  const submit = () => {
    setError(null)
    setBusy(true)
    window.setTimeout(() => {
      const result = adminLogin(email, password)
      setBusy(false)
      if (!result.ok) {
        setError(result.error ?? 'Could not sign in.')
        return
      }
      navigate(from, { replace: true })
    }, 500)
  }

  const toggleLanguage = () => {
    const next: Language = language === 'en' ? 'am' : 'en'
    setLanguage(next)
  }

  return (
    <div className="flex min-h-screen flex-col bg-page">
      <DemoBanner
        language={language}
        right={
          <button
            type="button"
            onClick={toggleLanguage}
            className="focus-ring flex items-center gap-1 rounded-full border border-[#CFE3C6] bg-white px-2 py-0.5 text-[8.5px] font-extrabold uppercase tracking-wide text-brand-dark"
          >
            <Languages className="h-2.5 w-2.5" /> {language === 'en' ? 'EN' : 'አማ'}
          </button>
        }
      />

      <div className="grid flex-1 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="login-panel relative hidden flex-col justify-between overflow-hidden p-10 text-white lg:flex">
          <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -bottom-32 -right-24 h-96 w-96 rounded-full border border-white/10" />
          <div className="relative">
            <div className="flex items-center gap-3">
              <LogoMark tone="white" className="h-11 w-11" />
              <div>
                <p className="text-[24px] font-extrabold tracking-[-0.05em]">
                  How<span className="text-white/75">Low</span>
                </p>
                <p className="text-[8px] font-bold uppercase tracking-[0.26em] text-white/60">Operations console</p>
              </div>
            </div>

            <div className="mt-16 max-w-[430px]">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.16em] backdrop-blur">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> Demo environment
              </div>
              <h1 className="mt-5 text-[48px] font-black leading-[0.92] tracking-[-0.06em]">
                Run the
                <br />
                auction floor.
              </h1>
              <p className="mt-5 max-w-[360px] text-[13px] leading-relaxed text-white/70">
                Monitor live entry counts, reconcile M-PESA callbacks, resolve refunds and move winners through
                fulfilment — all from one console.
              </p>

              <div className="mt-8 grid max-w-[400px] grid-cols-2 gap-3">
                {[
                  { icon: Gavel, title: 'Auction control', body: 'Close, fast-forward or cancel with a full audit trail.' },
                  { icon: Wallet, title: 'Payments', body: 'Every callback is idempotent and traceable.' },
                  { icon: BarChart3, title: 'Unit economics', body: 'Contribution margin and break-even per auction.' },
                  { icon: ShieldCheck, title: 'Fulfilment', body: 'Dispatch and confirm delivery.' },
                ].map(({ icon: Icon, title, body }) => (
                  <div key={title} className="rounded-xl border border-white/15 bg-white/[0.07] p-3.5 backdrop-blur-sm">
                    <Icon className="h-4 w-4 text-white/80" />
                    <p className="mt-2 text-[11.5px] font-bold">{title}</p>
                    <p className="mt-1 text-[10px] leading-relaxed text-white/55">{body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="relative flex items-center gap-4 text-[9px] text-white/40">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3" /> No real money moves
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Fingerprint className="h-3 w-3" /> SHA-256 bid receipts
            </span>
            <span className="inline-flex items-center gap-1.5">
              <LockKeyhole className="h-3 w-3" /> Client-side only
            </span>
          </div>
        </div>

        <div className="flex items-center justify-center px-4 py-10 sm:px-8">
          <div className="w-full max-w-[390px]">
            <div className="mb-6 flex items-center justify-between lg:hidden">
              <Link to="/" className="focus-ring flex items-center gap-2">
                <LogoMark tone="green" className="h-9 w-9" />
                <span className="text-[20px] font-extrabold tracking-[-0.045em] text-ink">
                  How<span className="text-brand">Low</span>
                </span>
              </Link>
              <span className="rounded-full bg-brand-tint px-2.5 py-1 text-[8.5px] font-extrabold uppercase tracking-wide text-brand-dark">
                Admin
              </span>
            </div>

            <Card className="p-6">
              <div className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink text-white">
                  <KeyRound className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-[20px] font-extrabold tracking-[-0.03em] text-ink">Admin sign in</h2>
                  <p className="text-[11px] text-ink-muted">Operations & reconciliation console</p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <Field label="Work email" htmlFor="admin-email">
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
                    <Input
                      id="admin-email"
                      type="email"
                      autoComplete="username"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="pl-10"
                    />
                  </div>
                </Field>

                <Field label="Password" htmlFor="admin-password" hint="Any email and password work in demo mode.">
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
                    <Input
                      id="admin-password"
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') submit()
                      }}
                      className="pl-10"
                    />
                  </div>
                </Field>

                {error ? <AlertBox tone="danger">{error}</AlertBox> : null}

                <Button full size="lg" loading={busy} onClick={submit} rightIcon={!busy ? <ArrowRight className="h-4 w-4" /> : undefined}>
                  Sign in to console
                </Button>

                <div className="rounded-xl border border-[#D7EDCF] bg-brand-tint/60 px-3 py-2.5 text-[10.5px] leading-relaxed text-brand-dark">
                  <span className="font-bold">Demo credentials are pre-filled.</span> The admin session starts authenticated
                  in a fresh demo, and any credentials are accepted after sign-out.
                </div>

                <div className="flex items-center justify-between border-t border-line pt-4 text-[10px] text-ink-muted">
                  <Link to="/" className="focus-ring font-bold text-brand-dark hover:underline">
                    ← Back to mobile app
                  </Link>
                  <span>v1.0 · client-side demo</span>
                </div>
              </div>
            </Card>

            <p className="mt-4 text-center text-[9px] leading-relaxed text-ink-soft">
              No official Safaricom or M-PESA branding is used. Payments and SMS are simulated.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

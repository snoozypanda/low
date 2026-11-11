import { Megaphone } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from './ui'
import { useT } from '../i18n'
import type { Language } from '../types'

export function LogoMark({ className, tone = 'white' }: { className?: string; tone?: 'white' | 'green' | 'dark' }) {
  const bg = tone === 'white' ? '#FFFFFF' : tone === 'green' ? '#43B02A' : '#2E7D1E'
  const fg = tone === 'white' ? '#2E7D1E' : '#FFFFFF'
  return (
    <svg
      viewBox="0 0 44 44"
      className={cn('h-9 w-9', className)}
      role="img"
      aria-label="Bidora coin and arrow mark"
    >
      <circle cx="22" cy="22" r="20" fill={bg} />
      <circle cx="22" cy="22" r="15.5" fill="none" stroke={fg} strokeOpacity="0.28" strokeWidth="1.4" strokeDasharray="2 3" />
      <path
        d="M13.5 16.2h17M22 13.8v13.9M16.8 22.2 22 27.7l5.2-5.5"
        fill="none"
        stroke={fg}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="22" cy="30.9" r="1.4" fill={fg} />
    </svg>
  )
}

export function Wordmark({
  tone = 'light',
  showTagline = true,
  size = 'md',
  className,
}: {
  tone?: 'light' | 'dark'
  showTagline?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const t = useT()
  const sizes = {
    sm: 'text-[17px]',
    md: 'text-[21px]',
    lg: 'text-[28px]',
  }[size]
  const markSizes = {
    sm: 'h-7 w-7',
    md: 'h-9 w-9',
    lg: 'h-12 w-12',
  }[size]
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <LogoMark tone={tone === 'light' ? 'white' : 'green'} className={cn(markSizes, 'logo-coin flex-none')} />
      <div className="leading-none">
        <div className={cn('font-extrabold tracking-[-0.045em]', sizes, tone === 'light' ? 'text-white' : 'text-ink')}>
          Bid<span className={tone === 'light' ? 'text-white' : 'text-brand'}>ora</span>
        </div>
        {showTagline ? (
          <div
            className={cn(
              'mt-1 text-[7.5px] font-bold uppercase tracking-[0.22em]',
              tone === 'light' ? 'text-white/80' : 'text-ink-muted',
            )}
          >
            {t('tagline')}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function DemoBanner({
  language,
  className,
  compact,
  right,
}: {
  language?: Language
  className?: string
  compact?: boolean
  right?: ReactNode
}) {
  const lang = language ?? 'en'
  const text =
    lang === 'am'
      ? 'የማሳያ ሁነታ፡ ክፍያዎች ምናባዊ ናቸው፤ እውነተኛ ገንዘብ አይንቀሳቀስም።'
      : 'DEMO MODE: payments are simulated, no real money moves.'
  return (
    <div
      className={cn(
        'flex items-center gap-2 border-b border-[#D9EAD2] bg-[#F2FAEE] px-3.5 py-1.5 text-[9.5px] font-semibold leading-tight text-[#3B6B2A]',
        compact && 'py-1',
        className,
      )}
      role="status"
    >
      <Megaphone className="h-3 w-3 flex-none text-brand-dark" aria-hidden />
      <span className="min-w-0 flex-1 truncate">{text}</span>
      {right}
    </div>
  )
}

export function StatusBar({ tone = 'green' }: { tone?: 'green' | 'white' }) {
  const now = new Date()
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const color = tone === 'green' ? 'text-white' : 'text-ink'
  return (
    <div className={cn('flex h-10 items-end justify-between px-6 pb-1.5', color)} aria-hidden>
      <span className="text-[12px] font-semibold tracking-wide amount-tabular">{time}</span>
      <div className="flex items-center gap-1.5">
        <svg viewBox="0 0 18 12" className="h-2.5 w-4 fill-current">
          <rect x="0" y="8" width="3" height="4" rx="0.6" />
          <rect x="5" y="5.5" width="3" height="6.5" rx="0.6" />
          <rect x="10" y="3" width="3" height="9" rx="0.6" />
          <rect x="15" y="0" width="3" height="12" rx="0.6" opacity="0.55" />
        </svg>
        <svg viewBox="0 0 16 12" className="h-2.5 w-3.5 fill-current">
          <path d="M1 4.2a10.5 10.5 0 0 1 14 0l-1.3 1.6a8.2 8.2 0 0 0-11.4 0L1 4.2Zm2.6 3.2a6.7 6.7 0 0 1 8.8 0L11 9.2a4.4 4.4 0 0 0-6 0L3.6 7.4Zm2.7 3.1a2.8 2.8 0 0 1 3.4 0L8 12l-1.7-1.5Z" />
        </svg>
        <div className="flex items-center gap-0.5">
          <div className="relative h-3 w-6 rounded-[3px] border border-current p-[1.5px]">
            <div className="h-full w-[78%] rounded-[1px] bg-current" />
          </div>
          <span className="h-1 w-1 rounded-r bg-current" />
        </div>
      </div>
    </div>
  )
}

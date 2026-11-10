import { useEffect, useState } from 'react'
import { countdownParts, pad2 } from '../lib/format'
import { cn } from './ui'
import { useT } from '../i18n'

export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(timer)
  }, [intervalMs])
  return now
}

export function Countdown({
  target,
  size = 'inline',
  showLabels = false,
  className,
  muted = false,
}: {
  target: string
  size?: 'inline' | 'card' | 'hero' | 'tiny'
  showLabels?: boolean
  className?: string
  muted?: boolean
}) {
  const now = useNow(1000)
  const t = useT()
  const ms = new Date(target).getTime() - now
  const parts = countdownParts(ms)
  const ended = parts.total <= 0
  const urgent = !muted && !ended && parts.total <= 3600
  const value = `${parts.days > 0 ? `${parts.days}:` : ''}${pad2(parts.hours)}:${pad2(parts.mins)}:${pad2(parts.secs)}`

  if (size === 'tiny') {
    return (
      <span
        className={cn(
          'amount-tabular font-bold',
          ended ? 'text-ink-muted' : urgent ? 'text-accent' : 'text-ink',
          className,
        )}
      >
        {ended ? '00:00' : value}
      </span>
    )
  }

  if (size === 'card') {
    return (
      <div
        className={cn(
          'rounded-xl px-3 py-2',
          ended ? 'bg-[#F0F2F0]' : urgent ? 'bg-[#FDECEF]' : 'bg-[#F4F8F2]',
          className,
        )}
      >
        <div className="flex items-center gap-1.5">
          <div
            className={cn(
              'amount-tabular text-lg font-extrabold tracking-tight',
              ended ? 'text-ink-muted' : urgent ? 'text-accent' : 'text-ink',
            )}
          >
            {ended ? 'ENDED' : value}
          </div>
          {urgent ? <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" /> : null}
        </div>
        {showLabels ? (
          <div className="mt-1 flex gap-2 text-[8px] font-bold uppercase tracking-[0.1em] text-ink-muted">
            {parts.days > 0 ? <span>{t('days')}</span> : null}
            <span>{t('hrs')}</span>
            <span>{t('min')}</span>
            <span>{t('sec')}</span>
          </div>
        ) : null}
      </div>
    )
  }

  if (size === 'hero') {
    return (
      <div className={cn('flex items-start gap-1.5', className)}>
        {parts.days > 0 ? (
          <Segment value={pad2(parts.days)} label={t('days')} urgent={urgent} />
        ) : null}
        <Segment value={pad2(parts.hours)} label={t('hrs')} urgent={urgent} />
        <span className={cn('pt-1 text-lg font-bold', urgent ? 'text-accent' : 'text-ink-soft')}>:</span>
        <Segment value={pad2(parts.mins)} label={t('min')} urgent={urgent} />
        <span className={cn('pt-1 text-lg font-bold', urgent ? 'text-accent' : 'text-ink-soft')}>:</span>
        <Segment value={pad2(parts.secs)} label={t('sec')} urgent={urgent} />
      </div>
    )
  }

  return (
    <span
      className={cn(
        'amount-tabular text-[12px] font-bold',
        ended ? 'text-ink-muted' : urgent ? 'text-accent' : 'text-ink',
        className,
      )}
    >
      {ended ? '00:00:00' : value}
    </span>
  )
}

function Segment({ value, label, urgent }: { value: string; label: string; urgent: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <span
        className={cn(
          'amount-tabular rounded-lg px-1.5 py-0.5 text-[23px] font-extrabold leading-none tracking-[-0.03em]',
          urgent ? 'bg-[#FDECEF] text-accent' : 'bg-[#F1F6EE] text-ink',
        )}
      >
        {value}
      </span>
      <span className="mt-1 text-[7px] font-bold uppercase tracking-[0.14em] text-ink-muted">{label}</span>
    </div>
  )
}

import { clsx, type ClassValue } from 'clsx'
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  Info,
  Loader2,
  TriangleAlert,
  X,
} from 'lucide-react'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { translate, type MessageKey } from '../i18n'
import type { Language } from '../types'

export function cn(...values: ClassValue[]) {
  return clsx(values)
}

/* ------------------------------------------------------------------ */
/* Button                                                              */
/* ------------------------------------------------------------------ */

type ButtonVariant = 'primary' | 'dark' | 'secondary' | 'ghost' | 'danger' | 'outlineWhite'
type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  full?: boolean
  loading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    'bg-brand text-white shadow-[0_8px_20px_rgba(67,176,42,0.22)] hover:bg-brand-dark active:bg-brand-dark disabled:bg-brand/40 disabled:shadow-none',
  dark: 'bg-ink text-white hover:bg-[#0f1720] active:bg-black disabled:bg-ink/40',
  secondary:
    'bg-white text-ink border border-line hover:border-brand/50 hover:text-brand-dark active:bg-brand-soft disabled:text-ink-muted',
  ghost: 'bg-transparent text-ink-muted hover:bg-brand-soft hover:text-brand-dark disabled:text-ink-soft',
  danger: 'bg-accent text-white hover:bg-[#c00024] active:bg-[#a80020] disabled:bg-accent/40',
  outlineWhite: 'bg-white/10 text-white border border-white/40 hover:bg-white/20 active:bg-white/25',
}

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-[13px] gap-1.5 rounded-full',
  md: 'h-11 px-5 text-sm gap-2 rounded-full',
  lg: 'h-[54px] px-6 text-[15px] gap-2.5 rounded-full',
}

export function Button({
  variant = 'primary',
  size = 'md',
  full,
  loading,
  leftIcon,
  rightIcon,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex select-none items-center justify-center font-semibold transition-all duration-150 focus-ring disabled:cursor-not-allowed',
        buttonVariants[variant],
        buttonSizes[size],
        full && 'w-full',
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  )
}

export function IconButton({
  label,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'focus-ring inline-flex h-10 w-10 items-center justify-center rounded-full text-current transition active:scale-95 disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/* Cards / headings                                                    */
/* ------------------------------------------------------------------ */

export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('rounded-2xl border border-line bg-white shadow-card', className)} {...props}>
      {children}
    </div>
  )
}

export function SectionHeading({
  title,
  subtitle,
  action,
  className,
}: {
  title: ReactNode
  subtitle?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-start justify-between gap-3', className)}>
      <div>
        <h2 className="text-[16px] font-bold tracking-[-0.01em] text-ink">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-[12px] leading-relaxed text-ink-muted">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Badges                                                              */
/* ------------------------------------------------------------------ */

type BadgeTone = 'green' | 'red' | 'amber' | 'blue' | 'grey' | 'purple' | 'dark'

const badgeTones: Record<BadgeTone, string> = {
  green: 'bg-brand-tint text-brand-dark',
  red: 'bg-[#FDECEF] text-accent',
  amber: 'bg-[#FFF5E6] text-[#9A5B00]',
  blue: 'bg-[#EAF2FF] text-[#1D5FB8]',
  grey: 'bg-[#F0F2F0] text-ink-muted',
  purple: 'bg-[#F1EBFF] text-[#6236B4]',
  dark: 'bg-ink text-white',
}

export function Badge({
  tone = 'grey',
  children,
  className,
  dot,
}: {
  tone?: BadgeTone
  children: ReactNode
  className?: string
  dot?: boolean
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.035em]',
        badgeTones[tone],
        className,
      )}
    >
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  )
}

const statusKeyMap: Record<string, MessageKey> = {
  live: 'statusLive',
  upcoming: 'statusUpcoming',
  closed: 'statusClosed',
  void: 'statusVoid',
  cancelled: 'statusCancelled',
  active: 'statusActive',
  unspent: 'statusUnspent',
  won: 'statusWon',
  lost: 'statusLost',
  not_unique: 'statusNotUnique',
  refunded: 'statusRefunded',
  invalidated: 'statusInvalidated',
  pending: 'statusPending',
  success: 'statusSuccess',
  failed: 'statusFailed',
  timeout: 'statusTimeout',
  reversed: 'statusReversed',
  processed: 'statusProcessed',
  refund_pending: 'statusPending',
  verified: 'verifiedStatus',
  pending_verification: 'pendingStatus',
  delivered: 'deliveredStep',
  dispatched: 'dispatchedStep',
  none: 'awaiting',
}

const statusToneMap: Record<string, BadgeTone> = {
  live: 'green',
  upcoming: 'blue',
  closed: 'grey',
  void: 'red',
  cancelled: 'red',
  active: 'green',
  unspent: 'amber',
  won: 'green',
  lost: 'grey',
  not_unique: 'red',
  refunded: 'blue',
  invalidated: 'red',
  pending: 'amber',
  success: 'green',
  failed: 'red',
  timeout: 'amber',
  reversed: 'purple',
  processed: 'blue',
  verified: 'green',
  delivered: 'green',
  dispatched: 'blue',
  none: 'grey',
}

export function StatusBadge({
  status,
  language,
  dot = true,
  className,
}: {
  status: string
  language?: Language
  dot?: boolean
  className?: string
}) {
  const lang = language ?? 'en'
  const key = statusKeyMap[status]
  const label = key ? translate(lang, key) : status.replace(/_/g, ' ')
  return (
    <Badge tone={statusToneMap[status] ?? 'grey'} dot={dot} className={className}>
      {label}
    </Badge>
  )
}

/* ------------------------------------------------------------------ */
/* Progress                                                           */
/* ------------------------------------------------------------------ */

export function Progress({
  value,
  className,
  tone = 'green',
  height = 'h-2',
}: {
  value: number
  className?: string
  tone?: 'green' | 'red' | 'white'
  height?: string
}) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div
      className={cn('overflow-hidden rounded-full', tone === 'white' ? 'bg-white/25' : 'bg-[#E8EDE6]', height, className)}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn(
          'h-full rounded-full transition-[width] duration-700 ease-out',
          tone === 'green' ? 'bg-brand' : tone === 'red' ? 'bg-accent' : 'bg-white',
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Form fields                                                         */
/* ------------------------------------------------------------------ */

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
  className,
  required,
}: {
  label?: ReactNode
  hint?: ReactNode
  error?: ReactNode
  htmlFor?: string
  children: ReactNode
  className?: string
  required?: boolean
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label ? (
        <label htmlFor={htmlFor} className="flex items-center gap-1 text-[12px] font-semibold text-ink">
          {label}
          {required ? <span className="text-accent">*</span> : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="flex items-start gap-1 text-[11.5px] font-medium leading-snug text-accent">
          <AlertCircle className="mt-0.5 h-3 w-3 flex-none" aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <p className="text-[11px] leading-snug text-ink-muted">{hint}</p>
      ) : null}
    </div>
  )
}

export const inputClass =
  'h-11 w-full rounded-xl border border-line bg-white px-3.5 text-sm font-medium text-ink outline-none transition placeholder:text-ink-soft focus:border-brand focus:ring-4 focus:ring-brand/10 disabled:bg-[#F3F5F2] disabled:text-ink-muted'

export function Input({
  className,
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean }) {
  return <input className={cn(inputClass, error && 'border-accent focus:border-accent focus:ring-accent/10', className)} {...props} />
}

export function Textarea({
  className,
  error,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }) {
  return (
    <textarea
      className={cn(
        'min-h-[96px] w-full rounded-xl border border-line bg-white px-3.5 py-3 text-sm font-medium leading-relaxed text-ink outline-none transition placeholder:text-ink-soft focus:border-brand focus:ring-4 focus:ring-brand/10',
        error && 'border-accent focus:border-accent focus:ring-accent/10',
        className,
      )}
      {...props}
    />
  )
}

export function Select({
  className,
  error,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean }) {
  return (
    <div className="relative">
      <select
        className={cn(
          inputClass,
          'appearance-none pr-9',
          error && 'border-accent focus:border-accent focus:ring-accent/10',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
    </div>
  )
}

export function Checkbox({
  label,
  checked,
  onChange,
  error,
}: {
  label: ReactNode
  checked: boolean
  onChange: (checked: boolean) => void
  error?: string
}) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="flex cursor-pointer items-start gap-2.5 text-[12px] leading-relaxed text-ink-muted">
        <span
          className={cn(
            'mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-md border transition',
            checked ? 'border-brand bg-brand text-white' : 'border-[#CBD3C8] bg-white',
            error && !checked && 'border-accent',
          )}
        >
          {checked ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
        </span>
        <input
          id={id}
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span>{label}</span>
      </label>
      {error ? <p className="mt-1 text-[11px] font-medium text-accent">{error}</p> : null}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Tabs                                                               */
/* ------------------------------------------------------------------ */

export interface TabItem {
  value: string
  label: string
  count?: number
}

export function Tabs({
  items,
  value,
  onChange,
  variant = 'pills',
  className,
}: {
  items: TabItem[]
  value: string
  onChange: (value: string) => void
  variant?: 'pills' | 'underline'
  className?: string
}) {
  if (variant === 'underline') {
    return (
      <div className={cn('flex gap-5 border-b border-line', className)} role="tablist">
        {items.map((item) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={value === item.value}
            onClick={() => onChange(item.value)}
            className={cn(
              'focus-ring relative flex items-center gap-2 pb-3 text-[13px] font-semibold transition',
              value === item.value ? 'text-brand-dark' : 'text-ink-muted hover:text-ink',
            )}
          >
            {item.label}
            {typeof item.count === 'number' ? (
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                  value === item.value ? 'bg-brand-tint text-brand-dark' : 'bg-page text-ink-muted',
                )}
              >
                {item.count}
              </span>
            ) : null}
            {value === item.value ? (
              <span className="absolute -bottom-px left-0 right-0 h-0.5 rounded-full bg-brand" />
            ) : null}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div
      className={cn('flex gap-1 rounded-full border border-line bg-white p-1', className)}
      role="tablist"
    >
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          role="tab"
          aria-selected={value === item.value}
          onClick={() => onChange(item.value)}
          className={cn(
            'focus-ring flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-[12px] font-bold transition',
            value === item.value
              ? 'bg-brand text-white shadow-sm'
              : 'text-ink-muted hover:bg-brand-soft hover:text-brand-dark',
          )}
        >
          {item.label}
          {typeof item.count === 'number' ? (
            <span
              className={cn(
                'rounded-full px-1.5 text-[10px]',
                value === item.value ? 'bg-white/25 text-white' : 'bg-page text-ink-muted',
              )}
            >
              {item.count}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Empty state / spinner                                               */
/* ------------------------------------------------------------------ */

export function EmptyState({
  icon,
  title,
  body,
  action,
  className,
}: {
  icon?: ReactNode
  title: string
  body?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center rounded-2xl border border-dashed border-[#D8DFD5] bg-white/60 px-6 py-10 text-center', className)}>
      {icon ? (
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-tint text-brand-dark">
          {icon}
        </div>
      ) : null}
      <h3 className="text-sm font-bold text-ink">{title}</h3>
      {body ? <p className="mt-1 max-w-[260px] text-[12px] leading-relaxed text-ink-muted">{body}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-5 w-5 animate-spin text-brand', className)} aria-label="Loading" />
}

/* ------------------------------------------------------------------ */
/* Modal (admin)                                                      */
/* ------------------------------------------------------------------ */

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = 'max-w-lg',
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  width?: string
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px] animate-fade-in"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : 'Dialog'}
        className={cn('w-full overflow-hidden rounded-2xl bg-white shadow-float animate-pop', width)}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-ink">{title}</h2>
            {description ? <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="focus-ring -mr-1 -mt-1 flex h-8 w-8 items-center justify-center rounded-full text-ink-muted hover:bg-page hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children ? <div className="max-h-[65vh] overflow-y-auto px-5 py-4 thin-scroll">{children}</div> : null}
        {footer ? <div className="flex justify-end gap-2 border-t border-line bg-[#FAFBF9] px-5 py-3">{footer}</div> : null}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Bottom sheet (inside the phone)                                     */
/* ------------------------------------------------------------------ */

export function BottomSheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  hideClose,
  className,
}: {
  open: boolean
  onClose: () => void
  title?: ReactNode
  subtitle?: ReactNode
  children: ReactNode
  footer?: ReactNode
  hideClose?: boolean
  className?: string
}) {
  if (!open) return null
  return (
    <div className="absolute inset-0 z-[100] flex flex-col justify-end animate-fade-in">
      <button
        type="button"
        aria-label="Close sheet"
        className="absolute inset-0 bg-[#0B1A10]/50 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : 'Sheet'}
        className={cn(
          'relative max-h-[92%] rounded-t-[28px] bg-white shadow-[0_-20px_60px_rgba(0,0,0,0.18)] animate-slide-up',
          className,
        )}
      >
        <div className="flex justify-center pt-2.5">
          <span className="h-1 w-10 rounded-full bg-[#D7DDD4]" />
        </div>
        {title || !hideClose ? (
          <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-2.5">
            <div>
              {title ? <h2 className="text-[17px] font-bold text-ink">{title}</h2> : null}
              {subtitle ? <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-muted">{subtitle}</p> : null}
            </div>
            {!hideClose ? (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="focus-ring -mr-1 flex h-8 w-8 flex-none items-center justify-center rounded-full bg-page text-ink-muted hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        ) : null}
        <div className="flex-1 overflow-y-auto px-5 pb-3 thin-scroll">{children}</div>
        {footer ? <div className="border-t border-line bg-white px-5 py-3 safe-bottom min-h-[72px]">{footer}</div> : null}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Copy button                                                         */
/* ------------------------------------------------------------------ */

export function CopyButton({
  value,
  label = 'Copy',
  className,
  language = 'en',
}: {
  value: string
  label?: string
  className?: string
  language?: Language
}) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value)
          setCopied(true)
          setTimeout(() => setCopied(false), 1600)
        } catch {
          setCopied(false)
        }
      }}
      className={cn(
        'focus-ring inline-flex items-center gap-1 rounded-full border border-line bg-white px-2.5 py-1 text-[10px] font-semibold text-ink-muted transition hover:border-brand/40 hover:text-brand-dark',
        className,
      )}
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? translate(language, 'copied') : label}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/* Alert                                                              */
/* ------------------------------------------------------------------ */

export function AlertBox({
  tone = 'info',
  title,
  children,
  className,
}: {
  tone?: 'info' | 'success' | 'warning' | 'danger'
  title?: ReactNode
  children?: ReactNode
  className?: string
}) {
  const styles = {
    info: 'bg-[#EFF6FF] text-[#1D4F91] border-[#D6E6FF]',
    success: 'bg-brand-tint text-brand-dark border-[#D7EDCF]',
    warning: 'bg-[#FFF7E8] text-[#8A5200] border-[#F6E2B8]',
    danger: 'bg-[#FDECEF] text-[#A50020] border-[#F8D2D9]',
  }[tone]
  const Icon = tone === 'success' ? CheckCircle2 : tone === 'warning' ? TriangleAlert : tone === 'danger' ? AlertCircle : Info
  return (
    <div className={cn('flex items-start gap-2.5 rounded-xl border px-3.5 py-3', styles, className)}>
      <Icon className="mt-0.5 h-4 w-4 flex-none" />
      <div className="text-[12px] leading-relaxed">
        {title ? <p className="font-bold">{title}</p> : null}
        {children ? <div className={title ? 'mt-0.5 opacity-90' : ''}>{children}</div> : null}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Keyboard keycap                                                     */
/* ------------------------------------------------------------------ */

export function KeyCap({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-[#CFD6CC] border-b-2 bg-white px-1.5 font-mono text-[10px] font-semibold text-ink-muted">
      {children}
    </span>
  )
}

import type { LucideIcon } from 'lucide-react'
import { Download } from 'lucide-react'
import type { ReactNode } from 'react'
import { downloadCSV } from '../../lib/csv'
import { Button, Card, cn } from '../../components/ui'

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
      <div>
        {eyebrow ? (
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-brand-dark">{eyebrow}</p>
        ) : null}
        <h1 className="mt-1 text-[26px] font-black leading-tight tracking-[-0.04em] text-ink">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-[12.5px] leading-relaxed text-ink-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}

export function AdminStat({
  label,
  value,
  sub,
  icon: Icon,
  tone = 'green',
  trend,
  className,
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  icon: LucideIcon
  tone?: 'green' | 'blue' | 'amber' | 'red' | 'dark' | 'purple'
  trend?: ReactNode
  className?: string
}) {
  const tones = {
    green: 'bg-brand-tint text-brand-dark',
    blue: 'bg-[#EAF2FF] text-[#1D5FB8]',
    amber: 'bg-[#FFF5E6] text-[#9A5B00]',
    red: 'bg-[#FDECEF] text-accent',
    dark: 'bg-ink text-white',
    purple: 'bg-[#F1EBFF] text-[#6236B4]',
  }[tone]
  return (
    <Card className={cn('p-4', className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-muted">{label}</p>
        <span className={cn('flex h-8 w-8 flex-none items-center justify-center rounded-xl', tones)}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-2 text-[25px] font-black leading-none tracking-[-0.045em] text-ink amount-tabular">{value}</p>
      <div className="mt-1.5 flex items-center gap-2 text-[10.5px] text-ink-muted">
        {trend ? <span className="font-bold text-brand-dark">{trend}</span> : null}
        {sub ? <span className="min-w-0">{sub}</span> : null}
      </div>
    </Card>
  )
}

export function AdminCard({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode
  description?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      {title || action ? (
        <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
          <div>
            <h2 className="text-[13px] font-bold tracking-[-0.01em] text-ink">{title}</h2>
            {description ? <p className="mt-0.5 text-[11px] leading-snug text-ink-muted">{description}</p> : null}
          </div>
          {action}
        </div>
      ) : null}
      <div className={bodyClassName}>{children}</div>
    </Card>
  )
}

export function AdminTableWrap({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('overflow-x-auto thin-scroll', className)}>{children}</div>
}

export function DataTable({ children, className }: { children: ReactNode; className?: string }) {
  return <table className={cn('w-full min-w-[640px] border-collapse text-left text-[12px]', className)}>{children}</table>
}

export function Th({ children, className, align }: { children?: ReactNode; className?: string; align?: 'left' | 'right' | 'center' }) {
  return (
    <th
      className={cn(
        'border-b border-line bg-[#FAFBF9] px-3 py-2.5 text-[9.5px] font-extrabold uppercase tracking-[0.08em] text-ink-muted',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
    >
      {children}
    </th>
  )
}

export function Td({ children, className, align }: { children?: ReactNode; className?: string; align?: 'left' | 'right' | 'center' }) {
  return (
    <td
      className={cn(
        'border-b border-line/70 px-3 py-2.5 align-middle text-ink',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
    >
      {children}
    </td>
  )
}

export function EmptyTableRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-12 text-center text-[12px] text-ink-muted">
        {children}
      </td>
    </tr>
  )
}

export function ExportButton({
  filename,
  rows,
  label = 'Export CSV',
  size = 'sm',
  variant = 'secondary',
}: {
  filename: string
  rows: Array<Record<string, string | number | boolean | null | undefined>>
  label?: string
  size?: 'sm' | 'md'
  variant?: 'primary' | 'secondary' | 'ghost'
}) {
  return (
    <Button
      size={size}
      variant={variant}
      leftIcon={<Download className="h-3.5 w-3.5" />}
      onClick={() => downloadCSV(filename, rows)}
    >
      {label}
    </Button>
  )
}

export function StatBar({ label, value, max, tone = 'green' }: { label: string; value: number; max: number; tone?: 'green' | 'red' | 'blue' }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  const color = tone === 'red' ? 'bg-accent' : tone === 'blue' ? 'bg-[#1D5FB8]' : 'bg-brand'
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[10px] text-ink-muted">
        <span className="font-semibold text-ink">{label}</span>
        <span className="amount-tabular">
          {value.toLocaleString()} / {max.toLocaleString()}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[#E8EDE6]">
        <div className={cn('h-full rounded-full', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

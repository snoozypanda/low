export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function formatETB(value: number, decimals = 0): string {
  return `ETB ${formatNumber(value, decimals)}`
}

export function formatBid(value: number): string {
  return value.toFixed(2)
}

export function formatPercent(value: number, decimals = 0): string {
  return `${formatNumber(value, decimals)}%`
}

export function formatDateTime(iso: string, language: 'en' | 'am' = 'en'): string {
  try {
    return new Intl.DateTimeFormat(language === 'am' ? 'am-ET' : 'en-GB', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

export function formatDate(iso: string, language: 'en' | 'am' = 'en'): string {
  try {
    return new Intl.DateTimeFormat(language === 'am' ? 'am-ET' : 'en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

export function formatTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

export function formatPhoneDisplay(phone: string): string {
  let digits = phone.replace(/\D/g, '')
  if (digits.startsWith('2519')) digits = `2517${digits.slice(4)}`
  else if (digits.startsWith('09')) digits = `07${digits.slice(2)}`
  else if (digits.startsWith('9') && digits.length === 9) digits = `7${digits.slice(1)}`

  const local = digits.startsWith('251')
    ? `0${digits.slice(3)}`
    : digits.startsWith('0')
      ? digits
      : `0${digits}`
  if (local.length < 10) return phone
  return `${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5, 8)} ${local.slice(8)}`
}

export function timeAgo(iso: string, now = Date.now()): string {
  const diff = Math.max(0, now - new Date(iso).getTime())
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return `${Math.floor(days / 7)}w ago`
}

export function toLocalInputValue(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function fromLocalInputValue(value: string): string {
  return new Date(value).toISOString()
}

export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'auction'
  )
}

export function countdownParts(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const days = Math.floor(total / 86400)
  const hours = Math.floor((total % 86400) / 3600)
  const mins = Math.floor((total % 3600) / 60)
  const secs = total % 60
  return { days, hours, mins, secs, total }
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

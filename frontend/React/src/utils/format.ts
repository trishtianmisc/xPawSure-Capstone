export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '—'
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('63') && digits.length === 12) {
    return `0${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 12)}`
  }
  if (digits.startsWith('0') && digits.length === 11) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 11)}`
  }
  return phone
}

export function normalizePhoneInput(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('0') && digits.length <= 11) {
    return digits
  }
  if (digits.startsWith('63') && digits.length <= 12) {
    return '0' + digits.slice(2)
  }
  if (digits.startsWith('9') && digits.length <= 10) {
    return '0' + digits
  }
  return digits
}

function toDate(value: string | Date | null | undefined): Date | null {
  if (value == null || value === '') return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDate(value: string | Date | null | undefined): string {
  const date = toDate(value)
  if (!date) return '—'
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatDateLong(value: string | Date | null | undefined): string {
  const date = toDate(value)
  if (!date) return '—'
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatTime(value: string | Date | null | undefined): string {
  const date = toDate(value)
  if (!date) return '—'
  if (date.getHours() === 0 && date.getMinutes() === 0) return ''
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export function formatDateTime(value: string | Date | null | undefined): string {
  const date = toDate(value)
  if (!date) return '—'
  const time = formatTime(date)
  return time ? `${formatDate(date)} · ${time}` : formatDate(date)
}

export function formatRelativeTime(iso: string): string {
  const timestamp = new Date(iso)
  if (Number.isNaN(timestamp.getTime())) return iso

  const diffMs = timestamp.getTime() - Date.now()
  const absMs = Math.abs(diffMs)
  const minuteMs = 60_000
  const hourMs = 3_600_000
  const dayMs = 86_400_000
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

  if (absMs < minuteMs) return rtf.format(Math.round(diffMs / 1000), 'second')
  if (absMs < hourMs) return rtf.format(Math.round(diffMs / minuteMs), 'minute')
  if (absMs < dayMs) return rtf.format(Math.round(diffMs / hourMs), 'hour')
  if (absMs < dayMs * 7) return rtf.format(Math.round(diffMs / dayMs), 'day')

  return timestamp.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(timestamp.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {}),
  })
}

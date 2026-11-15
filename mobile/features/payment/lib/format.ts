import { formatDateTime as formatManilaDateTime } from '../../../src/utils/datetime'

/** Formats an amount for display; the value itself always comes from the API. */
export function formatMoney(amount: number, currency: string): string {
  return `${currency === 'PHP' ? '₱' : ''}${Number(amount).toFixed(2)}`
}

export function formatDateTime(iso: string): string {
  return formatManilaDateTime(iso, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

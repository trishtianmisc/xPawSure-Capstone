// Single shared peso formatter. Every money figure the clinic admin sees
// (dashboard card, reports KPI, CSV export) goes through this one function
// so the amount always renders the same way.
const PESO = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
})

/** Formats an amount (number or fixed-decimal string from the API) in PHP. */
export function formatPeso(amount: number | string): string {
  return PESO.format(Number(amount))
}

/**
 * Compact peso label for chart axes: ₱0, ₱500, ₱1.2k, ₱5k. One decimal at
 * most, trailing .0 trimmed, so a small clinic's axis stays readable.
 */
export function formatPesoCompact(amount: number | string): string {
  const value = Number(amount)
  const sign = value < 0 ? '-' : ''
  const abs = Math.abs(value)
  if (abs < 1000) return `${sign}₱${Math.round(abs)}`
  const thousands = Math.round((abs / 1000) * 10) / 10
  const text = Number.isInteger(thousands)
    ? thousands.toFixed(0)
    : thousands.toFixed(1)
  return `${sign}₱${text}k`
}

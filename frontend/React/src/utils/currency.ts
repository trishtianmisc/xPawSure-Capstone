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

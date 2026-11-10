import type {
  Payment,
  PaymentListResponse,
} from '../../../payments/types/payment.types'
import { paymentService } from '../../../payments/services/payment.service'
import { downloadCsv, toCsv } from '../../reports/utils/exportCsv'

// Hard ceilings from the export plan: 50 pages x 100 (the API's page-size
// cap) = 5,000 rows, and a 366-day paid window mirroring the reports cap.
export const MAX_EXPORT_ROWS = 5000
export const MAX_EXPORT_PAGES = 50
export const MAX_EXPORT_RANGE_DAYS = 366

const PAGE_SIZE = 100

export const TOO_MANY_MESSAGE =
  'Too many payments; narrow the date range.'

export class PaymentsExportError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PaymentsExportError'
  }
}

export interface PaymentsCsvFilters {
  reference?: string
  status?: string
  method?: string
  paid_from?: string
  paid_to?: string
}

export interface PaymentsCsvInput {
  /** Snapshot of the filters taken when Export was clicked. */
  filters: PaymentsCsvFilters
  clinicName: string
  timeZone: string
}

export interface PaymentsCsvResult {
  csv: string
  rowCount: number
  /** Server-computed PAID total for the filters, as a fixed 2-decimal string. */
  totalPaid: string
}

function parseDay(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
  // Rejects impossible dates such as 2026-02-31.
  if (
    date.getUTCFullYear() !== Number(match[1]) ||
    date.getUTCMonth() !== Number(match[2]) - 1 ||
    date.getUTCDate() !== Number(match[3])
  ) {
    return null
  }
  return date
}

/** Client-side mirror of the API's paid-range rules; null when acceptable. */
export function paidRangeError(paidFrom: string, paidTo: string): string | null {
  const from = paidFrom ? parseDay(paidFrom) : null
  const to = paidTo ? parseDay(paidTo) : null
  if (paidFrom && !from) return `Invalid date '${paidFrom}'; expected YYYY-MM-DD.`
  if (paidTo && !to) return `Invalid date '${paidTo}'; expected YYYY-MM-DD.`
  if (from && to && from > to) return 'paid_from cannot be after paid_to.'
  if (from && to) {
    const days = Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1
    if (days > MAX_EXPORT_RANGE_DAYS) {
      return `Paid date range cannot exceed ${MAX_EXPORT_RANGE_DAYS} days.`
    }
  }
  return null
}

/**
 * `2026-10-31 14:05` in the clinic's time zone - plain text, no ISO-Z and no
 * locale surprise, so the column sorts and reads the same everywhere.
 */
export function formatCsvDateTime(
  value: string | null | undefined,
  timeZone: string,
): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((p) => p.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')} ${part('hour')}:${part('minute')}`
}

export function paymentsExportFilename(
  filters: PaymentsCsvFilters,
  generatedAt: Date,
  timeZone: string,
): string {
  if (filters.paid_from || filters.paid_to) {
    return `xpawsure-payments_${filters.paid_from ?? 'open'}_${filters.paid_to ?? 'open'}.csv`
  }
  const day = formatCsvDateTime(generatedAt.toISOString(), timeZone).slice(0, 10)
  return `xpawsure-payments_${day}.csv`
}

/**
 * Reads every payment matching `filters` through the list API and builds the
 * whole CSV in memory. Any page failure, an over-cap total, or a shortfall
 * after paging throws - the caller only downloads when this resolves, so a
 * failed export never leaves a partial file behind.
 */
export async function buildPaymentsCsv(
  input: PaymentsCsvInput,
): Promise<PaymentsCsvResult> {
  const rangeError = paidRangeError(
    input.filters.paid_from ?? '',
    input.filters.paid_to ?? '',
  )
  if (rangeError) throw new PaymentsExportError(rangeError)

  // Dedupe by pay_id: newest-first paging shifts rows between page requests,
  // so a payment can legitimately appear on two pages.
  const collected = new Map<string, Payment>()
  let total = 0
  let summary: PaymentListResponse['summary'] | null = null

  for (let page = 1; page <= MAX_EXPORT_PAGES; page += 1) {
    // No catch here: axios errors propagate so the page can render the API's
    // own message, and nothing is downloaded either way.
    const response: PaymentListResponse = await paymentService.list({
      ...input.filters,
      page,
      page_size: PAGE_SIZE,
    })
    summary = summary ?? response.summary
    total = response.total
    if (total > MAX_EXPORT_ROWS) {
      throw new PaymentsExportError(TOO_MANY_MESSAGE)
    }
    for (const payment of response.results) {
      collected.set(payment.pay_id, payment)
    }
    if (collected.size >= total || response.results.length === 0) break
  }

  if (summary === null) {
    throw new PaymentsExportError('Export was interrupted; no file was downloaded.')
  }
  if (collected.size < total) {
    // Hit the page cap or rows kept shifting; the file would be incomplete.
    throw new PaymentsExportError(
      collected.size >= MAX_EXPORT_ROWS
        ? TOO_MANY_MESSAGE
        : 'Export was interrupted; no file was downloaded.',
    )
  }

  const payments = [...collected.values()].sort(
    (a, b) =>
      b.created_at.localeCompare(a.created_at) ||
      a.reference_no.localeCompare(b.reference_no),
  )

  const rows: Array<Array<string | number>> = [
    ['XpawSure - Payments'],
    ['Clinic', input.clinicName],
    ['Reference', input.filters.reference ?? 'All'],
    ['Status', input.filters.status ?? 'All'],
    ['Method', input.filters.method ?? 'All'],
    ['Paid from', input.filters.paid_from ?? ''],
    ['Paid to', input.filters.paid_to ?? ''],
    ['Generated', formatCsvDateTime(new Date().toISOString(), input.timeZone)],
    [],
    ['Receipt', 'Pet', 'Owner', 'Method', 'Amount', 'Status', 'Paid', 'Created'],
  ]

  for (const payment of payments) {
    rows.push([
      payment.reference_no,
      payment.pet_name ?? '',
      payment.owner_name ?? '',
      payment.method,
      Number(payment.amount).toFixed(2),
      payment.status,
      formatCsvDateTime(payment.paid_at, input.timeZone),
      formatCsvDateTime(payment.created_at, input.timeZone),
    ])
  }

  // The server summary covers every matching row with decimal-exact sums -
  // the same figures the on-screen strip shows, so the file reconciles.
  rows.push(
    [],
    ['Total paid', summary.paid_total],
    ['Pending total', summary.pending_total],
    ['Refunded total', summary.refunded_total],
    ['Payments', summary.payment_count],
  )

  return {
    csv: toCsv(rows),
    rowCount: payments.length,
    totalPaid: summary.paid_total,
  }
}

/** Builds the CSV, then downloads it - only after a fully successful read. */
export async function exportPaymentsCsv(
  input: PaymentsCsvInput,
): Promise<PaymentsCsvResult> {
  const result = await buildPaymentsCsv(input)
  downloadCsv(
    paymentsExportFilename(input.filters, new Date(), input.timeZone),
    result.csv,
  )
  return result
}

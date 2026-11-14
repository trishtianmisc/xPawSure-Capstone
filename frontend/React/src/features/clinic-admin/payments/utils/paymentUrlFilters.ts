// URL search params the payments page reads on mount. Values are validated
// here so a crafted link (?paid_from=banana&status=HACKED) can never put the
// page into a state the API or the status select would reject: invalid input
// falls back to the page's default (empty = unfiltered).

const PAID_DATE = /^\d{4}-\d{2}-\d{2}$/

// Mirrors STATUS_FILTERS in ClinicAdminPaymentsPage. '' is the default
// "All statuses" option and is a valid (absent) value.
const ALLOWED_STATUSES = new Set([
  '',
  'PENDING',
  'PAID',
  'FAILED',
  'EXPIRED',
  'REFUNDED',
  'VOID',
])

/** YYYY-MM-DD that also exists on the calendar; anything else is ''. */
function validDate(value: string | null): string {
  if (!value || !PAID_DATE.test(value)) return ''
  const [year, month, day] = value.split('-').map(Number)
  const parsed = new Date(year, month - 1, day)
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return ''
  }
  return value
}

export interface PaymentsUrlFilters {
  paid_from: string
  paid_to: string
  status: string
}

export function parsePaymentsUrlFilters(
  params: URLSearchParams,
): PaymentsUrlFilters {
  const rawStatus = params.get('status') ?? ''
  return {
    paid_from: validDate(params.get('paid_from')),
    paid_to: validDate(params.get('paid_to')),
    status: ALLOWED_STATUSES.has(rawStatus) ? rawStatus : '',
  }
}

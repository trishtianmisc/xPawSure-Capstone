import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { Button, Card } from '../../../../components/ui'
import { useToast } from '../../../../components/ui/ToastContext'
import { useAuth } from '../../../auth/context/AuthContext'
import { useDebounce } from '../../../../hooks/useDebounce'
import { apiErrorMessage } from '../../../../utils/error'
import { formatPeso } from '../../../../utils/currency'
import {
  CLINIC_TIME_ZONE,
  formatDateTime,
} from '../../../../utils/format'
import { useClinicSettings } from '../../../clinic-profile/hooks/useClinicSettings'
import { PageHero } from '../../../receptionist/components/PageHero'
import { PaymentStatusBadge } from '../../../payments/components/PaymentStatusBadge'
import { usePayments } from '../../../payments/hooks/usePayments'
import {
  PaymentsExportError,
  exportPaymentsCsv,
  paidRangeError,
  type PaymentsCsvFilters,
} from '../utils/exportPaymentsCsv'
import { parsePaymentsUrlFilters } from '../utils/paymentUrlFilters'

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'PENDING', label: 'Awaiting payment' },
  { value: 'PAID', label: 'Paid' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'REFUNDED', label: 'Refunded' },
  { value: 'VOID', label: 'Cancelled' },
]

const METHOD_FILTERS: Array<{ value: string; label: string }> = [
  { value: '', label: 'All methods' },
  { value: 'GCASH', label: 'GCash' },
  { value: 'CARD', label: 'Card' },
  { value: 'CASH', label: 'Cash' },
]

const INPUT_CLASSES =
  'rounded-md border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-amber-500 dark:focus:ring-amber-900/40'

const FIELD_LABEL_CLASSES =
  'flex flex-col gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400'

const TH_CLASSES =
  'px-5 py-3.5 text-xs font-semibold uppercase tracking-wide'

const ICONS = {
  paid: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
  pending: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  refunded: 'M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6',
  count:
    'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
  download: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4',
  chevron: 'M9 5l7 7-7 7',
} as const

type IconName = keyof typeof ICONS

function Icon({ name, className = 'size-5' }: { name: IconName; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      viewBox="0 0 24 24"
    >
      <path d={ICONS[name]} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const TILE_TONES = {
  emerald: {
    container: 'bg-emerald-100/80 dark:bg-emerald-900/25',
    icon: 'bg-white/70 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  amber: {
    container: 'bg-amber-100/80 dark:bg-amber-900/25',
    icon: 'bg-white/70 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  },
  rose: {
    container: 'bg-rose-100/80 dark:bg-rose-900/25',
    icon: 'bg-white/70 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  },
  stone: {
    container: 'bg-stone-200/70 dark:bg-stone-800',
    icon: 'bg-white/70 text-stone-600 dark:bg-stone-700 dark:text-stone-200',
  },
} as const

function StatTile({
  label,
  value,
  icon,
  tone,
}: {
  label: string
  value: string
  icon: IconName
  tone: keyof typeof TILE_TONES
}) {
  const styles = TILE_TONES[tone]
  return (
    <div className={`rounded-3xl p-5 ${styles.container}`}>
      <div className="flex items-center gap-4">
        <div
          className={`grid size-11 shrink-0 place-items-center rounded-xl ${styles.icon}`}
        >
          <Icon name={icon} className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
            {label}
          </p>
          <p className="mt-1 truncate text-2xl font-bold leading-none tabular-nums text-stone-900 dark:text-stone-50">
            {value}
          </p>
        </div>
      </div>
    </div>
  )
}
export function ClinicAdminPaymentsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useToast()
  const settings = useClinicSettings()
  // Deep links (e.g. from Reports & Analytics) pre-filter the list; values
  // are validated on the way in so a crafted URL can never reach the API,
  // and changes are written back with replace so filter tweaks never stack
  // up history entries.
  const [searchParams, setSearchParams] = useSearchParams()
  const [urlFilters] = useState(() => parsePaymentsUrlFilters(searchParams))

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState(urlFilters.status)
  const [method, setMethod] = useState('')
  const [paidFrom, setPaidFrom] = useState(urlFilters.paid_from)
  const [paidTo, setPaidTo] = useState(urlFilters.paid_to)
  const [page, setPage] = useState(1)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  const debouncedSearch = useDebounce(search, 300)
  const displayTimeZone = settings.data?.timezone ?? CLINIC_TIME_ZONE

  const params = useMemo(
    () => ({
      reference: debouncedSearch || undefined,
      status: status || undefined,
      method: method || undefined,
      paid_from: paidFrom || undefined,
      paid_to: paidTo || undefined,
      page,
      page_size: 20,
    }),
    [debouncedSearch, status, method, paidFrom, paidTo, page],
  )

  const { data, isLoading, error, refetch, isFetching } = usePayments(params)

  const startItem = data ? (data.page - 1) * data.page_size + 1 : 0
  const endItem = data ? Math.min(data.page * data.page_size, data.total) : 0
  const hasActiveFilters = Boolean(
    search || status || method || paidFrom || paidTo,
  )

  function changeFilter(
    setter: (value: string) => void,
    urlKey?: 'status' | 'paid_from' | 'paid_to',
  ) {
    return (value: string) => {
      setter(value)
      setPage(1)
      setExportError(null)
      if (urlKey) syncParams({ [urlKey]: value })
    }
  }

  function syncParams(patch: {
    status?: string
    paid_from?: string
    paid_to?: string
  }) {
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous)
        for (const [key, value] of Object.entries(patch)) {
          if (value) next.set(key, value)
          else next.delete(key)
        }
        return next
      },
      { replace: true },
    )
  }

  function clearFilters() {
    setSearch('')
    setStatus('')
    setMethod('')
    setPaidFrom('')
    setPaidTo('')
    setPage(1)
    setExportError(null)
    setSearchParams({}, { replace: true })
  }

  async function handleExport() {
    const guard = paidRangeError(paidFrom, paidTo)
    if (guard) {
      setExportError(guard)
      return
    }
    // Snapshot the filters exactly as the table shows them, so every page of
    // the export reads the same window the user is looking at.
    const filters: PaymentsCsvFilters = {
      reference: debouncedSearch || undefined,
      status: status || undefined,
      method: method || undefined,
      paid_from: paidFrom || undefined,
      paid_to: paidTo || undefined,
    }
    setExportError(null)
    setExporting(true)
    try {
      const result = await exportPaymentsCsv({
        filters,
        clinicName: user?.clinic_name ?? 'Clinic',
        timeZone: displayTimeZone,
      })
      showToast(`Exported ${result.rowCount} payments.`, 'success')
    } catch (err) {
      setExportError(
        err instanceof PaymentsExportError
          ? err.message
          : apiErrorMessage(err),
      )
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-6">
      <PageHero
        title="Payments"
        subtitle="Consultation fees collected at your clinic."
      />

      {/* Totals for EVERY matching payment (server-side), not just this page. */}
      {(isLoading || data) && (
        <section aria-label="Payment totals">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              icon="paid"
              label="Paid"
              tone="emerald"
              value={data ? formatPeso(data.summary.paid_total) : '—'}
            />
            <StatTile
              icon="pending"
              label="Pending"
              tone="amber"
              value={data ? formatPeso(data.summary.pending_total) : '—'}
            />
            <StatTile
              icon="refunded"
              label="Refunded"
              tone="rose"
              value={data ? formatPeso(data.summary.refunded_total) : '—'}
            />
            <StatTile
              icon="count"
              label="Payments"
              tone="stone"
              value={data ? String(data.summary.payment_count) : '—'}
            />
          </div>
          {/* <p className="mt-2 px-1 text-xs text-stone-500 dark:text-stone-400">
            Totals cover every matching payment, not just this page. Paid uses
            the same payment-date rules as the Reports revenue KPI, so the two
            figures reconcile for the same range.
          </p> */}
        </section>
      )}

      <Card padding="md">
        <div className="flex flex-col gap-5">
          {/* Row 1: search + dropdowns */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-64 flex-1">
              <input
                aria-label="Search payments"
                className={`${INPUT_CLASSES} w-full pl-10`}
                onChange={(event) => changeFilter(setSearch)(event.target.value)}
                placeholder="Search"
                type="search"
                value={search}
              />
              <svg
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400 dark:text-stone-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
            </div>

            <select
              aria-label="Filter by status"
              className={INPUT_CLASSES}
              onChange={(event) => changeFilter(setStatus, 'status')(event.target.value)}
              value={status}
            >
              {STATUS_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter by method"
              className={INPUT_CLASSES}
              onChange={(event) => changeFilter(setMethod)(event.target.value)}
              value={method}
            >
              {METHOD_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Row 2: date range on the left, export on the right */}
          <div className="flex flex-wrap items-end gap-4 border-t border-stone-100 pt-3 dark:border-stone-700">
            <label className={FIELD_LABEL_CLASSES}>
              Paid from
              <input
                aria-label="Paid from"
                className={`${INPUT_CLASSES} w-44 normal-case tracking-normal`}
                max={paidTo || undefined}
                onChange={(event) =>
                  changeFilter(setPaidFrom, 'paid_from')(event.target.value)
                }
                type="date"
                value={paidFrom}
              />
            </label>

            <label className={FIELD_LABEL_CLASSES}>
              Paid to
              <input
                aria-label="Paid to"
                className={`${INPUT_CLASSES} w-44 normal-case tracking-normal`}
                min={paidFrom || undefined}
                onChange={(event) =>
                  changeFilter(setPaidTo, 'paid_to')(event.target.value)
                }
                type="date"
                value={paidTo}
              />
            </label>

            <div className="flex min-h-[42px] items-center gap-3">
              {hasActiveFilters && (
                <Button onClick={clearFilters} size="sm" type="button" variant="ghost">
                  Clear filters
                </Button>
              )}

              {isFetching && !isLoading && (
                <span className="text-xs font-medium text-stone-400 dark:text-stone-500">
                  Refreshing...
                </span>
              )}
            </div>

            <div className="ml-auto">
              <Button
                disabled={exporting || isLoading}
                loading={exporting}
                onClick={() => {
                  void handleExport()
                }}
                type="button"
                className="shrink-0 rounded-md bg-amber-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-800"
              >
                <span className="flex items-center gap-2">
                  <Icon name="download" className="size-4" />
                  Export CSV
                </span>
              </Button>
            </div>
          </div>
        </div>

        <p className="mt-5 text-xs text-stone-400 dark:text-stone-300">
          Date paid filters on the payment date in clinic time and lists paid
          payments only. Export downloads every matching payment, not just this
          page.
        </p>

        {exportError && (
          <p
            className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400"
            role="alert"
          >
            {exportError}
          </p>
        )}
      </Card>

      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-700 dark:bg-stone-800">
        {isLoading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                className="h-12 animate-pulse rounded-md bg-stone-100 dark:bg-stone-700"
                key={index}
              />
            ))}
          </div>
        ) : error && !data ? (
          <div className="py-16 text-center">
            <h2 className="text-lg font-semibold text-stone-700 dark:text-stone-300">
              Failed to load payments
            </h2>
            <p className="mt-1 text-sm text-stone-400 dark:text-stone-500">
              {apiErrorMessage(error)}
            </p>
            <Button
              className="mt-4"
              loading={isFetching}
              onClick={() => refetch()}
              size="sm"
              type="button"
              variant="secondary"
            >
              Try again
            </Button>
          </div>
        ) : data && data.results.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50 text-stone-500 dark:border-stone-700 dark:bg-stone-900/50 dark:text-stone-400">
                    <th className={TH_CLASSES}>Receipt</th>
                    <th className={TH_CLASSES}>Patient</th>
                    <th className={TH_CLASSES}>Owner</th>
                    <th className={TH_CLASSES}>Method</th>
                    <th className={TH_CLASSES}>Amount</th>
                    <th className={TH_CLASSES}>Status</th>
                    <th className={TH_CLASSES}>Paid</th>
                    <th className={TH_CLASSES}>Created</th>
                    <th className="w-8 px-2 py-3.5">
                      <span className="sr-only">Open</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-700">
                  {data.results.map((payment) => (
                    <tr
                      className={`group transition hover:bg-amber-50/50 dark:hover:bg-amber-900/10 ${payment.appointment_id
                        ? 'cursor-pointer'
                        : ''
                        }`}
                      key={payment.pay_id}
                      onClick={() =>
                        payment.appointment_id &&
                        navigate(`/clinic/appointments/${payment.appointment_id}`)
                      }
                    >
                      <td className="whitespace-nowrap px-5 py-4 font-mono text-xs font-semibold text-stone-700 dark:text-stone-200">
                        {payment.reference_no}
                      </td>
                      <td className="px-5 py-4 font-medium text-stone-900 dark:text-stone-100">
                        {payment.pet_name ?? '—'}
                      </td>
                      <td className="px-5 py-4 text-stone-600 dark:text-stone-300">
                        {payment.owner_name ?? '—'}
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-block rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-700 dark:bg-stone-700 dark:text-stone-200">
                          {payment.method}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 font-semibold tabular-nums text-stone-900 dark:text-stone-50">
                        {formatPeso(payment.amount)}
                      </td>
                      <td className="px-5 py-4">
                        <PaymentStatusBadge status={payment.status} />
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-stone-600 dark:text-stone-300">
                        {payment.paid_at
                          ? formatDateTime(payment.paid_at, displayTimeZone)
                          : '—'}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-stone-500 dark:text-stone-400">
                        {formatDateTime(payment.created_at, displayTimeZone)}
                      </td>
                      <td className="px-2 py-4 text-stone-300 dark:text-stone-600">
                        {payment.appointment_id && (
                          <Icon
                            name="chevron"
                            className="size-4 transition group-hover:translate-x-0.5 group-hover:text-amber-600"
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 px-5 py-4 dark:border-stone-700">
              <span className="text-sm text-stone-500 dark:text-stone-400">
                Showing {startItem}-{endItem} of {data.total} payments
              </span>
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium tabular-nums text-stone-400 dark:text-stone-500">
                  Page {data.page} of {data.total_pages}
                </span>
                <Button
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  size="sm"
                  type="button"
                  variant="secondary"
                >
                  Previous
                </Button>
                <Button
                  disabled={page >= data.total_pages}
                  onClick={() =>
                    setPage((current) => Math.min(data.total_pages, current + 1))
                  }
                  size="sm"
                  type="button"
                  variant="secondary"
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-stone-100 text-stone-400 dark:bg-stone-700 dark:text-stone-500">
              <Icon name="paid" className="size-6" />
            </span>
            <h2 className="mt-1 text-lg font-semibold text-stone-700 dark:text-stone-300">
              No payments found
            </h2>
            <p className="text-sm text-stone-400 dark:text-stone-500">
              {hasActiveFilters
                ? 'Try adjusting your search or filters.'
                : 'Payments will appear here once consultation fees are collected.'}
            </p>
            {hasActiveFilters && (
              <Button
                className="mt-3"
                onClick={clearFilters}
                size="sm"
                type="button"
                variant="secondary"
              >
                Clear filters
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

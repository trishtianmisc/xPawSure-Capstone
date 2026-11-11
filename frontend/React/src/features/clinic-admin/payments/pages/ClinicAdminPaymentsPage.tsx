import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

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

export function ClinicAdminPaymentsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useToast()
  const settings = useClinicSettings()

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [method, setMethod] = useState('')
  const [paidFrom, setPaidFrom] = useState('')
  const [paidTo, setPaidTo] = useState('')
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

  function changeFilter(setter: (value: string) => void) {
    return (value: string) => {
      setter(value)
      setPage(1)
      setExportError(null)
    }
  }

  function clearFilters() {
    setSearch('')
    setStatus('')
    setMethod('')
    setPaidFrom('')
    setPaidTo('')
    setPage(1)
    setExportError(null)
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

      <Card padding="md">
        <div className="flex flex-col gap-3">
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
              onChange={(event) => changeFilter(setStatus)(event.target.value)}
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
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-stone-500 dark:text-stone-400">
                Paid from
                <input
                  aria-label="Paid from"
                  className={`${INPUT_CLASSES} w-40`}
                  max={paidTo || undefined}
                  onChange={(event) => changeFilter(setPaidFrom)(event.target.value)}
                  type="date"
                  value={paidFrom}
                />
              </label>

              <label className="flex items-center gap-2 text-sm text-stone-500 dark:text-stone-400">
                Paid to
                <input
                  aria-label="Paid to"
                  className={`${INPUT_CLASSES} w-40`}
                  min={paidFrom || undefined}
                  onChange={(event) => changeFilter(setPaidTo)(event.target.value)}
                  type="date"
                  value={paidTo}
                />
              </label>

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
                className="shrink-0 rounded-md bg-amber-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-800"
             
              >
                Export CSV
              </Button>
            </div>
          </div>
        </div>

        <p className="mt-6 text-xs text-stone-400 dark:text-stone-300">
          Date paid filters on the payment date in clinic time and lists paid
          payments only. Export downloads every matching payment, not just this
          page.
        </p>

        {exportError && (
          <p
            className="mt-3 text-sm font-medium text-red-600 dark:text-red-400"
            role="alert"
          >
            {exportError}
          </p>
        )}
      </Card>

      {/* Totals for EVERY matching payment (server-side), not just this page. */}
      {(isLoading || data) && (
        <Card padding="md">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                Paid
              </p>
              <p className="mt-1 text-xl font-bold tabular-nums text-stone-900 dark:text-stone-50">
                {data ? formatPeso(data.summary.paid_total) : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                Pending
              </p>
              <p className="mt-1 text-xl font-bold tabular-nums text-stone-900 dark:text-stone-50">
                {data ? formatPeso(data.summary.pending_total) : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                Refunded
              </p>
              <p className="mt-1 text-xl font-bold tabular-nums text-stone-900 dark:text-stone-50">
                {data ? formatPeso(data.summary.refunded_total) : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                Payments
              </p>
              <p className="mt-1 text-xl font-bold tabular-nums text-stone-900 dark:text-stone-50">
                {data ? data.summary.payment_count : '—'}
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-stone-500 dark:text-stone-400">
            Totals cover every matching payment, not just this page. Paid uses
            the same payment-date rules as the Reports revenue KPI, so the two
            figures reconcile for the same range.
          </p>
        </Card>
      )}

      <div className="overflow-hidden rounded-md border border-stone-200 bg-white shadow-sm dark:border-stone-700 dark:bg-stone-800">
        {isLoading ? (
          <div className="space-y-4 p-6">
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
                  <tr className="border-b border-stone-100 bg-stone-100 text-stone-500 dark:border-stone-700 dark:bg-stone-700 dark:text-stone-400">
                    <th className="px-5 py-4 font-semibold">Receipt</th>
                    <th className="px-5 py-4 font-semibold">Patient</th>
                    <th className="px-5 py-4 font-semibold">Owner</th>
                    <th className="px-5 py-4 font-semibold">Method</th>
                    <th className="px-5 py-4 font-semibold">Amount</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                    <th className="px-5 py-4 font-semibold">Paid</th>
                    <th className="px-5 py-4 font-semibold">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-700">
                  {data.results.map((payment) => (
                    <tr
                      className={`transition hover:bg-amber-50/50 dark:hover:bg-amber-900/10 ${payment.appointment_id
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
                      <td className="px-5 py-4 text-stone-800 dark:text-stone-100">
                        {payment.pet_name ?? '—'}
                      </td>
                      <td className="px-5 py-4 text-stone-600 dark:text-stone-300">
                        {payment.owner_name ?? '—'}
                      </td>
                      <td className="px-5 py-4 text-stone-600 dark:text-stone-300">
                        {payment.method}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 font-semibold text-stone-900 dark:text-stone-50">
                        {formatPeso(payment.amount)}
                      </td>
                      <td className="px-5 py-4">
                        <PaymentStatusBadge status={payment.status} />
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-stone-600 dark:text-stone-300">
                        {formatDateTime(payment.paid_at, displayTimeZone)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-stone-500 dark:text-stone-400">
                        {formatDateTime(payment.created_at, displayTimeZone)}
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
              <div className="flex gap-2">
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
          <div className="py-16 text-center">
            <h2 className="text-lg font-semibold text-stone-700 dark:text-stone-300">
              No payments found
            </h2>
            <p className="mt-1 text-sm text-stone-400 dark:text-stone-500">
              {hasActiveFilters
                ? 'Try adjusting your search or filters.'
                : 'Payments will appear here once consultation fees are collected.'}
            </p>
            {hasActiveFilters && (
              <Button
                className="mt-4"
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

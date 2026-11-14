import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button, Card } from '../../../components/ui'
import { useDebounce } from '../../../hooks/useDebounce'
import {
  CLINIC_TIME_ZONE,
  formatDateTime,
} from '../../../utils/format'
import { formatPeso } from '../../../utils/currency'
import { apiErrorMessage } from '../../../utils/error'
import { PaymentStatusBadge } from '../../payments/components/PaymentStatusBadge'
import { usePayments } from '../../payments/hooks/usePayments'
import { PageHero } from '../components/PageHero'
import { useClinicSettings } from '../hooks/useClinicSettings'
import { paymentService } from '../../payments/services/payment.service'
import { PrintableDailyPayments } from '../components/PrintableDailyPayments'
import { useAuth } from '../../auth/context/AuthContext'

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

function formatAmount(amount: number, currency: string): string {
  return `${currency === 'PHP' ? '₱' : `${currency} `}${Number(amount).toFixed(2)}`
}

// Parse the server's ISO date as a local calendar day (never UTC), matching
// the clinic-local window the backend applied to the same response.
function formatDay(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// Label for the printout's filter line: the dropdown label, or "All" for the
// empty (unfiltered) option.
function filterLabel(
  options: Array<{ value: string; label: string }>,
  value: string,
): string {
  if (!value) return 'All'
  return options.find((option) => option.value === value)?.label ?? value
}

export function PaymentsPage() {
  const navigate = useNavigate()
  const settings = useClinicSettings()

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const { user } = useAuth()
  const [printData, setPrintData] = useState<Awaited<ReturnType<typeof paymentService.list>> | null>(null)
  const [isPreparingPrint, setIsPreparingPrint] = useState(false)
  const [printError, setPrintError] = useState<string | null>(null)
  const [method, setMethod] = useState('')
  const [page, setPage] = useState(1)

  const debouncedSearch = useDebounce(search, 300)
  const displayTimeZone = settings.data?.timezone ?? CLINIC_TIME_ZONE

  // No date parameters: the server pins receptionist requests to today's
  // clinic-local collection, so a client clock (or a crafted URL) never
  // widens the window.
  const params = useMemo(
    () => ({
      reference: debouncedSearch || undefined,
      status: status || undefined,
      method: method || undefined,
      page,
      page_size: 20,
    }),
    [debouncedSearch, status, method, page],
  )

  const { data, isLoading, error, refetch, isFetching } = usePayments(params)

  const startItem = data ? (data.page - 1) * data.page_size + 1 : 0
  const endItem = data ? Math.min(data.page * data.page_size, data.total) : 0
  const hasActiveFilters = Boolean(search || status || method)

  function changeFilter(setter: (value: string) => void) {
    return (value: string) => {
      setter(value)
      setPage(1)
    }
  }

  function clearFilters() {
    setSearch('')
    setStatus('')
    setMethod('')
    setPage(1)
  }

  async function handlePrint() {
    setPrintError(null)
    setIsPreparingPrint(true)
    try {
      // Same filters as the screen, but the whole day in one request.
      setPrintData(await paymentService.list({ ...params, page: 1, page_size: 100 }))
    } catch (err) {
      setPrintError(apiErrorMessage(err))
    } finally {
      setIsPreparingPrint(false)
    }
  }

  // Runs after the print block is in the DOM.
  useEffect(() => {
    if (!printData) return
    const clear = () => setPrintData(null)
    window.addEventListener('afterprint', clear, { once: true })
    window.print()
    return () => window.removeEventListener('afterprint', clear)
  }, [printData])

  return (
    <>
      <div className="p-6 print:hidden">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8">
            <PageHero
              title="Payments"
              subtitle="Consultation fees collected before appointments are booked."
            />
          </div>

          <Card padding="md">
            <div className="flex flex-col gap-3">
              {/* Row 1: search + dropdowns */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-52 flex-1">
                  <input
                    className={`${INPUT_CLASSES} pl-10`}
                    onChange={(event) => {
                      changeFilter(setSearch)(event.target.value)
                    }}
                    placeholder="Search receipt number..."
                    type="search"
                    value={search}
                    aria-label="Search payments"
                  />
                  <svg
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400 dark:text-stone-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                  </svg>
                </div>
                <select
                  className={INPUT_CLASSES}
                  onChange={(event) => changeFilter(setStatus)(event.target.value)}
                  value={status}
                  aria-label="Filter by status"
                >
                  {STATUS_FILTERS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  className={INPUT_CLASSES}
                  onChange={(event) => changeFilter(setMethod)(event.target.value)}
                  value={method}
                  aria-label="Filter by method"
                >
                  {METHOD_FILTERS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                {hasActiveFilters && (
                  <Button onClick={clearFilters} size="sm" type="button" variant="ghost">
                    Clear filters
                  </Button>
                )}

                <Button
                  loading={isPreparingPrint}
                  onClick={handlePrint}
                  size="sm"
                  type="button"
                >
                  {isPreparingPrint ? 'Preparing…' : 'Print'}
                </Button>

                {isFetching && !isLoading && (
                  <span className="text-xs font-medium text-stone-400 dark:text-stone-500">
                    Refreshing...
                  </span>
                )}
              </div>

              {printError && (
                <p
                  role="alert"
                  className="text-xs font-medium text-red-600 dark:text-red-400"
                >
                  Couldn&apos;t prepare the printout: {printError}
                </p>
              )}
            </div>

            <p className="mt-6 text-xs text-stone-400 dark:text-stone-300">
              Showing payments paid today. Payment history and revenue reports
              are in the clinic admin&apos;s account.
            </p>
          </Card>

          {/* Today's totals for EVERY matching payment (server-side), not just
              this page; the date line echoes the window the server applied. */}
          {(isLoading || data) && (
            <Card className="mt-4" padding="md">
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                    Collected today
                  </p>
                  <p className="mt-1 text-xl font-bold tabular-nums text-stone-900 dark:text-stone-50">
                    {data ? formatPeso(data.summary.paid_total) : '—'}
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
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                    Refunded today
                  </p>
                  <p className="mt-1 text-xl font-bold tabular-nums text-stone-900 dark:text-stone-50">
                    {data ? formatPeso(data.summary.refunded_total) : '—'}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-xs text-stone-500 dark:text-stone-400">
                {data?.paid_from ? `Today · ${formatDay(data.paid_from)} · ` : ''}
                Totals cover every matching payment, not just this page.
                Collected today uses the same payment-date rules as the Reports
                revenue KPI, so the two figures reconcile for the same day.
              </p>
            </Card>
          )}

          <Card className="mt-4" padding="sm">
            {isLoading && (
              <p className="px-4 py-6 text-sm text-stone-500 dark:text-stone-400">
                Loading payments…
              </p>
            )}

            {error && !data && (
              <div className="py-16 text-center">
                <h2 className="text-lg font-semibold text-stone-700 dark:text-stone-300">
                  Failed to load payments
                </h2>
                <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
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
            )}

            {data && data.results.length === 0 && (
              <div className="py-16 text-center">
                <p className="text-sm text-stone-500 dark:text-stone-400">
                  {hasActiveFilters
                    ? 'No payments match your search or filters.'
                    : 'No payments match these filters.'}
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

            {data && data.results.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-500 dark:border-stone-700 dark:text-stone-400">
                      <th className="px-4 py-3 font-semibold">Receipt</th>
                      <th className="px-4 py-3 font-semibold">Patient</th>
                      <th className="px-4 py-3 font-semibold">Owner</th>
                      <th className="px-4 py-3 font-semibold">Method</th>
                      <th className="px-4 py-3 font-semibold">Amount</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Paid</th>
                      <th className="px-4 py-3 font-semibold">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.results.map((payment) => (
                      <tr
                        key={payment.pay_id}
                        onClick={() =>
                          payment.appointment_id &&
                          navigate(`/receptionist/appointments/${payment.appointment_id}`)
                        }
                        className={`border-b border-stone-100 last:border-0 dark:border-stone-700/60 ${payment.appointment_id
                          ? 'cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-700/40'
                          : ''
                          }`}
                      >
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-stone-700 dark:text-stone-200">
                          {payment.reference_no}
                        </td>
                        <td className="px-4 py-3 text-stone-800 dark:text-stone-100">
                          {payment.pet_name ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-stone-600 dark:text-stone-300">
                          {payment.owner_name ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-stone-600 dark:text-stone-300">
                          {payment.method}
                        </td>
                        <td className="px-4 py-3 font-semibold text-stone-900 dark:text-stone-50">
                          {formatAmount(payment.amount, payment.currency)}
                        </td>
                        <td className="px-4 py-3">
                          <PaymentStatusBadge status={payment.status} />
                        </td>
                        <td className="px-4 py-3 text-stone-600 dark:text-stone-300">
                          {payment.paid_at
                            ? formatDateTime(payment.paid_at, displayTimeZone)
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-stone-500 dark:text-stone-400">
                          {formatDateTime(payment.created_at, displayTimeZone)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {data && data.total_pages > 1 && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-stone-500 dark:text-stone-400">
              <span>
                Showing {startItem}-{endItem} of {data.total} payments
              </span>
              <div className="flex gap-2">
                <button
                  className="rounded-md border border-stone-300 px-3 py-1.5 disabled:opacity-40 dark:border-stone-600"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => current - 1)}
                  type="button"
                >
                  Previous
                </button>
                <button
                  className="rounded-md border border-stone-300 px-3 py-1.5 disabled:opacity-40 dark:border-stone-600"
                  disabled={page >= data.total_pages}
                  onClick={() => setPage((current) => current + 1)}
                  type="button"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Outside the print:hidden screen root so it is what actually prints. */}
      {printData && (
        <PrintableDailyPayments
          data={printData}
          timeZone={displayTimeZone}
          clinicName={user?.clinic_name ?? 'Clinic'}
          filters={{
            search: debouncedSearch,
            status: filterLabel(STATUS_FILTERS, status),
            method: filterLabel(METHOD_FILTERS, method),
          }}
        />
      )}
    </>
  )
}

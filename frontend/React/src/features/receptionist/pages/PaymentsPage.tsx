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

const TH_CLASSES =
  'px-5 py-3.5 text-xs font-semibold uppercase tracking-wide'

const ICONS = {
  paid: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
  refunded: 'M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6',
  count:
    'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
  print:
    'M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z',
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

// Tinted container + translucent icon box, same as the clinic admin tiles.
// Full class strings so Tailwind can see them.
const TILE_TONES = {
  emerald: {
    container: 'bg-emerald-100/80 dark:bg-emerald-900/25',
    icon: 'bg-white/70 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  rose: {
    container: 'bg-rose-100/80 dark:bg-rose-900/25',
    icon: 'bg-white/70 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  },
  violet: {
    container: 'bg-violet-100/80 dark:bg-violet-900/25',
    icon: 'bg-white/70 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
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
      setPrintError(null)
    }
  }

  function clearFilters() {
    setSearch('')
    setStatus('')
    setMethod('')
    setPage(1)
    setPrintError(null)
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
      <div className="mx-auto max-w-7xl space-y-6 px-6 py-6 print:hidden">
        <PageHero
          title="Payments"
          subtitle="Consultation fees collected before appointments are booked."
        />

        {/* Today's totals for EVERY matching payment (server-side), not just
            this page; the date line echoes the window the server applied. */}
        {(isLoading || data) && (
          <section aria-label="Today's payment totals">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatTile
                icon="paid"
                label="Collected today"
                tone="emerald"
                value={data ? formatPeso(data.summary.paid_total) : '—'}
              />
              <StatTile
                icon="count"
                label="Payments"
                tone="violet"
                value={data ? String(data.summary.payment_count) : '—'}
              />
              <StatTile
                icon="refunded"
                label="Refunded today"
                tone="rose"
                value={data ? formatPeso(data.summary.refunded_total) : '—'}
              />
            </div>
            <p className="mt-2 px-1 text-xs text-stone-500 dark:text-stone-400">
              {data?.paid_from ? `Today · ${formatDay(data.paid_from)} · ` : ''}
              Totals cover every matching payment.
            </p>
          </section>
        )}

        <Card padding="md">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-64 flex-1">
                <input
                  aria-label="Search payments"
                  className={`${INPUT_CLASSES} w-full pl-10`}
                  onChange={(event) => changeFilter(setSearch)(event.target.value)}
                  placeholder="Search receipt number..."
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

              <Button
                  disabled={isPreparingPrint || isLoading}
                  loading={isPreparingPrint}
                  onClick={handlePrint}
                  type="button"
                  className="shrink-0 rounded-md bg-amber-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-800"
                >
                  <span className="flex items-center gap-2">
                    <Icon name="print" className="size-4" />
                    {isPreparingPrint ? 'Preparing…' : 'Print'}
                  </span>
                </Button>
            </div>

            {/* Row 2: filter state on the left, print on the right */}
            {/* <div className="flex flex-wrap items-center gap-3 border-t border-stone-100 pt-3 dark:border-stone-700">
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

              
            </div> */}
          </div>

          <p className="mt-5 text-xs text-stone-400 dark:text-stone-300">
            Showing payments paid today. Print includes every matching payment
            for today, up to 100. Payment history and revenue reports are in
            the clinic admin&apos;s account.
          </p>

          {printError && (
            <p
              role="alert"
              className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400"
            >
              Couldn&apos;t prepare the printout: {printError}
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
                          navigate(`/receptionist/appointments/${payment.appointment_id}`)
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
                          {formatAmount(payment.amount, payment.currency)}
                        </td>
                        <td className="px-5 py-4">
                          <PaymentStatusBadge status={payment.status} />
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-stone-600 dark:text-stone-300">
                          {payment.paid_at
                            ? formatDateTime(payment.paid_at, displayTimeZone)
                            : '—'}
                          {payment.refunded_at && (
                            <div className="text-[11px] text-stone-500 dark:text-stone-400">
                              Refunded {formatDateTime(payment.refunded_at, displayTimeZone)}
                            </div>
                          )}
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
                {data.total_pages > 1 && (
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
                )}
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
                  : 'No payments have been collected yet today.'}
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

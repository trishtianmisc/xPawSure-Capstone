import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Card } from '../../../components/ui'
import { useDebounce } from '../../../hooks/useDebounce'
import { formatDateTime } from '../../../utils/format'
import { apiErrorMessage } from '../../../utils/error'
import { PaymentStatusBadge } from '../../payments/components/PaymentStatusBadge'
import { usePayments } from '../../payments/hooks/usePayments'
import { PageHero } from '../components/PageHero'

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'PENDING', label: 'Awaiting payment' },
  { value: 'PAID', label: 'Paid' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'EXPIRED', label: 'Expired' },
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

export function PaymentsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [method, setMethod] = useState('')
  const [page, setPage] = useState(1)

  const debouncedSearch = useDebounce(search, 300)

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

  const { data, isLoading, error } = usePayments(params)

  return (
    <div className="p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <PageHero
            title="Payments"
            subtitle="Consultation fees collected before appointments are booked."
          />
        </div>

        <Card padding="md">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              className={`${INPUT_CLASSES} flex-1`}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder="Search receipt number..."
              type="search"
              value={search}
            />
            <select
              className={INPUT_CLASSES}
              onChange={(event) => {
                setStatus(event.target.value)
                setPage(1)
              }}
              value={status}
            >
              {STATUS_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              className={INPUT_CLASSES}
              onChange={(event) => {
                setMethod(event.target.value)
                setPage(1)
              }}
              value={method}
            >
              {METHOD_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </Card>

        <Card className="mt-4" padding="sm">
          {isLoading && (
            <p className="px-4 py-6 text-sm text-stone-500 dark:text-stone-400">
              Loading payments…
            </p>
          )}

          {error && (
            <p className="px-4 py-6 text-sm text-red-600">{apiErrorMessage(error)}</p>
          )}

          {data && data.results.length === 0 && (
            <p className="px-4 py-6 text-sm text-stone-500 dark:text-stone-400">
              No payments match these filters.
            </p>
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
                      className={`border-b border-stone-100 last:border-0 dark:border-stone-700/60 ${
                        payment.appointment_id
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
                      <td className="px-4 py-3 text-stone-500 dark:text-stone-400">
                        {formatDateTime(payment.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {data && data.total_pages > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm text-stone-500 dark:text-stone-400">
            <span>
              Page {data.page} of {data.total_pages} · {data.total} payments
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
  )
}

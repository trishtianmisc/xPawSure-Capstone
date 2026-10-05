import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { Button, Card } from '../../../components/ui'
import { useDebounce } from '../../../hooks/useDebounce'
import { useAppointments, useUpdateAppointmentStatus } from '../hooks/useAppointments'
import { AppointmentStatusBadge } from '../components/AppointmentStatusBadge'
import { PageHero } from '../components/PageHero'
import { formatDateTime } from '../../../utils/format'
import { apiErrorMessage } from '../../../utils/error'

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'CHECKED_IN', label: 'Checked In' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'NO_SHOW', label: 'No Show' },
]

const INPUT_CLASSES =
  'rounded-md border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-amber-500 dark:focus:ring-amber-900/40'

function labelize(value: string): string {
  if (value === 'AI_REVIEW') return 'AI Review'
  const lower = value.replace(/_/g, ' ').toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

type StatusMutation = ReturnType<typeof useUpdateAppointmentStatus>

function QuickStatusAction({
  aptId,
  status,
  updateStatus,
}: {
  aptId: string
  status: string
  updateStatus: StatusMutation
}) {
  const pending = updateStatus.isPending && updateStatus.variables?.aptId === aptId

  if (status === 'PENDING') {
    return (
      <Button
        type="button"
        size="sm"
        variant="secondary"
        loading={pending}
        onClick={() => updateStatus.mutate({ aptId, status: 'CONFIRMED' })}
      >
        Confirm
      </Button>
    )
  }

  if (status === 'CONFIRMED') {
    return (
      <Button
        type="button"
        size="sm"
        variant="secondary"
        loading={pending}
        onClick={() => updateStatus.mutate({ aptId, status: 'CHECKED_IN' })}
      >
        Check In
      </Button>
    )
  }

  return null
}

export function AppointmentsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [page, setPage] = useState(1)

  const debouncedSearch = useDebounce(search, 300)

  const updateStatus = useUpdateAppointmentStatus()

  const params = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      status: statusFilter || undefined,
      date: dateFilter || undefined,
      page,
      page_size: 20,
    }),
    [debouncedSearch, statusFilter, dateFilter, page],
  )

  const { data, isLoading, error, refetch, isFetching } = useAppointments(params)

  const hasActiveFilters = Boolean(search || dateFilter || statusFilter)

  return (
    <div className="p-6">
      <div className="mx-auto max-w-6xl">
        {/* Hero banner */}
        <div className="mb-8">
          <PageHero
            title="Appointments"
            subtitle="Schedule, confirm, and track patient visits."
            actions={
              <button
                className="shrink-0 rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-400"
                onClick={() => navigate('/receptionist/appointments/new')}
                type="button"
              >
                + New Appointment
              </button>
            }
          />
        </div>

        {/* Filter card */}
        <Card padding="md">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-52 flex-1">
              <input
                className={`${INPUT_CLASSES} pl-10`}
                placeholder="Search pets or owners..."
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                aria-label="Search appointments"
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

            <input
              className={`${INPUT_CLASSES} w-44 shrink-0`}
              type="date"
              value={dateFilter}
              onChange={(e) => { setDateFilter(e.target.value); setPage(1) }}
              aria-label="Filter by date"
            />

            <select
              className={`${INPUT_CLASSES} shrink-0`}
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
              aria-label="Filter by status"
            >
              {STATUS_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
        </Card>

        {/* Table */}
        <div className="mt-6 overflow-hidden rounded-md border border-stone-200 bg-white shadow-sm dark:border-stone-700 dark:bg-stone-800">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-200 border-t-amber-600" />
            </div>
          ) : data?.results && data.results.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-100 bg-stone-50 text-stone-500 dark:border-stone-700 dark:bg-stone-800/50 dark:text-stone-400">
                    <th className="px-5 py-4 font-semibold">Pet</th>
                    <th className="px-5 py-4 font-semibold">Owner</th>
                    <th className="px-5 py-4 font-semibold">Veterinarian</th>
                    <th className="px-5 py-4 font-semibold">Date & Time</th>
                    <th className="px-5 py-4 font-semibold">Type</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                    <th className="px-5 py-4 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-700">
                  {data.results.map((apt) => (
                    <tr
                      key={apt.apt_id}
                      className="cursor-pointer transition hover:bg-amber-50/50 dark:hover:bg-amber-900/10"
                      onClick={() => navigate(`/receptionist/appointments/${apt.apt_id}`)}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="grid size-9 shrink-0 place-items-center rounded-full bg-amber-100 text-xs font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                            {apt.pet_name?.[0]?.toUpperCase() ?? '?'}
                          </div>
                          <div className="min-w-0">
                            <Link
                              to={`/receptionist/pets/${apt.pet_id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="block truncate text-sm font-semibold text-stone-900 transition hover:text-amber-700 dark:text-stone-100 dark:hover:text-amber-400"
                            >
                              {apt.pet_name}
                            </Link>
                            {apt.pet_species && (
                              <p className="truncate text-xs text-stone-500 dark:text-stone-400">
                                {labelize(apt.pet_species)}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-stone-500 dark:text-stone-400">
                        {apt.owner_name ?? '—'}
                      </td>
                      <td className="px-5 py-4 text-stone-500 dark:text-stone-400">
                        {apt.vet_name ?? 'Unassigned'}
                      </td>
                      <td className="px-5 py-4 text-stone-500 dark:text-stone-400">
                        {formatDateTime(apt.apt_scheduled_at)}
                      </td>
                      <td className="px-5 py-4 text-stone-500 dark:text-stone-400">
                        {labelize(apt.apt_type)}
                      </td>
                      <td className="px-5 py-4">
                        <AppointmentStatusBadge status={apt.apt_status} />
                      </td>
                      <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <QuickStatusAction
                            aptId={apt.apt_id}
                            status={apt.apt_status}
                            updateStatus={updateStatus}
                          />
                          <Link
                            to={`/receptionist/appointments/${apt.apt_id}`}
                            className="rounded-lg px-3 py-1.5 text-sm font-medium text-amber-700 transition hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20"
                          >
                            View
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : error ? (
            <div className="py-16 text-center">
              <svg
                className="mx-auto h-12 w-12 text-stone-300 dark:text-stone-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} />
              </svg>
              <h3 className="mt-4 text-lg font-semibold text-stone-600 dark:text-stone-400">Failed to load appointments</h3>
              <p className="mt-1 text-sm text-stone-400 dark:text-stone-500">{apiErrorMessage(error)}</p>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="mt-4"
                loading={isFetching}
                onClick={() => refetch()}
              >
                Try again
              </Button>
            </div>
          ) : (
            <div className="py-16 text-center">
              <svg
                className="mx-auto h-12 w-12 text-stone-300 dark:text-stone-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} />
              </svg>
              <h3 className="mt-4 text-lg font-semibold text-stone-600 dark:text-stone-400">No appointments found</h3>
              <p className="mt-1 text-sm text-stone-400 dark:text-stone-500">
                {hasActiveFilters
                  ? 'Try adjusting your search, date, or status filters.'
                  : 'Create your first appointment to get started.'}
              </p>
            </div>
          )}

          {data && data.total_pages > 1 && (
            <div className="flex items-center justify-between border-t border-stone-100 px-5 py-4 dark:border-stone-700">
              <span className="text-sm text-stone-500 dark:text-stone-400">
                Page {data.page} of {data.total_pages} ({data.total} total)
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={page >= data.total_pages}
                  onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

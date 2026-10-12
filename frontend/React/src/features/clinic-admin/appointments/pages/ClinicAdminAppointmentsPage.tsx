import { useMemo, useState } from 'react'

import { Button, Card } from '../../../../components/ui'
import { apiErrorMessage } from '../../../../utils/error'
import { formatDateTime } from '../../../../utils/format'
import { AppointmentStatusBadge } from '../../../receptionist/components/AppointmentStatusBadge'
import { ChartSkeleton } from '../../dashboard/components/Charts/AppointmentsByMonthChart'
import type { ChartDataPoint } from '../../dashboard/types/dashboard.types'
import { AppointmentVolumeChart } from '../components/AppointmentVolumeChart'
import {
  useAppointmentVolume,
  useClinicAppointments,
  useVeterinarians,
} from '../hooks/useAppointments'

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

export function ClinicAdminAppointmentsPage() {
  const [vetId, setVetId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)

  const params = useMemo(
    () => ({
      vet_id: vetId || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      status: statusFilter || undefined,
      page,
      page_size: 20,
    }),
    [vetId, dateFrom, dateTo, statusFilter, page],
  )

  const appointments = useClinicAppointments(params)
  const volume = useAppointmentVolume()
  const vets = useVeterinarians()

  const { data, isLoading, error, refetch, isFetching } = appointments
  const hasActiveFilters = Boolean(vetId || dateFrom || dateTo || statusFilter)

  const volumeData: ChartDataPoint[] = (volume.data ?? []).map((point) => ({
    label: new Date(`${point.date}T00:00:00`).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    value: point.count,
  }))

  function clearFilters() {
    setVetId('')
    setDateFrom('')
    setDateTo('')
    setStatusFilter('')
    setPage(1)
  }

  return (
    <div className="p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">
            Appointments
          </h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            Full appointment oversight across all veterinarians in your clinic.
          </p>
        </div>

        {/* Volume trends */}
        <div className="mb-6">
          {volume.isLoading ? (
            <ChartSkeleton />
          ) : volume.error ? (
            <div className="rounded-xl border border-stone-200 bg-white p-5 dark:border-stone-700 dark:bg-stone-800">
              <h3 className="mb-4 text-sm font-bold text-stone-700 dark:text-stone-300">
                Appointment Volume — Last 30 Days
              </h3>
              <div className="py-6 text-center">
                <p className="text-sm text-stone-500 dark:text-stone-400">
                  {apiErrorMessage(volume.error)}
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="mt-3"
                  loading={volume.isFetching}
                  onClick={() => volume.refetch()}
                >
                  Try again
                </Button>
              </div>
            </div>
          ) : (
            <AppointmentVolumeChart data={volumeData} />
          )}
        </div>

        {/* Filter card */}
        <Card padding="md">
          <div className="flex flex-wrap items-center gap-3">
            <select
              className={`${INPUT_CLASSES} w-56 shrink-0`}
              value={vetId}
              disabled={vets.isLoading}
              onChange={(e) => { setVetId(e.target.value); setPage(1) }}
              aria-label="Filter by veterinarian"
            >
              <option value="">
                {vets.isLoading ? 'Loading veterinarians...' : 'All veterinarians'}
              </option>
              {vets.data?.map((vet) => (
                <option key={vet.id} value={vet.id}>
                  {vet.first_name} {vet.last_name}
                </option>
              ))}
            </select>

            <input
              className={`${INPUT_CLASSES} w-44 shrink-0`}
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
              aria-label="Filter from date"
            />
            <input
              className={`${INPUT_CLASSES} w-44 shrink-0`}
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
              aria-label="Filter to date"
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

            {hasActiveFilters && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={clearFilters}
              >
                Clear
              </Button>
            )}
          </div>
        </Card>

        {/* Table */}
        <div className="mt-6 overflow-hidden rounded-md border border-stone-200 bg-white shadow-sm dark:border-stone-700 dark:bg-stone-800">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-200 border-t-amber-600" />
            </div>
          ) : error ? (
            <div className="py-16 text-center">
              <h3 className="text-lg font-semibold text-stone-600 dark:text-stone-400">
                Failed to load appointments
              </h3>
              <p className="mt-1 text-sm text-stone-400 dark:text-stone-500">
                {apiErrorMessage(error)}
              </p>
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
          ) : data?.results && data.results.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-100 bg-stone-50 text-stone-500 dark:border-stone-700 dark:bg-stone-800/50 dark:text-stone-400">
                    <th className="px-5 py-4 font-semibold">Owner</th>
                    <th className="px-5 py-4 font-semibold">Pet</th>
                    <th className="px-5 py-4 font-semibold">Veterinarian</th>
                    <th className="px-5 py-4 font-semibold">Date &amp; Time</th>
                    <th className="px-5 py-4 font-semibold">Type</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-700">
                  {data.results.map((apt) => (
                    <tr key={apt.apt_id}>
                      <td className="px-5 py-4 text-stone-500 dark:text-stone-400">
                        {apt.owner_name ?? '—'}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="grid size-9 shrink-0 place-items-center rounded-full bg-amber-100 text-xs font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                            {apt.pet_name?.[0]?.toUpperCase() ?? '?'}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-stone-900 dark:text-stone-100">
                              {apt.pet_name}
                            </p>
                            {apt.pet_species && (
                              <p className="truncate text-xs text-stone-500 dark:text-stone-400">
                                {labelize(apt.pet_species)}
                              </p>
                            )}
                          </div>
                        </div>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-16 text-center">
              <h3 className="text-lg font-semibold text-stone-600 dark:text-stone-400">
                No appointments found
              </h3>
              <p className="mt-1 text-sm text-stone-400 dark:text-stone-500">
                {hasActiveFilters
                  ? 'Try adjusting your veterinarian, date range, or status filters.'
                  : 'No appointments have been booked yet.'}
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

import { useState } from 'react'
import { Link } from 'react-router-dom'

import { useAppointments } from '../hooks/useAppointments'
import { AppointmentStatusBadge } from '../components/AppointmentStatusBadge'
import type { AppointmentStatus } from '../types/receptionist.types'

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: '', label: 'All' },
  { value: 'BOOKED', label: 'Booked' },
  { value: 'CHECKED_IN', label: 'Checked In' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'NO_SHOW', label: 'No Show' },
]

export function AppointmentsPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading, error } = useAppointments({
    search: search || undefined,
    status: statusFilter || undefined,
    date: dateFilter || undefined,
    page,
    page_size: 20,
  })

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Appointments</h1>
        <Link
          to="/receptionist/appointments/new"
          className="rounded-lg bg-amber-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-800"
        >
          + New Appointment
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search pets or owners..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 dark:placeholder:text-stone-500"
        />
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => { setDateFilter(e.target.value); setPage(1) }}
          className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
        />
        <div className="flex gap-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => { setStatusFilter(f.value); setPage(1) }}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${statusFilter === f.value
                ? 'bg-amber-700 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-400 dark:hover:bg-stone-700'
                }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <table className="min-w-full divide-y divide-stone-200 dark:divide-stone-800">
          <thead className="bg-stone-50 dark:bg-stone-800/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">Pet</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">Owner</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">Vet</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">Date & Time</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 animate-pulse rounded bg-stone-200 dark:bg-stone-800" />
                    </td>
                  ))}
                </tr>
              ))
            ) : error ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-stone-500">
                  Failed to load appointments
                </td>
              </tr>
            ) : data?.results && data.results.length > 0 ? (
              data.results.map((apt) => (
                <tr key={apt.apt_id} className="hover:bg-stone-50 dark:hover:bg-stone-800/50">
                  <td className="px-4 py-3">
                    <Link to={`/receptionist/pets/${apt.pet_id}`} className="text-sm font-medium text-amber-700 hover:underline dark:text-amber-400">
                      {apt.pet_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-stone-600 dark:text-stone-400">{apt.owner_name ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-stone-600 dark:text-stone-400">{apt.vet_name ?? 'Unassigned'}</td>
                  <td className="px-4 py-3 text-sm text-stone-600 dark:text-stone-400">
                    {new Date(apt.apt_scheduled_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-stone-600 dark:text-stone-400">{apt.apt_type}</td>
                  <td className="px-4 py-3">
                    <AppointmentStatusBadge status={apt.apt_status} />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-stone-500">
                  No appointments found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.total_pages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-stone-500">
            Page {data.page} of {data.total_pages} ({data.total} results)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
              disabled={page >= data.total_pages}
              className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

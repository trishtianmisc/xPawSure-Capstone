import { useState } from 'react'

import { Modal } from '../../../components/ui/Modal'
import { formatDateTime, isoDate } from '../../../utils/format'
import { useAppointments, useUpdateAppointmentStatus } from '../hooks/useAppointments'

interface CheckInModalProps {
  open: boolean
  onClose: () => void
}

/** Dashboard quick action: find today's confirmed appointment and check it in. */
export function CheckInModal({ open, onClose }: CheckInModalProps) {
  const [search, setSearch] = useState('')
  const updateStatus = useUpdateAppointmentStatus()
  const { data, isLoading } = useAppointments({
    date: isoDate(),
    status: 'CONFIRMED',
    sort: 'apt_scheduled_at',
    page_size: 50,
  })

  const needle = search.trim().toLowerCase()
  const rows = (data?.results ?? []).filter(
    (apt) =>
      !needle ||
      (apt.pet_name ?? '').toLowerCase().includes(needle) ||
      (apt.owner_name ?? '').toLowerCase().includes(needle),
  )

  return (
    <Modal open={open} onClose={onClose} title="Check in a patient">
      <input
        type="search"
        autoFocus
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search by owner or pet..."
        className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-600 dark:bg-stone-700 dark:text-stone-100"
      />
      <div className="mt-4 max-h-80 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-3 py-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-stone-100 dark:bg-stone-700" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-stone-500 dark:text-stone-400">
            {needle
              ? 'No matching appointment waiting to check in.'
              : 'No confirmed appointments today.'}
          </p>
        ) : (
          rows.map((apt) => (
            <div
              key={apt.apt_id}
              className="flex items-center justify-between gap-3 border-b border-stone-100 py-3 last:border-0 dark:border-stone-700"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-stone-900 dark:text-stone-100">
                  {apt.pet_name} — {apt.owner_name ?? 'Unknown owner'}
                </p>
                <p className="truncate text-xs text-stone-500 dark:text-stone-400">
                  {formatDateTime(apt.apt_scheduled_at)}
                </p>
              </div>
              <button
                type="button"
                disabled={updateStatus.isPending}
                onClick={() =>
                  updateStatus.mutate({ aptId: apt.apt_id, status: 'CHECKED_IN' })
                }
                className="shrink-0 rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50"
              >
                Check in
              </button>
            </div>
          ))
        )}
      </div>
    </Modal>
  )
}

import { useState } from 'react'

import { AppointmentStatusBadge } from '../../../receptionist/components/AppointmentStatusBadge'
import { formatDateTime } from '../../../../utils/format'
import type { VetAppointmentSummary } from '../types/dashboard.types'

interface ConsultationsTableProps {
  consultations: VetAppointmentSummary[]
  sortDirection: 'asc' | 'desc'
  onToggleSort: () => void
  onView: (aptId: string) => void
  onStart: (aptId: string) => void
}

function labelize(value: string): string {
  if (value === 'AI_REVIEW') return 'AI Review'
  const lower = value.replace(/_/g, ' ').toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

function PetTableAvatar({ src, name }: { src: string | null; name: string }) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return (
      <div className="grid size-9 shrink-0 place-items-center rounded-full bg-amber-100 text-xs font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
        {name?.[0]?.toUpperCase() ?? '?'}
      </div>
    )
  }

  return (
    <img
      alt={name}
      className="size-9 shrink-0 rounded-full object-cover"
      onError={() => setFailed(true)}
      src={src}
    />
  )
}

function DateTimeSortIcon({ direction }: { direction: 'asc' | 'desc' }) {
  return (
    <svg className="inline h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        className={direction === 'asc' ? undefined : 'opacity-30'}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18"
      />
      <path
        className={direction === 'desc' ? undefined : 'opacity-30'}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3"
      />
    </svg>
  )
}

export function ConsultationsTable({
  consultations,
  sortDirection,
  onToggleSort,
  onView,
  onStart,
}: ConsultationsTableProps) {
  return (
    <div className="overflow-hidden rounded-md border border-stone-200 bg-white shadow-sm dark:border-stone-700 dark:bg-stone-800">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-stone-100 bg-stone-50 text-stone-500 dark:border-stone-700 dark:bg-stone-800/50 dark:text-stone-400">
              <th className="px-5 py-4 font-semibold">Pet</th>
              <th className="px-5 py-4 font-semibold">Owner</th>
              <th className="px-5 py-4 font-semibold">Veterinarian</th>
              <th
                aria-sort={sortDirection === 'asc' ? 'ascending' : 'descending'}
                className="cursor-pointer select-none px-5 py-4 font-semibold"
                onClick={onToggleSort}
              >
                <span className="inline-flex items-center gap-1">
                  Date &amp; Time
                  <DateTimeSortIcon direction={sortDirection} />
                </span>
              </th>
              <th className="px-5 py-4 font-semibold">Type</th>
              <th className="px-5 py-4 font-semibold">Status</th>
              <th className="px-5 py-4 text-right font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 dark:divide-stone-700">
            {consultations.map((c) => {
              const canStart = c.apt_status === 'CHECKED_IN'

              return (
                <tr
                  key={c.apt_id}
                  className="cursor-pointer transition hover:bg-amber-50/50 dark:hover:bg-amber-900/10"
                  onClick={() => onView(c.apt_id)}
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <PetTableAvatar
                        name={c.pet_name}
                        src={c.pet_profile_image ?? null}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-stone-900 dark:text-stone-100">
                          {c.pet_name}
                        </p>
                        {c.pet_species && (
                          <p className="truncate text-xs text-stone-500 dark:text-stone-400">
                            {labelize(c.pet_species)}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-stone-500 dark:text-stone-400">
                    {c.owner_name ?? '—'}
                  </td>
                  <td className="px-5 py-4 text-stone-500 dark:text-stone-400">
                    {c.vet_name ?? 'Unassigned'}
                  </td>
                  <td className="px-5 py-4 text-stone-500 dark:text-stone-400">
                    {formatDateTime(c.apt_scheduled_at)}
                  </td>
                  <td className="px-5 py-4 text-stone-500 dark:text-stone-400">
                    {labelize(c.apt_type)}
                  </td>
                  <td className="px-5 py-4">
                    <AppointmentStatusBadge status={c.apt_status} />
                  </td>
                  <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      {canStart && (
                        <button
                          className="rounded-md bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-800"
                          onClick={() => onStart(c.apt_id)}
                          type="button"
                        >
                          Start
                        </button>
                      )}
                      <button
                        aria-label={`View ${c.pet_name}`}
                        className="rounded-lg px-3 py-1.5 text-amber-700 transition hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20"
                        onClick={() => onView(c.apt_id)}
                        type="button"
                      >
                        <svg className="size-5 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
                          <path
                            fillRule="evenodd"
                            clipRule="evenodd"
                            d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 010-1.113zM17.25 12a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0z"
                          />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {consultations.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-stone-500 dark:text-stone-400">
                  No consultations found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

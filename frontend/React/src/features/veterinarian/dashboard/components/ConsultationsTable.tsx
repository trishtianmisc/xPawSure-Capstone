import type { Consultation } from '../types/veterinarian.types'

interface ConsultationsTableProps {
  consultations: Consultation[]
  activeTab: string
  onView: (id: string) => void
  onStart: (id: string) => void
}

const STATUS_STYLES: Record<Consultation['status'], string> = {
  COMPLETED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  UPCOMING: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  TODAY: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

export function ConsultationsTable({ consultations, activeTab, onView, onStart }: ConsultationsTableProps) {
  const filtered = consultations.filter((c) => {
    if (activeTab === 'Upcoming') return c.status === 'UPCOMING'
    if (activeTab === 'Today') return c.status === 'TODAY'
    if (activeTab === 'Completed') return c.status === 'COMPLETED'
    if (activeTab === 'Cancelled') return c.status === 'CANCELLED'
    return true
  })

  return (
    <div className="overflow-x-auto rounded-md border border-stone-200 bg-white shadow-sm dark:border-stone-700 dark:bg-stone-800">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-stone-200 dark:border-stone-700">
            <th className="px-6 py-3 font-semibold text-stone-500 dark:text-stone-400">Pet name</th>
            <th className="px-6 py-3 font-semibold text-stone-500 dark:text-stone-400">Breed</th>
            <th className="px-6 py-3 font-semibold text-stone-500 dark:text-stone-400">Date</th>
            <th className="px-6 py-3 font-semibold text-stone-500 dark:text-stone-400">Time</th>
            <th className="px-6 py-3 font-semibold text-stone-500 dark:text-stone-400">Status</th>
            <th className="px-6 py-3 font-semibold text-stone-500 dark:text-stone-400">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((c) => (
            <tr key={c.id} className="border-b border-stone-100 last:border-0 dark:border-stone-700/50">
              <td className="px-6 py-4 font-medium text-stone-900 dark:text-stone-200">{c.pet_name}</td>
              <td className="px-6 py-4 text-stone-500 dark:text-stone-400">{c.breed}</td>
              <td className="px-6 py-4 text-stone-500 dark:text-stone-400">{c.date}</td>
              <td className="px-6 py-4 text-stone-500 dark:text-stone-400">{c.time}</td>
              <td className="px-6 py-4">
                <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[c.status]}`}>
                  {c.status.charAt(0) + c.status.slice(1).toLowerCase()}
                </span>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  {c.status === 'TODAY' && (
                    <button
                      className="rounded-md bg-amber-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-950"
                      onClick={() => onStart(c.id)}
                      type="button"
                    >
                      Start
                    </button>
                  )}
                  <button
                    className="rounded-md border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:bg-stone-50 dark:border-stone-600 dark:text-stone-300 dark:hover:bg-stone-700"
                    onClick={() => onView(c.id)}
                    type="button"
                  >
                    View
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={6} className="px-6 py-12 text-center text-stone-500 dark:text-stone-400">
                No consultations found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

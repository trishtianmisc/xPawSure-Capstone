import { ROUTE_OPTIONS } from '../constants/prescription'
import type { VetPrescriptionInfo } from '../types/dashboard.types'

function routeLabel(value: string): string {
  return ROUTE_OPTIONS.find((option) => option.value === value)?.label ?? value
}

export function PrescriptionSummary({ prescription }: { prescription: VetPrescriptionInfo }) {
  return (
    <div className="mb-6 rounded-md border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-700 dark:bg-stone-800">
      <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
        Prescription
      </h2>

      {prescription.instructions && (
        <p className="mb-4 rounded-md border border-stone-200 bg-stone-50 p-3 text-sm text-stone-700 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300">
          {prescription.instructions}
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-stone-200 dark:border-stone-800">
              <th className="py-2 pr-4 font-semibold text-stone-500 dark:text-stone-400">Medicine</th>
              <th className="py-2 pr-4 font-semibold text-stone-500 dark:text-stone-400">Generic</th>
              <th className="py-2 pr-4 font-semibold text-stone-500 dark:text-stone-400">Dosage</th>
              <th className="py-2 pr-4 font-semibold text-stone-500 dark:text-stone-400">Frequency</th>
              <th className="py-2 pr-4 font-semibold text-stone-500 dark:text-stone-400">Duration</th>
              <th className="py-2 font-semibold text-stone-500 dark:text-stone-400">Route</th>
            </tr>
          </thead>
          <tbody>
            {prescription.items.map((item) => (
              <tr key={item.id} className="border-b border-stone-100 last:border-0 dark:border-stone-800/50">
                <td className="py-2 pr-4 font-medium text-stone-900 dark:text-stone-100">
                  {item.medicine_name}
                </td>
                <td className="py-2 pr-4 text-stone-600 dark:text-stone-400">
                  {item.generic_name ?? '—'}
                </td>
                <td className="py-2 pr-4 text-stone-600 dark:text-stone-400">{item.dosage}</td>
                <td className="py-2 pr-4 text-stone-600 dark:text-stone-400">{item.frequency}</td>
                <td className="py-2 pr-4 text-stone-600 dark:text-stone-400">{item.duration}</td>
                <td className="py-2 text-stone-600 dark:text-stone-400">{routeLabel(item.route)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

import { ROUTE_OPTIONS } from '../constants/prescription'
import type { VetPrescriptionInfo } from '../types/dashboard.types'
import { DetailCell, DetailSection } from './DetailSection'

function routeLabel(value: string): string {
  return ROUTE_OPTIONS.find((option) => option.value === value)?.label ?? value
}

interface PrescriptionSummaryProps {
  prescription: VetPrescriptionInfo
  onPreview?: () => void
}

export function PrescriptionSummary({ prescription, onPreview }: PrescriptionSummaryProps) {
  return (
    <DetailSection
      action={
        onPreview ? (
          <button
            className="rounded-md bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-800"
            onClick={onPreview}
            type="button"
          >
            Preview PDF
          </button>
        ) : null
      }
      title="Prescription"
    >
      {prescription.instructions && (
        <DetailCell label="Instructions" value={prescription.instructions} />
      )}

      <div className="p-4">
        <p className="text-xs text-stone-500 dark:text-stone-400">Medicines</p>
        <div className="mt-2 overflow-x-auto">
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
    </DetailSection>
  )
}

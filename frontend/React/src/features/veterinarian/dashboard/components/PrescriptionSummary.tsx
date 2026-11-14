import { useState } from 'react'

import { Modal } from '../../../../components/ui'
import { ROUTE_OPTIONS } from '../constants/prescription'
import type { VetPrescriptionInfo } from '../types/dashboard.types'
import type { PrescriptionItem } from '../types/veterinarian.types'
import { DetailCell, DetailSection } from './DetailSection'

function routeLabel(value: string): string {
  return ROUTE_OPTIONS.find((option) => option.value === value)?.label ?? value
}

interface PrescriptionItemsTableProps {
  items: PrescriptionItem[]
  onRowClick?: (item: PrescriptionItem) => void
}

export function PrescriptionItemsTable({ items, onRowClick }: PrescriptionItemsTableProps) {
  return (
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
          {items.map((item) => (
            <tr
              aria-label={onRowClick ? `View ${item.medicine_name} details` : undefined}
              className={`border-b border-stone-100 last:border-0 dark:border-stone-800/50 ${
                onRowClick
                  ? 'cursor-pointer transition hover:bg-amber-50/60 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-amber-700 dark:hover:bg-amber-900/10'
                  : ''
              }`}
              key={item.id}
              onClick={onRowClick ? () => onRowClick(item) : undefined}
              onKeyDown={
                onRowClick
                  ? (event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        onRowClick(item)
                      }
                    }
                  : undefined
              }
              tabIndex={onRowClick ? 0 : undefined}
            >
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
  )
}

function MedicineDetailTable({ item }: { item: PrescriptionItem }) {
  return (
    <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-stone-200 dark:border-stone-700">
      <table className="w-full table-fixed border-collapse text-left">
        <colgroup>
          <col className="w-1/6" />
          <col className="w-1/6" />
          <col className="w-1/6" />
          <col className="w-1/6" />
          <col className="w-1/6" />
          <col className="w-1/6" />
        </colgroup>
        <tbody className="divide-y divide-stone-200 dark:divide-stone-700">
          <tr>
            <td className="border-r border-stone-200 px-4 py-3 align-top dark:border-stone-700" colSpan={3}>
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                Medicine name
              </p>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm text-stone-800 dark:text-stone-200">
                {item.medicine_name}
              </p>
            </td>
            <td className="px-4 py-3 align-top" colSpan={3}>
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                Generic name
              </p>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm text-stone-800 dark:text-stone-200">
                {item.generic_name ?? '—'}
              </p>
            </td>
          </tr>
          <tr>
            <td className="border-r border-stone-200 px-4 py-3 align-top dark:border-stone-700" colSpan={2}>
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                Dosage
              </p>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm text-stone-800 dark:text-stone-200">
                {item.dosage}
              </p>
            </td>
            <td className="border-r border-stone-200 px-4 py-3 align-top dark:border-stone-700" colSpan={2}>
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                Frequency
              </p>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm text-stone-800 dark:text-stone-200">
                {item.frequency}
              </p>
            </td>
            <td className="px-4 py-3 align-top" colSpan={2}>
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                Quantity
              </p>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm text-stone-800 dark:text-stone-200">
                {item.quantity ?? '—'}
              </p>
            </td>
          </tr>
          <tr>
            <td className="border-r border-stone-200 px-4 py-3 align-top dark:border-stone-700" colSpan={3}>
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                Duration
              </p>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm text-stone-800 dark:text-stone-200">
                {item.duration}
              </p>
            </td>
            <td className="px-4 py-3 align-top" colSpan={3}>
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                Route
              </p>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm text-stone-800 dark:text-stone-200">
                {routeLabel(item.route)}
              </p>
            </td>
          </tr>
          <tr>
            <td className="px-4 py-3 align-top" colSpan={6}>
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                Instructions
              </p>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm text-stone-800 dark:text-stone-200">
                {item.notes ?? '—'}
              </p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

interface PrescriptionSummaryProps {
  prescription: VetPrescriptionInfo
  onPreview?: () => void
}

export function PrescriptionSummary({ prescription, onPreview }: PrescriptionSummaryProps) {
  const [selectedItem, setSelectedItem] = useState<PrescriptionItem | null>(null)

  return (
    <>
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
          <div className="mt-2">
            <PrescriptionItemsTable items={prescription.items} onRowClick={setSelectedItem} />
          </div>
        </div>
      </DetailSection>

      <Modal
        onClose={() => setSelectedItem(null)}
        open={selectedItem !== null}
        title="Prescription details"
        widthClassName="max-w-2xl"
      >
        {selectedItem && (
          <>
            <p className="text-sm leading-6 text-stone-600 dark:text-stone-300">
              Review the medication details and instructions.
            </p>
            <div className="mt-4">
              <MedicineDetailTable item={selectedItem} />
            </div>
          </>
        )}
      </Modal>
    </>
  )
}

import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import type { PrescriptionItem } from '../types/veterinarian.types'

const MOCK_PRESCRIPTIONS: PrescriptionItem[] = [
  { id: '1', medicine_name: 'Fluconazole', generic_name: 'Fluconazole', dosage: '5ml', route_of_administration: 'Topical', frequency: 'Every other day', duration: '2 weeks' },
  { id: '2', medicine_name: 'Itraconazole', generic_name: 'Itraconazole', dosage: '5ml', route_of_administration: 'Oral', frequency: 'Every other day', duration: '2 weeks' },
]

export function PrescriptionPage() {
  const navigate = useNavigate()
  const { id } = useParams()

  const [form, setForm] = useState({
    medicine_name: '',
    generic_name: '',
    dosage: '',
    route_of_administration: '',
    frequency: '',
    duration: '',
    special_instructions: '',
  })

  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>(MOCK_PRESCRIPTIONS)

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleAdd() {
    if (!form.medicine_name) return
    const newItem: PrescriptionItem = {
      id: String(Date.now()),
      medicine_name: form.medicine_name,
      generic_name: form.generic_name,
      dosage: form.dosage,
      route_of_administration: form.route_of_administration,
      frequency: form.frequency,
      duration: form.duration,
    }
    setPrescriptions((prev) => [...prev, newItem])
    setForm({ medicine_name: '', generic_name: '', dosage: '', route_of_administration: '', frequency: '', duration: '', special_instructions: '' })
  }

  function handleDelete(itemId: string) {
    setPrescriptions((prev) => prev.filter((p) => p.id !== itemId))
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <button
        className="flex items-center gap-1 text-sm font-semibold text-stone-600 transition hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
        onClick={() => navigate(`/veterinarian/consultations/${id}`)}
        type="button"
      >
        <svg className="size-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      <h2 className="text-2xl font-extrabold text-stone-900 dark:text-stone-100">Prescription</h2>

      <div className="rounded-md border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-700 dark:bg-stone-800 space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-semibold text-stone-700 dark:text-stone-300">Medicine Name</label>
            <input
              className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
              onChange={(e) => handleChange('medicine_name', e.target.value)}
              value={form.medicine_name}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-stone-700 dark:text-stone-300">Generic Name</label>
            <input
              className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
              onChange={(e) => handleChange('generic_name', e.target.value)}
              value={form.generic_name}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-stone-700 dark:text-stone-300">Dosage</label>
            <input
              className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
              onChange={(e) => handleChange('dosage', e.target.value)}
              value={form.dosage}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-semibold text-stone-700 dark:text-stone-300">Route of Administration</label>
            <input
              className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
              onChange={(e) => handleChange('route_of_administration', e.target.value)}
              value={form.route_of_administration}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-stone-700 dark:text-stone-300">Frequency</label>
            <input
              className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
              onChange={(e) => handleChange('frequency', e.target.value)}
              value={form.frequency}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-stone-700 dark:text-stone-300">Duration</label>
            <input
              className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
              onChange={(e) => handleChange('duration', e.target.value)}
              value={form.duration}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-stone-700 dark:text-stone-300">Special Instructions</label>
          <textarea
            className="h-20 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
            onChange={(e) => handleChange('special_instructions', e.target.value)}
            value={form.special_instructions}
          />
        </div>

        <div className="flex justify-end">
          <button
            className="rounded-md bg-amber-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-amber-950"
            onClick={handleAdd}
            type="button"
          >
            Add
          </button>
        </div>
      </div>

      {prescriptions.length > 0 && (
        <div className="overflow-x-auto rounded-md border border-stone-200 bg-white shadow-sm dark:border-stone-700 dark:bg-stone-800">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-stone-200 dark:border-stone-800">
                <th className="px-6 py-3 font-semibold text-stone-500 dark:text-stone-400">Medicine</th>
                <th className="px-6 py-3 font-semibold text-stone-500 dark:text-stone-400">Generic</th>
                <th className="px-6 py-3 font-semibold text-stone-500 dark:text-stone-400">Dosage</th>
                <th className="px-6 py-3 font-semibold text-stone-500 dark:text-stone-400">Frequency</th>
                <th className="px-6 py-3 font-semibold text-stone-500 dark:text-stone-400">Duration</th>
                <th className="px-6 py-3 font-semibold text-stone-500 dark:text-stone-400">Route of Administration</th>
                <th className="px-6 py-3 font-semibold text-stone-500 dark:text-stone-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {prescriptions.map((p) => (
                <tr key={p.id} className="border-b border-stone-100 last:border-0 dark:border-stone-800/50">
                  <td className="px-6 py-4 font-medium text-stone-900 dark:text-stone-100">{p.medicine_name}</td>
                  <td className="px-6 py-4 text-stone-600 dark:text-stone-400">{p.generic_name}</td>
                  <td className="px-6 py-4 text-stone-600 dark:text-stone-400">{p.dosage}</td>
                  <td className="px-6 py-4 text-stone-600 dark:text-stone-400">{p.frequency}</td>
                  <td className="px-6 py-4 text-stone-600 dark:text-stone-400">{p.duration}</td>
                  <td className="px-6 py-4 text-stone-600 dark:text-stone-400">{p.route_of_administration}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button className="text-amber-700 hover:text-amber-900 dark:text-amber-400" type="button">
                        <svg className="size-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        className="text-red-500 hover:text-red-700"
                        onClick={() => handleDelete(p.id)}
                        type="button"
                      >
                        <svg className="size-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex justify-end gap-3">
        <button
          className="rounded-md border border-stone-300 px-5 py-2.5 text-sm font-semibold text-stone-700 transition hover:bg-stone-100 dark:border-stone-600 dark:text-stone-300 dark:hover:bg-stone-700"
          type="button"
        >
          Save Draft
        </button>
        <button
          className="rounded-md bg-amber-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-950"
          type="button"
        >
          Complete Consultation
        </button>
      </div>
    </div>
  )
}

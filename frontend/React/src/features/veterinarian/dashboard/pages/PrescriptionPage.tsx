import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { ROUTE_OPTIONS } from '../constants/prescription'
import { useAppointmentDetail, useSavePrescription } from '../hooks/useVetAppointments'
import type { VetAppointmentDetail } from '../types/dashboard.types'
import type { PrescriptionItem } from '../types/veterinarian.types'
import { apiErrorMessage } from '../../../../utils/error'

const EMPTY_FORM = {
  medicine_name: '',
  generic_name: '',
  dosage: '',
  route: '',
  frequency: '',
  duration: '',
  notes: '',
}

function routeLabel(value: string): string {
  return ROUTE_OPTIONS.find((option) => option.value === value)?.label ?? value
}

export function PrescriptionPage() {
  const { id } = useParams()
  const { data: appointment, isLoading, error } = useAppointmentDetail(id ?? '')

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl animate-pulse space-y-4">
        <div className="h-8 w-40 rounded-md bg-stone-200 dark:bg-stone-700" />
        <div className="h-64 rounded-md bg-stone-200 dark:bg-stone-700" />
        <div className="h-40 rounded-md bg-stone-200 dark:bg-stone-700" />
      </div>
    )
  }

  if (error || !appointment) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
            Appointment not found
          </h2>
          <button
            className="mt-4 rounded-md bg-amber-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-amber-950"
            onClick={() => window.history.back()}
            type="button"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return <PrescriptionForm appointment={appointment} />
}

function PrescriptionForm({ appointment }: { appointment: VetAppointmentDetail }) {
  const navigate = useNavigate()
  const aptId = appointment.apt_id
  const savePrescription = useSavePrescription()

  const [form, setForm] = useState(EMPTY_FORM)
  const [rows, setRows] = useState<PrescriptionItem[]>(() =>
    (appointment.prescription?.items ?? []).map((item) => ({ ...item })),
  )
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleAdd() {
    const medicineName = form.medicine_name.trim()
    if (!medicineName) {
      setError('Medicine name is required.')
      return
    }
    if (!form.route) {
      setError('Please select a route of administration.')
      return
    }
    setError('')

    if (editingId) {
      setRows((prev) =>
        prev.map((row) =>
          row.id === editingId
            ? {
                ...row,
                medicine_name: medicineName,
                generic_name: form.generic_name.trim() || null,
                dosage: form.dosage,
                route: form.route,
                frequency: form.frequency,
                duration: form.duration,
                notes: form.notes.trim() || null,
              }
            : row,
        ),
      )
      setEditingId(null)
    } else {
      setRows((prev) => [
        ...prev,
        {
          id: `local-${Date.now()}`,
          medicine_name: medicineName,
          generic_name: form.generic_name.trim() || null,
          dosage: form.dosage,
          route: form.route,
          frequency: form.frequency,
          duration: form.duration,
          quantity: null,
          notes: form.notes.trim() || null,
        },
      ])
    }

    setForm(EMPTY_FORM)
  }

  function handleEdit(row: PrescriptionItem) {
    setForm({
      medicine_name: row.medicine_name,
      generic_name: row.generic_name ?? '',
      dosage: row.dosage,
      route: row.route,
      frequency: row.frequency,
      duration: row.duration,
      notes: row.notes ?? '',
    })
    setEditingId(row.id)
    setError('')
  }

  function handleDelete(itemId: string) {
    setRows((prev) => prev.filter((p) => p.id !== itemId))
    if (editingId === itemId) {
      setEditingId(null)
      setForm(EMPTY_FORM)
    }
  }

  async function handleComplete() {
    if (rows.length === 0) {
      setError('Add at least one medication before completing.')
      return
    }
    if (!appointment.consultation) {
      setError('Save the consultation first before adding a prescription.')
      return
    }
    setError('')

    try {
      await savePrescription.mutateAsync({
        consultation_id: appointment.consultation.id,
        instructions: '',
        items: rows.map((row) => ({
          medicine_name: row.medicine_name,
          generic_name: row.generic_name ?? '',
          dosage: row.dosage,
          frequency: row.frequency,
          duration: row.duration,
          route: row.route,
          notes: row.notes ?? '',
        })),
      })
      navigate(`/veterinarian/appointments/${aptId}`)
    } catch (err) {
      setError(apiErrorMessage(err))
    }
  }

  const inputClass =
    'w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100'

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <button
        className="flex items-center gap-1 text-sm font-semibold text-stone-600 transition hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
        onClick={() => navigate(`/veterinarian/consultations/${aptId}`)}
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
              className={inputClass}
              onChange={(e) => handleChange('medicine_name', e.target.value)}
              value={form.medicine_name}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-stone-700 dark:text-stone-300">Generic Name</label>
            <input
              className={inputClass}
              onChange={(e) => handleChange('generic_name', e.target.value)}
              value={form.generic_name}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-stone-700 dark:text-stone-300">Dosage</label>
            <input
              className={inputClass}
              onChange={(e) => handleChange('dosage', e.target.value)}
              value={form.dosage}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-semibold text-stone-700 dark:text-stone-300">Route of Administration</label>
            <select
              className={inputClass}
              onChange={(e) => handleChange('route', e.target.value)}
              value={form.route}
            >
              <option value="">Select route</option>
              {ROUTE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-stone-700 dark:text-stone-300">Frequency</label>
            <input
              className={inputClass}
              onChange={(e) => handleChange('frequency', e.target.value)}
              value={form.frequency}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-stone-700 dark:text-stone-300">Duration</label>
            <input
              className={inputClass}
              onChange={(e) => handleChange('duration', e.target.value)}
              value={form.duration}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-stone-700 dark:text-stone-300">Special Instructions</label>
          <textarea
            className="h-20 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
            onChange={(e) => handleChange('notes', e.target.value)}
            value={form.notes}
          />
        </div>

        <div className="flex justify-end">
          <button
            className="rounded-md bg-amber-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-amber-950"
            onClick={handleAdd}
            type="button"
          >
            {editingId ? 'Update' : 'Add'}
          </button>
        </div>
      </div>

      {rows.length > 0 && (
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
              {rows.map((p) => (
                <tr key={p.id} className="border-b border-stone-100 last:border-0 dark:border-stone-800/50">
                  <td className="px-6 py-4 font-medium text-stone-900 dark:text-stone-100">{p.medicine_name}</td>
                  <td className="px-6 py-4 text-stone-600 dark:text-stone-400">{p.generic_name ?? '—'}</td>
                  <td className="px-6 py-4 text-stone-600 dark:text-stone-400">{p.dosage}</td>
                  <td className="px-6 py-4 text-stone-600 dark:text-stone-400">{p.frequency}</td>
                  <td className="px-6 py-4 text-stone-600 dark:text-stone-400">{p.duration}</td>
                  <td className="px-6 py-4 text-stone-600 dark:text-stone-400">{routeLabel(p.route)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        className="text-amber-700 hover:text-amber-900 dark:text-amber-400"
                        onClick={() => handleEdit(p)}
                        type="button"
                      >
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

      {error && <p className="text-right text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex justify-end gap-3">
        <button
          className="rounded-md bg-amber-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-950 disabled:opacity-50"
          disabled={savePrescription.isPending}
          onClick={handleComplete}
          type="button"
        >
          {savePrescription.isPending ? 'Saving…' : 'Complete Consultation'}
        </button>
      </div>
    </div>
  )
}

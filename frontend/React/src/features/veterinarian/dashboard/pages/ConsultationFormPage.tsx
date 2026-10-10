import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { DISEASE_OPTIONS, OTHER_DISEASE, isSkinDisease } from '../constants/diseases'
import { useAppointmentDetail, useSaveConsultation } from '../hooks/useVetAppointments'
import type { VetAppointmentDetail } from '../types/dashboard.types'
import { apiErrorMessage } from '../../../../utils/error'

function ageFromBirthDate(birthDate: string | null): string {
  if (!birthDate) return ''
  const birth = new Date(birthDate)
  const now = new Date()
  let years = now.getFullYear() - birth.getFullYear()
  const monthDiff = now.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) years -= 1
  if (years < 1) return '<1 yr'
  return `${years} yr${years === 1 ? '' : 's'}`
}

function buildInitialForm(appointment: VetAppointmentDetail) {
  const stored = appointment.consultation?.diagnosis ?? ''
  const isKnownDisease = isSkinDisease(stored)

  return {
    chief_complaint: appointment.consultation?.chief_complaint ?? '',
    observations: appointment.consultation?.objective ?? '',
    diagnosis: isKnownDisease || !stored ? stored : OTHER_DISEASE,
    other_disease: isKnownDisease || !stored ? '' : stored,
    notes: appointment.consultation?.notes ?? '',
  }
}

export function ConsultationFormPage() {
  const { id } = useParams()
  const { data: appointment, isLoading, error } = useAppointmentDetail(id ?? '')

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl animate-pulse space-y-4">
        <div className="h-24 rounded-md bg-stone-200 dark:bg-stone-700" />
        <div className="h-40 rounded-md bg-stone-200 dark:bg-stone-700" />
        <div className="h-64 rounded-md bg-stone-200 dark:bg-stone-700" />
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

  return <ConsultationForm appointment={appointment} />
}

function ConsultationForm({ appointment }: { appointment: VetAppointmentDetail }) {
  const navigate = useNavigate()
  const aptId = appointment.apt_id
  const saveConsultation = useSaveConsultation()

  const [form, setForm] = useState(() => buildInitialForm(appointment))
  const [error, setError] = useState('')

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleDiagnosisChange(value: string) {
    setForm((prev) => ({
      ...prev,
      diagnosis: value,
      other_disease: value === OTHER_DISEASE ? prev.other_disease : '',
    }))
  }

  async function handleNext() {
    const selection = form.diagnosis
    if (!selection) {
      setError('Please select a diagnosis.')
      return
    }

    const diagnosis = selection === OTHER_DISEASE ? form.other_disease.trim() : selection
    if (!diagnosis) {
      setError('Please enter the disease name.')
      return
    }

    setError('')
    try {
      await saveConsultation.mutateAsync({
        aptId,
        conId: appointment.consultation?.id ?? null,
        payload: {
          chief_complaint: form.chief_complaint,
          objective: form.observations,
          diagnosis,
          notes: form.notes,
        },
      })
      navigate(`/veterinarian/consultations/${aptId}/prescription`)
    } catch (err) {
      setError(apiErrorMessage(err))
    }
  }

  const readOnlyInputClass =
    'w-full rounded-md border border-stone-300 bg-stone-50 px-3 py-2 text-sm text-stone-900 focus:outline-none dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100'

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <div className="rounded-md bg-gradient-to-br from-amber-900 to-amber-950 p-7 sm:p-9">
          <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Consultation Form
          </h1>
          <p className="mt-2 max-w-xl text-base text-amber-200/80">
            Record pet information and consultation details.
          </p>
        </div>
      </div>

      <h2 className="mb-4 text-base font-bold text-stone-900 dark:text-stone-100">Pet Information</h2>

      <div className="mb-8 rounded-md border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-700 dark:bg-stone-800">
        <div className="flex items-start gap-6">
          <div className="grid size-20 place-items-center rounded-md bg-stone-200 dark:bg-stone-700">
            <svg className="size-8 text-stone-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>

          <div className="flex-1 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-semibold text-stone-700 dark:text-stone-300">Pet Name</label>
              <input
                className={readOnlyInputClass}
                readOnly
                value={appointment.pet_name}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-stone-700 dark:text-stone-300">Breed</label>
              <input
                className={readOnlyInputClass}
                readOnly
                value={appointment.pet_breed ?? ''}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-stone-700 dark:text-stone-300">Age</label>
              <input
                className={readOnlyInputClass}
                readOnly
                value={ageFromBirthDate(appointment.pet_birth_date)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-stone-700 dark:text-stone-300">Owner Name</label>
              <input
                className={readOnlyInputClass}
                readOnly
                value={appointment.owner_name ?? ''}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-semibold text-stone-700 dark:text-stone-300">Contact Info of Owner</label>
              <input
                className={readOnlyInputClass}
                readOnly
                value={appointment.owner_phone ?? ''}
              />
            </div>
          </div>
        </div>
      </div>

      <h2 className="mb-4 text-base font-bold text-stone-900 dark:text-stone-100">Consultation Form</h2>

      <div className="rounded-md border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-700 dark:bg-stone-800 space-y-5">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-semibold text-stone-700 dark:text-stone-300">Chief complaint</label>
            <textarea
              className="h-28 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
              onChange={(e) => handleChange('chief_complaint', e.target.value)}
              value={form.chief_complaint}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-stone-700 dark:text-stone-300">Observations</label>
            <textarea
              className="h-28 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
              onChange={(e) => handleChange('observations', e.target.value)}
              value={form.observations}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-semibold text-stone-700 dark:text-stone-300">Diagnosis</label>
            <select
              className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
              onChange={(e) => handleDiagnosisChange(e.target.value)}
              value={form.diagnosis}
            >
              <option value="">Select disease</option>
              {DISEASE_OPTIONS.map((disease) => (
                <option key={disease} value={disease}>
                  {disease}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-stone-700 dark:text-stone-300">Other Disease</label>
            <input
              className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100 dark:disabled:bg-stone-800"
              disabled={form.diagnosis !== OTHER_DISEASE}
              onChange={(e) => handleChange('other_disease', e.target.value)}
              value={form.other_disease}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-stone-700 dark:text-stone-300">Notes</label>
          <textarea
            className="h-24 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
            onChange={(e) => handleChange('notes', e.target.value)}
            value={form.notes}
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <div className="flex justify-end">
          <button
            className="rounded-md bg-amber-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-950 disabled:opacity-50"
            disabled={saveConsultation.isPending}
            onClick={handleNext}
            type="button"
          >
            {saveConsultation.isPending ? 'Saving…' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}

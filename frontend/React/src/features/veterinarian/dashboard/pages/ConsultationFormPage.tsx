import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { PageHero } from '../../../receptionist/components/PageHero'
import { OTHER_DISEASE, isSkinDisease } from '../constants/diseases'
import { DiseaseCombobox } from '../components/DiseaseCombobox'
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

function toLocalDateInputValue(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function minFollowUpDate(scheduledAt: string): string {
  const scheduled = new Date(scheduledAt)
  const dayAfter = new Date(
    scheduled.getFullYear(),
    scheduled.getMonth(),
    scheduled.getDate() + 1,
  )
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return toLocalDateInputValue(dayAfter > today ? dayAfter : today)
}

function buildInitialForm(appointment: VetAppointmentDetail) {
  const stored = appointment.consultation?.diagnosis ?? ''
  const isKnownDisease = isSkinDisease(stored)

  return {
    chief_complaint: appointment.consultation?.chief_complaint ?? '',
    observations: appointment.consultation?.objective ?? '',
    diagnosis: isKnownDisease || !stored ? stored : OTHER_DISEASE,
    custom_diagnosis: isKnownDisease || !stored ? '' : stored,
    specific_disease: appointment.consultation?.specific_disease ?? '',
    notes: appointment.consultation?.notes ?? '',
    follow_up_required: appointment.consultation?.follow_up_required ?? false,
    follow_up_target_date: appointment.consultation?.follow_up_target_date ?? '',
  }
}

export function ConsultationFormPage() {
  const { id } = useParams()
  const { data: appointment, isLoading, error } = useAppointmentDetail(id ?? '')

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl animate-pulse space-y-4 p-6">
        <div className="h-24 rounded-md bg-stone-200 dark:bg-stone-700" />
        <div className="h-40 rounded-md bg-stone-200 dark:bg-stone-700" />
        <div className="h-64 rounded-md bg-stone-200 dark:bg-stone-700" />
      </div>
    )
  }

  if (error || !appointment) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6">
        <div className="text-center">
          <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
            Appointment not found
          </h2>
          <button
            className="mt-4 rounded-md bg-amber-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-amber-800"
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
    setForm((prev) => ({ ...prev, diagnosis: value }))
  }

  function handleFollowUpToggle() {
    setForm((prev) => {
      const followUpRequired = !prev.follow_up_required
      return {
        ...prev,
        follow_up_required: followUpRequired,
        follow_up_target_date: followUpRequired ? prev.follow_up_target_date : '',
      }
    })
  }

  async function handleNext() {
    const selection = form.diagnosis
    if (!selection) {
      setError('Please select a diagnosis.')
      return
    }

    const diagnosis = selection === OTHER_DISEASE ? form.custom_diagnosis.trim() : selection
    if (!diagnosis) {
      setError('Please enter the disease name.')
      return
    }

    if (form.follow_up_required && !form.follow_up_target_date) {
      setError('Please select a preferred follow-up date.')
      return
    }

    if (
      form.follow_up_required
      && form.follow_up_target_date < minFollowUpDate(appointment.apt_scheduled_at)
    ) {
      setError('Preferred follow-up date must be after the appointment date and cannot be in the past.')
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
          specific_disease: form.specific_disease.trim(),
          notes: form.notes,
          follow_up_required: form.follow_up_required,
          follow_up_target_date: form.follow_up_required
            ? form.follow_up_target_date
            : null,
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
    <div className="p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <PageHero
            title="Consultation Form"
            subtitle="Record pet information and consultation details."
          />
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
            <label
              className="mb-1 block text-sm font-semibold text-stone-700 dark:text-stone-300"
              htmlFor="consultation-diagnosis"
            >
              Diagnosis
            </label>
            <DiseaseCombobox
              customValue={form.custom_diagnosis}
              id="consultation-diagnosis"
              onCustomChange={(value) => handleChange('custom_diagnosis', value)}
              onSelect={handleDiagnosisChange}
              value={form.diagnosis}
            />
          </div>
          <div>
            <label
              className="mb-1 block text-sm font-semibold text-stone-700 dark:text-stone-300"
              htmlFor="consultation-specific-disease"
            >
              Specific Disease
            </label>
            <input
              className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500"
              id="consultation-specific-disease"
              onChange={(e) => handleChange('specific_disease', e.target.value)}
              placeholder="Optional"
              value={form.specific_disease}
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

        <div className="rounded-md border border-stone-200 bg-stone-50 p-4 dark:border-stone-700 dark:bg-stone-900/40">
          <div className="flex items-start justify-between gap-4">
            <div>
              <label
                className="block text-sm font-semibold text-stone-700 dark:text-stone-300"
                htmlFor="consultation-follow-up-required"
              >
                Needs follow-up consultation
              </label>
              <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                Recommend a follow-up visit for this pet.
              </p>
            </div>
            <button
              aria-checked={form.follow_up_required}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
                form.follow_up_required
                  ? 'bg-amber-700'
                  : 'bg-stone-300 dark:bg-stone-600'
              }`}
              id="consultation-follow-up-required"
              onClick={handleFollowUpToggle}
              role="switch"
              type="button"
            >
              <span
                className={`inline-block size-5 rounded-full bg-white shadow transition ${
                  form.follow_up_required ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {form.follow_up_required && (
            <div className="mt-4 max-w-xs">
              <label
                className="mb-1 block text-sm font-semibold text-stone-700 dark:text-stone-300"
                htmlFor="consultation-follow-up-date"
              >
                Preferred follow-up date
              </label>
              <input
                className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
                id="consultation-follow-up-date"
                min={minFollowUpDate(appointment.apt_scheduled_at)}
                onChange={(e) => handleChange('follow_up_target_date', e.target.value)}
                type="date"
                value={form.follow_up_target_date}
              />
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <div className="flex justify-end">
          <button
            className="rounded-md bg-amber-700 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-800 disabled:opacity-50"
            disabled={saveConsultation.isPending}
            onClick={handleNext}
            type="button"
          >
            {saveConsultation.isPending ? 'Saving…' : 'Next'}
          </button>
        </div>
      </div>
      </div>
    </div>
  )
}

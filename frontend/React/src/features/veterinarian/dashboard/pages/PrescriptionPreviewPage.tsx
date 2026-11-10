import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { PrescriptionPreviewDocument } from '../components/PrescriptionPreviewDocument'
import { useAppointmentDetail } from '../hooks/useVetAppointments'

export function PrescriptionPreviewPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: appointment, isLoading, error } = useAppointmentDetail(id ?? '')

  useEffect(() => {
    const root = document.documentElement
    const stamp = () => {
      if (root.classList.contains('dark')) {
        root.setAttribute('data-prescription-print-dark', 'true')
        root.classList.remove('dark')
      }
    }
    const restore = () => {
      if (root.hasAttribute('data-prescription-print-dark')) {
        root.classList.add('dark')
        root.removeAttribute('data-prescription-print-dark')
      }
    }
    globalThis.window.addEventListener('beforeprint', stamp)
    globalThis.window.addEventListener('afterprint', restore)
    return () => {
      globalThis.window.removeEventListener('beforeprint', stamp)
      globalThis.window.removeEventListener('afterprint', restore)
      restore()
    }
  }, [])

  useEffect(() => {
    if (!appointment?.prescription) return
    const previousTitle = document.title
    document.title = `Prescription - ${appointment.pet_name}`
    return () => {
      document.title = previousTitle
    }
  }, [appointment?.pet_name, appointment?.prescription])

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl animate-pulse space-y-4 p-6">
        <div className="h-6 w-48 rounded-md bg-stone-200 dark:bg-stone-700" />
        <div className="h-24 rounded-md bg-stone-200 dark:bg-stone-700" />
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
            onClick={() => navigate('/veterinarian/dashboard')}
            type="button"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  if (!appointment.prescription) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6">
        <div className="max-w-md rounded-md border border-stone-200 bg-white p-6 text-center shadow-sm dark:border-stone-700 dark:bg-stone-800">
          <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
            No prescription available
          </h2>
          <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
            Save the consultation and prescription before previewing it.
          </p>
          <button
            className="mt-4 rounded-md bg-amber-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-amber-800"
            onClick={() => navigate(`/veterinarian/appointments/${appointment.apt_id}`)}
            type="button"
          >
            Back to Appointment
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-stone-100 p-6 dark:bg-stone-950 print:bg-white print:p-0">
      <div className="prescription-preview-toolbar mx-auto mb-4 flex max-w-[210mm] items-center justify-between gap-3 print:hidden">
        <button
          className="flex items-center gap-1 text-sm font-semibold text-stone-600 transition hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
          onClick={() => navigate(`/veterinarian/appointments/${appointment.apt_id}`)}
          type="button"
        >
          <svg className="size-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Appointment
        </button>

        <button
          className="rounded-md bg-amber-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-800"
          onClick={() => globalThis.window.print()}
          type="button"
        >
          Print / Save as PDF
        </button>
      </div>

      <PrescriptionPreviewDocument
        appointment={appointment}
        prescription={appointment.prescription}
      />
    </div>
  )
}

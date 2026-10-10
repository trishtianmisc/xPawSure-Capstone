import type { VetConsultationInfo } from '../types/dashboard.types'

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-start justify-between gap-6">
      <dt className="shrink-0 text-sm text-stone-500 dark:text-stone-400">{label}</dt>
      <dd className="text-right text-sm font-semibold text-stone-900 dark:text-stone-100">
        {value?.trim() ? value : '—'}
      </dd>
    </div>
  )
}

export function ConsultationSummary({ consultation }: { consultation: VetConsultationInfo }) {
  return (
    <div className="mb-6 rounded-md border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-700 dark:bg-stone-800">
      <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
        Consultation
      </h2>
      <dl className="space-y-3">
        <Row label="Diagnosis" value={consultation.diagnosis} />
        <Row label="Chief complaint" value={consultation.chief_complaint} />
        <Row label="Observations" value={consultation.objective} />
        <Row label="Notes" value={consultation.notes} />
        <Row label="Veterinarian" value={consultation.veterinarian} />
      </dl>
    </div>
  )
}

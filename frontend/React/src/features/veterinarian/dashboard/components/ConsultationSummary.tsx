import type { ScreeningSummary, VetConsultationInfo } from '../types/dashboard.types'
import { formatDate } from '../../../../utils/format'

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

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function matchesAiScreening(
  screening: ScreeningSummary | null | undefined,
  diagnosis: string | null | undefined,
): boolean {
  if (!screening?.disease || !diagnosis?.trim()) return false
  const disease = normalize(screening.disease)
  const vet = normalize(diagnosis)
  if (!disease || !vet) return false
  return vet === disease || vet.includes(disease) || disease.includes(vet)
}

export function ConsultationSummary({
  consultation,
  screening,
}: {
  consultation: VetConsultationInfo
  screening?: ScreeningSummary | null
}) {
  const aiMatch = matchesAiScreening(screening, consultation.diagnosis)

  return (
    <div className="mb-6 rounded-md border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-700 dark:bg-stone-800">
      <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
        Consultation
      </h2>
      <dl className="space-y-3">
        <Row label="Diagnosis" value={consultation.diagnosis} />
        {screening && (
          <div className="flex items-center justify-between gap-6">
            <dt className="shrink-0 text-sm text-stone-500 dark:text-stone-400">
              Diagnosis Agreement
            </dt>
            <dd>
              <span
                className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  aiMatch
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200'
                }`}
              >
                {aiMatch ? 'Matched' : 'Not matched'}
              </span>
            </dd>
          </div>
        )}
        <Row label="Chief complaint" value={consultation.chief_complaint} />
        <Row label="Observations" value={consultation.objective} />
        <Row label="Notes" value={consultation.notes} />
        <Row
          label="Follow-up"
          value={consultation.follow_up_required ? 'Needed' : 'Not needed'}
        />
        {consultation.follow_up_required && (
          <Row
            label="Preferred follow-up"
            value={formatDate(
              consultation.follow_up_target_date
                ? `${consultation.follow_up_target_date}T00:00:00`
                : null,
            )}
          />
        )}
        <Row label="Veterinarian" value={consultation.veterinarian} />
      </dl>
    </div>
  )
}

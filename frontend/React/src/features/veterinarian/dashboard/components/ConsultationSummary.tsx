import type { ReactNode } from 'react'

import type { ScreeningSummary, VetConsultationInfo } from '../types/dashboard.types'
import { formatDate } from '../../../../utils/format'
import { DetailCell, DetailRowGroup, DetailSection } from './DetailSection'

function displayValue(value: string | null | undefined): string {
  return value?.trim() ? value : '—'
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
  const preferredFollowUp = consultation.follow_up_target_date
    ? formatDate(`${consultation.follow_up_target_date}T00:00:00`)
    : null

  const cells: Array<{ label: string; value: ReactNode }> = [
    {
      label: 'Diagnosis',
      value: (
        <>
          {displayValue(consultation.diagnosis)}
          {consultation.specific_disease && (
            <span className="mt-1 block text-xs font-normal text-stone-500 dark:text-stone-400">
              Specific disease: {consultation.specific_disease}
            </span>
          )}
        </>
      ),
    },
    ...(screening
      ? [
          {
            label: 'Diagnosis Agreement',
            value: (
              <span
                className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  aiMatch
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200'
                }`}
              >
                {aiMatch ? 'Matched' : 'Not matched'}
              </span>
            ),
          },
        ]
      : []),
    {
      label: 'Chief complaint',
      value: displayValue(consultation.chief_complaint),
    },
    {
      label: 'Observations',
      value: displayValue(consultation.objective),
    },
    {
      label: 'Notes',
      value: displayValue(consultation.notes),
    },
    {
      label: 'Follow-up',
      value: (
        <>
          {consultation.follow_up_required ? 'Needed' : 'Not needed'}
          {consultation.follow_up_required && preferredFollowUp && (
            <span className="mt-1 block text-xs font-normal text-stone-500 dark:text-stone-400">
              Preferred follow-up: {preferredFollowUp}
            </span>
          )}
        </>
      ),
    },
    {
      label: 'Veterinarian',
      value: displayValue(consultation.veterinarian),
    },
  ]

  const rows: Array<Array<{ label: string; value: ReactNode }>> = []
  for (let index = 0; index < cells.length; index += 2) {
    rows.push(cells.slice(index, index + 2))
  }

  return (
    <DetailSection title="Consultation">
      {rows.map((row) => {
        const [first, second] = row
        return (
          <DetailRowGroup key={first.label}>
            <DetailCell
              className={second ? undefined : 'sm:col-span-2'}
              divider={Boolean(second)}
              label={first.label}
              value={first.value}
            />
            {second && <DetailCell label={second.label} value={second.value} />}
          </DetailRowGroup>
        )
      })}
    </DetailSection>
  )
}

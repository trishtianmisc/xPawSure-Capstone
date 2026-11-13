import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { Button, Card } from '../../../../components/ui'
import { apiErrorMessage } from '../../../../utils/error'
import { formatDate, formatTime } from '../../../../utils/format'
import { PageHero } from '../../../receptionist/components/PageHero'
import { usePetConsultationHistory } from '../hooks/useVetAppointments'
import type { VetConsultationHistoryItem } from '../types/dashboard.types'

function DetailRow({ label, value }: { label: string; value: string | null }) {
  if (!value?.trim()) return null
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
        {label}
      </dt>
      <dd className="mt-1 whitespace-pre-line text-sm text-stone-800 dark:text-stone-200">
        {value}
      </dd>
    </div>
  )
}

function ConsultationHistoryCard({ consultation }: { consultation: VetConsultationHistoryItem }) {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)
  const detailsId = `consultation-details-${consultation.id}`

  return (
    <Card padding="sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-stone-900 dark:text-stone-100">
            {consultation.diagnosis}
          </h2>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-stone-500 dark:text-stone-400">
            <span className="font-semibold text-stone-900 dark:text-stone-100">
              {formatDate(consultation.scheduled_at)}
            </span>
            <span>
              Checked in:{' '}
              <span className="font-semibold text-stone-900 dark:text-stone-100">
                {formatTime(consultation.checked_in_at)}
              </span>
            </span>
            <span>
              Completed:{' '}
              <span className="font-semibold text-stone-900 dark:text-stone-100">
                {formatTime(consultation.completed_at)}
              </span>
            </span>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-900 dark:bg-amber-950 dark:text-amber-200">
            {consultation.veterinarian}
          </span>
          <button
            aria-controls={detailsId}
            aria-expanded={expanded}
            aria-label={
              expanded
                ? `Hide details for ${consultation.diagnosis}`
                : `View details for ${consultation.diagnosis}`
            }
            className="grid size-9 shrink-0 place-items-center rounded-full border border-stone-200 text-stone-500 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-900 dark:border-stone-600 dark:text-stone-400 dark:hover:border-amber-700 dark:hover:bg-amber-900/20 dark:hover:text-amber-200"
            onClick={() => setExpanded((current) => !current)}
            title={expanded ? 'Hide details' : 'View details'}
            type="button"
          >
            <svg
              aria-hidden="true"
              className={`size-5 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              viewBox="0 0 24 24"
            >
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
      {expanded && (
        <>
          <dl
            className="mt-4 grid gap-4 rounded-lg border border-stone-100 bg-stone-50 p-4 sm:grid-cols-2 dark:border-stone-700 dark:bg-stone-900/40"
            id={detailsId}
          >
            <DetailRow label="Chief complaint" value={consultation.chief_complaint} />
            <DetailRow label="Observations" value={consultation.objective} />
            <DetailRow label="Assessment" value={consultation.assessment} />
            <DetailRow label="Plan" value={consultation.plan} />
            <DetailRow label="Specific disease" value={consultation.specific_disease} />
            <DetailRow label="Treatment" value={consultation.treatment} />
            <DetailRow label="Notes" value={consultation.notes} />
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                Follow-up
              </dt>
              <dd className="mt-1 text-sm text-stone-800 dark:text-stone-200">
                {consultation.follow_up_required ? 'Needed' : 'Not needed'}
                {consultation.follow_up_required && consultation.follow_up_target_date
                  ? ` (${consultation.follow_up_target_date})`
                  : ''}
              </dd>
            </div>
          </dl>
          <div className="mt-4 flex justify-end border-t border-stone-100 pt-4 dark:border-stone-700">
            <button
              className="text-sm font-semibold text-stone-500 underline decoration-stone-400 underline-offset-4 transition hover:text-stone-900 hover:decoration-stone-900 dark:text-stone-400 dark:hover:text-stone-100 dark:hover:decoration-stone-100"
              onClick={() =>
                navigate(`/veterinarian/appointments/${consultation.appointment_id}`)
              }
              type="button"
            >
              View more details
            </button>
          </div>
        </>
      )}
    </Card>
  )
}

export function ConsultationHistoryPage() {
  const navigate = useNavigate()
  const { petId } = useParams<{ petId: string }>()
  const [searchParams] = useSearchParams()
  const currentAppointmentId = searchParams.get('apt')
  const history = usePetConsultationHistory(petId ?? '')

  const consultations = history.data?.consultations ?? []

  const goBack = () => {
    if (currentAppointmentId) {
      navigate(`/veterinarian/appointments/${currentAppointmentId}`)
    } else {
      navigate('/veterinarian/consultations')
    }
  }

  return (
    <div className="p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <PageHero
            title={history.data?.pet.pet_name ?? 'Consultation history'}
            subtitle="Consultation history at your clinic"
            meta={
              history.data?.pet.pet_species && (
                <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-amber-100">
                  {history.data.pet.pet_species}
                </span>
              )
            }
            actions={
              <button
                className="self-start text-sm font-semibold text-amber-100 underline decoration-amber-100/60 underline-offset-4 transition hover:text-white hover:decoration-white"
                onClick={goBack}
                type="button"
              >
                Back
              </button>
            }
          />
        </div>

        {history.isLoading ? (
          <div className="space-y-4">
            {[0, 1].map((index) => (
              <div
                className="h-56 animate-pulse rounded-md bg-stone-100 dark:bg-stone-800"
                key={index}
              />
            ))}
          </div>
        ) : history.isError ? (
          <Card padding="sm">
            <div className="py-10 text-center">
              <p className="text-sm text-stone-500 dark:text-stone-400">
                {apiErrorMessage(history.error)}
              </p>
              <Button
                className="mt-4"
                loading={history.isFetching}
                onClick={() => history.refetch()}
                size="sm"
                type="button"
                variant="secondary"
              >
                Try again
              </Button>
            </div>
          </Card>
        ) : consultations.length === 0 ? (
          <Card padding="sm">
            <p className="py-10 text-center text-sm text-stone-500 dark:text-stone-400">
              No consultations recorded for this pet at your clinic.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {consultations.map((consultation) => (
              <ConsultationHistoryCard
                consultation={consultation}
                key={consultation.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

import { useState } from 'react'

import { useConfirmFollowUp } from '../hooks/useAppointments'
import { useAvailableSlots } from '../hooks/useAvailableSlots'
import { apiErrorMessage } from '../../../utils/error'
import type { AppointmentDetail } from '../types/receptionist.types'

interface FollowUpReviewCardProps {
  appointment: AppointmentDetail
}

function toDateInput(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function todayInput(): string {
  return toDateInput(new Date().toISOString())
}

export function FollowUpReviewCard({ appointment }: FollowUpReviewCardProps) {
  const [date, setDate] = useState(() => toDateInput(appointment.apt_scheduled_at))
  const [selectedSlotId, setSelectedSlotId] = useState('')
  const isReview = appointment.apt_status === 'REVIEW'
  const vetId = appointment.stf_id ?? ''
  const { data: slots, isLoading, error } = useAvailableSlots(
    isReview ? vetId : '',
    isReview ? date : '',
  )
  const confirmFollowUp = useConfirmFollowUp()

  if (!isReview) return null

  function handleConfirm() {
    if (!selectedSlotId) return
    confirmFollowUp.mutate({
      aptId: appointment.apt_id,
      slotId: selectedSlotId,
    })
  }

  return (
    <section className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-900/20">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-700 dark:text-amber-400">
          Follow-Up Needs Review
        </p>
        <h2 className="mt-1 text-lg font-bold text-stone-900 dark:text-stone-100">
          Schedule the follow-up visit
        </h2>
        <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">
          Confirm a slot for {appointment.vet_name ?? 'the assigned veterinarian'}.
          The appointment will be marked <strong>Awaiting Payment</strong>.
        </p>
      </div>

      {!vetId ? (
        <p className="text-sm font-medium text-red-700 dark:text-red-400">
          This follow-up has no assigned veterinarian.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="max-w-xs">
            <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">
              Date
            </label>
            <input
              type="date"
              min={todayInput()}
              value={date}
              onChange={(event) => {
                setDate(event.target.value)
                setSelectedSlotId('')
              }}
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-stone-700 dark:text-stone-300">
              Available time slots
            </p>
            {isLoading ? (
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-10 w-24 animate-pulse rounded-lg bg-amber-200/70 dark:bg-amber-900/40"
                  />
                ))}
              </div>
            ) : error ? (
              <p className="text-sm text-red-700 dark:text-red-400">
                {apiErrorMessage(error)}
              </p>
            ) : slots && slots.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {slots.map((slot) => (
                  <button
                    key={slot.vsl_id}
                    type="button"
                    onClick={() => setSelectedSlotId(slot.vsl_id)}
                    className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                      selectedSlotId === slot.vsl_id
                        ? 'border-amber-500 bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200'
                        : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300'
                    }`}
                  >
                    {slot.vsl_start_time.slice(0, 5)} - {slot.vsl_end_time.slice(0, 5)}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-stone-500 dark:text-stone-400">
                No available slots for this date.
              </p>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!selectedSlotId || confirmFollowUp.isPending}
              className="rounded-lg bg-amber-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-amber-800 disabled:opacity-50"
            >
              {confirmFollowUp.isPending
                ? 'Scheduling...'
                : 'Confirm & Await Payment'}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

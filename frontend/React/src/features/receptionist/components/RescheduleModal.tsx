import { useState } from 'react'

import { useRescheduleAppointment } from '../hooks/useAppointments'
import { useAvailableSlots } from '../hooks/useAvailableSlots'
import { apiErrorMessage } from '../../../utils/error'
import type { AppointmentDetail } from '../types/receptionist.types'

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

interface RescheduleModalProps {
  appointment: AppointmentDetail
  onClose: () => void
}

/**
 * Moves an appointment to another free slot of the same veterinarian.
 * The owner receives a neutral "rescheduled" notification from the
 * backend; a stale or taken slot is reported here as a plain error.
 */
export function RescheduleModal({ appointment, onClose }: RescheduleModalProps) {
  const [date, setDate] = useState(() => toDateInput(appointment.apt_scheduled_at))
  const [selectedSlotId, setSelectedSlotId] = useState('')
  const vetId = appointment.stf_id ?? ''
  const { data: slots, isLoading, error, refetch, isFetching } = useAvailableSlots(vetId, date)
  const reschedule = useRescheduleAppointment()

  function handleConfirm() {
    if (!selectedSlotId) return
    reschedule.mutate(
      { aptId: appointment.apt_id, slotId: selectedSlotId },
      { onSuccess: () => onClose() },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-stone-900">
        <h3 className="mb-1 text-lg font-semibold text-stone-900 dark:text-stone-100">
          Reschedule Appointment
        </h3>
        <p className="mb-4 text-sm text-stone-600 dark:text-stone-300">
          Pick a new slot for {appointment.pet_name} with{' '}
          {appointment.vet_name ?? 'the assigned veterinarian'}. The owner is
          notified right away.
        </p>

        <div className="mb-4 max-w-xs">
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

        <div className="mb-5">
          <p className="mb-2 text-sm font-medium text-stone-700 dark:text-stone-300">
            Available time slots
          </p>
          {isLoading ? (
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-10 w-24 animate-pulse rounded-lg bg-stone-200 dark:bg-stone-800"
                />
              ))}
            </div>
          ) : error ? (
            <div>
              <p className="text-sm text-red-700 dark:text-red-400">
                {apiErrorMessage(error)}
              </p>
              <button
                type="button"
                onClick={() => refetch()}
                disabled={isFetching}
                className="mt-2 rounded-md border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-600 transition hover:bg-stone-100 disabled:opacity-50 dark:border-stone-600 dark:text-stone-300 dark:hover:bg-stone-800"
              >
                {isFetching ? 'Retrying…' : 'Try again'}
              </button>
            </div>
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
                  {slot.vsl_start_time.slice(0, 5)} – {slot.vsl_end_time.slice(0, 5)}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-stone-500 dark:text-stone-400">
              No available slots for this date
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedSlotId || reschedule.isPending}
            className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-50"
          >
            {reschedule.isPending ? 'Rescheduling...' : 'Reschedule'}
          </button>
        </div>
      </div>
    </div>
  )
}

import type { AppointmentListItem, AppointmentStatus } from '../types'

/**
 * Statuses that mean an appointment is still on the books. Terminal statuses
 * (completed, cancelled, no-show) never count as a conflict.
 */
export const LIVE_APPOINTMENT_STATUSES: readonly AppointmentStatus[] = [
  'PENDING',
  'CONFIRMED',
  'CHECKED_IN',
  'IN_PROGRESS',
]

/**
 * The pet's first live appointment at the given clinic, or null.
 *
 * The booking wizard calls this when a clinic is picked: a same-clinic
 * duplicate shows a soft confirm the owner can override. The scope is the
 * clinic — not the appointment type — and the rule is a client-side
 * guardrail only; the booking API itself stays permissive.
 */
export function findConflictingAppointment(
  appointments: readonly AppointmentListItem[],
  petId: string,
  clinicId: string,
): AppointmentListItem | null {
  if (!petId || !clinicId) return null

  return (
    appointments.find(
      (appointment) =>
        appointment.pet_id === petId &&
        appointment.cln_id === clinicId &&
        LIVE_APPOINTMENT_STATUSES.includes(appointment.apt_status),
    ) ?? null
  )
}

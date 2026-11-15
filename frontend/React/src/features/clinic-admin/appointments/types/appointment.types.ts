import type { AppointmentDetail, VetRequest } from '../../../receptionist/types/receptionist.types'

export interface AppointmentStatusChange {
  changed_at: string | null
  changed_by: string | null
  changed_by_role: string | null
  source: 'STAFF' | 'SYSTEM' | 'UNKNOWN' | null
}

export type CreatedByRole = 'RECEPTIONIST' | 'OWNER' | null

/**
 * Oversight view of the vet's request: who asked, when, and how the clinic
 * answered. The vet's message and the decline note stay receptionist/vet-only,
 * so they are absent from this payload.
 */
export type ClinicAdminVetRequest = Omit<VetRequest, 'reason' | 'decline_note'>

/** Clinic Admin oversight view: no clinical records, so no AI screening. */
export interface ClinicAdminAppointmentDetail
  extends Omit<AppointmentDetail, 'vet_request'> {
  created_by_role: CreatedByRole
  status_change: AppointmentStatusChange | null
  vet_request: ClinicAdminVetRequest | null
}

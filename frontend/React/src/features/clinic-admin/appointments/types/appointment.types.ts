import type {
  AppointmentDetail,
  ScreeningSummary,
} from '../../../receptionist/types/receptionist.types'

export interface ClinicAdminScreeningSummary extends ScreeningSummary {
  vet_diagnosis: string | null
  reviewed_at: string | null
}

export interface AppointmentStatusChange {
  changed_at: string | null
  changed_by: string | null
  changed_by_role: string | null
  source: 'STAFF' | 'SYSTEM' | 'UNKNOWN' | null
}

export type CreatedByRole = 'RECEPTIONIST' | 'OWNER' | null

export interface ClinicAdminAppointmentDetail
  extends Omit<AppointmentDetail, 'screening'> {
  created_by_role: CreatedByRole
  status_change: AppointmentStatusChange | null
  screening: ClinicAdminScreeningSummary | null
}

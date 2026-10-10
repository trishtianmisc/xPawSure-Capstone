import type { AppointmentStatus } from './dashboard.types'

export interface PrescriptionItem {
  id: string
  medicine_name: string
  generic_name: string | null
  dosage: string
  route: string
  frequency: string
  duration: string
  quantity: number | null
  notes: string | null
}

export interface ScheduleSlot {
  id: string
  date: string
  pet_name: string
  condition: string
  start_time: string
  end_time: string
  time_label: string
  status: AppointmentStatus
}

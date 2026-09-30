export interface Consultation {
  id: string
  pet_name: string
  breed: string
  date: string
  time: string
  status: 'UPCOMING' | 'TODAY' | 'COMPLETED' | 'CANCELLED'
}

export interface PrescriptionItem {
  id: string
  medicine_name: string
  generic_name: string
  dosage: string
  route_of_administration: string
  frequency: string
  duration: string
}

export interface ScheduleSlot {
  id: string
  pet_name: string
  condition: string
  day: string
  start_time: string
  end_time: string
  color: string
}

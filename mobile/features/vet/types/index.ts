export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'

export type ConsultationStatus = 'TODAY' | 'UPCOMING' | 'COMPLETED'

export interface VetScheduleItem {
  id: string
  time: string
  pet_name: string
  breed: string
  owner_name: string
  ai_screening_tag: string | null
  status: AppointmentStatus
}

export interface VetAppointment {
  id: string
  date: string
  time: string
  pet_name: string
  breed: string
  owner_name: string
  reason: string
  status: AppointmentStatus
}

export interface VetConsultation {
  id: string
  date: string
  time: string
  pet_name: string
  breed: string
  owner_name: string
  status: ConsultationStatus
}

export interface ScreeningFollowUp {
  question: string
  answer: string
}

export interface ScreeningResult {
  prediction: string
  confidence: number
  image: string | null
  follow_up_answers: ScreeningFollowUp[]
}

export interface VetConsultationDetail {
  id: string
  date: string
  time: string
  pet_name: string
  breed: string
  age: string
  owner_name: string
  status: ConsultationStatus
  screening: ScreeningResult | null
}

export interface VetDashboardStats {
  consultations: number
  completed: number
  remaining: number
}

export interface VetDashboardData {
  stats: VetDashboardStats
  todaySchedule: VetScheduleItem[]
}

export interface CalendarDay {
  day: number
  month: 'prev' | 'current' | 'next'
  hasAppointment: boolean
}

export interface ScheduleDayAppointment {
  id: string
  time: string
  pet_name: string
  breed: string
  owner_name: string
}

export interface ScheduleMonthAppointment {
  id: string
  date: string
  time: string
  pet_name: string
  breed: string
  owner_name: string
}

export interface ScheduleWeekDay {
  dayLabel: string
  appointments: ScheduleDayAppointment[]
}

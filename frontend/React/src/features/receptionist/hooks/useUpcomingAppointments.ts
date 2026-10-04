import { useAppointments } from './useAppointments'
import type { Appointment, AppointmentStatus } from '../types/receptionist.types'

const UPCOMING_STATUSES: AppointmentStatus[] = [
  'PENDING',
  'CONFIRMED',
  'CHECKED_IN',
  'IN_PROGRESS',
]

const PAGE_SIZE = 100
const MAX_UPCOMING = 10

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function scheduledAt(apt: Appointment): number {
  return new Date(apt.apt_scheduled_at).getTime()
}

export function useUpcomingAppointments() {
  const { data, isLoading, error, refetch } = useAppointments({
    page_size: PAGE_SIZE,
  })

  const now = new Date()

  const eligible = (data?.results ?? [])
    .filter(
      (apt) =>
        scheduledAt(apt) >= now.getTime() &&
        UPCOMING_STATUSES.includes(apt.apt_status),
    )
    .sort((a, b) => scheduledAt(a) - scheduledAt(b))

  const nextUp =
    eligible.find((apt) => isSameDay(new Date(apt.apt_scheduled_at), now)) ??
    null

  return {
    upcoming: eligible.slice(0, MAX_UPCOMING),
    nextUp,
    isLoading,
    error,
    refetch,
  }
}

import { useAppointments } from './useAppointments'
import type { Appointment, AppointmentStatus } from '../types/receptionist.types'
import { isoDate } from '../../../utils/format'

const UPCOMING_STATUSES: AppointmentStatus[] = [
  'CONFIRMATION',
  'PENDING',
  'CONFIRMED',
  'CHECKED_IN',
  'IN_PROGRESS',
]

const MAX_UPCOMING = 10

function scheduledAt(apt: Appointment): number {
  return new Date(apt.apt_scheduled_at).getTime()
}

/**
 * Future days only — today belongs to the dashboard's queue. The server
 * sorts ascending; the client re-sorts defensively and trims the list.
 */
export function useUpcomingAppointments() {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)

  const { data, isLoading, error, refetch } = useAppointments({
    date_from: isoDate(tomorrow),
    sort: 'apt_scheduled_at',
    page_size: 30,
  })

  const upcoming = (data?.results ?? [])
    .filter((apt) => UPCOMING_STATUSES.includes(apt.apt_status))
    .sort((a, b) => scheduledAt(a) - scheduledAt(b))
    .slice(0, MAX_UPCOMING)

  return {
    upcoming,
    isLoading,
    error,
    refetch,
  }
}

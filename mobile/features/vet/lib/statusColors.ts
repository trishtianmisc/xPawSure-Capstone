import type { AppointmentStatus } from '../types'

export const APPOINTMENT_STATUS_COLORS: Record<AppointmentStatus, { bg: string; text: string }> = {
  PENDING: { bg: '#FDEBD0', text: '#E67E22' },
  CONFIRMED: { bg: '#D6EAF8', text: '#2E86C1' },
  CHECKED_IN: { bg: '#FCF3CF', text: '#B7950B' },
  IN_PROGRESS: { bg: '#E8DAEF', text: '#6C3483' },
  COMPLETED: { bg: '#DCFCE7', text: '#166534' },
  CANCELLED: { bg: '#FEE2E2', text: '#991B1B' },
  NO_SHOW: { bg: '#FADBD8', text: '#E74C3C' },
}

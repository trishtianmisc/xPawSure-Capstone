import type { AppointmentStatus } from '../types'

/**
 * Single source of truth for how an appointment status is presented:
 * the list pill and the details banner both read from this map.
 */
export const STATUS_PRESENTATION: Record<
  AppointmentStatus,
  { label: string; bg: string; text: string; icon: string; note: string }
> = {
  PENDING: {
    label: 'Awaiting confirmation',
    bg: '#FDEBD0',
    text: '#E67E22',
    icon: 'clock-outline',
    note: 'Awaiting confirmation from the clinic. You will be notified once it is confirmed.',
  },
  CONFIRMED: {
    label: 'Confirmed',
    bg: '#D6EAF8',
    text: '#2471A3',
    icon: 'check-decagram-outline',
    note: 'Confirmed by the clinic. Please arrive 10 minutes before your schedule.',
  },
  CHECKED_IN: {
    label: 'Checked in',
    bg: '#FCF3CF',
    text: '#B7950B',
    icon: 'door-open',
    note: 'You have been checked in at the clinic. The veterinarian will see you shortly.',
  },
  IN_PROGRESS: {
    label: 'In progress',
    bg: '#E8DAEF',
    text: '#6C3483',
    icon: 'stethoscope',
    note: 'The consultation is currently in progress.',
  },
  COMPLETED: {
    label: 'Completed',
    bg: '#D5F5E3',
    text: '#1E8449',
    icon: 'clipboard-check-outline',
    note: 'This consultation has been completed.',
  },
  CANCELLED: {
    label: 'Cancelled',
    bg: '#FADBD8',
    text: '#C0392B',
    icon: 'calendar-remove-outline',
    note: 'This appointment was cancelled.',
  },
  NO_SHOW: {
    label: 'No show',
    bg: '#E5E7E9',
    text: '#566573',
    icon: 'account-clock-outline',
    note: 'This appointment was missed and has been closed.',
  },
}

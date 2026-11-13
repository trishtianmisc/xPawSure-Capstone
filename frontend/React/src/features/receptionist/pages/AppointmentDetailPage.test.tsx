import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { usePaymentsByAppointment } from '../../payments/hooks/usePayments'
import { CLINIC_TIME_ZONE } from '../../../utils/format'
import {
  useAppointmentDetail,
  useConfirmFollowUp,
  useDeclineVetRequest,
  useRescheduleAppointment,
  useUpdateAppointmentStatus,
} from '../hooks/useAppointments'
import { useAvailableSlots } from '../hooks/useAvailableSlots'
import type { AppointmentDetail } from '../types/receptionist.types'
import { AppointmentDetailPage } from './AppointmentDetailPage'

vi.mock('../hooks/useAppointments', () => ({
  useAppointmentDetail: vi.fn(),
  useUpdateAppointmentStatus: vi.fn(),
  useDeclineVetRequest: vi.fn(),
  useRescheduleAppointment: vi.fn(),
  useConfirmFollowUp: vi.fn(),
}))

vi.mock('../hooks/useAvailableSlots', () => ({
  useAvailableSlots: vi.fn(),
}))

vi.mock('../../payments/hooks/usePayments', () => ({
  usePaymentsByAppointment: vi.fn(),
}))

function clinicTimestamp(offsetDays: number, time: string): string {
  const day = new Date(Date.now() + offsetDays * 86_400_000).toLocaleDateString(
    'en-CA',
    { timeZone: CLINIC_TIME_ZONE },
  )
  return `${day}T${time}+08:00`
}

// Same clinic day, later than any realistic run time: visible and enabled.
const TODAY_LATE = clinicTimestamp(0, '23:59:00')
const TOMORROW = clinicTimestamp(1, '09:00:00')

function appointment(scheduledAt: string): AppointmentDetail {
  return {
    apt_id: 'apt-1',
    pet_id: 'pet-1',
    pet_name: 'Rex',
    pet_species: 'Canine',
    cln_id: 'cln-1',
    stf_id: 'stf-1',
    vet_name: 'Vera Vet',
    owner_name: 'Olivia Owner',
    apt_type: 'CONSULTATION',
    apt_status: 'CONFIRMED',
    apt_scheduled_at: scheduledAt,
    apt_reason: null,
    created_by_name: 'Rita',
    screening: null,
    apt_checked_in_at: null,
    apt_completed_at: null,
    apt_cancelled_at: null,
    apt_created_at: '2026-09-01T00:00:00+08:00',
    pet_breed: 'Labrador',
    pet_sex: 'MALE',
    clinic_name: 'Happy Paws',
    owner_phone: null,
    owner_email: 'olivia@example.com',
    apt_cancellation_reason: null,
    apt_updated_at: '2026-10-01T08:00:00+08:00',
    vet_request: null,
    has_open_request: false,
  }
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/receptionist/appointments/apt-1']}>
      <Routes>
        <Route
          path="/receptionist/appointments/:id"
          element={<AppointmentDetailPage />}
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AppointmentDetailPage check-in gate', () => {
  const mutate = vi.fn()

  beforeEach(() => {
    mutate.mockReset()
    vi.mocked(useUpdateAppointmentStatus).mockReturnValue({
      mutate,
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateAppointmentStatus>)
    vi.mocked(usePaymentsByAppointment).mockReturnValue({
      data: undefined,
      isLoading: false,
    } as unknown as ReturnType<typeof usePaymentsByAppointment>)
    vi.mocked(useAvailableSlots).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    } as unknown as ReturnType<typeof useAvailableSlots>)
    vi.mocked(useConfirmFollowUp).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useConfirmFollowUp>)
    vi.mocked(useDeclineVetRequest).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useDeclineVetRequest>)
    vi.mocked(useRescheduleAppointment).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useRescheduleAppointment>)
  })

  it('disables Check In until the appointment date', () => {
    vi.mocked(useAppointmentDetail).mockReturnValue({
      data: appointment(TOMORROW),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    } as unknown as ReturnType<typeof useAppointmentDetail>)

    renderPage()

    const button = screen.getByRole('button', { name: 'Check In' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute(
      'title',
      expect.stringContaining('Check-in opens on'),
    )

    fireEvent.click(button)
    expect(mutate).not.toHaveBeenCalled()
  })

  it('checks in once the appointment date arrives', () => {
    vi.mocked(useAppointmentDetail).mockReturnValue({
      data: appointment(TODAY_LATE),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    } as unknown as ReturnType<typeof useAppointmentDetail>)

    renderPage()

    const button = screen.getByRole('button', { name: 'Check In' })
    expect(button).toBeEnabled()
    expect(button).not.toHaveAttribute('title')

    fireEvent.click(button)
    expect(mutate).toHaveBeenCalledWith({
      aptId: 'apt-1',
      status: 'CHECKED_IN',
    })
  })
})

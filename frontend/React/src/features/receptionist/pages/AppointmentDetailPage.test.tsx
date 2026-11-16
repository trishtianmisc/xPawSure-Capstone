import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { usePaymentsByAppointment } from '../../payments/hooks/usePayments'
import type { Payment } from '../../payments/types/payment.types'
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
    screening_status: null,
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

function renderPage(path = '/receptionist/appointments/apt-1') {
  return render(
    <MemoryRouter initialEntries={[path]}>
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

describe('AppointmentDetailPage payment card', () => {
  beforeEach(() => {
    vi.mocked(useUpdateAppointmentStatus).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateAppointmentStatus>)
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
    vi.mocked(useAppointmentDetail).mockReturnValue({
      data: appointment(TOMORROW),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    } as unknown as ReturnType<typeof useAppointmentDetail>)
  })

  it('shows only the amount and refunded date for a refunded payment', () => {
    const refunded = {
      amount: 500,
      status: 'REFUNDED',
      reference_no: 'XPS-20261116-10DE9D',
      method: 'GCASH',
      paid_at: '2026-11-16T15:06:30+08:00',
      refunded_at: '2026-11-16T15:08:00+08:00',
      refund_reference: 'RFD-20261116-ABC123',
      refund_reason: 'Receptionist cancelled the appointment.',
    } as unknown as Payment

    vi.mocked(usePaymentsByAppointment).mockReturnValue({
      data: { results: [refunded] },
      isLoading: false,
    } as unknown as ReturnType<typeof usePaymentsByAppointment>)

    renderPage()

    expect(screen.getByText('Refunded')).toBeInTheDocument()
    expect(screen.getByText('₱500.00')).toBeInTheDocument()
    expect(screen.getByText('Refunded at')).toBeInTheDocument()
    expect(screen.queryByText('Receipt')).not.toBeInTheDocument()
    expect(screen.queryByText('Method')).not.toBeInTheDocument()
    expect(screen.queryByText('Paid at')).not.toBeInTheDocument()
    expect(screen.queryByText('Refund ref.')).not.toBeInTheDocument()
    expect(screen.queryByText('Refund reason')).not.toBeInTheDocument()
    expect(screen.queryByText('RFD-20261116-ABC123')).not.toBeInTheDocument()
    expect(screen.queryByText('XPS-20261116-10DE9D')).not.toBeInTheDocument()
    expect(screen.queryByText('GCASH')).not.toBeInTheDocument()
  })

  it('keeps receipt and method for a paid payment', () => {
    const paid = {
      amount: 500,
      status: 'PAID',
      reference_no: 'XPS-20261116-10DE9D',
      method: 'GCASH',
      paid_at: '2026-11-16T15:06:30+08:00',
      refunded_at: null,
      refund_reference: null,
      refund_reason: null,
    } as unknown as Payment

    vi.mocked(usePaymentsByAppointment).mockReturnValue({
      data: { results: [paid] },
      isLoading: false,
    } as unknown as ReturnType<typeof usePaymentsByAppointment>)

    renderPage()

    expect(screen.getByText('Paid')).toBeInTheDocument()
    expect(screen.getByText('Receipt')).toBeInTheDocument()
    expect(screen.getByText('Method')).toBeInTheDocument()
    expect(screen.getByText('Paid at')).toBeInTheDocument()
    expect(screen.queryByText('Refunded at')).not.toBeInTheDocument()
  })
})

describe('AppointmentDetailPage not-found state', () => {
  beforeEach(() => {
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
    vi.mocked(useUpdateAppointmentStatus).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateAppointmentStatus>)
  })

  it('shows a friendly not-found state for an invalid id like "new"', () => {
    vi.mocked(useAppointmentDetail).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: Object.assign(new Error('Request failed with status code 404'), {
        response: { status: 404, data: { detail: 'Not found.' } },
      }),
      refetch: vi.fn(),
      isFetching: false,
    } as unknown as ReturnType<typeof useAppointmentDetail>)

    renderPage('/receptionist/appointments/new')

    expect(screen.getByText('Appointment not found')).toBeInTheDocument()
    expect(
      screen.getByText('It may have been removed, or the link is incorrect.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Not found.')).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Go back' }),
    ).toBeInTheDocument()
  })
})

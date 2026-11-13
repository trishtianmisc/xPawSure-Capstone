import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useDeclineVetRequest, useRescheduleAppointment } from '../hooks/useAppointments'
import { useAvailableSlots } from '../hooks/useAvailableSlots'
import type { AppointmentDetail, VetRequest } from '../types/receptionist.types'
import { VetRequestCard } from './VetRequestCard'

vi.mock('../hooks/useAppointments', () => ({
  useDeclineVetRequest: vi.fn(),
  useRescheduleAppointment: vi.fn(),
}))

vi.mock('../hooks/useAvailableSlots', () => ({
  useAvailableSlots: vi.fn(),
}))

const OPEN_REQUEST: VetRequest = {
  type: 'RESCHEDULE',
  status: 'OPEN',
  reason: 'Surgery conflict',
  requested_by: 'Vera Vet',
  requested_at: '2026-10-01T08:00:00+08:00',
  decline_note: null,
  resolved_by: null,
  resolved_at: null,
}

function appointment(
  overrides: Partial<AppointmentDetail> = {},
): AppointmentDetail {
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
    apt_scheduled_at: '2026-10-02T09:00:00+08:00',
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
    owner_phone: '+639171234567',
    owner_email: 'olivia@example.com',
    apt_cancellation_reason: null,
    apt_updated_at: '2026-10-01T08:00:00+08:00',
    vet_request: OPEN_REQUEST,
    has_open_request: true,
    ...overrides,
  }
}

function renderCard(value: AppointmentDetail) {
  return render(
    <MemoryRouter>
      <VetRequestCard appointment={value} />
    </MemoryRouter>,
  )
}

describe('VetRequestCard', () => {
  const declineMutate = vi.fn()
  const rescheduleMutate = vi.fn()

  beforeEach(() => {
    declineMutate.mockReset()
    rescheduleMutate.mockReset()
    vi.mocked(useDeclineVetRequest).mockReturnValue({
      mutate: declineMutate,
      isPending: false,
    } as unknown as ReturnType<typeof useDeclineVetRequest>)
    vi.mocked(useRescheduleAppointment).mockReturnValue({
      mutate: rescheduleMutate,
      isPending: false,
    } as unknown as ReturnType<typeof useRescheduleAppointment>)
    vi.mocked(useAvailableSlots).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    } as unknown as ReturnType<typeof useAvailableSlots>)
  })

  it('renders the open request with reason, requester, and owner phone', () => {
    renderCard(appointment())

    expect(screen.getByText('Veterinarian request')).toBeInTheDocument()
    expect(screen.getByText('Open')).toBeInTheDocument()
    expect(screen.getByText('Reschedule request')).toBeInTheDocument()
    expect(screen.getByText('Surgery conflict')).toBeInTheDocument()
    expect(screen.getByText(/Requested by Vera Vet/)).toBeInTheDocument()
    expect(screen.getByText(/Owner phone · 0917 123 4567/)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Decline' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Reschedule' }),
    ).toBeInTheDocument()
  })

  it('declines only after a note is entered', () => {
    renderCard(appointment())

    fireEvent.click(screen.getByRole('button', { name: 'Decline' }))
    const confirm = screen.getByRole('button', { name: 'Decline Request' })
    expect(confirm).toBeDisabled()

    fireEvent.change(screen.getByPlaceholderText(/Note for the veterinarian/), {
      target: { value: 'Already booked' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Decline Request' }))

    expect(declineMutate).toHaveBeenCalledWith(
      { aptId: 'apt-1', note: 'Already booked' },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
  })

  it('opens the reschedule modal from the Reschedule button', () => {
    renderCard(appointment())

    fireEvent.click(screen.getByRole('button', { name: 'Reschedule' }))

    expect(screen.getByRole('heading', { name: 'Reschedule Appointment' })).toBeInTheDocument()
  })

  it('hides actions once the request is declined', () => {
    renderCard(
      appointment({
        has_open_request: false,
        vet_request: {
          ...OPEN_REQUEST,
          status: 'DECLINED',
          decline_note: 'Slot already committed',
          resolved_by: 'Rita Desk',
          resolved_at: '2026-10-01T09:00:00+08:00',
        },
      }),
    )

    expect(screen.getByText('Declined')).toBeInTheDocument()
    expect(screen.getByText(/Note: Slot already committed/)).toBeInTheDocument()
    expect(screen.getByText(/Declined by Rita Desk/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Decline' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Reschedule' })).toBeNull()
  })

  it('shows resolution details for a resolved request', () => {
    renderCard(
      appointment({
        has_open_request: false,
        vet_request: {
          ...OPEN_REQUEST,
          status: 'RESOLVED',
          resolved_by: 'Rita Desk',
          resolved_at: '2026-10-01T10:00:00+08:00',
        },
      }),
    )

    expect(screen.getByText('Resolved')).toBeInTheDocument()
    expect(screen.getByText(/Resolved by Rita Desk/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Decline' })).toBeNull()
  })

  it('renders nothing without a request', () => {
    const { container } = renderCard(
      appointment({ vet_request: null, has_open_request: false }),
    )

    expect(container).toBeEmptyDOMElement()
  })
})

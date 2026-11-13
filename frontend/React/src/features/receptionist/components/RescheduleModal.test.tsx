import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useRescheduleAppointment } from '../hooks/useAppointments'
import { useAvailableSlots } from '../hooks/useAvailableSlots'
import type { AppointmentDetail, VetSlot } from '../types/receptionist.types'
import { RescheduleModal } from './RescheduleModal'

vi.mock('../hooks/useAppointments', () => ({
  useRescheduleAppointment: vi.fn(),
}))

vi.mock('../hooks/useAvailableSlots', () => ({
  useAvailableSlots: vi.fn(),
}))

const SLOT: VetSlot = {
  vsl_id: 'slot-1',
  stf_id: 'stf-1',
  cln_id: 'cln-1',
  vsl_date: '2026-10-02',
  vsl_start_time: '10:00:00',
  vsl_end_time: '10:30:00',
  vsl_appointment: null,
  vet_name: 'Vera Vet',
  vsl_created_at: '2026-09-01T00:00:00+08:00',
}

function appointment(): AppointmentDetail {
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
    owner_phone: null,
    owner_email: 'olivia@example.com',
    apt_cancellation_reason: null,
    apt_updated_at: '2026-10-01T08:00:00+08:00',
    vet_request: null,
    has_open_request: false,
  }
}

describe('RescheduleModal', () => {
  const mutate = vi.fn((_vars: unknown, options?: { onSuccess?: () => void }) => {
    options?.onSuccess?.()
  })

  function mockSlots(slots: VetSlot[]) {
    vi.mocked(useAvailableSlots).mockReturnValue({
      data: slots,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    } as unknown as ReturnType<typeof useAvailableSlots>)
  }

  beforeEach(() => {
    mutate.mockClear()
    vi.mocked(useRescheduleAppointment).mockReturnValue({
      mutate,
      isPending: false,
    } as unknown as ReturnType<typeof useRescheduleAppointment>)
    mockSlots([SLOT])
  })

  it('confirms with the selected slot and closes on success', async () => {
    const onClose = vi.fn()
    render(<RescheduleModal appointment={appointment()} onClose={onClose} />)

    expect(mutate).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '10:00 – 10:30' }))
    fireEvent.click(screen.getByRole('button', { name: 'Reschedule' }))

    expect(mutate).toHaveBeenCalledWith(
      { aptId: 'apt-1', slotId: 'slot-1' },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('keeps confirm disabled until a slot is chosen', () => {
    render(<RescheduleModal appointment={appointment()} onClose={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Reschedule' })).toBeDisabled()
  })

  it('reports an empty day without slots', () => {
    mockSlots([])
    render(<RescheduleModal appointment={appointment()} onClose={vi.fn()} />)

    expect(screen.getByText('No available slots for this date')).toBeInTheDocument()
  })
})

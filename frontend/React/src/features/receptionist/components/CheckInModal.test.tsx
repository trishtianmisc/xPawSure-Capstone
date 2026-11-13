import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  useAppointments,
  useUpdateAppointmentStatus,
} from '../hooks/useAppointments'
import { CheckInModal } from './CheckInModal'

vi.mock('../hooks/useAppointments', () => ({
  useAppointments: vi.fn(),
  useUpdateAppointmentStatus: vi.fn(),
}))

const confirmedRow = (aptId: string, pet: string, owner: string) => ({
  apt_id: aptId,
  pet_id: `pet-${aptId}`,
  pet_name: pet,
  pet_species: 'canine',
  owner_name: owner,
  vet_name: 'Vera Vet',
  apt_type: 'CONSULTATION',
  apt_status: 'CONFIRMED',
  apt_scheduled_at: '2026-11-12T09:00:00+08:00',
  apt_created_at: '2026-11-01T00:00:00+08:00',
})

const mutate = vi.fn()

function renderModal() {
  return render(<CheckInModal open onClose={() => {}} />)
}

describe('CheckInModal', () => {
  beforeEach(() => {
    mutate.mockReset()
    vi.mocked(useUpdateAppointmentStatus).mockReturnValue({
      mutate,
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateAppointmentStatus>)
    vi.mocked(useAppointments).mockReturnValue({
      data: {
        total: 2,
        page: 1,
        page_size: 50,
        total_pages: 1,
        results: [
          confirmedRow('apt-1', 'Rex', 'Olivia Owner'),
          confirmedRow('apt-2', 'Milo', 'Sam Owner'),
        ],
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    } as unknown as ReturnType<typeof useAppointments>)
  })

  it('lists today confirmed appointments and checks one in', () => {
    renderModal()

    expect(screen.getByText(/Rex — Olivia Owner/)).toBeInTheDocument()
    expect(screen.getByText(/Milo — Sam Owner/)).toBeInTheDocument()

    const rows = screen.getAllByRole('button', { name: 'Check in' })
    fireEvent.click(rows[0])
    expect(mutate).toHaveBeenCalledWith({
      aptId: 'apt-1',
      status: 'CHECKED_IN',
    })
  })

  it('filters rows by owner or pet search', () => {
    renderModal()

    fireEvent.change(screen.getByPlaceholderText('Search by owner or pet...'), {
      target: { value: 'milo' },
    })

    expect(screen.getByText(/Milo — Sam Owner/)).toBeInTheDocument()
    expect(screen.queryByText(/Rex — Olivia Owner/)).toBeNull()
  })

  it('shows an empty state when nothing is waiting', () => {
    vi.mocked(useAppointments).mockReturnValue({
      data: {
        total: 0,
        page: 1,
        page_size: 50,
        total_pages: 0,
        results: [],
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    } as unknown as ReturnType<typeof useAppointments>)

    renderModal()

    expect(
      screen.getByText('No confirmed appointments today.'),
    ).toBeInTheDocument()
  })
})

import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  useAppointments,
  useUpdateAppointmentStatus,
} from '../hooks/useAppointments'
import { useUpcomingAppointments } from '../hooks/useUpcomingAppointments'
import type { Appointment, AppointmentStatus } from '../types/receptionist.types'
import { AppointmentsCard } from './AppointmentsCard'

vi.mock('../hooks/useAppointments', () => ({
  useAppointments: vi.fn(),
  useUpdateAppointmentStatus: vi.fn(),
}))
vi.mock('../hooks/useUpcomingAppointments', () => ({
  useUpcomingAppointments: vi.fn(),
}))

const FUTURE = new Date(Date.now() + 3_600_000).toISOString()
const PAST = new Date(Date.now() - 3_600_000).toISOString()

function apt(overrides: Partial<Appointment> = {}): Appointment {
  return {
    apt_id: 'apt-1',
    pet_id: 'pet-1',
    pet_name: 'Rex',
    pet_species: 'Canine',
    cln_id: 'cln-1',
    stf_id: 'stf-1',
    vet_name: 'Dr. Lee',
    owner_name: 'Olivia Owner',
    apt_type: 'CONSULTATION',
    apt_status: 'PENDING' as AppointmentStatus,
    apt_scheduled_at: FUTURE,
    apt_reason: null,
    created_by_name: 'Rita',
    screening: null,
    apt_checked_in_at: null,
    apt_completed_at: null,
    apt_cancelled_at: null,
    apt_created_at: PAST,
    ...overrides,
  }
}

function todayResult(results: Appointment[]) {
  return {
    data: {
      total: results.length,
      page: 1,
      page_size: 50,
      total_pages: 1,
      results,
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    isFetching: false,
  } as unknown as ReturnType<typeof useAppointments>
}

function renderCard() {
  return render(
    <MemoryRouter>
      <AppointmentsCard />
    </MemoryRouter>,
  )
}

describe('AppointmentsCard', () => {
  beforeEach(() => {
    vi.mocked(useUpdateAppointmentStatus).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateAppointmentStatus>)
    vi.mocked(useAppointments).mockReturnValue(todayResult([]))
    vi.mocked(useUpcomingAppointments).mockReturnValue({
      upcoming: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useUpcomingAppointments>)
  })

  it('shows the Today tab by default with row actions', () => {
    vi.mocked(useAppointments).mockReturnValue(
      todayResult([apt({ apt_status: 'PENDING' })]),
    )

    renderCard()

    expect(screen.getByRole('tab', { name: 'Today' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByText('Rex — Olivia Owner')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Confirm' }),
    ).toBeInTheDocument()
  })

  it('marks the in-progress row as NOW, never a finished one', () => {
    vi.mocked(useAppointments).mockReturnValue(
      todayResult([
        apt({ apt_id: 'apt-done', apt_status: 'COMPLETED', apt_scheduled_at: PAST }),
        apt({ apt_id: 'apt-ip', apt_status: 'IN_PROGRESS', apt_scheduled_at: PAST }),
        apt({ apt_id: 'apt-next', apt_status: 'PENDING', apt_scheduled_at: FUTURE }),
      ]),
    )

    renderCard()

    const nowRow = screen.getByText('NOW').closest('[data-apt-id]')
    expect(nowRow).toHaveAttribute('data-apt-id', 'apt-ip')
    expect(screen.queryByText('NEXT')).toBeNull()
  })

  it('marks the soonest live row as NEXT when nothing is in progress', () => {
    vi.mocked(useAppointments).mockReturnValue(
      todayResult([
        apt({ apt_id: 'apt-done', apt_status: 'COMPLETED', apt_scheduled_at: PAST }),
        apt({ apt_id: 'apt-waiting', apt_status: 'PENDING', apt_scheduled_at: FUTURE }),
      ]),
    )

    renderCard()

    const nextRow = screen.getByText('NEXT').closest('[data-apt-id]')
    expect(nextRow).toHaveAttribute('data-apt-id', 'apt-waiting')
    expect(screen.queryByText('NOW')).toBeNull()
  })

  it('shows no highlight when every row is finished', () => {
    vi.mocked(useAppointments).mockReturnValue(
      todayResult([
        apt({ apt_id: 'apt-done', apt_status: 'COMPLETED', apt_scheduled_at: PAST }),
        apt({ apt_id: 'apt-done-2', apt_status: 'COMPLETED', apt_scheduled_at: PAST }),
      ]),
    )

    renderCard()

    expect(screen.queryByText('NOW')).toBeNull()
    expect(screen.queryByText('NEXT')).toBeNull()
  })

  it('caps the Today tab at ten rows with a +N more link', () => {
    const rows = Array.from({ length: 12 }, (_, i) =>
      apt({ apt_id: `apt-${i}` }),
    )
    vi.mocked(useAppointments).mockReturnValue(todayResult(rows))

    const { container } = renderCard()

    expect(container.querySelectorAll('[data-apt-id]')).toHaveLength(10)
    const more = screen.getByRole('link', { name: /\+2 more/ })
    expect(more.getAttribute('href')).toContain('date_from=')
  })

  it('switches to the Upcoming tab', () => {
    vi.mocked(useAppointments).mockReturnValue(
      todayResult([apt({ apt_id: 'apt-today' })]),
    )
    vi.mocked(useUpcomingAppointments).mockReturnValue({
      upcoming: [apt({ apt_id: 'apt-later', pet_name: 'Milo' })],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useUpcomingAppointments>)

    renderCard()

    fireEvent.click(screen.getByRole('tab', { name: 'Upcoming' }))

    expect(screen.getByRole('tab', { name: 'Upcoming' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByText('Milo — Olivia Owner')).toBeInTheDocument()
    expect(screen.queryByText('Rex — Olivia Owner')).toBeNull()
  })
})

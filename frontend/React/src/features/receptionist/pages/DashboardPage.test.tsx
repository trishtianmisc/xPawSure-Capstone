import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAuth } from '../../auth/context/AuthContext'
import {
  useAppointments,
  useUpdateAppointmentStatus,
} from '../hooks/useAppointments'
import { useDashboardStats } from '../hooks/useDashboardStats'
import { useUpcomingAppointments } from '../hooks/useUpcomingAppointments'
import { DashboardPage } from './DashboardPage'

vi.mock('../../auth/context/AuthContext', () => ({ useAuth: vi.fn() }))
vi.mock('../hooks/useDashboardStats', () => ({ useDashboardStats: vi.fn() }))
vi.mock('../hooks/useUpcomingAppointments', () => ({
  useUpcomingAppointments: vi.fn(),
}))
vi.mock('../hooks/useAppointments', () => ({
  useAppointments: vi.fn(),
  useUpdateAppointmentStatus: vi.fn(),
}))

const emptyList = {
  data: {
    total: 0,
    page: 1,
    page_size: 20,
    total_pages: 0,
    results: [],
  },
  isLoading: false,
  error: null,
  refetch: vi.fn(),
  isFetching: false,
}

const stats = {
  today: {
    pending: 1,
    confirmed: 2,
    checked_in: 0,
    completed: 3,
    cancelled: 0,
    no_show: 0,
    total: 6,
  },
  upcoming: { pending: 7, confirmed: 3 },
  total_owners: 10,
  total_pets: 12,
  recent_appointments: [],
  unpaid_completions: [],
  needs_attention: 0,
  review_pending: 0,
}

function renderPage() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  )
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: { first_name: 'Rita' },
    } as unknown as ReturnType<typeof useAuth>)
    vi.mocked(useDashboardStats).mockReturnValue({
      data: stats,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useDashboardStats>)
    vi.mocked(useUpcomingAppointments).mockReturnValue({
      upcoming: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useUpcomingAppointments>)
    vi.mocked(useAppointments).mockReturnValue(
      emptyList as unknown as ReturnType<typeof useAppointments>,
    )
    vi.mocked(useUpdateAppointmentStatus).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateAppointmentStatus>)
  })

  it('shows all-upcoming counts on the To confirm card', () => {
    renderPage()

    expect(screen.getByText('To confirm')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText('3 confirmed')).toBeInTheDocument()
  })

  it('hides the Needs attention panel when nothing needs attention', () => {
    renderPage()

    expect(
      screen.queryByRole('heading', { name: /Needs attention/ }),
    ).toBeNull()
  })

  it('opens the check-in modal from the quick action', () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Check in patient' }))

    expect(
      screen.getByRole('dialog', { name: 'Check in a patient' }),
    ).toBeInTheDocument()
  })

  it('does not offer booking from the quick actions row', () => {
    renderPage()

    expect(
      screen.queryByRole('button', { name: '+ Book appointment' }),
    ).toBeNull()
  })

  it('labels every KPI with its time scope', () => {
    const { container } = renderPage()

    expect(container.querySelectorAll('[data-scope="Today"]')).toHaveLength(3)
    expect(container.querySelectorAll('[data-scope="Upcoming"]')).toHaveLength(1)
    expect(container.querySelectorAll('[data-scope="All-time"]')).toHaveLength(0)
    expect(screen.getByText('Completed')).toBeInTheDocument()
  })

  it('renders the tabbed Appointments card', () => {
    renderPage()

    expect(screen.getAllByRole('tab')).toHaveLength(2)
    expect(screen.getByRole('tab', { name: 'Today' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })
})

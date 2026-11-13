import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { clinicDateKey } from '../../../../utils/format'
import type { VetAppointmentSummary, VetDashboardData } from '../types/dashboard.types'
import { useDashboard } from '../hooks/useDashboard'
import { DashboardPage } from './DashboardPage'

vi.mock('../../../auth/context/AuthContext', () => ({
  useAuth: () => ({ user: { first_name: 'Vera' } }),
}))

vi.mock('../hooks/useDashboard', () => ({
  useDashboard: vi.fn(),
}))

const today = clinicDateKey()

function appointment(
  overrides: Partial<VetAppointmentSummary> & Pick<VetAppointmentSummary, 'apt_id' | 'pet_name'>,
): VetAppointmentSummary {
  return {
    pet_id: 'pet-1',
    pet_species: 'Pug',
    vet_name: 'Vera Vet',
    owner_name: 'Olivia Owner',
    apt_type: 'CONSULTATION',
    apt_status: 'CONFIRMED',
    apt_scheduled_at: `${today}T09:00:00+08:00`,
    apt_reason: null,
    screening: null,
    ...overrides,
  }
}

const dashboard: VetDashboardData = {
  clinic_name: 'Happy Paws Clinic',
  stats: {
    consultations_this_month: 99,
    pending: 88,
    completed: 77,
    today_stats: {
      total: 12,
      confirmed: 7,
      ongoing: 4,
      completed: 3,
    },
  },
  today_consultations: [],
  upcoming_consultations: [
    appointment({ apt_id: 'apt-max', pet_name: 'Max' }),
    appointment({
      apt_id: 'apt-kiwi',
      pet_name: 'Kiwi',
      apt_status: 'CHECKED_IN',
      apt_scheduled_at: `${today}T10:00:00+08:00`,
    }),
    appointment({
      apt_id: 'apt-coco',
      pet_name: 'Coco',
      apt_status: 'IN_PROGRESS',
      apt_scheduled_at: `${today}T11:00:00+08:00`,
    }),
  ],
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.mocked(useDashboard).mockReturnValue({
      data: dashboard,
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useDashboard>)
  })

  it('shows the clinic-admin style hero and the Up Next banner for today', () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    expect(
      screen.getByText("Welcome back, Vera. Here's your clinic overview."),
    ).toBeInTheDocument()
    expect(screen.getByText('Up Next')).toBeInTheDocument()
    expect(screen.getAllByText('Max — Olivia Owner')).toHaveLength(2)
  })

  it('labels the banner Ongoing when the next consultation is checked in or in progress', () => {
    vi.mocked(useDashboard).mockReturnValue({
      data: {
        ...dashboard,
        upcoming_consultations: [
          appointment({
            apt_id: 'apt-kiwi',
            pet_name: 'Kiwi',
            apt_status: 'CHECKED_IN',
            apt_scheduled_at: `${today}T10:00:00+08:00`,
          }),
        ],
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useDashboard>)

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    )

    expect(screen.queryByText('Up Next')).not.toBeInTheDocument()
    expect(screen.getAllByText('Ongoing')).toHaveLength(2)
  })

  it('renders the four today-scoped stat cards instead of monthly stats', () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    )

    expect(screen.getByText("Today's Consultations")).toBeInTheDocument()
    expect(screen.getByText('Upcoming')).toBeInTheDocument()
    expect(screen.getByText('Ongoing')).toBeInTheDocument()
    expect(screen.getByText('Completed')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.queryByText('Consultations this month')).not.toBeInTheDocument()
  })

  it('lists confirmed, checked-in, and in-progress consultations', () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('heading', { name: 'Upcoming Consultations' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Kiwi — Olivia Owner')).toBeInTheDocument()
    expect(screen.getByText('Coco — Olivia Owner')).toBeInTheDocument()
    expect(screen.getByText('Confirmed')).toBeInTheDocument()
    expect(screen.getByText('Checked In')).toBeInTheDocument()
    expect(screen.getByText('In Progress')).toBeInTheDocument()
    expect(screen.getAllByText('View')).toHaveLength(3)
    expect(screen.queryByText('Pet name')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Start' })).not.toBeInTheDocument()
  })
})

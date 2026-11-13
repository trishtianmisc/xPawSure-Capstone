import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { isoDate } from '../../../utils/format'
import {
  useAppointments,
  useUpdateAppointmentStatus,
} from '../hooks/useAppointments'
import { useDashboardStats } from '../hooks/useDashboardStats'
import type {
  Appointment,
  AppointmentStatus,
  DashboardStats,
} from '../types/receptionist.types'
import { NeedsAttentionPanel } from './NeedsAttentionPanel'

vi.mock('../hooks/useAppointments', () => ({
  useAppointments: vi.fn(),
  useUpdateAppointmentStatus: vi.fn(),
}))

vi.mock('../hooks/useDashboardStats', () => ({
  useDashboardStats: vi.fn(),
}))

const NOW = Date.now()
const SOON = new Date(NOW + 2 * 3_600_000).toISOString()
const LATE = new Date(NOW - 10 * 60_000).toISOString()

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
    apt_scheduled_at: SOON,
    apt_reason: null,
    created_by_name: 'Rita',
    screening: null,
    apt_checked_in_at: null,
    apt_completed_at: null,
    apt_cancelled_at: null,
    apt_created_at: new Date(NOW - 86_400_000).toISOString(),
    ...overrides,
  }
}

function listResult(results: Appointment[], total = results.length) {
  return {
    data: {
      total,
      page: 1,
      page_size: 5,
      total_pages: 1,
      results,
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    isFetching: false,
  }
}

function mockQueries({
  pending,
  pendingTotal = pending.length,
  overdue,
  overdueTotal = overdue.length,
}: {
  pending: Appointment[]
  pendingTotal?: number
  overdue: Appointment[]
  overdueTotal?: number
}) {
  vi.mocked(useAppointments).mockImplementation(((params: {
    status?: string
    overdue?: string
  }) =>
    params.overdue
      ? (listResult(overdue, overdueTotal) as unknown as ReturnType<
          typeof useAppointments
        >)
      : (listResult(pending, pendingTotal) as unknown as ReturnType<
          typeof useAppointments
        >)) as typeof useAppointments)
}

function renderPanel() {
  return render(
    <MemoryRouter>
      <NeedsAttentionPanel />
    </MemoryRouter>,
  )
}

function mockStats(vetRequests: DashboardStats['vet_requests']) {
  vi.mocked(useDashboardStats).mockReturnValue({
    data: vetRequests === undefined ? undefined : { vet_requests: vetRequests },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    isFetching: false,
  } as unknown as ReturnType<typeof useDashboardStats>)
}

describe('NeedsAttentionPanel', () => {
  beforeEach(() => {
    vi.mocked(useUpdateAppointmentStatus).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateAppointmentStatus>)
    mockStats(undefined)
    mockQueries({ pending: [], overdue: [] })
  })

  it('hides entirely when nothing needs attention', () => {
    const { container } = renderPanel()

    expect(container).toBeEmptyDOMElement()
  })

  it('shows a total count, per-group rows, and +N more links', () => {
    mockQueries({
      pending: [
        apt({ apt_id: 'p1' }),
        apt({ apt_id: 'p2' }),
        apt({ apt_id: 'p3' }),
        apt({ apt_id: 'p4' }),
        apt({ apt_id: 'p5' }),
      ],
      pendingTotal: 7,
      overdue: [
        apt({
          apt_id: 'late1',
          apt_status: 'CONFIRMED',
          apt_scheduled_at: LATE,
        }),
      ],
    })

    renderPanel()

    expect(
      screen.getByRole('heading', { name: 'Needs attention · 8' }),
    ).toBeInTheDocument()

    expect(screen.getByRole('link', { name: /\+2 more/ })).toHaveAttribute(
      'href',
      '/receptionist/appointments?status=PENDING',
    )
    expect(screen.getByText('1 past due')).toBeInTheDocument()
  })

  it('limits pending confirmations to the next 7 days, soonest first', () => {
    renderPanel()

    const calls = vi.mocked(useAppointments).mock.calls.map(
      (call) => call[0],
    )
    const pendingCall = calls.find((params) => params.status === 'PENDING')
    expect(pendingCall).toBeDefined()
    expect(pendingCall?.date_from).toBe(isoDate())
    const windowEnd = new Date()
    windowEnd.setDate(windowEnd.getDate() + 7)
    expect(pendingCall?.date_to).toBe(isoDate(windowEnd))
    expect(pendingCall?.sort).toBe('apt_scheduled_at')
    expect(pendingCall?.page_size).toBe(5)

    const overdueCall = calls.find((params) => params.overdue === '1')
    expect(overdueCall?.sort).toBe('apt_scheduled_at')
    expect(overdueCall?.page_size).toBe(5)
  })

  it('offers check-in and no-show on a past-due confirmed row', () => {
    mockQueries({
      pending: [],
      overdue: [
        apt({
          apt_id: 'late1',
          apt_status: 'CONFIRMED',
          apt_scheduled_at: LATE,
        }),
      ],
    })

    renderPanel()

    expect(screen.getByRole('button', { name: 'Check in' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'No-show' })).toBeInTheDocument()
  })

  it('never renders a completed-without-payment row', () => {
    mockQueries({ pending: [apt({ apt_id: 'p1' })], overdue: [] })

    renderPanel()

    expect(screen.queryByRole('button', { name: 'Review payments' })).toBeNull()
    expect(screen.queryByText(/completed without payment/)).toBeNull()
  })

  it('lists open vet requests with a link to the appointment', () => {
    mockStats([
      {
        apt_id: 'req-1',
        pet_name: 'Rex',
        owner_name: 'Olivia Owner',
        apt_scheduled_at: SOON,
        request_type: 'RESCHEDULE',
        reason: 'Surgery conflict',
        requested_at: SOON,
      },
    ])

    renderPanel()

    const row = screen.getByRole('link', { name: /Surgery conflict/ })
    expect(row).toHaveAttribute('href', '/receptionist/appointments/req-1')
    expect(screen.getByText('1 open vet request')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Needs attention · 1' }),
    ).toBeInTheDocument()
  })

  it('caps the vet request group and links to the filtered list', () => {
    mockStats(
      Array.from({ length: 6 }, (_, index) => ({
        apt_id: `req-${index}`,
        pet_name: `Pet ${index}`,
        owner_name: 'Olivia Owner',
        apt_scheduled_at: SOON,
        request_type: 'CANCEL' as const,
        reason: 'Conflict',
        requested_at: SOON,
      })),
    )

    renderPanel()

    expect(screen.getByText('6 open vet requests')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /\+1 more/ })).toHaveAttribute(
      'href',
      '/receptionist/appointments?requests=1',
    )
  })
})

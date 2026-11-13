import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAppointments } from '../hooks/useAppointments'
import { AppointmentsPage } from './AppointmentsPage'

vi.mock('../hooks/useAppointments', () => ({
  useAppointments: vi.fn(),
  useUpdateAppointmentStatus: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
}))
vi.mock('../hooks/useAvailableSlots', () => ({
  useVetScheduleList: vi.fn(() => ({
    data: { vets: [{ stf_id: 'stf-1', full_name: 'Vera Vet' }] },
    isLoading: false,
    error: null,
  })),
}))

function renderPage(initialEntries: string[] = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AppointmentsPage />
    </MemoryRouter>,
  )
}

const appointmentRow = {
  apt_id: 'apt-1',
  pet_id: 'pet-1',
  pet_name: 'Rex',
  pet_species: 'canine',
  owner_name: 'Olivia Owner',
  vet_name: 'Vera Vet',
  apt_type: 'CONSULTATION',
  apt_status: 'PENDING',
  apt_scheduled_at: '2026-10-02T00:30:00+08:00',
  apt_created_at: '2026-09-01T00:00:00+08:00',
}

describe('AppointmentsPage date & time sorting', () => {
  beforeEach(() => {
    vi.mocked(useAppointments).mockReturnValue({
      data: {
        total: 40,
        page: 1,
        page_size: 20,
        total_pages: 2,
        results: [appointmentRow],
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    } as unknown as ReturnType<typeof useAppointments>)
  })

  it('starts descending (newest first) and sends the default sort param', () => {
    renderPage()

    const header = screen.getByRole('columnheader', { name: /Date & Time/ })
    expect(header).toHaveAttribute('aria-sort', 'descending')
    expect(vi.mocked(useAppointments).mock.lastCall?.[0]?.sort).toBe(
      '-apt_scheduled_at',
    )
  })

  it('toggles to ascending and resets to page 1 on click', async () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() => {
      expect(vi.mocked(useAppointments).mock.lastCall?.[0]?.page).toBe(2)
    })

    fireEvent.click(screen.getByRole('columnheader', { name: /Date & Time/ }))
    await waitFor(() => {
      const params = vi.mocked(useAppointments).mock.lastCall?.[0]
      expect(params?.sort).toBe('apt_scheduled_at')
      expect(params?.page).toBe(1)
    })
    expect(
      screen.getByRole('columnheader', { name: /Date & Time/ }),
    ).toHaveAttribute('aria-sort', 'ascending')
  })

  it('toggles back to descending on a second click', async () => {
    renderPage()

    const header = screen.getByRole('columnheader', { name: /Date & Time/ })
    fireEvent.click(header)
    fireEvent.click(header)
    await waitFor(() => {
      expect(vi.mocked(useAppointments).mock.lastCall?.[0]?.sort).toBe(
        '-apt_scheduled_at',
      )
    })
  })
})

describe('AppointmentsPage vet requests', () => {
  beforeEach(() => {
    vi.mocked(useAppointments).mockReturnValue({
      data: {
        total: 1,
        page: 1,
        page_size: 20,
        total_pages: 1,
        results: [appointmentRow],
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    } as unknown as ReturnType<typeof useAppointments>)
  })

  it('shows a Vet request badge only on rows with an open request', () => {
    vi.mocked(useAppointments).mockReturnValue({
      data: {
        total: 1,
        page: 1,
        page_size: 20,
        total_pages: 1,
        results: [{ ...appointmentRow, has_open_request: true }],
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    } as unknown as ReturnType<typeof useAppointments>)

    renderPage()

    expect(screen.getByText('Vet request')).toBeInTheDocument()
  })

  it('omits the badge when the row has no open request', () => {
    renderPage()

    expect(screen.queryByText('Vet request')).toBeNull()
  })

  it('sends has_request=1 and shows the chip with ?requests=1', () => {
    renderPage(['/receptionist/appointments?requests=1'])

    expect(vi.mocked(useAppointments).mock.lastCall?.[0]?.has_request).toBe('1')
    expect(screen.getByRole('button', { name: /Vet requests/ })).toBeInTheDocument()
  })

  it('does not send has_request by default', () => {
    renderPage()

    expect(vi.mocked(useAppointments).mock.lastCall?.[0]?.has_request).toBeUndefined()
    expect(screen.queryByRole('button', { name: /Vet requests/ })).toBeNull()
  })
})

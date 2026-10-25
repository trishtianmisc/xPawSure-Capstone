import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useClinicSettings } from '../../../clinic-profile/hooks/useClinicSettings'
import { useBreeds, useClinicPatients } from '../hooks/usePatients'
import { ClinicAdminPatientsPage } from './ClinicAdminPatientsPage'

vi.mock('../hooks/usePatients', () => ({
  useClinicPatients: vi.fn(),
  useBreeds: vi.fn(),
}))
vi.mock('../../../clinic-profile/hooks/useClinicSettings', () => ({
  useClinicSettings: vi.fn(),
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <ClinicAdminPatientsPage />
    </MemoryRouter>,
  )
}

describe('ClinicAdminPatientsPage', () => {
  beforeEach(() => {
    vi.mocked(useClinicSettings).mockReturnValue({
      data: { timezone: 'Asia/Manila' },
    } as ReturnType<typeof useClinicSettings>)
    vi.mocked(useBreeds).mockReturnValue({
      data: [{ id: 'breed-1', name: 'Shih Tzu' }],
    } as ReturnType<typeof useBreeds>)
    vi.mocked(useClinicPatients).mockReturnValue({
      data: {
        total: 2,
        total_patients: 7,
        page: 1,
        page_size: 20,
        total_pages: 2,
        results: [
          {
            id: 'pet-1',
            name: 'Bella',
            profile_picture: null,
            breed: 'Shih Tzu',
            sex: 'FEMALE',
            age: 3,
            owner: {
              name: 'Maria Santos',
              phone: '09171234567',
              email: 'maria@example.com',
            },
            last_visit_date: '2026-10-01',
            next_appointment_date: '2026-10-29',
            total_appointments: 4,
            no_show_count: 1,
            cancelled_count: 2,
            vaccination_status: 'overdue',
          },
          {
            id: 'pet-2',
            name: 'Rocky',
            profile_picture: null,
            breed: null,
            sex: 'MALE',
            age: null,
            owner: {
              name: 'Jose Cruz',
              phone: null,
              email: 'jose@example.com',
            },
            last_visit_date: null,
            next_appointment_date: null,
            total_appointments: 1,
            no_show_count: 0,
            cancelled_count: 0,
            vaccination_status: 'up_to_date',
          },
        ],
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useClinicPatients>)
  })

  it('renders the unfiltered total, rows, vaccination statuses, and links', () => {
    renderPage()

    expect(screen.getByText('Total patients: 7')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Bella' })).toHaveAttribute(
      'href',
      '/clinic/patients/pet-1',
    )
    expect(screen.getAllByText('Overdue').length).toBeGreaterThan(1)
    expect(screen.getAllByText('Up to date').length).toBeGreaterThan(1)
    expect(screen.getByText('Showing 1-2 of 2 patients')).toBeInTheDocument()
    expect(screen.getByText('1 no-shows | 2 cancelled')).toBeInTheDocument()
  })

  it('resets to page 1 and sends filter, no-show, and search parameters', async () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() => {
      expect(vi.mocked(useClinicPatients).mock.lastCall?.[0].page).toBe(2)
    })

    fireEvent.change(screen.getByLabelText('Filter by vaccination status'), {
      target: { value: 'overdue' },
    })
    await waitFor(() => {
      expect(vi.mocked(useClinicPatients).mock.lastCall?.[0]).toMatchObject({
        vaccination_status: 'overdue',
        page: 1,
      })
    })

    fireEvent.click(screen.getByRole('button', { name: 'With no-shows' }))
    expect(screen.getByRole('button', { name: 'With no-shows' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await waitFor(() => {
      expect(
        vi.mocked(useClinicPatients).mock.lastCall?.[0].has_no_shows,
      ).toBe(true)
    })

    fireEvent.change(screen.getByLabelText('Search patients'), {
      target: { value: 'bella' },
    })
    await waitFor(
      () => {
        expect(vi.mocked(useClinicPatients).mock.lastCall?.[0].search).toBe(
          'bella',
        )
      },
      { timeout: 1000 },
    )
  })

  it('shows the empty state when no patients match', () => {
    vi.mocked(useClinicPatients).mockReturnValue({
      data: {
        total: 0,
        total_patients: 7,
        page: 1,
        page_size: 20,
        total_pages: 1,
        results: [],
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useClinicPatients>)

    renderPage()

    expect(screen.getByText('No patients found')).toBeInTheDocument()
  })
})

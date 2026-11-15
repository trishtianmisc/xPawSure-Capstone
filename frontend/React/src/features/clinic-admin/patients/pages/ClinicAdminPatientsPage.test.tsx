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

  it('renders rows, appointment totals, and detail links', () => {
    renderPage()

    expect(screen.getByRole('link', { name: 'Bella' })).toHaveAttribute(
      'href',
      '/clinic/patients/pet-1',
    )
    expect(screen.getByRole('link', { name: 'Rocky' })).toHaveAttribute(
      'href',
      '/clinic/patients/pet-2',
    )
    expect(
      screen.getByText('Showing 1-2 of 2 patients'),
    ).toBeInTheDocument()
    expect(screen.getByText('1 no-shows | 2 cancelled')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
  })

  it('resets to page 1 and sends search parameters', async () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() => {
      expect(vi.mocked(useClinicPatients).mock.lastCall?.[0].page).toBe(2)
    })

    fireEvent.change(screen.getByLabelText('Search patients'), {
      target: { value: 'bella' },
    })
    await waitFor(
      () => {
        expect(vi.mocked(useClinicPatients).mock.lastCall?.[0]).toMatchObject({
          search: 'bella',
          page: 1,
        })
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

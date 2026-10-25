import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useClinicSettings } from '../../../clinic-profile/hooks/useClinicSettings'
import { useClinicPatient } from '../hooks/usePatients'
import { ClinicAdminPatientDetailPage } from './ClinicAdminPatientDetailPage'

vi.mock('../hooks/usePatients', () => ({
  useClinicPatient: vi.fn(),
}))
vi.mock('../../../clinic-profile/hooks/useClinicSettings', () => ({
  useClinicSettings: vi.fn(),
}))

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/clinic/patients/pet-1']}>
      <Routes>
        <Route
          element={<ClinicAdminPatientDetailPage />}
          path="/clinic/patients/:id"
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ClinicAdminPatientDetailPage', () => {
  beforeEach(() => {
    vi.mocked(useClinicSettings).mockReturnValue({
      data: { timezone: 'Asia/Manila' },
    } as ReturnType<typeof useClinicSettings>)
    vi.mocked(useClinicPatient).mockReturnValue({
      data: {
        id: 'pet-1',
        name: 'Bella',
        profile_picture: null,
        breed: 'Shih Tzu',
        sex: 'FEMALE',
        age: 3,
        date_of_birth: '2023-02-01',
        weight: '6.50',
        color: 'Cream',
        registered_at: '2024-01-15T02:30:00Z',
        owner: {
          name: 'Maria Santos',
          phone: '09171234567',
          email: 'maria@example.com',
        },
        summary: {
          consultations: 3,
          vaccinations: 4,
          ai_screenings: 5,
        },
        vaccination_status: 'overdue',
        vaccinations: [
          {
            name: 'Rabies',
            date_given: '2026-01-05',
            next_due: '2027-01-05',
          },
        ],
        appointments: [
          {
            apt_id: 'apt-1',
            apt_scheduled_at: '2026-10-02T01:00:00Z',
            apt_type: 'CONSULTATION',
            apt_status: 'COMPLETED',
            vet_name: 'Dr. Reyes',
            apt_cancellation_reason: null,
          },
          {
            apt_id: 'apt-2',
            apt_scheduled_at: '2026-09-20T02:00:00Z',
            apt_type: 'VACCINATION',
            apt_status: 'CANCELLED',
            vet_name: null,
            apt_cancellation_reason: 'Owner requested cancellation',
          },
        ],
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useClinicPatient>)
  })

  it('renders the read-only patient record with owner contacts and history', () => {
    renderPage()

    expect(screen.getByRole('heading', { name: 'Bella' })).toBeInTheDocument()
    expect(screen.getByText('Read-only record')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '0917 123 4567' })).toHaveAttribute(
      'href',
      'tel:09171234567',
    )
    expect(
      screen.getByRole('link', { name: 'maria@example.com' }),
    ).toHaveAttribute('href', 'mailto:maria@example.com')
    expect(screen.getByText('Rabies')).toBeInTheDocument()
    expect(screen.getByText('Dr. Reyes')).toBeInTheDocument()
    expect(
      screen.getByText('Reason: Owner requested cancellation'),
    ).toBeInTheDocument()
    expect(screen.getByText('Unassigned')).toBeInTheDocument()
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })
})

import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { formatDateTime, formatPhone } from '../../../utils/format'
import { useClinicSettings } from '../../clinic-profile/hooks/useClinicSettings'
import { usePetDetail, usePetHistory } from '../hooks/usePets'
import type {
  AppointmentHistoryItem,
  PetDetail,
  PetHistory,
} from '../types/receptionist.types'
import { PetDetailPage } from './PetDetailPage'

vi.mock('../hooks/usePets', () => ({
  usePetDetail: vi.fn(),
  usePetHistory: vi.fn(),
}))

vi.mock('../../clinic-profile/hooks/useClinicSettings', () => ({
  useClinicSettings: vi.fn(),
}))

const TIME_ZONE = 'Asia/Manila'

function isoFromNow(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString()
}

const pet: PetDetail = {
  id: 'pet-1',
  name: 'Rex',
  sex: 'MALE',
  breed_id: 'breed-1',
  breed_name: 'Shih Tzu',
  date_of_birth: '2021-03-04',
  weight: 12.5,
  color: 'Cream',
  microchip_number: 'MC-1',
  profile_picture: null,
  qr_code: 'QR-1',
  qr_code_url: null,
  created_at: '2026-01-05T10:00:00+08:00',
  owner_name: 'Olga Owner',
  last_visit_date: '2026-10-01',
  next_appointment_date: null,
  owner: {
    name: 'Olga Owner',
    phone: '+639171234567',
    email: 'olga.owner@example.com',
  },
}

// Newest-first, as the API returns them: the far visit is stored before the
// nearer one, a cancelled visit is ahead of both, and a past visit trails.
const nearAppointment = isoFromNow(2)
const farAppointment = isoFromNow(9)

const appointments: AppointmentHistoryItem[] = [
  {
    apt_id: 'apt-far',
    apt_scheduled_at: farAppointment,
    apt_type: 'FOLLOW_UP',
    apt_status: 'CONFIRMED',
    vet_name: 'Vera Vet',
  },
  {
    apt_id: 'apt-cancelled',
    apt_scheduled_at: isoFromNow(4),
    apt_type: 'CONSULTATION',
    apt_status: 'CANCELLED',
    vet_name: 'Vera Vet',
  },
  {
    apt_id: 'apt-near',
    apt_scheduled_at: nearAppointment,
    apt_type: 'CONSULTATION',
    apt_status: 'PENDING',
    vet_name: 'Vince Vet',
  },
  {
    apt_id: 'apt-past',
    apt_scheduled_at: isoFromNow(-6),
    apt_type: 'CONSULTATION',
    apt_status: 'COMPLETED',
    vet_name: 'Vera Vet',
  },
]

const history: PetHistory = {
  vaccinations: [
    {
      id: 'vac-1',
      consultation_id: null,
      pet_id: 'pet-1',
      pet_name: 'Rex',
      veterinarian: 'Vera Vet',
      name: 'Rabies',
      brand: 'Nobivac',
      batch_no: null,
      series_id: 'series-1',
      is_latest_in_series: true,
      dose: '1 ml',
      route: 'SUBCUTANEOUS',
      date_given: '2026-01-15',
      next_due: '2027-01-15',
      notes: null,
      source: 'VET',
      created_at: '2026-01-15T10:00:00+08:00',
    },
  ],
  appointments,
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/receptionist/pets/pet-1']}>
      <Routes>
        <Route element={<PetDetailPage />} path="/receptionist/pets/:id" />
        <Route element={<div>patients list</div>} path="/receptionist/pets" />
        <Route
          element={<div>appointment detail</div>}
          path="/receptionist/appointments/:id"
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('PetDetailPage', () => {
  beforeEach(() => {
    vi.mocked(usePetDetail).mockReturnValue({
      data: pet,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    } as unknown as ReturnType<typeof usePetDetail>)
    vi.mocked(usePetHistory).mockReturnValue({
      data: history,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    } as unknown as ReturnType<typeof usePetHistory>)
    vi.mocked(useClinicSettings).mockReturnValue({
      data: { timezone: TIME_ZONE },
    } as unknown as ReturnType<typeof useClinicSettings>)
  })

  it('lays out summary tiles, owner contact, patient details, and history', () => {
    renderPage()

    for (const label of ['Appointments', 'Vaccinations', 'Next appointment']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
    for (const heading of [
      'Owner',
      'Patient details',
      'Vaccination history',
      'Appointment history',
    ]) {
      expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument()
    }
    expect(screen.getByText(formatPhone(pet.owner?.phone))).toBeInTheDocument()
    expect(screen.getByText('olga.owner@example.com')).toBeInTheDocument()
    expect(screen.getByText('Shih Tzu')).toBeInTheDocument()
    expect(screen.getByText('Rabies')).toBeInTheDocument()

    expect(
      screen.getByRole('link', { name: /back to patients/i }),
    ).toHaveAttribute('href', '/receptionist/pets')
  })

  it('drops the clinical sections the desk is not allowed to read', () => {
    renderPage()

    for (const hidden of [
      'Consultations',
      'Prescriptions',
      'AI Screenings',
      'AI Screening',
      'Diagnosis',
      'Subjective',
      'Prescription',
    ]) {
      expect(screen.queryByText(hidden)).toBeNull()
    }
  })

  it('shows the earliest upcoming appointment, not the newest in the array', () => {
    renderPage()

    const nearText = formatDateTime(nearAppointment, TIME_ZONE)
    const farText = formatDateTime(farAppointment, TIME_ZONE)

    // The earliest visit appears in the tile and its own history row; the far
    // one only ever appears in the history table.
    expect(screen.getAllByText(nearText)).toHaveLength(2)
    expect(screen.getAllByText(farText)).toHaveLength(1)
  })

  it('navigates to the appointment when a history row is clicked', () => {
    renderPage()

    fireEvent.click(screen.getAllByText('Completed')[0])

    expect(screen.getByText('appointment detail')).toBeInTheDocument()
  })
})


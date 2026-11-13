import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { VetAppointmentDetail } from '../types/dashboard.types'
import {
  useAppointmentDetail,
  useRequestCancellation,
  useRequestReschedule,
  useStartConsultation,
} from '../hooks/useVetAppointments'
import { AppointmentDetailPage } from './AppointmentDetailPage'

vi.mock('../hooks/useVetAppointments', () => ({
  useAppointmentDetail: vi.fn(),
  useStartConsultation: vi.fn(),
  useRequestReschedule: vi.fn(),
  useRequestCancellation: vi.fn(),
}))

function makeAppointment(petProfileImage: string | null): VetAppointmentDetail {
  return {
    apt_id: 'apt-1',
    pet_id: 'pet-1',
    pet_name: 'Max',
    pet_breed: 'Pug',
    pet_sex: 'MALE',
    pet_birth_date: '2022-01-01',
    pet_weight: '12.50',
    pet_color: 'Black',
    pet_profile_image: petProfileImage,
    owner_name: 'Olivia Owner',
    owner_phone: '09171234567',
    owner_address: '123 Bark Street, Quezon City',
    vet_name: 'Vet Vera',
    vet_license_number: 'VET-12345',
    clinic_name: 'Happy Paws Clinic',
    clinic_address: '456 Paws Avenue, Quezon City',
    clinic_phone: '0977881111',
    apt_type: 'CONSULTATION',
    apt_status: 'CONFIRMED',
    apt_scheduled_at: '2026-01-05T09:00:00+08:00',
    apt_reason: null,
    apt_cancellation_reason: null,
    apt_reschedule_request_reason: null,
    apt_cancellation_request_reason: null,
    apt_created_at: '2026-01-01T08:00:00+08:00',
    apt_checked_in_at: null,
    apt_completed_at: null,
    screening: null,
    consultation: null,
    prescription: null,
    payment_provider_ref: 'PROV-REF-123',
  }
}

function renderPage(appointment: VetAppointmentDetail) {
  vi.mocked(useAppointmentDetail).mockReturnValue({
    data: appointment,
    isLoading: false,
    error: null,
  } as unknown as ReturnType<typeof useAppointmentDetail>)

  return render(
    <MemoryRouter initialEntries={[`/veterinarian/appointments/${appointment.apt_id}`]}>
      <Routes>
        <Route element={<AppointmentDetailPage />} path="/veterinarian/appointments/:id" />
        <Route element={<div>History page stub</div>} path="/veterinarian/pets/:petId/history" />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AppointmentDetailPage pet avatar', () => {
  beforeEach(() => {
    vi.mocked(useStartConsultation).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useStartConsultation>)
    vi.mocked(useRequestReschedule).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useRequestReschedule>)
    vi.mocked(useRequestCancellation).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useRequestCancellation>)
  })

  it('shows the real pet profile image', () => {
    renderPage(makeAppointment('https://example.com/max.jpg'))

    const image = screen.getByRole('img', { name: 'Max' })

    expect(image).toHaveAttribute('src', 'https://example.com/max.jpg')
    expect(image).toHaveClass('size-28', 'rounded-2xl')
  })

  it('falls back to the placeholder when the image fails to load', () => {
    renderPage(makeAppointment('https://example.com/broken.jpg'))

    fireEvent.error(screen.getByRole('img', { name: 'Max' }))

    expect(screen.queryByRole('img', { name: 'Max' })).not.toBeInTheDocument()
  })

  it('shows the placeholder when the pet has no profile image', () => {
    renderPage(makeAppointment(null))

    expect(screen.queryByRole('img', { name: 'Max' })).not.toBeInTheDocument()
  })

  it('links to the pet consultation history', () => {
    renderPage(makeAppointment(null))

    fireEvent.click(screen.getByRole('button', { name: 'View consultation history' }))

    expect(screen.getByText('History page stub')).toBeInTheDocument()
  })

  it('shows the clinic but not the veterinarian in the page hero', () => {
    renderPage(makeAppointment(null))

    expect(screen.getByText('Happy Paws Clinic')).toBeInTheDocument()
    expect(screen.queryByText('Vet Vera')).not.toBeInTheDocument()
  })

  it('shows owner details in the appointment details card', () => {
    renderPage(makeAppointment(null))

    expect(screen.getByText('Owner')).toBeInTheDocument()
    expect(screen.getByText('Olivia Owner')).toBeInTheDocument()
    expect(screen.getByText('Contact info')).toBeInTheDocument()
    expect(screen.getByText('09171234567')).toBeInTheDocument()
  })

  it('shows the booked and scheduled times and hides unrecorded visit timestamps', () => {
    renderPage(makeAppointment(null))

    expect(screen.getByText('Booked time')).toBeInTheDocument()
    expect(screen.getByText('Scheduled')).toBeInTheDocument()
    expect(screen.queryByText('Checked in')).not.toBeInTheDocument()
    expect(screen.queryByText('Completed')).not.toBeInTheDocument()
  })

  it('shows the check-in and completion times when recorded', () => {
    const appointment = makeAppointment(null)
    appointment.apt_checked_in_at = '2026-01-05T08:55:00+08:00'
    appointment.apt_completed_at = '2026-01-05T09:30:00+08:00'

    renderPage(appointment)

    expect(screen.getByText('Checked in')).toBeInTheDocument()
    expect(screen.getByText('Completed')).toBeInTheDocument()
  })

  it('shows the payment provider reference', () => {
    renderPage(makeAppointment(null))

    expect(screen.getByText('PROV-REF-123')).toBeInTheDocument()
  })

  it('opens and closes the screening image preview', () => {
    const appointment = makeAppointment(null)
    appointment.screening = {
      ais_id: 'ais-1',
      disease: 'Dermatitis',
      ais_confidence: 91,
      ais_model_version: 'v1',
      ais_status: 'COMPLETED',
      ais_source: 'OWNER',
      ais_created_at: '2026-01-05T08:30:00+08:00',
      symptom_answers: [],
      image_url: 'https://example.com/dermatitis.jpg',
    }

    renderPage(appointment)

    fireEvent.click(
      screen.getByRole('button', { name: 'Zoom Dermatitis screening image' }),
    )

    expect(
      screen.getByRole('dialog', { name: 'AI screening image preview' }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Close image preview' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

import { render, screen } from '@testing-library/react'

import { PrescriptionPreviewDocument } from './PrescriptionPreviewDocument'
import type {
  VetAppointmentDetail,
  VetPrescriptionInfo,
} from '../types/dashboard.types'

function makePrescription(
  overrides: Partial<VetPrescriptionInfo> = {},
): VetPrescriptionInfo {
  return {
    id: 'prs-1',
    consultation_id: 'con-1',
    pet_id: 'pet-1',
    pet_name: 'Buddy',
    veterinarian: 'Dr. Smith',
    instructions: 'Give with food.',
    items: [
      {
        id: 'item-1',
        medicine_name: 'Amoxicillin',
        generic_name: 'Amoxicillin trihydrate',
        dosage: '250mg',
        frequency: 'Twice daily',
        duration: '7 days',
        route: 'ORAL',
        quantity: 14,
        notes: 'Finish the full course.',
      },
    ],
    created_at: '2026-01-01T10:00:00Z',
    ...overrides,
  }
}

function makeAppointment(
  overrides: Partial<VetAppointmentDetail> = {},
): VetAppointmentDetail {
  return {
    apt_id: 'apt-1',
    pet_id: 'pet-1',
    pet_name: 'Buddy',
    pet_breed: 'Labrador',
    pet_sex: 'MALE',
    pet_birth_date: '2020-01-01',
    pet_weight: '12.50',
    pet_color: 'Black',
    pet_profile_image: null,
    owner_name: 'John Doe',
    owner_phone: '09171234567',
    owner_address: '123 Bark Street, Quezon City',
    vet_name: 'Dr. Smith',
    vet_license_number: 'VET-12345',
    clinic_name: 'Happy Paws Clinic',
    clinic_address: '456 Paws Avenue, Quezon City',
    clinic_phone: '0977881111',
    apt_type: 'CHECKUP',
    apt_status: 'IN_PROGRESS',
    apt_scheduled_at: '2026-01-01T10:00:00Z',
    apt_reason: null,
    apt_cancellation_reason: null,
    apt_reschedule_request_reason: null,
    apt_cancellation_request_reason: null,
    apt_created_at: '2026-01-01T09:00:00Z',
    apt_checked_in_at: null,
    apt_completed_at: null,
    screening: null,
    consultation: null,
    prescription: null,
    payment_provider_ref: null,
    ...overrides,
  }
}

describe('PrescriptionPreviewDocument', () => {
  it('follows the owner mobile prescription PDF format', () => {
    render(
      <PrescriptionPreviewDocument
        appointment={makeAppointment()}
        prescription={makePrescription()}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Dr. Smith, DVM' })).toBeInTheDocument()
    expect(screen.getByText('Veterinary Medicine')).toBeInTheDocument()
    expect(screen.getByText('0977881111')).toBeInTheDocument()
    expect(
      screen.getByText(/Happy Paws Clinic · 456 Paws Avenue, Quezon City/),
    ).toBeInTheDocument()

    expect(screen.getByText("Owner's Name")).toBeInTheDocument()
    expect(screen.getByText('Date')).toBeInTheDocument()
    expect(screen.getByText("Pet's Name")).toBeInTheDocument()
    expect(screen.getByText("Pet's Age")).toBeInTheDocument()
    expect(screen.getByText('Sex')).toBeInTheDocument()
    expect(screen.getByText('Weight')).toBeInTheDocument()
    expect(screen.getByText('Breed')).toBeInTheDocument()
    expect(screen.getByText('Color')).toBeInTheDocument()

    expect(screen.getByText('Male')).toBeInTheDocument()
    expect(screen.getByText('12.50 kg')).toBeInTheDocument()
    expect(screen.getByText('Labrador')).toBeInTheDocument()
    expect(screen.getByText('Black')).toBeInTheDocument()

    expect(screen.getByText('Medicine')).toBeInTheDocument()
    expect(screen.getByText('Dosage & schedule')).toBeInTheDocument()
    expect(screen.getByText('Amoxicillin')).toBeInTheDocument()
    expect(screen.getByText('Amoxicillin trihydrate')).toBeInTheDocument()
    expect(screen.getByText(/Finish the full course\./)).toBeInTheDocument()
    expect(screen.getByText('Twice daily · 7 days')).toBeInTheDocument()
    expect(screen.getByText(/Oral · Qty: 14/)).toBeInTheDocument()
    expect(screen.getByText(/Give with food\./)).toBeInTheDocument()
    expect(screen.getByText('VET-12345')).toBeInTheDocument()

    expect(document.querySelector('#rx-watermark-pattern')).toBeNull()
  })

  it('uses em dashes for missing pet details like the mobile PDF', () => {
    render(
      <PrescriptionPreviewDocument
        appointment={makeAppointment({
          pet_breed: null,
          pet_sex: '',
          pet_birth_date: null,
          pet_weight: null,
          pet_color: null,
          owner_name: null,
        })}
        prescription={makePrescription({ instructions: null, items: [] })}
      />,
    )

    expect(screen.getByText('No medications listed.')).toBeInTheDocument()
    expect(screen.queryAllByText('—').length).toBeGreaterThanOrEqual(5)
  })
})

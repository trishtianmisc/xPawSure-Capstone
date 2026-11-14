import { fireEvent, render, screen } from '@testing-library/react'

import { PrescriptionPreviewPage } from './PrescriptionPreviewPage'
import { useAppointmentDetail } from '../hooks/useVetAppointments'
import type {
  VetAppointmentDetail,
  VetPrescriptionInfo,
} from '../types/dashboard.types'

vi.mock('../hooks/useVetAppointments', () => ({
  useAppointmentDetail: vi.fn(),
}))

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal()),
  useParams: () => ({ id: 'apt-1' }),
  useNavigate: () => vi.fn(),
}))

function makePrescription(): VetPrescriptionInfo {
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
  }
}

function makeAppointment(prescription: VetPrescriptionInfo | null): VetAppointmentDetail {
  return {
    apt_id: 'apt-1',
    pet_id: 'pet-1',
    pet_name: 'Buddy',
    pet_breed: 'Labrador',
    pet_sex: 'MALE',
    pet_birth_date: '2022-01-01',
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
    prescription,
    payment_provider_ref: null,
  }
}

describe('PrescriptionPreviewPage', () => {
  beforeEach(() => {
    vi.mocked(useAppointmentDetail).mockReturnValue({
      data: makeAppointment(makePrescription()),
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useAppointmentDetail>)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the prescription document and prints it', () => {
    const printSpy = vi.spyOn(globalThis.window, 'print').mockImplementation(() => undefined)

    render(<PrescriptionPreviewPage />)

    expect(screen.getByText('Veterinary Medicine')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Dr. Smith, DVM' })).toBeInTheDocument()
    expect(
      screen.getByText(/Happy Paws Clinic · 456 Paws Avenue, Quezon City/),
    ).toBeInTheDocument()
    expect(screen.getByText('VET-12345')).toBeInTheDocument()
    expect(screen.queryByText(/PTR #/)).not.toBeInTheDocument()
    expect(screen.queryByText(/S2 #/)).not.toBeInTheDocument()
    expect(screen.getByText("Owner's Name")).toBeInTheDocument()
    expect(screen.getByText("Pet's Age")).toBeInTheDocument()
    expect(document.querySelector('#rx-watermark-pattern')).toBeNull()
    expect(screen.getByText('Male')).toBeInTheDocument()
    expect(screen.getByText('Labrador')).toBeInTheDocument()
    expect(screen.getByText('12.50 kg')).toBeInTheDocument()
    expect(screen.getByText('Black')).toBeInTheDocument()
    expect(screen.queryByText(/Bark Street/)).not.toBeInTheDocument()
    expect(screen.getByText('Amoxicillin')).toBeInTheDocument()
    expect(screen.getByText(/Finish the full course/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Print / Save as PDF' }))

    expect(printSpy).toHaveBeenCalledTimes(1)
  })

  it('shows an empty state when no prescription has been saved', () => {
    vi.mocked(useAppointmentDetail).mockReturnValue({
      data: makeAppointment(null),
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useAppointmentDetail>)

    render(<PrescriptionPreviewPage />)

    expect(screen.getByText('No prescription available')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /print/i })).not.toBeInTheDocument()
  })
})

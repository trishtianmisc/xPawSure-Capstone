import { fireEvent, render, screen, within } from '@testing-library/react'

import { PrescriptionPage } from './PrescriptionPage'
import { useAppointmentDetail, useSavePrescription } from '../hooks/useVetAppointments'
import type { VetAppointmentDetail } from '../types/dashboard.types'

vi.mock('../hooks/useVetAppointments', () => ({
  useAppointmentDetail: vi.fn(),
  useSavePrescription: vi.fn(),
}))

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal()),
  useParams: () => ({ id: 'apt-1' }),
  useNavigate: () => vi.fn(),
}))

function makeAppointment(): VetAppointmentDetail {
  return {
    apt_id: 'apt-1',
    pet_id: 'pet-1',
    pet_name: 'Buddy',
    pet_breed: 'Labrador',
    pet_sex: 'MALE',
    pet_birth_date: null,
    pet_weight: '12.50',
    pet_color: 'Black',
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
    screening: null,
    consultation: null,
    prescription: null,
  }
}

function field(label: string): HTMLInputElement | HTMLSelectElement {
  return screen.getByText(label).nextElementSibling as HTMLInputElement | HTMLSelectElement
}

function fillForm() {
  fireEvent.change(field('Medicine Name'), { target: { value: 'Amoxicillin' } })
  fireEvent.change(field('Dosage'), { target: { value: '250mg' } })
  fireEvent.change(field('Route of Administration'), { target: { value: 'ORAL' } })
  fireEvent.change(field('Frequency'), { target: { value: 'Twice daily' } })
  fireEvent.change(field('Duration'), { target: { value: '7 days' } })
}

describe('PrescriptionPage confirmation popup', () => {
  beforeEach(() => {
    vi.mocked(useAppointmentDetail).mockReturnValue({
      data: makeAppointment(),
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useAppointmentDetail>)
    vi.mocked(useSavePrescription).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useSavePrescription>)
  })

  it('opens the confirmation popup with the entered values instead of adding immediately', () => {
    render(<PrescriptionPage />)
    fillForm()

    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    expect(screen.getByRole('heading', { name: 'Confirm medication' })).toBeInTheDocument()
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Amoxicillin')).toBeInTheDocument()
    expect(within(dialog).getByText('250mg')).toBeInTheDocument()
    expect(within(dialog).getByText('Oral')).toBeInTheDocument()
    // Not committed to the table yet
    expect(document.querySelector('tbody')).toBeNull()
  })

  it('adds the row to the table only after Confirm', () => {
    render(<PrescriptionPage />)
    fillForm()

    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))

    expect(screen.queryByRole('heading', { name: 'Confirm medication' })).not.toBeInTheDocument()
    expect(document.querySelector('tbody')).not.toBeNull()
    expect(screen.getByText('Amoxicillin')).toBeInTheDocument()
    // Form cleared after commit
    expect((field('Medicine Name') as HTMLInputElement).value).toBe('')
  })

  it('adds nothing and keeps the typed values when Go back is clicked', () => {
    render(<PrescriptionPage />)
    fillForm()

    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    fireEvent.click(screen.getByRole('button', { name: 'Go back' }))

    expect(screen.queryByRole('heading', { name: 'Confirm medication' })).not.toBeInTheDocument()
    expect(document.querySelector('tbody')).toBeNull()
    expect((field('Medicine Name') as HTMLInputElement).value).toBe('Amoxicillin')
  })

  it('shows a validation error and no popup when medicine name is empty', () => {
    render(<PrescriptionPage />)
    fireEvent.change(field('Route of Administration'), { target: { value: 'ORAL' } })

    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    expect(screen.getByText('Medicine name is required.')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Confirm medication' })).not.toBeInTheDocument()
  })
})

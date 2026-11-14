import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'

import { PrescriptionPage } from './PrescriptionPage'
import { useAppointmentDetail, useSavePrescription } from '../hooks/useVetAppointments'
import type { VetAppointmentDetail } from '../types/dashboard.types'

vi.mock('../hooks/useVetAppointments', () => ({
  useAppointmentDetail: vi.fn(),
  useSavePrescription: vi.fn(),
}))

const navigateMock = vi.hoisted(() => vi.fn())

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal()),
  useParams: () => ({ id: 'apt-1' }),
  useNavigate: () => navigateMock,
}))

function makeAppointment(withConsultation = false): VetAppointmentDetail {
  return {
    apt_id: 'apt-1',
    pet_id: 'pet-1',
    pet_name: 'Buddy',
    pet_breed: 'Labrador',
    pet_sex: 'MALE',
    pet_birth_date: null,
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
    consultation: withConsultation
      ? {
          id: 'con-1',
          appointment_id: 'apt-1',
          pet_id: 'pet-1',
          pet_name: 'Buddy',
          veterinarian: 'Dr. Smith',
          chief_complaint: null,
          subjective: null,
          objective: null,
          assessment: null,
          plan: null,
          diagnosis: 'Bacterial Infection',
          specific_disease: null,
          treatment: null,
          notes: null,
          follow_up_required: false,
          follow_up_target_date: null,
          created_at: '2026-01-01T10:00:00Z',
        }
      : null,
    prescription: null,
    payment_provider_ref: null,
  }
}

function field(label: string): HTMLInputElement | HTMLSelectElement {
  return screen.getByText(label).nextElementSibling as HTMLInputElement | HTMLSelectElement
}

function fillForm() {
  fireEvent.change(field('Medicine Name'), { target: { value: 'Amoxicillin' } })
  fireEvent.change(field('Generic Name'), { target: { value: 'Amoxicillin trihydrate' } })
  fireEvent.change(field('Dosage'), { target: { value: '250mg' } })
  fireEvent.change(field('Route of Administration'), { target: { value: 'ORAL' } })
  fireEvent.change(field('Frequency'), { target: { value: 'Twice daily' } })
  fireEvent.change(field('Duration'), { target: { value: '7 days' } })
  fireEvent.change(field('Quantity'), { target: { value: '14' } })
  fireEvent.change(field('Special Instructions'), { target: { value: 'Give with food' } })
}

describe('PrescriptionPage confirmation popup', () => {
  beforeEach(() => {
    navigateMock.mockClear()
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
    const dialog = screen.getByRole('dialog', { name: 'Confirm medication' })
    const table = within(dialog).getByRole('table')
    const rows = within(table).getAllByRole('row')

    expect(rows).toHaveLength(4)
    expect(within(rows[0]).getAllByRole('cell')).toHaveLength(2)
    expect(within(rows[1]).getAllByRole('cell')).toHaveLength(3)
    expect(within(rows[2]).getAllByRole('cell')).toHaveLength(2)
    expect(within(rows[3]).getAllByRole('cell')).toHaveLength(1)

    expect(within(dialog).getByText('Amoxicillin')).toBeInTheDocument()
    expect(within(dialog).getByText('Amoxicillin trihydrate')).toBeInTheDocument()
    expect(within(dialog).getByText('250mg')).toBeInTheDocument()
    expect(within(dialog).getByText('14')).toBeInTheDocument()
    expect(within(dialog).getByText('Oral')).toBeInTheDocument()
    expect(within(dialog).getByText('Give with food')).toBeInTheDocument()

    expect(
      within(dialog).queryByText(
        'This prescription remains editable until the receptionist completes the appointment.',
      ),
    ).not.toBeInTheDocument()
    // Not committed to the prescription table yet
    expect(screen.getAllByRole('table')).toHaveLength(1)
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

  it('reviews the prescription table before completing the consultation', async () => {
    const mutateAsync = vi.fn().mockResolvedValue(undefined)
    vi.mocked(useSavePrescription).mockReturnValue({
      mutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useSavePrescription>)
    vi.mocked(useAppointmentDetail).mockReturnValue({
      data: makeAppointment(true),
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useAppointmentDetail>)

    render(<PrescriptionPage />)
    fillForm()
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    fireEvent.click(screen.getByRole('button', { name: 'Complete Consultation' }))

    const dialog = screen.getByRole('dialog', { name: 'Complete consultation' })
    expect(
      within(dialog).getByText('Review the prescription before completing consultation.'),
    ).toBeInTheDocument()

    const table = within(dialog).getByRole('table')
    expect(within(table).getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual([
      'Medicine',
      'Generic',
      'Dosage',
      'Frequency',
      'Duration',
      'Route',
    ])
    expect(within(table).getByText('Amoxicillin')).toBeInTheDocument()
    expect(within(table).getByText('Amoxicillin trihydrate')).toBeInTheDocument()
    expect(within(table).getByText('250mg')).toBeInTheDocument()
    expect(within(table).getByText('Twice daily')).toBeInTheDocument()
    expect(within(table).getByText('7 days')).toBeInTheDocument()
    expect(within(table).getByText('Oral')).toBeInTheDocument()
    expect(within(table).queryByText('Quantity')).not.toBeInTheDocument()
    expect(within(table).queryByText('Instructions')).not.toBeInTheDocument()
    expect(within(table).queryByText('Give with food')).not.toBeInTheDocument()

    const note = within(dialog).getByText(
      'The consultation and prescription remain editable until the receptionist completes the appointment.',
    )
    expect(note.previousElementSibling).toContainElement(table)
    expect(mutateAsync).not.toHaveBeenCalled()

    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirm and complete' }))

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1))
    expect(navigateMock).toHaveBeenCalledWith('/veterinarian/appointments/apt-1')
  })

  it('adds nothing and keeps the typed values when Go back is clicked', () => {
    render(<PrescriptionPage />)
    fillForm()

    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    fireEvent.click(screen.getByRole('button', { name: 'Go back' }))

    expect(screen.queryByRole('heading', { name: 'Confirm medication' })).not.toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect((field('Medicine Name') as HTMLInputElement).value).toBe('Amoxicillin')
  })

  it('shows a validation error and no popup when medicine name is empty', () => {
    render(<PrescriptionPage />)
    fireEvent.change(field('Route of Administration'), { target: { value: 'ORAL' } })

    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    expect(screen.getByText('Medicine name is required.')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Confirm medication' })).not.toBeInTheDocument()
  })

  it('shows a validation error and no popup when quantity is empty', () => {
    render(<PrescriptionPage />)
    fireEvent.change(field('Medicine Name'), { target: { value: 'Amoxicillin' } })
    fireEvent.change(field('Route of Administration'), { target: { value: 'ORAL' } })

    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    expect(
      screen.getByText('Please enter a valid quantity (whole number greater than 0).'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Confirm medication' })).not.toBeInTheDocument()
  })

  it('proceeds to the appointment without saving when Next is clicked', () => {
    render(<PrescriptionPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    expect(navigateMock).toHaveBeenCalledWith('/veterinarian/appointments/apt-1')
  })
})

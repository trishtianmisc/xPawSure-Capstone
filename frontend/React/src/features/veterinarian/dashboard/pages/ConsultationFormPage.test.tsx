import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'

import { useAppointmentDetail, useSaveConsultation } from '../hooks/useVetAppointments'
import type { VetAppointmentDetail } from '../types/dashboard.types'
import { ConsultationFormPage } from './ConsultationFormPage'

vi.mock('../hooks/useVetAppointments', () => ({
  useAppointmentDetail: vi.fn(),
  useSaveConsultation: vi.fn(),
}))

const navigateMock = vi.hoisted(() => vi.fn())

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal()),
  useParams: () => ({ id: 'apt-1' }),
  useNavigate: () => navigateMock,
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
    payment: null,
    payment_provider_ref: null,
  }
}

function field(label: string): HTMLTextAreaElement {
  return screen.getByText(label).nextElementSibling as HTMLTextAreaElement
}

function fillForm() {
  fireEvent.change(field('Chief complaint'), {
    target: { value: 'Itchign around both ears' },
  })
  fireEvent.change(field('Observations'), {
    target: { value: 'Redness and mild swelling' },
  })
  fireEvent.change(screen.getByLabelText('Specific Disease'), {
    target: { value: 'Ear canal dermatitis' },
  })
  fireEvent.change(field('Notes'), {
    target: { value: 'Monitor for 7 days' },
  })
  fireEvent.click(screen.getByRole('combobox'))
  fireEvent.click(screen.getByRole('option', { name: 'Bacterial Infection' }))
}

describe('ConsultationFormPage review modal', () => {
  const mutateAsync = vi.fn()

  beforeEach(() => {
    navigateMock.mockClear()
    mutateAsync.mockReset()
    mutateAsync.mockResolvedValue({})
    vi.mocked(useAppointmentDetail).mockReturnValue({
      data: makeAppointment(),
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useAppointmentDetail>)
    vi.mocked(useSaveConsultation).mockReturnValue({
      mutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useSaveConsultation>)
  })

  it('shows the real pet profile image instead of a placeholder', () => {
    vi.mocked(useAppointmentDetail).mockReturnValue({
      data: {
        ...makeAppointment(),
        pet_profile_image: 'https://example.com/buddy.jpg',
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useAppointmentDetail>)

    render(<ConsultationFormPage />)

    expect(screen.getByRole('img', { name: 'Buddy profile' })).toHaveAttribute(
      'src',
      'https://example.com/buddy.jpg',
    )
  })

  it('opens the review modal with the entered values instead of saving', () => {
    render(<ConsultationFormPage />)
    fillForm()

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    const dialog = screen.getByRole('dialog', { name: 'Review consultation' })
    expect(within(dialog).getByRole('table')).toBeInTheDocument()
    expect(within(dialog).getByText('Itchign around both ears')).toBeInTheDocument()
    expect(within(dialog).getByText('Redness and mild swelling')).toHaveClass(
      'whitespace-pre-wrap',
      'break-words',
    )
    expect(within(dialog).getByText('Bacterial Infection')).toHaveClass(
      'text-xl',
      'font-bold',
      'my-2',
    )
    expect(within(dialog).getByText('Specific disease')).toBeInTheDocument()
    expect(within(dialog).getByText('Ear canal dermatitis')).toBeInTheDocument()
    expect(within(dialog).getByText('Monitor for 7 days')).toBeInTheDocument()
    expect(within(dialog).queryByText('Dr. Smith')).not.toBeInTheDocument()
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('saves and continues only after confirmation', async () => {
    render(<ConsultationFormPage />)
    fillForm()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    const dialog = screen.getByRole('dialog', { name: 'Review consultation' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirm and continue' }))

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        aptId: 'apt-1',
        conId: null,
        payload: {
          chief_complaint: 'Itchign around both ears',
          objective: 'Redness and mild swelling',
          diagnosis: 'Bacterial',
          specific_disease: 'Ear canal dermatitis',
          notes: 'Monitor for 7 days',
          follow_up_required: false,
          follow_up_target_date: null,
        },
      }),
    )
    expect(navigateMock).toHaveBeenCalledWith(
      '/veterinarian/consultations/apt-1/prescription',
    )
  })

  it('keeps the form values when going back from review', () => {
    render(<ConsultationFormPage />)
    fillForm()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    const dialog = screen.getByRole('dialog', { name: 'Review consultation' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Go back' }))

    expect(screen.queryByRole('dialog', { name: 'Review consultation' })).not.toBeInTheDocument()
    expect(field('Chief complaint').value).toBe('Itchign around both ears')
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('shows validation without opening the review modal', () => {
    render(<ConsultationFormPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    expect(screen.getByText('Please select a diagnosis.')).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Review consultation' })).not.toBeInTheDocument()
    expect(mutateAsync).not.toHaveBeenCalled()
  })
})

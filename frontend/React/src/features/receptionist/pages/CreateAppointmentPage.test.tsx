import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAvailableSlots, useVetsForDate } from '../hooks/useAvailableSlots'
import { useCreateAppointment } from '../hooks/useAppointments'
import { useClinicSettings } from '../hooks/useClinicSettings'
import { useOwners } from '../hooks/useOwners'
import { usePets } from '../hooks/usePets'
import { useCancelPayment, useCreateCheckout, usePayment } from '../../payments/hooks/usePayments'
import { useToast } from '../../../components/ui/ToastContext'
import { CreateAppointmentPage } from './CreateAppointmentPage'

const SLOT_ID = '11111111-1111-4111-8111-111111111111'
const PET_ID = '22222222-2222-4222-8222-222222222222'

const routerState = vi.hoisted(() => ({ params: new URLSearchParams() }))
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useSearchParams: () => [routerState.params],
}))

vi.mock('../hooks/useAvailableSlots', () => ({
  useVetsForDate: vi.fn(),
  useAvailableSlots: vi.fn(),
}))
vi.mock('../hooks/useAppointments', () => ({ useCreateAppointment: vi.fn() }))
vi.mock('../hooks/useClinicSettings', () => ({ useClinicSettings: vi.fn() }))
vi.mock('../hooks/useOwners', () => ({ useOwners: vi.fn() }))
vi.mock('../hooks/usePets', () => ({ usePets: vi.fn() }))
vi.mock('../../payments/hooks/usePayments', () => ({
  useCreateCheckout: vi.fn(),
  usePayment: vi.fn(),
  useCancelPayment: vi.fn(),
}))
vi.mock('../../../components/ui/ToastContext', () => ({ useToast: vi.fn() }))
vi.mock('../components/PetRegisterModal', () => ({ PetRegisterModal: () => null }))

function renderPage() {
  return render(<CreateAppointmentPage />)
}

beforeEach(() => {
  vi.clearAllMocks()
  routerState.params = new URLSearchParams()

  vi.mocked(useVetsForDate).mockReturnValue({
    data: [{ stf_id: 'vet-1', full_name: 'Dr. Vera' }],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    isFetching: false,
  } as unknown as ReturnType<typeof useVetsForDate>)
  vi.mocked(useAvailableSlots).mockReturnValue({
    data: [
      {
        vsl_id: SLOT_ID,
        vsl_start_time: '10:00:00',
        vsl_end_time: '10:30:00',
        status: 'AVAILABLE',
      },
    ],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    isFetching: false,
  } as unknown as ReturnType<typeof useAvailableSlots>)
  vi.mocked(useCreateAppointment).mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  } as unknown as ReturnType<typeof useCreateAppointment>)
  vi.mocked(useClinicSettings).mockReturnValue({
    data: { consultation_fee: 0 },
    isError: false,
  } as unknown as ReturnType<typeof useClinicSettings>)
  vi.mocked(useOwners).mockReturnValue({
    data: {
      results: [{ own_id: 'own-1', full_name: 'Olivia Owner', email: 'olivia@example.com' }],
    },
  } as unknown as ReturnType<typeof useOwners>)
  vi.mocked(usePets).mockReturnValue({
    data: { results: [{ id: PET_ID, name: 'Rex' }] },
  } as unknown as ReturnType<typeof usePets>)
  vi.mocked(useCreateCheckout).mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  } as unknown as ReturnType<typeof useCreateCheckout>)
  vi.mocked(usePayment).mockReturnValue({
    data: undefined,
  } as unknown as ReturnType<typeof usePayment>)
  vi.mocked(useCancelPayment).mockReturnValue({
    mutate: vi.fn(),
  } as unknown as ReturnType<typeof useCancelPayment>)
  vi.mocked(useToast).mockReturnValue({ showToast: vi.fn() } as unknown as ReturnType<
    typeof useToast
  >)
})

describe('CreateAppointmentPage schedule prefill', () => {
  it('applies vet, date and slot from the query string', () => {
    routerState.params = new URLSearchParams({
      vet_id: 'vet-1',
      date: '2026-12-01',
      slot_id: SLOT_ID,
    })

    renderPage()

    expect(screen.getByDisplayValue('2026-12-01')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Dr. Vera')).toBeInTheDocument()
    const slotButton = screen.getByRole('button', { name: '10:00 – 10:30' })
    expect(slotButton.className).toContain('border-amber-500')
    expect(screen.getByRole('button', { name: 'Book Appointment' })).not.toBeDisabled()
  })

  it('leaves date, vet and slot untouched without query params', () => {
    renderPage()

    expect(screen.getByText('Select a date and veterinarian first')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Book Appointment' })).toBeDisabled()
  })

  it('books with the prefilled slot id once owner and pet are chosen', async () => {
    const createMutate = vi.fn()
    vi.mocked(useCreateAppointment).mockReturnValue({
      mutate: createMutate,
      isPending: false,
    } as unknown as ReturnType<typeof useCreateAppointment>)
    routerState.params = new URLSearchParams({
      vet_id: 'vet-1',
      date: '2026-12-01',
      slot_id: SLOT_ID,
    })

    renderPage()

    fireEvent.change(screen.getByPlaceholderText('Search owners...'), {
      target: { value: 'Olivia' },
    })
    fireEvent.change(screen.getByDisplayValue('Select an owner'), {
      target: { value: 'own-1' },
    })
    fireEvent.change(screen.getByDisplayValue('Select a pet'), { target: { value: PET_ID } })

    fireEvent.click(screen.getByRole('button', { name: 'Book Appointment' }))

    await waitFor(() => expect(createMutate).toHaveBeenCalledTimes(1))
    expect(createMutate.mock.calls[0][0]).toMatchObject({
      slot_id: SLOT_ID,
      pet_id: PET_ID,
      apt_type: 'CONSULTATION',
    })
  })
})

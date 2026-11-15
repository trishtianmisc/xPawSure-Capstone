import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { clinicDateKey } from '../../../../utils/format'
import { useStartConsultation, useVetAppointments } from '../hooks/useVetAppointments'
import type { VetAppointmentSummary } from '../types/dashboard.types'
import { ConsultationsPage } from './ConsultationsPage'

vi.mock('../hooks/useVetAppointments', () => ({
  useVetAppointments: vi.fn(),
  useStartConsultation: vi.fn(),
}))

function appointment(
  overrides: Partial<VetAppointmentSummary> & Pick<VetAppointmentSummary, 'apt_id' | 'pet_name'>,
): VetAppointmentSummary {
  return {
    pet_id: 'pet-1',
    pet_species: 'Pug',
    vet_name: 'Vera Vet',
    owner_name: 'Olivia Owner',
    apt_type: 'CONSULTATION',
    apt_status: 'COMPLETED',
    apt_scheduled_at: '2025-03-10T09:00:00+08:00',
    apt_reason: null,
    screening: null,
    ...overrides,
  }
}

const appointments = [
  appointment({
    apt_id: 'apt-rex',
    pet_name: 'Rex',
    pet_species: 'Pug',
    apt_scheduled_at: '2025-03-10T09:00:00+08:00',
    apt_status: 'COMPLETED',
  }),
  appointment({
    apt_id: 'apt-milo',
    pet_name: 'Milo',
    pet_species: 'Beagle',
    apt_scheduled_at: '2025-06-05T09:00:00+08:00',
    apt_status: 'CANCELLED',
  }),
  appointment({
    apt_id: 'apt-kiwi',
    pet_name: 'Kiwi',
    pet_species: 'Pug',
    apt_scheduled_at: '2026-05-01T09:00:00+08:00',
    apt_status: 'COMPLETED',
  }),
  appointment({
    apt_id: 'apt-coco',
    pet_name: 'Coco',
    pet_species: 'Shih Tzu',
    apt_scheduled_at: '2026-06-12T09:00:00+08:00',
    apt_status: 'COMPLETED',
  }),
  appointment({
    apt_id: 'apt-zoe',
    pet_name: 'Zoe',
    pet_species: 'Beagle',
    apt_scheduled_at: '2026-06-20T09:00:00+08:00',
    apt_status: 'CANCELLED',
  }),
]

function renderPage() {
  return render(
    <MemoryRouter>
      <ConsultationsPage />
    </MemoryRouter>,
  )
}

function selectStatus(value: string) {
  fireEvent.change(screen.getByLabelText('Filter by status'), {
    target: { value },
  })
}

const startConsultationMutate = vi.fn()

describe('ConsultationsPage filters', () => {
  beforeEach(() => {
    startConsultationMutate.mockReset()
    vi.mocked(useVetAppointments).mockReturnValue({
      data: appointments,
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useVetAppointments>)
    vi.mocked(useStartConsultation).mockReturnValue({
      mutate: startConsultationMutate,
      isPending: false,
    } as unknown as ReturnType<typeof useStartConsultation>)
  })

  it('uses the pets or breed search placeholder', () => {
    renderPage()

    expect(screen.getByPlaceholderText('Search pets or breed')).toBeInTheDocument()
  })

  it('offers status options without Today or Upcoming', () => {
    renderPage()

    expect(screen.getByLabelText('Filter by status')).toHaveValue('All')
    expect(
      screen.queryByRole('option', { name: 'Today' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('option', { name: 'Upcoming' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('option', { name: 'Confirmed' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('option', { name: 'Checked In' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('option', { name: 'In Progress' }),
    ).toBeInTheDocument()
  })

  it('searches by breed', () => {
    renderPage()
    selectStatus('All')
    fireEvent.change(screen.getByPlaceholderText('Search pets or breed'), {
      target: { value: 'beagle' },
    })

    expect(screen.getByText('Milo')).toBeInTheDocument()
    expect(screen.getByText('Zoe')).toBeInTheDocument()
    expect(screen.queryByText('Rex')).not.toBeInTheDocument()
    expect(screen.queryByText('Kiwi')).not.toBeInTheDocument()
  })

  it('shows all statuses for a selected year', () => {
    renderPage()
    fireEvent.change(screen.getByLabelText('Filter by year'), {
      target: { value: '2025' },
    })

    expect(screen.getByText('Rex')).toBeInTheDocument()
    expect(screen.getByText('Milo')).toBeInTheDocument()
    expect(screen.queryByText('Coco')).not.toBeInTheDocument()
  })

  it('narrows a year down to a selected month', () => {
    renderPage()
    fireEvent.change(screen.getByLabelText('Filter by year'), {
      target: { value: '2026' },
    })
    fireEvent.change(screen.getByLabelText('Filter by month'), {
      target: { value: '6' },
    })

    expect(screen.getByText('Coco')).toBeInTheDocument()
    expect(screen.getByText('Zoe')).toBeInTheDocument()
    expect(screen.queryByText('Kiwi')).not.toBeInTheDocument()
  })

  it('filters by confirmed, checked-in, and in-progress statuses', () => {
    vi.mocked(useVetAppointments).mockReturnValue({
      data: [
        appointment({
          apt_id: 'apt-rex',
          pet_name: 'Rex',
          apt_status: 'CONFIRMED',
        }),
        appointment({
          apt_id: 'apt-luna',
          pet_name: 'Luna',
          apt_status: 'CHECKED_IN',
        }),
        appointment({
          apt_id: 'apt-nova',
          pet_name: 'Nova',
          apt_status: 'IN_PROGRESS',
        }),
      ],
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useVetAppointments>)

    renderPage()

    selectStatus('Confirmed')
    expect(screen.getByText('Rex')).toBeInTheDocument()
    expect(screen.queryByText('Luna')).not.toBeInTheDocument()
    expect(screen.queryByText('Nova')).not.toBeInTheDocument()

    selectStatus('Checked In')
    expect(screen.getByText('Luna')).toBeInTheDocument()
    expect(screen.queryByText('Rex')).not.toBeInTheDocument()

    selectStatus('In Progress')
    expect(screen.getByText('Nova')).toBeInTheDocument()
    expect(screen.queryByText('Luna')).not.toBeInTheDocument()
  })

  it('filters no-show appointments separately from cancellations', () => {
    vi.mocked(useVetAppointments).mockReturnValue({
      data: [
        appointment({
          apt_id: 'apt-milo',
          pet_name: 'Milo',
          apt_status: 'CANCELLED',
        }),
        appointment({
          apt_id: 'apt-nina',
          pet_name: 'Nina',
          apt_status: 'NO_SHOW',
        }),
      ],
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useVetAppointments>)

    renderPage()

    selectStatus('No Show')
    expect(screen.getByText('Nina')).toBeInTheDocument()
    expect(screen.queryByText('Milo')).not.toBeInTheDocument()

    selectStatus('Cancelled')
    expect(screen.getByText('Milo')).toBeInTheDocument()
    expect(screen.queryByText('Nina')).not.toBeInTheDocument()
  })

  it('follows the receptionist table format and sorts by date', () => {
    renderPage()
    selectStatus('All')

    expect(screen.getByRole('columnheader', { name: 'Pet' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Owner' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Veterinarian' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /Date & Time/ })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Type' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Status' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Action' })).toBeInTheDocument()

    let rows = screen.getAllByRole('row').slice(1)
    expect(within(rows[0]).getByText('Zoe')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('columnheader', { name: /Date & Time/ }))

    rows = screen.getAllByRole('row').slice(1)
    expect(within(rows[0]).getByText('Rex')).toBeInTheDocument()
  })

  it('shows the real pet profile image when one is available', () => {
    vi.mocked(useVetAppointments).mockReturnValue({
      data: [
        appointment({
          apt_id: 'apt-rex',
          pet_name: 'Rex',
          pet_profile_image: 'https://example.com/rex.jpg',
        }),
      ],
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useVetAppointments>)

    renderPage()
    selectStatus('All')

    expect(screen.getByRole('img', { name: 'Rex' })).toHaveAttribute(
      'src',
      'https://example.com/rex.jpg',
    )
  })

  it('clears the month and year when a specific day is picked', () => {
    renderPage()
    fireEvent.change(screen.getByLabelText('Filter by year'), {
      target: { value: '2026' },
    })
    fireEvent.change(screen.getByLabelText('Filter by date'), {
      target: { value: '2025-06-05' },
    })

    expect(screen.getByLabelText('Filter by month')).toHaveValue('')
    expect(screen.getByLabelText('Filter by year')).toHaveValue('')
    expect(screen.getByText('Milo')).toBeInTheDocument()
  })

  it('asks for confirmation before starting a consultation', () => {
    const today = clinicDateKey()
    vi.mocked(useVetAppointments).mockReturnValue({
      data: [
        appointment({
          apt_id: 'apt-luna',
          pet_name: 'Luna',
          apt_status: 'CHECKED_IN',
          apt_scheduled_at: `${today}T09:00:00+08:00`,
        }),
      ],
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useVetAppointments>)

    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Start consultation for Luna' }))

    expect(screen.getByRole('dialog', { name: 'Start consultation?' })).toBeInTheDocument()
    expect(
      screen.getByText('The appointment status will change to In Progress.'),
    ).toBeInTheDocument()
    expect(startConsultationMutate).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(startConsultationMutate).not.toHaveBeenCalled()
  })

  it('starts the consultation only after confirmation', () => {
    const today = clinicDateKey()
    vi.mocked(useVetAppointments).mockReturnValue({
      data: [
        appointment({
          apt_id: 'apt-luna',
          pet_name: 'Luna',
          apt_status: 'CHECKED_IN',
          apt_scheduled_at: `${today}T09:00:00+08:00`,
        }),
      ],
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useVetAppointments>)

    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Start consultation for Luna' }))
    fireEvent.click(screen.getByRole('button', { name: 'Start Consultation' }))

    expect(startConsultationMutate).toHaveBeenCalledTimes(1)
    expect(startConsultationMutate.mock.calls[0][0]).toBe('apt-luna')
  })
})

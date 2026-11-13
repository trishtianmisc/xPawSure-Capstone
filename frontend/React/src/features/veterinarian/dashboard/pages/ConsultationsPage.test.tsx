import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

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

describe('ConsultationsPage filters', () => {
  beforeEach(() => {
    vi.mocked(useVetAppointments).mockReturnValue({
      data: appointments,
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useVetAppointments>)
    vi.mocked(useStartConsultation).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useStartConsultation>)
  })

  it('uses the pets or breed search placeholder', () => {
    renderPage()

    expect(screen.getByPlaceholderText('Search pets or breed')).toBeInTheDocument()
  })

  it('searches by breed', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'All' }))
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

  it('follows the receptionist table format and sorts by date', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'All' }))

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
    fireEvent.click(screen.getByRole('button', { name: 'All' }))

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
})

import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { formatDate } from '../../../utils/format'
import { usePets } from '../hooks/usePets'
import { PetsPage } from './PetsPage'

vi.mock('../hooks/usePets', () => ({
  usePets: vi.fn(),
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <PetsPage />
    </MemoryRouter>,
  )
}

const rexRow = {
  id: 'pet-1',
  name: 'Rex',
  sex: 'MALE',
  breed_id: 'breed-1',
  breed_name: 'Shih Tzu',
  date_of_birth: null,
  weight: 12.5,
  color: null,
  microchip_number: null,
  profile_picture: null,
  qr_code: 'qr-1',
  qr_code_url: null,
  created_at: '2026-01-05T10:00:00+08:00',
  owner_name: 'Olga Owner',
  last_visit_date: '2026-10-01',
  next_appointment_date: null,
}

const lunaRow = {
  id: 'pet-2',
  name: 'Luna',
  sex: 'FEMALE',
  breed_id: null,
  breed_name: null,
  date_of_birth: null,
  weight: null,
  color: null,
  microchip_number: null,
  profile_picture: null,
  qr_code: 'qr-2',
  qr_code_url: null,
  created_at: '2026-02-10T10:00:00+08:00',
  owner_name: 'Sam Cruz',
  last_visit_date: null,
  next_appointment_date: '2026-11-20',
}

describe('PetsPage', () => {
  beforeEach(() => {
    vi.mocked(usePets).mockReturnValue({
      data: {
        total: 2,
        page: 1,
        page_size: 20,
        total_pages: 1,
        results: [rexRow, lunaRow],
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    } as unknown as ReturnType<typeof usePets>)
  })

  it('shows patient, owner, and visit columns without sex, weight, or registered', () => {
    renderPage()

    for (const header of ['Patient', 'Owner', 'Last visit', 'Next appointment', 'Actions']) {
      expect(screen.getByRole('columnheader', { name: header })).toBeInTheDocument()
    }
    for (const header of ['Sex', 'Weight', 'Registered', 'Total Appointments']) {
      expect(screen.queryByRole('columnheader', { name: header })).toBeNull()
    }
  })

  it('renders owner names and clinic-formatted visit dates with em dashes for gaps', () => {
    renderPage()

    expect(screen.getByText('Olga Owner')).toBeInTheDocument()
    expect(screen.getByText('Sam Cruz')).toBeInTheDocument()
    expect(screen.getByText(formatDate('2026-10-01'))).toBeInTheDocument()
    expect(screen.getByText(formatDate('2026-11-20'))).toBeInTheDocument()
    expect(screen.getAllByText('—')).toHaveLength(2)
  })

  it('keeps the eye action linking to the patient detail page', () => {
    renderPage()

    const eye = screen.getByLabelText('View Rex')
    expect(eye).toHaveAttribute('href', '/receptionist/pets/pet-1')
  })
})

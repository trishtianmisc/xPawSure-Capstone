import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { VetConsultationHistoryItem } from '../types/dashboard.types'
import { usePetConsultationHistory } from '../hooks/useVetAppointments'
import { ConsultationHistoryPage } from './ConsultationHistoryPage'

vi.mock('../hooks/useVetAppointments', () => ({
  usePetConsultationHistory: vi.fn(),
}))

function makeConsultation(
  id: string,
  appointmentId: string,
  diagnosis: string,
): VetConsultationHistoryItem {
  return {
    id,
    appointment_id: appointmentId,
    pet_id: 'pet-1',
    pet_name: 'Max',
    veterinarian: 'Vet Vera',
    chief_complaint: 'Itching',
    subjective: null,
    objective: 'Red patches on the belly',
    assessment: 'Allergic dermatitis',
    plan: 'Topical treatment',
    diagnosis,
    specific_disease: null,
    treatment: 'Medicated shampoo',
    notes: null,
    follow_up_required: false,
    follow_up_target_date: null,
    created_at: '2026-01-02T09:00:00+08:00',
    scheduled_at: '2026-01-02T09:00:00+08:00',
    checked_in_at: '2026-01-02T08:55:00+08:00',
    completed_at: '2026-01-02T09:30:00+08:00',
  }
}

function mockHistory(consultations: VetConsultationHistoryItem[]) {
  vi.mocked(usePetConsultationHistory).mockReturnValue({
    data: {
      pet: { pet_id: 'pet-1', pet_name: 'Max', pet_species: 'Pug' },
      consultations,
    },
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    isFetching: false,
  } as unknown as ReturnType<typeof usePetConsultationHistory>)
}

function renderPage(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route
          element={<ConsultationHistoryPage />}
          path="/veterinarian/pets/:petId/history"
        />
        <Route
          element={<div>Appointment detail stub</div>}
          path="/veterinarian/appointments/:id"
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ConsultationHistoryPage', () => {
  beforeEach(() => {
    mockHistory([])
  })

  it('shows the pet and all completed consultations including the current appointment', () => {
    mockHistory([
      makeConsultation('con-1', 'apt-previous', 'Dermatitis'),
      makeConsultation('con-2', 'apt-current', 'Otitis'),
    ])

    renderPage('/veterinarian/pets/pet-1/history?apt=apt-current')

    expect(screen.getByRole('heading', { name: 'Max' })).toBeInTheDocument()
    expect(screen.getByText('Dermatitis')).toBeInTheDocument()
    expect(screen.getByText('Otitis')).toBeInTheDocument()
    expect(screen.getAllByText('Vet Vera')).toHaveLength(2)
    expect(screen.getAllByText('Jan 2, 2026')).toHaveLength(2)
    expect(screen.getAllByText(/Checked in:/)).toHaveLength(2)
    expect(screen.getAllByText(/Completed:/)).toHaveLength(2)
    expect(screen.queryByText('Red patches on the belly')).not.toBeInTheDocument()
  })

  it('expands and collapses the consultation details from the dropdown button', () => {
    mockHistory([makeConsultation('con-1', 'apt-previous', 'Dermatitis')])

    renderPage('/veterinarian/pets/pet-1/history?apt=apt-current')

    expect(screen.queryByRole('button', { name: 'View more details' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'View details for Dermatitis' }))

    expect(screen.getByText('Red patches on the belly')).toBeInTheDocument()
    expect(screen.getByText('Allergic dermatitis')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'View more details' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Hide details for Dermatitis' }))

    expect(screen.queryByText('Red patches on the belly')).not.toBeInTheDocument()
  })

  it('opens the consultation appointment from view more details', () => {
    mockHistory([makeConsultation('con-1', 'apt-previous', 'Dermatitis')])

    renderPage('/veterinarian/pets/pet-1/history?apt=apt-current')

    fireEvent.click(screen.getByRole('button', { name: 'View details for Dermatitis' }))
    fireEvent.click(screen.getByRole('button', { name: 'View more details' }))

    expect(screen.getByText('Appointment detail stub')).toBeInTheDocument()
  })

  it('shows an empty state when there are no consultations', () => {
    mockHistory([])

    renderPage('/veterinarian/pets/pet-1/history?apt=apt-current')

    expect(
      screen.getByText(
        'No consultations recorded for this pet at your clinic.',
      ),
    ).toBeInTheDocument()
  })

  it('returns to the appointment when going back', () => {
    renderPage('/veterinarian/pets/pet-1/history?apt=apt-current')

    fireEvent.click(screen.getByRole('button', { name: 'Back' }))

    expect(screen.getByText('Appointment detail stub')).toBeInTheDocument()
  })
})

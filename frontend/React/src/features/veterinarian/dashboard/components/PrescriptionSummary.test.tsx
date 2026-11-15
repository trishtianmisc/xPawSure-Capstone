import { fireEvent, render, screen, within } from '@testing-library/react'

import { PrescriptionSummary } from './PrescriptionSummary'
import type { VetPrescriptionInfo } from '../types/dashboard.types'

const prescription: VetPrescriptionInfo = {
  id: 'prs-1',
  consultation_id: 'con-1',
  pet_id: 'pet-1',
  pet_name: 'Buddy',
  veterinarian: 'Dr. Smith',
  instructions: null,
  items: [
    {
      id: 'item-1',
      medicine_name: 'Amoxicillin',
      generic_name: null,
      dosage: '250mg',
      frequency: 'Twice daily',
      duration: '7 days',
      route: 'ORAL',
      quantity: 14,
      notes: 'Give with food',
    },
  ],
  created_at: '2026-01-01T10:00:00Z',
}

describe('PrescriptionSummary', () => {
  it('calls onPreview when the Preview PDF button is clicked', () => {
    const onPreview = vi.fn()

    render(<PrescriptionSummary prescription={prescription} onPreview={onPreview} />)
    fireEvent.click(screen.getByRole('button', { name: 'Preview PDF' }))

    expect(onPreview).toHaveBeenCalledTimes(1)
  })

  it('does not render the Preview PDF button without a handler', () => {
    render(<PrescriptionSummary prescription={prescription} />)

    expect(screen.queryByRole('button', { name: 'Preview PDF' })).not.toBeInTheDocument()
  })

  it('opens the medication details and instructions when a row is clicked', () => {
    render(<PrescriptionSummary prescription={prescription} />)
    fireEvent.click(screen.getByRole('row', { name: 'View Amoxicillin details' }))

    const dialog = screen.getByRole('dialog', { name: 'Prescription details' })
    expect(within(dialog).getByText('Amoxicillin')).toBeInTheDocument()
    expect(within(dialog).getByText('250mg')).toBeInTheDocument()
    expect(within(dialog).getByText('Twice daily')).toBeInTheDocument()
    expect(within(dialog).getByText('14')).toBeInTheDocument()
    expect(within(dialog).getByText('7 days')).toBeInTheDocument()
    expect(within(dialog).getByText('Oral')).toBeInTheDocument()
    expect(within(dialog).getByText('Give with food')).toBeInTheDocument()
  })
})

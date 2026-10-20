import { fireEvent, render, screen } from '@testing-library/react'

import { DiseaseCombobox } from './DiseaseCombobox'
import { OTHER_DISEASE } from '../constants/diseases'

describe('DiseaseCombobox', () => {
  it('opens the disease list and selects a seeded disease', () => {
    const onSelect = vi.fn()
    render(
      <DiseaseCombobox
        customValue=""
        onCustomChange={vi.fn()}
        onSelect={onSelect}
        value=""
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open disease list' }))
    fireEvent.click(screen.getByRole('option', { name: 'Fungal' }))

    expect(onSelect).toHaveBeenCalledWith('Fungal')
  })

  it('selects the Other option', () => {
    const onSelect = vi.fn()
    render(
      <DiseaseCombobox
        customValue=""
        onCustomChange={vi.fn()}
        onSelect={onSelect}
        value=""
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open disease list' }))
    fireEvent.click(screen.getByRole('option', { name: OTHER_DISEASE }))

    expect(onSelect).toHaveBeenCalledWith(OTHER_DISEASE)
  })

  it('becomes editable and reports typed text when Other is selected', () => {
    const onCustomChange = vi.fn()
    render(
      <DiseaseCombobox
        customValue=""
        onCustomChange={onCustomChange}
        onSelect={vi.fn()}
        value={OTHER_DISEASE}
      />,
    )

    const input = screen.getByRole('combobox')
    expect(input).toHaveProperty('readOnly', false)

    fireEvent.change(input, { target: { value: 'Sarcoptic mange' } })

    expect(onCustomChange).toHaveBeenCalledWith('Sarcoptic mange')
  })

  it('is read-only when a seeded disease is selected', () => {
    render(
      <DiseaseCombobox
        customValue=""
        onCustomChange={vi.fn()}
        onSelect={vi.fn()}
        value="Fungal"
      />,
    )

    const input = screen.getByRole('combobox')
    expect(input).toHaveProperty('readOnly', true)
    expect(input).toHaveValue('Fungal')
  })
})

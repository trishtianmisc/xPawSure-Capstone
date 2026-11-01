import { fireEvent, render, screen } from '@testing-library/react'

import { OperatingHoursCard } from './OperatingHoursCard'
import type { OperatingHoursDay } from '../types/clinicProfile.types'

const hours: OperatingHoursDay[] = [
  {
    day_of_week: 'MON',
    day_index: 1,
    opening_time: '09:00:00',
    closing_time: '17:00:00',
    is_closed: false,
  },
  {
    day_of_week: 'SUN',
    day_index: 7,
    opening_time: null,
    closing_time: null,
    is_closed: true,
  },
]

describe('OperatingHoursCard', () => {
  it('renders per-day hours in 12-hour format', () => {
    render(
      <OperatingHoursCard
        hours={hours}
        isUpdating={false}
        onUpdate={() => undefined}
      />,
    )

    expect(screen.getByText('9:00 AM – 5:00 PM')).toBeInTheDocument()
    expect(screen.getByText('Closed')).toBeInTheDocument()
  })

  it('shows an inline error when closing time is before opening time', () => {
    const onUpdate = vi.fn()
    render(
      <OperatingHoursCard
        hours={hours}
        isUpdating={false}
        onUpdate={onUpdate}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /edit hours/i }))
    fireEvent.change(screen.getByLabelText('Monday closing time'), {
      target: { value: '08:00' },
    })
    fireEvent.click(screen.getByRole('button', { name: /save hours/i }))

    expect(screen.getByText('Closing time must be after opening time.')).toBeInTheDocument()
    expect(onUpdate).not.toHaveBeenCalled()
  })

  it('rejects saving when every day is closed', () => {
    const onUpdate = vi.fn()
    render(
      <OperatingHoursCard
        hours={hours}
        isUpdating={false}
        onUpdate={onUpdate}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /edit hours/i }))
    fireEvent.click(screen.getByLabelText('Monday open'))
    fireEvent.click(screen.getByRole('button', { name: /save hours/i }))

    expect(screen.getByText('At least one day must be open.')).toBeInTheDocument()
    expect(onUpdate).not.toHaveBeenCalled()
  })
})

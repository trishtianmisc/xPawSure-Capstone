import { render, screen } from '@testing-library/react'

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
})

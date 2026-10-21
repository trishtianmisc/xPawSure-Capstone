import { render, screen } from '@testing-library/react'

import { ClinicSettingsCard } from './ClinicSettingsCard'
import type { ClinicSettings } from '../types/clinicProfile.types'

const settings: ClinicSettings = {
  opening_time: '09:00:00',
  closing_time: '17:00:00',
  appointment_duration: 30,
  max_appointments_per_day: 20,
  allow_owner_booking: true,
  timezone: 'Asia/Manila',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

describe('ClinicSettingsCard', () => {
  it('renders opening and closing times in 12-hour format', () => {
    render(
      <ClinicSettingsCard
        settings={settings}
        isUpdating={false}
        onUpdate={() => undefined}
      />,
    )

    expect(screen.getByText('9:00 AM')).toBeInTheDocument()
    expect(screen.getByText('5:00 PM')).toBeInTheDocument()
    expect(screen.queryByText('09:00:00')).not.toBeInTheDocument()
    expect(screen.queryByText('17:00:00')).not.toBeInTheDocument()
  })
})

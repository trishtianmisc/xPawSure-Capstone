import { fireEvent, render, screen } from '@testing-library/react'

import { ClinicSettingsCard } from './ClinicSettingsCard'
import type { ClinicSettings } from '../types/clinicProfile.types'

const settings: ClinicSettings = {
  appointment_duration: 30,
  max_appointments_per_day: 20,
  allow_owner_booking: true,
  timezone: 'Asia/Manila',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

describe('ClinicSettingsCard', () => {
  it('renders settings without global opening and closing times', () => {
    render(
      <ClinicSettingsCard
        settings={settings}
        isUpdating={false}
        onUpdate={() => undefined}
      />,
    )

    expect(screen.getByText('30 minutes')).toBeInTheDocument()
    expect(screen.getByText('Asia/Manila')).toBeInTheDocument()
    expect(screen.queryByText('Opening Time')).not.toBeInTheDocument()
    expect(screen.queryByText('Closing Time')).not.toBeInTheDocument()
  })

  it('shows the timezone warning while editing', () => {
    render(
      <ClinicSettingsCard
        settings={settings}
        isUpdating={false}
        onUpdate={() => undefined}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /edit settings/i }))

    expect(screen.getByLabelText('Timezone')).toBeInTheDocument()
    expect(
      screen.getByText('Changing the timezone does not shift existing slots or appointments.'),
    ).toBeInTheDocument()
  })
})

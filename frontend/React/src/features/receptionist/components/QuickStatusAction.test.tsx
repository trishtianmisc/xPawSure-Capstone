import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CLINIC_TIME_ZONE } from '../../../utils/format'
import { useUpdateAppointmentStatus } from '../hooks/useAppointments'
import { QuickStatusAction } from './QuickStatusAction'

vi.mock('../hooks/useAppointments', () => ({
  useUpdateAppointmentStatus: vi.fn(),
}))

const FUTURE = new Date(Date.now() + 3_600_000).toISOString()
const PAST = new Date(Date.now() - 3_600_000).toISOString()

function clinicTimestamp(offsetDays: number, time: string): string {
  const day = new Date(Date.now() + offsetDays * 86_400_000).toLocaleDateString(
    'en-CA',
    { timeZone: CLINIC_TIME_ZONE },
  )
  return `${day}T${time}+08:00`
}

// Same clinic day, later than any realistic run time: check-in enabled.
const TODAY_LATE = clinicTimestamp(0, '23:59:00')
const TOMORROW = clinicTimestamp(1, '09:00:00')

const mutate = vi.fn()

describe('QuickStatusAction', () => {
  beforeEach(() => {
    mutate.mockReset()
    vi.mocked(useUpdateAppointmentStatus).mockReturnValue({
      mutate,
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateAppointmentStatus>)
  })

  it('offers Confirm for a future PENDING appointment', () => {
    render(
      <QuickStatusAction aptId="apt-1" status="PENDING" scheduledAt={FUTURE} />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(mutate).toHaveBeenCalledWith({ aptId: 'apt-1', status: 'CONFIRMED' })
  })

  it('hides Confirm once the appointment is past due', () => {
    render(<QuickStatusAction aptId="apt-1" status="PENDING" scheduledAt={PAST} />)

    expect(screen.queryByRole('button', { name: 'Confirm' })).toBeNull()
  })

  it('offers Check in later on the appointment date', () => {
    render(
      <QuickStatusAction aptId="apt-2" status="CONFIRMED" scheduledAt={TODAY_LATE} />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Check in' }))
    expect(mutate).toHaveBeenCalledWith({ aptId: 'apt-2', status: 'CHECKED_IN' })
  })

  it('disables Check in before the appointment date', () => {
    render(
      <QuickStatusAction aptId="apt-2" status="CONFIRMED" scheduledAt={TOMORROW} />,
    )

    const button = screen.getByRole('button', { name: 'Check in' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute(
      'title',
      expect.stringContaining('Check-in opens on'),
    )

    fireEvent.click(button)
    expect(mutate).not.toHaveBeenCalled()
  })

  it('hides Check in when allowCheckIn is false', () => {
    const { container } = render(
      <QuickStatusAction
        aptId="apt-2"
        status="CONFIRMED"
        scheduledAt={FUTURE}
        allowCheckIn={false}
      />,
    )

    expect(screen.queryByRole('button', { name: 'Check in' })).toBeNull()
    expect(container).toBeEmptyDOMElement()
  })

  it('asks for confirmation before a terminal no-show', () => {
    render(
      <QuickStatusAction
        aptId="apt-3"
        status="CONFIRMED"
        scheduledAt={PAST}
        allowNoShow
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'No-show' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Mark as no-show?')

    fireEvent.click(screen.getByRole('button', { name: 'Mark no-show' }))
    expect(mutate).toHaveBeenCalledWith(
      { aptId: 'apt-3', status: 'NO_SHOW' },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
  })

  it('renders nothing for statuses without a quick action', () => {
    const { container } = render(
      <QuickStatusAction aptId="apt-4" status="COMPLETED" scheduledAt={FUTURE} />,
    )

    expect(container).toBeEmptyDOMElement()
  })
})

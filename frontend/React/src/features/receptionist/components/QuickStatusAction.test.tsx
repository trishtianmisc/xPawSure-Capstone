import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useUpdateAppointmentStatus } from '../hooks/useAppointments'
import { QuickStatusAction } from './QuickStatusAction'

vi.mock('../hooks/useAppointments', () => ({
  useUpdateAppointmentStatus: vi.fn(),
}))

const FUTURE = new Date(Date.now() + 3_600_000).toISOString()
const PAST = new Date(Date.now() - 3_600_000).toISOString()

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

  it('offers Check in for a future CONFIRMED appointment', () => {
    render(
      <QuickStatusAction aptId="apt-2" status="CONFIRMED" scheduledAt={FUTURE} />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Check in' }))
    expect(mutate).toHaveBeenCalledWith({ aptId: 'apt-2', status: 'CHECKED_IN' })
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

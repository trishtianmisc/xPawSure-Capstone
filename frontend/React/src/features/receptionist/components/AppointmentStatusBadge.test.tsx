import { render, screen } from '@testing-library/react'

import { AppointmentStatusBadge } from './AppointmentStatusBadge'

describe('AppointmentStatusBadge', () => {
  it('uses the same fixed pill size for short and long vet statuses', () => {
    const { rerender } = render(
      <AppointmentStatusBadge status="CONFIRMED" uniform />,
    )

    expect(screen.getByText('Confirmed')).toHaveClass(
      'h-[1.625rem]',
      'w-[7.25rem]',
      'justify-center',
      'whitespace-nowrap',
    )

    rerender(<AppointmentStatusBadge status="COMPLETED" uniform />)

    expect(screen.getByText('Completed')).toHaveClass(
      'h-[1.625rem]',
      'w-[7.25rem]',
      'justify-center',
      'whitespace-nowrap',
    )

    rerender(<AppointmentStatusBadge status="IN_PROGRESS" uniform />)

    expect(screen.getByText('In Progress')).toHaveClass(
      'h-[1.625rem]',
      'w-[7.25rem]',
      'justify-center',
      'whitespace-nowrap',
    )
  })

  it('shrinks only the longer labels in the uniform variant', () => {
    const { rerender } = render(
      <AppointmentStatusBadge status="CONFIRMED" uniform />,
    )

    expect(screen.getByText('Confirmed')).toHaveClass('text-xs')
    expect(screen.getByText('Confirmed')).not.toHaveClass('text-[10px]')

    rerender(<AppointmentStatusBadge status="IN_PROGRESS" uniform />)

    expect(screen.getByText('In Progress')).toHaveClass('text-[10px]')
  })

  it('uses darker colors for the no-show status', () => {
    render(<AppointmentStatusBadge status="NO_SHOW" />)

    expect(screen.getByText('No-Show')).toHaveClass(
      'bg-stone-300',
      'text-stone-900',
      'dark:bg-stone-700',
      'dark:text-stone-100',
    )
  })

  it('keeps the default badge sizing for non-vet usage', () => {
    render(<AppointmentStatusBadge status="CONFIRMED" />)

    expect(screen.getByText('Confirmed')).toHaveClass('px-3', 'py-1', 'text-xs')
    expect(screen.getByText('Confirmed')).not.toHaveClass('w-[7.25rem]')
  })
})

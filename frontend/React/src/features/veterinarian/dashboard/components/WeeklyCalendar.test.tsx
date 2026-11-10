import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WeeklyCalendar } from './WeeklyCalendar'
import type { ScheduleSlot } from '../types/veterinarian.types'

const days = [
  new Date(2026, 9, 26),
  new Date(2026, 9, 27),
  new Date(2026, 9, 28),
  new Date(2026, 9, 29),
  new Date(2026, 9, 30),
  new Date(2026, 10, 31),
  new Date(2026, 10, 1),
]

function makeSlot(overrides: Partial<ScheduleSlot> = {}): ScheduleSlot {
  return {
    id: 'apt-1',
    date: '2026-10-30',
    pet_name: 'fg',
    start_time: '10:00',
    end_time: '10:30',
    time_label: '10:00 AM',
    status: 'CHECKED_IN',
    ...overrides,
  }
}

describe('WeeklyCalendar', () => {
  it('renders pet name, scheduled time, and status on every card', () => {
    render(<WeeklyCalendar days={days} slots={[makeSlot()]} onSlotClick={vi.fn()} />)

    expect(screen.getByText('fg')).toBeInTheDocument()
    expect(screen.getByText('10:00 AM')).toBeInTheDocument()
    expect(screen.getByText('Checked In')).toBeInTheDocument()
  })

  it('renders exactly three lines per card for any visible status', () => {
    render(
      <WeeklyCalendar
        days={days}
        slots={[
          makeSlot(),
          makeSlot({ id: 'apt-2', pet_name: 'Fuan', status: 'COMPLETED', time_label: '10:00 AM' }),
          makeSlot({ id: 'apt-3', pet_name: 'Thor', status: 'IN_PROGRESS', time_label: '2:00 PM' }),
          makeSlot({ id: 'apt-4', pet_name: 'Theo', status: 'CONFIRMED', time_label: '9:00 AM' }),
        ]}
        onSlotClick={vi.fn()}
      />,
    )

    for (const name of ['fg', 'Fuan', 'Thor', 'Theo']) {
      const card = screen.getByText(name).closest('button')
      expect(card).not.toBeNull()
      expect(card!.querySelectorAll('p')).toHaveLength(3)
    }

    expect(screen.getByText('Completed')).toBeInTheDocument()
    expect(screen.getByText('In Progress')).toBeInTheDocument()
    expect(screen.getByText('Confirmed')).toBeInTheDocument()
  })

  it('keeps each line compact enough for the 64px minimum card height', () => {
    render(<WeeklyCalendar days={days} slots={[makeSlot()]} onSlotClick={vi.fn()} />)

    const card = screen.getByText('fg').closest('button')!
    const lines = card.querySelectorAll('p')
    const sizes = Array.from(lines).map((line) => ({
      fontSize: line.style.fontSize,
      lineHeight: line.style.lineHeight,
    }))

    expect(sizes).toEqual([
      { fontSize: '11px', lineHeight: '1.1' },
      { fontSize: '10px', lineHeight: '1.1' },
      { fontSize: '10px', lineHeight: '1.1' },
    ])

    expect(card.style.height).toBe('64px')

    // Even when a browser clamps font-size up to 16px minimum, three lines
    // (3 × 16 × 1.1 = 52.8px) plus py-1 padding (8px) must fit the card.
    const clampedContentPx = 3 * 16 * 1.1 + 8
    expect(clampedContentPx).toBeLessThanOrEqual(64)
  })
})

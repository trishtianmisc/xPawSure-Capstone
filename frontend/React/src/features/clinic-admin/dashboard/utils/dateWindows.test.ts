import { afterEach, describe, expect, it, vi } from 'vitest'

import { monthStartWindow, rollingWindowStart } from './dateWindows'

describe('dashboard date windows', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('uses the Manila day when UTC is still the previous day', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-01T16:30:00Z'))

    expect(monthStartWindow()).toEqual({
      date_from: '2026-10-01',
      date_to: '2026-10-02',
    })
    expect(rollingWindowStart()).toBe('2025-11-01')
  })

  it('starts the rolling window eleven months before the given month', () => {
    expect(rollingWindowStart(new Date(2026, 0, 15))).toBe('2025-02-01')
  })

  it('ends the revenue window on the injected clinic day', () => {
    expect(monthStartWindow(new Date(2026, 1, 9))).toEqual({
      date_from: '2026-02-01',
      date_to: '2026-02-09',
    })
  })
})

import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  useBlockRemainingSlots,
  useGenerateSlots,
  useSchedule,
  useUpdateSlotStatus,
} from '../hooks/useAvailableSlots'
import { SchedulePage } from './SchedulePage'

vi.mock('../hooks/useAvailableSlots', () => ({
  useSchedule: vi.fn(),
  useGenerateSlots: vi.fn(),
  useUpdateSlotStatus: vi.fn(),
  useBlockRemainingSlots: vi.fn(),
}))

const idleMutation = {
  mutate: vi.fn(),
  isPending: false,
  isError: false,
  isSuccess: false,
  data: null,
  error: null,
}

function renderPage() {
  return render(
    <MemoryRouter>
      <SchedulePage />
    </MemoryRouter>,
  )
}

describe('SchedulePage clinic days', () => {
  beforeEach(() => {
    vi.mocked(useSchedule).mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useSchedule>)
    vi.mocked(useGenerateSlots).mockReturnValue(
      idleMutation as unknown as ReturnType<typeof useGenerateSlots>,
    )
    vi.mocked(useUpdateSlotStatus).mockReturnValue(
      idleMutation as unknown as ReturnType<typeof useUpdateSlotStatus>,
    )
    vi.mocked(useBlockRemainingSlots).mockReturnValue(
      idleMutation as unknown as ReturnType<typeof useBlockRemainingSlots>,
    )
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('requests the Manila calendar day when UTC is still the previous day', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-01T16:30:00Z'))

    renderPage()

    expect(vi.mocked(useSchedule).mock.lastCall?.[0]).toBe('2026-10-02')
    expect(vi.mocked(useSchedule).mock.lastCall?.[1]).toBe('2026-10-04')
  })

  it('defaults the generate form to the Manila day and the following six days', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-01T16:30:00Z'))

    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Generate Slots' }))

    expect(screen.getByDisplayValue('2026-10-02')).toBeInTheDocument()
    expect(screen.getByDisplayValue('2026-10-08')).toBeInTheDocument()
  })
})

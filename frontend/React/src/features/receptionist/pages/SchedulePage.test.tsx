import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { isoDate } from '../../../utils/format'
import {
  useBlockRemainingSlots,
  useGenerateSlots,
  useSchedule,
  useUpdateSlotStatus,
} from '../hooks/useAvailableSlots'
import type { ScheduleResponse } from '../types/receptionist.types'
import { SchedulePage } from './SchedulePage'

vi.mock('../hooks/useAvailableSlots', () => ({
  useSchedule: vi.fn(),
  useGenerateSlots: vi.fn(),
  useUpdateSlotStatus: vi.fn(),
  useBlockRemainingSlots: vi.fn(),
}))

const { navigateMock } = vi.hoisted(() => ({ navigateMock: vi.fn() }))
vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
  useParams: () => ({ vetId: 'vet-1' }),
}))

type GridSlot = ScheduleResponse['vets'][number]['days'][number]['slots'][number]
type GridDay = ScheduleResponse['vets'][number]['days'][number]

const TODAY_ISO = isoDate()

function dayOffsetIso(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return isoDate(d)
}

function slot(overrides: Partial<GridSlot> = {}): GridSlot {
  return {
    vsl_id: 'slot-1',
    vsl_start_time: '09:00',
    vsl_end_time: '09:30',
    status: 'AVAILABLE',
    is_past: false,
    appointment: null,
    ...overrides,
  }
}

const BOOKED_APT = {
  apt_id: 'apt-1',
  pet_name: 'Rex',
  owner_name: 'Olivia Owner',
  apt_type: 'CONSULTATION',
  apt_status: 'CONFIRMED',
}

function schedule(days: GridDay[]): ScheduleResponse {
  return {
    start_date: days[0]?.date ?? TODAY_ISO,
    end_date: days[days.length - 1]?.date ?? TODAY_ISO,
    vets: [{ stf_id: 'vet-1', full_name: 'Dr. Vera', days }],
  }
}

function closedDay(date: string): GridDay {
  return { date, is_working: false, slots: [] }
}

function notGeneratedDay(date: string): GridDay {
  return { date, is_working: true, slots: [] }
}

function queryResult(data: ScheduleResponse) {
  return { data, isLoading: false, error: null } as unknown as ReturnType<typeof useSchedule>
}

function mockMutation<R>(extra: Record<string, unknown> = {}): R {
  return {
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    isSuccess: false,
    data: undefined,
    error: null,
    reset: vi.fn(),
    ...extra,
  } as unknown as R
}

/** Three visible days (today..+2) each with one open future slot. */
function defaultRange(start: string): ScheduleResponse {
  const startIndex = Math.round(
    (new Date(start + 'T00:00:00').getTime() - new Date(TODAY_ISO + 'T00:00:00').getTime())
      / 86_400_000,
  )
  return schedule(
    [0, 1, 2].map((offset) => ({
      date: dayOffsetIso(startIndex + offset),
      is_working: true,
      slots: [slot({ vsl_id: `slot-${startIndex + offset}` })],
    })),
  )
}

function mockSchedule(
  rangeImpl: (start: string, end: string) => ScheduleResponse,
  todayImpl?: (start: string, end: string) => ScheduleResponse,
) {
  vi.mocked(useSchedule).mockImplementation((start: string, end: string) =>
    queryResult(
      start === end
        ? (todayImpl ?? defaultRange)(start, end)
        : rangeImpl(start, end),
    ),
  )
}

function renderPage() {
  return render(<SchedulePage />)
}

beforeEach(() => {
  vi.clearAllMocks()
  mockSchedule(
    (start) => defaultRange(start),
    (start) => defaultRange(start),
  )
  vi.mocked(useGenerateSlots).mockReturnValue(mockMutation<ReturnType<typeof useGenerateSlots>>())
  vi.mocked(useUpdateSlotStatus).mockReturnValue(mockMutation<ReturnType<typeof useUpdateSlotStatus>>())
  vi.mocked(useBlockRemainingSlots).mockReturnValue(
    mockMutation<ReturnType<typeof useBlockRemainingSlots>>(),
  )
})

describe('SchedulePage (stage 1)', () => {
  it('renders a closed day as one tall cell, not one per row', () => {
    mockSchedule(() =>
      schedule([
        { date: dayOffsetIso(0), is_working: true, slots: [slot()] },
        closedDay(dayOffsetIso(1)),
        { date: dayOffsetIso(2), is_working: true, slots: [slot({ vsl_id: 's3' })] },
      ]),
    )

    renderPage()

    expect(screen.getAllByText('Clinic closed')).toHaveLength(1)
  })

  it('shows Not generated yet with a per-day Generate link prefilled to that day', () => {
    mockSchedule(() =>
      schedule([
        { date: dayOffsetIso(0), is_working: true, slots: [slot()] },
        notGeneratedDay(dayOffsetIso(1)),
        { date: dayOffsetIso(2), is_working: true, slots: [slot({ vsl_id: 's3' })] },
      ]),
    )

    renderPage()

    expect(screen.getAllByText('Not generated yet')).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Generate' }))

    const heading = screen.getByRole('heading', { name: 'Generate Slots' })
    const overlay = heading.closest('.fixed') as HTMLElement
    const dateInputs = overlay.querySelectorAll<HTMLInputElement>('input[type="date"]')
    expect(dateInputs).toHaveLength(2)
    expect(dateInputs[0].value).toBe(dayOffsetIso(1))
    expect(dateInputs[1].value).toBe(dayOffsetIso(1))
  })

  it('renders blank gap cells for rows a day does not cover', () => {
    mockSchedule(() =>
      schedule([
        { date: dayOffsetIso(0), is_working: true, slots: [slot()] },
        {
          date: dayOffsetIso(1),
          is_working: true,
          slots: [slot({ vsl_id: 's16', vsl_start_time: '16:00', vsl_end_time: '16:30' })],
        },
        closedDay(dayOffsetIso(2)),
      ]),
    )

    renderPage()

    // 16:00 exists on day 2 only; day 1's column must be an empty gap cell.
    const timeCells = screen.getAllByText('4:00 PM')
    const row = timeCells[0].closest('tr') as HTMLElement
    const cells = row.querySelectorAll('td')
    expect(cells[1].textContent).toBe('')
    expect(cells[2].textContent).toContain('4:00 PM')
  })

  it('dims passed slots as Passed and keeps them inert', () => {
    const updateMutate = vi.fn()
    vi.mocked(useUpdateSlotStatus).mockReturnValue(
      mockMutation<ReturnType<typeof useUpdateSlotStatus>>({ mutate: updateMutate }),
    )
    mockSchedule(() =>
      schedule([
        {
          date: dayOffsetIso(0),
          is_working: true,
          slots: [
            slot({ vsl_id: 'past-1', is_past: true }),
            slot({ vsl_id: 'open-1', vsl_start_time: '10:00', vsl_end_time: '10:30' }),
          ],
        },
        closedDay(dayOffsetIso(1)),
        closedDay(dayOffsetIso(2)),
      ]),
    )

    renderPage()

    fireEvent.click(screen.getByText('Passed'))
    expect(updateMutate).not.toHaveBeenCalled()

    fireEvent.click(screen.getByText('Available'))
    expect(updateMutate).toHaveBeenCalledWith({ slotId: 'open-1', status: 'BLOCKED' })
  })

  it('keeps booked cells clickable into the appointment detail', () => {
    mockSchedule(() =>
      schedule([
        {
          date: dayOffsetIso(0),
          is_working: true,
          slots: [slot({ vsl_id: 'b1', status: 'BOOKED', appointment: BOOKED_APT })],
        },
        closedDay(dayOffsetIso(1)),
        closedDay(dayOffsetIso(2)),
      ]),
    )

    renderPage()

    fireEvent.click(screen.getByText('Rex'))
    expect(navigateMock).toHaveBeenCalledWith('/receptionist/appointments/apt-1')
    expect(screen.getByText('Olivia Owner')).toBeInTheDocument()
  })

  it('confirms Block rest of today with same-clock counts and reports the result', () => {
    const mutate = vi.fn(
      (
        _vars: { vetId: string; date: string },
        callbacks?: {
          onSuccess?: (data: {
            blocked: number
            skipped_booked: number
            skipped_passed: number
          }) => void
        },
      ) => {
        callbacks?.onSuccess?.({ blocked: 2, skipped_booked: 1, skipped_passed: 1 })
      },
    )
    vi.mocked(useBlockRemainingSlots).mockReturnValue(
      mockMutation<ReturnType<typeof useBlockRemainingSlots>>({ mutate }),
    )
    mockSchedule(() =>
      schedule([
        {
          date: dayOffsetIso(0),
          is_working: true,
          slots: [
            slot({ vsl_id: 'p1', is_past: true }),
            slot({ vsl_id: 'a1', vsl_start_time: '10:00', vsl_end_time: '10:30' }),
            slot({ vsl_id: 'a2', vsl_start_time: '10:30', vsl_end_time: '11:00' }),
            slot({
              vsl_id: 'b1',
              vsl_start_time: '11:00',
              vsl_end_time: '11:30',
              status: 'BOOKED',
              appointment: BOOKED_APT,
            }),
          ],
        },
        closedDay(dayOffsetIso(1)),
        closedDay(dayOffsetIso(2)),
      ]),
    )

    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Block rest of today' }))

    const dialog = screen.getByRole('dialog')
    expect(dialog.textContent).toContain('2 open slots')
    expect(dialog.textContent).toContain('Dr. Vera')
    expect(dialog.textContent).toContain("1 booked appointment won't be affected")

    fireEvent.click(screen.getByRole('button', { name: 'Block' }))

    expect(mutate).toHaveBeenCalledWith(
      { vetId: 'vet-1', date: TODAY_ISO },
      expect.anything(),
    )
    expect(
      screen.getByText(
        'Blocked 2 slots. 1 booked slots were skipped. 1 passed slots were left alone.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('disables the block confirm when no open slots remain today', () => {
    mockSchedule(() =>
      schedule([
        {
          date: dayOffsetIso(0),
          is_working: true,
          slots: [
            slot({ vsl_id: 'p1', is_past: true }),
            slot({
              vsl_id: 'b1',
              vsl_start_time: '10:00',
              vsl_end_time: '10:30',
              status: 'BOOKED',
              appointment: BOOKED_APT,
            }),
          ],
        },
        closedDay(dayOffsetIso(1)),
        closedDay(dayOffsetIso(2)),
      ]),
    )

    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Block rest of today' }))

    const dialog = screen.getByRole('dialog')
    expect(dialog.textContent).toContain('no open slots left to block today')
    expect(screen.getByRole('button', { name: 'Block' })).toBeDisabled()
  })

  it('counts today from a today-only fetch when the range has moved past today', () => {
    const mutate = vi.fn()
    vi.mocked(useBlockRemainingSlots).mockReturnValue(
      mockMutation<ReturnType<typeof useBlockRemainingSlots>>({ mutate }),
    )
    mockSchedule(
      () =>
        schedule([
          { date: dayOffsetIso(1), is_working: true, slots: [slot({ vsl_id: 'r1' })] },
          { date: dayOffsetIso(2), is_working: true, slots: [slot({ vsl_id: 'r2' })] },
          { date: dayOffsetIso(3), is_working: true, slots: [slot({ vsl_id: 'r3' })] },
        ]),
      () =>
        schedule([
          {
            date: TODAY_ISO,
            is_working: true,
            slots: [
              slot({ vsl_id: 't1' }),
              slot({ vsl_id: 't2', vsl_start_time: '10:00', vsl_end_time: '10:30' }),
            ],
          },
        ]),
    )

    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Next day' }))
    fireEvent.click(screen.getByRole('button', { name: 'Block rest of today' }))

    const dialog = screen.getByRole('dialog')
    expect(dialog.textContent).toContain('2 open slots')

    fireEvent.click(screen.getByRole('button', { name: 'Block' }))
    expect(mutate).toHaveBeenCalledWith(
      { vetId: 'vet-1', date: TODAY_ISO },
      expect.anything(),
    )
  })

  it('reports honest generate results: created, existing, and skipped days', () => {
    vi.mocked(useGenerateSlots).mockReturnValue(
      mockMutation<ReturnType<typeof useGenerateSlots>>({
        isSuccess: true,
        data: {
          generated: true,
          slots_created: 16,
          already_existed: 4,
          skipped_dates: [{ date: dayOffsetIso(5), reason: 'clinic_closed' }],
        },
      }),
    )

    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Generate Slots' }))

    const heading = screen.getByRole('heading', { name: 'Generate Slots' })
    const overlay = heading.closest('.fixed') as HTMLElement
    expect(overlay.textContent).toMatch(
      /Created 16 slots, 4 already existed\. Skipped \w{3} \d{1,2} \(clinic closed\)\./,
    )
    expect(within(overlay).getByRole('button', { name: 'Done' })).toBeInTheDocument()
  })

  it('says when nothing was created because the clinic is closed', () => {
    const closedDate = dayOffsetIso(5)
    const weekday = new Date(closedDate + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long',
    })
    vi.mocked(useGenerateSlots).mockReturnValue(
      mockMutation<ReturnType<typeof useGenerateSlots>>({
        isSuccess: true,
        data: {
          generated: true,
          slots_created: 0,
          already_existed: 0,
          skipped_dates: [{ date: closedDate, reason: 'clinic_closed' }],
        },
      }),
    )

    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Generate Slots' }))

    const heading = screen.getByRole('heading', { name: 'Generate Slots' })
    expect(heading.closest('.fixed')?.textContent).toContain(
      `No slots created: clinic closed on ${weekday}.`,
    )
  })
})

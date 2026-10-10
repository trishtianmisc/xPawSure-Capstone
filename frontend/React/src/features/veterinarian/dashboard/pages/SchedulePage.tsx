import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { WeeklyCalendar } from '../components/WeeklyCalendar'
import { useVetScheduleAppointments } from '../hooks/useVetAppointments'
import type { VetAppointmentSummary } from '../types/dashboard.types'
import type { ScheduleSlot } from '../types/veterinarian.types'

const VISIBLE_STATUSES = new Set([
  'CONFIRMED',
  'CHECKED_IN',
  'IN_PROGRESS',
  'COMPLETED',
])

const SLOT_DURATION_MIN = 30

function pad2(value: number): string {
  return `${value}`.padStart(2, '0')
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function startOfWeek(date: Date): Date {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  const day = result.getDay()
  const diff = day === 0 ? -6 : 1 - day
  result.setDate(result.getDate() + diff)
  return result
}

function parseIso(value?: string | null): Date | null {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function formatClock(date: Date): string {
  const meridiem = date.getHours() >= 12 ? 'PM' : 'AM'
  const hours = date.getHours() % 12 || 12
  return `${hours}:${pad2(date.getMinutes())} ${meridiem}`
}

function formatRange(start: Date, end: Date): string {
  const startMeridiem = start.getHours() >= 12 ? 'PM' : 'AM'
  const endMeridiem = end.getHours() >= 12 ? 'PM' : 'AM'
  if (startMeridiem === endMeridiem) {
    return `${formatClock(start)}–${formatClock(end).replace(` ${endMeridiem}`, '')} ${endMeridiem}`
  }
  return `${formatClock(start)}–${formatClock(end)}`
}

function buildTimeLabel(
  apt: VetAppointmentSummary,
  scheduled: Date,
): string {
  const checkedIn = parseIso(apt.apt_checked_in_at)
  const completed = parseIso(apt.apt_completed_at)

  if (apt.apt_status === 'COMPLETED') {
    if (checkedIn && completed) {
      return formatRange(checkedIn, completed)
    }
    return formatClock(scheduled)
  }

  if (
    checkedIn &&
    (apt.apt_status === 'CHECKED_IN' || apt.apt_status === 'IN_PROGRESS')
  ) {
    return formatClock(checkedIn)
  }

  return formatClock(scheduled)
}

function firstTwoWords(value?: string | null): string {
  const words = value?.trim().split(/\s+/).filter(Boolean) ?? []
  if (words.length === 0) return ''
  if (words.length <= 2) return words.join(' ')
  return `${words.slice(0, 2).join(' ')}…`
}

function toSlot(apt: VetAppointmentSummary): ScheduleSlot | null {
  const scheduled = new Date(apt.apt_scheduled_at)
  if (Number.isNaN(scheduled.getTime())) return null

  const end = new Date(scheduled.getTime() + SLOT_DURATION_MIN * 60_000)
  return {
    id: apt.apt_id,
    date: toDateKey(scheduled),
    pet_name: apt.pet_name,
    condition: firstTwoWords(apt.screening?.disease || apt.apt_reason),
    start_time: `${pad2(scheduled.getHours())}:${pad2(scheduled.getMinutes())}`,
    end_time: `${pad2(end.getHours())}:${pad2(end.getMinutes())}`,
    time_label: buildTimeLabel(apt, scheduled),
    status: apt.apt_status,
  }
}

export function SchedulePage() {
  const navigate = useNavigate()
  const [anchorDate, setAnchorDate] = useState(() => new Date())

  const weekStart = useMemo(() => startOfWeek(anchorDate), [anchorDate])
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  )
  const startDate = toDateKey(weekStart)
  const endDate = toDateKey(weekDays[6])

  const { data, isLoading, error, refetch } = useVetScheduleAppointments(
    startDate,
    endDate,
  )

  const slots = useMemo(
    () =>
      (data ?? [])
        .filter((apt) => VISIBLE_STATUSES.has(apt.apt_status))
        .map(toSlot)
        .filter((slot): slot is ScheduleSlot => slot !== null),
    [data],
  )

  const weekEnd = weekDays[6]
  const weekLabel =
    weekStart.getMonth() === weekEnd.getMonth()
      ? weekStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`

  const monthValue = `${anchorDate.getFullYear()}-${pad2(anchorDate.getMonth() + 1)}`

  function handleMonthChange(value: string) {
    if (!value) return
    const [year, month] = value.split('-').map(Number)
    if (!year || !month) return

    const today = new Date()
    if (today.getFullYear() === year && today.getMonth() === month - 1) {
      setAnchorDate(today)
      return
    }
    setAnchorDate(new Date(year, month - 1, 1))
  }

  const navButtonClass =
    'flex items-center gap-1 rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-600 transition hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800'

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-extrabold text-stone-900 dark:text-stone-100">
          Schedule
        </h2>

        <div className="flex flex-wrap items-center gap-2">
          <button
            className={navButtonClass}
            type="button"
            onClick={() => setAnchorDate((prev) => addDays(prev, -7))}
            aria-label="Previous week"
          >
            <svg
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Previous
          </button>

          <button
            className={navButtonClass}
            type="button"
            onClick={() => setAnchorDate((prev) => addDays(prev, 7))}
            aria-label="Next week"
          >
            Next
            <svg
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <input
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-700 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200"
            type="month"
            aria-label="Select month"
            value={monthValue}
            onChange={(e) => handleMonthChange(e.target.value)}
          />
        </div>
      </div>

      <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">
        {weekLabel}
      </h3>

      {isLoading ? (
        <div className="space-y-3">
          <div className="h-8 w-64 animate-pulse rounded-lg bg-stone-200 dark:bg-stone-800" />
          <div className="h-96 animate-pulse rounded-xl bg-stone-200 dark:bg-stone-800" />
        </div>
      ) : error ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
          <p className="text-sm text-stone-500 dark:text-stone-400">
            Failed to load schedule
          </p>
          <button
            className="mt-3 rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-800"
            type="button"
            onClick={() => refetch()}
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          <WeeklyCalendar
            days={weekDays}
            slots={slots}
            onSlotClick={(slot) =>
              navigate(`/veterinarian/appointments/${slot.id}`)
            }
          />
          {slots.length === 0 && (
            <p className="text-sm text-stone-500 dark:text-stone-400">
              No appointments scheduled for this week.
            </p>
          )}
        </>
      )}
    </div>
  )
}

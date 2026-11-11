import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useBlockRemainingSlots, useGenerateSlots, useSchedule, useUpdateSlotStatus } from '../hooks/useAvailableSlots'
import { apiErrorMessage } from '../../../utils/error'
import { formatClockTime, isoDate } from '../../../utils/format'
import { Modal } from '../../../components/ui/Modal'
import { AppointmentStatusBadge } from '../components/AppointmentStatusBadge'
import type { AppointmentStatus, GenerateSlotsResponse, SlotStatus } from '../types/receptionist.types'

function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function formatMonthDay(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function formatRangeLabel(startStr: string, endStr: string): string {
  if (startStr === endStr) return formatMonthDay(startStr)
  const start = new Date(startStr + 'T00:00:00')
  const end = new Date(endStr + 'T00:00:00')
  const sameMonth =
    start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()
  if (sameMonth) return `${formatMonthDay(startStr)} to ${end.getDate()}`
  return `${formatMonthDay(startStr)} to ${formatMonthDay(endStr)}`
}

function weekdayName(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' })
}

function describeGenerateResult(data: GenerateSlotsResponse): string {
  const created = data.slots_created
  const existing = data.already_existed
  const skipped = data.skipped_dates ?? []

  if (created === 0) {
    if (skipped.length > 0 && existing === 0) {
      const weekdays = [...new Set(skipped.map((s) => weekdayName(s.date)))]
      return `No slots created: clinic closed on ${weekdays.join(', ')}.`
    }
    if (existing > 0) {
      return `No new slots: ${existing} already existed for those dates.`
    }
    return 'No slots created.'
  }

  let message = `Created ${created} slot${created === 1 ? '' : 's'}`
  if (existing > 0) message += `, ${existing} already existed`
  if (skipped.length > 0) {
    message += `. Skipped ${skipped.map((s) => formatMonthDay(s.date)).join(', ')} (clinic closed)`
  }
  return `${message}.`
}

type GridSlot = {
  vsl_id: string
  vsl_start_time: string
  vsl_end_time: string
  status: SlotStatus
  is_past: boolean
  appointment: {
    apt_id: string
    pet_name: string
    owner_name: string
    apt_type: string
    apt_status: string
  } | null
}

function SlotCell({
  slot,
  week,
  onBook,
  onAppointmentClick,
  onToggleBlock,
}: {
  slot: GridSlot
  week: boolean
  onBook?: () => void
  onAppointmentClick?: (aptId: string) => void
  onToggleBlock?: (slotId: string, currentStatus: SlotStatus) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)

  // Close on any click outside this cell's menu (including another cell's
  // menu button, which then opens its own menu).
  useEffect(() => {
    if (!menuOpen) return
    const onMouseDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [menuOpen])

  function closeMenu(returnFocus: boolean) {
    setMenuOpen(false)
    if (returnFocus) menuButtonRef.current?.focus()
  }

  const isBlocked = slot.status === 'BLOCKED'
  const slotMenu = (
    <div
      ref={menuRef}
      data-slot-menu
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation()
          closeMenu(true)
        }
      }}
      className="absolute right-0.5 top-0.5"
    >
      <button
        ref={menuButtonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label="Slot options"
        onClick={() => setMenuOpen((open) => !open)}
        className="rounded p-1 text-stone-400 hover:bg-white/70 hover:text-stone-600 dark:text-stone-500 dark:hover:bg-stone-700"
      >
        <svg className="size-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>
      {menuOpen && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-1 w-32 overflow-hidden rounded-lg border border-stone-200 bg-white shadow-lg dark:border-stone-700 dark:bg-stone-800"
        >
          <button
            type="button"
            role="menuitem"
            autoFocus
            onClick={() => {
              closeMenu(true)
              onToggleBlock?.(slot.vsl_id, slot.status)
            }}
            className="block w-full px-3 py-1.5 text-left text-xs font-medium text-stone-700 hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-stone-700"
          >
            {isBlocked ? 'Unblock slot' : 'Block slot'}
          </button>
        </div>
      )}
    </div>
  )

  if (slot.status === 'AVAILABLE' && slot.is_past) {
    return (
      <td className="border border-stone-200 bg-stone-100 px-2 py-1.5 text-center dark:border-stone-700 dark:bg-stone-800">
        <span className="text-xs font-semibold uppercase tracking-wide text-stone-400 dark:text-stone-500">
          Passed
        </span>
      </td>
    )
  }

  if (slot.status === 'BLOCKED') {
    return (
      <td
        title="Use the slot options menu to unblock"
        className="relative cursor-default border border-red-200 bg-red-50 px-2 py-1.5 text-center dark:border-red-800 dark:bg-red-900/20"
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-red-700 dark:text-red-300">
          Blocked
        </span>
        {slotMenu}
      </td>
    )
  }

  if (slot.status === 'AVAILABLE') {
    return (
      <td
        onClick={onBook}
        title="Click to book"
        className="relative cursor-pointer border border-green-200 bg-green-50 px-2 py-1.5 text-center transition hover:bg-green-100 dark:border-green-800 dark:bg-green-900/20 dark:hover:bg-green-900/30"
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-green-700 dark:text-green-400">
          Available
        </span>
        {slotMenu}
      </td>
    )
  }

  const apt = slot.appointment
  return (
    <td
      onClick={() => apt && onAppointmentClick?.(apt.apt_id)}
      title={
        week && apt
          ? `${apt.owner_name} · ${formatClockTime(slot.vsl_start_time)} – ${formatClockTime(slot.vsl_end_time)}`
          : undefined
      }
      className="cursor-pointer border border-blue-200 bg-blue-50 px-2 py-1.5 text-center transition hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/20 dark:hover:bg-blue-900/30"
    >
      <div className="flex items-center justify-center gap-1">
        <span className="min-w-0 truncate font-semibold text-blue-900 dark:text-blue-100">
          {apt?.pet_name}
        </span>
        {apt && (
          <AppointmentStatusBadge
            status={apt.apt_status as AppointmentStatus}
            compact={week}
          />
        )}
      </div>
      {!week && (
        <div className="truncate text-[11px] text-blue-600 dark:text-blue-400">
          {apt?.owner_name}
        </div>
      )}
    </td>
  )
}

type ViewMode = 'day' | '3' | 'week'

const VIEW_OPTIONS: { value: ViewMode; label: string; days: number; unit: string }[] = [
  { value: 'day', label: 'Day', days: 1, unit: 'day' },
  { value: '3', label: '3 days', days: 3, unit: '3 days' },
  { value: 'week', label: 'Week', days: 7, unit: 'week' },
]

const LEGEND_ITEMS = [
  { label: 'Available', cls: 'bg-green-500' },
  { label: 'Booked', cls: 'bg-blue-500' },
  { label: 'Blocked', cls: 'bg-red-500' },
  { label: 'Passed', cls: 'bg-stone-400' },
  { label: 'Closed', cls: 'bg-stone-200 dark:bg-stone-600' },
]

export function SchedulePage() {
  const navigate = useNavigate()
  const { vetId } = useParams<{ vetId: string }>()
  const today = useMemo(() => new Date(), [])
  const [rangeStart, setRangeStart] = useState(() => today)
  const [view, setView] = useState<ViewMode>('3')
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [generateStartDate, setGenerateStartDate] = useState(() => isoDate(today))
  const [generateEndDate, setGenerateEndDate] = useState(() => isoDate(addDays(today, 6)))
  const [showBlockConfirm, setShowBlockConfirm] = useState(false)
  const [blockToast, setBlockToast] = useState<string | null>(null)

  const todayStr = isoDate(today)
  const startDateStr = isoDate(rangeStart)
  const viewOption = VIEW_OPTIONS.find((v) => v.value === view)!
  const rangeLength = viewOption.days
  const endDateStr = isoDate(addDays(rangeStart, rangeLength - 1))
  const rangeLabel = formatRangeLabel(startDateStr, endDateStr)
  const isWeek = view === 'week'

  const { data: schedule, isLoading, error } = useSchedule(startDateStr, endDateStr, vetId)
  // The block dialog counts today's slots from the visible range when it
  // covers today, otherwise from a small today-only fetch — both carry the
  // same clinic-clock is_past flags the block-remaining endpoint uses.
  const todayInRange = startDateStr <= todayStr && todayStr <= endDateStr
  const { data: todaySchedule } = useSchedule(todayStr, todayStr, vetId, {
    enabled: showBlockConfirm && !todayInRange,
  })
  const generateMutation = useGenerateSlots()
  const toggleBlockMutation = useUpdateSlotStatus()
  const bulkBlockMutation = useBlockRemainingSlots()

  const dates = useMemo(() => {
    return Array.from({ length: rangeLength }, (_, i) => isoDate(addDays(rangeStart, i)))
  }, [rangeStart, rangeLength])

  // Dynamic time axis: the sorted union of every slot start time visible in
  // the current range. When no day has any slot the grid renders a single
  // tall row of day-state cells (closed / not generated).
  const timeSlots = useMemo(() => {
    const times = new Set<string>()
    for (const vet of schedule?.vets ?? []) {
      for (const day of vet.days) {
        for (const s of day.slots) times.add(s.vsl_start_time)
      }
    }
    return [...times].sort()
  }, [schedule])
  const axisRows: (string | null)[] = timeSlots.length > 0 ? timeSlots : [null]

  const todayDay = (todayInRange ? schedule : todaySchedule)?.vets?.[0]?.days
    .find((d) => d.date === todayStr)
  const openToday = todayDay?.slots.filter((s) => s.status === 'AVAILABLE' && !s.is_past).length ?? 0
  const bookedToday = todayDay?.slots.filter((s) => s.status === 'BOOKED').length ?? 0
  const todayCountsReady = Boolean(todayDay)
  const vetName = schedule?.vets?.[0]?.full_name ?? 'this veterinarian'

  const goToPrev = () => setRangeStart(prev => addDays(prev, -rangeLength))
  const goToNext = () => setRangeStart(prev => addDays(prev, rangeLength))
  const goToToday = () => setRangeStart(today)

  const openGenerateModal = (start?: string, end?: string) => {
    generateMutation.reset()
    if (start) {
      setGenerateStartDate(start)
      setGenerateEndDate(end ?? start)
    }
    setShowGenerateModal(true)
  }

  const handleGenerate = () => {
    generateMutation.mutate({
      start_date: generateStartDate,
      end_date: generateEndDate,
      vet_id: vetId,
    })
  }

  const handleToggleBlock = (slotId: string, currentStatus: SlotStatus) => {
    const newStatus: 'AVAILABLE' | 'BLOCKED' = currentStatus === 'BLOCKED' ? 'AVAILABLE' : 'BLOCKED'
    toggleBlockMutation.mutate({ slotId, status: newStatus })
  }

  const handleBulkBlock = () => {
    if (!vetId || !todayCountsReady) return
    bulkBlockMutation.mutate(
      { vetId, date: todayStr },
      {
        onSuccess: (data) => {
          setShowBlockConfirm(false)
          const parts = [`Blocked ${data.blocked} slots.`]
          if (data.skipped_booked > 0) {
            parts.push(`${data.skipped_booked} booked slots were skipped.`)
          }
          if (data.skipped_passed > 0) {
            parts.push(`${data.skipped_passed} passed slots were left alone.`)
          }
          setBlockToast(parts.join(' '))
          setTimeout(() => setBlockToast(null), 5000)
        },
      },
    )
  }

  const dayHeaderInfo = (date: string) => {
    const daySlots =
      schedule?.vets.flatMap((v) => v.days.find((d) => d.date === date)?.slots ?? []) ?? []
    const booked = daySlots.filter((s) => s.status === 'BOOKED').length
    const open = daySlots.filter((s) => s.status === 'AVAILABLE' && !s.is_past).length
    return daySlots.length > 0 ? `${booked} booked · ${open} open` : null
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {vetId && (
            <button
              onClick={() => navigate('/receptionist/schedule')}
              aria-label="Back to vet list"
              className="rounded-lg border border-stone-300 p-2 text-stone-600 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              <svg className="size-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">
              {vetId && schedule?.vets?.[0]?.full_name
                ? `${schedule.vets[0].full_name}'s Schedule`
                : 'Vet Schedule'}
            </h1>
            {vetId && (
              <p className="text-xs text-stone-500 dark:text-stone-400">
                View and manage time slots
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {vetId && (
            <button
              onClick={() => setShowBlockConfirm(true)}
              className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              Block rest of today
            </button>
          )}
          <button
            onClick={() => openGenerateModal()}
            className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800"
          >
            Generate Slots
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button
          onClick={goToPrev}
          aria-label={`Previous ${viewOption.unit}`}
          title={`Previous ${viewOption.unit}`}
          className="rounded-lg border border-stone-300 p-2 text-stone-600 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
        >
          <svg className="size-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={goToToday}
          className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
        >
          Today
        </button>
        <button
          onClick={goToNext}
          aria-label={`Next ${viewOption.unit}`}
          title={`Next ${viewOption.unit}`}
          className="rounded-lg border border-stone-300 p-2 text-stone-600 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
        >
          <svg className="size-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <span data-testid="range-label" className="text-sm font-medium text-stone-600 dark:text-stone-300">
          {rangeLabel}
        </span>
        <input
          type="date"
          aria-label="Schedule start date"
          value={startDateStr}
          onChange={(e) => {
            const v = e.target.value
            if (v) setRangeStart(new Date(v + 'T00:00:00'))
          }}
          className="rounded-lg border border-stone-300 px-2 py-1.5 text-sm text-stone-700 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
        />
        <div
          role="group"
          aria-label="Schedule view"
          className="ml-auto flex overflow-hidden rounded-lg border border-stone-300 dark:border-stone-700"
        >
          {VIEW_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setView(option.value)}
              aria-pressed={view === option.value}
              className={`px-3 py-1.5 text-sm font-medium ${
                view === option.value
                  ? 'bg-amber-700 text-white'
                  : 'text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {blockToast && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
          {blockToast}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          <div className="h-8 w-64 animate-pulse rounded-lg bg-stone-200 dark:bg-stone-800" />
          <div className="h-96 animate-pulse rounded-xl bg-stone-200 dark:bg-stone-800" />
        </div>
      ) : error ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <div className="text-center">
            <p className="text-sm text-stone-500 dark:text-stone-400">Failed to load schedule</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800"
            >
              Retry
            </button>
          </div>
        </div>
      ) : !schedule || schedule.vets.length === 0 ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <div className="text-center">
            <p className="text-sm text-stone-500 dark:text-stone-400">
              {vetId ? 'No schedule data for this vet' : 'No vets found'}
            </p>
            <p className="mt-1 text-xs text-stone-400 dark:text-stone-500">
              Generate slots to populate the schedule
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-stone-200 dark:border-stone-800">
            <table
              className={`border-collapse ${isWeek ? 'min-w-[860px]' : 'min-w-full'}`}
            >
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 w-24 border-b border-r border-stone-200 bg-stone-50 px-2 py-3 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400">
                    Time
                  </th>
                  {dates.map(date => {
                    const isToday = date === todayStr
                    const hint = dayHeaderInfo(date)
                    return (
                      <th
                        key={date}
                        colSpan={schedule.vets.length}
                        data-date={date}
                        data-today={isToday ? 'true' : undefined}
                        className={`min-w-[110px] border-b border-stone-200 px-2 py-3 text-center text-xs font-semibold uppercase tracking-wide dark:border-stone-700 ${
                          isToday
                            ? 'bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                            : 'bg-stone-50 text-stone-500 dark:bg-stone-900 dark:text-stone-400'
                        }`}
                      >
                        <div>{formatDisplayDate(date)}</div>
                        {hint && (
                          <div className="mt-0.5 text-[11px] font-medium normal-case tracking-normal text-stone-500 dark:text-stone-400">
                            {hint}
                          </div>
                        )}
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {axisRows.map((time, rowIndex) => (
                  <tr key={time ?? 'empty-axis'}>
                    <td className="sticky left-0 z-10 border-b border-r border-stone-200 bg-stone-50 px-2 py-1.5 text-center text-xs font-medium text-stone-600 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400">
                      {time ? formatClockTime(time) : null}
                    </td>
                    {dates.map(date =>
                      schedule.vets.map(vet => {
                        const dayData = vet.days.find(d => d.date === date)
                        const isWorking = dayData?.is_working ?? false
                        const daySlots = dayData?.slots ?? []
                        const tall = timeSlots.length === 0 ? ' h-40' : ''

                        if (!isWorking) {
                          if (rowIndex !== 0) return null
                          return (
                            <td
                              key={`${date}-${vet.stf_id}`}
                              rowSpan={axisRows.length}
                              className={`align-middle border border-stone-200 bg-stone-100 px-2 py-3 text-center text-xs font-medium text-stone-400 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-500${tall}`}
                            >
                              Clinic closed
                            </td>
                          )
                        }

                        if (daySlots.length === 0) {
                          if (rowIndex !== 0) return null
                          return (
                            <td
                              key={`${date}-${vet.stf_id}`}
                              rowSpan={axisRows.length}
                              className={`align-middle border border-dashed border-stone-300 bg-stone-50 px-2 py-3 text-center text-xs dark:border-stone-600 dark:bg-stone-800/60${tall}`}
                            >
                              <div className="font-medium text-stone-500 dark:text-stone-400">
                                Not generated yet
                              </div>
                              {date >= todayStr && (
                                <button
                                  type="button"
                                  onClick={() => openGenerateModal(date)}
                                  className="mt-2 rounded-md border border-amber-300 px-2.5 py-1 text-[11px] font-semibold text-amber-700 transition hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/30"
                                >
                                  Generate
                                </button>
                              )}
                            </td>
                          )
                        }

                        if (time === null) return null

                        const slot = daySlots.find(s => s.vsl_start_time === time)

                        if (!slot) {
                          return (
                            <td
                              key={`${date}-${vet.stf_id}-${time}`}
                              className="border border-stone-200 bg-stone-50/50 dark:border-stone-800 dark:bg-stone-900/30"
                            />
                          )
                        }

                        return (
                          <SlotCell
                            key={`${date}-${vet.stf_id}-${time}`}
                            slot={slot}
                            week={isWeek}
                            onBook={
                              slot.status === 'AVAILABLE' && !slot.is_past
                                ? () =>
                                    navigate(
                                      `/receptionist/appointments/new?${new URLSearchParams({
                                        vet_id: vet.stf_id,
                                        date,
                                        slot_id: slot.vsl_id,
                                      })}`,
                                    )
                                : undefined
                            }
                            onAppointmentClick={(aptId) => navigate(`/receptionist/appointments/${aptId}`)}
                            onToggleBlock={handleToggleBlock}
                          />
                        )
                      })
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul
            aria-label="Schedule legend"
            className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-stone-600 dark:text-stone-400"
          >
            {LEGEND_ITEMS.map((item) => (
              <li key={item.label} className="flex items-center gap-1.5">
                <span className={`size-3 rounded-sm ${item.cls}`} aria-hidden="true" />
                {item.label}
              </li>
            ))}
          </ul>
        </>
      )}

      <Modal
        open={showBlockConfirm}
        onClose={() => setShowBlockConfirm(false)}
        title="Block rest of today"
      >
        {!todayCountsReady ? (
          <p className="text-sm text-stone-600 dark:text-stone-300">
            Loading today&apos;s slots&hellip;
          </p>
        ) : openToday === 0 ? (
          <p className="text-sm text-stone-600 dark:text-stone-300">
            There are no open slots left to block today.
          </p>
        ) : (
          <p className="text-sm text-stone-600 dark:text-stone-300">
            This will block <strong>{openToday} open slot{openToday === 1 ? '' : 's'}</strong> for{' '}
            {vetName} today.
            {bookedToday > 0 && (
              <>
                {' '}
                {bookedToday} booked appointment{bookedToday === 1 ? '' : 's'} won&apos;t be
                affected.
              </>
            )}
          </p>
        )}
        {bulkBlockMutation.isError && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">
            {apiErrorMessage(bulkBlockMutation.error)}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setShowBlockConfirm(false)}
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleBulkBlock}
            disabled={bulkBlockMutation.isPending || !todayCountsReady || openToday === 0}
            className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50"
          >
            {bulkBlockMutation.isPending ? 'Blocking...' : 'Block'}
          </button>
        </div>
      </Modal>

      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-stone-900">
            <h2 className="mb-4 text-lg font-bold text-stone-900 dark:text-stone-100">Generate Slots</h2>
            <p className="mb-4 text-sm text-stone-500 dark:text-stone-400">
              Pre-generate time slots for vets based on clinic operating hours.
            </p>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">Start Date</label>
                <input
                  type="date"
                  value={generateStartDate}
                  onChange={e => setGenerateStartDate(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-600 dark:text-stone-400">End Date</label>
                <input
                  type="date"
                  value={generateEndDate}
                  onChange={e => setGenerateEndDate(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
                />
              </div>
            </div>
            {generateMutation.isError && (
              <p className="mt-3 text-sm text-red-600 dark:text-red-400">
                {apiErrorMessage(generateMutation.error)}
              </p>
            )}
            {generateMutation.isSuccess && (
              <p className="mt-3 text-sm font-medium text-green-700 dark:text-green-400">
                {describeGenerateResult(generateMutation.data)}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              {generateMutation.isSuccess ? (
                <button
                  onClick={() => {
                    generateMutation.reset()
                    setShowGenerateModal(false)
                  }}
                  className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800"
                >
                  Done
                </button>
              ) : (
                <>
                  <button
                    onClick={() => {
                      generateMutation.reset()
                      setShowGenerateModal(false)
                    }}
                    className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleGenerate}
                    disabled={generateMutation.isPending}
                    className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-50"
                  >
                    {generateMutation.isPending ? 'Generating...' : 'Generate'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

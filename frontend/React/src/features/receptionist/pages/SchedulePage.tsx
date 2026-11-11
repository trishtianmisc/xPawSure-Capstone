import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useBlockRemainingSlots, useGenerateSlots, useSchedule, useUpdateSlotStatus } from '../hooks/useAvailableSlots'
import { apiErrorMessage } from '../../../utils/error'
import { formatClockTime, isoDate } from '../../../utils/format'
import { Modal } from '../../../components/ui/Modal'
import type { GenerateSlotsResponse, SlotStatus } from '../types/receptionist.types'

function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function generateTimeSlots(): string[] {
  const slots: string[] = []
  for (let h = 8; h < 18; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`)
    slots.push(`${String(h).padStart(2, '0')}:30`)
  }
  return slots
}

function formatMonthDay(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
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
  appointment: { apt_id: string; pet_name: string; owner_name: string; apt_type: string } | null
}

function SlotCell({
  slot,
  onAppointmentClick,
  onToggleBlock,
}: {
  slot: GridSlot
  onAppointmentClick?: (aptId: string) => void
  onToggleBlock?: (slotId: string, currentStatus: SlotStatus) => void
}) {
  if (slot.status === 'AVAILABLE' && slot.is_past) {
    return (
      <td className="border border-stone-200 bg-stone-100 px-2 py-3 text-center text-xs dark:border-stone-700 dark:bg-stone-800">
        <div className="font-medium text-stone-500 dark:text-stone-400">
          {formatClockTime(slot.vsl_start_time)} - {formatClockTime(slot.vsl_end_time)}
        </div>
        <div className="mt-1 text-[10px] uppercase tracking-wide text-stone-400 dark:text-stone-500">
          Passed
        </div>
      </td>
    )
  }

  if (slot.status === 'BLOCKED') {
    return (
      <td
        onClick={() => onToggleBlock?.(slot.vsl_id, slot.status)}
        className="group cursor-pointer border border-red-200 bg-red-50 px-2 py-3 text-center text-xs transition hover:bg-red-100 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
      >
        <div className="font-medium text-red-700 dark:text-red-300">{formatClockTime(slot.vsl_start_time)} - {formatClockTime(slot.vsl_end_time)}</div>
        <div className="mt-1 text-[10px] uppercase tracking-wide text-red-600 dark:text-red-400">Blocked</div>
        <div className="mt-1 text-[10px] text-red-500 opacity-0 transition group-hover:opacity-100 dark:text-red-400">
          Click to unblock
        </div>
      </td>
    )
  }

  if (slot.status === 'AVAILABLE') {
    return (
      <td
        onClick={() => onToggleBlock?.(slot.vsl_id, slot.status)}
        className="group cursor-pointer border border-green-200 bg-green-50 px-2 py-3 text-center text-xs transition hover:bg-green-100 dark:border-green-800 dark:bg-green-900/20 dark:text-green-700 dark:hover:bg-green-900/30"
      >
        <div className="font-medium text-green-700 dark:text-green-300">{formatClockTime(slot.vsl_start_time)} - {formatClockTime(slot.vsl_end_time)}</div>
        <div className="mt-1 text-[10px] uppercase tracking-wide text-green-600 dark:text-green-400">Available</div>
        <div className="mt-1 text-[10px] text-green-500 opacity-0 transition group-hover:opacity-100 dark:text-green-400">
          Click to block
        </div>
      </td>
    )
  }

  return (
    <td
      onClick={() => onAppointmentClick?.(slot.appointment!.apt_id)}
      className="cursor-pointer border border-blue-200 bg-blue-50 px-2 py-3 text-center text-xs transition hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/30"
    >
      <div className="font-medium text-blue-800 dark:text-blue-200">{formatClockTime(slot.vsl_start_time)} - {formatClockTime(slot.vsl_end_time)}</div>
      <div className="mt-1 font-semibold text-blue-900 dark:text-blue-100">{slot.appointment?.pet_name}</div>
      <div className="text-[10px] text-blue-600 dark:text-blue-400">{slot.appointment?.owner_name}</div>
    </td>
  )
}

export function SchedulePage() {
  const navigate = useNavigate()
  const { vetId } = useParams<{ vetId: string }>()
  const today = useMemo(() => new Date(), [])
  const [rangeStart, setRangeStart] = useState(() => today)
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [generateStartDate, setGenerateStartDate] = useState(() => isoDate(today))
  const [generateEndDate, setGenerateEndDate] = useState(() => isoDate(addDays(today, 6)))
  const [showBlockConfirm, setShowBlockConfirm] = useState(false)
  const [blockToast, setBlockToast] = useState<string | null>(null)

  const todayStr = isoDate(today)
  const startDateStr = isoDate(rangeStart)
  const endDateStr = isoDate(addDays(rangeStart, 2))

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

  const timeSlots = useMemo(() => generateTimeSlots(), [])

  const todayDay = (todayInRange ? schedule : todaySchedule)?.vets?.[0]?.days
    .find((d) => d.date === todayStr)
  const openToday = todayDay?.slots.filter((s) => s.status === 'AVAILABLE' && !s.is_past).length ?? 0
  const bookedToday = todayDay?.slots.filter((s) => s.status === 'BOOKED').length ?? 0
  const todayCountsReady = Boolean(todayDay)
  const vetName = schedule?.vets?.[0]?.full_name ?? 'this veterinarian'

  const goToPrevDay = () => setRangeStart(prev => addDays(prev, -1))
  const goToNextDay = () => setRangeStart(prev => addDays(prev, 1))
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

  const dates = useMemo(() => {
    return [0, 1, 2].map(i => isoDate(addDays(rangeStart, i)))
  }, [rangeStart])

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
          <button
            onClick={goToPrevDay}
            aria-label="Previous day"
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
            onClick={goToNextDay}
            aria-label="Next day"
            className="rounded-lg border border-stone-300 p-2 text-stone-600 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            <svg className="size-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
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
        <div className="overflow-x-auto rounded-xl border border-stone-200 dark:border-stone-800">
          <table className="min-w-full border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 w-24 border-b border-r border-stone-200 bg-stone-50 px-2 py-3 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400">
                  Time
                </th>
                {dates.map(date => (
                  <th
                    key={date}
                    colSpan={schedule.vets.length}
                    className="border-b border-stone-200 bg-stone-50 px-2 py-3 text-center text-xs font-semibold uppercase tracking-wide text-stone-500 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400"
                  >
                    {formatDisplayDate(date)}
                  </th>
                ))}
              </tr>
              <tr>
                <th className="sticky left-0 z-10 border-b border-r border-stone-200 bg-stone-50 px-2 py-2 dark:border-stone-700 dark:bg-stone-900" />
                {dates.map(date =>
                  schedule.vets.map(vet => (
                    <th
                      key={`${date}-${vet.stf_id}`}
                      className="border-b border-r border-stone-200 bg-stone-50 px-2 py-2 text-center text-[11px] font-medium text-stone-600 last:border-r-0 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400"
                    >
                      {vet.full_name}
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map((time, rowIndex) => (
                <tr key={time}>
                  <td className="sticky left-0 z-10 border-b border-r border-stone-200 bg-stone-50 px-2 py-3 text-center text-xs font-medium text-stone-600 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400">
                    {formatClockTime(time)}
                  </td>
                  {dates.map(date =>
                    schedule.vets.map(vet => {
                      const dayData = vet.days.find(d => d.date === date)
                      const isWorking = dayData?.is_working ?? false
                      const daySlots = dayData?.slots ?? []

                      if (!isWorking) {
                        if (rowIndex !== 0) return null
                        return (
                          <td
                            key={`${date}-${vet.stf_id}`}
                            rowSpan={timeSlots.length}
                            className="align-middle border border-stone-200 bg-stone-100 px-2 py-3 text-center text-xs font-medium text-stone-400 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-500"
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
                            rowSpan={timeSlots.length}
                            className="align-middle border border-dashed border-stone-300 bg-stone-50 px-2 py-3 text-center text-xs dark:border-stone-600 dark:bg-stone-800/60"
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

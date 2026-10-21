import { useState } from 'react'
import { Alert, Button, Card } from '../../../components/ui'
import { formatClockTime } from '../../../utils/format'
import type { DayOfWeek, OperatingHoursDay } from '../types/clinicProfile.types'

const DAY_LABELS: Record<DayOfWeek, string> = {
  MON: 'Monday',
  TUE: 'Tuesday',
  WED: 'Wednesday',
  THU: 'Thursday',
  FRI: 'Friday',
  SAT: 'Saturday',
  SUN: 'Sunday',
}

const WEEKDAY_DAYS: DayOfWeek[] = ['MON', 'TUE', 'WED', 'THU', 'FRI']

interface OperatingHoursCardProps {
  hours: OperatingHoursDay[]
  isUpdating: boolean
  onUpdate: (data: OperatingHoursDay[]) => void
}

export function OperatingHoursCard({ hours, isUpdating, onUpdate }: OperatingHoursCardProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<OperatingHoursDay[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

  function openEdit() {
    setDraft(hours.map((h) => ({
      ...h,
      opening_time: h.opening_time || null,
      closing_time: h.closing_time || null,
    })))
    setErrors({})
    setEditing(true)
  }

  function validateDraft(days: OperatingHoursDay[]): Record<string, string> {
    const nextErrors: Record<string, string> = {}
    let openDays = 0

    for (const day of days) {
      if (day.is_closed) continue
      openDays += 1
      if (!day.opening_time) {
        nextErrors[day.day_of_week] = 'Opening time is required.'
      } else if (!day.closing_time) {
        nextErrors[day.day_of_week] = 'Closing time is required.'
      } else if (day.opening_time >= day.closing_time) {
        nextErrors[day.day_of_week] = 'Closing time must be after opening time.'
      }
    }

    if (openDays === 0) {
      nextErrors._all = 'At least one day must be open.'
    }
    return nextErrors
  }

  function updateDraft(dayOfWeek: DayOfWeek, field: keyof OperatingHoursDay, value: string | boolean | null) {
    setDraft((prev) =>
      prev.map((d) => {
        if (d.day_of_week !== dayOfWeek) return d
        const updated = { ...d, [field]: value }
        if (field === 'is_closed' && value === true) {
          updated.opening_time = null
          updated.closing_time = null
        }
        return updated
      })
    )
    setErrors((prev) => {
      const next = { ...prev }
      delete next[dayOfWeek]
      delete next._all
      return next
    })
  }

  function copyToAll(sourceDay: DayOfWeek) {
    const source = draft.find((d) => d.day_of_week === sourceDay)
    if (!source) return
    setDraft((prev) =>
      prev.map((d) => ({
        ...d,
        opening_time: source.opening_time,
        closing_time: source.closing_time,
        is_closed: source.is_closed,
      }))
    )
    setErrors({})
  }

  function copyToWeekdays(sourceDay: DayOfWeek) {
    const source = draft.find((d) => d.day_of_week === sourceDay)
    if (!source) return
    setDraft((prev) =>
      prev.map((d) =>
        WEEKDAY_DAYS.includes(d.day_of_week)
          ? { ...d, opening_time: source.opening_time, closing_time: source.closing_time, is_closed: source.is_closed }
          : d
      )
    )
    setErrors({})
  }

  function handleSave() {
    const nextErrors = validateDraft(draft)
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }
    setErrors({})
    onUpdate(draft)
    setEditing(false)
  }

  function cancelEdit() {
    setErrors({})
    setEditing(false)
  }

  return (
    <Card padding="lg">
      <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">
        Operating Hours
      </h2>

      {!editing ? (
        <>
          <div className="mt-6 divide-y divide-stone-100 dark:divide-stone-700">
            {hours.map((day) => (
              <div key={day.day_of_week} className="flex items-center justify-between py-3">
                <span className="text-sm font-medium text-stone-700 dark:text-stone-300">
                  {DAY_LABELS[day.day_of_week]}
                </span>
                <span className="text-sm text-stone-500 dark:text-stone-400">
                  {day.is_closed ? (
                    <span className="text-stone-400 dark:text-stone-500">Closed</span>
                  ) : (
                    `${formatClockTime(day.opening_time ?? '')} – ${formatClockTime(day.closing_time ?? '')}`
                  )}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-end">
            <Button className="transition hover:bg-[#913712]" size="md" onClick={openEdit}>
              Edit Hours
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="mt-4 flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => copyToWeekdays('MON')}>
              Copy Mon to Weekdays
            </Button>
            <Button variant="secondary" size="sm" onClick={() => copyToAll('MON')}>
              Copy Mon to All
            </Button>
          </div>

          {errors._all && (
            <div className="mt-4">
              <Alert variant="error">{errors._all}</Alert>
            </div>
          )}

          <div className="mt-4 space-y-3">
            {draft.map((day) => (
              <div
                key={day.day_of_week}
                className="flex flex-col gap-2 rounded-lg border border-stone-200 p-3 dark:border-stone-600 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={!day.is_closed}
                    onChange={(e) => updateDraft(day.day_of_week, 'is_closed', !e.target.checked)}
                    aria-label={`${DAY_LABELS[day.day_of_week]} open`}
                    className="size-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-sm font-medium text-stone-700 dark:text-stone-300 w-24">
                    {DAY_LABELS[day.day_of_week]}
                  </span>
                </div>
                {!day.is_closed ? (
                  <div className="flex flex-col items-start gap-1 sm:items-end">
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={day.opening_time ?? ''}
                        onChange={(e) => updateDraft(day.day_of_week, 'opening_time', e.target.value || null)}
                        aria-label={`${DAY_LABELS[day.day_of_week]} opening time`}
                        className={`rounded-lg border px-3 py-1.5 text-sm dark:bg-stone-700 dark:text-stone-100 ${
                          errors[day.day_of_week]
                            ? 'border-red-500 dark:border-red-500'
                            : 'border-stone-300 dark:border-stone-600'
                        }`}
                      />
                      <span className="text-sm text-stone-400">to</span>
                      <input
                        type="time"
                        value={day.closing_time ?? ''}
                        onChange={(e) => updateDraft(day.day_of_week, 'closing_time', e.target.value || null)}
                        aria-label={`${DAY_LABELS[day.day_of_week]} closing time`}
                        className={`rounded-lg border px-3 py-1.5 text-sm dark:bg-stone-700 dark:text-stone-100 ${
                          errors[day.day_of_week]
                            ? 'border-red-500 dark:border-red-500'
                            : 'border-stone-300 dark:border-stone-600'
                        }`}
                      />
                    </div>
                    {errors[day.day_of_week] && (
                      <p className="text-xs text-red-600 dark:text-red-400">
                        {errors[day.day_of_week]}
                      </p>
                    )}
                  </div>
                ) : (
                  <span className="text-sm text-stone-400 dark:text-stone-500">Closed</span>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <Button variant="secondary" onClick={cancelEdit} type="button">
              Cancel
            </Button>
            <Button loading={isUpdating} onClick={handleSave} type="button">
              Save Hours
            </Button>
          </div>
        </>
      )}
    </Card>
  )
}

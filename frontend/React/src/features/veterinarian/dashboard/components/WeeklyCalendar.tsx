import type { ScheduleSlot } from '../types/veterinarian.types'

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17]

const HOUR_PX = 64

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED:
    'bg-blue-100 border-l-4 border-blue-500 text-blue-900 dark:bg-blue-900/30 dark:text-blue-300',
  CHECKED_IN:
    'bg-purple-100 border-l-4 border-purple-500 text-purple-900 dark:bg-purple-900/30 dark:text-purple-300',
  IN_PROGRESS:
    'bg-orange-100 border-l-4 border-orange-500 text-orange-900 dark:bg-orange-900/30 dark:text-orange-300',
  COMPLETED:
    'bg-green-100 border-l-4 border-green-500 text-green-900 dark:bg-green-900/30 dark:text-green-300',
}

const DEFAULT_SLOT_COLOR =
  'bg-stone-100 border-l-4 border-stone-400 text-stone-700 dark:bg-stone-800 dark:text-stone-300'

function toDateKey(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function formatHour(hour: number): string {
  if (hour === 12) return '12 PM'
  return hour > 12 ? `${hour - 12} PM` : `${hour} AM`
}

function parseTime(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

interface WeeklyCalendarProps {
  days: Date[]
  slots: ScheduleSlot[]
  onSlotClick?: (slot: ScheduleSlot) => void
}

export function WeeklyCalendar({ days, slots, onSlotClick }: WeeklyCalendarProps) {
  const todayKey = toDateKey(new Date())
  const gridStartMin = HOURS[0] * 60
  const gridEndMin = (HOURS[HOURS.length - 1] + 1) * 60

  function getSlotsForDay(day: Date): ScheduleSlot[] {
    const key = toDateKey(day)
    return slots.filter((s) => s.date === key)
  }

  return (
    <div className="overflow-x-auto rounded-md border border-stone-200 bg-white shadow-sm dark:border-stone-700 dark:bg-stone-800">
      <div className="min-w-[1000px]">
        <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-stone-200 dark:border-stone-700">
          <div className="border-r border-stone-200 dark:border-stone-700" />
          {days.map((day) => {
            const isToday = toDateKey(day) === todayKey
            return (
              <div
                key={day.toISOString()}
                className={`border-r border-stone-200 px-2 py-3 text-center last:border-r-0 dark:border-stone-700 ${
                  isToday ? 'bg-amber-100 dark:bg-amber-900/30' : ''
                }`}
              >
                <p className="text-xs font-medium text-stone-500 dark:text-stone-400">
                  {day.toLocaleDateString('en-US', { weekday: 'short' })}
                </p>
                <p
                  className={`text-lg font-bold ${
                    isToday
                      ? 'text-amber-900 dark:text-amber-300'
                      : 'text-stone-900 dark:text-stone-100'
                  }`}
                >
                  {day.getDate()}
                </p>
              </div>
            )
          })}
        </div>

        <div className="grid grid-cols-[80px_repeat(7,1fr)]">
          <div>
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="flex h-16 items-start border-r border-b border-stone-200 px-2 pt-1 dark:border-stone-700"
              >
                <span className="text-xs text-stone-500 dark:text-stone-400">
                  {formatHour(hour)}
                </span>
              </div>
            ))}
          </div>

          {days.map((day) => (
            <div
              key={day.toISOString()}
              className="relative border-r border-stone-200 last:border-r-0 dark:border-stone-700"
            >
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="h-16 border-b border-stone-100 dark:border-stone-700/50"
                />
              ))}

              {getSlotsForDay(day).map((slot) => {
                const startMin = parseTime(slot.start_time)
                const endMin = parseTime(slot.end_time)
                if (startMin < gridStartMin || startMin >= gridEndMin) return null

                const top = ((startMin - gridStartMin) / 60) * HOUR_PX
                const height = Math.max(((endMin - startMin) / 60) * HOUR_PX, 56)

                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => onSlotClick?.(slot)}
                    className={`absolute left-1 right-1 cursor-pointer overflow-hidden rounded-lg px-1.5 py-1 text-left text-[11px] font-semibold leading-tight transition hover:z-10 hover:shadow-md hover:ring-2 hover:ring-amber-500/70 ${
                      STATUS_COLORS[slot.status] ?? DEFAULT_SLOT_COLOR
                    }`}
                    style={{ top: `${top}px`, height: `${height}px` }}
                  >
                    <p className="truncate font-bold">{slot.pet_name}</p>
                    {slot.condition && (
                      <p className="truncate text-[10px] font-semibold opacity-75">
                        {slot.condition}
                      </p>
                    )}
                    <p className="truncate text-[10px] font-medium opacity-75">
                      {slot.time_label}
                    </p>
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

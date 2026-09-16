import type { ScheduleSlot } from '../types/veterinarian.types'

interface WeeklyCalendarProps {
  slots: ScheduleSlot[]
  days: string[]
  hours: number[]
}

const SLOT_COLORS: Record<string, string> = {
  blue: 'bg-blue-100 border-l-4 border-blue-500 text-blue-900 dark:bg-blue-900/30 dark:text-blue-300',
  orange: 'bg-orange-100 border-l-4 border-orange-500 text-orange-900 dark:bg-orange-900/30 dark:text-orange-300',
  green: 'bg-green-100 border-l-4 border-green-500 text-green-900 dark:bg-green-900/30 dark:text-green-300',
  purple: 'bg-purple-100 border-l-4 border-purple-500 text-purple-900 dark:bg-purple-900/30 dark:text-purple-300',
}

function getSlotStyle(color: string): string {
  return SLOT_COLORS[color] || SLOT_COLORS.blue
}

export function WeeklyCalendar({ slots, days, hours }: WeeklyCalendarProps) {
  function getSlotsForDay(day: string): ScheduleSlot[] {
    return slots.filter((s) => s.day === day)
  }

  function getSlotPosition(time: string): number {
    const [h] = time.split(':').map(Number)
    return (h - 8) * 64
  }

  function getSlotHeight(start: string, end: string): number {
    const [sh] = start.split(':').map(Number)
    const [eh] = end.split(':').map(Number)
    return (eh - sh) * 64
  }

  return (
    <div className="overflow-x-auto rounded-md border border-stone-200 bg-white shadow-sm dark:border-stone-700 dark:bg-stone-800">
      <div className="min-w-[800px]">
              <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-stone-200 dark:border-stone-700">
              <div className="border-r border-stone-200 dark:border-stone-700" />
          {days.map((day, i) => {
            const dayNum = 14 + i
            const isToday = i === 2
            return (
                <div
                  key={day}
                  className={`border-r border-stone-200 px-2 py-3 text-center last:border-r-0 dark:border-stone-700 ${
                    isToday ? 'bg-amber-100 dark:bg-amber-900/30' : ''
                  }`}
                >
                <p className="text-xs font-medium text-stone-500 dark:text-stone-400">{day}</p>
                <p className={`text-lg font-bold ${isToday ? 'text-amber-900 dark:text-amber-300' : 'text-stone-900 dark:text-stone-100'}`}>
                  {dayNum}
                </p>
              </div>
            )
          })}
        </div>

        <div className="grid grid-cols-[80px_repeat(7,1fr)]">
          <div>
            {hours.map((hour) => (
                <div
                  key={hour}
                  className="flex h-16 items-start border-r border-b border-stone-200 px-2 pt-1 dark:border-stone-700"
                >
                <span className="text-xs text-stone-500 dark:text-stone-400">{hour}:00</span>
              </div>
            ))}
          </div>

          {days.map((day) => (
            <div key={day} className="relative border-r border-stone-200 last:border-r-0 dark:border-stone-700">
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="h-16 border-b border-stone-100 dark:border-stone-700/50"
                />
              ))}

              {getSlotsForDay(day).map((slot) => (
                <div
                  key={slot.id}
                  className={`absolute left-1 right-1 rounded-lg px-2 py-1 text-xs font-semibold ${getSlotStyle(slot.color)}`}
                  style={{
                    top: `${getSlotPosition(slot.start_time)}px`,
                    height: `${getSlotHeight(slot.start_time, slot.end_time)}px`,
                  }}
                >
                  <p className="font-bold">{slot.pet_name}</p>
                  <p className="opacity-75">{slot.condition}</p>
                  <p className="opacity-75">{slot.start_time} - {slot.end_time}</p>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

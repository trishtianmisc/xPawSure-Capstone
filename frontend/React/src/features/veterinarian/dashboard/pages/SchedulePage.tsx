import { WeeklyCalendar } from '../components/WeeklyCalendar'
import type { ScheduleSlot } from '../types/veterinarian.types'

const MOCK_SCHEDULE: ScheduleSlot[] = [
  { id: '1', pet_name: 'Max', condition: 'Mange', day: 'Mon', start_time: '9:00', end_time: '9:30', color: 'blue' },
  { id: '2', pet_name: 'Luna', condition: 'Hotspots', day: 'Mon', start_time: '11:00', end_time: '11:30', color: 'orange' },
]

const DAYS = ['Mon', 'Tues', 'Wed', 'Thurs', 'Fri', 'Sat', 'Sun']
const HOURS = [8, 9, 10, 11, 12, 1, 2]

export function SchedulePage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-extrabold text-stone-900 dark:text-stone-100">Schedule</h2>
        <button
          className="grid size-8 place-items-center rounded-lg text-stone-500 transition hover:bg-stone-200 dark:text-stone-400 dark:hover:bg-stone-700"
          type="button"
        >
          <svg className="size-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>
      </div>

      <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">April</h3>

      <WeeklyCalendar days={DAYS} hours={HOURS} slots={MOCK_SCHEDULE} />
    </div>
  )
}

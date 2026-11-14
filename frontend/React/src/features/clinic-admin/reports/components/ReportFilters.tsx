import { Button, Card } from '../../../../components/ui'
import type { RangePreset } from '../utils/dateRanges'

const INPUT_CLASSES =
  'rounded-md border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-amber-500 dark:focus:ring-amber-900/40'

const PRESETS: Array<{ value: RangePreset; label: string }> = [
  { value: 'today', label: 'Today' },
  { value: 'this-month', label: 'This month' },
  { value: 'this-year', label: 'This year' },
  { value: 'last-30', label: 'Last 30 days' },
  { value: 'custom', label: 'Custom' },
]

export interface FilterVeterinarian {
  id: string
  first_name: string
  last_name: string
}

interface ReportFiltersProps {
  vets: FilterVeterinarian[] | undefined
  vetsLoading: boolean
  vetId: string
  onVetIdChange: (value: string) => void
  preset: RangePreset
  onPresetChange: (preset: RangePreset) => void
  dateFrom: string
  onDateFromChange: (value: string) => void
  dateTo: string
  onDateToChange: (value: string) => void
  onClear: () => void
  hasActiveFilters: boolean
}

export function ReportFilters({
  vets,
  vetsLoading,
  vetId,
  onVetIdChange,
  preset,
  onPresetChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  onClear,
  hasActiveFilters,
}: ReportFiltersProps) {
  return (
    <Card padding="sm">
      <div className="flex flex-wrap items-center gap-3">
        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label="Date range presets"
        >
          {PRESETS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={preset === option.value}
              onClick={() => onPresetChange(option.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                preset === option.value
                  ? 'bg-amber-700 text-white'
                  : 'border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <select
          className={`${INPUT_CLASSES} w-56 shrink-0`}
          value={vetId}
          disabled={vetsLoading}
          onChange={(e) => onVetIdChange(e.target.value)}
          aria-label="Filter by veterinarian"
        >
          <option value="">
            {vetsLoading ? 'Loading veterinarians...' : 'All veterinarians'}
          </option>
          {vets?.map((vet) => (
            <option key={vet.id} value={vet.id}>
              {vet.first_name} {vet.last_name}
            </option>
          ))}
        </select>

        <input
          className={`${INPUT_CLASSES} w-44 shrink-0`}
          type="date"
          value={dateFrom}
          max={dateTo || undefined}
          onChange={(e) => onDateFromChange(e.target.value)}
          aria-label="Report from date"
        />
        <input
          className={`${INPUT_CLASSES} w-44 shrink-0`}
          type="date"
          value={dateTo}
          min={dateFrom || undefined}
          onChange={(e) => onDateToChange(e.target.value)}
          aria-label="Report to date"
        />

        {hasActiveFilters && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={onClear}
          >
            Clear
          </Button>
        )}
      </div>
    </Card>
  )
}

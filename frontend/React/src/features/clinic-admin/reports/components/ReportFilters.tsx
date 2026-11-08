import { Button, Card } from '../../../../components/ui'

const INPUT_CLASSES =
  'rounded-md border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-amber-500 dark:focus:ring-amber-900/40'

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

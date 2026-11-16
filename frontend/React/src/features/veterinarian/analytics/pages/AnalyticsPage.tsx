import { useMemo, useState, type ReactNode } from 'react'

import { Button } from '../../../../components/ui'
import { apiErrorMessage } from '../../../../utils/error'
import { CLINIC_TIME_ZONE } from '../../../../utils/format'
import { PageHero } from '../../../receptionist/components/PageHero'
import { ChartSkeleton } from '../../../clinic-admin/dashboard/components/Charts/AppointmentsByMonthChart'
import { AppointmentsOverTimeChart } from '../../../clinic-admin/reports/components/AppointmentsOverTimeChart'
import {
  ReportFilters,
  type ReportPresetOption,
} from '../../../clinic-admin/reports/components/ReportFilters'
import { StatusBreakdownChart } from '../../../clinic-admin/reports/components/StatusBreakdownChart'
import {
  formatRange,
  presetWindow,
  type DateWindow,
  type RangePreset,
} from '../../../clinic-admin/reports/utils/dateRanges'
import {
  aggregateSeries,
  type Granularity,
} from '../../../clinic-admin/reports/utils/granularity'
import { VetAnalyticsKPIRows } from '../components/VetAnalyticsKPIRows'
import {
  useVetReportAppointments,
  useVetReportSummary,
} from '../hooks/useVetAnalytics'
import type { VetAnalyticsQuery } from '../types/analytics.types'

interface QueryState<T> {
  data: T | undefined
  isLoading: boolean
  error: unknown
  isFetching: boolean
  refetch: () => unknown
}

function ErrorPanel({
  label,
  state,
}: {
  label: string
  state: QueryState<unknown>
}) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 dark:border-stone-700 dark:bg-stone-800">
      <p className="text-sm font-semibold text-stone-600 dark:text-stone-400">
        Failed to load {label}
      </p>
      <p className="mt-1 text-sm text-stone-400 dark:text-stone-500">
        {apiErrorMessage(state.error)}
      </p>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="mt-3"
        loading={state.isFetching}
        onClick={() => state.refetch()}
      >
        Try again
      </Button>
    </div>
  )
}

function AsyncSection<T>({
  state,
  label,
  skeleton,
  render,
}: {
  state: QueryState<T>
  label: string
  skeleton: ReactNode
  render: (data: T) => ReactNode
}) {
  if (state.isLoading) return <>{skeleton}</>
  if (state.error) return <ErrorPanel label={label} state={state} />
  if (state.data === undefined) return null
  return <>{render(state.data)}</>
}

const KPI_SKELETON = (
  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    {Array.from({ length: 4 }).map((_, index) => (
      <div
        key={index}
        className="h-32 animate-pulse rounded-xl border border-stone-200 bg-stone-100 dark:border-stone-700 dark:bg-stone-800"
      />
    ))}
  </div>
)

const PANEL_SKELETON = (
  <div className="h-64 animate-pulse rounded-xl border border-stone-200 bg-stone-100 dark:border-stone-700 dark:bg-stone-800" />
)

const DEFAULT_VET_PRESET = 'this-month-full' as const

const VET_PRESETS: ReportPresetOption[] = [
  { value: 'today', label: 'Today' },
  { value: 'this-month-full', label: 'This month' },
  { value: 'this-year', label: 'This year' },
  { value: 'last-30', label: 'Last 30 days' },
  { value: 'custom', label: 'Custom' },
]

export function VetAnalyticsPage() {
  const [preset, setPreset] = useState<RangePreset>(DEFAULT_VET_PRESET)
  const [customWindow, setCustomWindow] = useState<DateWindow>(() =>
    presetWindow(DEFAULT_VET_PRESET, CLINIC_TIME_ZONE),
  )
  const [granularity, setGranularity] = useState<Granularity>('day')

  const window = useMemo<DateWindow>(
    () =>
      preset === 'custom'
        ? customWindow
        : presetWindow(preset, CLINIC_TIME_ZONE),
    [preset, customWindow],
  )

  const params = useMemo<VetAnalyticsQuery>(
    () => ({
      date_from: window.date_from,
      date_to: window.date_to,
    }),
    [window],
  )

  const summary = useVetReportSummary(params)
  const appointments = useVetReportAppointments(params)

  const rangeLabel = formatRange(window.date_from, window.date_to)
  const hasActiveFilters = preset !== DEFAULT_VET_PRESET

  function clearFilters() {
    setPreset(DEFAULT_VET_PRESET)
  }

  function handlePresetChange(next: RangePreset) {
    if (next === 'custom') {
      setCustomWindow((current) => (preset === 'custom' ? current : window))
    }
    setPreset(next)
  }

  function handleDateChange(key: 'date_from' | 'date_to', value: string) {
    setCustomWindow((current) => {
      const base = preset === 'custom' ? current : window
      return { ...base, [key]: value }
    })
    setPreset('custom')
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-6">
      <PageHero
        title="Analytics"
        subtitle="Review appointment volume and outcomes for your own consultations."
      />

      <ReportFilters
        preset={preset}
        onPresetChange={handlePresetChange}
        dateFrom={window.date_from}
        onDateFromChange={(value) => handleDateChange('date_from', value)}
        dateTo={window.date_to}
        onDateToChange={(value) => handleDateChange('date_to', value)}
        onClear={clearFilters}
        hasActiveFilters={hasActiveFilters}
        showVetFilter={false}
        presets={VET_PRESETS}
      />

      <p className="text-xs leading-relaxed text-stone-500 dark:text-stone-400">
        Only appointments assigned to you are included in these metrics.
      </p>

      <AsyncSection
        state={summary}
        label="key metrics"
        skeleton={KPI_SKELETON}
        render={(data) => (
          <VetAnalyticsKPIRows summary={data} />
        )}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AsyncSection
            state={appointments}
            label="appointment trends"
            skeleton={<ChartSkeleton />}
            render={(data) => (
              <AppointmentsOverTimeChart
                data={aggregateSeries(data.series, granularity)}
                granularity={granularity}
                onGranularityChange={setGranularity}
              />
            )}
          />
        </div>
        <AsyncSection
          state={appointments}
          label="status breakdown"
          skeleton={PANEL_SKELETON}
          render={(data) => (
            <StatusBreakdownChart
              data={data.by_status}
              rangeLabel={rangeLabel}
            />
          )}
        />
      </div>

      <p className="text-xs text-stone-400 dark:text-stone-500">
        Showing {rangeLabel}. Completion and no-show rates use elapsed,
        non-cancelled appointments; cancellation rate uses all appointments in
        the range, including upcoming ones.
      </p>
    </div>
  )
}

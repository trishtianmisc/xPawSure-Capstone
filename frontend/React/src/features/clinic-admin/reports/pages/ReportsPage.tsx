import { useMemo, useState, type ReactNode } from 'react'

import { Button } from '../../../../components/ui'
import { apiErrorMessage } from '../../../../utils/error'
import { PageHero } from '../../../receptionist/components/PageHero'
import { useVeterinarians } from '../../appointments/hooks/useAppointments'
import { ChartSkeleton } from '../../dashboard/components/Charts/AppointmentsByMonthChart'
import { AppointmentsOverTimeChart } from '../components/AppointmentsOverTimeChart'
import { ReportFilters } from '../components/ReportFilters'
import { ReportKPIRows } from '../components/ReportKPIRows'
import { ScreeningsAnalyticsCard } from '../components/ScreeningsAnalyticsCard'
import { StatusBreakdownChart } from '../components/StatusBreakdownChart'
import { VetWorkloadTable } from '../components/VetWorkloadTable'
import {
  useReportAppointments,
  useReportScreenings,
  useReportSummary,
  useReportVetWorkload,
} from '../hooks/useReports'
import type { ReportQuery } from '../types/reports.types'
import {
  defaultWindow,
  formatRange,
  windowDays,
  type DateWindow,
} from '../utils/dateRanges'
import { downloadCsv, summaryCsvRows, summaryFilename, toCsv } from '../utils/exportCsv'

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
  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
    {Array.from({ length: 5 }).map((_, index) => (
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

export function ClinicAdminReportsPage() {
  const [defaultRange] = useState<DateWindow>(() => defaultWindow())
  const [window, setWindow] = useState<DateWindow>(defaultRange)
  const [vetId, setVetId] = useState('')

  const params = useMemo<ReportQuery>(
    () => ({
      date_from: window.date_from,
      date_to: window.date_to,
      vet_id: vetId || undefined,
    }),
    [window, vetId],
  )

  const summary = useReportSummary(params)
  const appointments = useReportAppointments(params)
  const workload = useReportVetWorkload(params)
  const screenings = useReportScreenings(params)
  const vets = useVeterinarians()

  const days = windowDays(window.date_from, window.date_to)
  const rangeLabel = formatRange(window.date_from, window.date_to)
  const vetSelected = Boolean(vetId)
  const vetName = vets.data?.find((vet) => vet.id === vetId)
  const vetLabel = vetName
    ? `${vetName.first_name} ${vetName.last_name}`
    : 'All veterinarians'
  const hasActiveFilters =
    vetId !== '' ||
    window.date_from !== defaultRange.date_from ||
    window.date_to !== defaultRange.date_to

  function handleExport() {
    if (!summary.data) return
    const rows = summaryCsvRows(summary.data, window, vetLabel)
    downloadCsv(summaryFilename(window), toCsv(rows))
  }

  function clearFilters() {
    setVetId('')
    setWindow(defaultRange)
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-6">
      <PageHero
        title="Reports & Analytics"
        subtitle="Track appointments, outcomes, workload, and AI screening activity."
        actions={
          <Button
            type="button"
            variant="secondary"
            loading={summary.isFetching}
            disabled={!summary.data}
            onClick={handleExport}
          >
            Export summary
          </Button>
        }
      />

      <ReportFilters
        vets={vets.data}
        vetsLoading={vets.isLoading}
        vetId={vetId}
        onVetIdChange={setVetId}
        dateFrom={window.date_from}
        onDateFromChange={(value) =>
          setWindow((current) => ({ ...current, date_from: value }))
        }
        dateTo={window.date_to}
        onDateToChange={(value) =>
          setWindow((current) => ({ ...current, date_to: value }))
        }
        onClear={clearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {vetSelected && (
        <p className="text-xs leading-relaxed text-stone-500 dark:text-stone-400">
          <span className="font-semibold">{vetLabel}</span> filter applies to
          appointment and screening metrics. New Patients always covers the
          whole clinic, and screening figures only include bookings linked to
          this veterinarian.
        </p>
      )}

      <AsyncSection
        state={summary}
        label="key metrics"
        skeleton={KPI_SKELETON}
        render={(data) => (
          <ReportKPIRows
            summary={data}
            previous={data.previous}
            days={days}
            vetSelected={vetSelected}
          />
        )}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AsyncSection
            state={appointments}
            label="appointment trends"
            skeleton={<ChartSkeleton />}
            render={(data) => (
              <AppointmentsOverTimeChart data={data.series} />
            )}
          />
        </div>
        <AsyncSection
          state={appointments}
          label="status breakdown"
          skeleton={PANEL_SKELETON}
          render={(data) => <StatusBreakdownChart data={data.by_status} />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AsyncSection
          state={screenings}
          label="screening analytics"
          skeleton={PANEL_SKELETON}
          render={(data) => <ScreeningsAnalyticsCard report={data} />}
        />
        <AsyncSection
          state={workload}
          label="veterinarian workload"
          skeleton={PANEL_SKELETON}
          render={(data) => <VetWorkloadTable report={data} />}
        />
      </div>

      <p className="text-xs text-stone-400 dark:text-stone-500">
        Showing {rangeLabel}. Rates use different denominators: completion and
        no-show are measured against elapsed, non-cancelled visits, while
        cancellation is measured against all appointments in the range.
      </p>
    </div>
  )
}

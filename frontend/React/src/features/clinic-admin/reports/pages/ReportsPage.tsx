import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { flushSync } from 'react-dom'

import { Button } from '../../../../components/ui'
import { apiErrorMessage } from '../../../../utils/error'
import { CLINIC_TIME_ZONE } from '../../../../utils/format'
import { PageHero } from '../../../receptionist/components/PageHero'
import { useClinicProfile } from '../../../clinic-profile/hooks/useClinicProfile'
import { useClinicSettings } from '../../../clinic-profile/hooks/useClinicSettings'
import { useVeterinarians } from '../../appointments/hooks/useAppointments'
import { ChartSkeleton } from '../../dashboard/components/Charts/AppointmentsByMonthChart'
import { AppointmentsOverTimeChart } from '../components/AppointmentsOverTimeChart'
import { PatientDemographicsCard } from '../components/PatientDemographicsCard'
import { PrintableReport } from '../components/PrintableReport'
import { ReportFilters } from '../components/ReportFilters'
import { ReportKPIRows } from '../components/ReportKPIRows'
import { RevenueOverTimeChart } from '../components/RevenueOverTimeChart'
import { ScreeningsAnalyticsCard } from '../components/ScreeningsAnalyticsCard'
import { StatusBreakdownChart } from '../components/StatusBreakdownChart'
import { VetWorkloadTable } from '../components/VetWorkloadTable'
import {
  useReportAppointments,
  useReportPatients,
  useReportRevenue,
  useReportScreenings,
  useReportSummary,
  useReportVetWorkload,
} from '../hooks/useReports'
import type { ReportQuery } from '../types/reports.types'
import { agreementRate } from '../utils/agreementRate'
import {
  comparisonLabel as describeComparison,
  formatRange,
  presetWindow,
  previousWindow,
  windowDays,
  type DateWindow,
  type RangePreset,
} from '../utils/dateRanges'
import { downloadCsv, reportCsvRows, reportFilename, toCsv } from '../utils/exportCsv'
import { aggregateSeries, type Granularity } from '../utils/granularity'

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
  const [preset, setPreset] = useState<RangePreset>('this-month')
  // Only the Custom preset reads this; it starts as the default month and
  // is re-seeded from the visible window the first time Custom is picked.
  const [customWindow, setCustomWindow] = useState<DateWindow>(() =>
    presetWindow('this-month', CLINIC_TIME_ZONE),
  )
  const [vetId, setVetId] = useState('')
  const [granularity, setGranularity] = useState<Granularity>('day')
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null)

  const settings = useClinicSettings()
  // Presets resolve in the clinic's timezone so "Today"/"This month" match
  // the backend's clinic-local day bounds even before settings load.
  const clinicTz = settings.data?.timezone ?? CLINIC_TIME_ZONE
  const window = useMemo<DateWindow>(
    () =>
      preset === 'custom' ? customWindow : presetWindow(preset, clinicTz),
    [preset, customWindow, clinicTz],
  )

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
  const patients = useReportPatients(params)
  const revenue = useReportRevenue(params)
  const vets = useVeterinarians()
  const profile = useClinicProfile()

  // The printable report is styled light-only, and the screen layout is
  // hidden at print time, so flip to light right before the browser takes
  // the print snapshot (works for both the Print button and Ctrl+P) and
  // restore the theme when printing finishes. The data-attribute marker
  // makes restore idempotent if both paths run.
  useEffect(() => {
    const stamp = () => {
      flushSync(() => setGeneratedAt(new Date()))
      const root = document.documentElement
      if (root.classList.contains('dark')) {
        root.setAttribute('data-print-dark', 'true')
        root.classList.remove('dark')
      }
    }
    const restore = () => {
      const root = document.documentElement
      if (root.hasAttribute('data-print-dark')) {
        root.classList.add('dark')
        root.removeAttribute('data-print-dark')
      }
    }
    globalThis.window.addEventListener('beforeprint', stamp)
    globalThis.window.addEventListener('afterprint', restore)
    return () => {
      globalThis.window.removeEventListener('beforeprint', stamp)
      globalThis.window.removeEventListener('afterprint', restore)
      restore()
    }
  }, [])

  // The screenings report has no previous-window block, so the comparison
  // baseline for the Vet Agreement Rate KPI is fetched here instead of
  // changing the API contract.
  const prevParams = useMemo<ReportQuery>(() => {
    const prev = previousWindow(window.date_from, window.date_to)
    return { date_from: prev.date_from, date_to: prev.date_to, vet_id: vetId || undefined }
  }, [window, vetId])
  const prevScreenings = useReportScreenings(prevParams)

  const agreementCurrent = screenings.data ? agreementRate(screenings.data) : null
  const agreementPrevious = prevScreenings.data
    ? agreementRate(prevScreenings.data)
    : null

  const days = windowDays(window.date_from, window.date_to)
  const rangeLabel = formatRange(window.date_from, window.date_to)
  const comparison = describeComparison(preset, days)
  const vetSelected = Boolean(vetId)
  const vetName = vets.data?.find((vet) => vet.id === vetId)
  const vetLabel = vetName
    ? `${vetName.first_name} ${vetName.last_name}`
    : 'All veterinarians'
  const hasActiveFilters = vetId !== '' || preset !== 'this-month'

  // The printable document needs every section loaded; printing mid-load
  // would silently drop charts or the workload table from the report.
  const reportReady = Boolean(
    summary.data &&
      appointments.data &&
      workload.data &&
      screenings.data &&
      patients.data &&
      revenue.data,
  )

  function handleExport() {
    if (!summary.data) return
    const rows = reportCsvRows({
      summary: summary.data,
      window,
      vetLabel,
      agreement: { current: agreementCurrent, previous: agreementPrevious },
      appointments: appointments.data,
      workload: workload.data,
      screenings: screenings.data,
      patients: patients.data,
      revenue: revenue.data,
    })
    downloadCsv(reportFilename(window), toCsv(rows))
  }

  function handlePrint() {
    // Exact generation time committed before anything else; the beforeprint
    // listener registered above stamps again and flips to light mode.
    flushSync(() => setGeneratedAt(new Date()))
    // The page's local `window` state shadows the global, so go through
    // globalThis to reach the browser print dialog.
    globalThis.window.print()
  }

  function clearFilters() {
    setVetId('')
    setPreset('this-month')
  }

  // Choosing a fixed preset re-resolves the window in the clinic timezone;
  // picking Custom carries the currently visible range into the inputs.
  function handlePresetChange(next: RangePreset) {
    if (next === 'custom') {
      setCustomWindow((current) =>
        preset === 'custom' ? current : window,
      )
    }
    setPreset(next)
  }

  // Manual date edits always switch to Custom, seeded from whatever range
  // is on screen so only the edited end changes.
  function handleDateChange(key: 'date_from' | 'date_to', value: string) {
    setCustomWindow((current) => {
      const base = preset === 'custom' ? current : window
      return { ...base, [key]: value }
    })
    setPreset('custom')
  }

  // Deep link into the appointments page with the current range applied, so
  // drill-downs land on the exact rows behind a chart or table figure.
  function appointmentsHref(patch: { status?: string; vet_id?: string }): string {
    const query = new URLSearchParams()
    if (patch.status) query.set('status', patch.status)
    if (patch.vet_id) query.set('vet_id', patch.vet_id)
    query.set('date_from', window.date_from)
    query.set('date_to', window.date_to)
    return `/clinic/appointments?${query.toString()}`
  }

  // The payments page reads paid_from/paid_to/status from its URL, so this
  // link lands on the exact PAID rows behind the chart's total.
  const paymentsHref = (() => {
    const query = new URLSearchParams()
    query.set('paid_from', window.date_from)
    query.set('paid_to', window.date_to)
    query.set('status', 'PAID')
    return `/clinic/payments?${query.toString()}`
  })()

  return (
    <>
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-6 print:hidden">
      <PageHero
        title="Reports & Analytics"
        subtitle="Track appointments, outcomes, workload, and AI screening activity."
        actions={
          // Hero buttons mirror the staff list's PageHero design: solid
          // amber primary (Add Staff) + glassy white/10 secondary (Upload
          // CSV), because the shared Button variants clash with the dark
          // amber hero gradient.
          <div className="flex flex-wrap gap-2 print:hidden">
            <button
              type="button"
              disabled={!summary.data}
              onClick={handleExport}
              className="shrink-0 rounded-md bg-amber-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Export CSV
            </button>
            <button
              type="button"
              disabled={!reportReady}
              onClick={handlePrint}
              className="shrink-0 rounded-md border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Print
            </button>
          </div>
        }
      />

      <div className="print:hidden">
        <ReportFilters
          vets={vets.data}
          vetsLoading={vets.isLoading}
          vetId={vetId}
          onVetIdChange={setVetId}
          preset={preset}
          onPresetChange={handlePresetChange}
          dateFrom={window.date_from}
          onDateFromChange={(value) => handleDateChange('date_from', value)}
          dateTo={window.date_to}
          onDateToChange={(value) => handleDateChange('date_to', value)}
          onClear={clearFilters}
          hasActiveFilters={hasActiveFilters}
        />
      </div>

      {vetSelected && (
        <p className="text-xs leading-relaxed text-stone-500 dark:text-stone-400">
          <span className="font-semibold">{vetLabel}</span> filter applies to
          appointment and screening metrics. New Patients and Patient
          Demographics always cover the whole clinic, and screening figures only
          include bookings linked to this veterinarian. Revenue includes only
          payments linked to this veterinarian&apos;s appointments.
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
            agreementRate={agreementCurrent}
            previousAgreementRate={agreementPrevious}
            comparisonLabel={comparison}
            vetSelected={vetSelected}
            revenue={revenue.data}
            revenueLoading={revenue.isLoading}
            revenueError={revenue.error}
            onRevenueRetry={() => revenue.refetch()}
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
              statusHref={(status) => appointmentsHref({ status })}
              rangeLabel={rangeLabel}
            />
          )}
        />
      </div>

      <AsyncSection
        state={revenue}
        label="revenue over time"
        skeleton={PANEL_SKELETON}
        render={(data) => (
          <RevenueOverTimeChart
            series={data.series}
            paymentsHref={paymentsHref}
          />
        )}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <AsyncSection
          state={patients}
          label="patient demographics"
          skeleton={PANEL_SKELETON}
          render={(data) => <PatientDemographicsCard report={data} />}
        />
        <AsyncSection
          state={screenings}
          label="screening analytics"
          skeleton={PANEL_SKELETON}
          render={(data) => <ScreeningsAnalyticsCard report={data} />}
        />
      </div>

      <AsyncSection
        state={workload}
        label="veterinarian workload"
        skeleton={PANEL_SKELETON}
        render={(data) => (
          <VetWorkloadTable
            report={data}
            vetHref={(vetRowId) => appointmentsHref({ vet_id: vetRowId })}
          />
        )}
      />

      <p className="text-xs text-stone-400 dark:text-stone-500">
        Showing {rangeLabel}. Rates use different denominators: no-show is
        measured against elapsed, non-cancelled visits, while vet agreement
        covers judged AI screenings only.
      </p>
    </div>

    {summary.data &&
      appointments.data &&
      workload.data &&
      screenings.data &&
      patients.data &&
      revenue.data && (
        <PrintableReport
          profile={profile.data}
          summary={summary.data}
          appointments={appointments.data}
          workload={workload.data}
          screenings={screenings.data}
          patients={patients.data}
          revenue={revenue.data}
          rangeLabel={rangeLabel}
          days={days}
          comparisonLabel={comparison}
          vetLabel={vetLabel}
          vetSelected={vetSelected}
          generatedAt={generatedAt}
          timezone={settings.data?.timezone ?? CLINIC_TIME_ZONE}
          granularity={granularity}
          agreementRate={agreementCurrent}
          previousAgreementRate={agreementPrevious}
          paymentsHref={paymentsHref}
        />
      )}
    </>
  )
}

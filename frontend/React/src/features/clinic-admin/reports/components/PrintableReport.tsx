import { formatPeso } from '../../../../utils/currency'
import { formatDateTime, formatPhone } from '../../../../utils/format'
import type { ClinicProfile } from '../../../clinic-profile/types/clinicProfile.types'
import type {
  AppointmentsReport,
  PatientsReport,
  ReportRevenue,
  ReportSummary,
  ScreeningsReport,
  VetWorkloadReport,
} from '../types/reports.types'
import { aggregateSeries, type Granularity } from '../utils/granularity'
import { AppointmentsOverTimeChart } from './AppointmentsOverTimeChart'
import { PrintBreakdownTable } from './PrintBreakdownTable'
import { PrintStatRow } from './PrintStatRow'
import { ReportKPIRows } from './ReportKPIRows'
import { RevenueOverTimeChart } from './RevenueOverTimeChart'
import { VetWorkloadTable } from './VetWorkloadTable'

interface PrintableReportProps {
  profile: ClinicProfile | undefined
  summary: ReportSummary
  appointments: AppointmentsReport
  workload: VetWorkloadReport
  screenings: ScreeningsReport
  patients: PatientsReport
  revenue?: ReportRevenue
  rangeLabel: string
  days: number
  // Preset-aware "vs previous ..." wording, identical to the screen.
  comparisonLabel: string
  vetLabel: string
  vetSelected: boolean
  generatedAt: Date | null
  timezone: string
  granularity: Granularity
  agreementRate: number | null
  previousAgreementRate: number | null
  paymentsHref: string
}

// "NO_SHOW" -> "No show"
function titleCase(value: string): string {
  const spaced = value.replace(/_/g, ' ').toLowerCase()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

// Series keys are YYYY-MM-DD (daily) or YYYY-MM (monthly). Parse as a local
// calendar date, never UTC.
function formatBucket(key: string): string {
  if (key.length === 7) {
    return new Date(`${key}-01T00:00:00`).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    })
  }
  return new Date(`${key}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// Highest point of a series. Ties resolve to the earliest date.
function peakOf<T extends { date: string }>(
  series: T[],
  valueOf: (point: T) => number,
): { point: T; value: number } | null {
  let best: { point: T; value: number } | null = null
  for (const point of [...series].sort((a, b) => a.date.localeCompare(b.date))) {
    const value = valueOf(point)
    if (!best || value > best.value) best = { point, value }
  }
  return best
}

// Paper-first document rendered off-screen (left: -9999px) instead of
// display:none so recharts' ResponsiveContainer still measures it and the two
// remaining charts render. At print time the outer wrapper flips to
// static/visible while the screen layout flips to print:hidden (see index.css
// @media print). Styles are light-only on purpose: handlePrint drops the .dark
// class while the dialog is open, so no dark: variants may appear here.
export function PrintableReport({
  profile,
  summary,
  appointments,
  workload,
  screenings,
  patients,
  revenue,
  rangeLabel,
  days,
  comparisonLabel,
  vetLabel,
  vetSelected,
  generatedAt,
  timezone,
  granularity,
  agreementRate,
  previousAgreementRate,
  paymentsHref,
}: PrintableReportProps) {
  // Stats use the raw (daily) series, not the chart's aggregated one, so
  // "busiest day" stays a day even when the chart is weekly or monthly.
  const apptTotal = appointments.series.reduce((sum, p) => sum + p.count, 0)
  const apptPeak = peakOf(appointments.series, (p) => p.count)
  const apptStats = [
    { label: 'Total appointments', value: String(apptTotal) },
    {
      label: 'Busiest day',
      value: apptPeak
        ? `${formatBucket(apptPeak.point.date)} (${apptPeak.value})`
        : '—',
    },
    {
      label: 'Daily average',
      value: days > 0 ? (apptTotal / days).toFixed(1) : '—',
    },
  ]

  // Revenue buckets are daily up to 31 days and monthly beyond, so the "best"
  // label follows the bucket size. The average is always per day of the range.
  const revTotal = revenue ? Number(revenue.revenue) : 0
  const revPeak = revenue
    ? peakOf(revenue.series, (p) => Number(p.amount))
    : null
  const revMonthly = revenue?.series[0]?.date.length === 7
  const revStats = [
    { label: 'Total revenue', value: formatPeso(revTotal) },
    {
      label: revMonthly ? 'Best month' : 'Best day',
      value:
        revPeak && revPeak.value > 0
          ? `${formatBucket(revPeak.point.date)} (${formatPeso(revPeak.value)})`
          : '—',
    },
    {
      label: 'Daily average',
      value: days > 0 ? formatPeso(revTotal / days) : '—',
    },
  ]

  return (
    <div
      aria-hidden="true"
      className="print-report absolute -left-[9999px] top-0 h-0 overflow-hidden print:static print:h-auto print:overflow-visible"
    >
      <div className="w-[680px] bg-white p-10 text-sm leading-relaxed text-stone-900 print:w-full print:p-0">
        <header className="flex items-start justify-between gap-6 border-b-2 border-amber-700 pb-4">
          <div className="flex items-center gap-4">
            <img
              src={profile?.logo_url || '/xpawsure-logo.png'}
              alt=""
              className="h-14 w-14 shrink-0 object-contain"
            />
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-stone-950">
                {profile?.name || 'Clinic name'}
              </h1>
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                Reports &amp; Analytics
              </p>
            </div>
          </div>
          <div className="space-y-0.5 text-right text-xs text-stone-600">
            {profile?.address && <p>{profile.address}</p>}
            {profile?.phone && <p>{formatPhone(profile.phone)}</p>}
            {profile?.email && <p>{profile.email}</p>}
            {profile?.license_number && (
              <p>License No. {profile.license_number}</p>
            )}
          </div>
        </header>

        <section className="mt-5">
          <h2 className="text-base font-bold text-stone-900">
            Reporting period
          </h2>
          <div className="mt-1 grid gap-x-6 gap-y-0.5 text-xs sm:grid-cols-2">
            <p>
              <span className="font-semibold">Range:</span> {rangeLabel} (
              {days} day{days === 1 ? '' : 's'})
            </p>
            <p>
              <span className="font-semibold">Veterinarian:</span> {vetLabel}
            </p>
          </div>
          <p className="mt-2 rounded border border-stone-300 bg-stone-50 px-3 py-2 text-xs text-stone-700">
            All figures below reflect only the filters above.{' '}
            {vetSelected &&
              'Patient Demographics and New Patients always cover the whole clinic, screening figures only include bookings linked to the selected veterinarian, and Revenue includes only payments linked to that veterinarian\u2019s appointments.'}
          </p>
        </section>

        <div className="mt-6 space-y-6">
          <section className="print-section">
            <ReportKPIRows
              summary={summary}
              previous={summary.previous}
              agreementRate={agreementRate}
              previousAgreementRate={previousAgreementRate}
              comparisonLabel={comparisonLabel}
              vetSelected={vetSelected}
              revenue={revenue}
            />
          </section>

          <section className="print-section">
            <AppointmentsOverTimeChart
              data={aggregateSeries(appointments.series, granularity)}
              granularity={granularity}
              onGranularityChange={() => undefined}
              hideControls
            />
            <PrintStatRow stats={apptStats} />
          </section>

          <section className="print-section">
            <PrintBreakdownTable
              title="Appointments by status"
              labelHeading="Status"
              rows={appointments.by_status.map((s) => ({
                label: titleCase(s.status),
                count: s.count,
              }))}
            />
          </section>

          {revenue && (
            <section className="print-section">
              <RevenueOverTimeChart
                series={revenue.series}
                paymentsHref={paymentsHref}
              />
              <PrintStatRow stats={revStats} />
            </section>
          )}

          <section className="print-section space-y-4">
            <h2 className="text-base font-bold text-stone-900">
              Patient demographics
              <span className="ml-2 text-xs font-normal text-stone-500">
                {patients.total} patient{patients.total === 1 ? '' : 's'}
              </span>
            </h2>
            <PrintBreakdownTable
              title="By sex"
              labelHeading="Sex"
              rows={patients.by_sex.map((s) => ({
                label: titleCase(s.sex),
                count: s.count,
              }))}
            />
            <PrintBreakdownTable
              title="By age"
              labelHeading="Age group"
              rows={patients.age_buckets.map((b) => ({
                label: b.bucket,
                count: b.count,
              }))}
            />
            <PrintBreakdownTable
              title="By breed"
              labelHeading="Breed"
              maxRows={10}
              rows={patients.by_breed.map((b) => ({
                label: b.breed,
                count: b.count,
              }))}
            />
          </section>

          <section className="print-section">
            <h2 className="text-base font-bold text-stone-900">
              AI screenings
            </h2>
            <div className="mt-2">
              <PrintBreakdownTable
                title="By condition"
                labelHeading="Condition"
                rows={screenings.by_condition.map((c) => ({
                  label: c.disease,
                  count: c.count,
                }))}
              />
            </div>
            <PrintStatRow
              stats={[
                { label: 'Reviewed', value: String(screenings.reviewed) },
                {
                  label: 'Pending review',
                  value: String(screenings.pending_review),
                },
                {
                  label: 'Vet confirmed',
                  value: String(screenings.vet_confirmed),
                },
                { label: 'Vet changed', value: String(screenings.vet_changed) },
              ]}
            />
          </section>

          <section className="print-section">
            <VetWorkloadTable report={workload} />
          </section>
        </div>

        <footer className="mt-8 space-y-1 border-t border-stone-300 pt-3 text-[11px] leading-relaxed text-stone-500">
          <p>
            Report generated{' '}
            {generatedAt ? formatDateTime(generatedAt, timezone) : '—'}
          </p>
          <p>
            Rates use different denominators: no-show is measured against
            elapsed, non-cancelled visits, while vet agreement covers judged
            AI screenings only.
          </p>
          <p>AI output is advisory only and never a diagnosis.</p>
        </footer>
      </div>
    </div>
  )
}

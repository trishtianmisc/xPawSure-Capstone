import { formatDateTime, formatPhone } from '../../../../utils/format'
import type { ClinicProfile } from '../../../clinic-profile/types/clinicProfile.types'
import type {
  AppointmentsReport,
  PatientsReport,
  ReportSummary,
  ScreeningsReport,
  VetWorkloadReport,
} from '../types/reports.types'
import { aggregateSeries, type Granularity } from '../utils/granularity'
import { AppointmentsOverTimeChart } from './AppointmentsOverTimeChart'
import { PatientDemographicsCard } from './PatientDemographicsCard'
import { ReportKPIRows } from './ReportKPIRows'
import { ScreeningsAnalyticsCard } from './ScreeningsAnalyticsCard'
import { StatusBreakdownChart } from './StatusBreakdownChart'
import { VetWorkloadTable } from './VetWorkloadTable'

interface PrintableReportProps {
  profile: ClinicProfile | undefined
  summary: ReportSummary
  appointments: AppointmentsReport
  workload: VetWorkloadReport
  screenings: ScreeningsReport
  patients: PatientsReport
  rangeLabel: string
  days: number
  vetLabel: string
  vetSelected: boolean
  generatedAt: Date | null
  timezone: string
  granularity: Granularity
  agreementRate: number | null
  previousAgreementRate: number | null
}

// Paper-first document rendered off-screen (left: -9999px) instead of
// display:none so recharts' ResponsiveContainer still measures it and charts
// render. At print time the outer wrapper flips to static/visible while the
// screen layout flips to print:hidden (see index.css @media print). Styles
// are light-only on purpose: handlePrint drops the .dark class while the
// dialog is open, so no dark: variants may appear here.
export function PrintableReport({
  profile,
  summary,
  appointments,
  workload,
  screenings,
  patients,
  rangeLabel,
  days,
  vetLabel,
  vetSelected,
  generatedAt,
  timezone,
  granularity,
  agreementRate,
  previousAgreementRate,
}: PrintableReportProps) {
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
              'Patient Demographics and New Patients always cover the whole clinic, and screening figures only include bookings linked to the selected veterinarian.'}
          </p>
        </section>

        <div className="mt-6 space-y-6">
          <section className="print-section">
            <ReportKPIRows
              summary={summary}
              previous={summary.previous}
              agreementRate={agreementRate}
              previousAgreementRate={previousAgreementRate}
              days={days}
              vetSelected={vetSelected}
            />
          </section>

          <section className="print-section">
            <AppointmentsOverTimeChart
              data={aggregateSeries(appointments.series, granularity)}
              granularity={granularity}
              onGranularityChange={() => undefined}
              hideControls
            />
          </section>

          <section className="print-section">
            <StatusBreakdownChart data={appointments.by_status} />
          </section>

          <section className="print-section">
            <PatientDemographicsCard report={patients} />
          </section>

          <section className="print-section">
            <ScreeningsAnalyticsCard report={screenings} />
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
            Rates use different denominators: completion and no-show are
            measured against elapsed, non-cancelled visits, while vet agreement
            covers judged AI screenings only.
          </p>
          <p>AI output is advisory only and never a diagnosis.</p>
        </footer>
      </div>
    </div>
  )
}

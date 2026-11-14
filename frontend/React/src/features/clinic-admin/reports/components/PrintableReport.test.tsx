import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

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
import { PrintableReport } from './PrintableReport'

// jsdom has no ResizeObserver; the recharts charts inside the report need it.
beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
})

const stamp = new Date('2026-10-08T08:30:00Z')

const profile: ClinicProfile = {
  id: 'c1',
  name: 'Happy Paws Clinic',
  email: 'care@happypaws.ph',
  phone: '09171234567',
  address: '123 Rizal Ave, Makati City',
  license_number: 'VET-00123',
  status: 'ACTIVE',
  logo_url: 'https://cdn.example.com/logo.png',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
}

const summary: ReportSummary = {
  total_appointments: 12,
  completion_rate: 80,
  no_show_rate: 10,
  cancellation_rate: 10,
  new_patients: 2,
  previous: {
    total_appointments: 10,
    completion_rate: 75,
    no_show_rate: 15,
    cancellation_rate: 10,
    new_patients: 1,
  },
}

const appointments: AppointmentsReport = {
  series: [{ date: '2026-10-01', count: 3 }],
  by_status: [{ status: 'COMPLETED', count: 3 }],
}

const workload: VetWorkloadReport = {
  results: [
    {
      vet_id: 'v1',
      vet_name: 'Dr. Reyes',
      total: 5,
      completed: 4,
      no_shows: 1,
      revenue: '4200.00',
      avg_per_day: 2.5,
    },
  ],
  days: 5,
}

const screenings: ScreeningsReport = {
  by_condition: [{ disease: 'Dermatosis', count: 3 }],
  avg_confidence: 88.5,
  reviewed: 2,
  pending_review: 1,
  vet_confirmed: 2,
  vet_changed: 0,
}

const patients: PatientsReport = {
  total: 5,
  by_breed: [{ breed: 'Pomeranian', count: 2 }],
  by_sex: [{ sex: 'FEMALE', count: 3 }],
  age_buckets: [
    { bucket: '<1 yr', count: 1 },
    { bucket: '1–6 yrs', count: 2 },
    { bucket: '7+ yrs', count: 1 },
    { bucket: 'Unknown', count: 1 },
  ],
}

const revenue: ReportRevenue = {
  revenue: '8500.00',
  currency: 'PHP',
  payment_count: 9,
  previous_revenue: '7000.00',
  date_from: '2026-10-01',
  date_to: '2026-10-07',
  series: [
    { date: '2026-10-01', amount: '5000.00' },
    { date: '2026-10-02', amount: '0.00' },
    { date: '2026-10-07', amount: '3500.00' },
  ],
}

const PAYMENTS_HREF =
  '/clinic/payments?paid_from=2026-10-01&paid_to=2026-10-07&status=PAID'

function renderReport(overrides: { vetSelected?: boolean } = {}) {
  return render(
    // Router context: the report embeds the revenue chart, whose View
    // payments link needs react-router.
    <MemoryRouter>
      <PrintableReport
      profile={profile}
      summary={summary}
      appointments={appointments}
      workload={workload}
      screenings={screenings}
      patients={patients}
      revenue={revenue}
      rangeLabel="Oct 1 – Oct 7, 2026"
      days={7}
      comparisonLabel="vs previous 7 days"
      vetLabel={overrides.vetSelected ? 'Dr. Reyes' : 'All veterinarians'}
      vetSelected={overrides.vetSelected ?? false}
      generatedAt={stamp}
      timezone="Asia/Manila"
      granularity="day"
      agreementRate={100}
      previousAgreementRate={null}
      paymentsHref={PAYMENTS_HREF}
      />
    </MemoryRouter>,
  )
}

describe('PrintableReport', () => {
  it('renders clinic letterhead, reporting period, sections, and timestamp', () => {
    renderReport()

    // The report root is aria-hidden (off-screen document), so role queries
    // must opt into hidden elements; text queries are unaffected.
    expect(
      screen.getByRole('heading', { level: 1, hidden: true }),
    ).toHaveTextContent('Happy Paws Clinic')
    expect(screen.getByText('123 Rizal Ave, Makati City')).toBeInTheDocument()
    expect(screen.getByText(formatPhone('09171234567'))).toBeInTheDocument()
    expect(screen.getByText('care@happypaws.ph')).toBeInTheDocument()
    expect(screen.getByText('License No. VET-00123')).toBeInTheDocument()

    expect(screen.getByText(/Oct 1 – Oct 7, 2026/)).toBeInTheDocument()
    expect(screen.getByText(/All figures below reflect only the filters/)).toBeInTheDocument()

    expect(screen.getByText('Key Metrics')).toBeInTheDocument()
    // KPI label and the workload table's Revenue column both read "Revenue".
    expect(screen.getAllByText('Revenue').length).toBeGreaterThan(0)
    expect(screen.getByText('₱8,500.00')).toBeInTheDocument()
    expect(screen.getByText('9 payments')).toBeInTheDocument()
    expect(screen.getByText('Appointments Over Time')).toBeInTheDocument()
    expect(screen.getByText('Status Breakdown')).toBeInTheDocument()
    expect(screen.getByText('Revenue Over Time')).toBeInTheDocument()
    expect(screen.getByText('Daily paid revenue')).toBeInTheDocument()
    expect(screen.getByText('Veterinarian Workload')).toBeInTheDocument()
    expect(screen.getByText('₱4,200.00')).toBeInTheDocument()
    expect(screen.getByText('AI Screenings')).toBeInTheDocument()
    // Preset-aware baseline wording reaches the printable copy too.
    expect(screen.getAllByText('vs previous 7 days').length).toBeGreaterThan(0)

    const generated = screen.getByText(/Report generated/)
    expect(generated.textContent).toContain(
      formatDateTime(stamp, 'Asia/Manila'),
    )
  })

  it('explains whole-clinic scope only when a vet filter is active', () => {
    renderReport({ vetSelected: true })

    // Appears in the filters box and the workload table.
    expect(screen.getAllByText(/Dr\. Reyes/).length).toBeGreaterThan(0)
    expect(screen.getByText(/always cover the whole clinic/)).toBeInTheDocument()
  })

  it('omits the whole-clinic caveat for the unfiltered report', () => {
    renderReport()

    expect(
      screen.queryByText(/always cover the whole clinic/),
    ).not.toBeInTheDocument()
  })

  it('links the revenue chart to the exact PAID payments window', () => {
    renderReport()

    const link = screen.getByRole('link', { name: 'View payments', hidden: true })
    expect(link).toHaveAttribute('href', PAYMENTS_HREF)
  })
})

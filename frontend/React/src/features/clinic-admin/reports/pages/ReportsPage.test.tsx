import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { useClinicProfile } from '../../../clinic-profile/hooks/useClinicProfile'
import { useClinicSettings } from '../../../clinic-profile/hooks/useClinicSettings'
import { useVeterinarians } from '../../appointments/hooks/useAppointments'
import {
  useReportAppointments,
  useReportPatients,
  useReportRevenue,
  useReportScreenings,
  useReportSummary,
  useReportVetWorkload,
} from '../hooks/useReports'
import type {
  AppointmentsReport,
  PatientsReport,
  ReportRevenue,
  ReportSummary,
  ScreeningsReport,
  VetWorkloadReport,
} from '../types/reports.types'
import { ClinicAdminReportsPage } from './ReportsPage'

vi.mock('../hooks/useReports', () => ({
  useReportAppointments: vi.fn(),
  useReportPatients: vi.fn(),
  useReportRevenue: vi.fn(),
  useReportScreenings: vi.fn(),
  useReportSummary: vi.fn(),
  useReportVetWorkload: vi.fn(),
}))
vi.mock('../../../clinic-profile/hooks/useClinicSettings', () => ({
  useClinicSettings: vi.fn(),
}))
vi.mock('../../../clinic-profile/hooks/useClinicProfile', () => ({
  useClinicProfile: vi.fn(),
}))
vi.mock('../../appointments/hooks/useAppointments', () => ({
  useVeterinarians: vi.fn(),
}))

// jsdom has no ResizeObserver; the recharts charts inside the page need it.
beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
})

const TZ = 'Asia/Manila'
const TODAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date())

const SUMMARY: ReportSummary = {
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

const APPOINTMENTS: AppointmentsReport = {
  series: [{ date: TODAY, count: 2 }],
  by_status: [{ status: 'COMPLETED', count: 2 }],
}

const WORKLOAD: VetWorkloadReport = {
  results: [
    {
      vet_id: 'v1',
      vet_name: 'Dr. Reyes',
      total: 5,
      completed: 4,
      no_shows: 1,
      revenue: '300.00',
      avg_per_day: 1.2,
    },
  ],
  days: 8,
}

const SCREENINGS: ScreeningsReport = {
  by_condition: [],
  avg_confidence: 0,
  reviewed: 0,
  pending_review: 0,
  vet_confirmed: 0,
  vet_changed: 0,
}

const PATIENTS: PatientsReport = {
  total: 0,
  by_breed: [],
  by_sex: [],
  age_buckets: [],
}

const REVENUE: ReportRevenue = {
  revenue: '12500.00',
  currency: 'PHP',
  payment_count: 3,
  previous_revenue: '10000.00',
  date_from: TODAY,
  date_to: TODAY,
  series: [{ date: TODAY, amount: '12500.00' }],
}

function okState(data: unknown) {
  return {
    data,
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  }
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ClinicAdminReportsPage />
    </MemoryRouter>,
  )
}

describe('ClinicAdminReportsPage', () => {
  beforeEach(() => {
    vi.mocked(useClinicSettings).mockReturnValue({
      data: { timezone: TZ },
    } as unknown as ReturnType<typeof useClinicSettings>)
    vi.mocked(useClinicProfile).mockReturnValue({
      data: undefined,
      isLoading: false,
    } as unknown as ReturnType<typeof useClinicProfile>)
    vi.mocked(useVeterinarians).mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof useVeterinarians>)

    vi.mocked(useReportSummary).mockReturnValue(
      okState(SUMMARY) as unknown as ReturnType<typeof useReportSummary>,
    )
    vi.mocked(useReportAppointments).mockReturnValue(
      okState(APPOINTMENTS) as unknown as ReturnType<
        typeof useReportAppointments
      >,
    )
    vi.mocked(useReportVetWorkload).mockReturnValue(
      okState(WORKLOAD) as unknown as ReturnType<typeof useReportVetWorkload>,
    )
    vi.mocked(useReportScreenings).mockReturnValue(
      okState(SCREENINGS) as unknown as ReturnType<typeof useReportScreenings>,
    )
    vi.mocked(useReportPatients).mockReturnValue(
      okState(PATIENTS) as unknown as ReturnType<typeof useReportPatients>,
    )
    vi.mocked(useReportRevenue).mockReturnValue(
      okState(REVENUE) as unknown as ReturnType<typeof useReportRevenue>,
    )
  })

  it('defaults to This month and renders the revenue KPI and chart', () => {
    renderPage()

    expect(
      screen.getByRole('button', { name: 'This month' }),
    ).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getAllByText('₱12,500.00').length).toBeGreaterThan(0)
    expect(screen.getAllByText('₱300.00').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Revenue Over Time').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/vs previous \d+ days/).length).toBeGreaterThan(0)

    // The window every query receives is the clinic-local month to date.
    const monthFrom = `${TODAY.slice(0, 7)}-01`
    expect(vi.mocked(useReportSummary).mock.lastCall?.[0]).toMatchObject({
      date_from: monthFrom,
      date_to: TODAY,
    })
    expect(vi.mocked(useReportRevenue).mock.lastCall?.[0]).toMatchObject({
      date_from: monthFrom,
      date_to: TODAY,
    })
  })

  it('links View payments to the exact PAID window of the chart', () => {
    renderPage()

    const monthFrom = `${TODAY.slice(0, 7)}-01`
    const href = `/clinic/payments?paid_from=${monthFrom}&paid_to=${TODAY}&status=PAID`
    const links = screen.getAllByRole('link', { name: 'View payments' })
    expect(links.length).toBeGreaterThan(0)
    for (const link of links) {
      expect(link).toHaveAttribute('href', href)
    }
  })

  it('narrows every query to a single clinic-local day for Today', async () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Today' }))

    await waitFor(() => {
      expect(vi.mocked(useReportSummary).mock.lastCall?.[0]).toMatchObject({
        date_from: TODAY,
        date_to: TODAY,
      })
      expect(vi.mocked(useReportRevenue).mock.lastCall?.[0]).toMatchObject({
        date_from: TODAY,
        date_to: TODAY,
      })
    })

    expect(
      screen.getByRole('button', { name: 'Today' }),
    ).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getAllByText('vs yesterday').length).toBeGreaterThan(0)

    const href = `/clinic/payments?paid_from=${TODAY}&paid_to=${TODAY}&status=PAID`
    for (const link of screen.getAllByRole('link', {
      name: 'View payments',
    })) {
      expect(link).toHaveAttribute('href', href)
    }
  })

  it('resolves This year as year-to-date from Jan 1', async () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'This year' }))

    await waitFor(() => {
      expect(vi.mocked(useReportSummary).mock.lastCall?.[0]).toMatchObject({
        date_from: `${TODAY.slice(0, 4)}-01-01`,
        date_to: TODAY,
      })
    })
    // The baseline is the equal-length window, so the wording counts days.
    expect(screen.getAllByText(/vs previous \d+ days/).length).toBeGreaterThan(0)
  })

  it('keeps the visible range when Custom is picked, then tracks edits', () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Custom' }))

    // Custom without edits carries the current This-month window.
    expect(vi.mocked(useReportSummary).mock.lastCall?.[0]).toMatchObject({
      date_from: `${TODAY.slice(0, 7)}-01`,
      date_to: TODAY,
    })

    fireEvent.change(screen.getByLabelText('Report from date'), {
      target: { value: '2026-01-05' },
    })

    expect(vi.mocked(useReportSummary).mock.lastCall?.[0]).toMatchObject({
      date_from: '2026-01-05',
      date_to: TODAY,
    })
    expect(screen.getAllByText(/vs previous \d+ days/).length).toBeGreaterThan(0)
  })
})

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  useVetReportAppointments,
  useVetReportSummary,
} from '../hooks/useVetAnalytics'
import type {
  VetAppointmentsReport,
  VetReportSummary,
} from '../types/analytics.types'
import { VetAnalyticsPage } from './AnalyticsPage'

vi.mock('../hooks/useVetAnalytics', () => ({
  useVetReportAppointments: vi.fn(),
  useVetReportSummary: vi.fn(),
}))

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
const MONTH_END = `${TODAY.slice(0, 7)}-${String(
  new Date(
    Number(TODAY.slice(0, 4)),
    Number(TODAY.slice(5, 7)),
    0,
  ).getDate(),
).padStart(2, '0')}`

const SUMMARY: VetReportSummary = {
  total_appointments: 8,
  completion_rate: 75,
  no_show_rate: 12.5,
  cancellation_rate: 12.5,
  previous: {
    total_appointments: 4,
    completion_rate: 50,
    no_show_rate: 25,
    cancellation_rate: 25,
  },
}

const APPOINTMENTS: VetAppointmentsReport = {
  series: [{ date: TODAY, count: 3 }],
  by_status: [{ status: 'COMPLETED', count: 3 }],
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
      <VetAnalyticsPage />
    </MemoryRouter>,
  )
}

describe('VetAnalyticsPage', () => {
  beforeEach(() => {
    vi.mocked(useVetReportSummary).mockReturnValue(
      okState(SUMMARY) as unknown as ReturnType<typeof useVetReportSummary>,
    )
    vi.mocked(useVetReportAppointments).mockReturnValue(
      okState(APPOINTMENTS) as unknown as ReturnType<
        typeof useVetReportAppointments
      >,
    )
  })

  it('defaults to a full-calendar-month This month and renders only appointment metrics', () => {
    renderPage()

    expect(
      screen.getByRole('button', { name: 'This month' }),
    ).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Total Appointments')).toBeInTheDocument()
    expect(screen.getByText('Completion Rate')).toBeInTheDocument()
    expect(screen.getByText('No-Show Rate')).toBeInTheDocument()
    expect(screen.getByText('Cancellation Rate')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
    expect(screen.getByText('75%')).toBeInTheDocument()
    expect(screen.queryByText('+100%')).not.toBeInTheDocument()
    expect(screen.queryByText('+25')).not.toBeInTheDocument()
    expect(screen.queryByText('-12.5')).not.toBeInTheDocument()
    expect(
      screen.queryByText('of elapsed, non-cancelled visits'),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText('of all appointments'),
    ).not.toBeInTheDocument()
    expect(screen.getByText('Appointments Over Time')).toBeInTheDocument()
    expect(screen.getByText('Status Breakdown')).toBeInTheDocument()
    expect(
      screen.queryByLabelText('Filter by veterinarian'),
    ).not.toBeInTheDocument()
    expect(
      screen.getByText(/Only appointments assigned to you/),
    ).toBeInTheDocument()
    expect(
      screen.queryByText(/vs previous \d+ days/),
    ).not.toBeInTheDocument()

    const monthFrom = `${TODAY.slice(0, 7)}-01`
    expect(vi.mocked(useVetReportSummary).mock.lastCall?.[0]).toMatchObject({
      date_from: monthFrom,
      date_to: MONTH_END,
    })
    expect(
      vi.mocked(useVetReportAppointments).mock.lastCall?.[0],
    ).toMatchObject({
      date_from: monthFrom,
      date_to: MONTH_END,
    })
  })

  it('narrows both queries to one clinic-local day for Today', async () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Today' }))

    await waitFor(() => {
      expect(vi.mocked(useVetReportSummary).mock.lastCall?.[0]).toMatchObject({
        date_from: TODAY,
        date_to: TODAY,
      })
      expect(
        vi.mocked(useVetReportAppointments).mock.lastCall?.[0],
      ).toMatchObject({
        date_from: TODAY,
        date_to: TODAY,
      })
    })

    expect(screen.queryByText('vs yesterday')).not.toBeInTheDocument()
  })

  it('clears back to the full-month preset', async () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Today' }))
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))

    await waitFor(() => {
      expect(vi.mocked(useVetReportSummary).mock.lastCall?.[0]).toMatchObject({
        date_from: `${TODAY.slice(0, 7)}-01`,
        date_to: MONTH_END,
      })
    })
    expect(
      screen.getByRole('button', { name: 'This month' }),
    ).toHaveAttribute('aria-pressed', 'true')
  })

  it('switches to Custom when a date input changes', () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Custom' }))
    fireEvent.change(screen.getByLabelText('Report from date'), {
      target: { value: '2026-01-05' },
    })

    expect(
      screen.getByRole('button', { name: 'Custom' }),
    ).toHaveAttribute('aria-pressed', 'true')
    expect(vi.mocked(useVetReportSummary).mock.lastCall?.[0]).toMatchObject({
      date_from: '2026-01-05',
      date_to: MONTH_END,
    })
  })

  it('shows a retry panel when the summary fails', () => {
    const refetch = vi.fn()
    vi.mocked(useVetReportSummary).mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      error: new Error('Summary unavailable'),
      refetch,
    } as unknown as ReturnType<typeof useVetReportSummary>)

    renderPage()

    expect(screen.getByText('Failed to load key metrics')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(refetch).toHaveBeenCalledTimes(1)
  })
})

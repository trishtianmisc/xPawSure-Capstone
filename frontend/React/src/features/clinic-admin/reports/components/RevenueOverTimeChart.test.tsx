import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeAll, describe, expect, it } from 'vitest'

import type { RevenueSeriesPoint } from '../types/reports.types'
import { RevenueOverTimeChart } from './RevenueOverTimeChart'

// jsdom has no ResizeObserver; the recharts container needs it.
beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
})

const PAYMENTS_HREF =
  '/clinic/payments?paid_from=2026-10-01&paid_to=2026-10-03&status=PAID'

const DAILY: RevenueSeriesPoint[] = [
  { date: '2026-10-01', amount: '5000.00' },
  { date: '2026-10-02', amount: '0.00' },
  { date: '2026-10-03', amount: '12500.00' },
]

const MONTHLY: RevenueSeriesPoint[] = [
  { date: '2026-09', amount: '9000.00' },
  { date: '2026-10', amount: '12500.00' },
]

function renderChart(series: RevenueSeriesPoint[]) {
  return render(
    <MemoryRouter>
      <RevenueOverTimeChart series={series} paymentsHref={PAYMENTS_HREF} />
    </MemoryRouter>,
  )
}

describe('RevenueOverTimeChart', () => {
  it('renders the heading, daily subtitle, and payments deep link', () => {
    renderChart(DAILY)

    expect(screen.getByText('Revenue Over Time')).toBeInTheDocument()
    expect(screen.getByText('Daily paid revenue')).toBeInTheDocument()
    const link = screen.getByRole('link', { name: 'View payments' })
    expect(link).toHaveAttribute('href', PAYMENTS_HREF)
  })

  it('labels the subtitle monthly for month-keyed series', () => {
    renderChart(MONTHLY)

    expect(screen.getByText('Monthly paid revenue')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View payments' })).toHaveAttribute(
      'href',
      PAYMENTS_HREF,
    )
  })

  it('shows an empty state instead of an axis when every bucket is zero', () => {
    renderChart([
      { date: '2026-10-01', amount: '0.00' },
      { date: '2026-10-02', amount: '0.00' },
    ])

    expect(
      screen.getByText('No payments in this date range.'),
    ).toBeInTheDocument()
    // The deep link still works: the admin can open the (empty) payments list.
    expect(screen.getByRole('link', { name: 'View payments' })).toHaveAttribute(
      'href',
      PAYMENTS_HREF,
    )
  })
})

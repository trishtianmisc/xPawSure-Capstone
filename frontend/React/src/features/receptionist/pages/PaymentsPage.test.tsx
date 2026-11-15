import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { formatPeso } from '../../../utils/currency'
import { useAuth } from '../../auth/context/AuthContext'
import { usePayments } from '../../payments/hooks/usePayments'
import { useClinicSettings } from '../hooks/useClinicSettings'
import { PaymentsPage } from './PaymentsPage'

vi.mock('../../auth/context/AuthContext', () => ({
  useAuth: vi.fn(),
}))
vi.mock('../../payments/hooks/usePayments', () => ({
  usePayments: vi.fn(),
}))
vi.mock('../hooks/useClinicSettings', () => ({
  useClinicSettings: vi.fn(),
}))

// The window the SERVER applied (clinic-local day), echoed back so the page
// renders its date line from the response - never from the client clock.
const PAID_FROM = '2026-11-14'

function paymentsState() {
  return {
    data: {
      total: 2,
      page: 1,
      page_size: 20,
      total_pages: 1,
      paid_from: PAID_FROM,
      paid_to: PAID_FROM,
      summary: {
        paid_total: '1250.00',
        pending_total: '0.00',
        refunded_total: '0.00',
        payment_count: 2,
      },
      results: [],
    },
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  }
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/receptionist/payments']}>
      <PaymentsPage />
    </MemoryRouter>,
  )
}

describe('PaymentsPage (receptionist)', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
    } as unknown as ReturnType<typeof useAuth>)
    vi.mocked(useClinicSettings).mockReturnValue({
      data: { timezone: 'Asia/Manila' },
    } as unknown as ReturnType<typeof useClinicSettings>)
    vi.mocked(usePayments).mockReturnValue(
      paymentsState() as unknown as ReturnType<typeof usePayments>,
    )
  })

  it('never sends a date parameter; the server owns the window', () => {
    renderPage()

    const params = vi.mocked(usePayments).mock.lastCall?.[0]
    expect(params).toMatchObject({ page: 1, page_size: 20 })
    expect(params).not.toHaveProperty('paid_from')
    expect(params).not.toHaveProperty('paid_to')
    expect(params).not.toHaveProperty('date_from')
    expect(params).not.toHaveProperty('date_to')
  })

  it("shows today's three cards - no Pending card, no date inputs, no export", () => {
    renderPage()

    expect(screen.getByText('Collected today')).toBeInTheDocument()
    expect(screen.getByText(formatPeso('1250.00'))).toBeInTheDocument()
    // Hero title + the Payments card (nothing else says exactly that).
    expect(screen.getAllByText('Payments')).toHaveLength(2)
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('Refunded today')).toBeInTheDocument()
    expect(screen.getByText(formatPeso('0.00'))).toBeInTheDocument()

    expect(screen.queryByText('Pending')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Paid from')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Paid to')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Export CSV' }),
    ).not.toBeInTheDocument()
  })

  it('renders the date line from the server echo, not the client clock', () => {
    renderPage()

    expect(screen.getByText(/Today · Nov 14, 2026/)).toBeInTheDocument()
  })

  it('keeps the status filter flowing into the query', () => {
    renderPage()

    fireEvent.change(screen.getByLabelText('Filter by status'), {
      target: { value: 'PAID' },
    })

    expect(vi.mocked(usePayments).mock.lastCall?.[0]).toMatchObject({
      status: 'PAID',
      page: 1,
    })
  })

  it('states the today-only scope in the page note', () => {
    renderPage()

    expect(
      screen.getByText(/Showing payments paid today/),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Payment history and revenue reports/),
    ).toBeInTheDocument()
  })
})

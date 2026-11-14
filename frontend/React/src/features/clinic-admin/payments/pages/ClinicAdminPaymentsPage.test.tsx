import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useToast } from '../../../../components/ui/ToastContext'
import { formatPeso } from '../../../../utils/currency'
import { useAuth } from '../../../auth/context/AuthContext'
import { useClinicSettings } from '../../../clinic-profile/hooks/useClinicSettings'
import { usePayments } from '../../../payments/hooks/usePayments'
import { ClinicAdminPaymentsPage } from './ClinicAdminPaymentsPage'

vi.mock('../../../payments/hooks/usePayments', () => ({
  usePayments: vi.fn(),
}))
vi.mock('../../../clinic-profile/hooks/useClinicSettings', () => ({
  useClinicSettings: vi.fn(),
}))
vi.mock('../../../auth/context/AuthContext', () => ({
  useAuth: vi.fn(),
}))
vi.mock('../../../../components/ui/ToastContext', () => ({
  useToast: vi.fn(),
}))

// The Reports revenue KPI for the same window; paid_total must reconcile
// with it because both follow the PAID + paid-at rule.
const REVENUE_KPI = '12500.00'

function paymentsState() {
  return {
    data: {
      total: 0,
      page: 1,
      page_size: 20,
      total_pages: 0,
      summary: {
        paid_total: REVENUE_KPI,
        pending_total: '0.00',
        refunded_total: '0.00',
        payment_count: 3,
      },
      results: [],
    },
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  }
}

function renderPage(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ClinicAdminPaymentsPage />
    </MemoryRouter>,
  )
}

describe('ClinicAdminPaymentsPage', () => {
  beforeEach(() => {
    vi.mocked(useClinicSettings).mockReturnValue({
      data: { timezone: 'Asia/Manila' },
    } as unknown as ReturnType<typeof useClinicSettings>)
    vi.mocked(useAuth).mockReturnValue({
      user: null,
    } as unknown as ReturnType<typeof useAuth>)
    vi.mocked(useToast).mockReturnValue({
      showToast: vi.fn(),
    } as unknown as ReturnType<typeof useToast>)
    vi.mocked(usePayments).mockReturnValue(
      paymentsState() as unknown as ReturnType<typeof usePayments>,
    )
  })

  it('applies a deep-linked PAID window and shows the reconciling total', () => {
    renderPage(
      '/clinic/payments?paid_from=2026-10-01&paid_to=2026-10-07&status=PAID',
    )

    expect(vi.mocked(usePayments).mock.lastCall?.[0]).toMatchObject({
      paid_from: '2026-10-01',
      paid_to: '2026-10-07',
      status: 'PAID',
      page: 1,
    })
    expect(screen.getByLabelText('Filter by status')).toHaveValue('PAID')
    expect(screen.getByLabelText('Paid from')).toHaveValue('2026-10-01')
    expect(screen.getByLabelText('Paid to')).toHaveValue('2026-10-07')

    // Same fixed-decimal string the Reports revenue KPI formats.
    expect(screen.getByText(formatPeso(REVENUE_KPI))).toBeInTheDocument()
  })

  it('falls back to unfiltered defaults for an invalid URL', () => {
    renderPage('/clinic/payments?paid_from=banana&paid_to=2026-13-45&status=HACKED')

    expect(vi.mocked(usePayments).mock.lastCall?.[0]).toMatchObject({
      paid_from: undefined,
      paid_to: undefined,
      status: undefined,
    })
    expect(screen.getByLabelText('Filter by status')).toHaveValue('')
    expect(screen.getByLabelText('Paid from')).toHaveValue('')
    expect(screen.getByLabelText('Paid to')).toHaveValue('')
  })

  it('keeps valid params when other params are garbage', () => {
    renderPage(
      '/clinic/payments?paid_from=2026-10-01&paid_to=not-a-date&status=PAID&junk=%3Cscript%3E',
    )

    expect(vi.mocked(usePayments).mock.lastCall?.[0]).toMatchObject({
      paid_from: '2026-10-01',
      paid_to: undefined,
      status: 'PAID',
    })
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  Payment,
  PaymentListResponse,
} from '../../../payments/types/payment.types'

const { listMock, downloadMock } = vi.hoisted(() => ({
  listMock: vi.fn(),
  downloadMock: vi.fn(),
}))

vi.mock('../../../payments/services/payment.service', () => ({
  paymentService: { list: listMock },
}))

vi.mock('../../reports/utils/exportCsv', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../reports/utils/exportCsv')>()
  return {
    ...actual,
    downloadCsv: (filename: string, csv: string) => downloadMock(filename, csv),
  }
})

beforeEach(() => {
  listMock.mockReset()
  downloadMock.mockReset()
})

import {
  MAX_EXPORT_RANGE_DAYS,
  MAX_EXPORT_ROWS,
  PaymentsExportError,
  TOO_MANY_MESSAGE,
  buildPaymentsCsv,
  exportPaymentsCsv,
  formatCsvDateTime,
  paidRangeError,
  paymentsExportFilename,
} from './exportPaymentsCsv'

const ZERO_SUMMARY = {
  paid_total: '0.00',
  pending_total: '0.00',
  refunded_total: '0.00',
  payment_count: 0,
}

function makePayment(overrides: Partial<Payment> = {}): Payment {
  return {
    pay_id: 'pay-1',
    reference_no: 'XPS-1001',
    clinic_id: 'clinic-1',
    owner_id: 'owner-1',
    owner_name: 'Olivia Owner',
    appointment_id: null,
    pet_name: 'Rex',
    amount: 1250,
    currency: 'PHP',
    method: 'CASH',
    status: 'PAID',
    provider: 'CASH',
    checkout_url: null,
    expires_at: null,
    paid_at: '2026-10-31T16:30:00Z',
    failure_reason: null,
    created_at: '2026-10-31T16:00:00Z',
    updated_at: '2026-10-31T16:30:00Z',
    ...overrides,
  }
}

function page(
  results: Payment[],
  total: number,
  pageNumber = 1,
  summary: PaymentListResponse['summary'] = {
    ...ZERO_SUMMARY,
    payment_count: total,
  },
): PaymentListResponse {
  return {
    total,
    page: pageNumber,
    page_size: 100,
    total_pages: Math.max(Math.ceil(total / 100), 1),
    summary,
    results,
  }
}

const INPUT = {
  filters: {},
  clinicName: 'Paw Clinic',
  timeZone: 'Asia/Manila',
}

describe('paidRangeError', () => {
  it('accepts an empty range', () => {
    expect(paidRangeError('', '')).toBeNull()
  })

  it('rejects a reversed range', () => {
    expect(paidRangeError('2026-11-02', '2026-11-01')).toContain(
      'paid_from cannot be after paid_to',
    )
  })

  it('rejects a range longer than the cap', () => {
    expect(paidRangeError('2026-01-01', '2027-01-02')).toContain('366')
    expect(paidRangeError('2026-01-01', '2027-01-01')).toBeNull()
    expect(MAX_EXPORT_RANGE_DAYS).toBe(366)
  })

  it('rejects impossible calendar dates', () => {
    expect(paidRangeError('2026-02-31', '')).toContain('YYYY-MM-DD')
  })
})

describe('formatCsvDateTime', () => {
  it('renders clinic-local time as plain 24-hour text', () => {
    // 16:30 UTC on Oct 31 is 00:30 PHT on Nov 1.
    expect(formatCsvDateTime('2026-10-31T16:30:00Z', 'Asia/Manila')).toBe(
      '2026-11-01 00:30',
    )
  })

  it('renders an empty cell for a missing timestamp', () => {
    expect(formatCsvDateTime(null, 'Asia/Manila')).toBe('')
  })
})

describe('paymentsExportFilename', () => {
  it('embeds the paid range when one is set', () => {
    expect(
      paymentsExportFilename(
        { paid_from: '2026-10-01', paid_to: '2026-10-31' },
        new Date('2026-11-01T12:00:00Z'),
        'Asia/Manila',
      ),
    ).toBe('xpawsure-payments_2026-10-01_2026-10-31.csv')
  })

  it('falls back to the generation day', () => {
    expect(
      paymentsExportFilename({}, new Date('2026-10-31T16:00:00Z'), 'Asia/Manila'),
    ).toBe('xpawsure-payments_2026-11-01.csv')
  })
})

describe('buildPaymentsCsv', () => {
  it('deduplicates payments that shift between pages', async () => {
    const a = makePayment({ pay_id: 'a', reference_no: 'XPS-A' })
    const b = makePayment({ pay_id: 'b', reference_no: 'XPS-B' })
    const c = makePayment({ pay_id: 'c', reference_no: 'XPS-C' })
    listMock
      .mockResolvedValueOnce(page([a, b], 3, 1))
      .mockResolvedValueOnce(page([b, c], 3, 2))

    const result = await buildPaymentsCsv(INPUT)

    expect(listMock).toHaveBeenCalledTimes(2)
    expect(result.rowCount).toBe(3)
    expect(result.csv.split('XPS-B').length - 1).toBe(1)
    expect(result.csv.split('XPS-A').length - 1).toBe(1)
    expect(result.csv.split('XPS-C').length - 1).toBe(1)
  })

  it('refuses to build when the total exceeds the row cap', async () => {
    listMock.mockResolvedValueOnce(page([], MAX_EXPORT_ROWS + 1))

    await expect(buildPaymentsCsv(INPUT)).rejects.toThrow(TOO_MANY_MESSAGE)
    expect(listMock).toHaveBeenCalledTimes(1)
  })

  it('checks the paid range before reading anything', async () => {
    await expect(
      buildPaymentsCsv({
        ...INPUT,
        filters: { paid_from: '2026-01-01', paid_to: '2027-01-02' },
      }),
    ).rejects.toThrow(PaymentsExportError)
    expect(listMock).not.toHaveBeenCalled()
  })

  it('discards everything when a later page fails', async () => {
    listMock
      .mockResolvedValueOnce(
        page(
          [
            makePayment({ pay_id: 'a', reference_no: 'XPS-A' }),
            makePayment({ pay_id: 'b', reference_no: 'XPS-B' }),
          ],
          3,
          1,
        ),
      )
      .mockRejectedValueOnce(new Error('network down'))

    await expect(buildPaymentsCsv(INPUT)).rejects.toThrow('network down')
  })

  it('treats a shortfall after paging as a failed export', async () => {
    listMock
      .mockResolvedValueOnce(page([makePayment()], 3, 1))
      .mockResolvedValueOnce(page([], 3, 2))

    await expect(buildPaymentsCsv(INPUT)).rejects.toThrow(
      'Export was interrupted',
    )
  })

  it('writes plain numeric amounts and carries the server totals block', async () => {
    listMock.mockResolvedValueOnce(
      page(
        [
          makePayment({ pay_id: 'a', amount: 1250 }),
          makePayment({
            pay_id: 'b',
            reference_no: 'XPS-1002',
            amount: 500,
            status: 'REFUNDED',
            paid_at: null,
          }),
        ],
        2,
        1,
        {
          paid_total: '1250.00',
          pending_total: '0.00',
          refunded_total: '500.00',
          payment_count: 2,
        },
      ),
    )

    const result = await buildPaymentsCsv(INPUT)

    expect(result.csv).toContain(',1250.00,')
    expect(result.csv).toContain(',500.00,')
    expect(result.csv).not.toContain('₱')
    expect(result.totalPaid).toBe('1250.00')
    expect(result.csv).toContain('Total paid,1250.00')
    expect(result.csv).toContain('Pending total,0.00')
    expect(result.csv).toContain('Refunded total,500.00')
    expect(result.csv).toContain('Payments,2')
  })

  it('takes the totals from the server summary, not the exported rows', async () => {
    // Rows sum to 1,750 but the server reports the true window totals: the
    // file must carry the server figures so it reconciles with the strip.
    listMock.mockResolvedValueOnce(
      page(
        [
          makePayment({ pay_id: 'a', amount: 1250 }),
          makePayment({ pay_id: 'b', reference_no: 'XPS-1002', amount: 500 }),
        ],
        2,
        1,
        {
          paid_total: '18500.00',
          pending_total: '2300.00',
          refunded_total: '500.00',
          payment_count: 2,
        },
      ),
    )

    const result = await buildPaymentsCsv(INPUT)

    expect(result.csv).toContain('Total paid,18500.00')
    expect(result.csv).toContain('Pending total,2300.00')
    expect(result.csv).toContain('Refunded total,500.00')
    expect(result.csv).toContain('Payments,2')
    expect(result.totalPaid).toBe('18500.00')
  })

  it('neutralizes formula-leading owner names', async () => {
    listMock.mockResolvedValueOnce(
      page([makePayment({ owner_name: '=SUM(A1:A9)' })], 1),
    )

    const result = await buildPaymentsCsv(INPUT)

    expect(result.csv).toContain("'=SUM(A1:A9)")
  })

  it('renders paid timestamps in clinic-local plain text', async () => {
    listMock.mockResolvedValueOnce(page([makePayment()], 1))

    const result = await buildPaymentsCsv(INPUT)

    expect(result.csv).toContain('2026-11-01 00:30')
    expect(result.csv).not.toContain('T16:30:00')
    expect(result.csv).not.toContain('Z,')
  })

  it('includes the clinic header block and filter echo', async () => {
    listMock.mockResolvedValueOnce(page([makePayment()], 1))

    const result = await buildPaymentsCsv({
      ...INPUT,
      filters: { status: 'PAID', paid_from: '2026-11-01', paid_to: '2026-11-01' },
    })

    expect(result.csv).toContain('Clinic,Paw Clinic')
    expect(result.csv).toContain('Status,PAID')
    expect(result.csv).toContain('Paid from,2026-11-01')
    expect(result.csv).toContain('Paid to,2026-11-01')
    expect(result.csv).toContain('Generated,')
  })
})

describe('exportPaymentsCsv', () => {
  it('downloads a fully built file on success', async () => {
    listMock.mockResolvedValueOnce(page([makePayment()], 1))

    const result = await exportPaymentsCsv(INPUT)

    expect(downloadMock).toHaveBeenCalledTimes(1)
    expect(downloadMock.mock.calls[0][0]).toBe(
      paymentsExportFilename({}, new Date(), 'Asia/Manila'),
    )
    expect(downloadMock.mock.calls[0][1]).toBe(result.csv)
  })

  it('downloads nothing when paging fails', async () => {
    listMock
      .mockResolvedValueOnce(page([makePayment()], 2, 1))
      .mockRejectedValueOnce(new Error('network down'))

    await expect(exportPaymentsCsv(INPUT)).rejects.toThrow('network down')
    expect(downloadMock).not.toHaveBeenCalled()
  })

  it('downloads nothing when the row cap is exceeded', async () => {
    listMock.mockResolvedValueOnce(page([], MAX_EXPORT_ROWS + 1))

    await expect(exportPaymentsCsv(INPUT)).rejects.toThrow(TOO_MANY_MESSAGE)
    expect(downloadMock).not.toHaveBeenCalled()
  })
})

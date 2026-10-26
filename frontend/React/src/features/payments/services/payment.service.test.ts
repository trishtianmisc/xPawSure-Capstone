import http from '../../../services/http'
import { paymentService } from './payment.service'

vi.mock('../../../services/http')

describe('paymentService', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('checkout posts the booking context', async () => {
    const payment = { pay_id: 'p1', status: 'PENDING' }
    vi.mocked(http.post).mockResolvedValue({ data: payment })

    const result = await paymentService.checkout({
      pet_id: 'pet-1',
      slot_id: 'slot-1',
      apt_type: 'CONSULTATION',
      method: 'GCASH',
      reason: 'Itchy skin',
    })

    expect(http.post).toHaveBeenCalledWith('/payments/checkout/', {
      pet_id: 'pet-1',
      slot_id: 'slot-1',
      apt_type: 'CONSULTATION',
      method: 'GCASH',
      reason: 'Itchy skin',
    })
    expect(result).toEqual(payment)
  })

  it('get fetches a single payment by id', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: { pay_id: 'p1' } })

    const result = await paymentService.get('p1')

    expect(http.get).toHaveBeenCalledWith('/payments/p1/')
    expect(result).toEqual({ pay_id: 'p1' })
  })

  it('list forwards filters as query params', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: { total: 0, results: [] } })

    await paymentService.list({ status: 'PAID', method: 'CASH', appointment: 'apt-1' })

    expect(http.get).toHaveBeenCalledWith('/payments/', {
      params: { status: 'PAID', method: 'CASH', appointment: 'apt-1' },
    })
  })

  it('cancel posts to the cancel endpoint', async () => {
    vi.mocked(http.post).mockResolvedValue({ data: { pay_id: 'p1', status: 'VOID' } })

    const result = await paymentService.cancel('p1')

    expect(http.post).toHaveBeenCalledWith('/payments/p1/cancel/', {})
    expect(result.status).toBe('VOID')
  })

  it('getMockStatus sends the signed token as a query param', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: { pay_id: 'p1', status: 'PENDING' } })

    await paymentService.getMockStatus('XPS-20261026-ABCDEF', 'signed-token')

    expect(http.get).toHaveBeenCalledWith('/payments/mock/XPS-20261026-ABCDEF/', {
      params: { token: 'signed-token' },
    })
  })

  it('confirmMock posts token and outcome', async () => {
    vi.mocked(http.post).mockResolvedValue({ data: { pay_id: 'p1', status: 'PAID' } })

    const result = await paymentService.confirmMock('XPS-20261026-ABCDEF', 'signed-token', 'success')

    expect(http.post).toHaveBeenCalledWith('/payments/mock/XPS-20261026-ABCDEF/confirm/', {
      token: 'signed-token',
      outcome: 'success',
    })
    expect(result.status).toBe('PAID')
  })
})

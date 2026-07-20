import http from '../../../../services/http'
import { clinicService } from './clinic.service'

vi.mock('../../../../services/http')

describe('clinicService', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('create sends POST with payload', async () => {
    const mockResponse = { data: { id: '1', name: 'Test Clinic', email: 'test@test.com' } }
    vi.mocked(http.post).mockResolvedValue(mockResponse)

    const result = await clinicService.create({ name: 'Test Clinic', email: 'test@test.com' })

    expect(http.post).toHaveBeenCalledWith('/clinics/', { name: 'Test Clinic', email: 'test@test.com' })
    expect(result).toEqual(mockResponse.data)
  })

  it('list builds query string from params', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: { total: 0, results: [] } })

    await clinicService.list({ search: 'paws', status: 'ACTIVE', page: 2, page_size: 10 })

    const calledUrl = vi.mocked(http.get).mock.calls[0][0]
    expect(calledUrl).toContain('search=paws')
    expect(calledUrl).toContain('status=ACTIVE')
    expect(calledUrl).toContain('page=2')
    expect(calledUrl).toContain('page_size=10')
  })
})

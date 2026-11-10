import http from '../../../../services/http'
import { analyticsService } from './analytics.service'

vi.mock('../../../../services/http')

describe('analyticsService', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('getOverview GETs the platform analytics endpoint', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: { clinics: { total: 3 } } })

    const result = await analyticsService.getOverview()

    expect(http.get).toHaveBeenCalledWith('/super-admin/analytics/overview/')
    expect(result.clinics.total).toBe(3)
  })

  it('getClinicOverview GETs the per-clinic overview endpoint', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: { clinic_id: 'c1' } })

    await analyticsService.getClinicOverview('c1')

    expect(http.get).toHaveBeenCalledWith('/super-admin/clinics/c1/overview/')
  })
})

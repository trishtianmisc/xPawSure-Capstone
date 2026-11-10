import http from '../../../../services/http'
import { vaccinationService } from './vaccination.service'

vi.mock('../../../../services/http')

describe('vaccinationService', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('list builds query string from params', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: { total: 0, results: [] } })

    await vaccinationService.list({
      clinic_id: 'c1',
      search: 'rabies',
      date_from: '2026-01-01',
      date_to: '2026-06-30',
      page: 3,
      page_size: 50,
    })

    const calledUrl = vi.mocked(http.get).mock.calls[0][0]
    expect(calledUrl).toContain('/super-admin/vaccinations/')
    expect(calledUrl).toContain('clinic_id=c1')
    expect(calledUrl).toContain('search=rabies')
    expect(calledUrl).toContain('date_from=2026-01-01')
    expect(calledUrl).toContain('date_to=2026-06-30')
    expect(calledUrl).toContain('page=3')
    expect(calledUrl).toContain('page_size=50')
  })

  it('list omits optional params when unset', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: { total: 0, results: [] } })

    await vaccinationService.list()

    expect(vi.mocked(http.get).mock.calls[0][0]).toBe('/super-admin/vaccinations/')
  })

  it('is read-only — service exposes only a list method', () => {
    expect(Object.keys(vaccinationService)).toEqual(['list'])
  })
})

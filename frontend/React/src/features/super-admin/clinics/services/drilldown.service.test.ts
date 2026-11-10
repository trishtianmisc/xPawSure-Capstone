import http from '../../../../services/http'
import { drilldownService } from './drilldown.service'

vi.mock('../../../../services/http')

describe('drilldownService', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('listStaff GETs the clinic staff endpoint with query params', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: { total: 0, results: [] } })

    await drilldownService.listStaff('c1', { search: 'vet', role: 'VETERINARIAN', page: 2 })

    const calledUrl = vi.mocked(http.get).mock.calls[0][0]
    expect(calledUrl).toContain('/super-admin/clinics/c1/staff/')
    expect(calledUrl).toContain('search=vet')
    expect(calledUrl).toContain('role=VETERINARIAN')
    expect(calledUrl).toContain('page=2')
  })

  it('listOwners GETs the clinic owners endpoint', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: { total: 0, results: [] } })

    await drilldownService.listOwners('c1')

    expect(http.get).toHaveBeenCalledWith('/super-admin/clinics/c1/owners/')
  })

  it('listPets GETs the clinic pets endpoint', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: { total: 0, results: [] } })

    await drilldownService.listPets('c1', { search: 'buddy' })

    expect(http.get).toHaveBeenCalledWith('/super-admin/clinics/c1/pets/?search=buddy')
  })

  it('listAppointments GETs the clinic appointments endpoint with status filter', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: { total: 0, results: [] } })

    await drilldownService.listAppointments('c1', { status: 'COMPLETED' })

    expect(http.get).toHaveBeenCalledWith('/super-admin/clinics/c1/appointments/?status=COMPLETED')
  })
})

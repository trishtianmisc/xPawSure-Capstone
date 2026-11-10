import http from '../../../../services/http'
import { ownerService } from './owner.service'

vi.mock('../../../../services/http')

describe('ownerService', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('list builds query string from params', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: { total: 0, results: [] } })

    await ownerService.list({ clinic_id: 'c1', search: 'ana', page: 2, page_size: 10 })

    const calledUrl = vi.mocked(http.get).mock.calls[0][0]
    expect(calledUrl).toContain('/super-admin/owners/')
    expect(calledUrl).toContain('clinic_id=c1')
    expect(calledUrl).toContain('search=ana')
    expect(calledUrl).toContain('page=2')
    expect(calledUrl).toContain('page_size=10')
  })

  it('list omits optional params when unset', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: { total: 0, results: [] } })

    await ownerService.list()

    expect(vi.mocked(http.get).mock.calls[0][0]).toBe('/super-admin/owners/')
  })

  it('get GETs the owner detail endpoint', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: { id: 'o1' } })

    const result = await ownerService.get('o1')

    expect(vi.mocked(http.get).mock.calls[0][0]).toBe('/super-admin/owners/o1/')
    expect(result).toEqual({ id: 'o1' })
  })

  it('updateContact PUTs the contact payload to the detail endpoint', async () => {
    vi.mocked(http.put).mockResolvedValue({ data: { id: 'o1', phone: '09171234567' } })

    const payload = { first_name: 'Ana', last_name: 'Cruz', phone: '09171234567', address: 'Manila' }
    const result = await ownerService.updateContact('o1', payload)

    expect(vi.mocked(http.put).mock.calls[0][0]).toBe('/super-admin/owners/o1/')
    expect(vi.mocked(http.put).mock.calls[0][1]).toEqual(payload)
    expect(result).toEqual({ id: 'o1', phone: '09171234567' })
  })
})

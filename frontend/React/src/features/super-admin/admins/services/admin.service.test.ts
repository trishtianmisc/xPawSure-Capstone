import http from '../../../../services/http'
import { adminService } from './admin.service'

vi.mock('../../../../services/http')

describe('adminService', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('list builds query string from params', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: { total: 0, results: [] } })

    await adminService.list({ clinic_id: 'c1', search: 'admin', status: 'ACTIVE', page: 2, page_size: 10 })

    const calledUrl = vi.mocked(http.get).mock.calls[0][0]
    expect(calledUrl).toContain('/super-admin/admins/')
    expect(calledUrl).toContain('clinic_id=c1')
    expect(calledUrl).toContain('search=admin')
    expect(calledUrl).toContain('status=ACTIVE')
    expect(calledUrl).toContain('page=2')
    expect(calledUrl).toContain('page_size=10')
  })

  it('listForClinic GETs the clinic admins endpoint', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: [{ id: 'a1' }] })

    const result = await adminService.listForClinic('c1')

    expect(http.get).toHaveBeenCalledWith('/super-admin/clinics/c1/admins/')
    expect(result).toEqual([{ id: 'a1' }])
  })

  it('create POSTs payload to the clinic admins endpoint', async () => {
    vi.mocked(http.post).mockResolvedValue({ data: { user_id: 'u1', temp_password: 'x' } })

    const payload = { email: 'a@b.com', first_name: 'A', last_name: 'B' }
    const result = await adminService.create('c1', payload)

    expect(http.post).toHaveBeenCalledWith('/super-admin/clinics/c1/admins/', payload)
    expect(result.temp_password).toBe('x')
  })

  it('resendCredentials POSTs to the resend-credentials action', async () => {
    vi.mocked(http.post).mockResolvedValue({ data: { email_sent: true } })

    await adminService.resendCredentials('u1')

    expect(http.post).toHaveBeenCalledWith('/super-admin/admins/u1/resend-credentials/')
  })

  it('deactivate POSTs to the deactivate action', async () => {
    vi.mocked(http.post).mockResolvedValue({ data: { is_active: false } })

    await adminService.deactivate('u1')

    expect(http.post).toHaveBeenCalledWith('/super-admin/admins/u1/deactivate/')
  })

  it('activate POSTs to the activate action', async () => {
    vi.mocked(http.post).mockResolvedValue({ data: { is_active: true } })

    await adminService.activate('u1')

    expect(http.post).toHaveBeenCalledWith('/super-admin/admins/u1/activate/')
  })
})

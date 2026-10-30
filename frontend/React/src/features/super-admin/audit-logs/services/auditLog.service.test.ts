import http from '../../../../services/http'
import { auditLogService } from './auditLog.service'

vi.mock('../../../../services/http')

describe('auditLogService', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('list builds query string from params', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: { total: 0, results: [] } })

    await auditLogService.list({
      clinic_id: 'c1',
      module: 'CLINIC',
      action: 'CREATE',
      search: 'clinic',
      date_from: '2026-01-01',
      date_to: '2026-01-31',
      page: 3,
      page_size: 25,
    })

    const calledUrl = vi.mocked(http.get).mock.calls[0][0]
    expect(calledUrl).toContain('/super-admin/audit-logs/')
    expect(calledUrl).toContain('clinic_id=c1')
    expect(calledUrl).toContain('module=CLINIC')
    expect(calledUrl).toContain('action=CREATE')
    expect(calledUrl).toContain('search=clinic')
    expect(calledUrl).toContain('date_from=2026-01-01')
    expect(calledUrl).toContain('date_to=2026-01-31')
    expect(calledUrl).toContain('page=3')
    expect(calledUrl).toContain('page_size=25')
  })

  it('list with no params calls the bare endpoint', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: { total: 0, results: [] } })

    await auditLogService.list()

    expect(http.get).toHaveBeenCalledWith('/super-admin/audit-logs/')
  })
})

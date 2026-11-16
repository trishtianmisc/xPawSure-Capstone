import http from '../../../../services/http'
import { reportService } from './report.service'

vi.mock('../../../../services/http')

describe('reportService', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('getAccuracy builds query string from params', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: { summary: {} } })

    await reportService.getAccuracy({
      clinic_id: 'c1',
      model_version: '2.0.0',
      date_from: '2026-01-01',
      date_to: '2026-06-30',
    })

    const calledUrl = vi.mocked(http.get).mock.calls[0][0]
    expect(calledUrl).toContain('/super-admin/analytics/accuracy/')
    expect(calledUrl).toContain('clinic_id=c1')
    expect(calledUrl).toContain('model_version=2.0.0')
    expect(calledUrl).toContain('date_from=2026-01-01')
    expect(calledUrl).toContain('date_to=2026-06-30')
  })

  it('getAccuracy omits optional params when unset', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: { summary: {} } })

    await reportService.getAccuracy()

    expect(vi.mocked(http.get).mock.calls[0][0]).toBe('/super-admin/analytics/accuracy/')
  })

  it('getDiseases builds query string from params', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: { totals: {} } })

    await reportService.getDiseases({ clinic_id: 'c1', date_from: '2026-01-01' })

    const calledUrl = vi.mocked(http.get).mock.calls[0][0]
    expect(calledUrl).toContain('/super-admin/analytics/diseases/')
    expect(calledUrl).toContain('clinic_id=c1')
    expect(calledUrl).toContain('date_from=2026-01-01')
  })

  it('getDiseases omits optional params when unset', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: { totals: {} } })

    await reportService.getDiseases()

    expect(vi.mocked(http.get).mock.calls[0][0]).toBe('/super-admin/analytics/diseases/')
  })

  it('getConsultationOutcomes builds the filtered query string', async () => {
    vi.mocked(http.get).mockResolvedValue({ data: { results: [] } })

    await reportService.getConsultationOutcomes({
      clinic_id: 'c1',
      disease_code: 'MANGE',
      outcome: 'not_matched',
      date_from: '2026-01-01',
      page: 2,
    })

    const calledUrl = vi.mocked(http.get).mock.calls[0][0]
    expect(calledUrl).toContain('/super-admin/analytics/consultation-outcomes/')
    expect(calledUrl).toContain('clinic_id=c1')
    expect(calledUrl).toContain('disease_code=MANGE')
    expect(calledUrl).toContain('outcome=not_matched')
    expect(calledUrl).toContain('date_from=2026-01-01')
    expect(calledUrl).toContain('page=2')
  })

  it('downloadConsultationOutcomes requests a ZIP with disease and outcome filters', async () => {
    const blob = new Blob(['zip'])
    vi.mocked(http.post).mockResolvedValue({ data: blob })

    const result = await reportService.downloadConsultationOutcomes({
      disease_code: 'MANGE',
      outcome: 'matched',
    })

    expect(http.post).toHaveBeenCalledWith(
      '/super-admin/analytics/consultation-outcomes/',
      null,
      { params: { disease_code: 'MANGE', outcome: 'matched' }, responseType: 'blob' },
    )
    expect(result).toBe(blob)
  })
})

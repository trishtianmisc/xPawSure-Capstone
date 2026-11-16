import { formatReportDate, formatReportMonth } from './dateFormat'

describe('report date formatting', () => {
  it('formats selected dates as readable month-day-year text', () => {
    expect(formatReportDate('2026-12-10')).toBe('December 10, 2026')
  })

  it('formats monthly trend values with the month name and year', () => {
    expect(formatReportMonth('2026-12')).toBe('December 2026')
  })

  it('leaves invalid values unchanged', () => {
    expect(formatReportDate('2026-02-30')).toBe('2026-02-30')
    expect(formatReportMonth('2026-13')).toBe('2026-13')
  })
})

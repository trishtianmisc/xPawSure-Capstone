import { describe, expect, it } from 'vitest'

import type { ReportSummary } from '../types/reports.types'
import { summaryCsvRows, summaryFilename, toCsv } from './exportCsv'

const SUMMARY: ReportSummary = {
  total_appointments: 10,
  completion_rate: 33.3,
  no_show_rate: 50,
  cancellation_rate: 40,
  new_patients: 1,
  previous: {
    total_appointments: 4,
    completion_rate: 25,
    no_show_rate: 0,
    cancellation_rate: 0,
    new_patients: 0,
  },
}

const WINDOW = { date_from: '2026-10-19', date_to: '2026-10-26' }

describe('toCsv', () => {
  it('prefixes the output with a UTF-8 BOM', () => {
    expect(toCsv([['a']]).charCodeAt(0)).toBe(0xfeff)
  })

  it('joins cells with commas and rows with CRLF', () => {
    expect(toCsv([['a', 'b'], ['c']])).toBe('\ufeffa,b\r\nc')
  })

  it('quotes cells containing commas, quotes, or newlines', () => {
    const csv = toCsv([['a,b', 'say "hi"', 'line1\nline2']])
    expect(csv).toBe('\ufeff"a,b","say ""hi""","line1\nline2"')
  })

  it('neutralizes formula-leading strings', () => {
    const csv = toCsv([['=SUM(A1:A9)', '+1', '@cmd', '-trace']])
    expect(csv).toBe('\ufeff\'=SUM(A1:A9),\'+1,\'@cmd,\'-trace')
  })

  it('leaves numbers untouched, including negatives', () => {
    expect(toCsv([[1, -5]])).toBe('\ufeff1,-5')
  })
})

describe('summaryFilename', () => {
  it('embeds the window dates', () => {
    expect(summaryFilename(WINDOW)).toBe(
      'xpawsure-report-summary_2026-10-19_2026-10-26.csv',
    )
  })
})

describe('summaryCsvRows', () => {
  const rows = summaryCsvRows(SUMMARY, WINDOW, 'Vera Vet')

  it('includes window metadata', () => {
    expect(rows).toContainEqual(['Date from', '2026-10-19'])
    expect(rows).toContainEqual(['Date to', '2026-10-26'])
    expect(rows).toContainEqual(['Period length (days)', 8])
    expect(rows).toContainEqual(['Veterinarian', 'Vera Vet'])
    expect(rows).toContainEqual([
      'New patients scope',
      'Clinic-wide (all veterinarians)',
    ])
  })

  it('renders rates with plain percent formatting', () => {
    expect(rows).toContainEqual(['Completion rate', '33.3%', '25%'])
    expect(rows).toContainEqual(['No-show rate', '50%', '0%'])
  })

  it('carries current and previous values side by side', () => {
    expect(rows).toContainEqual(['Total appointments', 10, 4])
    expect(rows).toContainEqual(['New patients (all vets)', 1, 0])
  })
})

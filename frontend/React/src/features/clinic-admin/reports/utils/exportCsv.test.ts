import { describe, expect, it } from 'vitest'

import type {
  AppointmentsReport,
  PatientsReport,
  ReportSummary,
  ScreeningsReport,
  VetWorkloadReport,
} from '../types/reports.types'
import { reportCsvRows, reportFilename, toCsv } from './exportCsv'

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

const AGREEMENT = { current: 80, previous: 75 }

const APPOINTMENTS: AppointmentsReport = {
  series: [
    { date: '2026-10-19', count: 2 },
    { date: '2026-10-20', count: 0 },
  ],
  by_status: [
    { status: 'COMPLETED', count: 3 },
    { status: 'NO_SHOW', count: 1 },
  ],
}

const WORKLOAD: VetWorkloadReport = {
  results: [
    {
      vet_id: 'v1',
      vet_name: 'Vera Vet',
      total: 10,
      completed: 3,
      no_shows: 1,
      avg_per_day: 1.2,
    },
  ],
  days: 8,
}

const SCREENINGS: ScreeningsReport = {
  by_condition: [{ disease: 'Parvo', count: 2 }],
  avg_confidence: 42.5,
  reviewed: 3,
  pending_review: 2,
  vet_confirmed: 3,
  vet_changed: 1,
}

const PATIENTS: PatientsReport = {
  total: 3,
  by_breed: [
    { breed: 'Beagle', count: 2 },
    { breed: 'Unknown', count: 1 },
  ],
  by_sex: [
    { sex: 'MALE', count: 2 },
    { sex: 'FEMALE', count: 1 },
  ],
  age_buckets: [
    { bucket: '<1 yr', count: 0 },
    { bucket: '1–6 yrs', count: 2 },
    { bucket: '7+ yrs', count: 1 },
    { bucket: 'Unknown', count: 0 },
  ],
}

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

describe('reportFilename', () => {
  it('embeds the window dates', () => {
    expect(reportFilename(WINDOW)).toBe(
      'xpawsure-report_2026-10-19_2026-10-26.csv',
    )
  })
})

describe('reportCsvRows', () => {
  const rows = reportCsvRows({
    summary: SUMMARY,
    window: WINDOW,
    vetLabel: 'Vera Vet',
    agreement: AGREEMENT,
    appointments: APPOINTMENTS,
    workload: WORKLOAD,
    screenings: SCREENINGS,
    patients: PATIENTS,
  })

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

  it('carries the vet agreement rate for both periods', () => {
    expect(rows).toContainEqual(['Vet agreement rate', '80%', '75%'])
  })

  it('renders an em dash when agreement was never judged', () => {
    const unjudged = reportCsvRows({
      summary: SUMMARY,
      window: WINDOW,
      vetLabel: 'All veterinarians',
      agreement: { current: null, previous: null },
    })
    expect(unjudged).toContainEqual(['Vet agreement rate', '—', '—'])
  })

  it('includes the status breakdown and daily series', () => {
    expect(rows).toContainEqual(['Status', 'Count'])
    expect(rows).toContainEqual(['COMPLETED', 3])
    expect(rows).toContainEqual(['Date', 'Appointments'])
    expect(rows).toContainEqual(['2026-10-19', 2])
  })

  it('includes workload rows with the open-day denominator', () => {
    expect(rows).toContainEqual([
      'Vera Vet',
      10,
      3,
      1,
      1.2,
    ])
    expect(rows).toContainEqual(['Open days in range', 8])
  })

  it('includes screening breakdowns and stats', () => {
    expect(rows).toContainEqual(['Parvo', 2])
    expect(rows).toContainEqual(['Total screenings', 5])
    expect(rows).toContainEqual(['Avg confidence', '42.5%'])
    expect(rows).toContainEqual(['Vet confirmed', 3])
  })

  it('includes patient demographics marked clinic-wide', () => {
    expect(rows).toContainEqual(['Patient demographics (all vets)'])
    expect(rows).toContainEqual(['Patients seen in range', 3])
    expect(rows).toContainEqual(['Breed', 'Count'])
    expect(rows).toContainEqual(['Beagle', 2])
    expect(rows).toContainEqual(['Sex', 'Count'])
    expect(rows).toContainEqual(['MALE', 2])
    expect(rows).toContainEqual(['Age bucket', 'Count'])
    expect(rows).toContainEqual(['1–6 yrs', 2])
    expect(rows).toContainEqual(['Unknown', 0])
  })

  it('omits sections whose data is not loaded', () => {
    const summaryOnly = reportCsvRows({
      summary: SUMMARY,
      window: WINDOW,
      vetLabel: 'All veterinarians',
      agreement: AGREEMENT,
    })
    expect(summaryOnly).not.toContainEqual(['Status', 'Count'])
    expect(summaryOnly).not.toContainEqual(['Date', 'Appointments'])
    expect(summaryOnly).not.toContainEqual([
      'Veterinarian',
      'Appointments',
      'Completed',
      'No-shows',
      'Avg per open day',
    ])
    expect(summaryOnly).not.toContainEqual(['Disease', 'Count'])
    expect(summaryOnly).not.toContainEqual(['Breed', 'Count'])
  })
})

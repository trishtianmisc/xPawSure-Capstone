import type {
  AppointmentsReport,
  PatientsReport,
  ReportSummary,
  ScreeningsReport,
  VetWorkloadReport,
} from '../types/reports.types'
import { windowDays, type DateWindow } from './dateRanges'

// Cells that start with a formula character are prefixed with an apostrophe
// so spreadsheet apps store them as text instead of evaluating them.
const FORMULA_PREFIX = /^[=+\-@]/

function encodeCell(value: string | number): string {
  const raw = String(value)
  const guarded =
    typeof value === 'string' && FORMULA_PREFIX.test(raw) ? `'${raw}` : raw
  if (/[",\n\r]/.test(guarded)) {
    return `"${guarded.replace(/"/g, '""')}"`
  }
  return guarded
}

export function toCsv(rows: Array<Array<string | number>>): string {
  const body = rows.map((row) => row.map(encodeCell).join(','))
  // BOM so Excel detects UTF-8 instead of mangling en-dashes.
  return '\ufeff' + body.join('\r\n')
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export function reportFilename(window: DateWindow): string {
  return `xpawsure-report_${window.date_from}_${window.date_to}.csv`
}

// Rates are rendered with plain concatenation (never toFixed) so the CSV
// matches the KPI cards exactly.
function pct(value: number): string {
  return `${value}%`
}

function rateCell(value: number | null): string {
  return value === null ? '—' : pct(value)
}

export interface ReportCsvInput {
  summary: ReportSummary
  window: DateWindow
  vetLabel: string
  agreement: { current: number | null; previous: number | null }
  appointments?: AppointmentsReport
  workload?: VetWorkloadReport
  screenings?: ScreeningsReport
  patients?: PatientsReport
}

// One file, one section per report panel, so a single download captures the
// whole page. Sections whose data has not loaded are omitted.
export function reportCsvRows(
  input: ReportCsvInput,
): Array<Array<string | number>> {
  const { summary, window, vetLabel, agreement } = input
  const days = windowDays(window.date_from, window.date_to)

  const rows: Array<Array<string | number>> = [
    ['XpawSure - Report'],
    ['Date from', window.date_from],
    ['Date to', window.date_to],
    ['Period length (days)', days],
    ['Veterinarian', vetLabel],
    ['New patients scope', 'Clinic-wide (all veterinarians)'],
    [],
    ['Key metrics', 'Current period', 'Previous period'],
    ['Total appointments', summary.total_appointments, summary.previous.total_appointments],
    ['Completion rate', pct(summary.completion_rate), pct(summary.previous.completion_rate)],
    ['No-show rate', pct(summary.no_show_rate), pct(summary.previous.no_show_rate)],
    ['New patients (all vets)', summary.new_patients, summary.previous.new_patients],
    ['Vet agreement rate', rateCell(agreement.current), rateCell(agreement.previous)],
  ]

  if (input.appointments) {
    rows.push(
      [],
      ['Status breakdown'],
      ['Status', 'Count'],
      ...input.appointments.by_status.map((row) => [row.status, row.count]),
      [],
      ['Appointments over time'],
      ['Date', 'Appointments'],
      ...input.appointments.series.map((row) => [row.date, row.count]),
    )
  }

  if (input.workload) {
    rows.push(
      [],
      ['Veterinarian workload'],
      ['Veterinarian', 'Appointments', 'Completed', 'No-shows', 'Avg per open day'],
      ...input.workload.results.map((row) => [
        row.vet_name,
        row.total,
        row.completed,
        row.no_shows,
        row.avg_per_day,
      ]),
      ['Open days in range', input.workload.days],
    )
  }

  if (input.screenings) {
    const screenings = input.screenings
    rows.push(
      [],
      ['AI screenings'],
      ['Disease', 'Count'],
      ...screenings.by_condition.map((row) => [row.disease, row.count]),
      [],
      ['Screening stats'],
      ['Total screenings', screenings.reviewed + screenings.pending_review],
      ['Avg confidence', pct(screenings.avg_confidence)],
      ['Reviewed', screenings.reviewed],
      ['Pending review', screenings.pending_review],
      ['Vet confirmed', screenings.vet_confirmed],
      ['Vet changed', screenings.vet_changed],
      ['Vet agreement rate', rateCell(agreement.current)],
    )
  }

  if (input.patients) {
    const patients = input.patients
    rows.push(
      [],
      ['Patient demographics (all vets)'],
      ['Patients seen in range', patients.total],
      [],
      ['Breed', 'Count'],
      ...patients.by_breed.map((row) => [row.breed, row.count]),
      [],
      ['Sex', 'Count'],
      ...patients.by_sex.map((row) => [row.sex, row.count]),
      [],
      ['Age bucket', 'Count'],
      ...patients.age_buckets.map((row) => [row.bucket, row.count]),
    )
  }

  return rows
}

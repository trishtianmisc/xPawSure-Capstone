import type { ReportSummary } from '../types/reports.types'
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

export function summaryFilename(window: DateWindow): string {
  return `xpawsure-report-summary_${window.date_from}_${window.date_to}.csv`
}

// Rates are rendered with plain concatenation (never toFixed) so the CSV
// matches the KPI cards exactly.
function pct(value: number): string {
  return `${value}%`
}

export function summaryCsvRows(
  summary: ReportSummary,
  window: DateWindow,
  vetLabel: string,
): Array<Array<string | number>> {
  const days = windowDays(window.date_from, window.date_to)
  return [
    ['XpawSure - Report Summary'],
    ['Date from', window.date_from],
    ['Date to', window.date_to],
    ['Period length (days)', days],
    ['Veterinarian', vetLabel],
    ['New patients scope', 'Clinic-wide (all veterinarians)'],
    [],
    ['Metric', 'Current period', 'Previous period'],
    ['Total appointments', summary.total_appointments, summary.previous.total_appointments],
    ['Completion rate', pct(summary.completion_rate), pct(summary.previous.completion_rate)],
    ['No-show rate', pct(summary.no_show_rate), pct(summary.previous.no_show_rate)],
    ['Cancellation rate', pct(summary.cancellation_rate), pct(summary.previous.cancellation_rate)],
    ['New patients (all vets)', summary.new_patients, summary.previous.new_patients],
  ]
}

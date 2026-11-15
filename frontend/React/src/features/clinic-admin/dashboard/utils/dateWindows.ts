import { clinicToday } from '../../../../utils/format'
import type { ReportQuery } from '../../reports/types/reports.types'

export function rollingWindowStart(now: Date = clinicToday()): string {
  const from = new Date(now.getFullYear(), now.getMonth() - 11, 1)
  const month = String(from.getMonth() + 1).padStart(2, '0')
  return `${from.getFullYear()}-${month}-01`
}

export function monthStartWindow(now: Date = clinicToday()): ReportQuery {
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return {
    date_from: `${now.getFullYear()}-${month}-01`,
    date_to: `${now.getFullYear()}-${month}-${day}`,
  }
}

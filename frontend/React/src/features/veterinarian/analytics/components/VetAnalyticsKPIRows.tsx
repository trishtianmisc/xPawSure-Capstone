import { KpiCard } from '../../../clinic-admin/reports/components/KpiCard'
import type { VetReportSummary } from '../types/analytics.types'

interface VetAnalyticsKPIRowsProps {
  summary: VetReportSummary
}

export function VetAnalyticsKPIRows({
  summary,
}: VetAnalyticsKPIRowsProps) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-bold text-stone-700 dark:text-stone-300">
        Key Metrics
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total Appointments"
          value={String(summary.total_appointments)}
          showDelta={false}
        />
        <KpiCard
          label="Completion Rate"
          value={`${summary.completion_rate}%`}
          showDelta={false}
        />
        <KpiCard
          label="No-Show Rate"
          value={`${summary.no_show_rate}%`}
          showDelta={false}
        />
        <KpiCard
          label="Cancellation Rate"
          value={`${summary.cancellation_rate}%`}
          showDelta={false}
        />
      </div>
    </div>
  )
}

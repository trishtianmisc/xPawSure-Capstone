import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { Card } from '../../../../components/ui'
import { DashboardLayout } from '../../dashboard/components/DashboardLayout'
import { clinicService } from '../../clinics/services/clinic.service'
import { AccuracyTab } from '../components/AccuracyTab'
import { ConsultationOutcomesTab } from '../components/ConsultationOutcomesTab'
import { DiseasesTab } from '../components/DiseasesTab'
import { formatReportDate } from '../utils/dateFormat'

type TabKey = 'accuracy' | 'diseases' | 'consultations'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'accuracy', label: 'AI Accuracy' },
  { key: 'diseases', label: 'Diseases' },
  { key: 'consultations', label: 'Consultation outcomes' },
]

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('accuracy')
  const [clinicFilter, setClinicFilter] = useState('')
  const [modelVersion, setModelVersion] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const { data: clinics } = useQuery({
    queryKey: ['clinics', { page_size: 100 }],
    queryFn: () => clinicService.list({ page_size: 100 }),
    staleTime: 60_000,
  })

  const params = useMemo(() => ({
    clinic_id: clinicFilter || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  }), [clinicFilter, dateFrom, dateTo])

  const accuracyParams = useMemo(
    () => ({ ...params, model_version: modelVersion || undefined }),
    [params, modelVersion],
  )

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <div className="rounded-md bg-gradient-to-br from-amber-900 to-amber-950 p-7 sm:p-9">
            <h1 className="text-3xl font-bold tracking-tight text-white">Reports</h1>
            <p className="mt-1 text-amber-100/80">
              AI prediction outcomes, consultation diagnoses, and cross-clinic disease distribution.
            </p>
          </div>
        </div>

        <div className="mb-6 flex gap-2 border-b border-stone-200 dark:border-stone-700">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`-mb-px border-b-2 px-4 py-3 text-sm font-semibold transition ${
                activeTab === tab.key
                  ? 'border-amber-600 text-amber-700 dark:border-amber-500 dark:text-amber-400'
                  : 'border-transparent text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200'
              }`}
              type="button"
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <Card padding="md">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <select
              className="rounded-md border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-700 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200 dark:focus:border-amber-500 dark:focus:ring-amber-900/40"
              value={clinicFilter}
              onChange={(e) => setClinicFilter(e.target.value)}
            >
              <option value="">All clinics</option>
              {clinics?.results.map((clinic) => (
                <option key={clinic.id} value={clinic.id}>{clinic.name}</option>
              ))}
            </select>
            {activeTab === 'accuracy' && (
              <input
                className="rounded-md border border-stone-200 bg-white px-4 py-2.5 font-mono text-sm text-stone-700 outline-none transition placeholder:text-stone-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200 dark:placeholder-stone-500 dark:focus:border-amber-500 dark:focus:ring-amber-900/40"
                placeholder="Model version (e.g. 2.0.0)"
                type="text"
                value={modelVersion}
                onChange={(e) => setModelVersion(e.target.value)}
              />
            )}
            <label className="relative flex h-11 items-center rounded-md border border-stone-200 bg-white px-4 text-sm text-stone-700 outline-none transition focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-100 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200 dark:focus-within:border-amber-500 dark:focus-within:ring-amber-900/40">
              <span aria-hidden="true">{dateFrom ? formatReportDate(dateFrom) : 'From date'}</span>
              <input
                aria-label="From date"
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </label>
            <label className="relative flex h-11 items-center rounded-md border border-stone-200 bg-white px-4 text-sm text-stone-700 outline-none transition focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-100 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200 dark:focus-within:border-amber-500 dark:focus-within:ring-amber-900/40">
              <span aria-hidden="true">{dateTo ? formatReportDate(dateTo) : 'To date'}</span>
              <input
                aria-label="To date"
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </label>
          </div>
        </Card>

        <div className="mt-6">
          {activeTab === 'accuracy' ? (
            <AccuracyTab params={accuracyParams} />
          ) : activeTab === 'diseases' ? (
            <DiseasesTab params={params} />
          ) : (
            <ConsultationOutcomesTab params={params} />
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

import { useState } from 'react'

import { Alert, Button, Card } from '../../../../components/ui'
import { apiErrorMessage } from '../../../../utils/error'
import { useConsultationOutcomes } from '../hooks/useReports'
import { reportService } from '../services/report.service'

import type {
  ConsultationOutcome,
  ConsultationOutcomeParams,
  DiseaseReportParams,
} from '../types/report.types'

interface ConsultationOutcomesTabProps {
  params: DiseaseReportParams
}

const DISEASES = [
  { code: 'ALLERGIC_DERMATITIS', label: 'Allergic Dermatitis' },
  { code: 'BACTERIAL', label: 'Bacterial' },
  { code: 'FUNGAL', label: 'Fungal' },
  { code: 'HOTSPOT', label: 'Hotspot' },
  { code: 'MANGE', label: 'Mange' },
  { code: 'OTHER', label: 'Other skin disease' },
]

const OUTCOMES: { key: ConsultationOutcome; label: string }[] = [
  { key: 'matched', label: 'Matched' },
  { key: 'not_matched', label: 'Not matched' },
]

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function ConsultationOutcomesTab({ params }: ConsultationOutcomesTabProps) {
  const [outcome, setOutcome] = useState<ConsultationOutcome>('matched')
  const [diseaseCode, setDiseaseCode] = useState('')
  const [page, setPage] = useState(1)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const query: ConsultationOutcomeParams = {
    ...params,
    outcome,
    disease_code: diseaseCode || undefined,
    page,
    page_size: 20,
  }
  const { data, isLoading, error } = useConsultationOutcomes(query)

  const handleDownload = async () => {
    if (!diseaseCode) return
    setIsDownloading(true)
    setDownloadError(null)
    try {
      const blob = await reportService.downloadConsultationOutcomes({
        ...params,
        outcome,
        disease_code: diseaseCode,
      })
      downloadBlob(blob, `${outcome}_${diseaseCode.toLowerCase()}_consultations.zip`)
    } catch (err) {
      setDownloadError(apiErrorMessage(err))
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="space-y-5">
      <p className="rounded-lg bg-stone-100 px-4 py-3 text-sm text-stone-600 dark:bg-stone-800 dark:text-stone-300">
        AI prediction is compared with the veterinarian’s primary diagnosis. Claude results are not used.
        Includes linked consultations for the five supported classes and other vet diagnoses, with images.
      </p>

      <Card padding="md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-2" role="tablist" aria-label="Consultation outcome">
            {OUTCOMES.map((item) => {
              const disabled = diseaseCode === 'OTHER' && item.key === 'matched'
              return (
              <button
                key={item.key}
                aria-selected={outcome === item.key}
                aria-disabled={disabled}
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${disabled
                  ? 'cursor-not-allowed text-stone-300 dark:text-stone-600'
                  : outcome === item.key
                  ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200'
                  : 'text-stone-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-700'
                }`}
                disabled={disabled}
                onClick={() => {
                  setOutcome(item.key)
                  setPage(1)
                }}
                role="tab"
                type="button"
              >
                {item.label}
              </button>
              )
            })}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="sr-only" htmlFor="outcome-disease">Disease for download</label>
            <select
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
              id="outcome-disease"
              value={diseaseCode}
              onChange={(event) => {
                setDiseaseCode(event.target.value)
                if (event.target.value === 'OTHER') setOutcome('not_matched')
                setPage(1)
              }}
            >
              <option value="">All diseases</option>
              {DISEASES.map((disease) => (
                <option key={disease.code} value={disease.code}>{disease.label}</option>
              ))}
            </select>
            <Button
              disabled={!diseaseCode || isDownloading}
              loading={isDownloading}
              onClick={handleDownload}
              type="button"
            >
              Download disease ZIP
            </Button>
          </div>
        </div>
        <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
          Choose a disease to download its {outcome === 'matched' ? 'matched' : 'not matched'} cases and images.
          Each ZIP includes a CSV manifest. Downloads are limited to 50 images / 50 MB.
        </p>
        {diseaseCode === 'OTHER' && (
          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
            Diagnoses outside the five model classes are grouped as not matched.
          </p>
        )}
      </Card>

      {downloadError && <Alert variant="error">{downloadError}</Alert>}
      {error && <Alert variant="error">{apiErrorMessage(error)}</Alert>}

      <Card padding="md">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-200 border-t-amber-600" />
          </div>
        ) : !data || data.results.length === 0 ? (
          <p className="py-10 text-center text-sm text-stone-500 dark:text-stone-400">
            No {outcome === 'matched' ? 'matched' : 'not matched'} consultation cases found.
          </p>
        ) : (
          <>
            <p className="mb-4 text-sm text-stone-500 dark:text-stone-400">
              {data.total} cases · Page {data.page} of {data.total_pages}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-500 dark:border-stone-700 dark:text-stone-400">
                    <th className="py-3 pr-4 font-semibold">Date / clinic</th>
                    <th className="py-3 pr-4 font-semibold">AI prediction</th>
                    <th className="py-3 pr-4 font-semibold">Vet diagnosis</th>
                    <th className="py-3 pr-4 font-semibold">Veterinarian</th>
                    <th className="py-3 font-semibold">Image</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-700">
                  {data.results.map((row) => (
                    <tr key={row.screening_id}>
                      <td className="py-3 pr-4 text-stone-700 dark:text-stone-300">
                        <div>{new Date(row.consultation_date).toLocaleDateString()}</div>
                        <div className="text-xs text-stone-500">{row.clinic_name}</div>
                      </td>
                      <td className="py-3 pr-4 text-stone-700 dark:text-stone-300">
                        <div>{row.ai_prediction}</div>
                        <div className="text-xs text-stone-500">
                          {row.confidence.toFixed(1)}% · {row.model_version}
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-stone-700 dark:text-stone-300">{row.vet_diagnosis}</td>
                      <td className="py-3 pr-4 text-stone-700 dark:text-stone-300">{row.veterinarian}</td>
                      <td className="py-3">
                        <a href={row.image_url} rel="noreferrer" target="_blank">
                          <img
                            alt={`Screening ${row.screening_id}`}
                            className="h-14 w-14 rounded-md object-cover"
                            loading="lazy"
                            src={row.image_url}
                          />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} variant="secondary">
                Previous
              </Button>
              <Button
                disabled={!data || page >= data.total_pages}
                onClick={() => setPage((value) => value + 1)}
                variant="secondary"
              >
                Next
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}

import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { bulkUploadStaff } from '../services/staff.service'
import type { BulkUploadResponse } from '../types/staff.types'

const MAX_SIZE_BYTES = 2 * 1024 * 1024
const MAX_ROWS = 500

const TEMPLATE_HEADER = 'email,first_name,last_name,phone,role,license_number,license_expiration_date'
const TEMPLATE_ROWS = [
  'vet1@clinic.com,John,Doe,+63 912 345 6789,VETERINARIAN,LIC-001,2027-12-31',
  'rec1@clinic.com,Jane,Smith,+63 912 345 0000,RECEPTIONIST,,',
]

interface BulkUploadModalProps {
  isOpen: boolean
  onClose: () => void
}

export function BulkUploadModal({ isOpen, onClose }: BulkUploadModalProps) {
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<BulkUploadResponse | null>(null)

  if (!isOpen) return null

  const validateFile = (candidate: File): string | null => {
    if (!candidate.name.toLowerCase().endsWith('.csv')) {
      return 'Invalid file type. Only .csv files are allowed.'
    }
    if (candidate.size > MAX_SIZE_BYTES) {
      return 'File is too large. Maximum size is 2 MB.'
    }
    return null
  }

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return
    const candidate = files[0]
    const validationError = validateFile(candidate)
    if (validationError) {
      setError(validationError)
      setFile(null)
      return
    }
    setError(null)
    setFile(candidate)
  }

  const handleUpload = async () => {
    if (!file) return
    setError(null)
    setIsUploading(true)
    try {
      const response = await bulkUploadStaff(file)
      setResult(response)
      queryClient.invalidateQueries({ queryKey: ['staff'] })
      queryClient.invalidateQueries({ queryKey: ['staff-stats'] })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload CSV file.')
    } finally {
      setIsUploading(false)
    }
  }

  const downloadTemplate = () => {
    const content = [TEMPLATE_HEADER, ...TEMPLATE_ROWS].join('\n')
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'staff_template.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleReset = () => {
    setFile(null)
    setError(null)
    setResult(null)
  }

  const handleClose = () => {
    handleReset()
    onClose()
  }

  const fileName = file ? file.name : 'No file selected'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="mx-4 flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl dark:bg-stone-900">
        <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4 dark:border-stone-700">
          <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
            {result ? 'Upload Complete' : 'Bulk Upload Staff'}
          </h2>
          <button
            onClick={handleClose}
            className="rounded-lg p-1 text-stone-400 transition hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto p-6">
          {result ? (
            <div className="space-y-5">
              <div
                className={`rounded-lg p-4 text-sm ${
                  result.fail_count === 0
                    ? 'bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                }`}
              >
                <p className="font-semibold">
                  {result.success_count} of {result.total_rows} staff members created successfully.
                </p>
                {result.fail_count > 0 && (
                  <p className="mt-1">{result.fail_count} row(s) failed. See errors below.</p>
                )}
              </div>

              {result.success_count > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-bold text-stone-900 dark:text-stone-100">
                    Created Staff
                  </h3>
                  <div className="overflow-hidden rounded-xl border border-stone-200 dark:border-stone-700">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-800">
                          <th className="px-4 py-2.5 font-semibold text-stone-600 dark:text-stone-400">Name</th>
                          <th className="px-4 py-2.5 font-semibold text-stone-600 dark:text-stone-400">Email</th>
                          <th className="px-4 py-2.5 font-semibold text-stone-600 dark:text-stone-400">Role</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.results.map((staff) => (
                          <tr
                            key={staff.id}
                            className="border-b border-stone-100 last:border-0 dark:border-stone-800"
                          >
                            <td className="px-4 py-2.5 font-medium text-stone-900 dark:text-stone-100">
                              {staff.first_name} {staff.last_name}
                            </td>
                            <td className="px-4 py-2.5 text-stone-500 dark:text-stone-400">{staff.email}</td>
                            <td className="px-4 py-2.5">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                                  staff.role === 'VETERINARIAN'
                                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                    : 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                                }`}
                              >
                                {staff.role === 'VETERINARIAN' ? '🩺' : '📋'} {staff.role}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {result.fail_count > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-bold text-red-700 dark:text-red-400">
                    Failed Rows
                  </h3>
                  <div className="space-y-2">
                    {result.errors.map((err) => (
                      <div
                        key={err.row}
                        className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm dark:border-red-900 dark:bg-red-900/20"
                      >
                        <p className="font-medium text-red-800 dark:text-red-300">
                          Row {err.row}{err.email ? ` — ${err.email}` : ''}
                        </p>
                        <p className="mt-0.5 text-red-700 dark:text-red-400">{err.errors}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={handleReset}
                  className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50 dark:border-stone-600 dark:text-stone-300 dark:hover:bg-stone-800"
                >
                  Upload Another
                </button>
                <button
                  onClick={handleClose}
                  className="rounded-lg bg-amber-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-950"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  setIsDragging(true)
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setIsDragging(false)
                  handleFiles(e.dataTransfer.files)
                }}
                onClick={() => inputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition ${
                  isDragging
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                    : 'border-stone-300 bg-stone-50 hover:border-amber-400 dark:border-stone-700 dark:bg-stone-800'
                }`}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />
                <span className="text-3xl">📄</span>
                <p className="mt-2 text-sm font-semibold text-stone-900 dark:text-stone-100">
                  Drag & drop your CSV file here
                </p>
                <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                  or click to browse — max {MAX_SIZE_BYTES / (1024 * 1024)} MB, {MAX_ROWS} rows
                </p>
              </div>

              {file && (
                <div className="flex items-center justify-between rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 dark:border-stone-700 dark:bg-stone-800">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📎</span>
                    <div>
                      <p className="text-sm font-medium text-stone-900 dark:text-stone-100">{fileName}</p>
                      <p className="text-xs text-stone-500 dark:text-stone-400">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setFile(null)}
                    className="text-sm text-red-600 transition hover:text-red-800 dark:text-red-400"
                  >
                    Remove
                  </button>
                </div>
              )}

              {error && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
                  {error}
                </div>
              )}

              <button
                onClick={downloadTemplate}
                className="inline-flex items-center gap-2 text-sm font-medium text-amber-800 transition hover:text-amber-950 dark:text-amber-400 dark:hover:text-amber-300"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                </svg>
                Download CSV Template
              </button>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={handleClose}
                  className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50 dark:border-stone-600 dark:text-stone-300 dark:hover:bg-stone-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={!file || isUploading}
                  className="rounded-lg bg-amber-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-950 disabled:opacity-50"
                >
                  {isUploading ? 'Uploading…' : 'Upload CSV'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

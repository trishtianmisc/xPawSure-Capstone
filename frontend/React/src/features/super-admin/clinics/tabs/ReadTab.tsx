import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { Button } from '../../../../components/ui'
import { useDebounce } from '../../../../hooks/useDebounce'

import type { DrilldownListResponse } from '../services/drilldown.service'

interface ReadTabProps<T> {
  clinicId: string
  queryKey: string
  fetcher: (clinicId: string, params: Record<string, unknown>) => Promise<DrilldownListResponse<T>>
  searchPlaceholder: string
  columns: { key: string; label: string; render?: (row: T) => React.ReactNode }[]
  rowKey: (row: T) => string
  emptyMessage: string
}

const PAGE_SIZE = 10

export function ReadTab<T>({
  clinicId,
  queryKey,
  fetcher,
  searchPlaceholder,
  columns,
  rowKey,
  emptyMessage,
}: ReadTabProps<T>) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebounce(search, 300)

  const params = useMemo(
    () => ({ search: debouncedSearch || undefined, page, page_size: PAGE_SIZE }),
    [debouncedSearch, page],
  )

  const { data, isLoading } = useQuery({
    queryKey: [queryKey, clinicId, params],
    queryFn: () => fetcher(clinicId, params),
    staleTime: 30_000,
  })

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <input
          className="w-full rounded-md border border-stone-200 bg-white px-4 py-2.5 pl-10 text-sm text-stone-900 placeholder-stone-400 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:placeholder-stone-500 dark:focus:border-amber-500 dark:focus:ring-amber-900/40"
          placeholder={searchPlaceholder}
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
        />
        <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400 dark:text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
        </svg>
      </div>

      <div className="overflow-hidden rounded-md border border-stone-200 bg-white shadow-sm dark:border-stone-700 dark:bg-stone-800">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-200 border-t-amber-600" />
          </div>
        ) : !data || data.results.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-stone-400 dark:text-stone-500">
              {debouncedSearch ? 'No results match your search.' : emptyMessage}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50 text-stone-500 dark:border-stone-700 dark:bg-stone-800/50 dark:text-stone-400">
                  {columns.map((column) => (
                    <th key={column.key} className="px-5 py-4 font-semibold">{column.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-700">
                {data.results.map((row) => (
                  <tr key={rowKey(row)} className="transition hover:bg-amber-50/50 dark:hover:bg-amber-900/10">
                    {columns.map((column) => (
                      <td key={column.key} className="px-5 py-4 text-stone-700 dark:text-stone-300">
                        {column.render ? column.render(row) : String((row as Record<string, unknown>)[column.key] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && data.total_pages > 1 && (
          <div className="flex items-center justify-between border-t border-stone-100 px-5 py-4 dark:border-stone-700">
            <span className="text-sm text-stone-500 dark:text-stone-400">
              Page {data.page} of {data.total_pages} ({data.total} total)
            </span>
            <div className="flex gap-2">
              <Button
                disabled={page <= 1}
                size="sm"
                variant="secondary"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                disabled={page >= data.total_pages}
                size="sm"
                variant="secondary"
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

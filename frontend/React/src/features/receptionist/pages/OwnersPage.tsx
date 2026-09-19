import { useState } from 'react'
import { Link } from 'react-router-dom'

import { useOwners } from '../hooks/useOwners'

export function OwnersPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading, error } = useOwners({
    search: search || undefined,
    page,
    page_size: 20,
  })

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Owners</h1>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Search owners..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="w-full max-w-md rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 dark:placeholder:text-stone-500"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <table className="min-w-full divide-y divide-stone-200 dark:divide-stone-800">
          <thead className="bg-stone-50 dark:bg-stone-800/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">Email</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">Phone</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">Pets</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">Registered</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 animate-pulse rounded bg-stone-200 dark:bg-stone-800" />
                    </td>
                  ))}
                </tr>
              ))
            ) : error ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-stone-500">
                  Failed to load owners
                </td>
              </tr>
            ) : data?.results && data.results.length > 0 ? (
              data.results.map((owner) => (
                <tr key={owner.own_id} className="hover:bg-stone-50 dark:hover:bg-stone-800/50">
                  <td className="px-4 py-3">
                    <Link to={`/receptionist/owners/${owner.own_id}`} className="text-sm font-medium text-amber-700 hover:underline dark:text-amber-400">
                      {owner.full_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-stone-600 dark:text-stone-400">{owner.email}</td>
                  <td className="px-4 py-3 text-sm text-stone-600 dark:text-stone-400">{owner.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-stone-600 dark:text-stone-400">{owner.pet_count}</td>
                  <td className="px-4 py-3 text-sm text-stone-600 dark:text-stone-400">
                    {new Date(owner.own_created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-stone-500">
                  No owners found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data && data.total_pages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-stone-500">
            Page {data.page} of {data.total_pages} ({data.total} results)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50 dark:border-stone-700 dark:text-stone-300"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
              disabled={page >= data.total_pages}
              className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50 dark:border-stone-700 dark:text-stone-300"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

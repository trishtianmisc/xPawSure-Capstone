import { useState } from 'react'
import { Link } from 'react-router-dom'

import { Button, Card } from '../../../components/ui'
import { useDebounce } from '../../../hooks/useDebounce'
import { useOwners } from '../hooks/useOwners'
import { PageHero } from '../components/PageHero'
import { apiErrorMessage } from '../../../utils/error'
import { formatDate, formatPhone } from '../../../utils/format'

const INPUT_CLASSES =
  'rounded-md border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-amber-500 dark:focus:ring-amber-900/40'

export function OwnersPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const debouncedSearch = useDebounce(search, 300)

  const { data, isLoading, error, refetch, isFetching } = useOwners({
    search: debouncedSearch || undefined,
    // Directory only: owners with a patient record at this clinic.
    scope: 'clinic',
    page,
    page_size: 20,
  })

  const clearSearch = () => {
    setSearch('')
    setPage(1)
  }

  return (
    <div className="p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <PageHero
            title="Owners"
            subtitle="Pet owners with patients at your clinic."
            meta={
              data && (
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-amber-100">
                  {search ? `${data.total} matching` : `${data.total} ${data.total === 1 ? 'owner' : 'owners'}`}
                </span>
              )
            }
          />
        </div>

        {/* Filter card */}
        <Card padding="md">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-52 flex-1">
              <input
                className={`${INPUT_CLASSES} pl-10`}
                placeholder="Search owners by name, email, or phone..."
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                aria-label="Search owners"
              />
              <svg
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400 dark:text-stone-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
              </svg>
            </div>
            {search && (
              <button
                type="button"
                onClick={clearSearch}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-stone-300 px-3 py-2.5 text-sm font-medium text-stone-600 transition hover:bg-stone-100 dark:border-stone-600 dark:text-stone-300 dark:hover:bg-stone-800"
              >
                Clear
              </button>
            )}
          </div>
        </Card>

        {/* Table */}
        <div className="mt-6 overflow-hidden rounded-md border border-stone-200 bg-white shadow-sm dark:border-stone-700 dark:bg-stone-800">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-200 border-t-amber-600" />
            </div>
          ) : data?.results && data.results.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-100 bg-stone-50 text-stone-500 dark:border-stone-700 dark:bg-stone-800/50 dark:text-stone-400">
                    <th className="px-5 py-4 font-semibold">Owner</th>
                    <th className="px-5 py-4 font-semibold">Phone</th>
                    <th className="px-5 py-4 font-semibold">Patients</th>
                    <th className="px-5 py-4 font-semibold">Registered</th>
                    <th className="px-5 py-4 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-700">
                  {data.results.map((owner) => (
                    <tr
                      key={owner.own_id}
                      className="transition hover:bg-amber-50/50 dark:hover:bg-amber-900/10"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="grid size-10 shrink-0 place-items-center rounded-full bg-amber-100 text-sm font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                            {owner.full_name
                              .split(' ')
                              .filter(Boolean)
                              .slice(0, 2)
                              .map((part) => part[0]?.toUpperCase())
                              .join('') || '?'}
                          </div>
                          <div className="min-w-0">
                            <Link
                              to={`/receptionist/owners/${owner.own_id}`}
                              className="block truncate text-sm font-semibold text-stone-900 transition hover:text-amber-700 dark:text-stone-100 dark:hover:text-amber-400"
                            >
                              {owner.full_name}
                            </Link>
                            <p className="truncate text-xs text-stone-500 dark:text-stone-400">
                              {owner.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-stone-500 dark:text-stone-400">
                        {formatPhone(owner.phone)}
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex min-w-7 items-center justify-center rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-700 dark:bg-stone-700 dark:text-stone-200">
                          {owner.pet_count}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-stone-500 dark:text-stone-400">
                        {formatDate(owner.own_created_at)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          to={`/receptionist/owners/${owner.own_id}`}
                          title="View owner"
                          aria-label={`View ${owner.full_name}`}
                          className="inline-flex rounded-lg p-2 text-amber-700 transition hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20"
                        >
                          <svg className="size-5 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
                            <path
                              fillRule="evenodd"
                              clipRule="evenodd"
                              d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 010-1.113zM17.25 12a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0z"
                            />
                          </svg>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : error ? (
            <div className="py-16 text-center">
              <svg
                className="mx-auto h-12 w-12 text-stone-300 dark:text-stone-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} />
              </svg>
              <h3 className="mt-4 text-lg font-semibold text-stone-600 dark:text-stone-400">Failed to load owners</h3>
              <p className="mt-1 text-sm text-stone-400 dark:text-stone-500">{apiErrorMessage(error)}</p>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="mt-4"
                loading={isFetching}
                onClick={() => refetch()}
              >
                Try again
              </Button>
            </div>
          ) : (
            <div className="py-16 text-center">
              <svg
                className="mx-auto h-12 w-12 text-stone-300 dark:text-stone-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} />
              </svg>
              <h3 className="mt-4 text-lg font-semibold text-stone-600 dark:text-stone-400">
                {search ? 'No owners match your search' : 'No owners yet'}
              </h3>
              <p className="mt-1 text-sm text-stone-400 dark:text-stone-500">
                {search
                  ? 'Try a different name, email, or phone number, or clear the search.'
                  : 'Owners appear here once their pets have an appointment at your clinic.'}
              </p>
              {search && (
                <Button type="button" size="sm" variant="secondary" className="mt-4" onClick={clearSearch}>
                  Clear search
                </Button>
              )}
            </div>
          )}

          {data && data.total_pages > 1 && (
            <div className="flex items-center justify-between border-t border-stone-100 px-5 py-4 dark:border-stone-700">
              <span className="text-sm text-stone-500 dark:text-stone-400">
                Showing {(data.page - 1) * data.page_size + 1}–
                {Math.min(data.page * data.page_size, data.total)} of {data.total}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={page >= data.total_pages}
                  onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

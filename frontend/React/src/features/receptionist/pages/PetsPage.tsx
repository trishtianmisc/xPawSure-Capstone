import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { Button, Card } from '../../../components/ui'
import { useDebounce } from '../../../hooks/useDebounce'
import { usePets } from '../hooks/usePets'
import { PageHero } from '../components/PageHero'
import { PetRegisterModal } from '../components/PetRegisterModal'
import { apiErrorMessage } from '../../../utils/error'
import { formatDate } from '../../../utils/format'

const INPUT_CLASSES =
  'rounded-md border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-amber-500 dark:focus:ring-amber-900/40'

function sexLabel(sex: string): string {
  if (!sex) return '—'
  return sex.charAt(0).toUpperCase() + sex.slice(1).toLowerCase()
}

function SexCell({ sex }: { sex: string }) {
  const dot =
    sex?.toUpperCase() === 'MALE'
      ? 'bg-sky-400'
      : sex?.toUpperCase() === 'FEMALE'
        ? 'bg-pink-400'
        : 'bg-stone-300 dark:bg-stone-600'
  return (
    <span className="inline-flex items-center gap-2 text-stone-500 dark:text-stone-400">
      <span className={`size-1.5 shrink-0 rounded-full ${dot}`} aria-hidden="true" />
      {sexLabel(sex)}
    </span>
  )
}

export function PetsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [registerOpen, setRegisterOpen] = useState(false)

  const debouncedSearch = useDebounce(search, 300)

  const params = useMemo(
    () => ({ search: debouncedSearch || undefined, page, page_size: 20 }),
    [debouncedSearch, page],
  )

  const { data, isLoading, error, refetch, isFetching } = usePets(params)

  const clearSearch = () => {
    setSearch('')
    setPage(1)
  }

  return (
    <div className="p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <PageHero
            title="Patients"
            subtitle="View and manage patient records for your clinic."
            meta={
              data && (
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-amber-100">
                  {search ? `${data.total} matching` : `${data.total} ${data.total === 1 ? 'patient' : 'patients'}`}
                </span>
              )
            }
            actions={
              <button
                type="button"
                onClick={() => setRegisterOpen(true)}
                className="shrink-0 rounded-md bg-amber-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-800"
              >
                + Register patient
              </button>
            }
          />
        </div>

        {/* Filter card */}
        <Card padding="md">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-52 flex-1">
              <input
                className={`${INPUT_CLASSES} pl-10`}
                placeholder="Search pets or breeds..."
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                aria-label="Search patients"
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
                    <th className="px-5 py-4 font-semibold">Patient</th>
                    <th className="px-5 py-4 font-semibold">Sex</th>
                    <th className="px-5 py-4 font-semibold">Weight</th>
                    <th className="px-5 py-4 font-semibold">Registered</th>
                    <th className="px-5 py-4 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-700">
                  {data.results.map((pet) => (
                    <tr
                      key={pet.id}
                      className="cursor-pointer transition hover:bg-amber-50/50 dark:hover:bg-amber-900/10"
                      onClick={() => navigate(`/receptionist/pets/${pet.id}`)}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {pet.profile_picture ? (
                            <img
                              src={pet.profile_picture}
                              alt=""
                              className="size-10 shrink-0 rounded-full object-cover ring-2 ring-white dark:ring-stone-700"
                            />
                          ) : (
                            <div className="grid size-10 shrink-0 place-items-center rounded-full bg-amber-100 text-sm font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                              {pet.name?.[0]?.toUpperCase() ?? '?'}
                            </div>
                          )}
                          <div className="min-w-0">
                            <Link
                              to={`/receptionist/pets/${pet.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="block truncate text-sm font-semibold text-stone-900 transition hover:text-amber-700 dark:text-stone-100 dark:hover:text-amber-400"
                            >
                              {pet.name}
                            </Link>
                            <p className="truncate text-xs text-stone-500 dark:text-stone-400">
                              {pet.breed_name ?? 'Unknown breed'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <SexCell sex={pet.sex} />
                      </td>
                      <td className="px-5 py-4 text-stone-500 dark:text-stone-400">
                        {pet.weight ? `${pet.weight} kg` : '—'}
                      </td>
                      <td className="px-5 py-4 text-stone-500 dark:text-stone-400">
                        {formatDate(pet.created_at)}
                      </td>
                      <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <Link
                          to={`/receptionist/pets/${pet.id}`}
                          title="View patient"
                          aria-label={`View ${pet.name}`}
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
              <h3 className="mt-4 text-lg font-semibold text-stone-600 dark:text-stone-400">Failed to load patients</h3>
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
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <ellipse cx="5.5" cy="10.5" rx="2" ry="2.6" />
                <ellipse cx="9.8" cy="6.8" rx="2" ry="2.6" />
                <ellipse cx="14.2" cy="6.8" rx="2" ry="2.6" />
                <ellipse cx="18.5" cy="10.5" rx="2" ry="2.6" />
                <path d="M12 12.2c-2.6 0-5.2 2.3-5.2 4.8 0 1.7 1.2 2.8 2.8 2.8 1 0 1.7-.4 2.4-.4s1.4.4 2.4.4c1.6 0 2.8-1.1 2.8-2.8 0-2.5-2.6-4.8-5.2-4.8z" />
              </svg>
              <h3 className="mt-4 text-lg font-semibold text-stone-600 dark:text-stone-400">
                {search ? 'No patients match your search' : 'No patients yet'}
              </h3>
              <p className="mt-1 text-sm text-stone-400 dark:text-stone-500">
                {search
                  ? 'Try a different name or breed, or clear the search.'
                  : 'Patients appear here after their first appointment at your clinic.'}
              </p>
              {search ? (
                <Button type="button" size="sm" variant="secondary" className="mt-4" onClick={clearSearch}>
                  Clear search
                </Button>
              ) : (
                <Button type="button" size="sm" className="mt-4" onClick={() => setRegisterOpen(true)}>
                  + Register patient
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

      <PetRegisterModal open={registerOpen} onClose={() => setRegisterOpen(false)} />
    </div>
  )
}

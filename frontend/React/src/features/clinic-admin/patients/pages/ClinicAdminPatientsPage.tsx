import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { Button, Card } from '../../../../components/ui'
import { useDebounce } from '../../../../hooks/useDebounce'
import { apiErrorMessage } from '../../../../utils/error'
import {
  CLINIC_TIME_ZONE,
  formatDate,
} from '../../../../utils/format'
import { useClinicSettings } from '../../../clinic-profile/hooks/useClinicSettings'
import { PageHero } from '../../../receptionist/components/PageHero'
import { useClinicPatients } from '../hooks/usePatients'
import type {
  PatientSort,
  SortOrder,
  VaccinationStatus,
} from '../types/patient.types'

const INPUT_CLASSES =
  'rounded-md border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-amber-500 dark:focus:ring-amber-900/40'

function initial(name: string): string {
  return name.trim()[0]?.toUpperCase() ?? '?'
}

export function ClinicAdminPatientsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [breed, setBreed] = useState('')
  const [vaccinationStatus, setVaccinationStatus] = useState<
    VaccinationStatus | ''
  >('')
  const [noShowsOnly, setNoShowsOnly] = useState(false)
  const [sort] = useState<PatientSort>('name')
  const [order, setOrder] = useState<SortOrder>('asc')
  const [page, setPage] = useState(1)

  const debouncedSearch = useDebounce(search, 300)
  const settings = useClinicSettings()

  const params = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      breed: breed || undefined,
      vaccination_status: vaccinationStatus || undefined,
      has_no_shows: noShowsOnly || undefined,
      sort,
      order,
      page,
      page_size: 20,
    }),
    [debouncedSearch, breed, vaccinationStatus, noShowsOnly, sort, order, page],
  )

  const { data, isLoading, error, refetch, isFetching } = useClinicPatients(params)

  const displayTimeZone = settings.data?.timezone ?? CLINIC_TIME_ZONE
  const startItem = data ? (data.page - 1) * data.page_size + 1 : 0
  const endItem = data ? Math.min(data.page * data.page_size, data.total) : 0
  const hasActiveFilters = Boolean(
    search || breed || vaccinationStatus || noShowsOnly,
  )

  function changeSearch(value: string) {
    setSearch(value)
    setPage(1)
  }

  function clearFilters() {
    setSearch('')
    setBreed('')
    setVaccinationStatus('')
    setNoShowsOnly(false)
    setPage(1)
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-6">
      <PageHero
        title="Patients"
        subtitle="View patients treated at your clinic."
      />

      <Card padding="md">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-64 flex-1">
            <input
              aria-label="Search patients"
              className={`${INPUT_CLASSES} w-full pl-10`}
              onChange={(event) => changeSearch(event.target.value)}
              placeholder="Search"
              type="text"
              value={search}
            />
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400 dark:text-stone-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
          </div>

          {/* <select
            aria-label="Filter by breed"
            className={INPUT_CLASSES}
            onChange={(event) => changeBreed(event.target.value)}
            value={breed}
          >
            <option value="">All breeds</option>
            {(breeds.data ?? []).map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select> */}

          {/* <select
            aria-label="Filter by vaccination status"
            className={INPUT_CLASSES}
            onChange={(event) => changeVaccinationStatus(event.target.value)}
            value={vaccinationStatus}
          >
            {VACCINATION_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select> */}

          {/* <button
            aria-pressed={noShowsOnly}
            className={`rounded-md border px-4 py-2.5 text-sm font-semibold transition ${
              noShowsOnly
                ? 'border-amber-700 bg-amber-700 text-white'
                : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700'
            }`}
            onClick={toggleNoShows}
            type="button"
          >
            With no-shows
          </button> */}

          {/* <select
            aria-label="Sort patients"
            className={INPUT_CLASSES}
            onChange={(event) => {
              setSort(event.target.value as PatientSort)
              setPage(1)
            }}
            value={sort}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                Sort: {option.label}
              </option>
            ))}
          </select> */}

          <button
            aria-label={order === 'asc' ? 'Sorted ascending, click to sort descending' : 'Sorted descending, click to sort ascending'}
            title={order === 'asc' ? 'Ascending' : 'Descending'}
            className="grid place-items-center rounded-md border border-stone-200 bg-white px-3 py-2.5 text-stone-700 transition hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
            onClick={() => {
              setOrder((current) => (current === 'asc' ? 'desc' : 'asc'))
              setPage(1)
            }}
            type="button"
          >
            {order === 'asc' ? (
              /* arrow up: ascending */
              <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
              </svg>
            ) : (
              /* arrow down: descending */
              <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
              </svg>
            )}
          </button>

          {hasActiveFilters && (
            <Button
              onClick={clearFilters}
              size="sm"
              type="button"
              variant="ghost"
            >
              Clear filters
            </Button>
          )}

          {isFetching && !isLoading && (
            <span className="text-xs font-medium text-stone-400 dark:text-stone-500">
              Refreshing...
            </span>
          )}
        </div>
      </Card>

      <div className="overflow-hidden rounded-md border border-stone-200 bg-white shadow-sm dark:border-stone-700 dark:bg-stone-800">
        {isLoading ? (
          <div className="space-y-4 p-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                className="h-12 animate-pulse rounded-md bg-stone-100 dark:bg-stone-700"
                key={index}
              />
            ))}
          </div>
        ) : error && !data ? (
          <div className="py-16 text-center">
            <h2 className="text-lg font-semibold text-stone-700 dark:text-stone-300">
              Failed to load patients
            </h2>
            <p className="mt-1 text-sm text-stone-400 dark:text-stone-500">
              {apiErrorMessage(error)}
            </p>
            <Button
              className="mt-4"
              loading={isFetching}
              onClick={() => refetch()}
              size="sm"
              type="button"
              variant="secondary"
            >
              Try again
            </Button>
          </div>
        ) : data && data.results.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-100 bg-stone-50 text-stone-500 dark:border-stone-700 dark:bg-stone-800/50 dark:text-stone-400">
                    <th className="px-5 py-4 font-semibold">Pet</th>
                    <th className="px-5 py-4 font-semibold">Owner</th>
                    <th className="px-5 py-4 font-semibold">Last visit</th>
                    <th className="px-5 py-4 font-semibold">Next appointment</th>
                    <th className="px-5 py-4 font-semibold">Total Appointments</th>
                    <th className="px-5 py-4 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-700">
                  {data.results.map((patient) => (
                    <tr
                      className="cursor-pointer transition hover:bg-amber-50/50 dark:hover:bg-amber-900/10"
                      key={patient.id}
                      onClick={() => navigate(`/clinic/patients/${patient.id}`)}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {patient.profile_picture ? (
                            <img
                              alt=""
                              className="size-9 shrink-0 rounded-full object-cover"
                              src={patient.profile_picture}
                            />
                          ) : (
                            <div className="grid size-9 shrink-0 place-items-center rounded-full bg-amber-100 text-xs font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                              {initial(patient.name)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <Link
                              className="font-semibold text-stone-900 transition hover:text-amber-700 dark:text-stone-100 dark:hover:text-amber-400"
                              onClick={(event) => event.stopPropagation()}
                              to={`/clinic/patients/${patient.id}`}
                            >
                              {patient.name}
                            </Link>
                            <p className="text-xs text-stone-500 dark:text-stone-400">
                              {[patient.breed]
                                .filter(Boolean)
                                .join(' | ')}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4" onClick={(event) => event.stopPropagation()}>
                        <p className="font-medium text-stone-800 dark:text-stone-200">
                          {patient.owner.name}
                        </p>

                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-stone-600 dark:text-stone-300">
                        {formatDate(patient.last_visit_date, displayTimeZone)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-stone-600 dark:text-stone-300">
                        {formatDate(patient.next_appointment_date, displayTimeZone)}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <p className="font-semibold text-stone-800 dark:text-stone-200">
                          {patient.total_appointments}
                        </p>
                        <p className="text-xs text-stone-500 dark:text-stone-400">
                          {patient.no_show_count} no-shows | {patient.cancelled_count}{' '}
                          cancelled
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          aria-label={`View ${patient.name}`}
                          title="View patient"
                          onClick={(e) => { e.stopPropagation(); navigate(`/clinic/patients/${patient.id}`) }}
                          className="rounded-lg p-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-amber-900 dark:hover:bg-stone-800"
                        >
                          <svg className="size-5 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
                            <path
                              fillRule="evenodd"
                              clipRule="evenodd"
                              d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 010-1.113zM17.25 12a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0z"
                            />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 px-5 py-4 dark:border-stone-700">
              <span className="text-sm text-stone-500 dark:text-stone-400">
                Showing {startItem}-{endItem} of {data.total} patients
              </span>
              <div className="flex gap-2">
                <Button
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  size="sm"
                  type="button"
                  variant="secondary"
                >
                  Previous
                </Button>
                <Button
                  disabled={page >= data.total_pages}
                  onClick={() =>
                    setPage((current) => Math.min(data.total_pages, current + 1))
                  }
                  size="sm"
                  type="button"
                  variant="secondary"
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="py-16 text-center">
            <h2 className="text-lg font-semibold text-stone-700 dark:text-stone-300">
              No patients found
            </h2>
            <p className="mt-1 text-sm text-stone-400 dark:text-stone-500">
              {hasActiveFilters
                ? 'Try adjusting your search or filters.'
                : 'Patients will appear here once they have an appointment at your clinic.'}
            </p>
            {hasActiveFilters && (
              <Button
                className="mt-4"
                onClick={clearFilters}
                size="sm"
                type="button"
                variant="secondary"
              >
                Clear filters
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

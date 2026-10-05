import { useEffect, type ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { isAxiosError } from 'axios'

import { Alert, Badge, Button, Card } from '../../../../components/ui'
import { usePublicPet } from '../hooks/usePublicPet'
import type { VaccinationStatus } from '../types/pet.types'

const statusStyles: Record<VaccinationStatus, { label: string; variant: 'success' | 'warning' | 'error' | 'default' }> = {
  OVERDUE: { label: 'Overdue', variant: 'error' },
  DUE_SOON: { label: 'Due soon', variant: 'warning' },
  CURRENT: { label: 'Up to date', variant: 'success' },
  NO_DUE_DATE: { label: 'No due date', variant: 'default' },
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatSex(sex: string): string {
  return sex.charAt(0) + sex.slice(1).toLowerCase()
}

function PageShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-stone-100 p-4 dark:bg-stone-950 sm:p-6">
      <div className="mx-auto max-w-2xl">
        <header className="mb-6 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-amber-950 text-lg font-extrabold text-[#f4d0a5]" aria-hidden="true">
            XP
          </span>
          <div>
            <p className="text-lg font-extrabold tracking-tight text-stone-900 dark:text-stone-100">XPawSure</p>
            <p className="text-xs font-medium text-stone-500 dark:text-stone-400">Public pet profile</p>
          </div>
        </header>
        {children}
        <footer className="mt-6 text-center text-xs text-stone-400 dark:text-stone-500">
          Scanned via XPawSure QR code. Owner contact details are never shown publicly.
        </footer>
      </div>
    </main>
  )
}

function LoadingSkeleton() {
  return (
    <PageShell>
      <div className="space-y-4">
        <div className="h-48 animate-pulse rounded-xl bg-stone-200 dark:bg-stone-800" />
        <div className="h-8 w-48 animate-pulse rounded-lg bg-stone-200 dark:bg-stone-800" />
        <div className="h-40 animate-pulse rounded-xl bg-stone-200 dark:bg-stone-800" />
      </div>
    </PageShell>
  )
}

export function PublicPetPage() {
  const { qrCode = '' } = useParams<{ qrCode: string }>()
  const { data: pet, isLoading, error, refetch } = usePublicPet(qrCode)

  useEffect(() => {
    if (pet) {
      document.title = `${pet.name} · XPawSure`
    }
    return () => {
      document.title = 'XPawSure'
    }
  }, [pet])

  if (isLoading) {
    return <LoadingSkeleton />
  }

  const isNotFound = isAxiosError(error) && error.response?.status === 404

  if (error) {
    return (
      <PageShell>
        <Card>
          <Alert variant={isNotFound ? 'warning' : 'error'}>
            {isNotFound
              ? 'Pet not found. This QR code may be invalid, or the profile has been removed.'
              : 'We could not load this profile. Please check your connection and try again.'}
          </Alert>
          {!isNotFound && (
            <Button className="mt-4" variant="secondary" onClick={() => refetch()}>
              Try again
            </Button>
          )}
        </Card>
      </PageShell>
    )
  }

  if (!pet) {
    return (
      <PageShell>
        <Card>
          <Alert variant="warning">Pet not found.</Alert>
        </Card>
      </PageShell>
    )
  }

  const overdue = pet.vaccinations.filter((v) => v.status === 'OVERDUE').length
  const dueSoon = pet.vaccinations.filter((v) => v.status === 'DUE_SOON').length

  return (
    <PageShell>
      <Card>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          {pet.profile_picture ? (
            <img
              src={pet.profile_picture}
              alt={pet.name}
              className="size-28 rounded-2xl object-cover shadow-sm"
            />
          ) : (
            <div className="grid size-28 place-items-center rounded-2xl bg-amber-100 text-4xl font-extrabold text-amber-900 dark:bg-amber-950 dark:text-amber-200">
              {pet.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="text-center sm:text-left">
            <h1 className="text-3xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100">{pet.name}</h1>
            <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
              <Badge variant="info">{pet.breed_name ?? 'Mixed breed'}</Badge>
              <Badge>{formatSex(pet.sex)}</Badge>
              {pet.age !== null && <Badge variant="default">{pet.age === 1 ? '1 year old' : `${pet.age} years old`}</Badge>}
            </div>
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-1 gap-3 border-t border-stone-200 pt-6 dark:border-stone-700 sm:grid-cols-2">
          <div className="flex justify-between gap-4">
            <dt className="text-sm text-stone-500 dark:text-stone-400">Date of birth</dt>
            <dd className="text-sm font-medium text-stone-900 dark:text-stone-100">{formatDate(pet.date_of_birth)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-sm text-stone-500 dark:text-stone-400">Color</dt>
            <dd className="text-sm font-medium text-stone-900 dark:text-stone-100">{pet.color ?? '—'}</dd>
          </div>
        </dl>
      </Card>

      <Card className="mt-4">
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Health alerts</h2>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Vaccination status reported by the treating clinic.
        </p>

        {overdue > 0 && (
          <Alert variant="error" className="mt-4">
            {overdue} vaccination{overdue > 1 ? 's are' : ' is'} overdue.
          </Alert>
        )}
        {dueSoon > 0 && (
          <Alert variant="warning" className="mt-4">
            {dueSoon} vaccination{dueSoon > 1 ? 's are' : ' is'} due within the next 30 days.
          </Alert>
        )}

        {pet.vaccinations.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-stone-300 px-4 py-6 text-center text-sm text-stone-500 dark:border-stone-600 dark:text-stone-400">
            No vaccination records on file.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-stone-200 dark:divide-stone-700">
            {pet.vaccinations.map((vaccination, index) => {
              const style = statusStyles[vaccination.status]
              return (
                <li key={`${vaccination.name}-${index}`} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-medium text-stone-900 dark:text-stone-100">{vaccination.name}</p>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      Given {formatDate(vaccination.date_given)} · Next due {formatDate(vaccination.next_due)}
                    </p>
                  </div>
                  <Badge variant={style.variant}>{style.label}</Badge>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </PageShell>
  )
}

import { useParams, useNavigate } from 'react-router-dom'

import { usePetDetail } from '../hooks/usePets'

export function PetDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: pet, isLoading, error } = usePetDetail(id ?? '')

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-stone-200 dark:bg-stone-800 mb-6" />
        <div className="h-64 animate-pulse rounded-xl bg-stone-200 dark:bg-stone-800" />
      </div>
    )
  }

  if (error || !pet) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-6">
        <p className="text-sm text-stone-500">Pet not found</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 text-sm font-medium text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
      >
        ← Back
      </button>

      <h1 className="mb-6 text-2xl font-bold text-stone-900 dark:text-stone-100">{pet.name}</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
          <h2 className="mb-4 text-lg font-semibold text-stone-900 dark:text-stone-100">Pet Information</h2>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-stone-500 dark:text-stone-400">Breed</dt>
              <dd className="text-sm font-medium text-stone-900 dark:text-stone-100">{pet.breed_name ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-stone-500 dark:text-stone-400">Sex</dt>
              <dd className="text-sm font-medium text-stone-900 dark:text-stone-100">{pet.sex}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-stone-500 dark:text-stone-400">Date of Birth</dt>
              <dd className="text-sm font-medium text-stone-900 dark:text-stone-100">
                {pet.date_of_birth ? new Date(pet.date_of_birth).toLocaleDateString() : '—'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-stone-500 dark:text-stone-400">Weight</dt>
              <dd className="text-sm font-medium text-stone-900 dark:text-stone-100">
                {pet.weight ? `${pet.weight} kg` : '—'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-stone-500 dark:text-stone-400">Color</dt>
              <dd className="text-sm font-medium text-stone-900 dark:text-stone-100">{pet.color ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-stone-500 dark:text-stone-400">Microchip</dt>
              <dd className="text-sm font-medium text-stone-900 dark:text-stone-100">{pet.microchip_number ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-stone-500 dark:text-stone-400">Registered</dt>
              <dd className="text-sm font-medium text-stone-900 dark:text-stone-100">
                {new Date(pet.created_at).toLocaleDateString()}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  )
}

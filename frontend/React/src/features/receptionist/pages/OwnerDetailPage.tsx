import { useParams, useNavigate, Link } from 'react-router-dom'

import { useOwnerDetail } from '../hooks/useOwners'

export function OwnerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: owner, isLoading, error } = useOwnerDetail(id ?? '')

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-stone-200 dark:bg-stone-800 mb-6" />
        <div className="h-64 animate-pulse rounded-xl bg-stone-200 dark:bg-stone-800" />
      </div>
    )
  }

  if (error || !owner) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-6">
        <p className="text-sm text-stone-500">Owner not found</p>
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

      <h1 className="mb-6 text-2xl font-bold text-stone-900 dark:text-stone-100">{owner.full_name}</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Owner Info */}
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
          <h2 className="mb-4 text-lg font-semibold text-stone-900 dark:text-stone-100">Contact Information</h2>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-stone-500 dark:text-stone-400">Email</dt>
              <dd className="text-sm font-medium text-stone-900 dark:text-stone-100">{owner.email}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-stone-500 dark:text-stone-400">Phone</dt>
              <dd className="text-sm font-medium text-stone-900 dark:text-stone-100">{owner.phone ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-stone-500 dark:text-stone-400">Address</dt>
              <dd className="text-sm font-medium text-stone-900 dark:text-stone-100">{owner.own_address ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-stone-500 dark:text-stone-400">Registered</dt>
              <dd className="text-sm font-medium text-stone-900 dark:text-stone-100">
                {new Date(owner.own_created_at).toLocaleDateString()}
              </dd>
            </div>
          </dl>
        </div>

        {/* Pets */}
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
          <h2 className="mb-4 text-lg font-semibold text-stone-900 dark:text-stone-100">Pets</h2>
          {owner.pets && owner.pets.length > 0 ? (
            <div className="space-y-3">
              {owner.pets.map((pet) => (
                <Link
                  key={pet.id}
                  to={`/receptionist/pets/${pet.id}`}
                  className="flex items-center justify-between rounded-lg border border-stone-200 p-3 transition hover:bg-stone-50 dark:border-stone-700 dark:hover:bg-stone-800"
                >
                  <div>
                    <p className="text-sm font-medium text-stone-900 dark:text-stone-100">{pet.name}</p>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      {pet.breed_name ?? 'Unknown breed'} · {pet.sex}
                    </p>
                  </div>
                  <span className="text-xs text-stone-400">→</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-stone-500 dark:text-stone-400">No pets registered</p>
          )}
        </div>
      </div>
    </div>
  )
}

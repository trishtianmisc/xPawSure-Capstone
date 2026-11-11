import { useNavigate } from 'react-router-dom'

import { useAuth } from '../features/auth/context/AuthContext'

function homePathFor(role?: string): string {
  switch (role) {
    case 'SUPER_ADMIN':
      return '/super-admin/dashboard'
    case 'CLINIC_ADMIN':
      return '/clinic/dashboard'
    case 'VETERINARIAN':
      return '/veterinarian/dashboard'
    case 'RECEPTIONIST':
      return '/receptionist/dashboard'
    default:
      return '/login'
  }
}

export function NotFoundPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const homePath = homePathFor(user?.role)

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-16 text-center">
      <p className="text-6xl font-extrabold tracking-tight text-amber-700 dark:text-amber-500">
        404
      </p>
      <h1 className="mt-3 text-xl font-semibold text-stone-900 dark:text-stone-100">
        Page not found
      </h1>
      <p className="mt-2 max-w-md text-sm text-stone-500 dark:text-stone-400">
        The page you&apos;re looking for doesn&apos;t exist or may have been
        moved.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-600 transition hover:bg-stone-100 dark:border-stone-600 dark:text-stone-300 dark:hover:bg-stone-800"
        >
          Go back
        </button>
        <button
          type="button"
          onClick={() => navigate(homePath)}
          className="rounded-md bg-amber-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-800"
        >
          {user ? 'Back to dashboard' : 'Back to sign in'}
        </button>
      </div>
    </div>
  )
}

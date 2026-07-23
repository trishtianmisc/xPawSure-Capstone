interface QuickAction {
  label: string
  icon: string
  href: string
  description: string
}

const actions: QuickAction[] = [
  { label: 'Veterinarians', icon: '👨‍⚕️', href: '/clinic/veterinarians', description: 'Manage veterinarian accounts' },
  { label: 'Add Appointment', icon: '📅', href: '/clinic/appointments/new', description: 'Schedule a new appointment' },
  { label: 'View Pet Owners', icon: '👤', href: '/clinic/owners', description: 'Browse registered owners' },
  { label: 'View Pets', icon: '🐾', href: '/clinic/pets', description: 'Browse registered pets' },
  { label: 'View AI Screenings', icon: '🔬', href: '/clinic/screenings', description: 'Review screening results' },
  { label: 'View Reports', icon: '📊', href: '/clinic/reports', description: 'Generate clinic reports' },
]

export function QuickActions() {
  return (
    <div>
      <h2 className="mb-4 text-lg font-bold text-stone-900 dark:text-stone-100">Quick Actions</h2>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => (
          <a
            key={action.label}
            className="group rounded-xl border border-stone-200 bg-white p-4 text-left shadow-sm transition hover:border-amber-200 hover:shadow-md dark:border-stone-700 dark:bg-stone-800 dark:hover:border-amber-700"
            href={action.href}
          >
            <span className="text-2xl" role="img">
              {action.icon}
            </span>
            <p className="mt-2 text-sm font-bold text-stone-900 group-hover:text-amber-700 dark:text-stone-100 dark:group-hover:text-amber-400">
              {action.label}
            </p>
            <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
              {action.description}
            </p>
          </a>
        ))}
      </div>
    </div>
  )
}

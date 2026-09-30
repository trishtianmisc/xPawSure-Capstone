interface SidebarProps {
  clinicName: string
  vetName: string
  activePage: string
  onNavigate: (page: string) => void
  onLogout: () => void
}

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'consultations', label: 'Consultations' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'profile', label: 'Profile' },
  { id: 'settings', label: 'Settings' },
]

export function Sidebar({ clinicName, vetName, activePage, onNavigate, onLogout }: SidebarProps) {
  return (
    <aside className="flex h-screen w-64 flex-col border-r border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
      <div className="flex flex-col items-center gap-3 border-b border-stone-200 px-6 py-8 dark:border-stone-800">
        <div className="grid size-14 place-items-center rounded-full bg-stone-200 dark:bg-stone-700">
          <span className="text-2xl font-bold text-stone-500 dark:text-stone-300">
            {vetName.charAt(0).toUpperCase()}
          </span>
        </div>
        <p className="text-center text-sm font-semibold text-stone-700 dark:text-stone-200">
          Welcome back {vetName}!
        </p>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full rounded-lg px-4 py-2.5 text-left text-sm font-medium transition ${
              activePage === item.id
                ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-300'
                : 'text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800'
            }`}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="border-t border-stone-200 px-3 py-4 dark:border-stone-800">
        <button
          onClick={onLogout}
          className="w-full rounded-lg px-4 py-2.5 text-left text-sm font-medium text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
          type="button"
        >
          Log Out
        </button>
      </div>
    </aside>
  )
}

// components/PawIcon.tsx
type PawIconProps = { className?: string }

export function PawIcon({ className = 'size-6' }: PawIconProps) {
  return (
    <svg aria-hidden="true" className={className} fill="currentColor" viewBox="0 0 64 64">
      <ellipse cx="32" cy="42" rx="15" ry="12" />
      <ellipse cx="12" cy="29" rx="6" ry="8" />
      <ellipse cx="25" cy="15" rx="6.5" ry="9" />
      <ellipse cx="40" cy="15" rx="6.5" ry="9" />
      <ellipse cx="53" cy="29" rx="6" ry="8" />
    </svg>
  )
}

// Wordmark: XP🐾wsure (paw replaces the "a")
export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span aria-label="Xpawsure" className={`inline-flex items-center font-extrabold tracking-tighter ${className}`}>
      <span aria-hidden="true">XP</span>
      <PawIcon className="mx-0.5 size-[0.85em] text-[#8a4b24] dark:text-amber-700" />
      <span aria-hidden="true">wsure</span>
    </span>
  )
}

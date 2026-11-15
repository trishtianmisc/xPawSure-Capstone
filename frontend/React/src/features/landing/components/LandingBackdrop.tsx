function Paw({ className }: { className: string }) {
  return (
    <svg
      aria-hidden="true"
      className={`absolute ${className}`}
      fill="currentColor"
      viewBox="0 0 64 64"
    >
      <ellipse cx="32" cy="42" rx="14" ry="11" />
      <ellipse cx="14" cy="28" rx="6" ry="8" transform="rotate(-20 14 28)" />
      <ellipse cx="25" cy="16" rx="6" ry="9" />
      <ellipse cx="39" cy="16" rx="6" ry="9" />
      <ellipse cx="50" cy="28" rx="6" ry="8" transform="rotate(20 50 28)" />
    </svg>
  )
}

// Decorative only: sits behind every section and never takes clicks.
export function LandingBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      {/* Circles: solid browns and tan rings, bleeding off the edges */}
      <div className="absolute inset-0 dark:opacity-25">
        <div className="absolute -left-24 -top-24 size-64 rounded-full bg-[#a8764f]/80" />
        <div className="absolute -right-16 -top-14 size-72 rounded-full bg-[#5a2b12]" />
        <div className="absolute -left-28 top-[38%] size-80 rounded-full border-[36px] border-[#d2a87c]/60" />
        <div className="absolute -right-24 top-[55%] size-72 rounded-full bg-[#6b3a1c]/90" />
        <div className="absolute -bottom-20 left-[6%] size-56 rounded-full bg-[#6b3a1c]" />
        <div className="absolute -bottom-28 right-[8%] size-96 rounded-full border-[40px] border-[#d2a87c]/70" />
      </div>

      {/* Paw prints: scattered, tilted, kept faint so text stays readable */}
      <div className="absolute inset-0 text-[#8a5a35]/20 dark:text-amber-200/10">
        <Paw className="left-[8%] top-[10%] size-12 -rotate-12" />
        <Paw className="right-[22%] top-[18%] size-16 rotate-12" />
        <Paw className="left-[30%] top-[30%] size-10 rotate-[25deg]" />
        <Paw className="right-[10%] top-[42%] size-14 -rotate-[20deg]" />
        <Paw className="left-[14%] top-[58%] size-16 rotate-6" />
        <Paw className="right-[30%] top-[68%] size-10 -rotate-12" />
        <Paw className="left-[40%] top-[82%] size-14 rotate-[18deg]" />
        <Paw className="right-[6%] top-[90%] size-12 -rotate-6" />
      </div>
    </div>
  )
}
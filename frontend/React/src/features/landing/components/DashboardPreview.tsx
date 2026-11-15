export function DashboardPreview() {
  return (
    <div className="relative mx-auto w-full">
      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl shadow-amber-950/10 dark:border-stone-700 dark:bg-stone-900">
        <img
          alt="XPawSure web appointments preview"
          className="block h-auto w-full"
          height={842}
          src="/landing-web-preview.png"
          width={1641}
        />
      </div>
      <p className="mt-3 text-center text-xs font-medium text-stone-500 dark:text-stone-400">
        Web app review
      </p>
    </div>
  )
}

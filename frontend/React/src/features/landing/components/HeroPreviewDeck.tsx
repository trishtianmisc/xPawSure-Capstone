import { useState } from 'react'

import { LandingIcon } from './LandingIcon'

const PREVIEW_SCREENS = [
  { id: 'appointments', label: 'Appointments' },
  { id: 'patients', label: 'Patient records' },
  { id: 'screening', label: 'AI screening' },
] as const

type PreviewScreenId = (typeof PREVIEW_SCREENS)[number]['id']

function SkeletonBar({ className }: { className: string }) {
  return <div className={`rounded-full bg-stone-200 dark:bg-stone-700/70 ${className}`} />
}

function AppointmentsScreen() {
  return (
    <img
      alt="XPawSure web appointments preview"
      className="h-full w-full object-cover object-top"
      height={842}
      src="/landing-web-preview.png"
      width={1641}
    />
  )
}

function PatientsScreen() {
  return (
    <div className="flex h-full">
      <div className="w-[30%] space-y-2 border-r border-stone-200 p-3 dark:border-stone-700/70">
        <SkeletonBar className="h-2 w-3/4" />
        <SkeletonBar className="h-2 w-full" />
        <SkeletonBar className="h-2 w-2/3" />
        <SkeletonBar className="h-2 w-5/6" />
        <SkeletonBar className="h-2 w-1/2" />
      </div>
      <div className="flex-1 space-y-3 p-3.5">
        <div className="flex items-center gap-3">
          <div className="size-9 shrink-0 rounded-lg bg-amber-200/70 dark:bg-amber-500/25" />
          <div className="flex-1 space-y-1.5">
            <SkeletonBar className="h-2.5 w-1/2" />
            <div className="h-2 w-16 rounded-full bg-amber-600/70 dark:bg-amber-400/60" />
          </div>
        </div>
        <SkeletonBar className="h-2 w-full" />
        <SkeletonBar className="h-2 w-4/5" />
        <div className="grid grid-cols-3 gap-2 pt-1">
          <div className="h-10 rounded-lg bg-stone-100 dark:bg-stone-800" />
          <div className="h-10 rounded-lg bg-stone-100 dark:bg-stone-800" />
          <div className="h-10 rounded-lg bg-stone-100 dark:bg-stone-800" />
        </div>
        <SkeletonBar className="h-2 w-2/3" />
      </div>
    </div>
  )
}

function ScreeningScreen() {
  return (
    <div className="space-y-3 p-3.5">
      <div className="flex items-start gap-3">
        <div className="grid size-16 shrink-0 place-items-center rounded-lg border border-dashed border-stone-300 bg-stone-100 text-stone-400 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-500">
          <LandingIcon className="size-5" name="camera" />
        </div>
        <div className="flex-1 space-y-1.5">
          <SkeletonBar className="h-2.5 w-2/3" />
          <SkeletonBar className="h-2 w-full" />
          <div className="h-2 w-20 rounded-full bg-amber-600/70 dark:bg-amber-400/60" />
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 dark:border-stone-700 dark:bg-stone-800/60">
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500 dark:text-stone-400">
            Preliminary result
          </p>
          <p className="text-sm font-extrabold text-stone-900 dark:text-stone-100">Fungal</p>
        </div>
        <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300">86%</p>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700">
        <div className="h-full w-[86%] rounded-full bg-amber-700 dark:bg-amber-500" />
      </div>
      <SkeletonBar className="h-2 w-full" />
      <SkeletonBar className="h-2 w-3/4" />
    </div>
  )
}

function PreviewScreen({ id }: { id: PreviewScreenId }) {
  if (id === 'appointments') return <AppointmentsScreen />
  if (id === 'patients') return <PatientsScreen />
  return <ScreeningScreen />
}

export function HeroPreviewDeck() {
  const [activeIndex, setActiveIndex] = useState(0)
  const activeScreen = PREVIEW_SCREENS[activeIndex]
  const nextScreen = PREVIEW_SCREENS[(activeIndex + 1) % PREVIEW_SCREENS.length]

  return (
    <div className="mx-auto w-full max-w-lg pt-5">
      <div className="relative">
        {/* Stacked cards behind the active screen, purely decorative. */}
        <div
          aria-hidden="true"
          className="absolute -top-5 left-8 right-0 h-full rounded-2xl border border-stone-300/80 bg-white/70 shadow-sm dark:border-stone-700/80 dark:bg-stone-900/70"
        />
        <div
          aria-hidden="true"
          className="absolute -top-2.5 left-4 right-0 h-full rounded-2xl border border-stone-300/80 bg-white/80 shadow-sm dark:border-stone-700/80 dark:bg-stone-900/80"
        />

        <div className="group relative overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl shadow-amber-950/10 dark:border-stone-700 dark:bg-stone-900">
          <div className="flex items-center gap-3 border-b border-stone-200 px-4 py-2.5 dark:border-stone-700/80">
            <div aria-hidden="true" className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-stone-300 dark:bg-stone-600" />
              <span className="size-1.5 rounded-full bg-stone-300 dark:bg-stone-600" />
              <span className="size-1.5 rounded-full bg-stone-300 dark:bg-stone-600" />
            </div>
            <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">
              {activeScreen.label}
            </span>
            <LandingIcon
              className="ml-auto hidden size-3.5 text-stone-400 transition group-hover:translate-x-0.5 group-hover:text-amber-800 sm:block dark:text-stone-500 dark:group-hover:text-amber-300"
              name="arrow-right"
            />
          </div>

          <div className="aspect-16/10 w-full overflow-hidden bg-stone-50 dark:bg-stone-900">
            <div className="landing-preview-screen h-full" key={activeScreen.id}>
              <PreviewScreen id={activeScreen.id} />
            </div>
          </div>

          <button
            aria-label={`Show next preview: ${nextScreen.label}`}
            className="absolute inset-0 z-10 cursor-pointer rounded-2xl focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-amber-700"
            onClick={() => setActiveIndex((activeIndex + 1) % PREVIEW_SCREENS.length)}
            type="button"
          />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-4 border-t border-stone-300/70 pt-3 dark:border-stone-700/70">
        <p className="text-xs font-medium text-stone-600 dark:text-stone-400">
          {activeScreen.label} · click to see the next screen
        </p>
        <div className="flex items-center gap-1.5">
          {PREVIEW_SCREENS.map((screen, index) => (
            <button
              aria-current={index === activeIndex ? 'true' : undefined}
              aria-label={`Show ${screen.label} preview`}
              className={`h-1.5 rounded-full transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 ${
                index === activeIndex
                  ? 'w-6 bg-amber-700 dark:bg-amber-400'
                  : 'w-1.5 bg-stone-400/70 hover:bg-stone-500 dark:bg-stone-600 dark:hover:bg-stone-500'
              }`}
              key={screen.id}
              onClick={() => setActiveIndex(index)}
              type="button"
            />
          ))}
        </div>
      </div>
    </div>
  )
}

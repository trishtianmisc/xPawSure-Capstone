import { LandingIcon } from './LandingIcon'

export function ScreeningPreview() {
  return (
    <div className="mx-auto w-full max-w-sm">
      <div
        aria-hidden="true"
        className="rounded-[2rem] border border-amber-100/10 bg-stone-900 p-2 shadow-2xl shadow-black/30"
      >
        <div className="rounded-[1.6rem] bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-xl bg-amber-50 text-amber-800">
                <LandingIcon className="size-5" name="sparkles" />
              </span>
              <div>
                <p className="text-sm font-bold text-stone-900">AI screening</p>
                <p className="text-[10px] font-medium text-stone-500">Mobile app</p>
              </div>
            </div>
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-800">
              Preliminary
            </span>
          </div>

          <div className="mt-4 grid aspect-[4/3] place-items-center rounded-xl border border-dashed border-stone-300 bg-stone-100">
            <div className="text-center text-stone-400">
              <LandingIcon className="mx-auto size-8" name="camera" />
              <p className="mt-2 text-xs font-semibold">Single skin photo</p>
              <p className="mt-0.5 text-[10px]">Captured in the XPawSure app</p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-3.5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500">
                Preliminary result
              </p>
              <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-stone-500 ring-1 ring-stone-200">
                AI-assisted
              </span>
            </div>
            <div className="mt-2 flex items-end justify-between gap-3">
              <p className="text-lg font-extrabold tracking-tight text-stone-900">Fungal</p>
              <p className="text-xs font-bold text-amber-800">86% confidence</p>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-200">
              <div className="h-full w-[86%] rounded-full bg-amber-700" />
            </div>
            <p className="mt-2.5 text-[10px] leading-4 text-stone-500">
              Screening results are preliminary and are not a diagnosis.
            </p>
          </div>

          <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2">
            <LandingIcon className="size-4 shrink-0 text-emerald-700" name="check" />
            <p className="text-[10px] font-semibold text-emerald-800">
              Available for veterinarian review
            </p>
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-xs font-medium text-amber-200/70">
        Illustrative interface preview
      </p>
    </div>
  )
}

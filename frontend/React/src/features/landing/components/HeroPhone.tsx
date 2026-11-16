// components/HeroPhone.tsx — phone mockup with scan animation (matches the Figma hero)
import { PawIcon } from './PawIcon'

function DogIcon({ className = '' }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 100 100">
      <path d="M24 26C6 30 2 62 16 76C24 66 27 50 33 38Z" fill="currentColor" />
      <path d="M76 26C94 30 98 62 84 76C76 66 73 50 67 38Z" fill="currentColor" />
      <ellipse cx="50" cy="48" rx="28" ry="28" fill="currentColor" />
      <ellipse cx="50" cy="66" rx="16" ry="12" fill="#fff3e0" />
      <ellipse cx="50" cy="61" rx="7" ry="5" fill="currentColor" />
      <circle cx="38" cy="44" r="4" fill="#fff3e0" />
      <circle cx="62" cy="44" r="4" fill="#fff3e0" />
    </svg>
  )
}

const MATCHES = [
  { label: 'Hotspot', width: '78%' },
  { label: 'Bacterial', width: '46%' },
  { label: 'Fungal', width: '24%' },
]

const corner = 'absolute size-6 border-[3px] border-[#4a2210]'

export function HeroPhone() {
  return (
    <div className="relative mx-auto flex min-h-[560px] w-full max-w-md justify-center">
      <div aria-hidden="true" className="absolute -bottom-12 -right-16 size-[380px] rounded-full border-[30px] border-[#d2a97e] opacity-70 dark:border-stone-800" />
      <PawIcon className="landing-paw absolute left-[4%] top-[6%] size-8 text-[#8a4b24] [--r:-18deg]" />
      <PawIcon className="landing-paw absolute right-[2%] top-[40%] size-8 text-[#8a4b24] [--r:24deg] [animation-delay:1.5s]" />

      <div className="landing-float absolute -left-4 top-[22%] z-20 hidden items-center gap-2.5 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[#4a2210] shadow-lg sm:flex">
        <LandingCheck /> Preliminary Screening Tool
      </div>
      <div className="landing-float absolute -right-2 bottom-[18%] z-20 hidden items-center gap-2.5 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[#4a2210] shadow-lg [animation-delay:1.5s] sm:flex">
        <LandingCheck /> Shared with your clinic
      </div>

      <div className="relative z-10 h-[580px] w-[290px] rounded-[44px] bg-[#4a2210] p-[11px] shadow-2xl shadow-[#4a2210]/30">
        <div className="flex h-full flex-col gap-3 overflow-hidden rounded-[34px] bg-[#fff3e0] p-4 text-[#4a2210]">
          <div className="flex items-center justify-between text-[13px] font-semibold">
            Skin scan <PawIcon className="size-5 text-[#8a4b24]" />
          </div>
          <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-[22px] bg-[#e9bf8c]">
            <span className={`${corner} left-3.5 top-3.5 rounded-tl-xl border-b-0 border-r-0`} />
            <span className={`${corner} right-3.5 top-3.5 rounded-tr-xl border-b-0 border-l-0`} />
            <span className={`${corner} bottom-3.5 left-3.5 rounded-bl-xl border-r-0 border-t-0`} />
            <span className={`${corner} bottom-3.5 right-3.5 rounded-br-xl border-l-0 border-t-0`} />
            <DogIcon className="size-36 text-[#4a2210]" />
            <div className="landing-scan absolute inset-x-[8%] h-[3px] rounded bg-[#fff3e0] shadow-[0_0_14px_4px_rgba(255,243,224,0.7)]" />
          </div>
          <div className="rounded-2xl bg-white p-3 text-xs">
            <b className="mb-2 block text-[13px]">Top 3 Skin Conditions</b>
            {MATCHES.map((m) => (
              <div className="mt-1.5 flex items-center gap-2" key={m.label}>
                <span className="w-24 shrink-0">{m.label}</span>
                <span className="h-2 flex-1 rounded bg-[#f3d1a3]">
                  <span className="block h-2 rounded bg-[#8a4b24]" style={{ width: m.width }} />
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function LandingCheck() {
  return (
    <svg aria-hidden="true" className="size-6 text-[#8a4b24]" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  )
}

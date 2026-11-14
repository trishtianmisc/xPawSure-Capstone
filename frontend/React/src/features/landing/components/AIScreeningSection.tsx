import { LandingIcon } from './LandingIcon'
import { Reveal } from './Reveal'
import { ScreeningPreview } from './ScreeningPreview'
import { SectionHeading } from './SectionHeading'

const SCREENING_STEPS = [
  {
    title: 'Capture one image',
    description: 'A single dog skin photo is submitted through the XPawSure mobile app.',
  },
  {
    title: 'Run preliminary screening',
    description:
      'The on-device AI model analyzes the image and returns preliminary predictions.',
  },
  {
    title: 'Support veterinary review',
    description:
      'Veterinarians consider the screening result alongside their clinical examination.',
  },
]

const SCREENING_CATEGORIES = [
  'Allergic dermatitis',
  'Bacterial',
  'Fungal',
  'Hotspot',
  'Mange',
]

export function AIScreeningSection() {
  return (
    <section
      className="scroll-mt-20 bg-amber-950 py-20 dark:border-y dark:border-amber-900/40 sm:py-24"
      id="ai-screening"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <Reveal>
            <SectionHeading
              align="left"
              description="XPawSure uses AI-powered image classification to provide preliminary screening results for possible canine skin conditions, helping veterinary professionals gain additional insights during the consultation process."
              eyebrow="AI-assisted screening"
              invert
              title="AI-Assisted Screening for Better Veterinary Insights."
            />

            <ul className="mt-8 space-y-4">
              {SCREENING_STEPS.map((step) => (
                <li className="flex gap-3" key={step.title}>
                  <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-amber-900/80 text-amber-300 ring-1 ring-amber-700/60">
                    <LandingIcon className="size-3.5" name="check" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-amber-50">{step.title}</p>
                    <p className="mt-0.5 text-sm leading-6 text-amber-100/70">
                      {step.description}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-7">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-amber-300">
                Current screening categories
              </p>
              <ul className="mt-2.5 flex flex-wrap gap-2">
                {SCREENING_CATEGORIES.map((category) => (
                  <li
                    className="rounded-full border border-amber-700/60 bg-amber-900/50 px-2.5 py-1 text-[11px] font-semibold text-amber-100"
                    key={category}
                  >
                    {category}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-8 flex gap-3 rounded-xl border border-amber-600/50 bg-amber-900/50 p-4">
              <LandingIcon
                className="mt-0.5 size-5 shrink-0 text-amber-300"
                name="shield"
              />
              <div>
                <p className="text-sm font-bold text-amber-50">Important</p>
                <p className="mt-1 text-sm leading-6 text-amber-100/80">
                  AI screening is only a supportive preliminary assessment. It does not replace
                  professional veterinary examination, clinical judgment, or a final veterinary
                  diagnosis.
                </p>
              </div>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <ScreeningPreview />
          </Reveal>
        </div>
      </div>
    </section>
  )
}

interface SectionHeadingProps {
  eyebrow: string
  title: string
  description?: string
  align?: 'left' | 'center'
  invert?: boolean
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'center',
  invert = false,
}: SectionHeadingProps) {
  const isCentered = align === 'center'

  return (
    <div className={isCentered ? 'mx-auto max-w-2xl text-center' : 'max-w-xl'}>
      <p
        className={`text-xs font-bold uppercase tracking-[0.2em] ${
          invert ? 'text-amber-300' : 'text-amber-800 dark:text-amber-400'
        }`}
      >
        {eyebrow}
      </p>
      <h2
        className={`mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl ${
          invert ? 'text-amber-50' : 'text-stone-950 dark:text-stone-100'
        }`}
      >
        {title}
      </h2>
      {description ? (
        <p
          className={`mt-4 text-base leading-7 ${
            invert ? 'text-amber-100/80' : 'text-stone-600 dark:text-stone-400'
          }`}
        >
          {description}
        </p>
      ) : null}
    </div>
  )
}

import type { ReactNode } from 'react'

interface PageHeroProps {
  title: string
  subtitle?: string
  avatar?: ReactNode
  meta?: ReactNode
  actions?: ReactNode
}

export function PageHero({ title, subtitle, avatar, meta, actions }: PageHeroProps) {
  return (
    <div className="rounded-md bg-gradient-to-br from-amber-900 to-amber-950 p-7 sm:p-9">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          {avatar}
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">{title}</h1>
            {subtitle && <p className="mt-1 text-amber-100/80">{subtitle}</p>}
            {meta && <div className="mt-2 flex flex-wrap gap-1.5">{meta}</div>}
          </div>
        </div>
        {actions}
      </div>
    </div>
  )
}

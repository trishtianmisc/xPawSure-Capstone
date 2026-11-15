// components/Decor.tsx — reusable circles and paw prints from the brand artwork
import type { CSSProperties } from 'react'
import { PawIcon } from './PawIcon'

type CircleVariant = 'dark' | 'brown' | 'tan' | 'ring' | 'ring-light'

const CIRCLE_STYLES: Record<CircleVariant, string> = {
  dark: 'bg-[#5a2a12]',
  brown: 'bg-[#a9724a]/75',
  tan: 'bg-[#d2a97e]/70',
  ring: 'border-[30px] border-[#d2a97e]/70',
  'ring-light': 'border-[28px] border-[#e9bf8c]',
}

export function DecorCircle({
  variant = 'tan',
  className = '',
}: {
  variant?: CircleVariant
  /** Set size and position here, e.g. "size-72 -right-24 -top-20" */
  className?: string
}) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute rounded-full dark:opacity-20 ${CIRCLE_STYLES[variant]} ${className}`}
    />
  )
}

export function DecorPaw({
  className = '',
  rotate = '0deg',
  delay = '0s',
}: {
  /** Set size, colour and position here, e.g. "size-9 left-[6%] top-10" */
  className?: string
  rotate?: string
  delay?: string
}) {
  return (
    <span
      aria-hidden="true"
      className={`landing-paw pointer-events-none absolute text-[#8a4b24] dark:text-amber-400 ${className}`}
      style={{ '--r': rotate, animationDelay: delay } as CSSProperties}
    >
      <PawIcon className="size-full" />
    </span>
  )
}

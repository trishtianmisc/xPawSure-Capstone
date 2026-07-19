import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  padding?: 'sm' | 'md' | 'lg'
}

const paddingStyles = {
  sm: 'p-5',
  md: 'p-6 sm:p-8',
  lg: 'p-8 sm:p-10',
}

export function Card({ children, className = '', padding = 'md' }: CardProps) {
  return (
    <div className={`rounded-2xl border border-stone-200 bg-white shadow-sm ${paddingStyles[padding]} ${className}`}>
      {children}
    </div>
  )
}

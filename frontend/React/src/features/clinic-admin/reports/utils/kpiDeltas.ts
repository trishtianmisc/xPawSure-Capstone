export type Direction = 'up' | 'down' | 'flat'
export type GoodDirection = 'up' | 'down'

export interface Delta {
  direction: Direction
  text: string
}

export function countDelta(current: number, previous: number): Delta | null {
  if (previous === 0) return null
  const pct = Math.round(((current - previous) / previous) * 100)
  return {
    direction: pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat',
    text: `${pct > 0 ? '+' : ''}${pct}%`,
  }
}

export function rateDelta(current: number, previous: number): Delta {
  const pts = Math.round((current - previous) * 10) / 10
  return {
    direction: pts > 0 ? 'up' : pts < 0 ? 'down' : 'flat',
    text: `${pts > 0 ? '+' : ''}${pts} pts`,
  }
}

export function optionalRateDelta(
  current: number | null,
  previous: number | null,
): Delta | null {
  if (current === null || previous === null) return null
  return rateDelta(current, previous)
}

export function deltaClasses(
  direction: Direction,
  good: GoodDirection,
): string {
  if (direction === 'flat') return 'text-stone-400 dark:text-stone-500'
  const isGood = (direction === 'up') === (good === 'up')
  return isGood
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-red-600 dark:text-red-400'
}

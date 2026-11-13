import { isoToDate, isValidIsoDate, toIsoDate } from '../../pet/lib/date'

export function isWithinDateBounds(value: string, minimum?: string, maximum?: string): boolean {
  return isValidIsoDate(value)
    && (!minimum || value >= minimum)
    && (!maximum || value <= maximum)
}

/** Use local calendar components, clamping stale form values to picker bounds. */
export function vaccinationPickerDate(value: string, minimum?: string, maximum?: string): Date {
  let initial = isValidIsoDate(value) ? value : toIsoDate(new Date())
  if (minimum && initial < minimum) initial = minimum
  if (maximum && initial > maximum) initial = maximum
  return isoToDate(initial)
}

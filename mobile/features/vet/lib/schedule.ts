/**
 * Pure helpers for the vet schedule month view. Kept free of React/Expo
 * imports so the year/month filtering can be unit tested under node.
 */

/** Appointments whose local date falls in the given month/year, sorted by time. */
export function filterAppointmentsForMonth<T extends { apt_scheduled_at: string }>(
  appointments: readonly T[],
  month: number,
  year: number,
): T[] {
  return appointments
    .filter((apt) => {
      const d = new Date(apt.apt_scheduled_at)
      return d.getMonth() === month && d.getFullYear() === year
    })
    .sort((a, b) => a.apt_scheduled_at.localeCompare(b.apt_scheduled_at))
}

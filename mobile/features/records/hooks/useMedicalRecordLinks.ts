import { useRouter } from 'expo-router'

import { consultationNavigation, screeningNavigation } from '../lib/medicalRecordLinks'

/**
 * Records and Screenings are sibling tab stacks, so the source record lives in a
 * different navigator from the one on screen. `dismissTo` dispatches a POP_TO
 * action that only the focused stack handles — crossing tabs logs "not handled
 * by any navigator" and navigates nowhere. `navigate` switches to the target tab
 * and reuses the record already in that stack instead of pushing a duplicate.
 */
export function useMedicalRecordLinks() {
  const router = useRouter()

  const viewScreening = (consultationId: string, screeningId: string, fromScreening?: string) => {
    const destination = screeningNavigation(consultationId, screeningId, fromScreening)
    if (destination.action === 'return') router.navigate(destination.href)
    else router.push(destination.href)
  }

  const viewConsultation = (screeningId: string, consultationId: string, fromConsultation?: string) => {
    const destination = consultationNavigation(screeningId, consultationId, fromConsultation)
    if (destination.action === 'return') router.navigate(destination.href)
    else router.push(destination.href)
  }

  return { viewScreening, viewConsultation }
}

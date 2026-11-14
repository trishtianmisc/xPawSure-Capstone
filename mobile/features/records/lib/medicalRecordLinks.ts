/** Label for a scan's consultation link, keyed to its relationship to the scan. */
export type ConsultationLinkKind = 'ORIGINAL' | 'FOLLOW_UP'

export function consultationLinkLabel(kind: ConsultationLinkKind): string {
  return kind === 'FOLLOW_UP' ? 'View Follow-up Consultation' : 'View Consultation'
}

/** Return to the source record instead of pushing a second copy of it. */
export function screeningNavigation(consultationId: string, screeningId: string, fromScreening?: string) {
  if (screeningId === fromScreening) {
    return { action: 'return', href: `/(owner)/screenings/${screeningId}` } as const
  }
  return {
    action: 'open',
    href: {
      pathname: '/(owner)/screenings/[id]',
      params: { id: screeningId, fromConsultation: consultationId },
    },
  } as const
}

export function consultationNavigation(screeningId: string, consultationId: string, fromConsultation?: string) {
  if (consultationId === fromConsultation) {
    return { action: 'return', href: `/(owner)/records/consultations/${consultationId}` } as const
  }
  return {
    action: 'open',
    href: {
      pathname: '/(owner)/records/consultations/[id]',
      params: { id: consultationId, fromScreening: screeningId },
    },
  } as const
}

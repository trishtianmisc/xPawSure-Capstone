import type { VetScreeningSummary } from '../types'

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function getDiagnosisAgreement(
  screening: Pick<VetScreeningSummary, 'disease'> | null | undefined,
  diagnosis: string | null | undefined,
): boolean | null {
  const disease = normalize(screening?.disease ?? '')
  const vetDiagnosis = normalize(diagnosis ?? '')
  if (!disease || !vetDiagnosis) return null
  return (
    vetDiagnosis === disease ||
    vetDiagnosis.includes(disease) ||
    disease.includes(vetDiagnosis)
  )
}

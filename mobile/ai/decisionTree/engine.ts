import { DISEASE_LABELS } from '../constants/diseases'
import type { DiseaseType, Prediction } from '../types/ai.types'
import type { Answers, Knowledge, RefinedResult } from './types'

const DISEASES = Object.keys(DISEASE_LABELS) as DiseaseType[]

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function refinePredictions(
  predictions: Prediction[],
  answers: Answers,
  knowledge: Knowledge,
): RefinedResult {
  const scores = new Map<DiseaseType, number>()
  for (const disease of DISEASES) {
    scores.set(disease, 0)
  }

  for (const prediction of predictions) {
    scores.set(prediction.disease, prediction.confidence)
  }

  for (const question of knowledge.questions) {
    const selected = answers[question.id]
    if (!selected || selected.length === 0) continue

    for (const optionId of selected) {
      const option = question.options.find((o) => o.id === optionId)
      if (!option) continue

      for (const [disease, vote] of Object.entries(option.votes)) {
        if (vote === undefined) continue
        const current = scores.get(disease as DiseaseType) ?? 0
        scores.set(disease as DiseaseType, current + vote)
      }
    }
  }

  const refined: Prediction[] = DISEASES.map((disease) => ({
    disease,
    confidence: clamp(scores.get(disease) ?? 0, 0, 100),
    label: DISEASE_LABELS[disease],
  })).sort((a, b) => b.confidence - a.confidence)

  const originalTop = [...predictions].sort((a, b) => b.confidence - a.confidence)[0]
  const refinedTop = refined[0]

  return {
    refined,
    originalTop,
    refinedTop,
    changed: originalTop.disease !== refinedTop.disease,
  }
}

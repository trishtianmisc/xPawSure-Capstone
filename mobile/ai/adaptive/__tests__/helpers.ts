import type { DiseaseType, Prediction } from '../../types/ai.types.ts'
import type { DecisionOption, DecisionQuestion, Knowledge } from '../../decisionTree/types.ts'
import { ADAPTIVE_CONFIG } from '../config.ts'
import type { AdaptiveConfig, ProbabilityDistribution } from '../types.ts'
import { DISEASES } from '../types.ts'
import type { DiseaseLabels } from '../session.ts'

export const TEST_LABELS: DiseaseLabels = {
  ALLERGIC_DERMATITIS: 'Allergic Dermatitis',
  BACTERIAL: 'Bacterial',
  FUNGAL: 'Fungal',
  HOTSPOT: 'Hotspot',
  MANGE: 'Mange',
}

export const TEST_CONFIG: AdaptiveConfig = {
  ...ADAPTIVE_CONFIG,
  mode: 'adaptive',
  minExpectedInformationGain: 0.001,
  visualEvidenceWeight: 1,
  uncertaintyTopProbability: 0.45,
  uncertaintyMargin: 0.1,
  uncertaintyEntropy: 1.5,
  validatedStoppingCriterion: null,
}

export function makeKnowledge(questions: DecisionQuestion[]): Knowledge {
  return { source: 'MOCK', questions }
}

export function option(
  id: string,
  votes: Partial<Record<DiseaseType, number>> = {},
): DecisionOption {
  return { id, label: id, votes }
}

export function question(
  id: string,
  options: DecisionOption[],
  multi = false,
): DecisionQuestion {
  return { id, text: id, options, multi }
}

export function distribution(
  values: Partial<Record<DiseaseType, number>>,
): ProbabilityDistribution {
  const result = {} as ProbabilityDistribution
  let total = 0
  for (const disease of DISEASES) {
    const value = values[disease] ?? 0
    result[disease] = value
    total += value
  }
  if (total <= 0) {
    for (const disease of DISEASES) result[disease] = 1 / DISEASES.length
    return result
  }
  for (const disease of DISEASES) result[disease] /= total
  return result
}

export function predictionsFrom(
  values: Partial<Record<DiseaseType, number>>,
): Prediction[] {
  const p = distribution(values)
  return DISEASES.map((disease) => ({
    disease,
    confidence: Math.round(p[disease] * 10000) / 100,
    label: TEST_LABELS[disease],
  }))
}

export function uniformPredictions(): Prediction[] {
  return DISEASES.map((disease) => ({
    disease,
    confidence: 20,
    label: TEST_LABELS[disease],
  }))
}

export function predictionsFor(
  disease: DiseaseType,
  confidence = 80,
): Prediction[] {
  const remaining = (100 - confidence) / (DISEASES.length - 1)
  return DISEASES.map((candidate) => ({
    disease: candidate,
    confidence: candidate === disease ? confidence : Math.round(remaining * 100) / 100,
    label: TEST_LABELS[candidate],
  }))
}

export function sum(values: Partial<Record<DiseaseType, number>>): number {
  return DISEASES.reduce((total, disease) => total + (values[disease] ?? 0), 0)
}

import { DISEASES } from './types.ts'
import type { DiseaseType } from '../types/ai.types.ts'
import type { Likelihoods, ProbabilityDistribution } from './types.ts'

export function createDistribution(fill = 0): ProbabilityDistribution {
  return {
    ALLERGIC_DERMATITIS: fill,
    BACTERIAL: fill,
    FUNGAL: fill,
    HOTSPOT: fill,
    MANGE: fill,
  }
}

export function uniformDistribution(): ProbabilityDistribution {
  return createDistribution(1 / DISEASES.length)
}

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

/**
 * Normalise non-negative weights into a distribution over the five conditions.
 * Missing, negative, NaN and infinite values are treated as zero. An all-zero
 * vector falls back to the uniform distribution so callers never receive NaN.
 */
export function normalizeDistribution(
  values: Partial<Record<DiseaseType, number>>,
  floor = 0,
): ProbabilityDistribution {
  const safeFloor = Number.isFinite(floor) && floor > 0 ? floor : 0
  const raw: number[] = []

  for (const disease of DISEASES) {
    const value = values[disease]
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
      raw.push(safeFloor)
    } else {
      raw.push(Math.max(value, safeFloor))
    }
  }

  const total = raw.reduce((sum, value) => sum + value, 0)
  if (!Number.isFinite(total) || total <= 0) {
    return uniformDistribution()
  }

  const result = createDistribution(0)
  let assigned = 0
  DISEASES.forEach((disease, index) => {
    const p = raw[index] / total
    result[disease] = p
    assigned += p
  })

  // Correct floating-point drift on the largest entry. This guarantees that
  // the stored distribution sums to 1 within the limits of float64.
  const drift = 1 - assigned
  if (drift !== 0) {
    const top = argmaxDisease(result)
    result[top] = Math.max(0, result[top] + drift)
  }

  return result
}

/**
 * Smooth a distribution before using it as a prior. This is a numerical and
 * over-confidence guard, not a calibration procedure.
 */
export function smoothDistribution(
  distribution: Partial<Record<DiseaseType, number>>,
  smoothing: number,
): ProbabilityDistribution {
  const base = normalizeDistribution(distribution)
  const amount = Number.isFinite(smoothing) && smoothing > 0 ? smoothing : 0
  const values = createDistribution(0)
  for (const disease of DISEASES) {
    values[disease] = base[disease] + amount
  }
  return normalizeDistribution(values)
}

export function fillLikelihoods(
  likelihoods: Partial<Record<DiseaseType, number>>,
  floor = 0,
): Likelihoods {
  const safeFloor = Number.isFinite(floor) && floor > 0 ? floor : 0
  const result = createDistribution(safeFloor) as Likelihoods

  for (const disease of DISEASES) {
    const value = likelihoods[disease]
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
      result[disease] = Math.max(value, safeFloor)
    }
  }

  return result
}

export function sumDistribution(distribution: Partial<Record<DiseaseType, number>>): number {
  return DISEASES.reduce((sum, disease) => {
    const value = distribution[disease]
    return sum + (typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0)
  }, 0)
}

/**
 * Shannon entropy in bits. Zero-probability classes contribute zero.
 */
export function entropyBits(distribution: Partial<Record<DiseaseType, number>>): number {
  const normalized = normalizeDistribution(distribution)
  let entropy = 0

  for (const disease of DISEASES) {
    const p = normalized[disease]
    if (p > 0) {
      entropy -= p * Math.log2(p)
    }
  }

  // Floating-point noise can produce -0 or a tiny negative value.
  return Math.max(0, entropy)
}

export function argmaxDisease(distribution: Partial<Record<DiseaseType, number>>): DiseaseType {
  let best: DiseaseType = DISEASES[0]
  let bestValue = -Infinity

  for (const disease of DISEASES) {
    const value = distribution[disease]
    const safe = typeof value === 'number' && Number.isFinite(value) ? value : -Infinity
    // Strict comparison preserves the fixed DISEASES order for exact ties.
    if (safe > bestValue) {
      best = disease
      bestValue = safe
    }
  }

  return best
}

export function topTwo(
  distribution: Partial<Record<DiseaseType, number>>,
): { top: DiseaseType; second: DiseaseType; topProbability: number; secondProbability: number } {
  const sorted = [...DISEASES].sort((a, b) => {
    const pa = distribution[a] ?? 0
    const pb = distribution[b] ?? 0
    if (pb !== pa) return pb - pa
    return DISEASES.indexOf(a) - DISEASES.indexOf(b)
  })

  return {
    top: sorted[0],
    second: sorted[1],
    topProbability: distribution[sorted[0]] ?? 0,
    secondProbability: distribution[sorted[1]] ?? 0,
  }
}

export function softmax(logits: number[]): number[] {
  if (logits.length === 0) return []

  const max = Math.max(...logits)
  if (!Number.isFinite(max)) {
    return logits.map(() => 1 / logits.length)
  }

  const weights = logits.map((logit) => {
    if (!Number.isFinite(logit)) return 0
    return Math.exp(logit - max)
  })

  const total = weights.reduce((sum, weight) => sum + weight, 0)
  if (!Number.isFinite(total) || total <= 0) {
    return logits.map(() => 1 / logits.length)
  }

  return weights.map((weight) => weight / total)
}

export function sigmoid(value: number): number {
  if (!Number.isFinite(value)) {
    return value > 0 ? 1 : 0
  }
  if (value >= 0) {
    const z = Math.exp(-value)
    return 1 / (1 + z)
  }
  const z = Math.exp(value)
  return z / (1 + z)
}

export function logit(probability: number): number {
  const p = Math.min(1 - 1e-12, Math.max(1e-12, probability))
  return Math.log(p / (1 - p))
}

/**
 * Temper a Bernoulli probability towards 0.5. Used to discount redundant or
 * image-coupled questionnaire evidence without changing its direction.
 */
export function temperProbability(probability: number, weight: number): number {
  const safeWeight = Number.isFinite(weight) ? Math.max(0, weight) : 1
  const p = Math.min(1 - 1e-12, Math.max(1e-12, probability))
  return Math.min(1 - 1e-9, Math.max(1e-9, sigmoid(logit(p) * safeWeight)))
}

/**
 * Temper a categorical distribution and re-normalise it. Equivalent to raising
 * each probability to `weight` and re-normalising, computed in log space.
 */
export function temperCategorical(probabilities: number[], weight: number): number[] {
  const safeWeight = Number.isFinite(weight) ? Math.max(0, weight) : 1
  const logits = probabilities.map((probability) =>
    Math.log(Math.max(1e-12, probability)) * safeWeight,
  )
  return softmax(logits)
}

export interface BayesUpdateResult {
  posterior: ProbabilityDistribution
  usedFloor: boolean
  logEvidence: number
}

/**
 * Bayes update in log space.
 *
 * P(condition | answer) is proportional to P(answer | condition) * P(condition).
 * The likelihood vector does not need to sum to 1: multi-select evidence is a
 * partial likelihood. A floor prevents log(0); if the entire update is
 * non-finite the prior is returned unchanged rather than emitting NaN.
 */
export function bayesUpdate(
  prior: Partial<Record<DiseaseType, number>>,
  likelihoods: Partial<Record<DiseaseType, number>>,
  floor = 1e-9,
): BayesUpdateResult {
  const safePrior = normalizeDistribution(prior)
  const safeLikelihoods = fillLikelihoods(likelihoods, floor)

  let usedFloor = false
  for (const disease of DISEASES) {
    if (safePrior[disease] <= floor || safeLikelihoods[disease] <= floor) {
      usedFloor = true
    }
  }

  // A likelihood vector that is constant across conditions (for example the
  // "Not sure" answer, or an all-zero vector lifted to the floor) multiplies
  // every class by the same value. It therefore carries no evidence and the
  // posterior is exactly the prior. Short-circuiting also avoids drifting the
  // prior's zero entries through the log-floor path.
  const likelihoodValues = DISEASES.map((disease) => safeLikelihoods[disease])
  const minLikelihood = Math.min(...likelihoodValues)
  const maxLikelihood = Math.max(...likelihoodValues)
  if (maxLikelihood - minLikelihood <= 1e-12 * Math.max(1, maxLikelihood)) {
    return {
      posterior: safePrior,
      usedFloor,
      logEvidence: Math.log(Math.max(maxLikelihood, floor)),
    }
  }

  const logScores: number[] = []

  for (const disease of DISEASES) {
    const p = safePrior[disease]
    const likelihood = safeLikelihoods[disease]
    logScores.push(Math.log(Math.max(p, floor)) + Math.log(Math.max(likelihood, floor)))
  }

  const maxLog = Math.max(...logScores)
  if (!Number.isFinite(maxLog)) {
    return { posterior: safePrior, usedFloor: true, logEvidence: 0 }
  }

  const weights = logScores.map((score) => {
    if (!Number.isFinite(score)) return 0
    return Math.exp(score - maxLog)
  })

  const total = weights.reduce((sum, weight) => sum + weight, 0)
  if (!Number.isFinite(total) || total <= 0) {
    return { posterior: safePrior, usedFloor: true, logEvidence: 0 }
  }

  const posterior = normalizeDistribution(
    DISEASES.reduce<Partial<Record<DiseaseType, number>>>((acc, disease, index) => {
      acc[disease] = weights[index]
      return acc
    }, {}),
  )

  return {
    posterior,
    usedFloor,
    logEvidence: maxLog + Math.log(total),
  }
}

/**
 * Expected information gain in bits:
 *
 * IG(Q) = H(P) - sum_a P(a) * H(P(condition | a))
 *
 * `answerLikelihoods` contains one likelihood vector per possible answer. For
 * a proper categorical question these vectors sum to 1 across answers for each
 * condition. The function also tolerates partial likelihoods by re-normalising
 * the predictive answer weights.
 */
export function expectedInformationGain(
  prior: Partial<Record<DiseaseType, number>>,
  answerLikelihoods: Array<Partial<Record<DiseaseType, number>>>,
  floor = 1e-9,
): number {
  if (answerLikelihoods.length === 0) return 0

  const safePrior = normalizeDistribution(prior, floor)
  const baseEntropy = entropyBits(safePrior)

  const predictiveWeights: number[] = []
  const posteriorEntropies: number[] = []

  for (const likelihoods of answerLikelihoods) {
    const safeLikelihoods = fillLikelihoods(likelihoods, floor)
    let predictive = 0
    for (const disease of DISEASES) {
      predictive += safePrior[disease] * safeLikelihoods[disease]
    }

    if (!Number.isFinite(predictive) || predictive <= 0) {
      predictiveWeights.push(0)
      posteriorEntropies.push(baseEntropy)
      continue
    }

    const { posterior } = bayesUpdate(safePrior, safeLikelihoods, floor)
    predictiveWeights.push(predictive)
    posteriorEntropies.push(entropyBits(posterior))
  }

  const totalPredictive = predictiveWeights.reduce((sum, value) => sum + value, 0)
  if (!Number.isFinite(totalPredictive) || totalPredictive <= 0) {
    return 0
  }

  let expectedPosteriorEntropy = 0
  for (let i = 0; i < predictiveWeights.length; i += 1) {
    const probability = predictiveWeights[i] / totalPredictive
    expectedPosteriorEntropy += probability * posteriorEntropies[i]
  }

  return Math.max(0, Math.min(baseEntropy, baseEntropy - expectedPosteriorEntropy))
}

/**
 * Realised entropy reduction after observing one answer. This is an evidence
 * ranking statistic, not a measure of clinical importance.
 */
export function realizedInformationGain(
  prior: Partial<Record<DiseaseType, number>>,
  posterior: Partial<Record<DiseaseType, number>>,
): number {
  return Math.max(0, entropyBits(prior) - entropyBits(posterior))
}

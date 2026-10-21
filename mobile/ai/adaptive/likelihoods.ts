import { DISEASES } from './types.ts'
import type { DiseaseType } from '../types/ai.types.ts'
import type { DecisionOption, DecisionQuestion, Knowledge } from '../decisionTree/types.ts'
import type {
  Likelihoods,
  LikelihoodProfile,
  QuestionLikelihood,
} from './types.ts'
import { VET_VOTE_PROFILE_META, MAX_ABS_VOTE, evidenceGroupFor } from './config.ts'
import {
  fillLikelihoods,
  softmax,
  sigmoid,
  temperCategorical,
  temperProbability,
} from './math.ts'

/**
 * Enumerating every multi-select answer subset is 2^n. The current location
 * question has 9 options (512 subsets). Above this cap the selector falls back
 * to a per-option approximation.
 */
export const MAX_ENUMERATED_OPTIONS = 12

function clampProbability(value: number): number {
  if (!Number.isFinite(value)) return 0.5
  return Math.min(1 - 1e-9, Math.max(1e-9, value))
}

/**
 * An option is neutral when the vet consensus assigned it no weight for any
 * condition (for example "Not sure"). Neutral answers are not negative
 * symptoms: they receive equal likelihood across all five classes and
 * therefore leave the posterior unchanged.
 */
export function isNeutralOption(option: DecisionOption): boolean {
  return DISEASES.every((disease) => {
    const vote = option.votes[disease] ?? 0
    return !Number.isFinite(vote) || vote === 0
  })
}

/**
 * Build an explicit likelihood profile from the existing vet-consensus vote
 * weights. See `VET_VOTE_PROFILE_META.mapping` for the transformation.
 *
 * This is NOT a validated likelihood model. It exists so the adaptive
 * machinery can be exercised and reviewed without fabricating a new clinical
 * table. Replace it with a profile whose `validation` is `validated` before
 * making clinical claims.
 */
export function buildVetVoteLikelihoodProfile(
  knowledge: Knowledge,
  maxLogLikelihoodRatio: number = Math.log(4),
): LikelihoodProfile {
  const maxLog = Number.isFinite(maxLogLikelihoodRatio) && maxLogLikelihoodRatio > 0
    ? maxLogLikelihoodRatio
    : Math.log(4)

  const questions: Record<string, QuestionLikelihood> = {}

  for (const question of knowledge.questions) {
    const optionIds = question.options.map((option) => option.id)
    const options: Record<string, Likelihoods> = {}
    const multi = question.multi === true
    const neutralOptions = question.options
      .filter((option) => isNeutralOption(option))
      .map((option) => option.id)
    const neutralOptionIds = new Set(neutralOptions)
    const informativeOptions = question.options.filter(
      (option) => !neutralOptionIds.has(option.id),
    )

    if (multi) {
      for (const option of question.options) {
        if (neutralOptionIds.has(option.id)) {
          // A constant Bernoulli probability across conditions leaves the
          // posterior unchanged whether the option is selected or not.
          options[option.id] = fillLikelihoods({}, 0.5)
          continue
        }

        const likelihoods = fillLikelihoods({}, 1e-9)
        for (const disease of DISEASES) {
          const vote = option.votes[disease] ?? 0
          const logit = (vote / MAX_ABS_VOTE) * maxLog
          likelihoods[disease] = clampProbability(sigmoid(logit))
        }
        options[option.id] = likelihoods
      }
    } else {
      // Single-choice: softmax the informative option votes per condition so
      // each condition has a proper distribution over the informative answers.
      // Neutral answers are modelled separately as a no-evidence likelihood of
      // 1 for every condition.
      if (informativeOptions.length > 0) {
        const perDisease = new Map<DiseaseType, number[]>()
        for (const disease of DISEASES) {
          const logits = informativeOptions.map((option) =>
            ((option.votes[disease] ?? 0) / MAX_ABS_VOTE) * maxLog,
          )
          perDisease.set(disease, softmax(logits))
        }

        informativeOptions.forEach((option, optionIndex) => {
          const likelihoods = fillLikelihoods({}, 1e-9)
          for (const disease of DISEASES) {
            const probabilities = perDisease.get(disease) ?? []
            likelihoods[disease] = clampProbability(probabilities[optionIndex] ?? 0)
          }
          options[option.id] = likelihoods
        })
      }

      for (const option of question.options) {
        if (neutralOptionIds.has(option.id)) {
          options[option.id] = fillLikelihoods({}, 1)
        }
      }
    }

    questions[question.id] = {
      questionId: question.id,
      multi,
      evidenceGroup: evidenceGroupFor(question.id),
      neutralOptions,
      options: Object.fromEntries(
        Object.entries(options).filter(([optionId]) => optionIds.includes(optionId)),
      ),
    }
  }

  return {
    ...VET_VOTE_PROFILE_META,
    questions,
  }
}

/**
 * Validate coverage and basic probability invariants. Returns human-readable
 * errors; an empty array means the profile is structurally usable.
 */
export function validateLikelihoodProfile(
  profile: LikelihoodProfile,
  knowledge: Knowledge,
): string[] {
  const errors: string[] = []

  for (const question of knowledge.questions) {
    const qProfile = profile.questions[question.id]
    if (!qProfile) {
      errors.push(`Missing likelihoods for question ${question.id}`)
      continue
    }

    if (qProfile.multi !== (question.multi === true)) {
      errors.push(`Multi-select flag mismatch for question ${question.id}`)
    }

    const optionIds = new Set(question.options.map((option) => option.id))
    const neutralOptionIds = new Set(qProfile.neutralOptions)

    for (const neutralOptionId of qProfile.neutralOptions) {
      if (!optionIds.has(neutralOptionId)) {
        errors.push(`Unknown neutral option ${neutralOptionId} in ${question.id}`)
      }
    }

    for (const option of question.options) {
      const likelihoods = qProfile.options[option.id]
      if (!likelihoods) {
        errors.push(`Missing likelihoods for ${question.id}/${option.id}`)
        continue
      }

      for (const disease of DISEASES) {
        const value = likelihoods[disease]
        if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value > 1) {
          errors.push(
            `Invalid likelihood for ${question.id}/${option.id}/${disease}: ${String(value)}`,
          )
        }
      }

      if (neutralOptionIds.has(option.id)) {
        const reference = likelihoods[DISEASES[0]]
        for (const disease of DISEASES) {
          if (Math.abs(likelihoods[disease] - reference) > 1e-6) {
            errors.push(
              `Neutral option ${question.id}/${option.id} is not equal across conditions`,
            )
            break
          }
        }
      }
    }

    for (const optionId of Object.keys(qProfile.options)) {
      if (!optionIds.has(optionId)) {
        errors.push(`Unknown option ${optionId} in ${question.id}`)
      }
    }

    if (!qProfile.multi) {
      const informativeOptions = question.options.filter(
        (option) => !neutralOptionIds.has(option.id),
      )
      if (informativeOptions.length > 0) {
        for (const disease of DISEASES) {
          const sum = informativeOptions.reduce(
            (total, option) => total + (qProfile.options[option.id]?.[disease] ?? 0),
            0,
          )
          if (Math.abs(sum - 1) > 1e-6) {
            errors.push(
              `Single-choice likelihoods for ${question.id}/${disease} sum to ${sum}, expected 1`,
            )
          }
        }
      }
    }
  }

  return errors
}

function temperSingleChoiceLikelihoods(
  question: DecisionQuestion,
  selectedOptionId: string,
  profile: LikelihoodProfile,
  weight: number,
): Likelihoods {
  const qProfile = profile.questions[question.id]
  if (!qProfile) {
    throw new Error(`No likelihoods configured for question ${question.id}`)
  }

  const selectedIndex = question.options.findIndex((option) => option.id === selectedOptionId)
  if (selectedIndex < 0) {
    throw new Error(`Unknown option ${selectedOptionId} for question ${question.id}`)
  }

  // Neutral answers carry no symptom evidence: identical likelihood for every
  // condition, so Bayes' rule leaves the posterior untouched.
  if (qProfile.neutralOptions.includes(selectedOptionId)) {
    return fillLikelihoods({}, 1)
  }

  const informativeOptions = question.options.filter(
    (option) => !qProfile.neutralOptions.includes(option.id),
  )
  const informativeIndex = informativeOptions.findIndex(
    (option) => option.id === selectedOptionId,
  )
  if (informativeIndex < 0) {
    throw new Error(`Option ${selectedOptionId} is not informative for question ${question.id}`)
  }

  const result = fillLikelihoods({}, 1e-9)

  for (const disease of DISEASES) {
    const probabilities = informativeOptions.map((option) => {
      const value = qProfile.options[option.id]?.[disease]
      return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 1e-12
    })
    const tempered = temperCategorical(probabilities, weight)
    result[disease] = clampProbability(tempered[informativeIndex] ?? 0)
  }

  return result
}

/**
 * Likelihood for an observed single-choice answer under the tempered
 * categorical model.
 */
export function observedSingleChoiceLikelihoods(
  question: DecisionQuestion,
  selectedOptionId: string,
  profile: LikelihoodProfile,
  weight: number,
): Likelihoods {
  return temperSingleChoiceLikelihoods(question, selectedOptionId, profile, weight)
}

/**
 * Likelihood vectors for the informative answers to a single-choice question.
 * Neutral answers are excluded because they convey exactly zero information;
 * including them would require inventing a "Not sure" response rate.
 */
export function informativeSingleChoiceLikelihoods(
  question: DecisionQuestion,
  profile: LikelihoodProfile,
  weight: number,
): Likelihoods[] {
  const qProfile = profile.questions[question.id]
  if (!qProfile) {
    throw new Error(`No likelihoods configured for question ${question.id}`)
  }

  return question.options
    .filter((option) => !qProfile.neutralOptions.includes(option.id))
    .map((option) => temperSingleChoiceLikelihoods(question, option.id, profile, weight))
}

/**
 * Likelihood vectors for all possible answers to a single-choice question.
 * Used for expected information gain.
 */
export function allSingleChoiceLikelihoods(
  question: DecisionQuestion,
  profile: LikelihoodProfile,
  weight: number,
): Likelihoods[] {
  return question.options.map((option) =>
    temperSingleChoiceLikelihoods(question, option.id, profile, weight),
  )
}

/**
 * Positive-only multi-select model.
 *
 * For each option, p_o(c) = P(option selected | condition c). The tempered
 * Bernoulli model is:
 *
 *   P(selected_o | c)     = p_o(c) / (1 + p_o(c))
 *   P(not selected_o | c) = 1 / (1 + p_o(c))
 *
 * The product over options is a proper distribution over all answer subsets.
 * Unselected options therefore contribute only weak evidence (the 1/(1+p)
 * term), not a hard negative symptom.
 */
function temperedMultiSelectProbabilities(
  question: DecisionQuestion,
  profile: LikelihoodProfile,
  weight: number,
): Record<string, Likelihoods> {
  const qProfile = profile.questions[question.id]
  if (!qProfile) {
    throw new Error(`No likelihoods configured for question ${question.id}`)
  }

  const result: Record<string, Likelihoods> = {}
  for (const option of question.options) {
    const likelihoods = fillLikelihoods({}, 1e-9)
    for (const disease of DISEASES) {
      const value = qProfile.options[option.id]?.[disease]
      const p = typeof value === 'number' && Number.isFinite(value) ? value : 0.5
      // Raw tempered Bernoulli probability. The positive-only normalisation is
      // applied when a subset is evaluated.
      likelihoods[disease] = temperProbability(p, weight)
    }
    result[option.id] = likelihoods
  }
  return result
}

function multiSelectSubsetLikelihood(
  question: DecisionQuestion,
  selectedOptionIds: string[],
  profile: LikelihoodProfile,
  weight: number,
): Likelihoods {
  const perOption = temperedMultiSelectProbabilities(question, profile, weight)
  const selected = new Set(selectedOptionIds)
  const result = fillLikelihoods({}, 1e-12)

  for (const disease of DISEASES) {
    let product = 1
    for (const option of question.options) {
      const p = perOption[option.id]?.[disease] ?? 0
      const probability = selected.has(option.id) ? p / (1 + p) : 1 / (1 + p)
      product *= probability
    }
    result[disease] = clampProbability(product)
  }

  return result
}

/**
 * Likelihood for an observed multi-select answer.
 */
export function observedMultiSelectLikelihoods(
  question: DecisionQuestion,
  selectedOptionIds: string[],
  profile: LikelihoodProfile,
  weight: number,
): Likelihoods {
  return multiSelectSubsetLikelihood(question, selectedOptionIds, profile, weight)
}

/**
 * Enumerate every possible multi-select answer subset and its likelihood
 * vector. Returns null when the option count exceeds the enumeration cap.
 */
export function allMultiSelectLikelihoods(
  question: DecisionQuestion,
  profile: LikelihoodProfile,
  weight: number,
): Likelihoods[] | null {
  if (question.options.length > MAX_ENUMERATED_OPTIONS) return null

  const subsets: string[][] = []
  const count = 1 << question.options.length
  // The UI requires at least one selected location. Exclude the empty subset
  // so expected information gain reflects the actual answer space. The
  // likelihood model itself still defines the empty subset for completeness.
  for (let mask = 1; mask < count; mask += 1) {
    const subset: string[] = []
    for (let i = 0; i < question.options.length; i += 1) {
      if ((mask & (1 << i)) !== 0) subset.push(question.options[i].id)
    }
    subsets.push(subset)
  }

  return subsets.map((subset) =>
    multiSelectSubsetLikelihood(question, subset, profile, weight),
  )
}

/**
 * Per-option fallback for a multi-select question with too many options to
 * enumerate. Each option is treated as an independent positive-only Bernoulli
 * observation; the returned values are the individual likelihood vectors.
 * The selector averages their information gains rather than pretending they
 * are independent evidence for the whole question.
 */
export function perOptionMultiSelectLikelihoods(
  question: DecisionQuestion,
  profile: LikelihoodProfile,
  weight: number,
): Array<{ selected: Likelihoods; notSelected: Likelihoods; selectedProbability: Likelihoods }> {
  const perOption = temperedMultiSelectProbabilities(question, profile, weight)
  return question.options.map((option) => {
    const selected = fillLikelihoods({}, 1e-12)
    const notSelected = fillLikelihoods({}, 1e-12)
    const selectedProbability = fillLikelihoods({}, 1e-12)
    for (const disease of DISEASES) {
      const p = perOption[option.id]?.[disease] ?? 0.5
      selected[disease] = p / (1 + p)
      notSelected[disease] = 1 / (1 + p)
      selectedProbability[disease] = p
    }
    return { selected, notSelected, selectedProbability }
  })
}

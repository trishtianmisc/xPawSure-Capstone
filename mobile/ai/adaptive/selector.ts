import type { Answers, DecisionQuestion, Knowledge } from '../decisionTree/types.ts'
import type {
  AdaptiveConfig,
  ApplicabilityRules,
  LikelihoodProfile,
  ProbabilityDistribution,
  QuestionnaireStrategy,
  SelectionResult,
} from './types.ts'
import {
  allMultiSelectLikelihoods,
  informativeSingleChoiceLikelihoods,
  perOptionMultiSelectLikelihoods,
} from './likelihoods.ts'
import { combinedEvidenceWeight } from './redundancy.ts'
import { expectedInformationGain } from './math.ts'

export function resolveStrategy(
  config: Pick<AdaptiveConfig, 'mode'>,
  profile: LikelihoodProfile | null,
): QuestionnaireStrategy {
  if (config.mode === 'rule_based') return 'fixed_order'
  if (!profile) return 'fixed_order'
  if (config.mode === 'auto' && profile.validation !== 'validated') {
    return 'fixed_order'
  }
  return 'information_gain'
}

export function hasAnswer(answers: Answers, questionId: string): boolean {
  return (answers[questionId]?.length ?? 0) > 0
}

export function isQuestionApplicable(
  questionId: string,
  answers: Answers,
  applicability: ApplicabilityRules | undefined,
): boolean {
  const rule = applicability?.[questionId]
  if (!rule) return true
  try {
    return rule(answers) === true
  } catch {
    // A broken applicability rule must never crash the questionnaire.
    return false
  }
}

function hasUsableLikelihoods(
  question: DecisionQuestion,
  profile: LikelihoodProfile,
): boolean {
  const qProfile = profile.questions[question.id]
  if (!qProfile || question.options.length === 0) return false
  return question.options.every((option) => Boolean(qProfile.options[option.id]))
}

/**
 * Expected information gain for one question under the current posterior.
 * The same redundancy and image-coupling weights that will be used for the
 * actual Bayesian update are applied here.
 */
export function questionInformationGain(
  question: DecisionQuestion,
  prior: ProbabilityDistribution,
  answers: Answers,
  knowledge: Knowledge,
  profile: LikelihoodProfile,
  config: AdaptiveConfig,
): number {
  const weight = combinedEvidenceWeight(question.id, answers, knowledge, config).combined

  if (question.multi) {
    const enumerated = allMultiSelectLikelihoods(question, profile, weight)
    if (enumerated) {
      return expectedInformationGain(prior, enumerated, config.probabilityFloor)
    }

    // More than MAX_ENUMERATED_OPTIONS: average the information gain of each
    // positive-only binary option. This is explicitly an approximation and is
    // never presented as a full joint expected information gain.
    const perOption = perOptionMultiSelectLikelihoods(question, profile, weight)
    if (perOption.length === 0) return 0
    const gains = perOption.map((option) =>
      expectedInformationGain(
        prior,
        [option.selected, option.notSelected],
        config.probabilityFloor,
      ),
    )
    return gains.reduce((sum, gain) => sum + gain, 0) / gains.length
  }

  const answerLikelihoods = informativeSingleChoiceLikelihoods(question, profile, weight)
  return expectedInformationGain(prior, answerLikelihoods, config.probabilityFloor)
}

export interface SelectNextQuestionParams {
  knowledge: Knowledge
  answers: Answers
  prior: ProbabilityDistribution
  profile: LikelihoodProfile | null
  config: AdaptiveConfig
  questionCount: number
  applicability?: ApplicabilityRules
}

/**
 * Choose the next question.
 *
 * Selection is deterministic: highest expected information gain, then original
 * knowledge order, then question id. Questions that are already answered, not
 * applicable, or lack likelihoods are excluded.
 */
export function selectNextQuestion(params: SelectNextQuestionParams): SelectionResult {
  const {
    knowledge,
    answers,
    prior,
    profile,
    config,
    questionCount,
    applicability,
  } = params

  const maxQuestions = Number.isFinite(config.maxQuestions)
    ? Math.max(0, Math.floor(config.maxQuestions))
    : 0
  if (questionCount >= maxQuestions) {
    return {
      question: null,
      expectedInformationGain: 0,
      redundancyWeight: 1,
      stopReason: 'max_questions',
    }
  }

  const strategy = resolveStrategy(config, profile)

  if (strategy === 'fixed_order') {
    const next = knowledge.questions.find(
      (question) =>
        !hasAnswer(answers, question.id) &&
        isQuestionApplicable(question.id, answers, applicability),
    )
    if (!next) {
      return {
        question: null,
        expectedInformationGain: 0,
        redundancyWeight: 1,
        stopReason: 'all_questions_answered',
      }
    }
    return {
      question: next,
      expectedInformationGain: 0,
      redundancyWeight: 1,
      stopReason: null,
    }
  }

  if (!profile) {
    return {
      question: null,
      expectedInformationGain: 0,
      redundancyWeight: 1,
      stopReason: 'profile_unavailable',
    }
  }

  const order = new Map(knowledge.questions.map((question, index) => [question.id, index]))
  const candidates = knowledge.questions
    .filter((question) => !hasAnswer(answers, question.id))
    .filter((question) => isQuestionApplicable(question.id, answers, applicability))
    .filter((question) => hasUsableLikelihoods(question, profile))
    .map((question) => ({
      question,
      expectedInformationGain: questionInformationGain(
        question,
        prior,
        answers,
        knowledge,
        profile,
        config,
      ),
      redundancyWeight: combinedEvidenceWeight(
        question.id,
        answers,
        knowledge,
        config,
      ).redundancy,
    }))

  if (candidates.length === 0) {
    return {
      question: null,
      expectedInformationGain: 0,
      redundancyWeight: 1,
      stopReason: 'all_questions_answered',
    }
  }

  candidates.sort((a, b) => {
    const gainDifference = b.expectedInformationGain - a.expectedInformationGain
    if (Math.abs(gainDifference) > 1e-12) return gainDifference
    const orderDifference =
      (order.get(a.question.id) ?? Number.MAX_SAFE_INTEGER) -
      (order.get(b.question.id) ?? Number.MAX_SAFE_INTEGER)
    if (orderDifference !== 0) return orderDifference
    return a.question.id.localeCompare(b.question.id)
  })

  const best = candidates[0]
  if (!Number.isFinite(best.expectedInformationGain) ||
      best.expectedInformationGain < config.minExpectedInformationGain) {
    return {
      question: null,
      expectedInformationGain: Math.max(0, best.expectedInformationGain),
      redundancyWeight: best.redundancyWeight,
      stopReason: 'no_meaningful_question',
    }
  }

  return {
    question: best.question,
    expectedInformationGain: best.expectedInformationGain,
    redundancyWeight: best.redundancyWeight,
    stopReason: null,
  }
}

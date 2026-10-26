import type {
  ClaudeApiStatus,
  ClaudeValidationDecision,
  ClaudeValidationStatus,
} from '../types/ai.types'

export const CLAUDE_VALIDATION_MAX_IMAGES = 3
export const CLAUDE_SESSION_CALL_LIMIT = 3
export const CLAUDE_MAX_ATTEMPTS_PER_IMAGE = 2

export interface ClaudeAnalysisPayload {
  status: string
  result?: {
    image_suitability?: string
    screening_eligibility?: string
    screening_message?: string
  } | null
  token?: string
  detail?: string
}

export interface ClaudeTransportFailure {
  failureStatus: ClaudeValidationStatus
}

export type ClaudeCallOutcome = ClaudeAnalysisPayload | ClaudeTransportFailure | null

export interface ClaudeValidationIO {
  callApi: (imageUri: string) => Promise<ClaudeCallOutcome>
  shaFor: (imageUri: string) => Promise<string>
}

export interface ValidationTarget {
  index: number
  uri: string
}

export interface ValidationSessionState {
  callsUsed: number
  cache: Record<string, ClaudeValidationDecision>
}

export interface EligibilityResult {
  approved: number[]
  blocked: boolean
  message: string | null
}

const KNOWN_API_STATUSES: readonly ClaudeApiStatus[] = [
  'OK',
  'NOT_REQUESTED',
  'NOT_CONFIGURED',
  'TIMEOUT',
  'RATE_LIMITED',
  'QUOTA_EXHAUSTED',
  'MALFORMED_RESPONSE',
  'PROVIDER_ERROR',
]

const NOT_VALIDATED_MESSAGE = 'AI review was not run for this photo.'

function buildDecision(
  status: ClaudeValidationStatus,
  fields: Partial<ClaudeValidationDecision> = {},
): ClaudeValidationDecision {
  return {
    status,
    approved: false,
    suitability: null,
    eligibility: null,
    message: null,
    token: null,
    ...fields,
  }
}

export function notValidatedDecision(message: string = NOT_VALIDATED_MESSAGE): ClaudeValidationDecision {
  return buildDecision('NOT_VALIDATED', { message })
}

export function isRetryableValidationStatus(status: ClaudeValidationStatus): boolean {
  return status === 'TIMEOUT' || status === 'PROVIDER_ERROR' || status === 'VALIDATION_ERROR'
}

export function selectValidationTargets(
  qualityFlags: readonly boolean[],
  maxImages: number = CLAUDE_VALIDATION_MAX_IMAGES,
): number[] {
  const targets: number[] = []
  for (let index = 0; index < qualityFlags.length && targets.length < maxImages; index++) {
    if (qualityFlags[index]) targets.push(index)
  }
  return targets
}

export function validationCacheKey(sessionId: string, sha256: string): string {
  return `${sessionId}:${sha256}`
}

export function createValidationSession(): ValidationSessionState {
  return { callsUsed: 0, cache: {} }
}

export function mapHttpFailure(
  statusCode: number | undefined,
  timedOut: boolean = false,
): ClaudeValidationStatus {
  if (timedOut) return 'TIMEOUT'
  if (statusCode === undefined) return 'PROVIDER_ERROR'
  if (statusCode === 401 || statusCode === 403) return 'NOT_CONFIGURED'
  if (statusCode === 408 || statusCode === 504) return 'TIMEOUT'
  if (statusCode === 429 || statusCode === 529) return 'RATE_LIMITED'
  if (statusCode >= 500) return 'PROVIDER_ERROR'
  return 'MALFORMED_RESPONSE'
}

function isTransportFailure(
  outcome: ClaudeAnalysisPayload | ClaudeTransportFailure,
): outcome is ClaudeTransportFailure {
  return typeof (outcome as ClaudeTransportFailure).failureStatus === 'string'
}

export function mapClaudeResponse(outcome: ClaudeCallOutcome): ClaudeValidationDecision {
  if (outcome === null) {
    return buildDecision('VALIDATION_ERROR', {
      message: 'The image review request failed. Please try again.',
    })
  }

  if (isTransportFailure(outcome)) {
    return buildDecision(outcome.failureStatus)
  }

  const { status, result, detail } = outcome

  if (!(KNOWN_API_STATUSES as readonly string[]).includes(status)) {
    return buildDecision('VALIDATION_ERROR', {
      message: 'The image review returned an unreadable response. Please try again.',
    })
  }

  if (status !== 'OK') {
    return buildDecision(status as ClaudeApiStatus, { message: detail ?? null })
  }

  if (!result || typeof result !== 'object') {
    return buildDecision('VALIDATION_ERROR', {
      message: 'The image review returned an unreadable response. Please try again.',
    })
  }

  const suitability =
    typeof result.image_suitability === 'string' ? result.image_suitability : null
  const eligibility =
    typeof result.screening_eligibility === 'string' ? result.screening_eligibility : null
  const approved = suitability === 'SUITABLE' && eligibility === 'ELIGIBLE'
  const token = typeof outcome.token === 'string' && outcome.token.length > 0 ? outcome.token : null

  return buildDecision('OK', {
    approved,
    suitability,
    eligibility,
    message: (typeof result.screening_message === 'string' ? result.screening_message : null)
      ?? detail
      ?? null,
    token,
  })
}

async function safeCall(
  io: ClaudeValidationIO,
  imageUri: string,
): Promise<ClaudeCallOutcome> {
  try {
    return await io.callApi(imageUri)
  } catch {
    return null
  }
}

export async function validateTargetImages(params: {
  sessionId: string
  state: ValidationSessionState
  io: ClaudeValidationIO
  targets: readonly ValidationTarget[]
  maxImages?: number
  callLimit?: number
}): Promise<Record<number, ClaudeValidationDecision>> {
  const { sessionId, state, io } = params
  const maxImages = params.maxImages ?? CLAUDE_VALIDATION_MAX_IMAGES
  const callLimit = params.callLimit ?? CLAUDE_SESSION_CALL_LIMIT
  const targets = params.targets.slice(0, maxImages)

  const decisions: Record<number, ClaudeValidationDecision> = {}
  const attempts: Record<number, number> = {}
  const shas: Record<number, string> = {}

  for (const target of targets) {
    let sha: string | null = null
    try {
      sha = await io.shaFor(target.uri)
    } catch {
      sha = null
    }

    if (sha === null) {
      decisions[target.index] = buildDecision('VALIDATION_ERROR', {
        message: 'The photo could not be prepared for review.',
      })
      attempts[target.index] = CLAUDE_MAX_ATTEMPTS_PER_IMAGE
      continue
    }
    shas[target.index] = sha

    const cached = state.cache[validationCacheKey(sessionId, sha)]
    if (cached) {
      decisions[target.index] = cached
      attempts[target.index] = CLAUDE_MAX_ATTEMPTS_PER_IMAGE
      continue
    }

    if (state.callsUsed >= callLimit) {
      decisions[target.index] = notValidatedDecision(
        `The AI review limit of ${callLimit} photos for this screening session has been reached. Start a new screening to review more photos.`,
      )
      attempts[target.index] = CLAUDE_MAX_ATTEMPTS_PER_IMAGE
      continue
    }

    state.callsUsed += 1
    const mapped = mapClaudeResponse(await safeCall(io, target.uri))
    decisions[target.index] = mapped
    attempts[target.index] = 1

    if (!isRetryableValidationStatus(mapped.status)) {
      state.cache[validationCacheKey(sessionId, sha)] = mapped
    }
  }

  for (const target of targets) {
    const mapped = decisions[target.index]
    if (!mapped) continue
    if (attempts[target.index] !== 1) continue
    if (!isRetryableValidationStatus(mapped.status)) continue
    if (state.callsUsed >= callLimit) continue

    state.callsUsed += 1
    const retried = mapClaudeResponse(await safeCall(io, target.uri))
    decisions[target.index] = retried
    attempts[target.index] = CLAUDE_MAX_ATTEMPTS_PER_IMAGE

    if (!isRetryableValidationStatus(retried.status) && shas[target.index]) {
      state.cache[validationCacheKey(sessionId, shas[target.index])] = retried
    }
  }

  return decisions
}

export function resolveEligibility(
  decisions: Record<number, ClaudeValidationDecision>,
  targetIndices: readonly number[],
  minValidImages: number,
): EligibilityResult {
  const approved = targetIndices.filter((index) => decisions[index]?.approved === true)

  if (approved.length >= minValidImages) {
    return { approved, blocked: false, message: null }
  }

  // Quality shortfall: fewer photos reached Claude because some failed the
  // image-quality checks upstream. Quality failures have no decision at all,
  // so they are never counted as Claude rejections below.
  if (targetIndices.length < minValidImages) {
    return {
      approved,
      blocked: true,
      message: `All ${minValidImages} photos must pass the image quality checks before screening can continue. Please retake the photo(s) that are blurry, too dark, or unclear.`,
    }
  }

  const failures: ClaudeValidationDecision[] = []
  for (const index of targetIndices) {
    const decision = decisions[index]
    if (decision && !decision.approved) failures.push(decision)
  }

  const transportFailure = failures.find(
    (decision) => decision.status !== 'OK' && decision.status !== 'NOT_VALIDATED',
  )
  const notValidatedCount = failures.filter((decision) => decision.status === 'NOT_VALIDATED').length

  let message = `Only ${approved.length} of ${minValidImages} required photos were approved by the AI safety review.`

  if (notValidatedCount > 0) {
    message += ` The AI review limit of ${CLAUDE_SESSION_CALL_LIMIT} photos for this screening session has been reached. Start a new screening to review more photos.`
  } else if (transportFailure?.message) {
    message += ` ${transportFailure.message} Start a new screening to try again.`
  } else {
    message = `All ${minValidImages} photos must be approved by the AI safety review before screening can continue. Please replace the rejected photo(s), then start a new screening.`
  }

  return { approved, blocked: true, message }
}

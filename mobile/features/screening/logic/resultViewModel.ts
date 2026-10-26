import { KNOWLEDGE } from '../../../ai/decisionTree/knowledge'
import { parsePredictionMode, parseScreeningSummary } from '../../../ai/decisionTree/summary'
import type { Knowledge, ParsedScreeningSummary } from '../../../ai/decisionTree/types'
import type {
  ClaudeValidationStatus,
  ImageReport,
  ImageReportStatus,
  Prediction,
  ScreeningResultState,
} from '../../../ai/types/ai.types'

export type ResultRenderingMode = 'legacy' | 'summary'

const SCREENING_STATES: readonly ScreeningResultState[] = [
  'DISEASE_DETECTED',
  'NOT_SKIN_IMAGE',
  'UNCERTAIN',
  'INVALID_IMAGE',
]

const IMAGE_REPORT_STATUSES = new Set<ImageReportStatus>([
  'ok',
  'quality_failed',
  'low_similarity',
  'not_skin',
  'not_validated',
  'validation_error',
])

const CLAUDE_VALIDATION_STATUSES = new Set<ClaudeValidationStatus>([
  'OK',
  'NOT_REQUESTED',
  'NOT_CONFIGURED',
  'TIMEOUT',
  'RATE_LIMITED',
  'QUOTA_EXHAUSTED',
  'MALFORMED_RESPONSE',
  'PROVIDER_ERROR',
  'NOT_VALIDATED',
  'VALIDATION_ERROR',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export interface ResultViewModelInput {
  summaryRaw: string | string[] | null | undefined
  screeningState: ScreeningResultState
  petId: string | null | undefined
  legacyTop: Prediction | null
  mockHomeCareEnabled: boolean
}

export interface ScreeningResultViewModel {
  renderingMode: ResultRenderingMode
  summary: ParsedScreeningSummary | null
  summaryWarning: string | null
  combinedTop: Prediction | null
  bookingTop: Prediction | null
  canBook: boolean
  showQuestionnaireUnavailable: boolean
  showCombinedUnavailable: boolean
  showMockHomeCare: boolean
}

export function firstRouteParam(value: string | string[] | null | undefined): string | null {
  if (typeof value === 'string') return value
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0]
  return null
}

function parseRouteJson(value: string | string[] | null | undefined): unknown {
  const raw = firstRouteParam(value)
  if (!raw || raw.trim().length === 0) return null

  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function parseRoutePredictions(
  value: string | string[] | null | undefined,
): Prediction[] {
  return parsePredictionMode(parseRouteJson(value)) ?? []
}

function isImageReport(value: unknown): value is ImageReport {
  if (
    !isRecord(value) ||
    typeof value.uri !== 'string' ||
    typeof value.status !== 'string' ||
    !IMAGE_REPORT_STATUSES.has(value.status as ImageReportStatus)
  ) {
    return false
  }

  const similarity = value.similarity
  if (
    similarity !== null &&
    (typeof similarity !== 'number' || !Number.isFinite(similarity))
  ) {
    return false
  }

  if (
    value.claudeStatus !== undefined &&
    (typeof value.claudeStatus !== 'string' ||
      !CLAUDE_VALIDATION_STATUSES.has(value.claudeStatus as ClaudeValidationStatus))
  ) {
    return false
  }

  if (value.claudeMessage !== undefined && typeof value.claudeMessage !== 'string') {
    return false
  }

  return true
}

export function parseRouteImageReports(
  value: string | string[] | null | undefined,
): ImageReport[] {
  const parsed = parseRouteJson(value)
  if (!Array.isArray(parsed)) return []
  return parsed.filter(isImageReport)
}

export function parseRouteThumbnailUris(
  value: string | string[] | null | undefined,
): string[] {
  const parsed = parseRouteJson(value)
  if (!Array.isArray(parsed)) return []
  return parsed.filter(
    (uri): uri is string => typeof uri === 'string' && uri.trim().length > 0,
  )
}

export function normalizeScreeningState(
  value: string | string[] | null | undefined,
): ScreeningResultState {
  const state = firstRouteParam(value)
  return state && SCREENING_STATES.includes(state as ScreeningResultState)
    ? state as ScreeningResultState
    : 'INVALID_IMAGE'
}

export function resolveScreeningResultView(
  input: ResultViewModelInput,
  knowledge: Knowledge = KNOWLEDGE,
): ScreeningResultViewModel {
  const rawSummary = firstRouteParam(input.summaryRaw)
  const hasSummaryPayload = rawSummary !== null && rawSummary.trim().length > 0
  const summary = hasSummaryPayload
    ? parseScreeningSummary(rawSummary, knowledge)
    : null
  const petValid = !!input.petId && input.petId !== 'unknown'

  if (hasSummaryPayload && !summary) {
    return {
      renderingMode: 'legacy',
      summary: null,
      summaryWarning:
        'The detailed screening summary could not be loaded. Showing the standard result. Booking is unavailable.',
      combinedTop: null,
      bookingTop: null,
      canBook: false,
      showQuestionnaireUnavailable: false,
      showCombinedUnavailable: false,
      showMockHomeCare: false,
    }
  }

  if (!summary) {
    return {
      renderingMode: 'legacy',
      summary: null,
      summaryWarning: null,
      combinedTop: null,
      bookingTop: input.legacyTop,
      canBook:
        input.screeningState === 'DISEASE_DETECTED' &&
        !!input.legacyTop &&
        petValid,
      showQuestionnaireUnavailable: false,
      showCombinedUnavailable: false,
      showMockHomeCare: false,
    }
  }

  const combinedTop = summary.combined?.[0] ?? null
  const canUseCombined = !!combinedTop && petValid

  return {
    renderingMode: 'summary',
    summary,
    summaryWarning: null,
    combinedTop,
    bookingTop: combinedTop,
    canBook: input.screeningState === 'DISEASE_DETECTED' && canUseCombined,
    showQuestionnaireUnavailable: !summary.questionnaireOnly,
    showCombinedUnavailable: !combinedTop,
    showMockHomeCare:
      input.screeningState === 'DISEASE_DETECTED' &&
      !!combinedTop &&
      input.mockHomeCareEnabled,
  }
}

import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

import type { DiseaseType } from '../../../ai/types/ai.types.ts'
import {
  CARE_GUIDELINES,
  CARE_GUIDELINE_DISCLAIMER,
  GENERAL_CONSULT_MESSAGE,
  UNIVERSAL_CARE_STEPS,
  getCareGuideline,
  isSupportedDiseaseCode,
} from '../data/careGuidelines.ts'
import {
  shouldShowCareGuidelines,
  shouldShowSavedCareGuidelines,
} from '../careGuidelineVisibility.ts'

const mobileRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')

const ALL_KEYS: DiseaseType[] = [
  'ALLERGIC_DERMATITIS',
  'BACTERIAL',
  'FUNGAL',
  'HOTSPOT',
  'MANGE',
]

/** The six approved universal recommendations (headings must appear). */
const EXPECTED_HEADINGS = [
  'Seek Veterinary Assessment',
  'Maintain Proper Hygiene',
  'Prevent Further Irritation',
  'Follow Veterinary Recommendations',
  'Monitor Skin Condition and Recovery',
  'Practice Proper Environmental Hygiene',
]

describe('CARE_GUIDELINES data', () => {
  it('covers all five supported predicted classes', () => {
    assert.deepEqual(Object.keys(CARE_GUIDELINES).sort(), [...ALL_KEYS].sort())
  })

  it('uses the universal title for every condition', () => {
    for (const key of ALL_KEYS) {
      assert.equal(CARE_GUIDELINES[key].title, 'Care Guidelines')
    }
  })

  it('every entry has exactly the six universal care steps', () => {
    assert.equal(UNIVERSAL_CARE_STEPS.length, 6)
    for (const key of ALL_KEYS) {
      const g = CARE_GUIDELINES[key]
      assert.equal(g.careSteps.length, 6, `${key}: expected 6 steps`)
      assert.deepEqual(g.careSteps, [...UNIVERSAL_CARE_STEPS], `${key}: steps differ`)
      for (const item of g.careSteps) assert.ok(item.trim().length > 0, `${key}: empty item`)
    }
  })

  it('shares one identical guideline object across all five conditions', () => {
    for (let i = 1; i < ALL_KEYS.length; i++) {
      assert.equal(
        CARE_GUIDELINES[ALL_KEYS[i]],
        CARE_GUIDELINES[ALL_KEYS[0]],
        'all conditions must reference the same universal guideline',
      )
    }
  })

  it('includes every approved recommendation heading', () => {
    const serialized = JSON.stringify(CARE_GUIDELINES)
    for (const heading of EXPECTED_HEADINGS) {
      assert.ok(serialized.includes(heading), `missing heading: ${heading}`)
    }
  })

  it('labels the content as general guidance, not a diagnosis or prescription', () => {
    assert.match(CARE_GUIDELINE_DISCLAIMER, /not a diagnosis/i)
    assert.match(CARE_GUIDELINE_DISCLAIMER, /not a prescription/i)
    assert.match(CARE_GUIDELINE_DISCLAIMER, /veterinarian/i)
  })

  it('contains no medication dosages, units, or treatment schedules', () => {
    const serialized = JSON.stringify(CARE_GUIDELINES)
    assert.doesNotMatch(serialized, /\b\d+(?:\.\d+)?\s?(?:mg|ml|mcg|iu|tablet|capsule)\b/i)
    assert.doesNotMatch(serialized, /\b\d+\s?(?:times|dose)/i)
    assert.doesNotMatch(serialized, /\bevery\s+\d+\s+(?:hours|days)\b/i)
  })
})

describe('getCareGuideline selection', () => {
  it('returns the same universal guideline for all five classes', () => {
    const first = getCareGuideline(ALL_KEYS[0])
    assert.ok(first, 'expected a guideline for the first class')
    for (const key of ALL_KEYS) {
      const g = getCareGuideline(key)
      assert.ok(g, `${key}: expected a guideline`)
      assert.equal(g.title, 'Care Guidelines')
      assert.deepEqual(g.careSteps, [...UNIVERSAL_CARE_STEPS])
      assert.equal(g, first, `${key}: must be the same universal object`)
    }
  })

  it('returns null for a missing prediction', () => {
    assert.equal(getCareGuideline(null), null)
    assert.equal(getCareGuideline(undefined), null)
    assert.equal(getCareGuideline(''), null)
  })

  it('returns null for an unsupported prediction', () => {
    assert.equal(getCareGuideline('UNKNOWN_CONDITION'), null)
    assert.equal(getCareGuideline('BACTERIAL_INFECTION'), null)
    assert.equal(getCareGuideline('Mange'), null)
    assert.equal(getCareGuideline('allergic_dermatitis'), null)
  })

  it('accepts only the prediction argument, so questionnaire answers cannot reach it', () => {
    assert.equal(getCareGuideline.length, 1)
    const a = getCareGuideline('MANGE')
    const b = getCareGuideline('MANGE')
    assert.deepEqual(a, b)
  })

  it('provides a general consultation message for missing/unsupported classes', () => {
    assert.match(GENERAL_CONSULT_MESSAGE, /consult a veterinarian/i)
  })

  it('isSupportedDiseaseCode accepts only the five supported codes', () => {
    for (const key of ALL_KEYS) assert.equal(isSupportedDiseaseCode(key), true)
    assert.equal(isSupportedDiseaseCode(null), false)
    assert.equal(isSupportedDiseaseCode(''), false)
    assert.equal(isSupportedDiseaseCode('Mange'), false)
    assert.equal(isSupportedDiseaseCode('OTHER'), false)
  })
})

describe('care guideline isolation from AI logic', () => {
  const dataSource = readFileSync(
    join(mobileRoot, 'features', 'screening', 'data', 'careGuidelines.ts'),
    'utf8',
  )

  it('the data module imports only a type from the AI module', () => {
    const imports = dataSource.split('\n').filter((line) => line.startsWith('import '))
    assert.equal(imports.length, 1)
    assert.match(imports[0], /^import type /)
    assert.match(imports[0], /ai\/types\/ai\.types/)
  })

  it('never writes to prediction, confidence, or questionnaire state', () => {
    assert.doesNotMatch(dataSource, /confidence\s*=/)
    assert.doesNotMatch(dataSource, /prediction\s*=/)
    assert.doesNotMatch(dataSource, /answers\s*=/)
  })
})

describe('results UI no longer renders the Independent Image Review', () => {
  const resultSource = readFileSync(
    join(mobileRoot, 'app', '(owner)', 'pets', 'screening', 'result.tsx'),
    'utf8',
  )

  it('result.tsx has no ClaudeReviewCard or INDEPENDENT REVIEW references', () => {
    assert.doesNotMatch(resultSource, /ClaudeReviewCard/)
    assert.doesNotMatch(resultSource, /INDEPENDENT REVIEW/)
    assert.doesNotMatch(resultSource, /AnalysisCards/)
  })

  it('result.tsx renders the care guidelines card before the symptom summary', () => {
    const careIndex = resultSource.indexOf('CareGuidelinesCard')
    const symptomIndex = resultSource.indexOf('SymptomSummaryCard')
    assert.ok(careIndex > 0, 'CareGuidelinesCard missing')
    assert.ok(symptomIndex > 0, 'SymptomSummaryCard missing')
    assert.ok(careIndex < symptomIndex, 'care guidelines must render before symptom summary')
  })

  it('result.tsx keeps the claude gate and save payload wiring intact', () => {
    assert.match(resultSource, /claudeResponse\?\.token/)
    assert.match(resultSource, /claudeToken:/)
    assert.match(resultSource, /gateFindings/)
  })

  it('uses a simple Scan label instead of implementation details', () => {
    assert.match(resultSource, /<Text style=\{styles\.timestamp\}>Scan<\/Text>/)
    assert.doesNotMatch(resultSource, /image validation and on-device model/)
  })

  it('uses one analyzing message while image screening runs', () => {
    const captureSource = readFileSync(
      join(mobileRoot, 'app', '(owner)', 'pets', 'screening', 'index.tsx'),
      'utf8',
    )
    assert.match(captureSource, /pickerLoading \? 'Preparing photo\.\.\.' : 'Analyzing photo'/)
    assert.doesNotMatch(captureSource, /Checking photo\.\.\.|Running screening\.\.\./)
    assert.doesNotMatch(captureSource, /Independent image review is checking/)
  })

  it('AnalysisCards.tsx has been removed', () => {
    assert.equal(
      existsSync(join(mobileRoot, 'features', 'screening', 'components', 'AnalysisCards.tsx')),
      false,
    )
  })
})

describe('details UI no longer renders Cross-analysis or Independent Image Review', () => {
  const detailsSource = readFileSync(
    join(mobileRoot, 'features', 'screening', 'screens', 'ScreeningDetailsScreen.tsx'),
    'utf8',
  )
  const resultSource = readFileSync(
    join(mobileRoot, 'app', '(owner)', 'pets', 'screening', 'result.tsx'),
    'utf8',
  )

  it('ScreeningDetailsScreen.tsx has no cross-analysis UI', () => {
    assert.doesNotMatch(detailsSource, /cross_analysis/)
    assert.doesNotMatch(detailsSource, /CROSS_META/)
    assert.doesNotMatch(detailsSource, /Both analyses agree/)
    assert.doesNotMatch(detailsSource, /The analyses differ/)
    assert.doesNotMatch(detailsSource, /swap-horizontal/)
    assert.doesNotMatch(detailsSource, /CrossAnalysisStatus/)
  })

  it('ScreeningDetailsScreen.tsx has no Independent Image Review references', () => {
    assert.doesNotMatch(detailsSource, /ClaudeReviewCard/)
    assert.doesNotMatch(detailsSource, /INDEPENDENT REVIEW/)
    assert.doesNotMatch(detailsSource, /independent image review/)
  })

  it('ScreeningDetailsScreen.tsx gates care guidelines on a saved disease code', () => {
    assert.match(
      detailsSource,
      /shouldShowSavedCareGuidelines\(screening\.disease_code\) &&/,
    )
    assert.match(
      detailsSource,
      /<CareGuidelinesCard prediction=\{screening\.disease_code\} \/>/,
    )
    const careIndex = detailsSource.indexOf('CareGuidelinesCard')
    const symptomIndex = detailsSource.indexOf('SymptomSummaryCard')
    assert.ok(careIndex > 0 && symptomIndex > 0)
    assert.ok(careIndex < symptomIndex, 'care guidelines must render before symptom summary')
  })

  it('neither active screen renders cross-analysis', () => {
    assert.doesNotMatch(resultSource, /cross_analysis/)
    assert.doesNotMatch(resultSource, /Cross-analysis/)
  })

  it('API types still carry cross-analysis fields for backend compatibility', () => {
    const typesSource = readFileSync(
      join(mobileRoot, 'features', 'screening', 'types', 'index.ts'),
      'utf8',
    )
    assert.match(typesSource, /cross_analysis: CrossAnalysis/)
    assert.match(typesSource, /cross_analysis_status\?: CrossAnalysisStatus/)
  })
})

describe('result visibility: Claude acceptance, Top-1, state, configured review', () => {
  const base = {
    state: 'DISEASE_DETECTED' as const,
    reviewNotConfigured: false,
    hasValidTop1: true,
    claudeAccepted: true,
  }

  it('shows guidelines when all four approved conditions hold', () => {
    assert.equal(shouldShowCareGuidelines(base), true)
  })

  it('hides guidelines when the review is not configured (unsaved preview)', () => {
    assert.equal(shouldShowCareGuidelines({ ...base, reviewNotConfigured: true }), false)
  })

  it('hides guidelines when Claude Vision has not accepted the image', () => {
    assert.equal(shouldShowCareGuidelines({ ...base, claudeAccepted: false }), false)
  })

  it('hides guidelines when there is no valid Top-1 prediction', () => {
    assert.equal(shouldShowCareGuidelines({ ...base, hasValidTop1: false }), false)
  })

  it('hides guidelines for non-disease final states', () => {
    assert.equal(shouldShowCareGuidelines({ ...base, state: 'UNCERTAIN' }), false)
    assert.equal(shouldShowCareGuidelines({ ...base, state: 'NOT_SKIN_IMAGE' }), false)
    assert.equal(shouldShowCareGuidelines({ ...base, state: 'INVALID_IMAGE' }), false)
    assert.equal(shouldShowCareGuidelines({ ...base, state: null }), false)
  })

  it('accepts only the four visibility inputs (no confidence or similarity params)', () => {
    assert.equal(shouldShowCareGuidelines.length, 1)
    const a = shouldShowCareGuidelines(base)
    const b = shouldShowCareGuidelines({ ...base })
    assert.equal(a, b)
  })

  it('never reads a confidence percentage or feature-similarity threshold', () => {
    const visibilitySource = readFileSync(
      join(mobileRoot, 'features', 'screening', 'careGuidelineVisibility.ts'),
      'utf8',
    )
    assert.doesNotMatch(visibilitySource, /SCREENING_THRESHOLDS/)
    assert.doesNotMatch(visibilitySource, /FEATURE_SIMILARITY/)
    assert.doesNotMatch(visibilitySource, /featureSimilarity/)
    assert.doesNotMatch(visibilitySource, /\bconfidence\s*[:=]/)
    assert.doesNotMatch(visibilitySource, /\bsimilarity\s*[:=]/)
    assert.doesNotMatch(visibilitySource, /\b70\b/)
    assert.doesNotMatch(visibilitySource, /0\.30/)
  })
})

describe('details visibility: saved disease code only', () => {
  it('shows guidelines for each supported saved disease code', () => {
    for (const key of ALL_KEYS) {
      assert.equal(shouldShowSavedCareGuidelines(key), true, key)
    }
  })

  it('hides guidelines for missing or unsupported codes (UNCERTAIN and others)', () => {
    assert.equal(shouldShowSavedCareGuidelines(null), false)
    assert.equal(shouldShowSavedCareGuidelines(undefined), false)
    assert.equal(shouldShowSavedCareGuidelines(''), false)
    assert.equal(shouldShowSavedCareGuidelines('UNCERTAIN'), false)
    assert.equal(shouldShowSavedCareGuidelines('NOT_SKIN_IMAGE'), false)
    assert.equal(shouldShowSavedCareGuidelines('INVALID_IMAGE'), false)
    assert.equal(shouldShowSavedCareGuidelines('UNKNOWN'), false)
  })
})

describe('result screen gates CareGuidelinesCard on the approved visibility rule', () => {
  const resultSource = readFileSync(
    join(mobileRoot, 'app', '(owner)', 'pets', 'screening', 'result.tsx'),
    'utf8',
  )

  it('renders care guidelines through shouldShowCareGuidelines with all four inputs', () => {
    assert.match(resultSource, /shouldShowCareGuidelines\(\{/)
    assert.match(resultSource, /state:\s*screeningState/)
    assert.match(resultSource, /reviewNotConfigured,/)
    assert.match(resultSource, /hasValidTop1:/)
    assert.match(resultSource, /claudeAccepted:\s*isClaudeValidationApproved\(claudeResponse\)/)
  })

  it('does not gate care guidelines on confidence or feature-similarity thresholds', () => {
    assert.doesNotMatch(resultSource, /shouldShowCareGuidelines\([^)]*confidence/)
    assert.doesNotMatch(resultSource, /featureSimilarity/)
    assert.doesNotMatch(resultSource, /FEATURE_SIMILARITY/)
  })

  it('no longer gates care guidelines on the bare deviceFailed check', () => {
    assert.doesNotMatch(resultSource, /!deviceFailed && \(\s*<CareGuidelinesCard/)
    assert.doesNotMatch(
      resultSource,
      /\{\s*!deviceFailed && \(\s*<CareGuidelinesCard/,
    )
  })

  it('keeps passing the raw primary prediction as display-only content', () => {
    assert.match(resultSource, /<CareGuidelinesCard prediction=\{top\?\.disease \?\? null\} \/>/)
  })
})

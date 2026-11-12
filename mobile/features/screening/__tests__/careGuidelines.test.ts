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
  getCareGuideline,
} from '../data/careGuidelines.ts'

const mobileRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')

const ALL_KEYS: DiseaseType[] = [
  'ALLERGIC_DERMATITIS',
  'BACTERIAL',
  'FUNGAL',
  'HOTSPOT',
  'MANGE',
]

const EXPECTED_TITLES: Record<DiseaseType, string> = {
  ALLERGIC_DERMATITIS: 'Allergic Dermatitis',
  BACTERIAL: 'Bacterial Infection',
  FUNGAL: 'Fungal Infection',
  HOTSPOT: 'Hotspot',
  MANGE: 'Mange',
}

describe('CARE_GUIDELINES data', () => {
  it('covers all five supported predicted classes', () => {
    assert.deepEqual(Object.keys(CARE_GUIDELINES).sort(), [...ALL_KEYS].sort())
  })

  it('has the expected display title for every condition', () => {
    for (const key of ALL_KEYS) {
      assert.equal(CARE_GUIDELINES[key].title, EXPECTED_TITLES[key])
    }
  })

  it('every entry has a non-empty care-steps list with non-empty items', () => {
    for (const key of ALL_KEYS) {
      const g = CARE_GUIDELINES[key]
      assert.ok(g.careSteps.length > 0, `${key}: careSteps empty`)
      for (const item of g.careSteps) assert.ok(item.trim().length > 0, `${key}: empty item`)
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
  it('returns the matching guideline for all five classes', () => {
    for (const key of ALL_KEYS) {
      const g = getCareGuideline(key)
      assert.ok(g, `${key}: expected a guideline`)
      assert.equal(g.title, EXPECTED_TITLES[key])
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

  it('ScreeningDetailsScreen.tsx renders care guidelines from the saved primary prediction', () => {
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

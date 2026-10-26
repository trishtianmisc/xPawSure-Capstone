const assert = require('assert')
const fs = require('fs')
const os = require('os')
const path = require('path')
const ts = require('typescript')

const mobileRoot = path.join(__dirname, '..')
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'xpawsure-result-view-'))

function transpile(sourceRelativePath) {
  const source = fs.readFileSync(path.join(mobileRoot, sourceRelativePath), 'utf8')
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText
  const outputPath = path.join(tempRoot, sourceRelativePath.replace(/\.ts$/, '.js'))
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, output)
}

function prediction(disease, confidence) {
  return { disease, confidence, label: disease }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function allAnswers(knowledge) {
  const answers = {}
  for (const question of knowledge.questions) {
    answers[question.id] = question.multi
      ? ['ears', 'paws']
      : [question.options[0].id]
  }
  return answers
}

try {
  transpile('ai/decisionTree/bayesian.config.ts')
  transpile('ai/decisionTree/bayesian.ts')
  transpile('ai/decisionTree/knowledge.ts')
  transpile('ai/decisionTree/summary.ts')
  transpile('features/screening/logic/resultViewModel.ts')

  const stubPath = path.join(tempRoot, 'ai', 'constants', 'diseases.js')
  fs.mkdirSync(path.dirname(stubPath), { recursive: true })
  fs.writeFileSync(
    stubPath,
    [
      'exports.DISEASE_LABELS = {',
      "  ALLERGIC_DERMATITIS: 'Allergic Dermatitis',",
      "  BACTERIAL: 'Bacterial',",
      "  FUNGAL: 'Fungal',",
      "  HOTSPOT: 'Hotspot',",
      "  MANGE: 'Mange',",
      '}',
    ].join('\n'),
  )

  const bayesian = require(path.join(tempRoot, 'ai', 'decisionTree', 'bayesian.js'))
  const summary = require(path.join(tempRoot, 'ai', 'decisionTree', 'summary.js'))
  const {
    firstRouteParam,
    normalizeScreeningState,
    parseRouteImageReports,
    parseRoutePredictions,
    parseRouteThumbnailUris,
    resolveScreeningResultView,
  } = require(
    path.join(tempRoot, 'features', 'screening', 'logic', 'resultViewModel.js'),
  )
  const { KNOWLEDGE } = require(path.join(tempRoot, 'ai', 'decisionTree', 'knowledge.js'))

  const aiPredictions = [
    prediction('MANGE', 21),
    prediction('ALLERGIC_DERMATITIS', 26),
    prediction('BACTERIAL', 20),
    prediction('FUNGAL', 18),
    prediction('HOTSPOT', 15),
  ]
  const answers = allAnswers(KNOWLEDGE)
  const askedQuestionIds = KNOWLEDGE.questions.map((question) => question.id)
  const refined = bayesian.refinePredictionsBayesian(aiPredictions, answers, KNOWLEDGE)
  const payload = summary.buildScreeningSummary(
    aiPredictions,
    answers,
    askedQuestionIds,
    refined,
    KNOWLEDGE,
  )
  const summaryJson = JSON.stringify(payload)
  const legacyTop = aiPredictions[0]

  assert.strictEqual(firstRouteParam(['pet-1', 'pet-2']), 'pet-1')
  assert.strictEqual(firstRouteParam('pet-1'), 'pet-1')
  assert.strictEqual(firstRouteParam(undefined), null)

  assert.strictEqual(normalizeScreeningState('DISEASE_DETECTED'), 'DISEASE_DETECTED')
  assert.strictEqual(normalizeScreeningState(['UNCERTAIN']), 'UNCERTAIN')
  assert.strictEqual(normalizeScreeningState('not-a-state'), 'INVALID_IMAGE')
  assert.strictEqual(normalizeScreeningState(undefined), 'INVALID_IMAGE')

  const routePredictions = parseRoutePredictions(JSON.stringify(aiPredictions))
  assert.strictEqual(routePredictions.length, 5)
  assert.strictEqual(routePredictions[0].disease, 'ALLERGIC_DERMATITIS')
  assert.strictEqual(routePredictions[0].label, 'Allergic Dermatitis')
  assert.strictEqual(
    parseRoutePredictions(JSON.stringify(aiPredictions.slice(0, 4))).length,
    0,
  )
  assert.deepStrictEqual(parseRoutePredictions('{}'), [])
  assert.deepStrictEqual(parseRoutePredictions('null'), [])
  assert.deepStrictEqual(parseRoutePredictions('not-json'), [])
  assert.strictEqual(
    parseRoutePredictions([JSON.stringify(aiPredictions)])[0].disease,
    'ALLERGIC_DERMATITIS',
  )

  const validReport = { uri: 'file://photo-1', status: 'ok', similarity: 0.9 }
  const parsedReports = parseRouteImageReports(
    JSON.stringify([
      validReport,
      null,
      { uri: 'file://photo-2', status: 'unknown', similarity: 0.8 },
      { uri: 'file://photo-3', status: 'quality_failed', similarity: 'not-a-number' },
      { uri: 4, status: 'ok', similarity: 0.7 },
    ]),
  )
  assert.strictEqual(parsedReports.length, 1)
  assert.deepStrictEqual(parsedReports[0], validReport)

  const claudeReport = {
    uri: 'file://photo-4',
    status: 'not_validated',
    similarity: null,
    claudeStatus: 'NOT_VALIDATED',
    claudeMessage: 'AI review was not run for this photo.',
  }
  const claudeErrorReport = {
    uri: 'file://photo-5',
    status: 'validation_error',
    similarity: null,
    claudeStatus: 'TIMEOUT',
  }
  const claudeRejectedReport = {
    uri: 'file://photo-6',
    status: 'quality_failed',
    similarity: null,
    claudeStatus: 'OK',
  }
  const parsedClaudeReports = parseRouteImageReports(
    JSON.stringify([
      claudeReport,
      claudeErrorReport,
      claudeRejectedReport,
      { uri: 'file://photo-7', status: 'not_validated', similarity: null, claudeStatus: 'BOGUS_STATUS' },
      { uri: 'file://photo-8', status: 'not_validated', similarity: 'high' },
    ]),
  )
  assert.strictEqual(parsedClaudeReports.length, 3)
  assert.deepStrictEqual(parsedClaudeReports[0], claudeReport)
  assert.deepStrictEqual(parsedClaudeReports[1], claudeErrorReport)
  assert.deepStrictEqual(parsedClaudeReports[2], claudeRejectedReport)
  assert.deepStrictEqual(parseRouteImageReports('{}'), [])
  assert.deepStrictEqual(parseRouteImageReports('not-json'), [])

  assert.deepStrictEqual(
    parseRouteThumbnailUris(JSON.stringify(['file://original-1', 'file://original-2'])),
    ['file://original-1', 'file://original-2'],
  )
  assert.deepStrictEqual(
    parseRouteThumbnailUris(JSON.stringify([
      'file://original-1',
      null,
      '',
      4,
      'file://original-2',
    ])),
    ['file://original-1', 'file://original-2'],
  )
  assert.deepStrictEqual(parseRouteThumbnailUris('{}'), [])
  assert.deepStrictEqual(parseRouteThumbnailUris('not-json'), [])
  assert.deepStrictEqual(parseRouteThumbnailUris('[1, null]'), [])
  assert.deepStrictEqual(
    parseRouteThumbnailUris([JSON.stringify(['file://original-1'])]),
    ['file://original-1'],
  )

  const legacy = resolveScreeningResultView({
    summaryRaw: undefined,
    screeningState: 'DISEASE_DETECTED',
    petId: 'pet-1',
    legacyTop,
    mockHomeCareEnabled: false,
  })
  assert.strictEqual(legacy.renderingMode, 'legacy')
  assert.strictEqual(legacy.summary, null)
  assert.strictEqual(legacy.summaryWarning, null)
  assert.strictEqual(legacy.canBook, true)
  assert.strictEqual(legacy.bookingTop, legacyTop)
  assert.strictEqual(legacy.showMockHomeCare, false)
  assert.strictEqual(legacy.showQuestionnaireUnavailable, false)
  assert.strictEqual(legacy.showCombinedUnavailable, false)

  const malformed = resolveScreeningResultView({
    summaryRaw: '{',
    screeningState: 'DISEASE_DETECTED',
    petId: 'pet-1',
    legacyTop,
    mockHomeCareEnabled: true,
  })
  assert.strictEqual(malformed.renderingMode, 'legacy')
  assert.strictEqual(malformed.summary, null)
  assert.ok(malformed.summaryWarning.includes('could not be loaded'))
  assert.strictEqual(malformed.canBook, false)
  assert.strictEqual(malformed.bookingTop, null)
  assert.strictEqual(malformed.showMockHomeCare, false)

  const whitespace = resolveScreeningResultView({
    summaryRaw: '   ',
    screeningState: 'DISEASE_DETECTED',
    petId: 'pet-1',
    legacyTop,
    mockHomeCareEnabled: false,
  })
  assert.strictEqual(whitespace.renderingMode, 'legacy')
  assert.strictEqual(whitespace.summaryWarning, null)
  assert.strictEqual(whitespace.canBook, true)

  const valid = resolveScreeningResultView({
    summaryRaw: summaryJson,
    screeningState: 'DISEASE_DETECTED',
    petId: 'pet-1',
    legacyTop,
    mockHomeCareEnabled: false,
  })
  assert.strictEqual(valid.renderingMode, 'summary')
  assert.ok(valid.summary)
  assert.strictEqual(valid.summary.questionnaireOnly.length, 5)
  assert.strictEqual(valid.summary.aiOnly.length, 5)
  assert.strictEqual(valid.summary.combined.length, 5)
  assert.strictEqual(valid.canBook, true)
  assert.strictEqual(valid.bookingTop.disease, valid.summary.combined[0].disease)
  assert.strictEqual(valid.showQuestionnaireUnavailable, false)
  assert.strictEqual(valid.showCombinedUnavailable, false)
  assert.strictEqual(valid.showMockHomeCare, false)

  const validWithMock = resolveScreeningResultView({
    summaryRaw: summaryJson,
    screeningState: 'DISEASE_DETECTED',
    petId: 'pet-1',
    legacyTop,
    mockHomeCareEnabled: true,
  })
  assert.strictEqual(validWithMock.showMockHomeCare, true)

  const arraySummary = resolveScreeningResultView({
    summaryRaw: [summaryJson],
    screeningState: 'DISEASE_DETECTED',
    petId: 'pet-1',
    legacyTop,
    mockHomeCareEnabled: false,
  })
  assert.strictEqual(arraySummary.renderingMode, 'summary')
  assert.ok(arraySummary.summary)

  const missingCombined = clone(payload)
  delete missingCombined.combined
  const noCombined = resolveScreeningResultView({
    summaryRaw: JSON.stringify(missingCombined),
    screeningState: 'DISEASE_DETECTED',
    petId: 'pet-1',
    legacyTop,
    mockHomeCareEnabled: true,
  })
  assert.strictEqual(noCombined.renderingMode, 'summary')
  assert.ok(noCombined.summary.aiOnly)
  assert.strictEqual(noCombined.summary.combined, null)
  assert.strictEqual(noCombined.combinedTop, null)
  assert.strictEqual(noCombined.canBook, false)
  assert.strictEqual(noCombined.bookingTop, null)
  assert.strictEqual(noCombined.showCombinedUnavailable, true)
  assert.strictEqual(noCombined.showMockHomeCare, false)

  const invalidCombined = clone(payload)
  invalidCombined.combined[0].confidence = 101
  const noInvalidCombined = resolveScreeningResultView({
    summaryRaw: JSON.stringify(invalidCombined),
    screeningState: 'DISEASE_DETECTED',
    petId: 'pet-1',
    legacyTop,
    mockHomeCareEnabled: true,
  })
  assert.strictEqual(noInvalidCombined.renderingMode, 'summary')
  assert.strictEqual(noInvalidCombined.combinedTop, null)
  assert.strictEqual(noInvalidCombined.canBook, false)
  assert.strictEqual(noInvalidCombined.showMockHomeCare, false)

  const noQuestionnaire = resolveScreeningResultView({
    summaryRaw: JSON.stringify(
      summary.buildScreeningSummary(
        aiPredictions,
        {},
        ['ear_reflex'],
        refined,
        KNOWLEDGE,
      ),
    ),
    screeningState: 'DISEASE_DETECTED',
    petId: 'pet-1',
    legacyTop,
    mockHomeCareEnabled: false,
  })
  assert.strictEqual(noQuestionnaire.renderingMode, 'summary')
  assert.strictEqual(noQuestionnaire.summary.questionnaireOnly, null)
  assert.strictEqual(noQuestionnaire.showQuestionnaireUnavailable, true)
  assert.strictEqual(noQuestionnaire.canBook, true)

  const notDetected = resolveScreeningResultView({
    summaryRaw: summaryJson,
    screeningState: 'UNCERTAIN',
    petId: 'pet-1',
    legacyTop,
    mockHomeCareEnabled: true,
  })
  assert.strictEqual(notDetected.canBook, false)
  assert.strictEqual(notDetected.showMockHomeCare, false)

  const unknownPet = resolveScreeningResultView({
    summaryRaw: summaryJson,
    screeningState: 'DISEASE_DETECTED',
    petId: 'unknown',
    legacyTop,
    mockHomeCareEnabled: false,
  })
  assert.strictEqual(unknownPet.canBook, false)

  console.log('result view logic tests passed')
} finally {
  fs.rmSync(tempRoot, { force: true, recursive: true })
}

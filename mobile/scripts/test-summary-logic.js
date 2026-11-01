const assert = require('assert')
const fs = require('fs')
const os = require('os')
const path = require('path')
const ts = require('typescript')

const mobileRoot = path.join(__dirname, '..')
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'xpawsure-summary-'))

function transpile(sourceRelativePath, outputRelativePath) {
  const source = fs.readFileSync(path.join(mobileRoot, sourceRelativePath), 'utf8')
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText
  const outputPath = path.join(tempRoot, outputRelativePath)
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, output)
}

function approx(actual, expected, tolerance = 1e-9) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `Expected ${actual} to be within ${tolerance} of ${expected}`,
  )
}

function prediction(disease, confidence, label = disease) {
  return { disease, confidence, label }
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
  transpile('ai/decisionTree/bayesian.config.ts', 'ai/decisionTree/bayesian.config.js')
  transpile('ai/decisionTree/bayesian.ts', 'ai/decisionTree/bayesian.js')
  transpile('ai/decisionTree/knowledge.ts', 'ai/decisionTree/knowledge.js')
  transpile('ai/decisionTree/summary.ts', 'ai/decisionTree/summary.js')

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

  assert.strictEqual(bayesian.hasInformativeAnswers({}, KNOWLEDGE), false)
  assert.strictEqual(bayesian.hasInformativeAnswers({ ear_reflex: ['unsure'] }, KNOWLEDGE), false)
  assert.strictEqual(bayesian.hasInformativeAnswers({ ear_reflex: ['yes'] }, KNOWLEDGE), true)
  assert.strictEqual(
    bayesian.hasInformativeAnswers({ location: ['ears', 'paws'] }, KNOWLEDGE),
    true,
  )

  assert.strictEqual(bayesian.refineQuestionnaireOnly({}, KNOWLEDGE), null)
  assert.strictEqual(
    bayesian.refineQuestionnaireOnly({ ear_reflex: ['unsure'] }, KNOWLEDGE),
    null,
  )

  const questionnaireOnly = bayesian.refineQuestionnaireOnly(
    { ear_reflex: ['yes'] },
    KNOWLEDGE,
  )
  assert.ok(questionnaireOnly)
  assert.strictEqual(questionnaireOnly.length, 5)
  assert.strictEqual(questionnaireOnly[0].disease, 'MANGE')
  assert.strictEqual(questionnaireOnly[0].label, 'Mange')
  approx(
    questionnaireOnly.reduce((total, item) => total + item.confidence, 0),
    100,
    0.05,
  )
  assert.ok(
    questionnaireOnly.every(
      (item) =>
        item.label ===
        {
          ALLERGIC_DERMATITIS: 'Allergic Dermatitis',
          BACTERIAL: 'Bacterial',
          FUNGAL: 'Fungal',
          HOTSPOT: 'Hotspot',
          MANGE: 'Mange',
        }[item.disease],
    ),
  )

  const payload = summary.buildScreeningSummary(
    aiPredictions,
    answers,
    askedQuestionIds,
    refined,
    KNOWLEDGE,
  )

  assert.strictEqual(payload.version, 1)
  assert.strictEqual(payload.method, 'bayesian-provisional-v1')
  assert.strictEqual(payload.aiOnly.length, 5)
  assert.strictEqual(payload.questionnaireOnly.length, 5)
  assert.strictEqual(payload.combined.length, 5)
  assert.notStrictEqual(payload.aiOnly, aiPredictions)
  assert.notStrictEqual(payload.combined, refined.refined)
  assert.notStrictEqual(payload.questionnaireOnly, questionnaireOnly)
  assert.strictEqual(payload.aiOnly[0].label, 'Allergic Dermatitis')
  assert.strictEqual(payload.combined[0].label, refined.refined[0].label)
  assert.strictEqual(payload.answers.location.length, 2)
  assert.strictEqual(payload.askedQuestionIds.length, 12)

  const alternateAiPredictions = [
    prediction('HOTSPOT', 80),
    prediction('MANGE', 10),
    prediction('ALLERGIC_DERMATITIS', 5),
    prediction('BACTERIAL', 3),
    prediction('FUNGAL', 2),
  ]
  const alternateAiSummary = summary.buildScreeningSummary(
    alternateAiPredictions,
    answers,
    askedQuestionIds,
    refined,
    KNOWLEDGE,
  )
  assert.deepStrictEqual(
    alternateAiSummary.questionnaireOnly,
    payload.questionnaireOnly,
  )
  assert.notDeepStrictEqual(alternateAiSummary.aiOnly, payload.aiOnly)

  const originalAiTop = aiPredictions[0].confidence
  payload.aiOnly[0].confidence = 0
  assert.strictEqual(aiPredictions[0].confidence, originalAiTop)

  const originalAnswer = payload.answers.ear_reflex[0]
  payload.answers.ear_reflex[0] = 'no'
  assert.strictEqual(answers.ear_reflex[0], originalAnswer)

  const noInfoSummary = summary.buildScreeningSummary(
    aiPredictions,
    { ear_reflex: ['unsure'] },
    ['ear_reflex'],
    refined,
    KNOWLEDGE,
  )
  assert.strictEqual(noInfoSummary.questionnaireOnly, null)

  const parsed = summary.parseScreeningSummary(JSON.stringify(payload), KNOWLEDGE)
  assert.ok(parsed)
  assert.strictEqual(parsed.aiOnly.length, 5)
  assert.strictEqual(parsed.questionnaireOnly.length, 5)
  assert.strictEqual(parsed.combined.length, 5)
  assert.strictEqual(parsed.answersValid, true)
  assert.strictEqual(parsed.hasInformativeAnswers, true)
  assert.deepStrictEqual(parsed.invalidModes, [])
  assert.strictEqual(parsed.answerReview.length, 12)
  assert.deepStrictEqual(
    parsed.answerReview.map((row) => row.questionId),
    KNOWLEDGE.questions.map((question) => question.id),
  )
  assert.ok(parsed.answerReview.every((row) => row.status === 'answered'))
  const locationReview = parsed.answerReview.find((row) => row.questionId === 'location')
  assert.ok(locationReview)
  assert.strictEqual(locationReview.multi, true)
  assert.deepStrictEqual(
    locationReview.selected.map((item) => item.id),
    ['ears', 'paws'],
  )
  assert.deepStrictEqual(
    locationReview.selected.map((item) => item.label),
    ['Ears / ear margins', 'Paws / between toes'],
  )

  assert.strictEqual(summary.parseScreeningSummary('{', KNOWLEDGE), null)
  assert.strictEqual(summary.parseScreeningSummary('null', KNOWLEDGE), null)
  assert.strictEqual(summary.parseScreeningSummary('[]', KNOWLEDGE), null)
  assert.strictEqual(summary.parseScreeningSummary(undefined, KNOWLEDGE), null)

  const correctedPredictions = [
    prediction('HOTSPOT', 10, 'wrong'),
    prediction('MANGE', 40, 'wrong'),
    prediction('ALLERGIC_DERMATITIS', 20, 'wrong'),
    prediction('BACTERIAL', 20, 'wrong'),
    prediction('FUNGAL', 10, 'wrong'),
  ]
  const corrected = summary.parsePredictionMode(correctedPredictions)
  assert.ok(corrected)
  assert.strictEqual(corrected[0].disease, 'MANGE')
  assert.strictEqual(corrected[0].label, 'Mange')
  assert.ok(corrected.every((item) => item.label !== 'wrong'))
  assert.notStrictEqual(corrected, correctedPredictions)

  const invalidScores = [
    prediction('MANGE', Number.NaN),
    prediction('ALLERGIC_DERMATITIS', 20),
    prediction('BACTERIAL', 20),
    prediction('FUNGAL', 20),
    prediction('HOTSPOT', 20),
  ]
  assert.strictEqual(summary.parsePredictionMode(invalidScores), null)
  assert.strictEqual(
    summary.parsePredictionMode(
      invalidScores.map((item, index) =>
        index === 0 ? prediction('MANGE', Number.POSITIVE_INFINITY) : item,
      ),
    ),
    null,
  )
  assert.strictEqual(
    summary.parsePredictionMode(
      invalidScores.map((item, index) => (index === 0 ? prediction('MANGE', -1) : item)),
    ),
    null,
  )
  assert.strictEqual(
    summary.parsePredictionMode(
      invalidScores.map((item, index) => (index === 0 ? prediction('MANGE', 101) : item)),
    ),
    null,
  )
  assert.strictEqual(
    summary.parsePredictionMode(
      invalidScores.map((item, index) => (index === 0 ? prediction('MANGE', '20') : item)),
    ),
    null,
  )
  assert.strictEqual(
    summary.parsePredictionMode(correctedPredictions.slice(0, 4)),
    null,
  )
  assert.strictEqual(
    summary.parsePredictionMode([
      ...correctedPredictions,
      prediction('MANGE', 5),
    ]),
    null,
  )
  assert.strictEqual(
    summary.parsePredictionMode([
      correctedPredictions[0],
      correctedPredictions[0],
      correctedPredictions[2],
      correctedPredictions[3],
      correctedPredictions[4],
    ]),
    null,
  )
  assert.strictEqual(
    summary.parsePredictionMode([
      prediction('UNKNOWN', 20),
      correctedPredictions[1],
      correctedPredictions[2],
      correctedPredictions[3],
      correctedPredictions[4],
    ]),
    null,
  )

  const wrongVersion = clone(payload)
  wrongVersion.version = 2
  assert.strictEqual(summary.parseScreeningSummary(JSON.stringify(wrongVersion), KNOWLEDGE), null)

  const wrongMethod = clone(payload)
  wrongMethod.method = 'additive'
  assert.strictEqual(summary.parseScreeningSummary(JSON.stringify(wrongMethod), KNOWLEDGE), null)

  const invalidAi = clone(payload)
  invalidAi.aiOnly[0].disease = 'UNKNOWN'
  const invalidAiParsed = summary.parseScreeningSummary(JSON.stringify(invalidAi), KNOWLEDGE)
  assert.ok(invalidAiParsed)
  assert.strictEqual(invalidAiParsed.aiOnly, null)
  assert.ok(invalidAiParsed.invalidModes.includes('ai-only'))
  assert.ok(invalidAiParsed.questionnaireOnly)
  assert.ok(invalidAiParsed.combined)

  const invalidCombined = clone(payload)
  invalidCombined.combined[0].confidence = 101
  const invalidCombinedParsed = summary.parseScreeningSummary(
    JSON.stringify(invalidCombined),
    KNOWLEDGE,
  )
  assert.ok(invalidCombinedParsed)
  assert.strictEqual(invalidCombinedParsed.combined, null)
  assert.ok(invalidCombinedParsed.invalidModes.includes('combined'))
  assert.ok(invalidCombinedParsed.aiOnly)
  assert.ok(invalidCombinedParsed.questionnaireOnly)

  const invalidQuestionnaire = clone(payload)
  invalidQuestionnaire.questionnaireOnly[0].confidence = 'invalid'
  const invalidQuestionnaireParsed = summary.parseScreeningSummary(
    JSON.stringify(invalidQuestionnaire),
    KNOWLEDGE,
  )
  assert.ok(invalidQuestionnaireParsed)
  assert.strictEqual(invalidQuestionnaireParsed.questionnaireOnly, null)
  assert.ok(invalidQuestionnaireParsed.invalidModes.includes('questionnaire-only'))
  assert.ok(invalidQuestionnaireParsed.aiOnly)
  assert.ok(invalidQuestionnaireParsed.combined)

  const missingModes = clone(payload)
  delete missingModes.aiOnly
  delete missingModes.questionnaireOnly
  delete missingModes.combined
  const missingModesParsed = summary.parseScreeningSummary(
    JSON.stringify(missingModes),
    KNOWLEDGE,
  )
  assert.ok(missingModesParsed)
  assert.strictEqual(missingModesParsed.aiOnly, null)
  assert.strictEqual(missingModesParsed.questionnaireOnly, null)
  assert.strictEqual(missingModesParsed.combined, null)
  assert.deepStrictEqual(missingModesParsed.invalidModes, [])

  const noInformative = clone(payload)
  noInformative.answers = { ear_reflex: ['unsure'] }
  noInformative.questionnaireOnly = clone(payload.questionnaireOnly)
  const noInformativeParsed = summary.parseScreeningSummary(
    JSON.stringify(noInformative),
    KNOWLEDGE,
  )
  assert.ok(noInformativeParsed)
  assert.strictEqual(noInformativeParsed.questionnaireOnly, null)
  assert.strictEqual(noInformativeParsed.hasInformativeAnswers, false)
  assert.ok(!noInformativeParsed.invalidModes.includes('questionnaire-only'))

  const missingQuestionnaire = clone(payload)
  delete missingQuestionnaire.questionnaireOnly
  const missingQuestionnaireParsed = summary.parseScreeningSummary(
    JSON.stringify(missingQuestionnaire),
    KNOWLEDGE,
  )
  assert.ok(missingQuestionnaireParsed)
  assert.strictEqual(missingQuestionnaireParsed.questionnaireOnly, null)
  assert.ok(missingQuestionnaireParsed.aiOnly)
  assert.ok(missingQuestionnaireParsed.combined)

  const malformedAnswers = clone(payload)
  malformedAnswers.answers = {
    ear_reflex: 'yes',
    circular: ['yes', 'no'],
    unknown_question: ['yes'],
    location: ['ears', 'unknown_option'],
  }
  const malformedAnswersParsed = summary.parseScreeningSummary(
    JSON.stringify(malformedAnswers),
    KNOWLEDGE,
  )
  assert.ok(malformedAnswersParsed)
  assert.strictEqual(malformedAnswersParsed.answersValid, true)
  assert.ok(malformedAnswersParsed.invalidAnswerQuestionIds.includes('ear_reflex'))
  assert.ok(malformedAnswersParsed.invalidAnswerQuestionIds.includes('circular'))
  assert.ok(malformedAnswersParsed.invalidAnswerQuestionIds.includes('location'))
  assert.strictEqual(malformedAnswersParsed.answers.unknown_question, undefined)
  assert.strictEqual(
    malformedAnswersParsed.answerReview.find((row) => row.questionId === 'ear_reflex').status,
    'invalid',
  )

  const invalidAnswersShape = clone(payload)
  invalidAnswersShape.answers = []
  const invalidAnswersParsed = summary.parseScreeningSummary(
    JSON.stringify(invalidAnswersShape),
    KNOWLEDGE,
  )
  assert.ok(invalidAnswersParsed)
  assert.strictEqual(invalidAnswersParsed.answersValid, false)
  assert.strictEqual(invalidAnswersParsed.answerReview.length, 12)

  const missingAnswerPayload = clone(payload)
  delete missingAnswerPayload.answers.onset
  const missingAnswerParsed = summary.parseScreeningSummary(
    JSON.stringify(missingAnswerPayload),
    KNOWLEDGE,
  )
  assert.ok(missingAnswerParsed)
  assert.strictEqual(
    missingAnswerParsed.answerReview.find((row) => row.questionId === 'onset').status,
    'not-answered',
  )

  const unaskedPayload = clone(payload)
  unaskedPayload.answers = { ear_reflex: ['yes'] }
  unaskedPayload.askedQuestionIds = ['ear_reflex']
  const unaskedParsed = summary.parseScreeningSummary(
    JSON.stringify(unaskedPayload),
    KNOWLEDGE,
  )
  assert.ok(unaskedParsed)
  assert.strictEqual(
    unaskedParsed.answerReview.find((row) => row.questionId === 'onset').status,
    'not-asked',
  )

  const shuffledAskedIds = clone(payload)
  shuffledAskedIds.askedQuestionIds = [
    'onset',
    'ear_reflex',
    'location',
    'circular',
    'scaly',
    'spread',
    'symmetric',
    'hot_touch',
    'oozing',
    'pustules',
    'thickened',
    'allergy_trigger',
  ]
  const shuffledParsed = summary.parseScreeningSummary(
    JSON.stringify(shuffledAskedIds),
    KNOWLEDGE,
  )
  assert.ok(shuffledParsed)
  assert.deepStrictEqual(
    shuffledParsed.answerReview.map((row) => row.questionId),
    KNOWLEDGE.questions.map((question) => question.id),
  )

  console.log('summary logic tests passed')
} finally {
  fs.rmSync(tempRoot, { force: true, recursive: true })
}

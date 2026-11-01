const assert = require('assert')
const fs = require('fs')
const os = require('os')
const path = require('path')
const ts = require('typescript')

const mobileRoot = path.join(__dirname, '..')
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'xpawsure-adaptive-'))

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

function prediction(disease, confidence) {
  return { disease, confidence, label: disease }
}

function allIds(knowledge) {
  return knowledge.questions.map((question) => question.id)
}

function allUnsureAnswers(knowledge) {
  const answers = {}
  for (const question of knowledge.questions) {
    answers[question.id] = question.id === 'location' ? ['general'] : ['unsure']
  }
  return answers
}

try {
  transpile('ai/decisionTree/adaptive.config.ts', 'ai/decisionTree/adaptive.config.js')
  transpile('ai/decisionTree/adaptive.ts', 'ai/decisionTree/adaptive.js')
  transpile('ai/decisionTree/bayesian.config.ts', 'ai/decisionTree/bayesian.config.js')
  transpile('ai/decisionTree/bayesian.ts', 'ai/decisionTree/bayesian.js')
  transpile('ai/decisionTree/knowledge.ts', 'ai/decisionTree/knowledge.js')

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

  const adaptive = require(path.join(tempRoot, 'ai', 'decisionTree', 'adaptive.js'))
  const bayesian = require(path.join(tempRoot, 'ai', 'decisionTree', 'bayesian.js'))
  const { KNOWLEDGE } = require(path.join(tempRoot, 'ai', 'decisionTree', 'knowledge.js'))
  const {
    ADAPTIVE_CONFIG,
    EARLY_STOPPING_ENABLED,
  } = require(path.join(tempRoot, 'ai', 'decisionTree', 'adaptive.config.js'))

  const earlyConfig = { ...ADAPTIVE_CONFIG, earlyStoppingEnabled: true }
  const adaptiveMode = { adaptiveOrdering: true, earlyStopping: false }
  const adaptiveEarlyMode = { adaptiveOrdering: true, earlyStopping: true }
  const additiveMode = { adaptiveOrdering: false, earlyStopping: false }
  const staticEarlyMode = { adaptiveOrdering: false, earlyStopping: true }

  assert.strictEqual(EARLY_STOPPING_ENABLED, false)
  assert.deepStrictEqual(adaptive.resolveQuestionnaireMode('bayesian-provisional-v1', ADAPTIVE_CONFIG), adaptiveMode)
  assert.deepStrictEqual(adaptive.resolveQuestionnaireMode('bayesian-provisional-v1', earlyConfig), adaptiveEarlyMode)
  assert.deepStrictEqual(adaptive.resolveQuestionnaireMode('additive', earlyConfig), additiveMode)
  assert.deepStrictEqual(
    adaptive.resolveQuestionnaireMode('bayesian-provisional-v1', {
      ...earlyConfig,
      adaptiveOrderingEnabled: false,
    }),
    staticEarlyMode,
  )

  const strongMange = [
    prediction('MANGE', 90),
    prediction('ALLERGIC_DERMATITIS', 2),
    prediction('BACTERIAL', 2),
    prediction('FUNGAL', 3),
    prediction('HOTSPOT', 3),
  ]

  const earlyEvidence = { ear_reflex: ['yes'], circular: ['no'] }
  const early = adaptive.evaluateStopping(
    strongMange,
    earlyEvidence,
    ['ear_reflex', 'circular'],
    KNOWLEDGE,
    earlyConfig,
    true,
  )
  assert.strictEqual(early.shouldStop, true)
  assert.strictEqual(early.reason, 'criteria-met')
  assert.strictEqual(early.answeredCount, 2)
  assert.ok(early.answeredCount < 8)
  assert.strictEqual(early.criteria.leadingPosterior, true)
  assert.strictEqual(early.criteria.top2Margin, true)
  assert.strictEqual(early.criteria.informativeGroups, true)
  assert.strictEqual(early.criteria.stability, true)
  assert.strictEqual(early.stableInformativeUpdates, 2)

  const highPosteriorOnly = adaptive.evaluateStopping(
    strongMange,
    { ear_reflex: ['yes'] },
    ['ear_reflex'],
    KNOWLEDGE,
    earlyConfig,
    true,
  )
  assert.strictEqual(highPosteriorOnly.criteria.leadingPosterior, true)
  assert.strictEqual(highPosteriorOnly.criteria.informativeGroups, false)
  assert.strictEqual(highPosteriorOnly.criteria.stability, false)
  assert.strictEqual(highPosteriorOnly.shouldStop, false)

  const oneGroup = adaptive.evaluateStopping(
    strongMange,
    { circular: ['no'], scaly: ['yes'] },
    ['circular', 'scaly'],
    KNOWLEDGE,
    earlyConfig,
    true,
  )
  assert.strictEqual(oneGroup.criteria.top2Margin, true)
  assert.strictEqual(oneGroup.criteria.informativeGroups, false)
  assert.strictEqual(oneGroup.shouldStop, false)

  const marginConfig = {
    ...earlyConfig,
    leadingPosteriorThreshold: 0.50,
    minInformativeGroups: 0,
    stabilityInformativeUpdates: 0,
  }
  const marginFailure = adaptive.evaluateStopping(
    [
      prediction('MANGE', 55),
      prediction('ALLERGIC_DERMATITIS', 35),
      prediction('BACTERIAL', 4),
      prediction('FUNGAL', 3),
      prediction('HOTSPOT', 3),
    ],
    {},
    [],
    KNOWLEDGE,
    marginConfig,
    true,
  )
  assert.strictEqual(marginFailure.criteria.leadingPosterior, true)
  assert.strictEqual(marginFailure.criteria.top2Margin, false)
  assert.strictEqual(marginFailure.shouldStop, false)

  const mockKnowledge = {
    source: 'MOCK',
    questions: [
      {
        id: 'flip_first',
        text: 'First',
        options: [
          { id: 'yes', label: 'Yes', votes: { MANGE: 6, FUNGAL: -6 } },
          { id: 'no', label: 'No', votes: { MANGE: -6, FUNGAL: 6 } },
        ],
      },
      {
        id: 'flip_second',
        text: 'Second',
        options: [
          { id: 'yes', label: 'Yes', votes: { FUNGAL: 40, MANGE: -40 } },
          { id: 'no', label: 'No', votes: { FUNGAL: -40, MANGE: 40 } },
        ],
      },
      {
        id: 'flip_unanswered',
        text: 'Unanswered',
        options: [{ id: 'yes', label: 'Yes', votes: {} }],
      },
    ],
  }
  const flipPredictions = [
    prediction('MANGE', 40),
    prediction('FUNGAL', 55),
    prediction('ALLERGIC_DERMATITIS', 2),
    prediction('BACTERIAL', 1),
    prediction('HOTSPOT', 2),
  ]
  const unstable = adaptive.evaluateStopping(
    flipPredictions,
    { flip_first: ['yes'], flip_second: ['yes'] },
    ['flip_first', 'flip_second'],
    mockKnowledge,
    earlyConfig,
    true,
  )
  assert.strictEqual(unstable.criteria.leadingPosterior, true)
  assert.strictEqual(unstable.criteria.top2Margin, true)
  assert.strictEqual(unstable.criteria.informativeGroups, true)
  assert.strictEqual(unstable.criteria.stability, false)
  assert.strictEqual(unstable.stableInformativeUpdates, 1)
  assert.strictEqual(unstable.shouldStop, false)

  const editedStable = adaptive.evaluateStopping(
    flipPredictions,
    { flip_first: ['no'], flip_second: ['yes'] },
    ['flip_first', 'flip_second'],
    mockKnowledge,
    earlyConfig,
    true,
  )
  assert.strictEqual(editedStable.criteria.stability, true)
  assert.strictEqual(editedStable.stableInformativeUpdates, 2)
  assert.strictEqual(editedStable.shouldStop, true)

  const unknown = adaptive.evaluateStopping(
    strongMange,
    { ear_reflex: ['unsure'] },
    ['ear_reflex'],
    KNOWLEDGE,
    earlyConfig,
    true,
  )
  assert.strictEqual(unknown.informativeGroups, 0)
  assert.strictEqual(unknown.stableInformativeUpdates, 0)
  assert.strictEqual(unknown.shouldStop, false)

  const allQuestionIds = allIds(KNOWLEDGE)
  const allAnswered = adaptive.evaluateStopping(
    strongMange,
    allUnsureAnswers(KNOWLEDGE),
    allQuestionIds,
    KNOWLEDGE,
    earlyConfig,
    true,
  )
  assert.strictEqual(allAnswered.shouldStop, true)
  assert.strictEqual(allAnswered.reason, 'all-questions-answered')
  assert.strictEqual(allAnswered.answeredCount, 12)
  assert.strictEqual(allAnswered.criteria.informativeGroups, false)

  const disabledStop = adaptive.evaluateStopping(
    strongMange,
    earlyEvidence,
    ['ear_reflex', 'circular'],
    KNOWLEDGE,
    earlyConfig,
    false,
  )
  assert.strictEqual(disabledStop.shouldStop, false)
  assert.strictEqual(disabledStop.reason, null)

  assert.strictEqual(
    adaptive.selectNextQuestion(strongMange, {}, [], KNOWLEDGE, additiveMode).id,
    'ear_reflex',
  )
  assert.strictEqual(
    adaptive.selectNextQuestion(strongMange, {}, [], KNOWLEDGE, staticEarlyMode).id,
    'ear_reflex',
  )

  const firstAdaptive = adaptive.selectNextQuestion(strongMange, {}, [], KNOWLEDGE, adaptiveMode)
  const secondAdaptive = adaptive.selectNextQuestion(
    strongMange,
    {},
    [firstAdaptive.id],
    KNOWLEDGE,
    adaptiveMode,
  )
  assert.ok(firstAdaptive && secondAdaptive)
  assert.notStrictEqual(firstAdaptive.id, secondAdaptive.id)

  const splitPredictions = [
    prediction('MANGE', 48),
    prediction('FUNGAL', 48),
    prediction('ALLERGIC_DERMATITIS', 2),
    prediction('BACTERIAL', 1),
    prediction('HOTSPOT', 1),
  ]
  const splitPosterior = bayesian.refinePredictionsBayesian(splitPredictions, {}, KNOWLEDGE)
  const splitLeading = splitPosterior.refined[0].disease
  const splitRunnerUp = splitPosterior.refined[1].disease
  const circular = KNOWLEDGE.questions.find((question) => question.id === 'circular')
  const scaly = KNOWLEDGE.questions.find((question) => question.id === 'scaly')
  assert.ok(
    adaptive.questionDiscrimination(circular, splitLeading, splitRunnerUp)
      > adaptive.questionDiscrimination(scaly, splitLeading, splitRunnerUp),
  )
  assert.notStrictEqual(
    adaptive.selectNextQuestion(splitPredictions, {}, [], KNOWLEDGE, adaptiveMode).id,
    'scaly',
  )

  const flatKnowledge = {
    source: 'MOCK',
    questions: [
      {
        id: 'flat_one',
        text: 'Flat one',
        options: [{ id: 'yes', label: 'Yes', votes: {} }],
      },
      {
        id: 'flat_two',
        text: 'Flat two',
        options: [{ id: 'yes', label: 'Yes', votes: {} }],
      },
    ],
  }
  const noInfoFirst = adaptive.selectNextQuestion(strongMange, {}, [], flatKnowledge, adaptiveMode)
  const noInfoSecond = adaptive.selectNextQuestion(
    strongMange,
    {},
    ['flat_one'],
    flatKnowledge,
    adaptiveMode,
  )
  assert.strictEqual(noInfoFirst.id, 'flat_one')
  assert.strictEqual(noInfoSecond.id, 'flat_two')
  const noInfoDecision = adaptive.evaluateStopping(
    strongMange,
    {},
    ['flat_one'],
    flatKnowledge,
    earlyConfig,
    true,
  )
  assert.strictEqual(noInfoDecision.shouldStop, false)

  const firstState = adaptive.commitAdaptiveAnswer(
    { answers: {}, askedQuestionIds: [] },
    'ear_reflex',
    ['yes'],
  )
  const secondState = adaptive.commitAdaptiveAnswer(firstState, 'circular', ['no'])
  const editedState = adaptive.commitAdaptiveAnswer(secondState, 'ear_reflex', ['no'])
  assert.deepStrictEqual(editedState.askedQuestionIds, ['ear_reflex', 'circular'])
  assert.deepStrictEqual(editedState.answers.ear_reflex, ['no'])
  assert.deepStrictEqual(editedState.answers.circular, ['no'])
  assert.strictEqual(new Set(editedState.askedQuestionIds).size, editedState.askedQuestionIds.length)

  const additiveAll = adaptive.evaluateStopping(
    strongMange,
    allUnsureAnswers(KNOWLEDGE),
    allQuestionIds,
    KNOWLEDGE,
    earlyConfig,
    false,
  )
  assert.strictEqual(additiveAll.shouldStop, true)
  assert.strictEqual(additiveAll.reason, 'completed-with-early-stopping-disabled')

  let simulated = { answers: {}, askedQuestionIds: [] }
  let simulatedDecision = null
  for (let index = 0; index < allQuestionIds.length; index += 1) {
    const next = adaptive.selectNextQuestion(
      strongMange,
      simulated.answers,
      simulated.askedQuestionIds,
      KNOWLEDGE,
      adaptiveEarlyMode,
    )
    assert.ok(next)
    simulated = adaptive.commitAdaptiveAnswer(simulated, next.id, [next.options[0].id])
    simulatedDecision = adaptive.evaluateStopping(
      strongMange,
      simulated.answers,
      simulated.askedQuestionIds,
      KNOWLEDGE,
      earlyConfig,
      true,
    )
    if (simulatedDecision.shouldStop) break
  }
  assert.ok(simulatedDecision)
  assert.strictEqual(simulatedDecision.shouldStop, true)
  assert.ok(
    simulatedDecision.reason === 'criteria-met'
      || simulatedDecision.reason === 'all-questions-answered',
  )
  assert.strictEqual(
    new Set(simulated.askedQuestionIds).size,
    simulated.askedQuestionIds.length,
  )
  assert.ok(simulated.askedQuestionIds.length <= allQuestionIds.length)
  assert.strictEqual(simulatedDecision.answeredCount, simulated.askedQuestionIds.length)

  let exhaustive = { answers: {}, askedQuestionIds: [] }
  let exhaustiveDecision = null
  for (let index = 0; index < allQuestionIds.length; index += 1) {
    const next = adaptive.selectNextQuestion(
      strongMange,
      exhaustive.answers,
      exhaustive.askedQuestionIds,
      KNOWLEDGE,
      adaptiveMode,
    )
    assert.ok(next)
    exhaustive = adaptive.commitAdaptiveAnswer(exhaustive, next.id, [next.options[0].id])
    exhaustiveDecision = adaptive.evaluateStopping(
      strongMange,
      exhaustive.answers,
      exhaustive.askedQuestionIds,
      KNOWLEDGE,
      earlyConfig,
      false,
    )
    if (exhaustiveDecision.shouldStop) break
  }
  assert.ok(exhaustiveDecision)
  assert.strictEqual(exhaustiveDecision.answeredCount, allQuestionIds.length)
  assert.strictEqual(
    exhaustiveDecision.reason,
    'completed-with-early-stopping-disabled',
  )

  console.log('Adaptive questionnaire tests passed')
} finally {
  fs.rmSync(tempRoot, { force: true, recursive: true })
}

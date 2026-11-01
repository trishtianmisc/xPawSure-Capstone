const assert = require('assert')
const fs = require('fs')
const os = require('os')
const path = require('path')
const ts = require('typescript')

const mobileRoot = path.join(__dirname, '..')
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'xpawsure-bayesian-'))

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

function sum(vector) {
  return Object.values(vector).reduce((total, value) => total + value, 0)
}

function prediction(disease, confidence) {
  return { disease, confidence, label: disease }
}

try {
  transpile('ai/decisionTree/bayesian.config.ts', 'ai/decisionTree/bayesian.config.js')
  transpile('ai/decisionTree/bayesian.ts', 'ai/decisionTree/bayesian.js')
  transpile('ai/decisionTree/engine.ts', 'ai/decisionTree/engine.js')
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

  const { refinePredictionsBayesian } = require(path.join(tempRoot, 'ai', 'decisionTree', 'bayesian.js'))
  const { refinePredictions } = require(path.join(tempRoot, 'ai', 'decisionTree', 'engine.js'))
  const { KNOWLEDGE } = require(path.join(tempRoot, 'ai', 'decisionTree', 'knowledge.js'))
  const { QUESTION_GROUPS, REFINEMENT_METHOD } = require(path.join(
    tempRoot,
    'ai',
    'decisionTree',
    'bayesian.config.js',
  ))

  assert.strictEqual(REFINEMENT_METHOD, 'bayesian-provisional-v1')

  const grouped = new Set(QUESTION_GROUPS.flat())
  for (const question of KNOWLEDGE.questions) {
    assert.ok(grouped.has(question.id), `Question ${question.id} is not assigned to a group`)
  }

  const predictions = [
    prediction('MANGE', 21),
    prediction('ALLERGIC_DERMATITIS', 26),
    prediction('BACTERIAL', 20),
    prediction('FUNGAL', 18),
    prediction('HOTSPOT', 15),
  ]

  const baseline = refinePredictionsBayesian(predictions, {}, KNOWLEDGE)
  assert.strictEqual(baseline.method, 'bayesian-provisional-v1')
  assert.strictEqual(baseline.refinedTop.disease, 'ALLERGIC_DERMATITIS')
  assert.strictEqual(baseline.changed, false)
  approx(sum(baseline.posterior), 1)
  approx(sum(baseline.expertLogOdds), 0)
  approx(baseline.posterior.MANGE, 0.21, 1e-9)
  approx(baseline.posterior.ALLERGIC_DERMATITIS, 0.26, 1e-9)

  const unsure = refinePredictionsBayesian(predictions, { ear_reflex: ['unsure'] }, KNOWLEDGE)
  for (const disease of Object.keys(baseline.posterior)) {
    approx(unsure.posterior[disease], baseline.posterior[disease])
  }

  const earReflexYes = refinePredictionsBayesian(predictions, { ear_reflex: ['yes'] }, KNOWLEDGE)
  const earReflexNo = refinePredictionsBayesian(predictions, { ear_reflex: ['no'] }, KNOWLEDGE)
  assert.ok(earReflexYes.posterior.MANGE > baseline.posterior.MANGE)
  assert.ok(earReflexYes.posterior.MANGE > earReflexNo.posterior.MANGE)
  assert.ok(earReflexYes.expertLogOdds.MANGE > earReflexYes.expertLogOdds.FUNGAL)

  const balanced = [
    prediction('MANGE', 30),
    prediction('ALLERGIC_DERMATITIS', 29),
    prediction('BACTERIAL', 20),
    prediction('FUNGAL', 11),
    prediction('HOTSPOT', 10),
  ]
  const changed = refinePredictionsBayesian(balanced, { ear_reflex: ['yes'] }, KNOWLEDGE)
  assert.strictEqual(changed.originalTop.disease, 'MANGE')
  assert.strictEqual(changed.refinedTop.disease, 'MANGE')
  assert.strictEqual(changed.changed, false)

  const shifted = refinePredictionsBayesian(
    [
      prediction('MANGE', 30),
      prediction('ALLERGIC_DERMATITIS', 31),
      prediction('BACTERIAL', 20),
      prediction('FUNGAL', 10),
      prediction('HOTSPOT', 9),
    ],
    { ear_reflex: ['yes'] },
    KNOWLEDGE,
  )
  assert.strictEqual(shifted.refinedTop.disease, 'MANGE')
  assert.strictEqual(shifted.changed, true)

  const allLocations = KNOWLEDGE.questions
    .find((question) => question.id === 'location')
    .options.map((option) => option.id)
  const locations = refinePredictionsBayesian(predictions, { location: allLocations }, KNOWLEDGE)
  const maxLocationEvidence = Math.max(...Object.values(locations.expertLogOdds).map(Math.abs))
  assert.ok(maxLocationEvidence <= 2.5 + 1e-12)
  for (const value of Object.values(locations.posterior)) {
    assert.ok(Number.isFinite(value))
    assert.ok(value >= 0 && value <= 1)
  }
  approx(sum(locations.posterior), 1)

  const allAnswers = {}
  for (const question of KNOWLEDGE.questions) {
    allAnswers[question.id] = question.multi
      ? question.options.map((option) => option.id)
      : [question.options[0].id]
  }
  const saturated = refinePredictionsBayesian(predictions, allAnswers, KNOWLEDGE)
  const maxSaturatedEvidence = Math.max(...Object.values(saturated.expertLogOdds).map(Math.abs))
  assert.ok(maxSaturatedEvidence <= 2.5 + 1e-12)
  approx(sum(saturated.posterior), 1)
  for (const item of saturated.refined) {
    assert.ok(item.confidence >= 0 && item.confidence <= 100)
  }

  const additive = refinePredictions(predictions, {}, KNOWLEDGE)
  assert.strictEqual(additive.refinedTop.disease, 'ALLERGIC_DERMATITIS')

  assert.throws(
    () => refinePredictionsBayesian([], {}, KNOWLEDGE),
    /At least one image prediction is required/,
  )

  console.log('Bayesian refinement tests passed')
} finally {
  fs.rmSync(tempRoot, { force: true, recursive: true })
}

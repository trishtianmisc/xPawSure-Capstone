const assert = require('assert')
const fs = require('fs')
const os = require('os')
const path = require('path')
const ts = require('typescript')

const logicPath = path.join(__dirname, '..', 'ai', 'services', 'screening.logic.ts')
const source = fs.readFileSync(logicPath, 'utf8')
const output = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText
const tempPath = path.join(os.tmpdir(), `xpawsure-screening-logic-${process.pid}.cjs`)

fs.writeFileSync(tempPath, output)

try {
  const {
    average,
    buildImageReports,
    countRejectedReports,
    decideScreeningState,
    selectValidIndices,
    statusForSimilarity,
  } = require(tempPath)

  const thresholds = { minSimilarity: 0.10, skinSimilarity: 0.30 }
  const uris = ['face-1', 'face-2', 'bacterial-1']
  const qualityOk = [true, true, true]

  const testA = [0.192, 0.237, 0.696]
  const reportsA = buildImageReports(uris, qualityOk, testA, thresholds)
  assert.deepStrictEqual(
    reportsA.map((report) => report.status),
    ['not_skin', 'not_skin', 'ok'],
  )
  assert.deepStrictEqual(selectValidIndices(testA, thresholds.skinSimilarity), [2])
  assert.strictEqual(
    decideScreeningState(3, 1, average([testA[2]]), thresholds.skinSimilarity),
    'NOT_SKIN_IMAGE',
  )
  assert.deepStrictEqual(countRejectedReports(reportsA), {
    quality: 0,
    notSkin: 2,
    lowSimilarity: 0,
    notValidated: 0,
    validationError: 0,
  })

  const testB = [0.192, 0.237, 0.250]
  const reportsB = buildImageReports(uris, qualityOk, testB, thresholds)
  assert.deepStrictEqual(
    reportsB.map((report) => report.status),
    ['not_skin', 'not_skin', 'not_skin'],
  )
  assert.deepStrictEqual(selectValidIndices(testB, thresholds.skinSimilarity), [])
  assert.strictEqual(
    decideScreeningState(3, 0, average([]), thresholds.skinSimilarity),
    'NOT_SKIN_IMAGE',
  )

  const dogSkin = [0.696, 0.696, 0.65]
  assert.deepStrictEqual(selectValidIndices(dogSkin, thresholds.skinSimilarity), [0, 1, 2])
  assert.strictEqual(
    decideScreeningState(3, 3, average(dogSkin), thresholds.skinSimilarity),
    'DISEASE_DETECTED',
  )

  // All 3 photos must pass: one non-skin photo blocks the whole screening.
  const mixedDogAndFaces = [0.696, 0.237, 0.696]
  assert.deepStrictEqual(
    selectValidIndices(mixedDogAndFaces, thresholds.skinSimilarity),
    [0, 2],
  )
  assert.strictEqual(
    decideScreeningState(
      3,
      2,
      average([mixedDogAndFaces[0], mixedDogAndFaces[2]]),
      thresholds.skinSimilarity,
    ),
    'NOT_SKIN_IMAGE',
  )

  const dogSkinWithLowOutlier = [0.696, 0.696, 0.227]
  assert.deepStrictEqual(
    selectValidIndices(dogSkinWithLowOutlier, thresholds.skinSimilarity),
    [0, 1],
  )
  assert.strictEqual(
    decideScreeningState(
      3,
      2,
      average([dogSkinWithLowOutlier[0], dogSkinWithLowOutlier[1]]),
      thresholds.skinSimilarity,
    ),
    'NOT_SKIN_IMAGE',
  )

  assert.strictEqual(
    decideScreeningState(2, 2, 0.5, thresholds.skinSimilarity),
    'INVALID_IMAGE',
  )
  assert.strictEqual(
    decideScreeningState(3, 3, 0.299, thresholds.skinSimilarity),
    'UNCERTAIN',
  )
  assert.strictEqual(
    decideScreeningState(3, 3, 0.30, thresholds.skinSimilarity),
    'DISEASE_DETECTED',
  )

  assert.strictEqual(statusForSimilarity(true, 0.099, thresholds), 'low_similarity')
  assert.strictEqual(statusForSimilarity(true, 0.10, thresholds), 'not_skin')
  assert.strictEqual(statusForSimilarity(true, 0.299, thresholds), 'not_skin')
  assert.strictEqual(statusForSimilarity(true, 0.30, thresholds), 'ok')
  assert.strictEqual(statusForSimilarity(false, 0.99, thresholds), 'quality_failed')

  const qualityReports = buildImageReports(
    ['bad', 'face', 'bacterial'],
    [false, true, true],
    [null, 0.237, 0.696],
    thresholds,
  )
  assert.deepStrictEqual(
    qualityReports.map((report) => report.status),
    ['quality_failed', 'not_skin', 'ok'],
  )
  assert.deepStrictEqual(
    qualityReports.map((report) => report.similarity),
    [null, 0.237, 0.696],
  )
  assert.deepStrictEqual(countRejectedReports(qualityReports), {
    quality: 1,
    notSkin: 1,
    lowSimilarity: 0,
    notValidated: 0,
    validationError: 0,
  })

  assert.strictEqual(average([]), 0)

  console.log('screening logic tests passed')
} finally {
  fs.unlinkSync(tempPath)
}

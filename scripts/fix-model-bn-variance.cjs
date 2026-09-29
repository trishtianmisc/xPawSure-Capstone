#!/usr/bin/env node
/**
 * Offline fix for negative BatchNormalization moving_variance values in
 * mobile/assets/model/weights.bin (Keras/keras-apps export artifact).
 *
 * Rationale: the mobile app used to clamp these at load time with a
 * per-layer dataSync() loop, which caused synchronous GPU readbacks and a
 * visible UI freeze while "Preparing AI model...". The fix is now baked
 * into the weight file once, offline.
 *
 * Usage:
 *   node scripts/fix-model-bn-variance.js           # fix (idempotent) + verify
 *   node scripts/fix-model-bn-variance.js --verify  # read-only verification
 *
 * Safety:
 *   - Byte offsets are derived from model.json weight specs and the total
 *     is asserted against the actual file size before any write.
 *   - Only float32 tensors named "*moving_variance*" are touched.
 *   - After writing, the file is re-read and asserted to contain no
 *     negative variance values.
 */

const fs = require('fs')
const path = require('path')

const MODEL_JSON = path.join(__dirname, '..', 'mobile', 'assets', 'model', 'model.json')
const WEIGHTS_BIN = path.join(__dirname, '..', 'mobile', 'assets', 'model', 'weights.bin')

function fail(message) {
  console.error(`[fix-bn-variance] ERROR: ${message}`)
  process.exit(1)
}

function loadSpecs() {
  const modelJSON = JSON.parse(fs.readFileSync(MODEL_JSON, 'utf8'))
  const manifest = modelJSON.weightsManifest
  if (!Array.isArray(manifest) || manifest.length !== 1) {
    fail(`expected exactly 1 weights manifest group, got ${manifest && manifest.length}`)
  }
  if (manifest[0].paths.length !== 1 || manifest[0].paths[0] !== 'weights.bin') {
    fail(`expected manifest paths ["weights.bin"], got ${JSON.stringify(manifest[0].paths)}`)
  }
  const specs = manifest[0].weights
  if (!Array.isArray(specs) || specs.length === 0) fail('empty weight specs')

  const entries = []
  let offset = 0
  for (const spec of specs) {
    if (spec.dtype !== 'float32') fail(`unexpected dtype "${spec.dtype}" for ${spec.name}`)
    const count = Array.isArray(spec.shape) ? spec.shape.reduce((a, b) => a * b, 1) : 1
    const bytes = count * 4
    entries.push({ name: spec.name, offset, count, bytes })
    offset += bytes
  }
  return { entries, totalBytes: offset }
}

function varianceEntries(entries) {
  return entries.filter((e) => e.name.includes('moving_variance'))
}

function scanVariances(buffer, entries) {
  let negative = 0
  let nan = 0
  for (const e of entries) {
    for (let i = 0; i < e.count; i++) {
      const v = buffer.readFloatLE(e.offset + i * 4)
      if (Number.isNaN(v)) nan += 1
      else if (v < 0) negative += 1
    }
  }
  return { negative, nan }
}

function fixVariances(buffer, entries) {
  let clamped = 0
  for (const e of entries) {
    for (let i = 0; i < e.count; i++) {
      const at = e.offset + i * 4
      const v = buffer.readFloatLE(at)
      if (v < 0) {
        buffer.writeFloatLE(0, at)
        clamped += 1
      }
    }
  }
  return clamped
}

function main() {
  const verifyOnly = process.argv.includes('--verify')
  const { entries, totalBytes } = loadSpecs()

  const fileSize = fs.statSync(WEIGHTS_BIN).size
  if (fileSize !== totalBytes) {
    fail(`size mismatch: model.json implies ${totalBytes} bytes, weights.bin is ${fileSize} bytes`)
  }
  console.log(`[fix-bn-variance] size OK: ${fileSize} bytes, ${entries.length} tensors`)

  const variances = varianceEntries(entries)
  if (variances.length === 0) fail('no moving_variance tensors found')
  console.log(`[fix-bn-variance] ${variances.length} moving_variance tensors`)

  let buffer = fs.readFileSync(WEIGHTS_BIN)

  if (verifyOnly) {
    const { negative, nan } = scanVariances(buffer, variances)
    if (nan > 0) fail(`found ${nan} NaN values in moving_variance`)
    if (negative > 0) fail(`found ${negative} negative variance values (run without --verify to fix)`)
    console.log('[fix-bn-variance] VERIFY OK: no negative or NaN variance values')
    return
  }

  const before = scanVariances(buffer, variances)
  if (before.nan > 0) fail(`found ${before.nan} NaN values in moving_variance - file looks corrupt`)
  console.log(`[fix-bn-variance] before: ${before.negative} negative values`)

  const clamped = fixVariances(buffer, variances)
  if (clamped > 0) {
    fs.writeFileSync(WEIGHTS_BIN, buffer)
    console.log(`[fix-bn-variance] clamped ${clamped} values to 0, file written`)
  } else {
    console.log('[fix-bn-variance] nothing to fix (already baked)')
  }

  buffer = fs.readFileSync(WEIGHTS_BIN)
  const after = scanVariances(buffer, variances)
  if (buffer.length !== fileSize) fail('file size changed unexpectedly')
  if (after.negative !== 0 || after.nan !== 0) {
    fail(`post-fix verification failed: ${after.negative} negative, ${after.nan} NaN`)
  }
  console.log('[fix-bn-variance] VERIFY OK: 0 negative / 0 NaN variance values')
}

main()

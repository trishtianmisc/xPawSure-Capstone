import * as tf from '@tensorflow/tfjs'
import { decodeJpeg } from '@tensorflow/tfjs-react-native'
import { Asset } from 'expo-asset'
import { File } from 'expo-file-system'

import { MODEL_INFO } from '../constants/diseases'
import type {
  ClaudeValidationDecision,
  ModelInfo,
  Prediction,
  ScreeningResult,
  ScreeningResultState,
} from '../types/ai.types'
import { SCREENING_THRESHOLDS, SCREENING_STATE_MESSAGES } from '../constants/diseases'
import { Normalization, Rescaling } from './customLayers'
import {
  average,
  buildImageReports,
  decideScreeningState,
  MIN_VALID_IMAGES,
  selectValidIndices,
} from './screening.logic'
import {
  CLAUDE_VALIDATION_MAX_IMAGES,
  createValidationSession,
  notValidatedDecision,
  resolveEligibility,
  validateTargetImages,
  type ClaudeValidationIO,
  type ValidationSessionState,
} from './claudeValidation'

tf.serialization.registerClass(Normalization)
tf.serialization.registerClass(Rescaling)

let model: tf.LayersModel | null = null
let combinedModel: tf.LayersModel | null = null
let trainingMeanVector: Float32Array | null = null
let isModelLoaded = false
let modelLoadPromise: Promise<void> | null = null

const validationSessions = new Map<string, ValidationSessionState>()
const MAX_TRACKED_VALIDATION_SESSIONS = 8

function getValidationSession(sessionId: string): ValidationSessionState {
  const existing = validationSessions.get(sessionId)
  if (existing) {
    validationSessions.delete(sessionId)
    validationSessions.set(sessionId, existing)
    return existing
  }

  const state = createValidationSession()
  validationSessions.set(sessionId, state)
  if (validationSessions.size > MAX_TRACKED_VALIDATION_SESSIONS) {
    const oldest = validationSessions.keys().next().value
    if (oldest !== undefined) {
      validationSessions.delete(oldest)
    }
  }
  return state
}

export async function loadModel(): Promise<void> {
  if (isModelLoaded) return
  if (modelLoadPromise) return modelLoadPromise

  modelLoadPromise = (async () => {
    try {
      const loadStart = Date.now()

      const backendStart = Date.now()
      try {
        await tf.setBackend('rn-webgl')
      } catch (error) {
        console.log(`[TF] rn-webgl unavailable (${error})`)
        await tf.setBackend('cpu')
      }
      await tf.ready()
      console.log(`[TF] backend=${tf.getBackend()} in ${Date.now() - backendStart}ms`)

      const modelJSON = require('../../assets/model/model.json')

      const weightsStart = Date.now()
      const weightsAsset = await Asset.loadAsync(
        require('../../assets/model/weights.bin'),
      )

      const weightsUri = weightsAsset[0].localUri
      const weightsFile = new File(weightsUri!)
      const weightsBytes = await weightsFile.bytes()
      console.log(`[TF] weights loaded in ${Date.now() - weightsStart}ms`)

      const parseStart = Date.now()
      model = await tf.loadLayersModel(
        tf.io.fromMemory({
          modelTopology: modelJSON.modelTopology,
          weightSpecs: modelJSON.weightsManifest[0].weights,
          weightData: weightsBytes.buffer,
        })
      )
      console.log(`[TF] model parsed in ${Date.now() - parseStart}ms`)

      const warmupStart = Date.now()
      if (tf.getBackend() !== 'cpu') {
        const zeroTensor = tf.zeros([1, 224, 224, 3])
        const warmup = model.predict(zeroTensor) as tf.Tensor
        await warmup.data()
        warmup.dispose()
        zeroTensor.dispose()
        console.log(`[TF] warmup in ${Date.now() - warmupStart}ms`)
      } else {
        console.log(`[TF] warmup skipped (cpu backend)`)
      }

      const trainingRef = require('../../assets/model/training_reference.json')
      trainingMeanVector = new Float32Array(trainingRef.mean_feature)
      console.log(`[TF] Loaded training reference: ${trainingRef.num_images} images, ${trainingRef.feature_dim} features`)

      const gapLayer = model.getLayer('global_average_pooling2d')
      combinedModel = tf.model({
        inputs: model.inputs,
        outputs: [model.outputs[0], gapLayer.output as tf.SymbolicTensor],
      })
      console.log(`[TF] Single-pass model created: class + feature outputs`)

      isModelLoaded = true
      console.log(`[TF] model ready in ${Date.now() - loadStart}ms total`)
    } catch (error) {
      modelLoadPromise = null
      throw new Error(`Failed to load TensorFlow model: ${error}`)
    }
  })()

  return modelLoadPromise
}

export function preloadModel(): void {
  loadModel().catch(() => {})
}

export function isReady(): boolean {
  return isModelLoaded
}

export async function preprocessImage(
  uri: string,
  inputSize: number = MODEL_INFO.inputSize,
): Promise<tf.Tensor4D> {
  const file = new File(uri)
  const imageBytes = await file.bytes()
  const imageTensor = decodeJpeg(imageBytes, 3)

  const resized = tf.image.resizeBilinear(imageTensor, [inputSize, inputSize])
  const expanded = tf.expandDims(resized, 0) as tf.Tensor4D

  imageTensor.dispose()
  resized.dispose()

  return expanded
}

function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dotProduct = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

export async function runMultiScreening(
  imageUris: string[],
  sessionId: string,
  io: ClaudeValidationIO,
  modelInfo: ModelInfo = MODEL_INFO,
): Promise<ScreeningResult> {
  if (!isModelLoaded) {
    await loadModel()
  }

  const qualityFlags: boolean[] = []
  const keptTensors: tf.Tensor4D[] = []

  for (const uri of imageUris) {
    const preprocessStart = Date.now()
    const tensor = await preprocessImage(uri, modelInfo.inputSize)
    console.log(`[TF SCREENING] PREP: ${Date.now() - preprocessStart}ms`)
    const moments = tf.moments(tensor)
    const meanVal = (await moments.mean.data())[0]
    const variance = (await moments.variance.data())[0]
    moments.mean.dispose()
    moments.variance.dispose()

    const qualityOk =
      meanVal >= SCREENING_THRESHOLDS.IMAGE_MIN_BRIGHTNESS &&
      meanVal <= SCREENING_THRESHOLDS.IMAGE_MAX_BRIGHTNESS &&
      variance >= SCREENING_THRESHOLDS.IMAGE_MIN_VARIANCE

    qualityFlags.push(qualityOk)
    if (qualityOk) {
      keptTensors.push(tensor)
    } else {
      tensor.dispose()
    }
  }

  try {
    const similarityThresholds = {
      minSimilarity: SCREENING_THRESHOLDS.FEATURE_SIMILARITY_MIN,
      skinSimilarity: SCREENING_THRESHOLDS.FEATURE_SIMILARITY_HIGH,
    }

    if (keptTensors.length < MIN_VALID_IMAGES) {
      const message = `All ${MIN_VALID_IMAGES} photos must pass the image quality checks before screening can continue. Please retake the photo(s) that are blurry, too dark, or unclear.`
      console.log(`[TF SCREENING] MULTI INVALID_IMAGE: ${keptTensors.length}/${imageUris.length} passed quality gates`)
      for (const tensor of keptTensors) {
        tensor.dispose()
      }
      const skippedClaude: (ClaudeValidationDecision | null)[] = qualityFlags.map((qualityOk) =>
        qualityOk
          ? notValidatedDecision(
              'The AI safety review did not run because fewer than 3 photos passed the quality checks.',
            )
          : null,
      )
      return {
        predictions: [],
        inferenceTimeMs: 0,
        modelVersion: modelInfo.version,
        state: 'INVALID_IMAGE',
        stateMessage: message,
        imageReports: buildImageReports(
          imageUris,
          qualityFlags,
          null,
          similarityThresholds,
          skippedClaude,
        ),
      }
    }

    if (!combinedModel) {
      throw new Error('Model not loaded. Call loadModel() first.')
    }

    const qualityOkSlots: number[] = []
    for (let index = 0; index < qualityFlags.length; index++) {
      if (qualityFlags[index]) qualityOkSlots.push(index)
    }
    const targetSlots = qualityOkSlots.slice(0, CLAUDE_VALIDATION_MAX_IMAGES)

    console.log(
      `[TF SCREENING] GATE: reviewing ${targetSlots.length} of ${imageUris.length} photos (session=${sessionId})`,
    )
    const validationSession = getValidationSession(sessionId)
    const decisions = await validateTargetImages({
      sessionId,
      state: validationSession,
      io,
      targets: targetSlots.map((slot) => ({ index: slot, uri: imageUris[slot] })),
    })
    const eligibility = resolveEligibility(decisions, targetSlots, MIN_VALID_IMAGES)
    console.log(
      `[TF SCREENING] GATE: approved=${eligibility.approved.length}/${targetSlots.length} callsUsed=${validationSession.callsUsed}`,
    )

    const claudeEntries: (ClaudeValidationDecision | null)[] = imageUris.map((_, index) => {
      if (!qualityFlags[index]) return null
      return decisions[index] ?? notValidatedDecision()
    })

    if (eligibility.blocked) {
      for (const tensor of keptTensors) {
        tensor.dispose()
      }
      const stateMessage =
        eligibility.message ?? SCREENING_STATE_MESSAGES.INVALID_IMAGE.message
      console.log(`[TF SCREENING] MULTI INVALID_IMAGE (gate): ${stateMessage}`)
      return {
        predictions: [],
        inferenceTimeMs: 0,
        modelVersion: modelInfo.version,
        state: 'INVALID_IMAGE',
        stateMessage,
        imageReports: buildImageReports(
          imageUris,
          qualityFlags,
          null,
          similarityThresholds,
          claudeEntries,
        ),
      }
    }

    const approvedSlots = new Set(eligibility.approved)
    const eligibleTensors: tf.Tensor4D[] = []
    keptTensors.forEach((tensor, position) => {
      const slot = qualityOkSlots[position]
      if (approvedSlots.has(slot)) {
        eligibleTensors.push(tensor)
      } else {
        tensor.dispose()
      }
    })

    const batch = tf.concat(eligibleTensors, 0)
    const numEligible = eligibleTensors.length
    for (const tensor of eligibleTensors) {
      tensor.dispose()
    }

    const startTime = Date.now()
    let probabilities: Float32Array
    let featureData: Float32Array
    let inferenceTimeMs = 0
    try {
      const outputs = combinedModel.predict(batch) as tf.Tensor[]
      try {
        probabilities = (await outputs[0].data()) as Float32Array
        featureData = (await outputs[1].data()) as Float32Array
      } finally {
        outputs[0].dispose()
        outputs[1].dispose()
      }
      inferenceTimeMs = Date.now() - startTime
    } finally {
      batch.dispose()
    }

    const numClasses = modelInfo.labels.length
    const featDim = trainingMeanVector?.length ?? 0

    const similarities: number[] = []
    for (let i = 0; i < numEligible; i++) {
      if (trainingMeanVector) {
        const feat = featureData.slice(i * featDim, (i + 1) * featDim)
        similarities.push(cosineSimilarity(new Float32Array(feat), trainingMeanVector))
      } else {
        similarities.push(1.0)
      }
    }

    const validIndices = selectValidIndices(
      similarities,
      SCREENING_THRESHOLDS.FEATURE_SIMILARITY_HIGH,
    )
    const similaritiesBySlot: (number | null)[] = imageUris.map(() => null)
    eligibility.approved.forEach((slot, row) => {
      similaritiesBySlot[slot] = similarities[row] ?? null
    })
    const imageReports = buildImageReports(
      imageUris,
      qualityFlags,
      similaritiesBySlot,
      similarityThresholds,
      claudeEntries,
    )

    console.log(`[TF SCREENING] MULTI: ${numEligible}/${imageUris.length} validated, ${validIndices.length} skin-valid (>=${SCREENING_THRESHOLDS.FEATURE_SIMILARITY_HIGH}), sims=[${similarities.map(s => s.toFixed(3)).join(', ')}]`)

    const buildPredictions = (indices: number[]): Prediction[] => {
      const avg = new Float32Array(numClasses)
      for (const i of indices) {
        for (let c = 0; c < numClasses; c++) {
          avg[c] += probabilities[i * numClasses + c] / indices.length
        }
      }
      const preds: Prediction[] = Array.from(avg).map((prob, i) => ({
        disease: modelInfo.labels[i] as Prediction['disease'],
        confidence: Math.round(prob * 10000) / 100,
        label: modelInfo.labels[i] ?? `Class ${i}`,
      }))
      preds.sort((a, b) => b.confidence - a.confidence)
      return preds
    }

    if (validIndices.length < MIN_VALID_IMAGES) {
      const message = `Only ${validIndices.length} of ${numEligible} approved photos looked like dog skin. Retake close-up photos of the affected skin area.`
      console.log(`[TF SCREENING] MULTI NOT_SKIN_IMAGE: ${validIndices.length}/${numEligible} skin-valid below minimum ${MIN_VALID_IMAGES}`)
      return {
        predictions: [],
        inferenceTimeMs,
        modelVersion: modelInfo.version,
        state: 'NOT_SKIN_IMAGE',
        stateMessage: message,
        imageReports,
      }
    }

    const predictions = buildPredictions(validIndices)

    const meanSim = average(validIndices.map((index) => similarities[index]))

    const state = decideScreeningState(
      numEligible,
      validIndices.length,
      meanSim,
      SCREENING_THRESHOLDS.FEATURE_SIMILARITY_HIGH,
    )
    const stateMessage = SCREENING_STATE_MESSAGES[state].message

    console.log(`[TF SCREENING] MULTI RESULT: state=${state} meanSim=${meanSim.toFixed(3)} top=${predictions[0].label} ${predictions[0].confidence}% inference=${inferenceTimeMs}ms`)

    let validation: { imageUri: string; token: string } | undefined
    for (const slot of eligibility.approved) {
      const token = decisions[slot]?.token
      if (token) {
        validation = { imageUri: imageUris[slot], token }
        break
      }
    }

    return {
      predictions,
      topPrediction: predictions[0],
      inferenceTimeMs,
      modelVersion: modelInfo.version,
      state,
      stateMessage,
      imageReports,
      validation,
    }
  } finally {
    for (const tensor of keptTensors) {
      tensor.dispose()
    }
  }
}

export function disposeModel(): void {
  if (combinedModel) {
    combinedModel.dispose()
    combinedModel = null
  }
  if (model) {
    model.dispose()
    model = null
    isModelLoaded = false
    modelLoadPromise = null
  }
}

export async function warmUpModel(): Promise<void> {
  if (!model) return
  try {
    const zeroTensor = tf.zeros([1, 224, 224, 3]) as tf.Tensor4D
    console.log('[TF] warmup running...')
    const output = model.predict(zeroTensor) as tf.Tensor
    const outData = await output.data()
    console.log('[TF] warmup output:', Array.from(outData).map(v => v.toFixed(6)))
    output.dispose()
    zeroTensor.dispose()
  } catch (e) {
    console.error('[TF] warmup failed:', e)
  }
}



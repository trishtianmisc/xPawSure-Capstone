import * as tf from '@tensorflow/tfjs'
import { decodeJpeg } from '@tensorflow/tfjs-react-native'
import { Asset } from 'expo-asset'
import { File } from 'expo-file-system'

import { MODEL_INFO } from '../constants/diseases'
import type { ImageReport, ModelInfo, Prediction, ScreeningResult, ScreeningResultState } from '../types/ai.types'
import { SCREENING_THRESHOLDS, SCREENING_STATE_MESSAGES } from '../constants/diseases'
import { Normalization, Rescaling } from './customLayers'

tf.serialization.registerClass(Normalization)
tf.serialization.registerClass(Rescaling)

let model: tf.LayersModel | null = null
let combinedModel: tf.LayersModel | null = null
let trainingMeanVector: Float32Array | null = null
let isModelLoaded = false
let modelLoadPromise: Promise<void> | null = null

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

function computeShannonEntropy(probs: Float32Array): number {
  let entropy = 0
  for (let i = 0; i < probs.length; i++) {
    if (probs[i] > 0) {
      entropy -= probs[i] * Math.log2(probs[i])
    }
  }
  return entropy
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

function determineScreeningState(predictions: Prediction[], featureSimilarity: number): {
  state: ScreeningResultState
  stateMessage: string
} {
  const sorted = [...predictions].sort((a, b) => b.confidence - a.confidence)
  const top1 = sorted[0].confidence / 100
  const top2 = sorted[1].confidence / 100
  const margin = top1 - top2

  const probs = new Float32Array(predictions.map(p => p.confidence / 100))
  const entropy = computeShannonEntropy(probs)

  console.log(`[TF SCREENING] Top1=${(top1 * 100).toFixed(1)}% Top2=${(top2 * 100).toFixed(1)}% Margin=${(margin * 100).toFixed(1)}% Entropy=${entropy.toFixed(3)} Similarity=${featureSimilarity.toFixed(3)}`)

  if (featureSimilarity >= SCREENING_THRESHOLDS.FEATURE_SIMILARITY_HIGH) {
    console.log(`[TF SCREENING] DISEASE_DETECTED: similarity ${featureSimilarity.toFixed(3)} >= ${SCREENING_THRESHOLDS.FEATURE_SIMILARITY_HIGH} threshold (high confidence skin region)`)
    return { state: 'DISEASE_DETECTED', stateMessage: SCREENING_STATE_MESSAGES.DISEASE_DETECTED.message }
  }

  if (featureSimilarity < SCREENING_THRESHOLDS.FEATURE_SIMILARITY_MIN) {
    console.log(`[TF SCREENING] NOT_SKIN_IMAGE: similarity ${featureSimilarity.toFixed(3)} < ${SCREENING_THRESHOLDS.FEATURE_SIMILARITY_MIN} threshold`)
    return { state: 'NOT_SKIN_IMAGE', stateMessage: SCREENING_STATE_MESSAGES.NOT_SKIN_IMAGE.message }
  }

  console.log(`[TF SCREENING] UNCERTAIN: similarity ${featureSimilarity.toFixed(3)} in overlap zone [${SCREENING_THRESHOLDS.FEATURE_SIMILARITY_MIN}, ${SCREENING_THRESHOLDS.FEATURE_SIMILARITY_HIGH})`)
  return { state: 'UNCERTAIN', stateMessage: SCREENING_STATE_MESSAGES.UNCERTAIN.message }
}

export async function runInference(
  imageTensor: tf.Tensor4D,
  modelInfo?: ModelInfo,
): Promise<ScreeningResult> {
  if (!model || !combinedModel) {
    throw new Error('Model not loaded. Call loadModel() first.')
  }

  const startTime = Date.now()
  const outputs = combinedModel.predict(imageTensor) as tf.Tensor[]
  const probabilities = (await outputs[0].data()) as Float32Array
  const featureData = await outputs[1].data()
  const inferenceTimeMs = Date.now() - startTime
  outputs[0].dispose()
  outputs[1].dispose()

  let featureSimilarity = 1.0
  if (trainingMeanVector) {
    featureSimilarity = cosineSimilarity(new Float32Array(featureData), trainingMeanVector)
    console.log(`[TF SCREENING] Feature similarity: ${featureSimilarity.toFixed(4)}`)
  }

  const predictions: Prediction[] = Array.from(probabilities).map((prob, i) => ({
    disease: modelInfo?.labels[i] ?? (`CLASS_${i}` as any),
    confidence: Math.round(prob * 10000) / 100,
    label: modelInfo?.labels[i] ?? `Class ${i}`,
  }))

  predictions.sort((a, b) => b.confidence - a.confidence)

  const { state, stateMessage } = determineScreeningState(predictions, featureSimilarity)

  console.log(`[TF SCREENING] RESULT: sim=${featureSimilarity.toFixed(3)} state=${state} top=${predictions[0].label} ${predictions[0].confidence}% inference=${inferenceTimeMs}ms`)

  return {
    predictions,
    topPrediction: predictions[0],
    inferenceTimeMs,
    modelVersion: modelInfo?.version ?? 'unknown',
    state,
    stateMessage,
  }
}

export async function runScreening(
  imageUri: string,
  modelInfo: ModelInfo = MODEL_INFO,
): Promise<ScreeningResult> {
  if (!isModelLoaded) {
    await loadModel()
  }

  const imageTensor = await preprocessImage(imageUri, modelInfo.inputSize)

  try {
    const moments = tf.moments(imageTensor)
    const meanVal = (await moments.mean.data())[0]
    const variance = (await moments.variance.data())[0]
    moments.mean.dispose()
    moments.variance.dispose()

    console.log(`[TF SCREENING] Image quality: mean=${meanVal.toFixed(1)} variance=${variance.toFixed(1)}`)

    if (meanVal < SCREENING_THRESHOLDS.IMAGE_MIN_BRIGHTNESS || meanVal > SCREENING_THRESHOLDS.IMAGE_MAX_BRIGHTNESS) {
      console.log(`[TF SCREENING] INVALID_IMAGE: brightness ${meanVal.toFixed(1)} outside [${SCREENING_THRESHOLDS.IMAGE_MIN_BRIGHTNESS}, ${SCREENING_THRESHOLDS.IMAGE_MAX_BRIGHTNESS}]`)
      return {
        predictions: [],
        inferenceTimeMs: 0,
        modelVersion: modelInfo.version,
        state: 'INVALID_IMAGE',
        stateMessage: SCREENING_STATE_MESSAGES.INVALID_IMAGE.message,
      }
    }

    if (variance < SCREENING_THRESHOLDS.IMAGE_MIN_VARIANCE) {
      console.log(`[TF SCREENING] INVALID_IMAGE: variance ${variance.toFixed(1)} < ${SCREENING_THRESHOLDS.IMAGE_MIN_VARIANCE}`)
      return {
        predictions: [],
        inferenceTimeMs: 0,
        modelVersion: modelInfo.version,
        state: 'INVALID_IMAGE',
        stateMessage: SCREENING_STATE_MESSAGES.INVALID_IMAGE.message,
      }
    }

    return await runInference(imageTensor, modelInfo)
  } finally {
    imageTensor.dispose()
  }
}

const MIN_USABLE_IMAGES = 3

export async function runMultiScreening(
  imageUris: string[],
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
    const buildReports = (similarities: number[] | null): ImageReport[] => {
      let k = 0
      return imageUris.map((uri, i) => {
        if (!qualityFlags[i]) {
          return { uri, status: 'quality_failed' as const, similarity: 0 }
        }
        const sim = similarities ? similarities[k] : 0
        k += 1
        if (sim < SCREENING_THRESHOLDS.FEATURE_SIMILARITY_MIN) {
          return { uri, status: 'low_similarity' as const, similarity: sim }
        }
        return { uri, status: 'ok' as const, similarity: sim }
      })
    }

    if (keptTensors.length < MIN_USABLE_IMAGES) {
      const message = `Only ${keptTensors.length} of ${imageUris.length} photos were usable (too dark or blurry). Retake the affected area in good light.`
      console.log(`[TF SCREENING] MULTI INVALID_IMAGE: ${keptTensors.length}/${imageUris.length} passed quality gates`)
      for (const tensor of keptTensors) {
        tensor.dispose()
      }
      return {
        predictions: [],
        inferenceTimeMs: 0,
        modelVersion: modelInfo.version,
        state: 'INVALID_IMAGE',
        stateMessage: message,
        imageReports: buildReports(null),
      }
    }

    if (!combinedModel) {
      throw new Error('Model not loaded. Call loadModel() first.')
    }

    const batch = tf.concat(keptTensors, 0)
    for (const tensor of keptTensors) {
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

    const numKept = keptTensors.length
    const numClasses = modelInfo.labels.length
    const featDim = trainingMeanVector?.length ?? 0

    const similarities: number[] = []
    for (let i = 0; i < numKept; i++) {
      if (trainingMeanVector) {
        const feat = featureData.slice(i * featDim, (i + 1) * featDim)
        similarities.push(cosineSimilarity(new Float32Array(feat), trainingMeanVector))
      } else {
        similarities.push(1.0)
      }
    }

    const validIndices = similarities
      .map((sim, i) => ({ sim, i }))
      .filter(({ sim }) => sim >= SCREENING_THRESHOLDS.FEATURE_SIMILARITY_MIN)
      .map(({ i }) => i)

    const imageReports = buildReports(similarities)

    console.log(`[TF SCREENING] MULTI: ${numKept}/${imageUris.length} quality-ok, ${validIndices.length} skin-valid, sims=[${similarities.map(s => s.toFixed(3)).join(', ')}]`)

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

    const allKept = Array.from({ length: numKept }, (_, i) => i)

    if (validIndices.length < MIN_USABLE_IMAGES) {
      const message = `Only ${validIndices.length} of ${imageUris.length} photos looked like dog skin. Retake close-up photos of the affected skin area.`
      console.log(`[TF SCREENING] MULTI NOT_SKIN_IMAGE: ${validIndices.length}/${imageUris.length} skin-valid below minimum ${MIN_USABLE_IMAGES}`)
      const fallbackPredictions = buildPredictions(allKept)
      return {
        predictions: fallbackPredictions,
        topPrediction: fallbackPredictions[0],
        inferenceTimeMs,
        modelVersion: modelInfo.version,
        state: 'NOT_SKIN_IMAGE',
        stateMessage: message,
        imageReports,
      }
    }

    const predictions = buildPredictions(validIndices)

    const meanSim =
      validIndices.reduce((sum, i) => sum + similarities[i], 0) / validIndices.length

    let state: ScreeningResultState
    let stateMessage: string
    if (meanSim >= SCREENING_THRESHOLDS.FEATURE_SIMILARITY_HIGH) {
      state = 'DISEASE_DETECTED'
      stateMessage = SCREENING_STATE_MESSAGES.DISEASE_DETECTED.message
    } else {
      state = 'UNCERTAIN'
      stateMessage = SCREENING_STATE_MESSAGES.UNCERTAIN.message
    }

    console.log(`[TF SCREENING] MULTI RESULT: state=${state} meanSim=${meanSim.toFixed(3)} top=${predictions[0].label} ${predictions[0].confidence}% inference=${inferenceTimeMs}ms`)

    return {
      predictions,
      topPrediction: predictions[0],
      inferenceTimeMs,
      modelVersion: modelInfo.version,
      state,
      stateMessage,
      imageReports,
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



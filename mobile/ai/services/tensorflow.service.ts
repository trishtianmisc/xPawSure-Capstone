import * as tf from '@tensorflow/tfjs'
import '@tensorflow/tfjs-react-native'
import { Asset } from 'expo-asset'
import { File } from 'expo-file-system'

import { MODEL_INFO } from '../constants/diseases'
import type { ModelInfo, Prediction, ScreeningResult, ScreeningResultState } from '../types/ai.types'
import { SCREENING_THRESHOLDS, SCREENING_STATE_MESSAGES } from '../constants/diseases'
import { Normalization, Rescaling } from './customLayers'

tf.serialization.registerClass(Normalization)
tf.serialization.registerClass(Rescaling)

let model: tf.LayersModel | null = null
let featureModel: tf.LayersModel | null = null
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
      featureModel = tf.model({ inputs: model.inputs, outputs: gapLayer.output })
      console.log(`[TF] Feature extractor created: output shape [${featureModel.outputShape}]`)

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
  const { decodeJpeg } = await import('@tensorflow/tfjs-react-native')

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

async function extractFeatures(imageTensor: tf.Tensor4D): Promise<Float32Array> {
  if (!featureModel) {
    throw new Error('Feature model not loaded.')
  }
  const features = featureModel.predict(imageTensor) as tf.Tensor
  const featureData = await features.data()
  features.dispose()
  return new Float32Array(featureData)
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
  if (!model) {
    throw new Error('Model not loaded. Call loadModel() first.')
  }

  const startTime = Date.now()
  const output = model.predict(imageTensor) as tf.Tensor
  const probabilities = (await output.data()) as Float32Array
  const inferenceTimeMs = Date.now() - startTime
  output.dispose()

  let featureSimilarity = 1.0
  if (featureModel && trainingMeanVector) {
    const features = await extractFeatures(imageTensor)
    featureSimilarity = cosineSimilarity(features, trainingMeanVector)
    console.log(`[TF SCREENING] Feature similarity: ${featureSimilarity.toFixed(4)}`)
  }

  const predictions: Prediction[] = Array.from(probabilities).map((prob, i) => ({
    disease: modelInfo?.labels[i] ?? (`CLASS_${i}` as any),
    confidence: Math.round(prob * 10000) / 100,
    label: modelInfo?.labels[i] ?? `Class ${i}`,
  }))

  predictions.sort((a, b) => b.confidence - a.confidence)

  const { state, stateMessage } = determineScreeningState(predictions, featureSimilarity)

  console.log(`[TF SCREENING] RESULT: sim=${featureSimilarity.toFixed(3)} state=${state} top=${predictions[0].label} ${predictions[0].confidence}%`)

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
        topPrediction: { disease: 'UNKNOWN' as any, confidence: 0, label: 'Unknown' },
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
        topPrediction: { disease: 'UNKNOWN' as any, confidence: 0, label: 'Unknown' },
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

export function disposeModel(): void {
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



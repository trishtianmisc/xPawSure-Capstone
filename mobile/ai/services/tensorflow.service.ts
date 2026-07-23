import { File } from 'expo-file-system'
import * as tf from '@tensorflow/tfjs'
import { bundleResourceIO, decodeJpeg } from '@tensorflow/tfjs-react-native'

import { MODEL_INFO } from '../constants/diseases'
import type { ModelInfo, Prediction, ScreeningResult } from '../types/ai.types'

let model: tf.GraphModel | null = null
let isModelLoaded = false
let modelLoadPromise: Promise<void> | null = null

export async function loadModel(): Promise<void> {
  if (isModelLoaded) return
  if (modelLoadPromise) return modelLoadPromise

  modelLoadPromise = (async () => {
    try {
      await tf.ready()

      const modelJson = require('../../assets/model/model.json')
      const modelWeights = require('../../assets/model/weights.bin')

      model = await tf.loadGraphModel(
        bundleResourceIO(modelJson, modelWeights),
      )

      isModelLoaded = true
    } catch (error) {
      modelLoadPromise = null
      throw new Error(`Failed to load TensorFlow model: ${error}`)
    }
  })()

  return modelLoadPromise
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

export async function runInference(
  imageTensor: tf.Tensor4D,
  modelInfo?: ModelInfo,
): Promise<ScreeningResult> {
  if (!model) {
    throw new Error('Model not loaded. Call loadModel() first.')
  }

  const startTime = Date.now()
  const output = model.predict(imageTensor) as tf.Tensor
  const inferenceTimeMs = Date.now() - startTime

  const probabilities = (await output.data()) as Float32Array
  output.dispose()

  const predictions: Prediction[] = Array.from(probabilities).map((prob, i) => ({
    disease: modelInfo?.labels[i] ?? (`CLASS_${i}` as any),
    confidence: Math.round(prob * 10000) / 100,
    label: modelInfo?.labels[i] ?? `Class ${i}`,
  }))

  predictions.sort((a, b) => b.confidence - a.confidence)

  return {
    predictions,
    topPrediction: predictions[0],
    inferenceTimeMs,
    modelVersion: modelInfo?.version ?? 'unknown',
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

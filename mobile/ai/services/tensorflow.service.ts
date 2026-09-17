import * as tf from '@tensorflow/tfjs'
import '@tensorflow/tfjs-react-native'
import { Asset } from 'expo-asset'
import { File } from 'expo-file-system'

import { MODEL_INFO } from '../constants/diseases'
import type { ModelInfo, Prediction, ScreeningResult } from '../types/ai.types'

class Normalization extends tf.layers.Layer {
  static className = 'Normalization'

  constructor(args: Record<string, unknown>) {
    super(args as any)
  }

  override build(inputShape: tf.Shape | tf.Shape[]): void {
    this.addWeight('mean', [3], 'float32', tf.initializers.zeros())
    this.addWeight('variance', [3], 'float32', tf.initializers.zeros())
    this.addWeight('count', [], 'float32', tf.initializers.zeros())
    this.built = true
  }

  override computeOutputShape(inputShape: tf.Shape | tf.Shape[]): tf.Shape | tf.Shape[] {
    return inputShape
  }

  override call(inputs: tf.Tensor | tf.Tensor[]): tf.Tensor | tf.Tensor[] {
    const x = Array.isArray(inputs) ? inputs[0] : inputs
    const mean = this.getWeights()[0]
    const variance = this.getWeights()[1]
    return tf.sub(x, mean).div(tf.sqrt(tf.add(variance, 1e-7)))
  }

  override getClassName() {
    return 'Normalization'
  }
}

class Rescaling extends tf.layers.Layer {
  static className = 'Rescaling'
  private readonly rescaleScale: number
  private readonly rescaleOffset: number

  constructor(args: Record<string, unknown>) {
    super(args as any)
    this.rescaleScale = (args.scale as number) ?? 1.0
    this.rescaleOffset = (args.offset as number) ?? 0.0
  }

  override call(inputs: tf.Tensor | tf.Tensor[]): tf.Tensor | tf.Tensor[] {
    const x = Array.isArray(inputs) ? inputs[0] : inputs
    return tf.mul(x, this.rescaleScale).add(this.rescaleOffset)
  }

  override getClassName() {
    return 'Rescaling'
  }
}

tf.serialization.registerClass(Normalization)
tf.serialization.registerClass(Rescaling)

let model: tf.LayersModel | null = null
let isModelLoaded = false
let modelLoadPromise: Promise<void> | null = null

export async function loadModel(): Promise<void> {
  if (isModelLoaded) return
  if (modelLoadPromise) return modelLoadPromise

  modelLoadPromise = (async () => {
    try {
      await tf.ready()

      const backends = tf.engine().findBackend('webgl')
        ? ['webgl', 'cpu'] as const
        : ['cpu'] as const

      for (const backend of backends) {
        try {
          await tf.setBackend(backend)
          break
        } catch {}
      }

      const modelJSON = require('../../assets/model/model.json')

      const weightsAsset = await Asset.loadAsync(
        require('../../assets/model/weights.bin'),
      )

      const weightsUri = weightsAsset[0].localUri
      const weightsFile = new File(weightsUri!)
      const weightsBytes = await weightsFile.bytes()

      model = await tf.loadLayersModel(
        tf.io.fromMemory({
          modelTopology: modelJSON.modelTopology,
          weightSpecs: modelJSON.weightsManifest[0].weights,
          weightData: weightsBytes.buffer,
        })
      )

      let fixedCount = 0
      for (const layer of model.layers) {
        if (layer.getClassName() !== 'BatchNormalization') continue
        const weights = layer.getWeights()
        if (weights.length < 4) continue
        const variance = weights[3]
        const varianceData = Array.from(variance.dataSync() as Float32Array)
        const hasNegative = varianceData.some(v => v < 0)
        if (hasNegative) {
          const fixedData = varianceData.map(v => Math.max(v, 0))
          const fixed = tf.tensor(fixedData, variance.shape, 'float32')
          weights[3] = fixed
          layer.setWeights(weights)
          fixedCount++
        }
      }
      console.log(`[TF] Clamped negative moving_variance in ${fixedCount} BN layers`)

      const warmup = model.predict(tf.zeros([1, 224, 224, 3])) as tf.Tensor
      warmup.dispose()

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

const CHECKPOINT_LAYERS = [
  'rescaling', 'normalization', 'rescaling_1',
  'stem_conv', 'stem_bn', 'stem_activation',
  'block1a_dwconv', 'block1a_bn', 'block1a_activation',
  'block1a_se_reduce', 'block1a_se_expand', 'block1a_se_excite',
  'block1a_project_conv', 'block1a_project_bn',
  'block2a_expand_conv', 'block2a_expand_bn',
  'block2a_dwconv', 'block2a_bn',
  'block2a_project_conv', 'block2a_project_bn',
  'block2b_expand_conv', 'block2b_expand_bn',
  'block2b_dwconv', 'block2b_bn',
  'block2b_project_conv', 'block2b_project_bn',
  'block2b_add',
  'block5c_add', 'block6d_add',
  'top_bn', 'global_average_pooling2d', 'batch_normalization',
  'dense', 'dense_1', 'dense_2',
]

export async function compareOutputs(inputTensor: tf.Tensor4D): Promise<void> {
  if (!model) return
  try {
    console.log('[TF COMPARE] Starting intermediate output comparison...')
    const tensorMap: Record<string, tf.Tensor> = {}
    tensorMap[model.inputs[0].name] = inputTensor

    const cpSet = new Set(CHECKPOINT_LAYERS)

    for (let i = 0; i < model.layers.length; i++) {
      const layer = model.layers[i]
      const cls = layer.getClassName()
      if (cls === 'InputLayer') continue

      try {
        const node = layer.inboundNodes[0]
        if (!node) continue

        const inputTensors = node.inputTensors
        if (!inputTensors || inputTensors.length === 0) continue

        const resolved: tf.Tensor[] = []
        let missing = false
        for (const t of inputTensors) {
          if (tensorMap[t.name]) {
            resolved.push(tensorMap[t.name])
          } else {
            missing = true
            break
          }
        }
        if (missing) continue

        const output = layer.apply(
          resolved.length === 1 ? resolved[0] : resolved,
          { training: false }
        ) as tf.Tensor

        const outputTensors = node.outputTensors
        if (outputTensors && outputTensors.length > 0) {
          tensorMap[outputTensors[0].name] = output
        }

        if (cpSet.has(layer.name)) {
          const hasNaN = tf.any(tf.isNaN(output)).dataSync()[0]
          const minVal = (await output.min().data())[0]
          const maxVal = (await output.max().data())[0]
          const meanVal = (await output.mean().data())[0]
          const first5 = Array.from((await output.slice([0, 0, 0, 0], [1, 1, 1, Math.min(5, output.shape[3])]).data()) as Float32Array).map(v => v.toFixed(6))
          const size = output.size
          console.log(`[TF COMPARE] ${layer.name} (${cls}) → shape=${output.shape} min=${minVal.toFixed(6)} max=${maxVal.toFixed(6)} mean=${meanVal.toFixed(6)} NaN=${hasNaN} first5=${JSON.stringify(first5)} size=${size}`)
        }
      } catch (e) {
        if (cpSet.has(layer.name)) {
          console.log(`[TF COMPARE] ${layer.name} (${cls}) → ERROR: ${e}`)
        }
      }
    }

    Object.values(tensorMap).forEach(t => {
      if (t !== inputTensor) t.dispose()
    })
    console.log('[TF COMPARE] Done.')
  } catch (e) {
    console.error('[TF COMPARE] failed:', e)
  }
}

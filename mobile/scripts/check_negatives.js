const path = require('path')
const fs = require('fs')
const tf = require('@tensorflow/tfjs')
const { Normalization, Rescaling } = require('../ai/services/customLayers')

const MD = path.resolve(__dirname, '..', 'assets', 'model')

function cos(a, b) {
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb))
}

function fill(rgb) {
  const data = new Float32Array(224 * 224 * 3)
  for (let i = 0; i < data.length; i += 3) {
    data[i] = rgb[0]
    data[i + 1] = rgb[1]
    data[i + 2] = rgb[2]
  }
  return tf.tensor3d(data, [224, 224, 3], 'float32')
}

function gradient(axis) {
  const data = new Float32Array(224 * 224 * 3)
  for (let i = 0; i < 224; i++) {
    for (let j = 0; j < 224; j++) {
      const v = (axis === 'h' ? j : i) * (255 / 223)
      const o = (i * 224 + j) * 3
      data[o] = v
      data[o + 1] = v
      data[o + 2] = v
    }
  }
  return tf.tensor3d(data, [224, 224, 3], 'float32')
}

function checkerboard() {
  const data = new Float32Array(224 * 224 * 3)
  for (let i = 0; i < 224; i++) {
    for (let j = 0; j < 224; j++) {
      const v = (Math.floor(i / 32) + Math.floor(j / 32)) % 2 === 0 ? 255 : 0
      const o = (i * 224 + j) * 3
      data[o] = v
      data[o + 1] = v
      data[o + 2] = v
    }
  }
  return tf.tensor3d(data, [224, 224, 3], 'float32')
}

async function main() {
  await tf.setBackend('cpu')
  await tf.ready()
  tf.serialization.registerClass(Normalization)
  tf.serialization.registerClass(Rescaling)

  const mj = JSON.parse(fs.readFileSync(path.join(MD, 'model.json'), 'utf8'))
  const wb = fs.readFileSync(path.join(MD, 'weights.bin'))
  const wd = wb.buffer.slice(wb.byteOffset, wb.byteOffset + wb.byteLength)
  const model = await tf.loadLayersModel(
    tf.io.fromMemory({
      modelTopology: mj.modelTopology,
      weightSpecs: mj.weightsManifest[0].weights,
      weightData: wd,
    }),
  )
  const gap = model.getLayer('global_average_pooling2d')
  const featureModel = tf.model({ inputs: model.inputs, outputs: gap.output })

  const refFile = process.argv[2] || path.join(MD, 'training_reference.json')
  const ref = JSON.parse(fs.readFileSync(refFile, 'utf8'))
  const mean = Float32Array.from(ref.mean_feature)
  console.log(`reference: ${path.basename(refFile)}  backend=${ref.backend}  n=${ref.num_images}`)

  const cases = [
    ['black_image', fill([0, 0, 0])],
    ['white_image', fill([255, 255, 255])],
    ['gray_image', fill([128, 128, 128])],
    ['dark_gray', fill([30, 30, 30])],
    ['bright_gray', fill([230, 230, 230])],
    ['red_only', fill([200, 50, 50])],
    ['solid_brown', fill([139, 90, 43])],
    ['leather_base', fill([101, 67, 33])],
    ['beige_wall', fill([210, 200, 180])],
    ['gradient_h', gradient('h')],
    ['gradient_v', gradient('v')],
    ['checkerboard', checkerboard()],
  ]

  console.log('\nnon-skin negatives (deterministic, no RNG):')
  const sims = []
  for (const [name, img] of cases) {
    const f = featureModel.predict(tf.expandDims(img, 0))
    const v = Float32Array.from(await f.data())
    const s = cos(v, mean)
    sims.push(s)
    img.dispose()
    f.dispose()
    console.log(`  ${name.padEnd(14)} sim=${s.toFixed(3)}`)
  }
  const mx = Math.max(...sims)
  console.log(`\n  max negative similarity = ${mx.toFixed(3)}`)
  console.log('  PC disease reference: train p05=0.339  eval p05=0.317 min=0.220')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

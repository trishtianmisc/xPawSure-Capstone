/**
 * Custom TF.js layers required by the XPawSure EfficientNet screening model.
 *
 * These mirror the `Normalization` and `Rescaling` layers declared in
 * model.json. The `className` statics and the `getClassName()` implementations
 * are load-bearing: tfjs serialization uses them to resolve layer classes while
 * parsing the model topology. Changing either will break model loading.
 *
 * Written as CommonJS so a single copy can be consumed by both the app
 * (via Metro) and the offline reference script (via plain Node).
 */

const tf = require('@tensorflow/tfjs')

/**
 * Per-channel standardization, matching the Keras `Normalization` layer.
 *
 * Keras computes `(x - mean) / max(sqrt(variance), epsilon)`. The epsilon is
 * applied to the *denominator*, not inside the square root.
 */
class Normalization extends tf.layers.Layer {
  static className = 'Normalization'

  constructor(args) {
    super(args)
  }

  build(inputShape) {
    this.addWeight('mean', [3], 'float32', tf.initializers.zeros())
    this.addWeight('variance', [3], 'float32', tf.initializers.zeros())
    this.addWeight('count', [], 'float32', tf.initializers.zeros())
    this.built = true
  }

  computeOutputShape(inputShape) {
    return inputShape
  }

  call(inputs) {
    const x = Array.isArray(inputs) ? inputs[0] : inputs
    const mean = this.getWeights()[0]
    const variance = this.getWeights()[1]
    const sqrtVar = tf.sqrt(variance)
    const denom = tf.maximum(sqrtVar, tf.scalar(1e-7, 'float32'))
    return tf.sub(x, mean).div(denom)
  }

  getClassName() {
    return 'Normalization'
  }
}

/**
 * Scales and offsets pixel values.
 *
 * `scale` may be a scalar (e.g. 1/255) or a per-channel array (e.g.
 * [2.089, 2.112, 2.108]); `tf.mul`/`tf.add` broadcast either form. Nullish
 * coalescing is used deliberately so an explicit `0` is preserved.
 */
class Rescaling extends tf.layers.Layer {
  static className = 'Rescaling'

  constructor(args) {
    super(args)
    this.rescaleScale = args?.scale ?? 1.0
    this.rescaleOffset = args?.offset ?? 0.0
  }

  call(inputs) {
    const x = Array.isArray(inputs) ? inputs[0] : inputs
    return tf.mul(x, this.rescaleScale).add(this.rescaleOffset)
  }

  getClassName() {
    return 'Rescaling'
  }
}

module.exports = { Normalization, Rescaling }

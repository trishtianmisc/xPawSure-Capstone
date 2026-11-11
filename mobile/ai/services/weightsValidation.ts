/**
 * Guards the bundled TensorFlow.js weights against silent corruption or a
 * mismatched model file. The expected size matches assets/model/README.md
 * and the offline reference script (scripts/compute_training_reference_tfjs.js).
 */
export const EXPECTED_MODEL_WEIGHTS_BYTES = 17_670_816

export function validateWeightsSize(byteLength: number): void {
  if (byteLength !== EXPECTED_MODEL_WEIGHTS_BYTES) {
    throw new Error(
      `Model weights size mismatch: expected ${EXPECTED_MODEL_WEIGHTS_BYTES} bytes, ` +
        `got ${byteLength}. The bundled model may be corrupted or incomplete.`,
    )
  }
}

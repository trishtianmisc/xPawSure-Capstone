import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import { Image } from 'react-native'

export const INFERENCE_IMAGE_MAX_SIZE = 512

function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject)
  })
}

/**
 * Produce the single JPEG used by both analyses.
 *
 * The output is always re-encoded as JPEG, even when the source is already
 * small, because the on-device decoder and the backend both require a real
 * image whose bytes can be hashed consistently. The same URI is passed to
 * local inference and to the upload request.
 */
export async function prepareImageForInference(uri: string): Promise<string> {
  const { width, height } = await getImageSize(uri)
  const context = ImageManipulator.manipulate(uri)

  if (Math.max(width, height) > INFERENCE_IMAGE_MAX_SIZE) {
    context.resize(
      width >= height
        ? { width: INFERENCE_IMAGE_MAX_SIZE, height: null }
        : { width: null, height: INFERENCE_IMAGE_MAX_SIZE },
    )
  }

  const image = await context.renderAsync()
  const result = await image.saveAsync({ compress: 0.8, format: SaveFormat.JPEG })
  return result.uri
}

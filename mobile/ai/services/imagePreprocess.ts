import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import { Image } from 'react-native'

export const INFERENCE_IMAGE_MAX_SIZE = 512

function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject)
  })
}

export async function prepareImageForInference(uri: string): Promise<string> {
  try {
    const { width, height } = await getImageSize(uri)
    if (Math.max(width, height) <= INFERENCE_IMAGE_MAX_SIZE) return uri

    const context = ImageManipulator.manipulate(uri)
    context.resize(
      width >= height
        ? { width: INFERENCE_IMAGE_MAX_SIZE, height: null }
        : { width: null, height: INFERENCE_IMAGE_MAX_SIZE },
    )
    const image = await context.renderAsync()
    const result = await image.saveAsync({ compress: 0.8, format: SaveFormat.JPEG })
    return result.uri
  } catch {
    return uri
  }
}

import { Directory, File, Paths } from 'expo-file-system'
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import { Platform } from 'react-native'

const THUMBNAIL_DIRECTORY = 'screening-thumbnails'
const THUMBNAIL_WIDTH = 256

function getThumbnailDirectory(): Directory {
  const directory = new Directory(Paths.document, THUMBNAIL_DIRECTORY)
  if (!directory.exists) {
    directory.create({ idempotent: true, intermediates: true })
  }
  return directory
}

function createDestinationFile(): File {
  const filename = `screening-${Date.now()}-${Math.random().toString(36).slice(2, 10)}.jpg`
  return new File(getThumbnailDirectory(), filename)
}

async function renderThumbnail(sourceUri: string): Promise<string> {
  const context = ImageManipulator.manipulate(sourceUri)
  context.resize({ width: THUMBNAIL_WIDTH, height: null })
  const image = await context.renderAsync()
  const rendered = await image.saveAsync({ compress: 0.8, format: SaveFormat.JPEG })
  const destination = createDestinationFile()
  new File(rendered.uri).copy(destination)
  return destination.uri
}

export async function createScreeningThumbnail(sourceUri: string): Promise<string> {
  if (Platform.OS === 'web') return sourceUri

  try {
    return await renderThumbnail(sourceUri)
  } catch {
    try {
      const source = new File(sourceUri)
      if (!source.exists) return sourceUri
      const destination = createDestinationFile()
      source.copy(destination)
      return destination.uri
    } catch {
      return sourceUri
    }
  }
}

export type Size = { width: number; height: number }
export type Rect = { x: number; y: number; width: number; height: number }
export type Point = { x: number; y: number }

/** Minimum crop size in on-screen pixels. */
export const MIN_CROP_SIZE = 64
/** Initial crop rectangle fills this fraction of the base display rect. */
export const INITIAL_FILL = 0.9
export const MIN_ZOOM = 1
export const MAX_ZOOM = 5

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function clampZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) return MIN_ZOOM
  return clamp(zoom, MIN_ZOOM, MAX_ZOOM)
}

/** Contain-fit rect of the image inside the measured container. */
export function containRect(container: Size, natural: Size): Rect | null {
  if (!container.width || !container.height || !natural.width || !natural.height) return null
  const scale = Math.min(container.width / natural.width, container.height / natural.height)
  const width = natural.width * scale
  const height = natural.height * scale
  return {
    x: (container.width - width) / 2,
    y: (container.height - height) / 2,
    width,
    height,
  }
}

/**
 * On-screen image rect after zoom + pan applied to the base contain-fit rect.
 * Zoom scales about the base center; pan shifts the result in container space.
 */
export function imageScreenRect(base: Rect, zoom: number, pan: Point): Rect {
  const z = clampZoom(zoom)
  const width = base.width * z
  const height = base.height * z
  const centerX = base.x + base.width / 2 + pan.x
  const centerY = base.y + base.height / 2 + pan.y
  return {
    x: centerX - width / 2,
    y: centerY - height / 2,
    width,
    height,
  }
}

/**
 * Keep the zoomed image covering the base rect so a crop can always be placed.
 * At zoom = 1 only pan (0, 0) is allowed; at higher zoom pan grows with slack.
 */
export function clampPan(pan: Point, base: Rect, zoom: number): Point {
  const z = clampZoom(zoom)
  const slackX = Math.max(0, ((base.width * z) - base.width) / 2)
  const slackY = Math.max(0, ((base.height * z) - base.height) / 2)
  const x = clamp(Number.isFinite(pan.x) ? pan.x : 0, -slackX, slackX)
  const y = clamp(Number.isFinite(pan.y) ? pan.y : 0, -slackY, slackY)
  // Normalize -0 so deep-equality checks stay stable.
  return { x: x === 0 ? 0 : x, y: y === 0 ? 0 : y }
}

/** Keep the crop rect inside the zoomed image, enforcing min size. */
export function clampCropToImage(crop: Rect, image: Rect, minSize = MIN_CROP_SIZE): Rect {
  const width = clamp(crop.width, minSize, image.width)
  const height = clamp(crop.height, minSize, image.height)
  const x = clamp(crop.x, image.x, image.x + image.width - width)
  const y = clamp(crop.y, image.y, image.y + image.height - height)
  return { x, y, width, height }
}

/** Initial crop rect: INITIAL_FILL of the base display rect. */
export function initialCrop(base: Rect, fill = INITIAL_FILL): Rect {
  const inset = (1 - fill) / 2
  return {
    x: base.x + base.width * inset,
    y: base.y + base.height * inset,
    width: base.width * fill,
    height: base.height * fill,
  }
}

/**
 * Map an on-screen crop rect to natural-image pixel crop for ImageManipulator.
 * Always returns integers with width/height >= 1 and origin inside the image.
 */
export function naturalCrop(
  crop: Rect,
  image: Rect,
  natural: Size,
): { originX: number; originY: number; width: number; height: number } {
  const scaleX = natural.width / image.width
  const scaleY = natural.height / image.height
  const originX = clamp(Math.round((crop.x - image.x) * scaleX), 0, Math.max(0, natural.width - 1))
  const originY = clamp(Math.round((crop.y - image.y) * scaleY), 0, Math.max(0, natural.height - 1))
  const width = clamp(Math.round(crop.width * scaleX), 1, Math.max(1, natural.width - originX))
  const height = clamp(Math.round(crop.height * scaleY), 1, Math.max(1, natural.height - originY))
  return { originX, originY, width, height }
}

/** Distance between two touch points. */
export function touchDistance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

/** Midpoint between two touch points. */
export function touchMidpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  INITIAL_FILL,
  MAX_ZOOM,
  MIN_CROP_SIZE,
  MIN_ZOOM,
  clampCropToImage,
  clampPan,
  clampZoom,
  containRect,
  imageScreenRect,
  initialCrop,
  naturalCrop,
  touchDistance,
  touchMidpoint,
} from '../lib/cropGeometry.ts'

const base = { x: 40, y: 100, width: 300, height: 200 }

describe('clampZoom', () => {
  it('clamps to [1, 5]', () => {
    assert.equal(clampZoom(0.5), MIN_ZOOM)
    assert.equal(clampZoom(1), 1)
    assert.equal(clampZoom(3.25), 3.25)
    assert.equal(clampZoom(99), MAX_ZOOM)
    assert.equal(clampZoom(Number.NaN), MIN_ZOOM)
  })
})

describe('containRect', () => {
  it('returns null for empty sizes', () => {
    assert.equal(containRect({ width: 0, height: 100 }, { width: 10, height: 10 }), null)
    assert.equal(containRect({ width: 100, height: 100 }, { width: 0, height: 0 }), null)
  })

  it('contain-fits landscape image in portrait container', () => {
    const rect = containRect({ width: 200, height: 400 }, { width: 400, height: 200 })
    assert.ok(rect)
    assert.equal(rect.width, 200)
    assert.equal(rect.height, 100)
    assert.equal(rect.x, 0)
    assert.equal(rect.y, 150)
  })
})

describe('imageScreenRect', () => {
  it('equals base at zoom 1 and pan 0', () => {
    assert.deepEqual(imageScreenRect(base, 1, { x: 0, y: 0 }), base)
  })

  it('scales about base center', () => {
    const rect = imageScreenRect(base, 2, { x: 0, y: 0 })
    assert.equal(rect.width, 600)
    assert.equal(rect.height, 400)
    assert.equal(rect.x, base.x + base.width / 2 - 300)
    assert.equal(rect.y, base.y + base.height / 2 - 200)
  })

  it('applies pan offset', () => {
    const rect = imageScreenRect(base, 1, { x: 10, y: -5 })
    assert.equal(rect.x, base.x + 10)
    assert.equal(rect.y, base.y - 5)
  })
})

describe('clampPan', () => {
  it('allows only zero pan at zoom 1', () => {
    assert.deepEqual(clampPan({ x: 50, y: -30 }, base, 1), { x: 0, y: 0 })
  })

  it('allows slack proportional to zoom', () => {
    const pan = clampPan({ x: 1000, y: -1000 }, base, 2)
    assert.equal(pan.x, (base.width * 2 - base.width) / 2)
    assert.equal(pan.y, -((base.height * 2 - base.height) / 2))
  })

  it('keeps image covering base after clamp', () => {
    const zoom = 3
    const pan = clampPan({ x: 999, y: -999 }, base, zoom)
    const image = imageScreenRect(base, zoom, pan)
    assert.ok(image.x <= base.x + 0.001)
    assert.ok(image.y <= base.y + 0.001)
    assert.ok(image.x + image.width >= base.x + base.width - 0.001)
    assert.ok(image.y + image.height >= base.y + base.height - 0.001)
  })
})

describe('clampCropToImage', () => {
  const image = { x: 0, y: 0, width: 400, height: 400 }

  it('enforces minimum size', () => {
    const rect = clampCropToImage({ x: 10, y: 10, width: 10, height: 10 }, image)
    assert.equal(rect.width, MIN_CROP_SIZE)
    assert.equal(rect.height, MIN_CROP_SIZE)
  })

  it('keeps crop inside image bounds', () => {
    const rect = clampCropToImage({ x: -50, y: 380, width: 100, height: 100 }, image)
    assert.ok(rect.x >= image.x)
    assert.ok(rect.y >= image.y)
    assert.ok(rect.x + rect.width <= image.x + image.width)
    assert.ok(rect.y + rect.height <= image.y + image.height)
  })
})

describe('initialCrop', () => {
  it('fills INITIAL_FILL of base', () => {
    const crop = initialCrop(base)
    assert.equal(crop.width, base.width * INITIAL_FILL)
    assert.equal(crop.height, base.height * INITIAL_FILL)
    assert.ok(crop.x > base.x)
    assert.ok(crop.y > base.y)
  })
})

describe('naturalCrop', () => {
  it('maps full image rect at zoom 1', () => {
    const natural = { width: 1000, height: 800 }
    const result = naturalCrop(base, base, natural)
    assert.equal(result.originX, 0)
    assert.equal(result.originY, 0)
    assert.equal(result.width, 1000)
    assert.equal(result.height, 800)
  })

  it('maps a sub-rect through zoomed image', () => {
    const natural = { width: 1000, height: 1000 }
    const image = imageScreenRect(base, 2, { x: 0, y: 0 })
    // Crop the top-left quarter of the zoomed image on screen
    const crop = {
      x: image.x,
      y: image.y,
      width: image.width / 2,
      height: image.height / 2,
    }
    const result = naturalCrop(crop, image, natural)
    assert.equal(result.originX, 0)
    assert.equal(result.originY, 0)
    assert.equal(result.width, 500)
    assert.equal(result.height, 500)
  })

  it('maps center crop correctly when zoomed', () => {
    const natural = { width: 1000, height: 1000 }
    const image = imageScreenRect(base, 2, { x: 0, y: 0 })
    const crop = {
      x: image.x + image.width / 4,
      y: image.y + image.height / 4,
      width: image.width / 2,
      height: image.height / 2,
    }
    const result = naturalCrop(crop, image, natural)
    assert.equal(result.originX, 250)
    assert.equal(result.originY, 250)
    assert.equal(result.width, 500)
    assert.equal(result.height, 500)
  })

  it('never returns zero size or out-of-bounds origin', () => {
    const natural = { width: 10, height: 10 }
    const image = { x: 0, y: 0, width: 100, height: 100 }
    const result = naturalCrop({ x: 99, y: 99, width: 50, height: 50 }, image, natural)
    assert.ok(result.originX >= 0 && result.originX < natural.width)
    assert.ok(result.originY >= 0 && result.originY < natural.height)
    assert.ok(result.width >= 1)
    assert.ok(result.height >= 1)
    assert.ok(result.originX + result.width <= natural.width)
    assert.ok(result.originY + result.height <= natural.height)
  })
})

describe('touch helpers', () => {
  it('computes distance and midpoint', () => {
    const a = { x: 0, y: 0 }
    const b = { x: 3, y: 4 }
    assert.equal(touchDistance(a, b), 5)
    assert.deepEqual(touchMidpoint(a, b), { x: 1.5, y: 2 })
  })
})

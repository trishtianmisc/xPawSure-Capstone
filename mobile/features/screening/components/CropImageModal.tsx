import { MaterialCommunityIcons } from '@expo/vector-icons'
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Image,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useTheme, type AppColors } from '../../../src/context/ThemeContext'
import { font } from '../../../src/theme/typography'
import {
  MIN_CROP_SIZE,
  clampCropToImage,
  clampPan,
  clampZoom,
  containRect,
  imageScreenRect,
  initialCrop,
  naturalCrop,
  touchDistance,
  touchMidpoint,
  type Point,
  type Rect,
} from '../lib/cropGeometry'

interface CropImageModalProps {
  visible: boolean
  uri: string | null
  /** Called with the cropped JPEG once the user confirms the crop area. */
  onCrop: (croppedUri: string) => void
  /** Called when the user keeps the photo as-is (no crop applied). */
  onSkip: () => void
  /** Called when the user closes the tool and discards the photo. */
  onCancel: () => void
}

function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject)
  })
}

/**
 * Optional crop step shown after the camera or gallery produces a photo.
 * Display-only framing tool: pinch to zoom/pan the photo, drag corners for a
 * free crop rectangle, then hand the cropped JPEG (or untouched photo on skip)
 * to the caller. Nothing here touches predictions, confidence, or screening.
 */
export function CropImageModal({ visible, uri, onCrop, onSkip, onCancel }: CropImageModalProps) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])

  const [sourceUri, setSourceUri] = useState<string | null>(null)
  const [natural, setNatural] = useState({ width: 0, height: 0 })
  const [container, setContainer] = useState({ width: 0, height: 0 })
  const [rect, setRect] = useState<Rect | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 })
  const [loading, setLoading] = useState(false)
  const [cropping, setCropping] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const rectRef = useRef<Rect>({ x: 0, y: 0, width: 0, height: 0 })
  const baselineRef = useRef<Rect>({ x: 0, y: 0, width: 0, height: 0 })
  const zoomRef = useRef(1)
  const panRef = useRef<Point>({ x: 0, y: 0 })
  const baseRef = useRef<Rect | null>(null)
  const pinchRef = useRef<{ dist: number; mid: Point; zoom: number; pan: Point } | null>(null)
  const imagePanBaselineRef = useRef<Point>({ x: 0, y: 0 })
  const initializedRef = useRef(false)

  const applyRect = (next: Rect) => {
    rectRef.current = next
    setRect(next)
  }

  const applyZoomPan = (nextZoom: number, nextPan: Point) => {
    zoomRef.current = nextZoom
    panRef.current = nextPan
    setZoom(nextZoom)
    setPan(nextPan)
    const base = baseRef.current
    if (base) {
      const image = imageScreenRect(base, nextZoom, nextPan)
      applyRect(clampCropToImage(rectRef.current, image, MIN_CROP_SIZE))
    }
  }

  /** Contain-fit rect of the image inside the measured image area. */
  const base = useMemo(() => {
    if (!container.width || !container.height || !natural.width || !natural.height) return null
    return containRect(container, natural)
  }, [container, natural])

  useEffect(() => {
    baseRef.current = base
  }, [base])

  const imageRect = useMemo(
    () => (base ? imageScreenRect(base, zoom, pan) : null),
    [base, zoom, pan],
  )

  const imageRectRef = useRef<Rect | null>(null)
  useEffect(() => {
    imageRectRef.current = imageRect
  }, [imageRect])

  // Load + normalize the source once per opening so the dimensions reported
  // by Image.getSize match the pixels the crop action operates on.
  useEffect(() => {
    if (!visible || !uri) {
      setSourceUri(null)
      setNatural({ width: 0, height: 0 })
      setRect(null)
      setZoom(1)
      setPan({ x: 0, y: 0 })
      setError(null)
      zoomRef.current = 1
      panRef.current = { x: 0, y: 0 }
      pinchRef.current = null
      initializedRef.current = false
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    setRect(null)
    setZoom(1)
    setPan({ x: 0, y: 0 })
    setSourceUri(null)
    zoomRef.current = 1
    panRef.current = { x: 0, y: 0 }
    pinchRef.current = null
    initializedRef.current = false
    ;(async () => {
      try {
        const rendered = await ImageManipulator.manipulate(uri).renderAsync()
        const saved = await rendered.saveAsync({ compress: 1, format: SaveFormat.JPEG })
        const size = await getImageSize(saved.uri)
        if (cancelled) return
        setSourceUri(saved.uri)
        setNatural(size)
      } catch {
        if (!cancelled) setError('This photo could not be opened for cropping.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [visible, uri])

  // Initialise the crop rectangle when the image first gets its display
  // rect, and keep an existing rectangle inside the zoomed image after
  // rotation or a layout change.
  useEffect(() => {
    if (!base || loading) return
    if (!initializedRef.current) {
      initializedRef.current = true
      applyRect(initialCrop(base))
      return
    }
    const image = imageScreenRect(base, zoomRef.current, panRef.current)
    applyRect(clampCropToImage(rectRef.current, image, MIN_CROP_SIZE))
  }, [base, loading])

  /** Shared two-finger pinch + pan. Returns true when the event was consumed. */
  const handlePinch = (event: GestureResponderEvent): boolean => {
    const touches = event.nativeEvent.touches
    if (touches.length < 2) {
      pinchRef.current = null
      return false
    }
    const a: Point = { x: touches[0].pageX, y: touches[0].pageY }
    const b: Point = { x: touches[1].pageX, y: touches[1].pageY }
    const dist = Math.max(touchDistance(a, b), 1)
    const mid = touchMidpoint(a, b)
    if (!pinchRef.current) {
      pinchRef.current = {
        dist,
        mid,
        zoom: zoomRef.current,
        pan: { ...panRef.current },
      }
      return true
    }
    const start = pinchRef.current
    const nextZoom = clampZoom(start.zoom * (dist / start.dist))
    const baseBounds = baseRef.current
    if (!baseBounds) return true
    const nextPan = clampPan(
      { x: start.pan.x + (mid.x - start.mid.x), y: start.pan.y + (mid.y - start.mid.y) },
      baseBounds,
      nextZoom,
    )
    applyZoomPan(nextZoom, nextPan)
    return true
  }

  /** After a pinch ends with one finger left, re-baseline single-finger drags. */
  const rebaselineAfterPinch = (event: GestureResponderEvent) => {
    if (event.nativeEvent.touches.length === 1 && pinchRef.current) {
      pinchRef.current = null
      baselineRef.current = { ...rectRef.current }
      imagePanBaselineRef.current = { ...panRef.current }
    }
  }

  const moveResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        baselineRef.current = { ...rectRef.current }
        pinchRef.current = null
      },
      onPanResponderMove: (event, gesture) => {
        rebaselineAfterPinch(event)
        if (handlePinch(event)) return
        const bounds = imageRectRef.current
        const baseline = baselineRef.current
        if (!bounds) return
        applyRect({
          ...baseline,
          x: Math.min(
            Math.max(baseline.x + gesture.dx, bounds.x),
            bounds.x + bounds.width - baseline.width,
          ),
          y: Math.min(
            Math.max(baseline.y + gesture.dy, bounds.y),
            bounds.y + bounds.height - baseline.height,
          ),
        })
      },
    }),
  ).current

  // Background: one-finger pan of the photo when zoomed; two-finger pinch.
  const imageAreaResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        imagePanBaselineRef.current = { ...panRef.current }
        pinchRef.current = null
      },
      onPanResponderMove: (event, gesture) => {
        rebaselineAfterPinch(event)
        if (handlePinch(event)) return
        const baseBounds = baseRef.current
        if (!baseBounds) return
        // Single-finger pan only matters when zoomed; at 1x clamp forces (0,0).
        const next = clampPan(
          {
            x: imagePanBaselineRef.current.x + gesture.dx,
            y: imagePanBaselineRef.current.y + gesture.dy,
          },
          baseBounds,
          zoomRef.current,
        )
        if (next.x !== panRef.current.x || next.y !== panRef.current.y) {
          applyZoomPan(zoomRef.current, next)
        }
      },
    }),
  ).current

  // Each corner keeps the opposite corner fixed and clamps inside the image.
  const makeCornerResponder = (
    update: (baseline: Rect, dx: number, dy: number, bounds: Rect) => Rect,
  ) =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        baselineRef.current = { ...rectRef.current }
        pinchRef.current = null
      },
      onPanResponderMove: (event, gesture) => {
        rebaselineAfterPinch(event)
        if (handlePinch(event)) return
        const bounds = imageRectRef.current
        const baseline = baselineRef.current
        if (!bounds) return
        applyRect(update(baseline, gesture.dx, gesture.dy, bounds))
      },
    })

  const cornerResponders = useRef({
    tl: makeCornerResponder((b, dx, dy, bounds) => {
      const right = b.x + b.width
      const bottom = b.y + b.height
      const x = Math.min(Math.max(b.x + dx, bounds.x), right - MIN_CROP_SIZE)
      const y = Math.min(Math.max(b.y + dy, bounds.y), bottom - MIN_CROP_SIZE)
      return { x, y, width: right - x, height: bottom - y }
    }),
    tr: makeCornerResponder((b, dx, dy, bounds) => {
      const bottom = b.y + b.height
      const y = Math.min(Math.max(b.y + dy, bounds.y), bottom - MIN_CROP_SIZE)
      const maxWidth = bounds.x + bounds.width - b.x - MIN_CROP_SIZE
      const width = Math.min(Math.max(b.width + dx, MIN_CROP_SIZE), Math.max(MIN_CROP_SIZE, maxWidth))
      return { x: b.x, y, width, height: bottom - y }
    }),
    bl: makeCornerResponder((b, dx, dy, bounds) => {
      const right = b.x + b.width
      const x = Math.min(Math.max(b.x + dx, bounds.x), right - MIN_CROP_SIZE)
      const maxHeight = bounds.y + bounds.height - b.y - MIN_CROP_SIZE
      const height = Math.min(
        Math.max(b.height + dy, MIN_CROP_SIZE),
        Math.max(MIN_CROP_SIZE, maxHeight),
      )
      return { x, y: b.y, width: right - x, height }
    }),
    br: makeCornerResponder((b, dx, dy, bounds) => {
      const maxWidth = bounds.x + bounds.width - b.x
      const maxHeight = bounds.y + bounds.height - b.y
      return {
        x: b.x,
        y: b.y,
        width: Math.min(Math.max(b.width + dx, MIN_CROP_SIZE), Math.max(MIN_CROP_SIZE, maxWidth)),
        height: Math.min(Math.max(b.height + dy, MIN_CROP_SIZE), Math.max(MIN_CROP_SIZE, maxHeight)),
      }
    }),
  }).current

  const handleCrop = async () => {
    const image = imageRect
    if (!sourceUri || !image || cropping) return
    const current = rectRef.current
    const { originX, originY, width, height } = naturalCrop(current, image, natural)

    setCropping(true)
    setError(null)
    try {
      const context = ImageManipulator.manipulate(sourceUri)
      context.crop({ originX, originY, width, height })
      const rendered = await context.renderAsync()
      const result = await rendered.saveAsync({ compress: 1, format: SaveFormat.JPEG })
      onCrop(result.uri)
    } catch {
      setError('The photo could not be cropped. Try again, or skip cropping.')
    } finally {
      setCropping(false)
    }
  }

  const dimTop = imageRect && rect
    ? { left: imageRect.x, top: imageRect.y, width: imageRect.width, height: rect.y - imageRect.y }
    : null
  const dimBottom = imageRect && rect
    ? {
        left: imageRect.x,
        top: rect.y + rect.height,
        width: imageRect.width,
        height: imageRect.y + imageRect.height - (rect.y + rect.height),
      }
    : null
  const dimLeft = imageRect && rect
    ? { left: imageRect.x, top: rect.y, width: rect.x - imageRect.x, height: rect.height }
    : null
  const dimRight = imageRect && rect
    ? {
        left: rect.x + rect.width,
        top: rect.y,
        width: imageRect.x + imageRect.width - (rect.x + rect.width),
        height: rect.height,
      }
    : null

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent onRequestClose={onCancel}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close crop tool"
            hitSlop={8}
            onPress={onCancel}
            style={styles.headerBtn}
          >
            <MaterialCommunityIcons color={colors.text} name="close" size={22} />
          </Pressable>
          <Text style={styles.headerTitle}>Crop Photo</Text>
          <View style={styles.headerBtn} />
        </View>

        <View
          style={styles.imageArea}
          onLayout={(event) =>
            setContainer({
              width: event.nativeEvent.layout.width,
              height: event.nativeEvent.layout.height,
            })
          }
          {...imageAreaResponder.panHandlers}
        >
          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator color={colors.primary} size="large" />
              <Text style={styles.centeredText}>Preparing photo...</Text>
            </View>
          ) : error && !sourceUri ? (
            <View style={styles.centered}>
              <MaterialCommunityIcons color={colors.error} name="alert-circle-outline" size={34} />
              <Text style={styles.centeredText}>{error}</Text>
            </View>
          ) : (
            imageRect &&
            rect && (
              <>
                <Image
                  source={{ uri: sourceUri ?? undefined }}
                  style={{
                    position: 'absolute',
                    left: imageRect.x,
                    top: imageRect.y,
                    width: imageRect.width,
                    height: imageRect.height,
                  }}
                />
                {dimTop && dimTop.height > 0 ? (
                  <View pointerEvents="none" style={[styles.dim, dimTop]} />
                ) : null}
                {dimBottom && dimBottom.height > 0 ? (
                  <View pointerEvents="none" style={[styles.dim, dimBottom]} />
                ) : null}
                {dimLeft && dimLeft.width > 0 ? (
                  <View pointerEvents="none" style={[styles.dim, dimLeft]} />
                ) : null}
                {dimRight && dimRight.width > 0 ? (
                  <View pointerEvents="none" style={[styles.dim, dimRight]} />
                ) : null}
                <View
                  accessibilityLabel="Crop area"
                  accessibilityHint="Drag to move the crop area. Pinch with two fingers to zoom the photo."
                  style={[
                    styles.cropRect,
                    { left: rect.x, top: rect.y, width: rect.width, height: rect.height },
                  ]}
                  {...moveResponder.panHandlers}
                >
                  <View
                    accessibilityRole="button"
                    accessibilityLabel="Resize crop area from top left"
                    accessibilityHint="Drag to resize the crop area"
                    style={[styles.cornerHit, styles.cornerTl]}
                    {...cornerResponders.tl.panHandlers}
                  >
                    <View style={styles.cornerVisual} />
                  </View>
                  <View
                    accessibilityRole="button"
                    accessibilityLabel="Resize crop area from top right"
                    accessibilityHint="Drag to resize the crop area"
                    style={[styles.cornerHit, styles.cornerTr]}
                    {...cornerResponders.tr.panHandlers}
                  >
                    <View style={styles.cornerVisual} />
                  </View>
                  <View
                    accessibilityRole="button"
                    accessibilityLabel="Resize crop area from bottom left"
                    accessibilityHint="Drag to resize the crop area"
                    style={[styles.cornerHit, styles.cornerBl]}
                    {...cornerResponders.bl.panHandlers}
                  >
                    <View style={styles.cornerVisual} />
                  </View>
                  <View
                    accessibilityRole="button"
                    accessibilityLabel="Resize crop area from bottom right"
                    accessibilityHint="Drag to resize the crop area"
                    style={[styles.cornerHit, styles.cornerBr]}
                    {...cornerResponders.br.panHandlers}
                  >
                    <View style={styles.cornerVisual} />
                  </View>
                </View>
              </>
            )
          )}
        </View>

        <Text style={styles.hint}>
          Pinch to zoom, drag corners to resize, or drag inside the box to move it. The cropped
          area is what gets screened.
        </Text>

        {error && sourceUri ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Skip cropping and use the photo as is"
            disabled={cropping}
            onPress={onSkip}
            style={[styles.actionBtn, styles.skipBtn, { borderColor: colors.border }]}
          >
            <Text style={[styles.actionText, { color: colors.text }]}>Skip</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Crop and use photo"
            disabled={cropping || loading || !sourceUri || !rect}
            onPress={handleCrop}
            style={[
              styles.actionBtn,
              styles.cropBtn,
              (cropping || loading || !sourceUri || !rect) && styles.actionBtnDisabled,
            ]}
          >
            {cropping ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <MaterialCommunityIcons color="#FFFFFF" name="crop" size={16} />
                <Text style={[styles.actionText, { color: '#FFFFFF' }]}>Crop &amp; use photo</Text>
              </>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  )
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  safeArea: { backgroundColor: colors.bg, flex: 1 },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerBtn: {
    alignItems: 'center',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  headerTitle: { ...font.extrabold, color: colors.text, flex: 1, fontSize: 17, textAlign: 'center' },

  imageArea: { backgroundColor: '#000000', flex: 1, marginHorizontal: 16 },
  centered: { alignItems: 'center', flex: 1, gap: 10, justifyContent: 'center', paddingHorizontal: 24 },
  centeredText: { ...font.medium, color: colors.textSecondary, fontSize: 13, textAlign: 'center' },

  dim: { backgroundColor: 'rgba(0,0,0,0.55)', position: 'absolute' },
  cropRect: {
    borderColor: 'rgba(255,255,255,0.9)',
    borderWidth: 2,
    position: 'absolute',
  },
  // 44x44 hit target centered on each corner; visual knob is 28x28.
  cornerHit: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    position: 'absolute',
    width: 44,
  },
  cornerTl: { left: -22, top: -22 },
  cornerTr: { right: -22, top: -22 },
  cornerBl: { bottom: -22, left: -22 },
  cornerBr: { bottom: -22, right: -22 },
  cornerVisual: {
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 2,
    height: 28,
    width: 28,
  },

  hint: {
    ...font.regular,
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    marginHorizontal: 20,
    marginTop: 12,
    textAlign: 'center',
  },
  errorText: {
    ...font.semibold,
    color: colors.error,
    fontSize: 12,
    marginHorizontal: 20,
    marginTop: 8,
    textAlign: 'center',
  },

  actions: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  actionBtn: {
    alignItems: 'center',
    borderRadius: 12,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 12,
  },
  actionBtnDisabled: { opacity: 0.5 },
  skipBtn: { backgroundColor: colors.surface, borderWidth: 1.5 },
  cropBtn: { backgroundColor: colors.primary },
  actionText: { ...font.bold, fontSize: 14 },
})

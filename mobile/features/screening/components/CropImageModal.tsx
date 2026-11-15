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
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useTheme, type AppColors } from '../../../src/context/ThemeContext'
import { font } from '../../../src/theme/typography'

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

type Rect = { x: number; y: number; width: number; height: number }

/** Minimum crop size in on-screen pixels (touch handle sizing stays >= 44). */
const MIN_CROP_SIZE = 64
/** Initial crop rectangle fills this fraction of the displayed image. */
const INITIAL_FILL = 0.9

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject)
  })
}

/**
 * Optional crop step shown after the camera or gallery produces a photo.
 * Display-only framing tool: the chosen rectangle (or the untouched photo
 * when skipped) is handed back to the caller, which feeds it into the single
 * existing 512 px JPEG preparation. Nothing here touches predictions,
 * confidence, or screening logic.
 */
export function CropImageModal({ visible, uri, onCrop, onSkip, onCancel }: CropImageModalProps) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])

  const [sourceUri, setSourceUri] = useState<string | null>(null)
  const [natural, setNatural] = useState({ width: 0, height: 0 })
  const [container, setContainer] = useState({ width: 0, height: 0 })
  const [rect, setRect] = useState<Rect | null>(null)
  const [loading, setLoading] = useState(false)
  const [cropping, setCropping] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const rectRef = useRef<Rect>({ x: 0, y: 0, width: 0, height: 0 })
  const baselineRef = useRef<Rect>({ x: 0, y: 0, width: 0, height: 0 })
  const displayRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null)
  const initializedRef = useRef(false)

  const applyRect = (next: Rect) => {
    rectRef.current = next
    setRect(next)
  }

  /** Contain-fit rect of the image inside the measured image area. */
  const display = useMemo(() => {
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
  }, [container, natural])

  useEffect(() => {
    displayRef.current = display
  }, [display])

  // Load + normalize the source once per opening so the dimensions reported
  // by Image.getSize match the pixels the crop action operates on.
  useEffect(() => {
    if (!visible || !uri) {
      setSourceUri(null)
      setNatural({ width: 0, height: 0 })
      setRect(null)
      setError(null)
      initializedRef.current = false
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    setRect(null)
    setSourceUri(null)
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
  // rect, and keep an existing rectangle inside the bounds after rotation
  // or a layout change.
  useEffect(() => {
    if (!display || loading) return
    if (!initializedRef.current) {
      const inset = (1 - INITIAL_FILL) / 2
      initializedRef.current = true
      applyRect({
        x: display.x + display.width * inset,
        y: display.y + display.height * inset,
        width: display.width * INITIAL_FILL,
        height: display.height * INITIAL_FILL,
      })
      return
    }
    const current = rectRef.current
    const width = Math.min(current.width, display.width)
    const height = Math.min(current.height, display.height)
    applyRect({
      x: clamp(current.x, display.x, display.x + display.width - width),
      y: clamp(current.y, display.y, display.y + display.height - height),
      width,
      height,
    })
  }, [display, loading])

  const moveResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        baselineRef.current = { ...rectRef.current }
      },
      onPanResponderMove: (_event, gesture) => {
        const bounds = displayRef.current
        const baseline = baselineRef.current
        if (!bounds) return
        applyRect({
          ...baseline,
          x: clamp(baseline.x + gesture.dx, bounds.x, bounds.x + bounds.width - baseline.width),
          y: clamp(baseline.y + gesture.dy, bounds.y, bounds.y + bounds.height - baseline.height),
        })
      },
    }),
  ).current

  // Each corner keeps the opposite corner fixed and clamps inside the image.
  const cornerResponders = useRef({
    tl: PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        baselineRef.current = { ...rectRef.current }
      },
      onPanResponderMove: (_event, gesture) => {
        const bounds = displayRef.current
        const baseline = baselineRef.current
        if (!bounds) return
        const right = baseline.x + baseline.width
        const bottom = baseline.y + baseline.height
        const x = clamp(baseline.x + gesture.dx, bounds.x, right - MIN_CROP_SIZE)
        const y = clamp(baseline.y + gesture.dy, bounds.y, bottom - MIN_CROP_SIZE)
        applyRect({ x, y, width: right - x, height: bottom - y })
      },
    }),
    tr: PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        baselineRef.current = { ...rectRef.current }
      },
      onPanResponderMove: (_event, gesture) => {
        const bounds = displayRef.current
        const baseline = baselineRef.current
        if (!bounds) return
        const bottom = baseline.y + baseline.height
        const y = clamp(baseline.y + gesture.dy, bounds.y, bottom - MIN_CROP_SIZE)
        const maxWidth = bounds.x + bounds.width - baseline.x - MIN_CROP_SIZE
        const width = clamp(baseline.width + gesture.dx, MIN_CROP_SIZE, maxWidth)
        applyRect({ x: baseline.x, y, width, height: bottom - y })
      },
    }),
    bl: PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        baselineRef.current = { ...rectRef.current }
      },
      onPanResponderMove: (_event, gesture) => {
        const bounds = displayRef.current
        const baseline = baselineRef.current
        if (!bounds) return
        const right = baseline.x + baseline.width
        const x = clamp(baseline.x + gesture.dx, bounds.x, right - MIN_CROP_SIZE)
        const maxHeight = bounds.y + bounds.height - baseline.y - MIN_CROP_SIZE
        const height = clamp(baseline.height + gesture.dy, MIN_CROP_SIZE, maxHeight)
        applyRect({ x, y: baseline.y, width: right - x, height })
      },
    }),
    br: PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        baselineRef.current = { ...rectRef.current }
      },
      onPanResponderMove: (_event, gesture) => {
        const bounds = displayRef.current
        const baseline = baselineRef.current
        if (!bounds) return
        const maxWidth = bounds.x + bounds.width - baseline.x
        const maxHeight = bounds.y + bounds.height - baseline.y
        applyRect({
          ...baseline,
          width: clamp(baseline.width + gesture.dx, MIN_CROP_SIZE, maxWidth),
          height: clamp(baseline.height + gesture.dy, MIN_CROP_SIZE, maxHeight),
        })
      },
    }),
  }).current

  const handleCrop = async () => {
    const bounds = display
    if (!sourceUri || !bounds || cropping) return
    const current = rectRef.current
    const scaleX = natural.width / bounds.width
    const scaleY = natural.height / bounds.height
    const originX = clamp(Math.round((current.x - bounds.x) * scaleX), 0, natural.width - 1)
    const originY = clamp(Math.round((current.y - bounds.y) * scaleY), 0, natural.height - 1)
    const width = clamp(Math.round(current.width * scaleX), 1, natural.width - originX)
    const height = clamp(Math.round(current.height * scaleY), 1, natural.height - originY)

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

  const dimTop = display && rect
    ? { left: display.x, top: display.y, width: display.width, height: rect.y - display.y }
    : null
  const dimBottom = display && rect
    ? {
        left: display.x,
        top: rect.y + rect.height,
        width: display.width,
        height: display.y + display.height - (rect.y + rect.height),
      }
    : null
  const dimLeft = display && rect
    ? { left: display.x, top: rect.y, width: rect.x - display.x, height: rect.height }
    : null
  const dimRight = display && rect
    ? {
        left: rect.x + rect.width,
        top: rect.y,
        width: display.x + display.width - (rect.x + rect.width),
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
            display &&
            rect && (
              <>
                <Image
                  source={{ uri: sourceUri ?? undefined }}
                  style={{
                    position: 'absolute',
                    left: display.x,
                    top: display.y,
                    width: display.width,
                    height: display.height,
                  }}
                />
                {dimTop ? <View pointerEvents="none" style={[styles.dim, dimTop]} /> : null}
                {dimBottom ? <View pointerEvents="none" style={[styles.dim, dimBottom]} /> : null}
                {dimLeft ? <View pointerEvents="none" style={[styles.dim, dimLeft]} /> : null}
                {dimRight ? <View pointerEvents="none" style={[styles.dim, dimRight]} /> : null}
                <View
                  accessibilityLabel="Crop area"
                  accessibilityHint="Drag to move the crop area"
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
          Drag a corner to resize, or drag inside the box to move it. The cropped area is what
          gets screened.
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

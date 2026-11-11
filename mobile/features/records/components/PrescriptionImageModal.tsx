import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useTheme, type AppColors } from '../../../src/context/ThemeContext'
import type { PrescriptionRecord } from '../../../src/services/records'
import { font } from '../../../src/theme/typography'
import { usePrescriptionImageExport } from '../hooks/usePrescriptionImageExport'
import { PrescriptionImageDocument } from './PrescriptionImageDocument'

interface PrescriptionImageModalProps {
  prescription: PrescriptionRecord
  visible: boolean
  onClose: () => void
}

export function PrescriptionImageModal({
  prescription,
  visible,
  onClose,
}: PrescriptionImageModalProps) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const { width: windowWidth } = useWindowDimensions()
  const captureRef = useRef<ScrollView>(null)
  const autoCaptureStartedRef = useRef(false)
  const modalShownRef = useRef(false)
  const documentLaidOutRef = useRef(false)
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null)
  const {
    capture,
    captureError,
    imageUri,
    isSaving,
    reset,
    saveToGallery,
  } = usePrescriptionImageExport()

  const documentWidth = Math.max(280, Math.min(windowWidth - 32, 440))
  const previewWidth = Math.max(240, Math.min(windowWidth - 32, 460))
  const previewHeight = imageSize
    ? (previewWidth * imageSize.height) / imageSize.width
    : previewWidth * 1.414

  useEffect(() => {
    if (visible) return

    autoCaptureStartedRef.current = false
    modalShownRef.current = false
    documentLaidOutRef.current = false
    setImageSize(null)
    reset()
  }, [visible, reset])

  useEffect(() => {
    if (!imageUri) {
      setImageSize(null)
      return
    }

    let active = true
    Image.getSize(
      imageUri,
      (width, height) => {
        if (active && width > 0 && height > 0) setImageSize({ width, height })
      },
      () => {
        if (active) setImageSize(null)
      },
    )

    return () => {
      active = false
    }
  }, [imageUri])

  const tryCapture = useCallback(() => {
    if (
      !modalShownRef.current ||
      !documentLaidOutRef.current ||
      autoCaptureStartedRef.current
    ) {
      return
    }

    autoCaptureStartedRef.current = true
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        void capture(captureRef)
      })
    })
  }, [capture])

  const handleShow = useCallback(() => {
    modalShownRef.current = true
    tryCapture()
  }, [tryCapture])

  const handleDocumentLayout = useCallback(() => {
    documentLaidOutRef.current = true
    tryCapture()
  }, [tryCapture])

  const handleRetry = useCallback(() => {
    autoCaptureStartedRef.current = true
    void capture(captureRef)
  }, [capture])

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      onShow={handleShow}
      statusBarTranslucent
      visible={visible}
    >
      <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
        <View style={styles.header}>
          <View style={styles.headerSide} />
          <Text style={styles.headerTitle}>Prescription Image</Text>
          <Pressable
            accessibilityLabel="Close prescription image"
            accessibilityRole="button"
            hitSlop={8}
            onPress={onClose}
            style={({ pressed }) => [styles.headerSide, pressed && styles.pressed]}
          >
            <MaterialCommunityIcons color={colors.text} name="close" size={22} />
          </Pressable>
        </View>

        <View style={styles.previewArea}>
          {imageUri ? (
            <ScrollView
              contentContainerStyle={styles.previewContent}
              maximumZoomScale={2}
              minimumZoomScale={1}
              showsVerticalScrollIndicator={false}
            >
              <Image
                accessibilityLabel={`Prescription image for ${prescription.pet_name}`}
                resizeMode="contain"
                source={{ uri: imageUri }}
                style={{ backgroundColor: '#FFFFFF', height: previewHeight, width: previewWidth }}
              />
            </ScrollView>
          ) : (
            <View style={styles.captureStage}>
              <ScrollView
                ref={captureRef}
                contentContainerStyle={styles.captureContent}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
                style={{ alignSelf: 'center', flex: 1, width: documentWidth }}
              >
                <View collapsable={false} onLayout={handleDocumentLayout}>
                  <PrescriptionImageDocument
                    prescription={prescription}
                    width={documentWidth}
                  />
                </View>
              </ScrollView>

              <View style={styles.captureOverlay}>
                {captureError ? (
                  <>
                    <View style={styles.errorIcon}>
                      <MaterialCommunityIcons
                        color={colors.error}
                        name="alert-circle-outline"
                        size={30}
                      />
                    </View>
                    <Text style={styles.errorTitle}>Could not create image</Text>
                    <Text style={styles.errorMessage}>{captureError}</Text>
                    <Pressable
                      accessibilityRole="button"
                      onPress={handleRetry}
                      style={({ pressed }) => [
                        styles.retryButton,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={styles.retryText}>Try Again</Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <ActivityIndicator color={colors.primary} size="large" />
                    <Text style={styles.loadingTitle}>Preparing prescription image...</Text>
                    <Text style={styles.loadingMessage}>
                      This will only take a moment.
                    </Text>
                  </>
                )}
              </View>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerHint}>
            Download a PNG copy of this prescription to your photo library.
          </Text>
          <Pressable
            accessibilityLabel="Download prescription image"
            accessibilityRole="button"
            accessibilityState={{ disabled: !imageUri || isSaving }}
            disabled={!imageUri || isSaving}
            onPress={() => void saveToGallery()}
            style={({ pressed }) => [
              styles.downloadButton,
              pressed && imageUri && !isSaving && styles.pressed,
              (!imageUri || isSaving) && styles.downloadButtonDisabled,
            ]}
          >
            {isSaving ? (
              <ActivityIndicator color={colors.inverse} size="small" />
            ) : (
              <MaterialCommunityIcons color={colors.inverse} name="download" size={20} />
            )}
            <Text style={styles.downloadButtonText}>
              {isSaving ? 'Saving image...' : 'Download Image'}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  )
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    screen: {
      backgroundColor: colors.bg,
      flex: 1,
    },
    header: {
      alignItems: 'center',
      borderBottomColor: colors.border,
      borderBottomWidth: 1,
      flexDirection: 'row',
      height: 56,
      paddingHorizontal: 10,
    },
    headerSide: {
      alignItems: 'center',
      height: 44,
      justifyContent: 'center',
      width: 44,
    },
    headerTitle: {
      ...font.bold,
      color: colors.text,
      flex: 1,
      fontSize: 16,
      textAlign: 'center',
    },
    pressed: {
      opacity: 0.65,
    },
    previewArea: {
      backgroundColor: colors.surfaceAlt,
      flex: 1,
    },
    previewContent: {
      alignItems: 'center',
      flexGrow: 1,
      justifyContent: 'center',
      padding: 16,
    },
    captureStage: {
      flex: 1,
    },
    captureContent: {
      backgroundColor: '#FFFFFF',
    },
    captureOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      backgroundColor: colors.bg,
      gap: 8,
      justifyContent: 'center',
      paddingHorizontal: 32,
    },
    loadingTitle: {
      ...font.semibold,
      color: colors.text,
      fontSize: 15,
      marginTop: 4,
      textAlign: 'center',
    },
    loadingMessage: {
      ...font.regular,
      color: colors.textSecondary,
      fontSize: 13,
      textAlign: 'center',
    },
    errorIcon: {
      alignItems: 'center',
      backgroundColor: colors.errorBg,
      borderRadius: 28,
      height: 56,
      justifyContent: 'center',
      width: 56,
    },
    errorTitle: {
      ...font.bold,
      color: colors.text,
      fontSize: 16,
      marginTop: 4,
      textAlign: 'center',
    },
    errorMessage: {
      ...font.regular,
      color: colors.textSecondary,
      fontSize: 13,
      lineHeight: 19,
      textAlign: 'center',
    },
    retryButton: {
      borderColor: colors.primary,
      borderRadius: 12,
      borderWidth: 1.5,
      marginTop: 8,
      paddingHorizontal: 22,
      paddingVertical: 10,
    },
    retryText: {
      ...font.bold,
      color: colors.primary,
      fontSize: 14,
    },
    footer: {
      backgroundColor: colors.surface,
      borderTopColor: colors.border,
      borderTopWidth: 1,
      gap: 10,
      paddingBottom: 12,
      paddingHorizontal: 20,
      paddingTop: 12,
    },
    footerHint: {
      ...font.regular,
      color: colors.textMuted,
      fontSize: 11,
      lineHeight: 15,
      textAlign: 'center',
    },
    downloadButton: {
      alignItems: 'center',
      backgroundColor: colors.primary,
      borderRadius: 14,
      flexDirection: 'row',
      gap: 8,
      height: 48,
      justifyContent: 'center',
    },
    downloadButtonDisabled: {
      opacity: 0.6,
    },
    downloadButtonText: {
      ...font.bold,
      color: colors.inverse,
      fontSize: 15,
    },
  })

import * as MediaLibrary from 'expo-media-library'
import * as Sharing from 'expo-sharing'
import { useCallback, useRef, useState, type RefObject } from 'react'
import { Alert, Linking, Platform, type ScrollView } from 'react-native'
import { captureRef } from 'react-native-view-shot'

import { normalizeCapturedImageUri } from '../lib/prescriptionImage'

type CaptureViewRef = RefObject<ScrollView | null>

function showPermissionAlert(canAskAgain: boolean) {
  if (canAskAgain) {
    Alert.alert(
      'Photo permission needed',
      'Allow XPawSure to save the prescription image to your photo library.',
    )
    return
  }

  Alert.alert(
    'Photo permission needed',
    'Allow XPawSure to save photos in your device Settings, then try again.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Open Settings',
        onPress: () => {
          void Linking.openSettings()
        },
      },
    ],
  )
}

export function usePrescriptionImageExport() {
  const [imageUri, setImageUri] = useState<string | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [captureError, setCaptureError] = useState<string | null>(null)
  const captureInFlightRef = useRef(false)
  const saveInFlightRef = useRef(false)
  const operationRef = useRef(0)

  const reset = useCallback(() => {
    operationRef.current += 1
    captureInFlightRef.current = false
    saveInFlightRef.current = false
    setImageUri(null)
    setIsCapturing(false)
    setIsSaving(false)
    setCaptureError(null)
  }, [])

  const capture = useCallback(async (ref: CaptureViewRef) => {
    if (captureInFlightRef.current) return
    if (!ref.current) {
      setCaptureError('The prescription preview is not ready yet.')
      return
    }

    captureInFlightRef.current = true
    const operation = operationRef.current + 1
    operationRef.current = operation
    setIsCapturing(true)
    setCaptureError(null)

    try {
      const uri = await captureRef(ref, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
        snapshotContentContainer: true,
      })
      if (operationRef.current !== operation) return
      setImageUri(normalizeCapturedImageUri(uri))
    } catch (error) {
      if (operationRef.current !== operation) return
      setCaptureError(
        error instanceof Error
          ? error.message
          : 'The image could not be created. Please try again.',
      )
    } finally {
      captureInFlightRef.current = false
      if (operationRef.current === operation) {
        setIsCapturing(false)
      }
    }
  }, [])

  const saveToGallery = useCallback(async () => {
    if (!imageUri || saveInFlightRef.current) return

    saveInFlightRef.current = true
    setIsSaving(true)
    try {
      const androidSdk =
        Platform.OS === 'android' && typeof Platform.Version === 'number'
          ? Platform.Version
          : null

      // Android 13+ can save through MediaStore without a runtime permission.
      // Older Android versions and iOS need write access first.
      if (Platform.OS === 'ios' || (androidSdk != null && androidSdk < 33)) {
        try {
          const permission = await MediaLibrary.requestPermissionsAsync(true)
          if (!permission.granted) {
            showPermissionAlert(permission.canAskAgain)
            return
          }
        } catch {
          // Expo Go cannot expose some media permissions on older Android.
          // Try the save directly; Expo Go may already have write access.
        }
      }

      await MediaLibrary.saveToLibraryAsync(imageUri)
      Alert.alert(
        'Image downloaded',
        'The prescription image was saved to your photo library.',
      )
    } catch (error) {
      const canShare = await Sharing.isAvailableAsync().catch(() => false)
      if (canShare) {
        Alert.alert(
          'Could not save to Photos',
          'You can still save the prescription image from the share sheet.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Share Image',
              onPress: () => {
                void Sharing.shareAsync(imageUri, {
                  dialogTitle: 'Save prescription image',
                  mimeType: 'image/png',
                  UTI: 'public.png',
                }).catch(() => {
                  Alert.alert(
                    'Could not share image',
                    'Please try downloading the image again.',
                  )
                })
              },
            },
          ],
        )
        return
      }

      Alert.alert(
        'Could not save image',
        error instanceof Error ? error.message : 'Please try again.',
      )
    } finally {
      saveInFlightRef.current = false
      setIsSaving(false)
    }
  }, [imageUri])

  return {
    capture,
    captureError,
    imageUri,
    isCapturing,
    isSaving,
    reset,
    saveToGallery,
  }
}

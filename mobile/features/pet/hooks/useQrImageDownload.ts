import * as MediaLibrary from 'expo-media-library'
import * as Sharing from 'expo-sharing'
import { useCallback, useRef, useState, type RefObject } from 'react'
import { Alert, Linking, Platform, type View } from 'react-native'
import { captureRef } from 'react-native-view-shot'

type CaptureViewRef = RefObject<View | null>

function normalizeCapturedImageUri(uri: string): string {
  const value = uri.trim()
  if (!value) return value
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return value
  return `file://${value.startsWith('/') ? '' : '/'}${value}`
}

function showPermissionAlert(canAskAgain: boolean) {
  if (canAskAgain) {
    Alert.alert(
      'Photo permission needed',
      'Allow XPawSure to save the QR code image to your photo library.',
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

async function requestSavePermission(): Promise<boolean> {
  const androidSdk =
    Platform.OS === 'android' && typeof Platform.Version === 'number'
      ? Platform.Version
      : null

  if (Platform.OS !== 'ios' && !(androidSdk != null && androidSdk < 33)) {
    return true
  }

  try {
    const permission = await MediaLibrary.requestPermissionsAsync(true)
    if (permission.granted) return true
    showPermissionAlert(permission.canAskAgain)
    return false
  } catch {
    return true
  }
}

interface UseQrImageDownloadOptions {
  onSaved?: () => void
}

export function useQrImageDownload({ onSaved }: UseQrImageDownloadOptions = {}) {
  const [isDownloading, setIsDownloading] = useState(false)
  const downloadInFlightRef = useRef(false)

  const download = useCallback(async (ref: CaptureViewRef) => {
    if (downloadInFlightRef.current) return
    if (!ref.current) {
      Alert.alert('QR code not ready', 'Please wait a moment and try again.')
      return
    }

    downloadInFlightRef.current = true
    setIsDownloading(true)
    let imageUri: string | null = null

    try {
      imageUri = normalizeCapturedImageUri(
        await captureRef(ref, {
          format: 'png',
          quality: 1,
          result: 'tmpfile',
        }),
      )

      const canSave = await requestSavePermission()
      if (!canSave) return

      await MediaLibrary.saveToLibraryAsync(imageUri)
      onSaved?.()
    } catch (error) {
      if (imageUri) {
        const canShare = await Sharing.isAvailableAsync().catch(() => false)
        if (canShare) {
          Alert.alert(
            'Could not save to Photos',
            'You can still save the QR code image from the share sheet.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Share Image',
                onPress: () => {
                  void Sharing.shareAsync(imageUri!, {
                    dialogTitle: 'Save QR code image',
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
      }

      Alert.alert(
        'Could not save QR code',
        error instanceof Error ? error.message : 'Please try again.',
      )
    } finally {
      downloadInFlightRef.current = false
      setIsDownloading(false)
    }
  }, [onSaved])

  return { download, isDownloading }
}

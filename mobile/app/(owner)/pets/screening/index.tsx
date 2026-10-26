import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as ImagePicker from 'expo-image-picker'

import { useAuth } from '../../../../src/context/AuthContext'
import { useTheme, type AppColors } from '../../../../src/context/ThemeContext'
import { font } from '../../../../src/theme/typography'
import { usePets } from '../../../../features/pet/hooks/usePets'
import type { ScreeningResult } from '../../../../ai/types/ai.types'
import { analyzeScreeningImage } from '../../../../src/services/screening'
import { isClaudeValidationApproved } from '../../../../features/screening/comparison'
import type { ClaudeAnalysisResponse } from '../../../../features/screening/types'
import { useAIScreening } from '../../../../ai/hooks/useAIScreening'
import { prepareImageForInference } from '../../../../ai/services/imagePreprocess'
import { isReady, loadModel } from '../../../../ai/services/tensorflow.service'

type AnalysisPhase = 'idle' | 'validating' | 'classifying'

const IMAGE_SUITABILITY_VALUES = new Set<string>([
  'SUITABLE',
  'POOR_QUALITY',
  'NOT_DOG_SKIN',
  'NO_VISIBLE_LESIONS',
  'WOUND_OR_INJURY',
  'UNCERTAIN',
])
const SCREENING_ELIGIBILITY_VALUES = new Set<string>(['ELIGIBLE', 'NOT_ELIGIBLE'])

function requestErrorDetail(error: unknown): string | null {
  const detail = (error as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
  return typeof detail === 'string' && detail.trim() ? detail : null
}

export default function CaptureScreen() {
  const router = useRouter()
  const { colors, isDark } = useTheme()
  const { user } = useAuth()
  const { petId: petIdParam } = useLocalSearchParams<{ petId?: string }>()
  const { data: pets, isLoading: petsLoading } = usePets(user?.id)
  const { screenImage, isScreening } = useAIScreening()
  const styles = useMemo(() => createStyles(colors), [colors])

  const [selectedPetId, setSelectedPetId] = useState<string | null>(null)
  const [imageUri, setImageUri] = useState<string | null>(null)
  const [pickerLoading, setPickerLoading] = useState(false)
  const [analysisPhase, setAnalysisPhase] = useState<AnalysisPhase>('idle')
  const screeningRunRef = useRef(false)
  const [isModelPrepared, setIsModelPrepared] = useState(isReady())
  const [modelLoadError, setModelLoadError] = useState<string | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)

  const selectedPet = pets?.find((p) => p.id === selectedPetId)
  const petsLoaded = pets !== undefined
  const hasPets = (pets?.length ?? 0) > 0
  const isBusy = analysisPhase !== 'idle' || pickerLoading || isScreening
  const canRun = !!imageUri && !!selectedPet && !isBusy

  useEffect(() => {
    if (!pets || selectedPetId) return
    if (petIdParam && pets.some((p) => p.id === petIdParam)) {
      setSelectedPetId(petIdParam)
    } else if (pets.length === 1) {
      setSelectedPetId(pets[0].id)
    }
  }, [pets, petIdParam, selectedPetId])

  useEffect(() => {
    if (isReady()) return
    let mounted = true
    loadModel()
      .catch(() => {
        if (mounted) {
          setModelLoadError(
            'The on-device model could not be loaded. Photo validation can still run, but no prediction will be created if the photo is approved.',
          )
        }
      })
      .finally(() => {
        if (mounted) setIsModelPrepared(true)
      })
    return () => {
      mounted = false
    }
  }, [])

  const prepareSelectedImage = async (sourceUri: string) => {
    setAnalysisError(null)
    try {
      const prepared = await prepareImageForInference(sourceUri)
      setImageUri(prepared)
      setAnalysisError(null)
    } catch {
      setAnalysisError(
        'This photo could not be prepared for analysis. Please choose another image.',
      )
    }
  }

  const handlePickGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) return

    setPickerLoading(true)
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        allowsMultipleSelection: false,
        quality: 1,
        exif: false,
      })
      if (!result.canceled && result.assets[0]) {
        await prepareSelectedImage(result.assets[0].uri)
      }
    } finally {
      setPickerLoading(false)
    }
  }

  const handleTakePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync()
    if (!perm.granted) return

    setPickerLoading(true)
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 1,
        exif: false,
      })
      if (!result.canceled && result.assets[0]) {
        await prepareSelectedImage(result.assets[0].uri)
      }
    } finally {
      setPickerLoading(false)
    }
  }

  const handleRunScreening = async () => {
    if (!selectedPet || !imageUri || isBusy || screeningRunRef.current) return

    screeningRunRef.current = true
    setAnalysisPhase('validating')
    setAnalysisError(null)

    try {
      let claudeResponse: ClaudeAnalysisResponse
      try {
        claudeResponse = await analyzeScreeningImage(imageUri)
      } catch (error) {
        const detail = requestErrorDetail(error)
        setAnalysisError(
          `${detail || 'Photo validation could not be completed.'} ` +
            'The on-device screening was not run. Check your connection and try again.',
        )
        return
      }

      if (claudeResponse.status !== 'OK' || !claudeResponse.result) {
        setAnalysisError(
          claudeResponse.detail ||
            'The photo could not be validated, so the on-device screening was not run. Please try again.',
        )
        return
      }

      const gate = claudeResponse.result
      if (
        !IMAGE_SUITABILITY_VALUES.has(gate.image_suitability) ||
        !SCREENING_ELIGIBILITY_VALUES.has(gate.screening_eligibility) ||
        typeof gate.screening_message !== 'string' ||
        !gate.screening_message.trim() ||
        !Array.isArray(gate.visible_features) ||
        !gate.image_quality ||
        typeof gate.image_quality.adequate !== 'boolean' ||
        !Array.isArray(gate.image_quality.observations) ||
        !gate.condition_assessment
      ) {
        setAnalysisError(
          'The photo validation response was incomplete, so the on-device screening ' +
            'was not run. Please try again.',
        )
        return
      }

      if (!isClaudeValidationApproved(claudeResponse)) {
        router.push({
          pathname: '/(owner)/pets/screening/result',
          params: {
            imageUri,
            petId: selectedPet.id,
            petName: selectedPet.name,
            predictions: '[]',
            modelVersion: '',
            inferenceTimeMs: '0',
            state: 'INVALID_IMAGE',
            stateMessage: gate.screening_message,
            deviceFailed: 'false',
            classifierSkipped: 'true',
            claude: JSON.stringify(claudeResponse),
            claudeRequestFailed: 'false',
          },
        })
        return
      }

      setAnalysisPhase('classifying')
      let deviceResult: ScreeningResult | null = null
      let deviceFailed = false
      try {
        deviceResult = await screenImage(imageUri)
      } catch {
        deviceFailed = true
      }

      if (deviceResult?.state === 'DISEASE_DETECTED' && deviceResult.predictions.length > 0) {
        router.push({
          pathname: '/(owner)/pets/screening/adjust',
          params: {
            imageUri,
            petId: selectedPet.id,
            petName: selectedPet.name,
            predictions: JSON.stringify(deviceResult.predictions),
            modelVersion: deviceResult.modelVersion,
            inferenceTimeMs: String(deviceResult.inferenceTimeMs),
            deviceFailed: 'false',
            classifierSkipped: 'false',
            claude: JSON.stringify(claudeResponse),
            claudeRequestFailed: 'false',
          },
        })
        return
      }

      router.push({
        pathname: '/(owner)/pets/screening/result',
        params: {
          imageUri,
          petId: selectedPet.id,
          petName: selectedPet.name,
          predictions: JSON.stringify(deviceResult?.predictions ?? []),
          modelVersion: deviceResult?.modelVersion ?? '',
          inferenceTimeMs: String(deviceResult?.inferenceTimeMs ?? 0),
          state: deviceResult?.state ?? 'INVALID_IMAGE',
          stateMessage: deviceResult?.stateMessage ?? '',
          deviceFailed: deviceFailed ? 'true' : 'false',
          classifierSkipped: 'false',
          claude: JSON.stringify(claudeResponse),
          claudeRequestFailed: 'false',
        },
      })
    } finally {
      screeningRunRef.current = false
      setAnalysisPhase('idle')
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={styles.safeArea.backgroundColor} />

      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.headerBack}>
          <MaterialCommunityIcons color={colors.text} name="arrow-left" size={22} />
        </Pressable>
        <Text style={styles.headerTitle}>Skin Screening</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {modelLoadError && (
          <View style={styles.statusBanner}>
            <MaterialCommunityIcons color={colors.primary} name="alert-circle-outline" size={16} />
            <Text style={styles.statusText}>{modelLoadError}</Text>
          </View>
        )}

        {analysisError && (
          <View style={[styles.statusBanner, styles.statusBannerError]}>
            <MaterialCommunityIcons color={colors.error} name="alert-circle-outline" size={16} />
            <Text style={[styles.statusText, { color: colors.error }]}>{analysisError}</Text>
          </View>
        )}

        {!isModelPrepared && !modelLoadError && analysisPhase === 'idle' && !isScreening && (
          <View style={styles.statusBanner}>
            <ActivityIndicator color={colors.primary} size="small" />
            <Text style={styles.statusText}>Preparing AI model...</Text>
          </View>
        )}

        {petsLoading && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>SELECT PET</Text>
            <View style={styles.petLoadingRow}>
              <ActivityIndicator color={colors.primary} size="small" />
              <Text style={styles.loadingText}>Loading your pets...</Text>
            </View>
          </View>
        )}

        {petsLoaded && !hasPets && (
          <View style={styles.emptyPetCard}>
            <MaterialCommunityIcons color={colors.primary} name="paw" size={28} />
            <Text style={styles.emptyPetTitle}>Add a pet first</Text>
            <Text style={styles.emptyPetText}>
              A skin screening must be linked to one of your pets.
            </Text>
            <Pressable
              onPress={() => router.push('/(owner)/pets')}
              style={styles.emptyPetBtn}
            >
              <Text style={styles.emptyPetBtnText}>Go to My Pets</Text>
            </Pressable>
          </View>
        )}

        {pets && pets.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>SELECT PET</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.petPills}>
              {pets.map((pet) => {
                const active = pet.id === selectedPetId
                return (
                  <Pressable
                    key={pet.id}
                    accessibilityLabel={`Select ${pet.name}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => setSelectedPetId(pet.id)}
                    style={[styles.petPill, active && styles.petPillActive]}
                  >
                    {pet.profile_picture ? (
                      <Image source={{ uri: pet.profile_picture }} style={styles.petPillAvatar} />
                    ) : (
                      <View style={[styles.petPillAvatarPlaceholder, active && styles.petPillAvatarPlaceholderActive]}>
                        <MaterialCommunityIcons color={active ? '#FFF' : colors.iconColor} name="paw" size={12} />
                      </View>
                    )}
                    <Text style={[styles.petPillName, active && styles.petPillNameActive]} numberOfLines={1}>
                      {pet.name}
                    </Text>
                    {active && (
                      <MaterialCommunityIcons color="#FFFFFF" name="check-circle" size={14} />
                    )}
                  </Pressable>
                )
              })}
            </ScrollView>
            {!selectedPetId && (
              <Text style={styles.selectHint}>Select a pet to continue</Text>
            )}
          </View>
        )}

        <View style={styles.imageSection}>
          <Text style={styles.sectionLabel}>PHOTO</Text>
          <View style={styles.previewCard}>
            {imageUri ? (
              <>
                <Image source={{ uri: imageUri }} style={styles.previewImage} />
                <View style={styles.previewBadge}>
                  <MaterialCommunityIcons color="#FFFFFF" name="check" size={12} />
                  <Text style={styles.previewBadgeText}>1 photo selected</Text>
                </View>
              </>
            ) : (
              <View style={styles.previewPlaceholder}>
                <MaterialCommunityIcons color={colors.textMuted} name="camera-outline" size={34} />
                <Text style={styles.previewPlaceholderTitle}>Add one clear photo</Text>
                <Text style={styles.previewPlaceholderText}>
                  Show the affected skin area in good light.
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.slotHint}>
            One photo is checked first for screening suitability, then analyzed on-device
            only if it is eligible.
          </Text>
        </View>

        <View style={styles.sourceButtons}>
          <Pressable
            onPress={handleTakePhoto}
            disabled={pickerLoading || isBusy}
            style={[styles.sourceBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <MaterialCommunityIcons color={colors.primary} name="camera" size={20} />
            <Text style={[styles.sourceBtnText, { color: colors.text }]}>
              {imageUri ? 'Retake Photo' : 'Take Photo'}
            </Text>
          </Pressable>
          <Pressable
            onPress={handlePickGallery}
            disabled={pickerLoading || isBusy}
            style={[styles.sourceBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <MaterialCommunityIcons color={colors.primary} name="image-multiple" size={20} />
            <Text style={[styles.sourceBtnText, { color: colors.text }]}>
              {imageUri ? 'Choose Another' : 'Gallery'}
            </Text>
          </Pressable>
        </View>

        {pickerLoading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.primary} size="small" />
            <Text style={styles.loadingText}>Preparing photo...</Text>
          </View>
        )}

        <View style={styles.tipsCard}>
          <View style={styles.tipsHeader}>
            <MaterialCommunityIcons color={colors.textSecondary} name="camera" size={18} />
            <Text style={styles.tipsTitle}>Photo Tips</Text>
          </View>
          <View style={styles.tipsBullet}>
            <Text style={styles.tipsDot}>•</Text>
            <Text style={styles.tipsText}>Ensure good lighting on the affected area</Text>
          </View>
          <View style={styles.tipsBullet}>
            <Text style={styles.tipsDot}>•</Text>
            <Text style={styles.tipsText}>Take a close-up photo of the skin condition</Text>
          </View>
          <View style={styles.tipsBullet}>
            <Text style={styles.tipsDot}>•</Text>
            <Text style={styles.tipsText}>Blurred or poorly lit photos cannot be screened</Text>
          </View>
        </View>

        <Pressable
          onPress={handleRunScreening}
          disabled={!canRun}
          style={[styles.screenBtn, styles.screenBtnInFlow, !canRun && styles.screenBtnDisabled]}
        >
          {isBusy ? (
            <>
              <ActivityIndicator color="#FFF" size="small" />
              <Text style={styles.screenBtnText}>
                {pickerLoading
                  ? 'Preparing photo...'
                  : analysisPhase === 'validating'
                    ? 'Checking photo...'
                    : 'Running screening...'}
              </Text>
            </>
          ) : (
            <>
              <MaterialCommunityIcons color="#FFF" name="magnify" size={18} />
              <Text style={styles.screenBtnText}>
                {imageUri ? 'Run Screening' : 'Add a photo to continue'}
              </Text>
            </>
          )}
        </Pressable>
      </ScrollView>

      <Modal visible={isBusy} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.overlay}>
          <View style={styles.overlayCard}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.overlayTitle}>
              {pickerLoading
                ? 'Preparing photo...'
                : analysisPhase === 'validating'
                  ? 'Checking photo...'
                  : 'Running screening...'}
            </Text>
            <Text style={styles.overlayHint}>
              {pickerLoading
                ? 'Converting the photo to a single analysis copy'
                : analysisPhase === 'validating'
                  ? 'Claude Vision is checking whether this photo is suitable for screening'
                  : 'Validation passed. The on-device model is analyzing the same photo'}
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  headerBack: {
    alignItems: 'center',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  headerTitle: { ...font.extrabold, color: colors.text, flex: 1, fontSize: 20 },
  headerRight: { width: 40 },

  content: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 24 },

  section: { marginBottom: 20 },
  sectionLabel: { ...font.semibold, color: colors.textMuted, fontSize: 11, letterSpacing: 0.5, marginBottom: 10 },
  selectHint: { ...font.semibold, color: colors.error, fontSize: 12, marginTop: 8 },
  petLoadingRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  emptyPetCard: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.borderLight,
    borderRadius: 20,
    borderWidth: 1.5,
    gap: 6,
    marginBottom: 20,
    paddingVertical: 28,
    paddingHorizontal: 24,
  },
  emptyPetTitle: { ...font.bold, color: colors.text, fontSize: 16 },
  emptyPetText: { ...font.regular, color: colors.textMuted, fontSize: 13, lineHeight: 18, textAlign: 'center' },
  emptyPetBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  emptyPetBtnText: { ...font.bold, color: '#FFFFFF', fontSize: 13 },
  petPills: { gap: 8 },
  petPill: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.borderLight,
    borderRadius: 14,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  petPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  petPillAvatar: { borderRadius: 14, height: 28, width: 28 },
  petPillAvatarPlaceholder: {
    alignItems: 'center',
    backgroundColor: colors.iconBg,
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  petPillAvatarPlaceholderActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  petPillName: { ...font.semibold, color: colors.text, fontSize: 13, maxWidth: 100 },
  petPillNameActive: { color: '#FFFFFF' },

  imageSection: { marginBottom: 16 },
  previewCard: {
    aspectRatio: 1.25,
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.borderLight,
    borderRadius: 20,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    marginBottom: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  previewImage: { height: '100%', width: '100%' },
  previewPlaceholder: {
    alignItems: 'center',
    flex: 1,
    gap: 6,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  previewPlaceholderTitle: { ...font.bold, color: colors.text, fontSize: 15 },
  previewPlaceholderText: { ...font.regular, color: colors.textMuted, fontSize: 12, textAlign: 'center' },
  previewBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 10,
    bottom: 10,
    flexDirection: 'row',
    gap: 4,
    left: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
    position: 'absolute',
  },
  previewBadgeText: { ...font.semibold, color: '#FFFFFF', fontSize: 11 },
  slotHint: { ...font.regular, color: colors.textMuted, fontSize: 12, lineHeight: 17 },

  sourceButtons: { flexDirection: 'row', gap: 12 },
  sourceBtn: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1.5,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 14,
  },
  sourceBtnText: { ...font.semibold, fontSize: 14 },

  loadingRow: { alignItems: 'center', flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 16 },
  loadingText: { ...font.regular, color: colors.textSecondary, fontSize: 13 },

  statusBanner: {
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  statusBannerError: { backgroundColor: colors.errorBg },
  statusText: { ...font.semibold, color: colors.primary, flex: 1, fontSize: 13, lineHeight: 18 },

  tipsCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    gap: 8,
    marginTop: 24,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  tipsHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 2,
  },
  tipsTitle: { ...font.bold, color: colors.text, fontSize: 15 },
  tipsBullet: {
    columnGap: 8,
    flexDirection: 'row',
  },
  tipsDot: { color: colors.textMuted, fontSize: 13, lineHeight: 20 },
  tipsText: { ...font.regular, color: colors.textMuted, flex: 1, fontSize: 13, lineHeight: 20 },

  screenBtn: {
    alignItems: 'center',
    backgroundColor: '#B96534',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 16,
  },
  screenBtnInFlow: { marginTop: 16 },
  screenBtnDisabled: { opacity: 0.45 },
  screenBtnText: { ...font.bold, color: '#FFFFFF', fontSize: 15 },

  overlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    flex: 1,
    justifyContent: 'center',
  },
  overlayCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 20,
    gap: 12,
    paddingHorizontal: 32,
    paddingVertical: 36,
    width: 280,
  },
  overlayTitle: { ...font.bold, color: colors.text, fontSize: 16, textAlign: 'center' },
  overlayHint: { ...font.regular, color: colors.textMuted, fontSize: 13, textAlign: 'center' },
})

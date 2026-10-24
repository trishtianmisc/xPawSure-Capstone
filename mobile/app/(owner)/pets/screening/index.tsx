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
import { getItem, setItem } from '../../../../src/utils/storage'
import { usePets } from '../../../../features/pet/hooks/usePets'
import { useAIScreening } from '../../../../ai/hooks/useAIScreening'
import { prepareImageForInference } from '../../../../ai/services/imagePreprocess'
import { isReady, loadModel } from '../../../../ai/services/tensorflow.service'
import ScanGuideModal from '../../../../features/screening/components/ScanGuideModal'
import { SCAN_GUIDE_STORAGE_KEY } from '../../../../features/screening/constants/scanGuide'
import { createScreeningThumbnail } from '../../../../features/screening/services/screeningThumbnails'

interface SlotImage {
  original: string
  prepared: string
  thumbnail: string
}

export default function CaptureScreen() {
  const router = useRouter()
  const { colors, isDark } = useTheme()
  const { user } = useAuth()
  const { petId: petIdParam } = useLocalSearchParams<{ petId?: string }>()
  const { data: pets, isLoading: petsLoading } = usePets(user?.id)
  const { screenImages, isScreening, isModelLoading, modelError } = useAIScreening()
  const styles = useMemo(() => createStyles(colors), [colors])

  const [selectedPetId, setSelectedPetId] = useState<string | null>(null)
  const [imageUris, setImageUris] = useState<(SlotImage | null)[]>([null, null, null, null, null])
  const [activeIndex, setActiveIndex] = useState(0)
  const [pickerLoading, setPickerLoading] = useState(false)
  const [isModelPrepared, setIsModelPrepared] = useState(isReady())
  const [isGuideVisible, setIsGuideVisible] = useState(false)
  const guideHandledRef = useRef(false)

  const selectedPet = pets?.find((p) => p.id === selectedPetId)
  const isBusy = isScreening || isModelLoading
  const petsLoaded = pets !== undefined
  const hasPets = (pets?.length ?? 0) > 0
  const filledCount = imageUris.filter((uri) => uri !== null).length
  const allImagesCaptured = filledCount === imageUris.length
  const canRun = allImagesCaptured && !!selectedPet && !isBusy && isModelPrepared

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
      .catch(() => {})
      .finally(() => {
        if (mounted) setIsModelPrepared(true)
      })
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let mounted = true
    getItem(SCAN_GUIDE_STORAGE_KEY)
      .then((seen) => {
        if (mounted && !guideHandledRef.current && seen !== 'true') setIsGuideVisible(true)
      })
      .catch(() => {
        if (mounted && !guideHandledRef.current) setIsGuideVisible(true)
      })
    return () => {
      mounted = false
    }
  }, [])

  const handleCloseGuide = () => {
    guideHandledRef.current = true
    setIsGuideVisible(false)
    void setItem(SCAN_GUIDE_STORAGE_KEY, 'true').catch(() => {})
  }

  const setSlotImage = (original: string, prepared: string, thumbnail: string) => {
    setImageUris((prev) => {
      const next = [...prev]
      next[activeIndex] = { original, prepared, thumbnail }
      return next
    })
    const nextEmpty = imageUris.findIndex((existing, i) => existing === null && i !== activeIndex)
    if (nextEmpty !== -1) {
      setActiveIndex(nextEmpty)
    }
  }

  const handlePickGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) return

    setPickerLoading(true)
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        exif: false,
      })
      if (!result.canceled && result.assets[0]) {
        const original = result.assets[0].uri
        const prepared = await prepareImageForInference(original)
        const thumbnail = await createScreeningThumbnail(original)
        setSlotImage(original, prepared, thumbnail)
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
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        exif: false,
      })
      if (!result.canceled && result.assets[0]) {
        const original = result.assets[0].uri
        const prepared = await prepareImageForInference(original)
        const thumbnail = await createScreeningThumbnail(original)
        setSlotImage(original, prepared, thumbnail)
      }
    } finally {
      setPickerLoading(false)
    }
  }

  const handleRunScreening = async () => {
    if (!selectedPet || !allImagesCaptured) return
    const slots = imageUris.filter((slot): slot is SlotImage => slot !== null)
    const uris = slots.map((slot) => slot.prepared)

    try {
      const result = await screenImages(uris)
      const firstOkReport = result.imageReports?.find((r) => r.status === 'ok')
      const coverUri = firstOkReport?.uri ?? uris[0]
      const reportsJson = JSON.stringify(result.imageReports ?? [])
      const thumbnailUris = JSON.stringify(slots.map((slot) => slot.thumbnail))

      if (result.state === 'DISEASE_DETECTED') {
        router.push({
          pathname: '/(owner)/pets/screening/adjust',
          params: {
            imageUri: coverUri,
            petId: selectedPet.id,
            petName: selectedPet.name,
            predictions: JSON.stringify(result.predictions),
            modelVersion: result.modelVersion,
            inferenceTimeMs: String(result.inferenceTimeMs),
            imageReports: reportsJson,
            thumbnailUris,
          },
        })
        return
      }

      router.push({
        pathname: '/(owner)/pets/screening/result',
        params: {
          imageUri: coverUri,
          petId: selectedPet.id,
          petName: selectedPet.name,
          predictions: JSON.stringify(result.predictions),
          modelVersion: result.modelVersion,
          inferenceTimeMs: String(result.inferenceTimeMs),
          state: result.state,
          stateMessage: result.stateMessage,
          alreadySaved: 'false',
          imageReports: reportsJson,
          thumbnailUris,
        },
      })
    } catch {
      // error surfaced via hook state
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
        <Pressable
          accessibilityHint="Explains how to take the five screening photos"
          accessibilityLabel="Open photo guide"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => setIsGuideVisible(true)}
          style={styles.headerAction}
        >
          <MaterialCommunityIcons color={colors.text} name="help-circle-outline" size={22} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {modelError && (
          <View style={[styles.statusBanner, styles.statusBannerError]}>
            <MaterialCommunityIcons color={colors.error} name="alert-circle-outline" size={16} />
            <Text style={[styles.statusText, { color: colors.error }]}>{modelError}</Text>
          </View>
        )}

        {!isModelPrepared && !modelError && (
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
          <Text style={styles.slotHint}>
            Take 5 photos of the affected area from different angles
          </Text>
          <View style={styles.slotRow}>
            {imageUris.map((slot, i) => (
              <Pressable
                key={i}
                onPress={() => setActiveIndex(i)}
                style={[
                  styles.slot,
                  activeIndex === i && styles.slotActive,
                  slot && styles.slotFilled,
                ]}
              >
                {slot ? (
                  <Image source={{ uri: slot.original }} style={styles.slotImage} />
                ) : (
                  <MaterialCommunityIcons
                    color={activeIndex === i ? colors.primary : colors.textMuted}
                    name="camera-outline"
                    size={20}
                  />
                )}
                <View style={[styles.slotBadge, slot && styles.slotBadgeFilled]}>
                  <Text style={[styles.slotBadgeText, slot && styles.slotBadgeTextFilled]}>{i + 1}</Text>
                </View>
              </Pressable>
            ))}
          </View>
          <Text style={styles.slotProgress}>
            Photo {activeIndex + 1} of {imageUris.length} · {filledCount} captured
          </Text>
        </View>

        <View style={styles.sourceButtons}>
          <Pressable
            onPress={handleTakePhoto}
            disabled={pickerLoading || isBusy}
            style={[styles.sourceBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <MaterialCommunityIcons color={colors.primary} name="camera" size={20} />
            <Text style={[styles.sourceBtnText, { color: colors.text }]}>Take Photo</Text>
          </Pressable>
          <Pressable
            onPress={handlePickGallery}
            disabled={pickerLoading || isBusy}
            style={[styles.sourceBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <MaterialCommunityIcons color={colors.primary} name="image-multiple" size={20} />
            <Text style={[styles.sourceBtnText, { color: colors.text }]}>Gallery</Text>
          </Pressable>
        </View>

        {pickerLoading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.primary} size="small" />
            <Text style={styles.loadingText}>Optimizing photo...</Text>
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
            <Text style={styles.tipsText}>Avoid blurry images for better analysis</Text>
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
                {isModelLoading ? 'Preparing AI model...' : 'Analyzing 5 photos...'}
              </Text>
            </>
          ) : !isModelPrepared ? (
            <>
              <ActivityIndicator color="#FFF" size="small" />
              <Text style={styles.screenBtnText}>Preparing AI model...</Text>
            </>
          ) : (
            <>
              <MaterialCommunityIcons color="#FFF" name="magnify" size={18} />
              <Text style={styles.screenBtnText}>
                {allImagesCaptured ? 'Run Screening' : `Capture ${filledCount}/5 Photos`}
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
              {isModelLoading ? 'Preparing AI model...' : 'Analyzing 5 photos...'}
            </Text>
            <Text style={styles.overlayHint}>
              {isModelLoading
                ? 'First-time loading may take up to a minute'
                : 'Quality checks and AI analysis — usually a few seconds'}
            </Text>
          </View>
        </View>
      </Modal>

      <ScanGuideModal onClose={handleCloseGuide} visible={isGuideVisible} />
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
  headerAction: {
    alignItems: 'center',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },

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

  imageSection: { marginBottom: 20 },
  slotHint: { color: colors.textMuted, fontSize: 13, lineHeight: 18, marginBottom: 12 },
  slotRow: { flexDirection: 'row', gap: 8 },
  slot: {
    alignItems: 'center',
    aspectRatio: 1,
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.borderLight,
    borderRadius: 14,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    flex: 1,
    justifyContent: 'center',
    overflow: 'visible',
  },
  slotActive: { borderColor: colors.primary, borderStyle: 'solid' },
  slotFilled: { borderStyle: 'solid', padding: 0 },
  slotImage: { borderRadius: 12, height: '100%', width: '100%' },
  slotBadge: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.borderLight,
    borderRadius: 9,
    borderWidth: 1,
    height: 18,
    justifyContent: 'center',
    position: 'absolute',
    right: -5,
    top: -5,
    width: 18,
  },
  slotBadgeFilled: { backgroundColor: colors.primary, borderColor: colors.primary },
  slotBadgeText: { color: colors.textMuted, fontSize: 10, fontWeight: '800' },
  slotBadgeTextFilled: { color: '#FFFFFF' },
  slotProgress: { color: colors.textMuted, fontSize: 12, fontWeight: '600', marginTop: 14 },

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
  statusText: { ...font.semibold, color: colors.primary, fontSize: 13 },

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

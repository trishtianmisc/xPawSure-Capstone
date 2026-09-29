import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
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
import { usePets } from '../../../../features/pet/hooks/usePets'
import { useAIScreening } from '../../../../ai/hooks/useAIScreening'

export default function CaptureScreen() {
  const router = useRouter()
  const { colors, isDark } = useTheme()
  const { user } = useAuth()
  const { data: pets } = usePets(user?.id)
  const { screenImage, isScreening, isModelLoading, modelError } = useAIScreening()
  const styles = useMemo(() => createStyles(colors), [colors])

  const [selectedPetId, setSelectedPetId] = useState<string | null>(null)
  const [imageUri, setImageUri] = useState<string | null>(null)
  const [pickerLoading, setPickerLoading] = useState(false)

  const selectedPet = pets?.find((p) => p.id === selectedPetId)
  const isBusy = isScreening || isModelLoading

  useEffect(() => {
    if (pets && pets.length === 1 && !selectedPetId) {
      setSelectedPetId(pets[0].id)
    }
  }, [pets, selectedPetId])

  const handlePickGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) return

    setPickerLoading(true)
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      })
      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri)
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
        quality: 0.85,
      })
      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri)
      }
    } finally {
      setPickerLoading(false)
    }
  }

  const handleRunScreening = async () => {
    if (!imageUri) return

    try {
      const result = await screenImage(imageUri)
      router.push({
        pathname: '/(owner)/pets/screening/result',
        params: {
          imageUri,
          petId: selectedPet?.id ?? 'unknown',
          petName: selectedPet?.name ?? 'Unknown Pet',
          predictions: JSON.stringify(result.predictions),
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
        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {modelError && (
          <View style={[styles.statusBanner, styles.statusBannerError]}>
            <MaterialCommunityIcons color={colors.error} name="alert-circle-outline" size={16} />
            <Text style={[styles.statusText, { color: colors.error }]}>{modelError}</Text>
          </View>
        )}

        {pets && pets.length > 1 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>SELECT PET</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.petPills}>
              {pets.map((pet) => {
                const active = pet.id === selectedPetId
                return (
                  <Pressable
                    key={pet.id}
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
                  </Pressable>
                )
              })}
            </ScrollView>
          </View>
        )}

        <View style={styles.imageSection}>
          {imageUri ? (
            <View style={styles.previewContainer}>
              <Image source={{ uri: imageUri }} style={styles.previewImage} />
              <Pressable onPress={() => setImageUri(null)} style={styles.removeBtn}>
                <MaterialCommunityIcons color="#FFF" name="close" size={16} />
              </Pressable>
            </View>
          ) : (
            <View style={styles.placeholder}>
              <View style={styles.placeholderIcon}>
                <MaterialCommunityIcons color={colors.primary} name="dog" size={40} />
              </View>
              <Text style={styles.placeholderTitle}>Upload a skin photo</Text>
              <Text style={styles.placeholderHint}>
                Take a photo or choose from gallery{'\n'}for AI-powered analysis
              </Text>
            </View>
          )}
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
            <Text style={styles.loadingText}>Loading image...</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.bottomBar}>
        <Pressable
          onPress={handleRunScreening}
          disabled={!imageUri || isBusy}
          style={[styles.screenBtn, (!imageUri || isBusy) && styles.screenBtnDisabled]}
        >
          {isBusy ? (
            <>
              <ActivityIndicator color="#FFF" size="small" />
              <Text style={styles.screenBtnText}>
                {isModelLoading ? 'Loading model...' : 'Analyzing...'}
              </Text>
            </>
          ) : (
            <>
              <MaterialCommunityIcons color="#FFF" name="face-man-profile" size={18} />
              <Text style={styles.screenBtnText}>Run Screening</Text>
            </>
          )}
        </Pressable>
      </View>

      <Modal visible={isBusy} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.overlay}>
          <View style={styles.overlayCard}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.overlayTitle}>
              {isModelLoading ? 'Preparing AI model...' : 'Analyzing image...'}
            </Text>
            <Text style={styles.overlayHint}>
              {isModelLoading
                ? 'First-time loading may take up to a minute'
                : 'This usually takes a few seconds'}
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
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    height: 48,
    paddingHorizontal: 4,
  },
  headerBack: { alignItems: 'center', height: 48, justifyContent: 'center', width: 48 },
  headerTitle: { color: colors.text, flex: 1, fontSize: 17, fontWeight: '700', textAlign: 'center' },
  headerRight: { width: 48 },

  content: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 120 },

  section: { marginBottom: 20 },
  sectionLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '600', letterSpacing: 0.5, marginBottom: 10 },
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
  petPillName: { color: colors.text, fontSize: 13, fontWeight: '600', maxWidth: 100 },
  petPillNameActive: { color: '#FFFFFF' },

  imageSection: { marginBottom: 20 },
  placeholder: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.borderLight,
    borderRadius: 20,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    gap: 8,
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  placeholderIcon: {
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: 32,
    height: 72,
    justifyContent: 'center',
    marginBottom: 4,
    width: 72,
  },
  placeholderTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  placeholderHint: { color: colors.textMuted, fontSize: 13, lineHeight: 18, textAlign: 'center' },

  previewContainer: { alignItems: 'center', position: 'relative' },
  previewImage: { borderRadius: 20, height: 280, width: '100%' },
  removeBtn: {
    alignItems: 'center',
    backgroundColor: colors.error,
    borderRadius: 14,
    bottom: 12,
    elevation: 4,
    height: 28,
    justifyContent: 'center',
    position: 'absolute',
    right: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    width: 28,
  },

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
  sourceBtnText: { fontSize: 14, fontWeight: '600' },

  loadingRow: { alignItems: 'center', flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 16 },
  loadingText: { color: colors.textSecondary, fontSize: 13 },

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
  statusText: { color: colors.primary, fontSize: 13, fontWeight: '600' },

  bottomBar: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    bottom: 0,
    left: 0,
    paddingHorizontal: 24,
    paddingVertical: 16,
    position: 'absolute',
    right: 0,
  },
  screenBtn: {
    alignItems: 'center',
    backgroundColor: '#B96534',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 16,
  },
  screenBtnDisabled: { opacity: 0.45 },
  screenBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },

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
  overlayTitle: { color: colors.text, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  overlayHint: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
})

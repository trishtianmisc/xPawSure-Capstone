import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'expo-router'
import { useEffect, useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'

import { PhotoPicker } from '../../../features/pet/components/PhotoPicker'
import { useSaveVetProfile } from '../../../features/vet/hooks/useSaveVetProfile'
import { useVetProfile } from '../../../features/vet/hooks/useVetProfile'
import { formatPosition } from '../../../features/vet/lib/format'
import { vetProfileSchema, type VetProfileFormValues } from '../../../features/vet/schemas/profile'
import { useAuth } from '../../../src/context/AuthContext'
import { useTheme, type AppColors } from '../../../src/context/ThemeContext'
import { apiErrorMessage } from '../../../src/utils/error'
import { font } from '../../../src/theme/typography'

export default function EditVetProfileScreen() {
  const router = useRouter()
  const { colors } = useTheme()
  const { user, refreshUser } = useAuth()
  const { data: profile } = useVetProfile()
  const saveProfile = useSaveVetProfile()

  const { control, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<VetProfileFormValues>({
    resolver: zodResolver(vetProfileSchema),
    defaultValues: {
      first_name: user?.first_name ?? '',
      last_name: user?.last_name ?? '',
      phone: '',
      profile_picture: undefined,
    },
  })

  const styles = useMemo(() => createStyles(colors), [colors])
  const watchedProfilePicture = watch('profile_picture')

  useEffect(() => {
    if (profile) {
      reset({
        first_name: profile.first_name ?? user?.first_name ?? '',
        last_name: profile.last_name ?? user?.last_name ?? '',
        phone: profile.phone ?? '',
        profile_picture: profile.profile_picture || undefined,
      })
    }
  }, [profile, user, reset])

  const onSubmit = async (data: VetProfileFormValues) => {
    const initialPicture = profile?.profile_picture || undefined
    const profilePicture = data.profile_picture !== initialPicture
      ? data.profile_picture ?? null
      : undefined

    saveProfile.mutate(
      {
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone ?? '',
        profile_picture: profilePicture,
      },
      {
        onSuccess: async () => {
          await refreshUser()
          router.back()
        },
      },
    )
  }

  const readOnlyFields: { label: string; value: string }[] = [
    { label: 'Email Address', value: profile?.email ?? user?.email ?? '' },
    { label: 'Associated Clinic', value: profile?.clinic_name ?? user?.clinic_name ?? '' },
    { label: 'Position', value: formatPosition(profile?.position ?? user?.position) },
    { label: 'License Number', value: profile?.license_number ?? user?.license_number ?? '' },
    { label: 'License Expiration Date', value: profile?.license_expiration_date ?? user?.license_expiration_date ?? '' },
  ]

  return (
    <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', default: undefined })} style={[styles.flex, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => router.back()}
            style={styles.headerBack}
          >
            <Ionicons color={colors.text} name="arrow-back" size={22} />
          </Pressable>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <Text style={styles.headerHint}>Keep your contact details up to date</Text>
        </View>

        <View style={styles.section}>
          <PhotoPicker
            icon="account"
            onChange={(uri) => setValue('profile_picture', uri, { shouldDirty: true })}
            title="Add Profile Photo"
            value={watchedProfilePicture}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>

          <Text style={styles.label}>First Name *</Text>
          <Controller
            control={control}
            name="first_name"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                autoCapitalize="words"
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder="First name"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, errors.first_name && styles.inputError]}
                value={value}
              />
            )}
          />
          {errors.first_name && <Text style={styles.fieldError}>{errors.first_name.message}</Text>}

          <Text style={styles.label}>Last Name *</Text>
          <Controller
            control={control}
            name="last_name"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                autoCapitalize="words"
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder="Last name"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, errors.last_name && styles.inputError]}
                value={value}
              />
            )}
          />
          {errors.last_name && <Text style={styles.fieldError}>{errors.last_name.message}</Text>}

          <Text style={styles.label}>Phone</Text>
          <Controller
            control={control}
            name="phone"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                keyboardType="phone-pad"
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder="Phone number"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, errors.phone && styles.inputError]}
                value={value ?? ''}
              />
            )}
          />
          {errors.phone && <Text style={styles.fieldError}>{errors.phone.message}</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Clinic Details</Text>
          <Text style={styles.sectionHint}>Managed by your clinic admin</Text>

          {readOnlyFields.map((field) => (
            <View key={field.label}>
              <Text style={styles.label}>{field.label}</Text>
              <TextInput
                editable={false}
                placeholder="N/A"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, styles.inputDisabled]}
                value={field.value}
              />
            </View>
          ))}
        </View>

        <Pressable
          disabled={saveProfile.isPending}
          onPress={handleSubmit(onSubmit)}
          style={[styles.submitButton, saveProfile.isPending && styles.submitDisabled]}
        >
          {saveProfile.isPending ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.submitText}>Save Changes</Text>
          )}
        </Pressable>

        {saveProfile.isError && (
          <View style={styles.apiErrorWrap}>
            <Text style={styles.apiErrorIcon}>!</Text>
            <Text style={styles.apiErrorText}>{apiErrorMessage(saveProfile.error)}</Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingTop: 20, paddingBottom: 48 },
  section: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginHorizontal: 15,
    marginTop: 30,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  header: { height: 30, marginHorizontal: 10, marginBottom: 8, marginTop: -10 },
  headerBack: {
    alignItems: 'center',
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  headerTitle: { ...font.extrabold, color: colors.text, fontSize: 20, marginTop: -45, marginLeft: 60 },
  headerHint: { ...font.regular, color: colors.textSecondary, fontSize: 12, marginTop: -3, marginLeft: 60 },
  sectionTitle: { ...font.bold, color: colors.text, fontSize: 17, marginBottom: 4 },
  sectionHint: { ...font.regular, color: colors.textMuted, fontSize: 11, marginBottom: 4, marginTop: -6 },
  label: { ...font.semibold, color: colors.text, fontSize: 13, marginBottom: 6, marginTop: 10 },
  input: {
    ...font.regular,
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.text,
    fontSize: 15,
    height: 50,
    paddingHorizontal: 16,
  },
  inputDisabled: { backgroundColor: colors.surfaceAlt, opacity: 0.7 },
  inputError: { borderColor: colors.error },
  fieldError: { ...font.regular, color: colors.error, fontSize: 12, marginTop: 4 },
  submitButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 16,
    flexDirection: 'row',
    height: 56,
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 28,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    gap: 8,
  },
  submitDisabled: { opacity: 0.6 },
  submitText: { ...font.extrabold, color: '#FFFFFF', fontSize: 17 },
  apiErrorWrap: {
    alignItems: 'center',
    backgroundColor: colors.errorBg,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 20,
    marginTop: 16,
    padding: 14,
  },
  apiErrorIcon: {
    ...font.extrabold,
    backgroundColor: colors.error,
    borderRadius: 12,
    color: '#FFFFFF',
    fontSize: 14,
    height: 24,
    overflow: 'hidden',
    textAlign: 'center',
    width: 24,
    lineHeight: 24,
  },
  apiErrorText: { ...font.regular, color: colors.error, flex: 1, fontSize: 13 },
})

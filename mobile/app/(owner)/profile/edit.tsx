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

import { PhotoPicker } from '../../../features/pet/components/PhotoPicker'
import { useOwnerProfile } from '../../../features/profile/hooks/useOwnerProfile'
import { useSaveProfile } from '../../../features/profile/hooks/useSaveProfile'
import { profileSchema, type ProfileFormValues } from '../../../features/profile/schemas/profile'
import { useAuth } from '../../../src/context/AuthContext'
import { useTheme, type AppColors } from '../../../src/context/ThemeContext'
import { apiErrorMessage } from '../../../src/utils/error'

export default function EditProfileScreen() {
  const router = useRouter()
  const { colors } = useTheme()
  const { user, refreshUser } = useAuth()
  const { data: profile } = useOwnerProfile()
  const saveProfile = useSaveProfile()

  const { control, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: user?.first_name ?? '',
      last_name: user?.last_name ?? '',
      phone: '',
      address: '',
      profile_picture: undefined,
    },
  })

  const styles = useMemo(() => createStyles(colors), [colors])
  const watchProfilePicture = watch('profile_picture')

  useEffect(() => {
    if (profile) {
      reset({
        first_name: user?.first_name ?? '',
        last_name: user?.last_name ?? '',
        phone: profile.user.phone ?? '',
        address: profile.address ?? '',
        profile_picture: profile.profile_picture || undefined,
      })
    }
  }, [profile, user, reset])

  const onSubmit = async (data: ProfileFormValues) => {
    const initialPicture = profile?.profile_picture || undefined
    let profilePicture: string | null | undefined
    if (data.profile_picture !== initialPicture) {
      profilePicture = data.profile_picture ?? null
    }

    saveProfile.mutate(
      {
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone ?? '',
        address: data.address ?? '',
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

  return (
    <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', default: undefined })} style={[styles.flex, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Edit Profile</Text>
          <Text style={styles.sectionHint}>Keep your contact details up to date</Text>

          <PhotoPicker
            icon="account"
            title="Add Profile Photo"
            value={watchProfilePicture}
            onChange={(uri) => setValue('profile_picture', uri, { shouldDirty: true })}
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
          <Text style={styles.sectionTitle}>Address</Text>

          <Controller
            control={control}
            name="address"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                autoCapitalize="sentences"
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder="Street, city, postal code"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, styles.inputMultiline, errors.address && styles.inputError]}
                value={value ?? ''}
              />
            )}
          />
          {errors.address && <Text style={styles.fieldError}>{errors.address.message}</Text>}
        </View>

        <Pressable
          disabled={saveProfile.isPending || !profile}
          onPress={handleSubmit(onSubmit)}
          style={[styles.submitButton, (saveProfile.isPending || !profile) && styles.submitDisabled]}
        >
          {saveProfile.isPending ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Text style={styles.submitText}>Save Changes</Text>
              <Text style={styles.submitArrow}>→</Text>
            </>
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
    marginHorizontal: 20,
    marginTop: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '700', marginBottom: 4 },
  sectionHint: { color: colors.textMuted, fontSize: 12, marginBottom: 12, marginTop: -2 },
  label: { color: colors.text, fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 16 },
  input: {
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.text,
    fontSize: 15,
    height: 50,
    paddingHorizontal: 16,
  },
  inputMultiline: { height: 90, paddingTop: 14, textAlignVertical: 'top' },
  inputError: { borderColor: colors.error },
  fieldError: { color: colors.error, fontSize: 12, marginTop: 4 },
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
  submitText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  submitArrow: { color: '#FFFFFF', fontSize: 20, fontWeight: '600', marginTop: -2 },
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
    backgroundColor: colors.error,
    borderRadius: 12,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    height: 24,
    overflow: 'hidden',
    textAlign: 'center',
    width: 24,
    lineHeight: 24,
  },
  apiErrorText: { color: colors.error, flex: 1, fontSize: 13 },
})

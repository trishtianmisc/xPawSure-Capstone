import { zodResolver } from '@hookform/resolvers/zod'
import { useLocalSearchParams, useRouter } from 'expo-router'
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

import { useAuth } from '../../../src/context/AuthContext'
import { useTheme, type AppColors } from '../../../src/context/ThemeContext'
import { apiErrorMessage } from '../../../src/utils/error'
import { BreedPicker } from '../components/BreedPicker'
import { PhotoPicker } from '../components/PhotoPicker'
import { usePet } from '../hooks/usePet'
import { useUpdatePet } from '../hooks/useUpdatePet'
import { petSchema, type PetFormValues } from '../schemas/pet'

export default function EditPetScreen() {
  const router = useRouter()
  const { colors } = useTheme()
  const { user } = useAuth()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data: pet, isLoading, isError, error } = usePet(id)
  const updatePet = useUpdatePet(user?.id ?? '')

  const { control, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<PetFormValues>({
    resolver: zodResolver(petSchema),
    defaultValues: {
      name: '',
      breed_id: '',
      sex: undefined,
      date_of_birth: '',
      weight: '',
      color: '',
      microchip_number: '',
      profile_picture: undefined,
    },
  })

  useEffect(() => {
    if (pet) {
      reset({
        name: pet.name,
        breed_id: pet.breed_id,
        sex: pet.sex === 'MALE' || pet.sex === 'FEMALE' ? pet.sex : undefined,
        date_of_birth: pet.date_of_birth ?? '',
        weight: pet.weight ?? '',
        color: pet.color ?? '',
        microchip_number: pet.microchip_number ?? '',
        profile_picture: undefined,
      })
    }
  }, [pet, reset])

  const styles = useMemo(() => createStyles(colors), [colors])

  const watchSex = watch('sex')
  const watchProfilePicture = watch('profile_picture')

  const onSubmit = async (data: PetFormValues) => {
    updatePet.mutate({ id, payload: data }, {
      onSuccess: () => {
        router.back()
      },
    })
  }

  if (isLoading) {
    return (
      <View style={[styles.flex, styles.loadingContainer, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.loadingText}>Loading pet details...</Text>
      </View>
    )
  }

  if (isError || !pet) {
    return (
      <View style={[styles.flex, styles.loadingContainer, { backgroundColor: colors.bg }]}>
        <Text style={styles.errorText}>
          {(error as Error)?.message || 'Unable to load this pet.'}
        </Text>
        <Pressable onPress={() => router.back()} style={styles.errorBackButton}>
          <Text style={styles.errorBackButtonText}>Go Back</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', default: undefined })} style={[styles.flex, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Edit {pet.name}</Text>
          <Text style={styles.sectionHint}>Update your pet's information</Text>

          <PhotoPicker
            value={watchProfilePicture}
            onChange={(uri) => setValue('profile_picture', uri, { shouldDirty: true })}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>

          <Text style={styles.label}>Pet Name *</Text>
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                autoCapitalize="words"
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder="What's your pet's name?"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, errors.name && styles.inputError]}
                value={value}
              />
            )}
          />
          {errors.name && <Text style={styles.fieldError}>{errors.name.message}</Text>}

          <Text style={styles.label}>Breed *</Text>
          <Controller
            control={control}
            name="breed_id"
            render={({ field: { value, onChange } }) => (
              <BreedPicker
                value={value}
                onSelect={(id) => onChange(id, { shouldDirty: true })}
              />
            )}
          />
          {errors.breed_id && <Text style={styles.fieldError}>{errors.breed_id.message}</Text>}

          <Text style={styles.label}>Sex *</Text>
          <Controller
            control={control}
            name="sex"
            render={({ field: { value, onChange } }) => (
              <View style={styles.sexRow}>
                <Pressable
                  onPress={() => onChange('MALE')}
                  style={[styles.sexOption, value === 'MALE' && styles.sexOptionActive]}
                >
                  <View style={[styles.sexIcon, { backgroundColor: colors.primaryLight }]}>
                    <Text style={[styles.sexIconText, value === 'MALE' && { color: colors.primary }]}>♂</Text>
                  </View>
                  <Text style={[styles.sexLabel, value === 'MALE' && styles.sexLabelActive]}>Male</Text>
                </Pressable>
                <Pressable
                  onPress={() => onChange('FEMALE')}
                  style={[styles.sexOption, value === 'FEMALE' && styles.sexOptionActive]}
                >
                  <View style={[styles.sexIcon, { backgroundColor: colors.primaryLight }]}>
                    <Text style={[styles.sexIconText, value === 'FEMALE' && { color: colors.primary }]}>♀</Text>
                  </View>
                  <Text style={[styles.sexLabel, value === 'FEMALE' && styles.sexLabelActive]}>Female</Text>
                </Pressable>
              </View>
            )}
          />
          {errors.sex && <Text style={styles.fieldError}>{errors.sex.message}</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>

          <Text style={styles.label}>Birth Date</Text>
          <Controller
            control={control}
            name="date_of_birth"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                value={value}
              />
            )}
          />

          <Text style={styles.label}>Weight (kg)</Text>
          <Controller
            control={control}
            name="weight"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                keyboardType="decimal-pad"
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder="e.g. 12.5"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, errors.weight && styles.inputError]}
                value={value}
              />
            )}
          />
          {errors.weight && <Text style={styles.fieldError}>{errors.weight.message}</Text>}

          <Text style={styles.label}>Color</Text>
          <Controller
            control={control}
            name="color"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                autoCapitalize="words"
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder="e.g. Golden, Black & White"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                value={value}
              />
            )}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Identification</Text>
          <Text style={styles.sectionHint}>Optional but recommended</Text>

          <Text style={styles.label}>Microchip Number</Text>
          <Controller
            control={control}
            name="microchip_number"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                autoCapitalize="characters"
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder="e.g. 985112003456789"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                value={value}
              />
            )}
          />
        </View>

        <Pressable
          disabled={updatePet.isPending}
          onPress={handleSubmit(onSubmit)}
          style={[styles.submitButton, updatePet.isPending && styles.submitDisabled]}
        >
          {updatePet.isPending ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Text style={styles.submitText}>Save Changes</Text>
              <Text style={styles.submitArrow}>→</Text>
            </>
          )}
        </Pressable>

        {updatePet.isError && (
          <View style={styles.apiErrorWrap}>
            <Text style={styles.apiErrorIcon}>!</Text>
            <Text style={styles.apiErrorText}>{apiErrorMessage(updatePet.error)}</Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingTop: 20, paddingBottom: 48 },
  loadingContainer: {
    alignItems: 'center',
    gap: 12,
    justifyContent: 'center',
  },
  loadingText: { color: colors.textSecondary, fontSize: 15 },
  errorText: { color: colors.textSecondary, fontSize: 15, textAlign: 'center' },
  errorBackButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 44,
    justifyContent: 'center',
    marginTop: 16,
    paddingHorizontal: 24,
  },
  errorBackButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
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
  inputError: { borderColor: colors.error },
  fieldError: { color: colors.error, fontSize: 12, marginTop: 4 },
  sexRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  sexOption: {
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1.5,
    flex: 1,
    flexDirection: 'row',
    gap: 10,
    height: 54,
    paddingHorizontal: 16,
  },
  sexOptionActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  sexIcon: { borderRadius: 18, height: 36, justifyContent: 'center', width: 36, alignItems: 'center' },
  sexIconText: { fontSize: 18, color: colors.textMuted },
  sexLabel: { color: colors.textSecondary, fontSize: 15, fontWeight: '600' },
  sexLabelActive: { color: colors.primary },
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

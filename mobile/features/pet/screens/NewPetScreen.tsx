import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'expo-router'
import { useMemo } from 'react'
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

import { useTheme, type AppColors } from '../../../src/context/ThemeContext'
import { BreedPicker } from '../components/BreedPicker'
import { PhotoPicker } from '../components/PhotoPicker'
import { useCreatePet } from '../hooks/useCreatePet'
import { petSchema, type PetFormValues } from '../schemas/pet'

export default function NewPetScreen() {
  const router = useRouter()
  const { colors } = useTheme()
  const createPet = useCreatePet()

  const { control, handleSubmit, setValue, watch, formState: { errors } } = useForm<PetFormValues>({
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

  const styles = useMemo(() => createStyles(colors), [colors])

  const watchSex = watch('sex')
  const watchProfilePicture = watch('profile_picture')

  const onSubmit = async (data: PetFormValues) => {
    createPet.mutate(data, {
      onSuccess: () => {
        router.back()
      },
    })
  }

  return (
    <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', default: undefined })} style={styles.flex}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          <PhotoPicker
            value={watchProfilePicture}
            onChange={(uri) => setValue('profile_picture', uri)}
          />

          <Text style={styles.label}>Pet Name *</Text>
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                autoCapitalize="words"
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder="Enter pet name"
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
              <BreedPicker value={value} onSelect={(id) => onChange(id)} />
            )}
          />
          {errors.breed_id && <Text style={styles.fieldError}>{errors.breed_id.message}</Text>}

          <Text style={styles.label}>Sex *</Text>
          <View style={styles.sexRow}>
            <Pressable
              onPress={() => setValue('sex', 'MALE', { shouldValidate: true })}
              style={[styles.sexOption, watchSex === 'MALE' && { backgroundColor: colors.primary, borderColor: colors.primary }]}
            >
              <Text style={[styles.sexText, watchSex === 'MALE' && { color: colors.inverse }]}>Male</Text>
            </Pressable>
            <Pressable
              onPress={() => setValue('sex', 'FEMALE', { shouldValidate: true })}
              style={[styles.sexOption, watchSex === 'FEMALE' && { backgroundColor: colors.primary, borderColor: colors.primary }]}
            >
              <Text style={[styles.sexText, watchSex === 'FEMALE' && { color: colors.inverse }]}>Female</Text>
            </Pressable>
          </View>
          {errors.sex && <Text style={styles.fieldError}>{errors.sex.message}</Text>}

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

          <Text style={styles.label}>Microchip Number</Text>
          <Controller
            control={control}
            name="microchip_number"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                autoCapitalize="characters"
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder="Optional"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                value={value}
              />
            )}
          />

          <Pressable
            disabled={createPet.isPending}
            onPress={handleSubmit(onSubmit)}
            style={[styles.submitButton, createPet.isPending && styles.submitDisabled]}
          >
            {createPet.isPending ? (
              <ActivityIndicator color={colors.inverse} size="small" />
            ) : (
              <Text style={styles.submitText}>Register Pet</Text>
            )}
          </Pressable>

          {createPet.isError && (
            <Text style={styles.apiError}>{createPet.error.message}</Text>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: 24, paddingBottom: 48 },
  form: { width: '100%' },
  label: { color: colors.text, fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 16 },
  input: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 10, borderWidth: 1, color: colors.text, fontSize: 15, height: 48, paddingHorizontal: 14 },
  inputError: { borderColor: colors.error },
  fieldError: { color: colors.error, fontSize: 12, marginTop: 4 },
  sexRow: { flexDirection: 'row', gap: 12 },
  sexOption: { alignItems: 'center', borderColor: colors.border, borderRadius: 10, borderWidth: 1, flex: 1, height: 48, justifyContent: 'center' },
  sexText: { color: colors.textSecondary, fontSize: 15, fontWeight: '600' },
  submitButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 12, height: 52, justifyContent: 'center', marginTop: 32 },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: colors.inverse, fontSize: 16, fontWeight: '800' },
  apiError: { color: colors.error, fontSize: 13, marginTop: 12, textAlign: 'center' },
})

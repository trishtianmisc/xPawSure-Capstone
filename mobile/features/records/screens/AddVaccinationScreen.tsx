import { zodResolver } from '@hookform/resolvers/zod'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'

import { useAuth } from '../../../src/context/AuthContext'
import { useTheme, type AppColors } from '../../../src/context/ThemeContext'
import { apiErrorMessage } from '../../../src/utils/error'
import { usePets } from '../../pet/hooks/usePets'
import { VaccinationForm } from '../components/VaccinationForm'
import { useCreateVaccination } from '../hooks/useCreateVaccination'
import {
  localToday,
  toVaccinationPayload,
  vaccinationSchema,
  type VaccinationFormValues,
} from '../schemas/vaccination'

export default function AddVaccinationScreen() {
  const router = useRouter()
  const { colors } = useTheme()
  const { user } = useAuth()
  const params = useLocalSearchParams<{ petId?: string }>()
  const pets = usePets(user?.id ?? undefined)
  const createVaccination = useCreateVaccination()

  const petOptions = useMemo(
    () => (pets.data ?? []).map((pet) => ({ id: pet.id, name: pet.name })),
    [pets.data],
  )

  const form = useForm<VaccinationFormValues>({
    resolver: zodResolver(vaccinationSchema),
    defaultValues: {
      pet_id: typeof params.petId === 'string' ? params.petId : '',
      name: '',
      brand: '',
      batch_no: '',
      dose: '',
      route: 'SUBCUTANEOUS',
      date_given: localToday(),
      next_due: '',
      notes: '',
    },
  })

  const selectedPetId = form.watch('pet_id')

  useEffect(() => {
    if (!selectedPetId && petOptions.length > 0) {
      form.setValue('pet_id', petOptions[0].id)
    }
  }, [selectedPetId, petOptions, form])

  const styles = useMemo(() => createStyles(colors), [colors])

  const onSubmit = (values: VaccinationFormValues) => {
    createVaccination.mutate(toVaccinationPayload(values), {
      onSuccess: () => {
        router.back()
      },
    })
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: 'padding', default: undefined })}
      style={[styles.flex, { backgroundColor: colors.bg }]}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerSection}>
          <Text style={styles.headerTitle}>Record Vaccination</Text>
          <Text style={styles.headerHint}>
            Log a vaccine your pet received — it becomes part of their health record.
          </Text>
          {pets.isLoading ? <ActivityIndicator color={colors.primary} style={styles.petsLoader} /> : null}
        </View>

        <VaccinationForm
          errorMessage={createVaccination.isError ? apiErrorMessage(createVaccination.error) : null}
          form={form}
          isPending={createVaccination.isPending}
          onSubmit={form.handleSubmit(onSubmit)}
          pets={petOptions}
          submitLabel="Save Record"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingTop: 20, paddingBottom: 48 },
  headerSection: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginHorizontal: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  headerTitle: { color: colors.text, fontSize: 19, fontWeight: '800' },
  headerHint: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginTop: 6 },
  petsLoader: { marginTop: 12 },
})

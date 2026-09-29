import { zodResolver } from '@hookform/resolvers/zod'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'

import { useTheme, type AppColors } from '../../../src/context/ThemeContext'
import { apiErrorMessage } from '../../../src/utils/error'
import { VaccinationForm } from '../components/VaccinationForm'
import { useUpdateVaccination } from '../hooks/useUpdateVaccination'
import { useVaccination } from '../hooks/useVaccination'
import {
  toVaccinationPayload,
  vaccinationSchema,
  type VaccinationFormValues,
} from '../schemas/vaccination'

export default function EditVaccinationScreen() {
  const router = useRouter()
  const { colors } = useTheme()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data: record, isLoading, isError, error } = useVaccination(id)
  const updateVaccination = useUpdateVaccination(id)

  const form = useForm<VaccinationFormValues>({
    resolver: zodResolver(vaccinationSchema),
    defaultValues: {
      pet_id: '',
      name: '',
      brand: '',
      batch_no: '',
      dose: '',
      route: 'SUBCUTANEOUS',
      date_given: '',
      next_due: '',
      notes: '',
    },
  })

  useEffect(() => {
    if (record) {
      form.reset({
        pet_id: record.pet_id,
        name: record.name,
        brand: record.brand ?? '',
        batch_no: record.batch_no ?? '',
        dose: record.dose,
        route: record.route as VaccinationFormValues['route'],
        date_given: record.date_given,
        next_due: record.next_due ?? '',
        notes: record.notes ?? '',
      })
    }
  }, [record, form])

  const styles = useMemo(() => createStyles(colors), [colors])

  const onSubmit = (values: VaccinationFormValues) => {
    updateVaccination.mutate(toVaccinationPayload(values), {
      onSuccess: () => {
        router.back()
      },
    })
  }

  if (isLoading) {
    return (
      <View style={[styles.flex, styles.stateContainer, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.stateText}>Loading vaccination record...</Text>
      </View>
    )
  }

  if (isError || !record) {
    return (
      <View style={[styles.flex, styles.stateContainer, { backgroundColor: colors.bg }]}>
        <Text style={styles.stateText}>
          {(error as Error)?.message || 'Unable to load this vaccination record.'}
        </Text>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    )
  }

  if (record.source !== 'OWNER') {
    return (
      <View style={[styles.flex, styles.stateContainer, { backgroundColor: colors.bg }]}>
        <Text style={styles.readOnlyTitle}>Read-only record</Text>
        <Text style={styles.stateText}>
          This vaccination was recorded by a veterinarian and cannot be edited.
        </Text>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    )
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
          <Text style={styles.headerTitle}>Edit {record.name}</Text>
          <Text style={styles.headerHint}>Update your self-reported vaccination record.</Text>
        </View>

        <VaccinationForm
          errorMessage={updateVaccination.isError ? apiErrorMessage(updateVaccination.error) : null}
          form={form}
          isPending={updateVaccination.isPending}
          onSubmit={form.handleSubmit(onSubmit)}
          petLocked
          submitLabel="Save Changes"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingTop: 20, paddingBottom: 48 },
  stateContainer: {
    alignItems: 'center',
    gap: 12,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  stateText: { color: colors.textSecondary, fontSize: 15, textAlign: 'center' },
  readOnlyTitle: { color: colors.text, fontSize: 20, fontWeight: '700' },
  backButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 44,
    justifyContent: 'center',
    marginTop: 8,
    paddingHorizontal: 24,
  },
  backButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
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
})

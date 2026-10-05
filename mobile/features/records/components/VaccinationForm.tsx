import { useMemo } from 'react'
import { Controller, type UseFormReturn } from 'react-hook-form'
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'

import { useTheme, type AppColors } from '../../../src/context/ThemeContext'
import { type VaccinationFormValues } from '../schemas/vaccination'

const ROUTE_OPTIONS = [
  { value: 'SUBCUTANEOUS', label: 'Subcutaneous' },
  { value: 'INTRAMUSCULAR', label: 'Intramuscular' },
  { value: 'INTRAVENOUS', label: 'Intravenous' },
  { value: 'ORAL', label: 'Oral' },
  { value: 'OTHER', label: 'Other' },
] as const

interface PetOption {
  id: string
  name: string
}

interface VaccinationFormProps {
  form: UseFormReturn<VaccinationFormValues>
  pets?: PetOption[]
  petLocked?: boolean
  onSubmit: () => void
  isPending: boolean
  errorMessage?: string | null
  submitLabel: string
}

export function VaccinationForm({
  form,
  pets,
  petLocked = false,
  onSubmit,
  isPending,
  errorMessage,
  submitLabel,
}: VaccinationFormProps) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const {
    control,
    formState: { errors },
  } = form

  return (
    <>
      {!petLocked ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pet</Text>
          {pets && pets.length > 0 ? (
            <Controller
              control={control}
              name="pet_id"
              render={({ field: { value, onChange } }) => (
                <View style={styles.petRow}>
                  {pets.map((pet) => (
                    <Pressable
                      key={pet.id}
                      accessibilityRole="button"
                      onPress={() => onChange(pet.id)}
                      style={[styles.petChip, value === pet.id && styles.petChipActive]}
                    >
                      <Text style={[styles.petChipText, value === pet.id && styles.petChipTextActive]}>
                        {pet.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            />
          ) : (
            <Text style={styles.hintText}>No pets yet. Add a pet first to record a vaccination.</Text>
          )}
          {errors.pet_id && <Text style={styles.fieldError}>{errors.pet_id.message}</Text>}
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Vaccination Details</Text>

        <Text style={styles.label}>Vaccine Name *</Text>
        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              autoCapitalize="words"
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder="e.g. Rabies"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, errors.name && styles.inputError]}
              value={value}
            />
          )}
        />
        {errors.name && <Text style={styles.fieldError}>{errors.name.message}</Text>}

        <Text style={styles.label}>Dose *</Text>
        <Controller
          control={control}
          name="dose"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder="e.g. 1 ml"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, errors.dose && styles.inputError]}
              value={value}
            />
          )}
        />
        {errors.dose && <Text style={styles.fieldError}>{errors.dose.message}</Text>}

        <Text style={styles.label}>Route *</Text>
        <Controller
          control={control}
          name="route"
          render={({ field: { value, onChange } }) => (
            <View style={styles.routeRow}>
              {ROUTE_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  onPress={() => onChange(option.value)}
                  style={[styles.routeChip, value === option.value && styles.routeChipActive]}
                >
                  <Text
                    style={[styles.routeChipText, value === option.value && styles.routeChipTextActive]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        />

        <Text style={styles.label}>Date Given *</Text>
        <Controller
          control={control}
          name="date_given"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, errors.date_given && styles.inputError]}
              value={value}
            />
          )}
        />
        {errors.date_given && <Text style={styles.fieldError}>{errors.date_given.message}</Text>}

        <Text style={styles.label}>Next Due</Text>
        <Controller
          control={control}
          name="next_due"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, errors.next_due && styles.inputError]}
              value={value ?? ''}
            />
          )}
        />
        {errors.next_due && <Text style={styles.fieldError}>{errors.next_due.message}</Text>}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Optional Details</Text>

        <Text style={styles.label}>Brand</Text>
        <Controller
          control={control}
          name="brand"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              autoCapitalize="words"
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder="e.g. Nobivac"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              value={value ?? ''}
            />
          )}
        />

        <Text style={styles.label}>Batch No.</Text>
        <Controller
          control={control}
          name="batch_no"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              autoCapitalize="characters"
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder="e.g. B-12345"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              value={value ?? ''}
            />
          )}
        />

        <Text style={styles.label}>Notes</Text>
        <Controller
          control={control}
          name="notes"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              multiline
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder="Anything the vet should know"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, styles.notesInput]}
              value={value ?? ''}
            />
          )}
        />
      </View>

      <Pressable
        accessibilityRole="button"
        disabled={isPending}
        onPress={onSubmit}
        style={[styles.submitButton, isPending && styles.submitDisabled]}
      >
        {isPending ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <>
            <Text style={styles.submitText}>{submitLabel}</Text>
            <Text style={styles.submitArrow}>→</Text>
          </>
        )}
      </Pressable>

      {errorMessage ? (
        <View style={styles.apiErrorWrap}>
          <Text style={styles.apiErrorIcon}>!</Text>
          <Text style={styles.apiErrorText}>{errorMessage}</Text>
        </View>
      ) : null}
    </>
  )
}

const createStyles = (colors: AppColors) => StyleSheet.create({
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
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  hintText: { color: colors.textMuted, fontSize: 13, marginTop: 12 },
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
  notesInput: {
    height: 90,
    paddingBottom: 12,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  inputError: { borderColor: colors.error },
  fieldError: { color: colors.error, fontSize: 12, marginTop: 4 },
  petRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  petChip: {
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  petChipActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  petChipText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  petChipTextActive: { color: colors.primary },
  routeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  routeChip: {
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  routeChipActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  routeChipText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  routeChipTextActive: { color: colors.primary },
  submitButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 16,
    flexDirection: 'row',
    gap: 8,
    height: 56,
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 28,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  submitArrow: { color: '#FFFFFF', fontSize: 20, fontWeight: '600', marginTop: -2 },
  apiErrorWrap: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.error,
    borderRadius: 12,
    borderWidth: 1.5,
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

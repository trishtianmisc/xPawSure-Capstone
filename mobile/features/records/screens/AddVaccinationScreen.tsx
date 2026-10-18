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
import { MaterialCommunityIcons } from '@expo/vector-icons'


import { useAuth } from '../../../src/context/AuthContext'
import { useTheme, type AppColors } from '../../../src/context/ThemeContext'
import { font } from '../../../src/theme/typography'
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

   const handleBack = () => {
    if (router.canGoBack()) {
      router.back()
    } else {
      router.replace('/(owner)/records')
    }
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
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            hitSlop={8}
            onPress={handleBack}
            style={styles.headerBack}
          >
            <MaterialCommunityIcons color={colors.text} name="arrow-left" size={22} />
          </Pressable>
          <Text style={styles.headerTitle}>Record Vaccination</Text>
          <Text style={styles.headerHint}>
            Log a vaccine your pet received.
          </Text>
        </View>

        <View style={styles.section}>
        {pets.isLoading ? <ActivityIndicator color={colors.primary} style={styles.petsLoader} /> : null}


        <VaccinationForm
          errorMessage={createVaccination.isError ? apiErrorMessage(createVaccination.error) : null}
          form={form}
          isPending={createVaccination.isPending}
          onSubmit={form.handleSubmit(onSubmit)}
          pets={petOptions}
          submitLabel="Save Record"
        />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingTop: 20, paddingBottom: 48 },
  header: { height: 30, marginHorizontal: 10, marginBottom: 8, marginTop: -10},
  headerBack: { alignItems: 'center', height: 48, justifyContent: 'center', width: 48 },
  headerTitle: { ...font.extrabold, color: colors.text, fontSize: 20, marginTop: -45, marginLeft: 60 },
  headerHint: {...font.regular, color: colors.textSecondary, fontSize: 12, marginTop: -3, marginLeft: 60  },
  section: { gap: 10, paddingHorizontal: 2, paddingTop: 30 },
  petsLoader: { marginTop: 12 },
})

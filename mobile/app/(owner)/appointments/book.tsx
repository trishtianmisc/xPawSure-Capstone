import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import axios from 'axios'
import { useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'

import { useBookAppointment } from '../../../features/appointment/hooks/useBookAppointment'
import { useClinics } from '../../../features/appointment/hooks/useClinics'
import { useSlots } from '../../../features/appointment/hooks/useSlots'
import { useVets } from '../../../features/appointment/hooks/useVets'
import type { AppointmentType, OwnerSlot } from '../../../features/appointment/types'
import { usePets } from '../../../features/pet/hooks/usePets'
import type { Pet } from '../../../features/pet/types'
import { useCreateScreening } from '../../../features/screening/hooks/useCreateScreening'
import { useScreenings } from '../../../features/screening/hooks/useScreenings'
import { ErrorRetry } from '../../../src/components/ErrorRetry'
import { useAuth } from '../../../src/context/AuthContext'
import { useTheme, type AppColors } from '../../../src/context/ThemeContext'

const TOTAL_STEPS = 7

const STEP_TITLES = [
  'Choose a clinic',
  'Choose your pet',
  'Skin scan result',
  'Pick a date',
  'Choose a veterinarian',
  'Pick a time slot',
  'Appointment details',
]

const APT_TYPES: Array<{ value: AppointmentType; label: string }> = [
  { value: 'CONSULTATION', label: 'Consultation' },
  { value: 'FOLLOW_UP', label: 'Follow-up' },
  { value: 'VACCINATION', label: 'Vaccination' },
  { value: 'AI_REVIEW', label: 'AI Review' },
  { value: 'EMERGENCY', label: 'Emergency' },
]

interface DayChip {
  iso: string
  weekday: string
  day: string
  month: string
}

function buildDays(count: number): DayChip[] {
  const days: DayChip[] = []
  const today = new Date()
  for (let i = 0; i < count; i += 1) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i)
    days.push({
      iso: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
      weekday: date.toLocaleDateString(undefined, { weekday: 'short' }),
      day: String(date.getDate()),
      month: date.toLocaleDateString(undefined, { month: 'short' }),
    })
  }
  return days
}

function formatTime(time: string): string {
  const [hourRaw, minuteRaw] = time.split(':')
  const hour = Number(hourRaw)
  const minute = Number(minuteRaw ?? '0')
  const period = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 === 0 ? 12 : hour % 12
  return `${hour12}:${String(minute).padStart(2, '0')} ${period}`
}

export default function BookAppointmentScreen() {
  const router = useRouter()
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const { user } = useAuth()

  const [step, setStep] = useState(1)
  const [clinicId, setClinicId] = useState<string | null>(null)
  const [clinicName, setClinicName] = useState<string | null>(null)
  const [pet, setPet] = useState<Pet | null>(null)
  const [date, setDate] = useState<string | null>(null)
  const [vetId, setVetId] = useState<string | null>(null)
  const [vetName, setVetName] = useState<string | null>(null)
  const [slot, setSlot] = useState<OwnerSlot | null>(null)
  const [aptType, setAptType] = useState<AppointmentType>('CONSULTATION')
  const [reason, setReason] = useState('')

  const days = useMemo(() => buildDays(14), [])

  const { data: clinics = [], isLoading: clinicsLoading, isError: clinicsError, refetch: refetchClinics, isRefetching: clinicsRefetching } = useClinics()
  const { data: pets = [], isLoading: petsLoading, isError: petsError, refetch: refetchPets, isRefetching: petsRefetching } = usePets(user?.id)
  const { data: vets = [], isLoading: vetsLoading, isError: vetsError, refetch: refetchVets, isRefetching: vetsRefetching } = useVets(
    clinicId ?? undefined,
    step >= 5 ? (date ?? undefined) : undefined,
  )
  const { data: slots = [], isLoading: slotsLoading, isError: slotsError, refetch: refetchSlots, isRefetching: slotsRefetching } = useSlots(
    vetId ?? undefined,
    step >= 6 ? (date ?? undefined) : undefined,
  )
  const {
    data: screenings,
    isLoading: screeningsLoading,
    isError: screeningsError,
    refetch: refetchScreenings,
    isRefetching: screeningsRefetching,
  } = useScreenings(step >= 3 && pet ? pet.id : undefined, step >= 3)
  const createScreening = useCreateScreening()
  const bookAppointment = useBookAppointment()

  const latestScreening = screenings?.results[0] ?? null
  const screeningId = latestScreening?.ais_id ?? null

  function goBack() {
    if (step === 1) {
      router.back()
      return
    }
    setStep((current) => current - 1)
  }

  function selectClinic(clinic: { cln_id: string; cln_name: string }) {
    if (clinic.cln_id !== clinicId) {
      setClinicId(clinic.cln_id)
      setClinicName(clinic.cln_name)
      setVetId(null)
      setVetName(null)
      setSlot(null)
    }
    setStep(2)
  }

  function selectPet(selected: Pet) {
    setPet(selected)
    setStep(3)
  }

  function selectDate(iso: string) {
    if (iso !== date) {
      setDate(iso)
      setVetId(null)
      setVetName(null)
      setSlot(null)
    }
    setStep(5)
  }

  function selectVet(vet: { stf_id: string; full_name: string }) {
    if (vet.stf_id !== vetId) {
      setVetId(vet.stf_id)
      setVetName(vet.full_name)
      setSlot(null)
    }
    setStep(6)
  }

  function selectSlot(selected: OwnerSlot) {
    setSlot(selected)
    setStep(7)
  }

  function handleCreateScreening() {
    if (!pet) return
    createScreening.mutate({ pet_id: pet.id, source: 'MOCK' })
  }

  function handleBook() {
    if (!pet || !slot || !screeningId) return

    bookAppointment.mutate(
      {
        pet_id: pet.id,
        slot_id: slot.vsl_id,
        apt_type: aptType,
        reason: reason.trim() || undefined,
        screening_id: screeningId,
      },
      {
        onSuccess: (created) => {
          router.replace(`/(owner)/appointments/${created.apt_id}`)
        },
        onError: (error) => {
          const detail = axios.isAxiosError(error)
            ? (error.response?.data as { detail?: string } | undefined)?.detail
            : undefined
          Alert.alert('Booking failed', detail ?? 'Something went wrong. Please try again.')
        },
      },
    )
  }

  const canContinue =
    (step === 1 && !!clinicId) ||
    (step === 2 && !!pet) ||
    (step === 3 && !!screeningId) ||
    (step === 4 && !!date) ||
    (step === 5 && !!vetId) ||
    (step === 6 && !!slot)

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.progressHeader}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${(step / TOTAL_STEPS) * 100}%` }]} />
          </View>
          <Text style={styles.stepLabel}>Step {step} of {TOTAL_STEPS}</Text>
          <Text style={styles.stepTitle}>{STEP_TITLES[step - 1]}</Text>
        </View>

        {step === 1 && (
          <View style={styles.list}>
            {clinicsLoading ? (
              <View style={styles.stateBox}><ActivityIndicator color={colors.primary} /></View>
            ) : clinicsError ? (
              <ErrorRetry isRetrying={clinicsRefetching} message="We couldn't load clinics." onRetry={() => void refetchClinics()} />
            ) : clinics.length > 0 ? (
              clinics.map((clinic) => (
                <Pressable
                  key={clinic.cln_id}
                  accessibilityRole="button"
                  onPress={() => selectClinic(clinic)}
                  style={[styles.optionCard, clinicId === clinic.cln_id && styles.optionCardSelected]}
                >
                  <View style={styles.optionIcon}>
                    <MaterialCommunityIcons color={colors.primary} name="hospital-building" size={22} />
                  </View>
                  <View style={styles.optionBody}>
                    <Text style={styles.optionTitle}>{clinic.cln_name}</Text>
                    {clinic.cln_address ? (
                      <Text numberOfLines={1} style={styles.optionSubtitle}>{clinic.cln_address}</Text>
                    ) : null}
                  </View>
                  <Ionicons color={colors.textMuted} name="chevron-forward" size={18} />
                </Pressable>
              ))
            ) : (
              <View style={styles.stateBox}>
                <Text style={styles.statusText}>No clinics available for online booking.</Text>
              </View>
            )}
          </View>
        )}

        {step === 2 && (
          <View style={styles.list}>
            {petsLoading ? (
              <View style={styles.stateBox}><ActivityIndicator color={colors.primary} /></View>
            ) : petsError ? (
              <ErrorRetry isRetrying={petsRefetching} message="We couldn't load your pets." onRetry={() => void refetchPets()} />
            ) : pets.length > 0 ? (
              pets.map((currentPet) => (
                <Pressable
                  key={currentPet.id}
                  accessibilityRole="button"
                  onPress={() => selectPet(currentPet)}
                  style={[styles.optionCard, pet?.id === currentPet.id && styles.optionCardSelected]}
                >
                  <View style={styles.optionIcon}>
                    <MaterialCommunityIcons color={colors.primary} name="paw" size={22} />
                  </View>
                  <View style={styles.optionBody}>
                    <Text style={styles.optionTitle}>{currentPet.name}</Text>
                    <Text style={styles.optionSubtitle}>{currentPet.breed_name || 'Breed not specified'}</Text>
                  </View>
                  <Ionicons color={colors.textMuted} name="chevron-forward" size={18} />
                </Pressable>
              ))
            ) : (
              <View style={styles.stateBox}>
                <Text style={styles.statusText}>You need to add a pet before booking.</Text>
              </View>
            )}
          </View>
        )}

        {step === 3 && (
          <View style={styles.list}>
            {screeningsLoading ? (
              <View style={styles.stateBox}><ActivityIndicator color={colors.primary} /></View>
            ) : screeningsError ? (
              <ErrorRetry isRetrying={screeningsRefetching} message="We couldn't load scan results." onRetry={() => void refetchScreenings()} />
            ) : latestScreening ? (
              <View style={styles.scanCard}>
                <View style={styles.scanHeader}>
                  <MaterialCommunityIcons color={colors.primary} name="brain" size={22} />
                  <Text style={styles.scanTitle}>Skin scan result</Text>
                  <View
                    style={[
                      styles.scanBadge,
                      latestScreening.ais_source === 'MOCK' ? styles.scanBadgeDemo : styles.scanBadgeReal,
                    ]}
                  >
                    <Text
                      style={[
                        styles.scanBadgeText,
                        latestScreening.ais_source === 'MOCK' ? styles.scanBadgeTextDemo : styles.scanBadgeTextReal,
                      ]}
                    >
                      {latestScreening.ais_source === 'MOCK' ? 'Demo' : 'On-device AI'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.scanDisease}>{latestScreening.disease}</Text>
                <Text style={styles.scanMeta}>
                  Confidence {Math.round(Number(latestScreening.ais_confidence))}% · Model {latestScreening.ais_model_version}
                </Text>
                <Text style={styles.scanNote}>
                  This result will be shared with your veterinarian during the appointment.
                </Text>
              </View>
            ) : (
              <View style={styles.blockCard}>
                <MaterialCommunityIcons color={colors.primary} name="camera" size={34} />
                <Text style={styles.blockTitle}>Skin scan required</Text>
                <Text style={styles.blockText}>
                  Booking needs a scan result for {pet?.name ?? 'your pet'}. Run a quick scan to continue.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  disabled={createScreening.isPending}
                  onPress={handleCreateScreening}
                  style={[styles.scanButton, createScreening.isPending && styles.scanButtonDisabled]}
                >
                  {createScreening.isPending ? (
                    <ActivityIndicator color={colors.inverse} />
                  ) : (
                    <Text style={styles.scanButtonText}>Run demo scan</Text>
                  )}
                </Pressable>
              </View>
            )}
            {createScreening.isError && (
              <Text style={styles.errorText}>Couldn&apos;t create the scan result. Please try again.</Text>
            )}
          </View>
        )}

        {step === 4 && (
          <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayRow}>
              {days.map((day) => (
                <Pressable
                  key={day.iso}
                  accessibilityRole="button"
                  onPress={() => selectDate(day.iso)}
                  style={[styles.dayChip, date === day.iso && styles.dayChipSelected]}
                >
                  <Text style={[styles.dayWeekday, date === day.iso && styles.dayChipTextSelected]}>
                    {day.weekday}
                  </Text>
                  <Text style={[styles.dayNumber, date === day.iso && styles.dayChipTextSelected]}>
                    {day.day}
                  </Text>
                  <Text style={[styles.dayMonth, date === day.iso && styles.dayChipTextSelected]}>
                    {day.month}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {step === 5 && (
          <View style={styles.list}>
            {vetsLoading ? (
              <View style={styles.stateBox}><ActivityIndicator color={colors.primary} /></View>
            ) : vetsError ? (
              <ErrorRetry isRetrying={vetsRefetching} message="We couldn't load veterinarians." onRetry={() => void refetchVets()} />
            ) : vets.length > 0 ? (
              vets.map((vet) => (
                <Pressable
                  key={vet.stf_id}
                  accessibilityRole="button"
                  onPress={() => selectVet(vet)}
                  style={[styles.optionCard, vetId === vet.stf_id && styles.optionCardSelected]}
                >
                  <View style={styles.optionIcon}>
                    <MaterialCommunityIcons color={colors.primary} name="stethoscope" size={22} />
                  </View>
                  <View style={styles.optionBody}>
                    <Text style={styles.optionTitle}>{vet.full_name}</Text>
                    <Text style={styles.optionSubtitle}>
                      {vet.available_count} slot{vet.available_count === 1 ? '' : 's'} available
                    </Text>
                  </View>
                  <Ionicons color={colors.textMuted} name="chevron-forward" size={18} />
                </Pressable>
              ))
            ) : (
              <View style={styles.stateBox}>
                <Text style={styles.statusText}>No veterinarians with free slots on this date. Try another day.</Text>
              </View>
            )}
          </View>
        )}

        {step === 6 && (
          <View style={styles.list}>
            {slotsLoading ? (
              <View style={styles.stateBox}><ActivityIndicator color={colors.primary} /></View>
            ) : slotsError ? (
              <ErrorRetry isRetrying={slotsRefetching} message="We couldn't load time slots." onRetry={() => void refetchSlots()} />
            ) : slots.length > 0 ? (
              <View style={styles.slotGrid}>
                {slots.map((currentSlot) => (
                  <Pressable
                    key={currentSlot.vsl_id}
                    accessibilityRole="button"
                    onPress={() => selectSlot(currentSlot)}
                    style={[styles.slotChip, slot?.vsl_id === currentSlot.vsl_id && styles.slotChipSelected]}
                  >
                    <Text
                      style={[
                        styles.slotText,
                        slot?.vsl_id === currentSlot.vsl_id && styles.slotTextSelected,
                      ]}
                    >
                      {formatTime(currentSlot.vsl_start_time)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <View style={styles.stateBox}>
                <Text style={styles.statusText}>No free slots left with this veterinarian on this date.</Text>
              </View>
            )}
          </View>
        )}

        {step === 7 && (
          <View style={styles.list}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Booking summary</Text>
              <Text style={styles.summaryLine}>Clinic: {clinicName}</Text>
              <Text style={styles.summaryLine}>Pet: {pet?.name}</Text>
              <Text style={styles.summaryLine}>Date: {date}</Text>
              <Text style={styles.summaryLine}>Veterinarian: {vetName}</Text>
              <Text style={styles.summaryLine}>
                Time: {slot ? formatTime(slot.vsl_start_time) : ''}
              </Text>
              <Text style={styles.summaryLine}>Skin scan: {latestScreening?.disease ?? ''}</Text>
            </View>

            <Text style={styles.fieldLabel}>Appointment type</Text>
            <View style={styles.typeRow}>
              {APT_TYPES.map((type) => (
                <Pressable
                  key={type.value}
                  accessibilityRole="button"
                  onPress={() => setAptType(type.value)}
                  style={[styles.typeChip, aptType === type.value && styles.typeChipSelected]}
                >
                  <Text
                    style={[styles.typeText, aptType === type.value && styles.typeTextSelected]}
                  >
                    {type.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Reason (optional)</Text>
            <TextInput
              accessibilityLabel="Reason for the appointment"
              multiline
              onChangeText={setReason}
              placeholder="Describe the reason for this visit..."
              placeholderTextColor={colors.textMuted}
              style={styles.reasonInput}
              value={reason}
            />
            {bookAppointment.isError && (
              <Text style={styles.errorText}>Booking failed. Please try again.</Text>
            )}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable accessibilityRole="button" onPress={goBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>

        {step < TOTAL_STEPS ? (
          <Pressable
            accessibilityRole="button"
            disabled={!canContinue}
            onPress={() => setStep((current) => current + 1)}
            style={[styles.nextButton, !canContinue && styles.nextButtonDisabled]}
          >
            <Text style={styles.nextButtonText}>Continue</Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            disabled={bookAppointment.isPending}
            onPress={handleBook}
            style={[styles.nextButton, bookAppointment.isPending && styles.nextButtonDisabled]}
          >
            {bookAppointment.isPending ? (
              <ActivityIndicator color={colors.inverse} />
            ) : (
              <Text style={styles.nextButtonText}>Book appointment</Text>
            )}
          </Pressable>
        )}
      </View>
    </View>
  )
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  screen: { backgroundColor: colors.surface, flex: 1 },
  content: { gap: 16, paddingBottom: 24, paddingHorizontal: 20, paddingTop: 20 },
  progressHeader: { gap: 8 },
  progressTrack: { backgroundColor: colors.surfaceAlt, borderRadius: 999, height: 6, overflow: 'hidden' },
  progressFill: { backgroundColor: colors.primary, borderRadius: 999, height: '100%' },
  stepLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  stepTitle: { color: colors.text, fontSize: 20, fontWeight: '800' },
  list: { gap: 12 },
  stateBox: { alignItems: 'center', borderColor: colors.border, borderRadius: 14, borderStyle: 'dashed', borderWidth: 1, justifyContent: 'center', minHeight: 140, paddingHorizontal: 24 },
  statusText: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  optionCard: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 12, minHeight: 72, paddingHorizontal: 14 },
  optionCardSelected: { borderColor: colors.primary, borderWidth: 2 },
  optionIcon: { alignItems: 'center', backgroundColor: colors.iconBg, borderRadius: 12, height: 44, justifyContent: 'center', width: 44 },
  optionBody: { flex: 1 },
  optionTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  optionSubtitle: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
  dayRow: { gap: 10, paddingVertical: 4 },
  dayChip: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 14, borderWidth: 1, gap: 2, paddingHorizontal: 12, paddingVertical: 10, width: 64 },
  dayChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayChipTextSelected: { color: colors.inverse },
  dayWeekday: { color: colors.textSecondary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  dayNumber: { color: colors.text, fontSize: 18, fontWeight: '800' },
  dayMonth: { color: colors.textSecondary, fontSize: 11, fontWeight: '600' },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  slotChip: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 12, borderWidth: 1, justifyContent: 'center', minHeight: 44, minWidth: 100, paddingHorizontal: 14 },
  slotChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  slotText: { color: colors.text, fontSize: 14, fontWeight: '700' },
  slotTextSelected: { color: colors.inverse },
  summaryCard: { backgroundColor: colors.surfaceAlt, borderColor: colors.border, borderRadius: 14, borderWidth: 1, gap: 6, padding: 16 },
  summaryTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
  summaryLine: { color: colors.textSecondary, fontSize: 14 },
  fieldLabel: { color: colors.text, fontSize: 14, fontWeight: '700' },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 999, borderWidth: 1, minHeight: 38, paddingHorizontal: 14, justifyContent: 'center' },
  typeChipSelected: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  typeText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  typeTextSelected: { color: colors.primaryDark, fontWeight: '700' },
  reasonInput: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 12, borderWidth: 1, color: colors.text, fontSize: 14, minHeight: 96, padding: 14, textAlignVertical: 'top' },
  scanCard: { backgroundColor: colors.surfaceAlt, borderColor: colors.border, borderRadius: 14, borderWidth: 1, gap: 8, padding: 16 },
  scanHeader: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  scanTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
  scanBadge: { borderRadius: 999, marginLeft: 'auto', paddingHorizontal: 8, paddingVertical: 3 },
  scanBadgeDemo: { backgroundColor: colors.iconBg },
  scanBadgeReal: { backgroundColor: colors.primaryLight },
  scanBadgeText: { fontSize: 11, fontWeight: '700' },
  scanBadgeTextDemo: { color: colors.textSecondary },
  scanBadgeTextReal: { color: colors.primaryDark },
  scanDisease: { color: colors.text, fontSize: 20, fontWeight: '800' },
  scanMeta: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  scanNote: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
  blockCard: { alignItems: 'center', borderColor: colors.border, borderRadius: 14, borderStyle: 'dashed', borderWidth: 1, gap: 10, justifyContent: 'center', minHeight: 220, paddingHorizontal: 24, paddingVertical: 24 },
  blockTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  blockText: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  scanButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 12, justifyContent: 'center', minHeight: 48, paddingHorizontal: 28 },
  scanButtonDisabled: { opacity: 0.5 },
  scanButtonText: { color: colors.inverse, fontSize: 15, fontWeight: '700' },
  errorText: { color: colors.error, fontSize: 13, fontWeight: '600' },
  footer: { backgroundColor: colors.surface, borderTopColor: colors.border, borderTopWidth: 1, flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingVertical: 14 },
  backButton: { alignItems: 'center', borderColor: colors.border, borderRadius: 12, borderWidth: 1, justifyContent: 'center', minHeight: 48, paddingHorizontal: 22 },
  backButtonText: { color: colors.text, fontSize: 15, fontWeight: '700' },
  nextButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 12, flex: 1, justifyContent: 'center', minHeight: 48 },
  nextButtonDisabled: { opacity: 0.5 },
  nextButtonText: { color: colors.inverse, fontSize: 15, fontWeight: '700' },
})

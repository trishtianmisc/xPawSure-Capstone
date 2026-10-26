import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import * as Linking from 'expo-linking'
import { useRouter } from 'expo-router'
import { useEffect, useMemo, useRef, useState } from 'react'
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
import { useCancelPayment } from '../../../features/payment/hooks/useCancelPayment'
import { useCreateCheckout } from '../../../features/payment/hooks/useCreateCheckout'
import { usePayment } from '../../../features/payment/hooks/usePayment'
import { formatMoney } from '../../../features/payment/lib/format'
import type { Payment, PaymentMethod } from '../../../features/payment/types'
import { useScreenings } from '../../../features/screening/hooks/useScreenings'
import { useAuth } from '../../../src/context/AuthContext'
import { useTheme, type AppColors } from '../../../src/context/ThemeContext'
import { font } from '../../../src/theme/typography'
import { apiErrorCode, apiErrorMessage, apiErrorStatus } from '../../../src/utils/error'

const TOTAL_STEPS = 8

const STEP_TITLES = [
  'Choose a clinic',
  'Choose your pet',
  'Skin scan result',
  'Pick a date',
  'Choose a veterinarian',
  'Pick a time slot',
  'Appointment details',
  'Payment',
]

/** The steps used when the clinic charges no consultation fee. */
const FREE_STEPS = STEP_TITLES.length - 1

const PAYMENT_STEP = FREE_STEPS + 1

/** Owners can never record cash, so it is never offered here. */
const OWNER_METHODS: Array<{ value: PaymentMethod; label: string }> = [
  { value: 'GCASH', label: 'GCash' },
  { value: 'CARD', label: 'Card' },
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
  // Payment state. The server owns the amount; the app only owns the flow.
  const [method, setMethod] = useState<PaymentMethod>('GCASH')
  const [checkout, setCheckout] = useState<Payment | null>(null)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  // Set when the booking endpoint reports a fee the clinic list did not show.
  const [feeRequired, setFeeRequired] = useState(false)
  const bookingInFlight = useRef(false)

  const days = useMemo(() => buildDays(14), [])

  const { data: clinics = [], isLoading: clinicsLoading, isError: clinicsError } = useClinics()
  const { data: pets = [], isLoading: petsLoading, isError: petsError } = usePets(user?.id)
  const { data: vets = [], isLoading: vetsLoading, isError: vetsError } = useVets(
    clinicId ?? undefined,
    step >= 5 ? (date ?? undefined) : undefined,
  )
  const { data: slots = [], isLoading: slotsLoading, isError: slotsError } = useSlots(
    vetId ?? undefined,
    step >= 6 ? (date ?? undefined) : undefined,
  )
  const {
    data: screenings,
    isLoading: screeningsLoading,
    isError: screeningsError,
  } = useScreenings(step >= 3 && pet ? pet.id : undefined, step >= 3)
  const bookAppointment = useBookAppointment()
  const createCheckout = useCreateCheckout()
  const cancelPayment = useCancelPayment()

  const latestScreening = screenings?.results[0] ?? null
  const screeningId = latestScreening?.ais_id ?? null

  const selectedClinic = clinics.find((current) => current.cln_id === clinicId) ?? null
  const consultationFee = Number(selectedClinic?.consultation_fee ?? 0)
  const requiresPayment = feeRequired || consultationFee > 0
  const totalSteps = requiresPayment ? TOTAL_STEPS : FREE_STEPS

  const { data: livePayment, refetch: refetchPayment } = usePayment(
    checkout?.pay_id ?? null,
    checkout ?? undefined,
  )
  // Once a checkout exists the poll is the source of truth about its status.
  const payment = livePayment ?? checkout
  useEffect(() => {
    if (livePayment && livePayment.status !== checkout?.status) {
      setCheckout(livePayment)
    }
  }, [livePayment, checkout])

  // A settled payment books the appointment without asking the owner again.
  useEffect(() => {
    if (step === PAYMENT_STEP && payment?.status === 'PAID') {
      handleBook(payment.pay_id)
    }
  }, [step, payment?.status])

  function goBack() {
    if (step === 1) {
      router.back()
      return
    }
    setStep((current) => current - 1)
  }

  function handleHeaderBack() {
    if (router.canGoBack()) {
      router.back()
    } else {
      router.replace('/(owner)/appointments')
    }
  }

  function selectClinic(clinic: { cln_id: string; cln_name: string }) {
    if (clinic.cln_id !== clinicId) {
      setClinicId(clinic.cln_id)
      setClinicName(clinic.cln_name)
      setVetId(null)
      setVetName(null)
      setSlot(null)
      // A checkout belongs to one clinic. A paid one is kept so the money is
      // never silently dropped; the backend will refuse it for another clinic.
      setCheckout((current) => (current?.status === 'PAID' ? current : null))
      setPaymentError(null)
      setFeeRequired(false)
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

  function handleGoScan() {
    router.push(pet ? `/(owner)/pets/screening?petId=${pet.id}` : '/(owner)/pets/screening')
  }

  function handleBookingError(error: unknown) {
    const code = apiErrorCode(error)
    const detail = apiErrorMessage(error)
    // Only an unlabelled 409 means the slot was taken; a coded error gets its
    // own message below.
    const slotTaken = code === 'SLOT_UNAVAILABLE' || (code === null && apiErrorStatus(error) === 409)

    if (slotTaken) {
      // The money, if any, stays with the payment and funds the next slot.
      Alert.alert(
        'Time slot taken',
        'Someone else booked that time. Pick another slot — your payment still counts.',
      )
      setStep(6)
      return
    }

    switch (code) {
      case 'PAYMENT_REQUIRED':
        // The fee was not visible when the clinic was picked: show the step.
        setFeeRequired(true)
        setStep(PAYMENT_STEP)
        return
      case 'PAYMENT_EXPIRED':
        setCheckout(null)
        setPaymentError(null)
        setStep(PAYMENT_STEP)
        return
      case 'SCREENING_REQUIRED':
        Alert.alert('Skin scan needed', detail)
        setStep(3)
        return
      default:
        Alert.alert('Booking failed', detail)
    }
  }

  function handleBook(explicitPayId?: string) {
    if (!pet || !slot || !screeningId || bookingInFlight.current) return

    // A payment that already settled funds whichever slot is picked next.
    const payId = explicitPayId ?? (payment?.status === 'PAID' ? payment.pay_id : undefined)
    bookingInFlight.current = true

    bookAppointment.mutate(
      {
        pet_id: pet.id,
        slot_id: slot.vsl_id,
        apt_type: aptType,
        reason: reason.trim() || undefined,
        screening_id: screeningId,
        ...(payId ? { pay_id: payId } : {}),
      },
      {
        onSuccess: (created) => {
          router.replace(`/(owner)/appointments/${created.apt_id}`)
        },
        onError: (error) => {
          bookingInFlight.current = false
          handleBookingError(error)
        },
      },
    )
  }

  async function openCheckout(url: string | null) {
    if (!url) return
    try {
      await Linking.openURL(url)
    } catch {
      setPaymentError('We could not open the checkout page. Tap "Open checkout page" to retry.')
    }
  }

  function handlePay() {
    if (!pet || !slot) return
    setPaymentError(null)

    createCheckout.mutate(
      {
        pet_id: pet.id,
        slot_id: slot.vsl_id,
        apt_type: aptType,
        method,
        reason: reason.trim() || undefined,
        screening_id: screeningId ?? undefined,
      },
      {
        onSuccess: (created) => {
          setCheckout(created)
          void openCheckout(created.checkout_url)
        },
        onError: (error) => {
          const code = apiErrorCode(error)
          if (code === 'PAYMENT_NOT_REQUIRED') {
            // The clinic stopped charging: book straight away, no payment.
            setFeeRequired(false)
            setCheckout(null)
            handleBook()
            return
          }
          if (code === 'SLOT_UNAVAILABLE' || (code === null && apiErrorStatus(error) === 409)) {
            Alert.alert('Time slot taken', 'Pick another slot and try again.')
            setStep(6)
            return
          }
          setPaymentError(apiErrorMessage(error))
        },
      },
    )
  }

  function handleDiscardCheckout() {
    if (!checkout) return
    cancelPayment.mutate(checkout.pay_id, {
      onSettled: () => {
        setCheckout(null)
        setPaymentError(null)
      },
    })
  }

  const canContinue =
    (step === 1 && !!clinicId) ||
    (step === 2 && !!pet) ||
    (step === 3 && !!screeningId) ||
    (step === 4 && !!date) ||
    (step === 5 && !!vetId) ||
    (step === 6 && !!slot) ||
    (step === 7 && !!slot)

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          hitSlop={8}
          onPress={handleHeaderBack}
          style={styles.headerBack}
        >
          <MaterialCommunityIcons color={colors.text} name="arrow-left" size={22} />
        </Pressable>
        <Text style={styles.headerTitle}>Book Appointment</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.progressHeader}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${(Math.min(step, totalSteps) / totalSteps) * 100}%` },
              ]}
            />
          </View>
          <Text style={styles.stepLabel}>Step {Math.min(step, totalSteps)} of {totalSteps}</Text>
          <Text style={styles.stepTitle}>{STEP_TITLES[step - 1]}</Text>
        </View>

        {step === 1 && (
          <View style={styles.list}>
            {clinicsLoading ? (
              <View style={styles.stateBox}><ActivityIndicator color={colors.primary} /></View>
            ) : clinicsError ? (
              <Text style={styles.statusText}>We couldn&apos;t load clinics. Please try again.</Text>
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
              <Text style={styles.statusText}>We couldn&apos;t load your pets. Please try again.</Text>
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
              <Text style={styles.statusText}>We couldn&apos;t load scan results. Please try again.</Text>
            ) : latestScreening ? (
              <View style={styles.scanCard}>
                <View style={styles.scanHeader}>
                  <MaterialCommunityIcons color={colors.primary} name="brain" size={22} />
                  <Text style={styles.scanTitle}>Skin scan result</Text>
                  <View style={[styles.scanBadge, styles.scanBadgeReal]}>
                    <Text style={[styles.scanBadgeText, styles.scanBadgeTextReal]}>
                      On-device AI
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
                  Booking needs a scan result for {pet?.name ?? 'your pet'}. Run a scan to continue.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={handleGoScan}
                  style={styles.scanButton}
                >
                  <Text style={styles.scanButtonText}>Scan {pet?.name ?? 'pet'}</Text>
                </Pressable>
              </View>
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
              <Text style={styles.statusText}>We couldn&apos;t load veterinarians. Please try again.</Text>
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
              <Text style={styles.statusText}>We couldn&apos;t load time slots. Please try again.</Text>
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
              {requiresPayment ? (
                <Text style={styles.summaryFee}>
                  Consultation fee: {formatMoney(consultationFee, payment?.currency ?? 'PHP')}
                </Text>
              ) : null}
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

        {step === PAYMENT_STEP && (
          <View style={styles.list}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Consultation fee</Text>
              <Text style={styles.feeAmount}>
                {formatMoney(payment?.amount ?? consultationFee, payment?.currency ?? 'PHP')}
              </Text>
              <Text style={styles.summaryLine}>Clinic: {clinicName}</Text>
              <Text style={styles.summaryLine}>Pet: {pet?.name}</Text>
              <Text style={styles.summaryLine}>
                Date: {date} · {slot ? formatTime(slot.vsl_start_time) : ''}
              </Text>
              {payment ? (
                <Text style={styles.summaryLine}>Reference: {payment.reference_no}</Text>
              ) : null}
            </View>

            {!payment ||
            payment.status === 'FAILED' ||
            payment.status === 'EXPIRED' ||
            payment.status === 'VOID' ? (
              <View style={styles.methodBlock}>
                <Text style={styles.fieldLabel}>Payment method</Text>
                <View style={styles.typeRow}>
                  {OWNER_METHODS.map((ownerMethod) => (
                    <Pressable
                      key={ownerMethod.value}
                      accessibilityRole="button"
                      onPress={() => setMethod(ownerMethod.value)}
                      style={[
                        styles.typeChip,
                        method === ownerMethod.value && styles.typeChipSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.typeText,
                          method === ownerMethod.value && styles.typeTextSelected,
                        ]}
                      >
                        {ownerMethod.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            {paymentError ? <Text style={styles.errorText}>{paymentError}</Text> : null}

            {payment?.status === 'PENDING' && (
              <View style={styles.payStatusCard}>
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.blockText}>
                  We opened the checkout page. Finish paying there — this screen updates on its own.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => openCheckout(payment.checkout_url)}
                  style={styles.scanButton}
                >
                  <Text style={styles.scanButtonText}>Open checkout page</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => refetchPayment()}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>I&apos;ve paid — check status</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={cancelPayment.isPending}
                  onPress={handleDiscardCheckout}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>Cancel this payment</Text>
                </Pressable>
              </View>
            )}

            {payment?.status === 'PAID' && (
              <View style={styles.payStatusCard}>
                <MaterialCommunityIcons color={colors.primary} name="check-decagram" size={34} />
                <Text style={styles.blockTitle}>Payment received</Text>
                <Text style={styles.blockText}>Booking your appointment…</Text>
                <ActivityIndicator color={colors.primary} />
              </View>
            )}

            {payment?.status === 'FAILED' && (
              <Text style={styles.errorText}>
                The payment did not go through
                {payment.failure_reason ? `: ${payment.failure_reason}` : ''}. Try again or pick
                another method.
              </Text>
            )}

            {payment?.status === 'EXPIRED' && (
              <Text style={styles.errorText}>
                This checkout expired before it was paid. Start a new payment to book.
              </Text>
            )}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable accessibilityRole="button" onPress={goBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>

        {step < totalSteps ? (
          <Pressable
            accessibilityRole="button"
            disabled={!canContinue}
            onPress={() => setStep((current) => current + 1)}
            style={[styles.nextButton, !canContinue && styles.nextButtonDisabled]}
          >
            <Text style={styles.nextButtonText}>Continue</Text>
          </Pressable>
        ) : step === PAYMENT_STEP && requiresPayment && payment?.status !== 'PAID' ? (
          <Pressable
            accessibilityRole="button"
            disabled={createCheckout.isPending}
            onPress={
              payment?.status === 'PENDING'
                ? () => openCheckout(payment.checkout_url)
                : handlePay
            }
            style={[
              styles.nextButton,
              createCheckout.isPending && styles.nextButtonDisabled,
            ]}
          >
            {createCheckout.isPending ? (
              <ActivityIndicator color={colors.inverse} />
            ) : (
              <Text style={styles.nextButtonText}>
                {payment
                  ? payment.status === 'PENDING'
                    ? 'Open checkout page'
                    : `Pay again (${formatMoney(payment.amount, payment.currency)})`
                  : `Pay ${formatMoney(consultationFee, 'PHP')} & book`}
              </Text>
            )}
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            disabled={bookAppointment.isPending}
            onPress={() => handleBook()}
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
  header: { height: 50, marginHorizontal: 10, marginBottom: 8, marginTop: 4 },
  headerBack: {
    alignItems: 'center',
    height: 50,
    justifyContent: 'center',
    width: 50,
    marginTop: 5,
  },
  headerTitle: { ...font.extrabold, color: colors.text, fontSize: 20, marginTop: -40, marginLeft: 50 },
  headerRight: { width: 20 },
  content: { gap: 16, paddingBottom: 24, paddingHorizontal: 20, paddingTop: 20 },
  progressHeader: { gap: 8 },
  progressTrack: { backgroundColor: colors.surfaceAlt, borderRadius: 999, height: 6, overflow: 'hidden' },
  progressFill: { backgroundColor: colors.primary, borderRadius: 999, height: '100%' },
  stepLabel: { ...font.bold, color: colors.textMuted, fontSize: 12, textTransform: 'uppercase' },
  stepTitle: { ...font.extrabold, color: colors.text, fontSize: 20 },
  list: { gap: 12 },
  stateBox: { alignItems: 'center', borderColor: colors.border, borderRadius: 14, borderStyle: 'dashed', borderWidth: 1, justifyContent: 'center', minHeight: 140, paddingHorizontal: 24 },
  statusText: { ...font.regular, color: colors.textSecondary, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  optionCard: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 12, minHeight: 72, paddingHorizontal: 14 },
  optionCardSelected: { borderColor: colors.primary, borderWidth: 2 },
  optionIcon: { alignItems: 'center', backgroundColor: colors.iconBg, borderRadius: 12, height: 44, justifyContent: 'center', width: 44 },
  optionBody: { flex: 1 },
  optionTitle: { ...font.bold, color: colors.text, fontSize: 15 },
  optionSubtitle: { ...font.regular, color: colors.textSecondary, fontSize: 13, marginTop: 2 },
  dayRow: { gap: 10, paddingVertical: 4 },
  dayChip: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 14, borderWidth: 1, gap: 2, paddingHorizontal: 12, paddingVertical: 10, width: 64 },
  dayChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayChipTextSelected: { color: colors.inverse },
  dayWeekday: { ...font.bold, color: colors.textSecondary, fontSize: 11, textTransform: 'uppercase' },
  dayNumber: { ...font.extrabold, color: colors.text, fontSize: 18 },
  dayMonth: { ...font.semibold, color: colors.textSecondary, fontSize: 11 },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  slotChip: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 12, borderWidth: 1, justifyContent: 'center', minHeight: 44, minWidth: 100, paddingHorizontal: 14 },
  slotChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  slotText: { ...font.bold, color: colors.text, fontSize: 14 },
  slotTextSelected: { color: colors.inverse },
  summaryCard: { backgroundColor: colors.surfaceAlt, borderColor: colors.border, borderRadius: 14, borderWidth: 1, gap: 6, padding: 16 },
  summaryTitle: { ...font.extrabold, color: colors.text, fontSize: 15 },
  summaryLine: { ...font.regular, color: colors.textSecondary, fontSize: 14 },
  summaryFee: { ...font.bold, color: colors.primaryDark, fontSize: 14, marginTop: 4 },
  feeAmount: { ...font.extrabold, color: colors.text, fontSize: 28 },
  methodBlock: { gap: 10 },
  payStatusCard: { alignItems: 'center', backgroundColor: colors.surfaceAlt, borderColor: colors.border, borderRadius: 14, borderWidth: 1, gap: 12, padding: 16 },
  secondaryButton: { alignItems: 'center', borderColor: colors.border, borderRadius: 12, borderWidth: 1, justifyContent: 'center', minHeight: 44, paddingHorizontal: 20, width: '100%' },
  secondaryButtonText: { ...font.bold, color: colors.textSecondary, fontSize: 14 },
  fieldLabel: { ...font.bold, color: colors.text, fontSize: 14 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 999, borderWidth: 1, minHeight: 38, paddingHorizontal: 14, justifyContent: 'center' },
  typeChipSelected: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  typeText: { ...font.semibold, color: colors.textSecondary, fontSize: 13 },
  typeTextSelected: { ...font.bold, color: colors.primaryDark },
  reasonInput: { ...font.regular, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 12, borderWidth: 1, color: colors.text, fontSize: 14, minHeight: 96, padding: 14, textAlignVertical: 'top' },
  scanCard: { backgroundColor: colors.surfaceAlt, borderColor: colors.border, borderRadius: 14, borderWidth: 1, gap: 8, padding: 16 },
  scanHeader: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  scanTitle: { ...font.extrabold, color: colors.text, fontSize: 15 },
  scanBadge: { borderRadius: 999, marginLeft: 'auto', paddingHorizontal: 8, paddingVertical: 3 },
  scanBadgeReal: { backgroundColor: colors.primaryLight },
  scanBadgeText: { ...font.bold, fontSize: 11 },
  scanBadgeTextReal: { color: colors.primaryDark },
  scanDisease: { ...font.extrabold, color: colors.text, fontSize: 20 },
  scanMeta: { ...font.semibold, color: colors.textSecondary, fontSize: 13 },
  scanNote: { ...font.regular, color: colors.textMuted, fontSize: 12, lineHeight: 17 },
  blockCard: { alignItems: 'center', borderColor: colors.border, borderRadius: 14, borderStyle: 'dashed', borderWidth: 1, gap: 10, justifyContent: 'center', minHeight: 220, paddingHorizontal: 24, paddingVertical: 24 },
  blockTitle: { ...font.extrabold, color: colors.text, fontSize: 16 },
  blockText: { ...font.regular, color: colors.textSecondary, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  scanButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 12, justifyContent: 'center', minHeight: 48, paddingHorizontal: 28 },
  scanButtonText: { ...font.bold, color: colors.inverse, fontSize: 15 },
  errorText: { ...font.semibold, color: colors.error, fontSize: 13 },
  footer: { backgroundColor: colors.surface, borderTopColor: colors.border, borderTopWidth: 1, flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingVertical: 14 },
  backButton: { alignItems: 'center', borderColor: colors.border, borderRadius: 12, borderWidth: 1, justifyContent: 'center', minHeight: 48, paddingHorizontal: 22 },
  backButtonText: { ...font.bold, color: colors.text, fontSize: 15 },
  nextButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 12, flex: 1, justifyContent: 'center', minHeight: 48 },
  nextButtonDisabled: { opacity: 0.5 },
  nextButtonText: { ...font.bold, color: colors.inverse, fontSize: 15 },
})

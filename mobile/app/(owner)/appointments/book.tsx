import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import * as Linking from 'expo-linking'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'

import { ClinicMap } from '../../../features/appointment/components/ClinicMap'
import { useBookAppointment } from '../../../features/appointment/hooks/useBookAppointment'
import { useClinics } from '../../../features/appointment/hooks/useClinics'
import { useMyAppointments } from '../../../features/appointment/hooks/useMyAppointments'
import { useSlots } from '../../../features/appointment/hooks/useSlots'
import { useVets } from '../../../features/appointment/hooks/useVets'
import { findConflictingAppointment } from '../../../features/appointment/lib/findConflictingAppointment'
import type { OwnerSlot } from '../../../features/appointment/types'
import { useCancelPayment } from '../../../features/payment/hooks/useCancelPayment'
import { useCreateCheckout } from '../../../features/payment/hooks/useCreateCheckout'
import { usePayment } from '../../../features/payment/hooks/usePayment'
import { formatMoney } from '../../../features/payment/lib/format'
import type { Payment, PaymentMethod } from '../../../features/payment/types'
import { useScreenings } from '../../../features/screening/hooks/useScreenings'
import { useTheme, type AppColors } from '../../../src/context/ThemeContext'
import { font } from '../../../src/theme/typography'
import { apiErrorCode, apiErrorMessage, apiErrorStatus } from '../../../src/utils/error'

/**
 * Owner booking wizard. Entry is scan-only: the fresh scan result screen is
 * the sole place the Book Appointment action lives, so this screen is opened
 * with `petId` + `screeningId` and never collects them itself.
 *
 * Steps: clinic → veterinarian → schedule → appointment details → payment
 * (payment only when the clinic charges a consultation fee).
 */
const TOTAL_STEPS = 5

const STEP_TITLES = [
  'Choose a clinic',
  'Choose your veterinarian',
  'Select a schedule',
  'Appointment details',
  'Payment',
]

/** The steps used when the clinic charges no consultation fee. */
const FREE_STEPS = STEP_TITLES.length - 1

const PAYMENT_STEP = FREE_STEPS + 1

/** Owners only ever book consultations; the type picker is gone. */
const APT_TYPE = 'CONSULTATION' as const

/** Owners can never record cash, so it is never offered here. */
const OWNER_METHODS: Array<{ value: PaymentMethod; label: string }> = [
  { value: 'GCASH', label: 'GCash' },
  { value: 'CARD', label: 'Card' },
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

  const params = useLocalSearchParams<{ petId?: string; screeningId?: string }>()
  const petId = params.petId ?? ''
  const screeningId = params.screeningId ?? ''
  // The wizard only opens from a scan result, which passes both ids.
  const hasBookingContext = !!petId && !!screeningId

  const [step, setStep] = useState(1)
  const [clinicId, setClinicId] = useState<string | null>(null)
  const [clinicName, setClinicName] = useState<string | null>(null)
  const days = useMemo(() => buildDays(14), [])
  const [date, setDate] = useState<string>(days[0].iso)
  const [vetId, setVetId] = useState<string | null>(null)
  const [vetName, setVetName] = useState<string | null>(null)
  const [slot, setSlot] = useState<OwnerSlot | null>(null)
  const [reason, setReason] = useState('')
  // Payment state. The server owns the amount; the app only owns the flow.
  const [method, setMethod] = useState<PaymentMethod>('GCASH')
  const [checkout, setCheckout] = useState<Payment | null>(null)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  // Set when the booking endpoint reports a fee the clinic list did not show.
  const [feeRequired, setFeeRequired] = useState(false)
  const bookingInFlight = useRef(false)

  const { data: clinics = [], isLoading: clinicsLoading, isError: clinicsError } = useClinics()
  // No date here: the veterinarian is picked before the schedule, so the
  // backend lists every active vet at the clinic (available_count is null).
  const { data: vets = [], isLoading: vetsLoading, isError: vetsError } = useVets(
    clinicId ?? undefined,
  )
  // Used for the soft same-clinic duplicate warning when a clinic is picked.
  const { data: myAppointmentsData } = useMyAppointments()
  const { data: slots = [], isLoading: slotsLoading, isError: slotsError } = useSlots(
    vetId ?? undefined,
    step >= 3 ? date : undefined,
  )
  const {
    data: screenings,
    isLoading: screeningsLoading,
  } = useScreenings(hasBookingContext ? petId : undefined)
  const bookAppointment = useBookAppointment()
  const createCheckout = useCreateCheckout()
  const cancelPayment = useCancelPayment()

  // Display data for the attached scan; the server re-validates it anyway.
  const screening = useMemo(
    () =>
      screeningId && screenings
        ? screenings.results.find((current) => current.ais_id === screeningId) ?? null
        : null,
    [screenings, screeningId],
  )
  // The attached scan vanished (or never belonged to this pet): no booking
  // can be recorded without a scan, so send the owner back to the scanner.
  const screeningMissing =
    hasBookingContext && !screeningsLoading && !!screenings && !screening

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

  function handleGoScan() {
    router.replace(
      petId ? `/(owner)/pets/screening?petId=${petId}` : '/(owner)/pets/screening',
    )
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

    // Soft guard: the pet may already have a live appointment at this clinic.
    // The owner can override — the booking API itself stays permissive.
    const conflict = findConflictingAppointment(
      myAppointmentsData?.results ?? [],
      petId,
      clinic.cln_id,
    )
    if (conflict) {
      const when = new Date(conflict.apt_scheduled_at).toLocaleString(undefined, {
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
      })
      Alert.alert(
        'Pet already booked',
        `${screening?.pet_name ?? 'Your pet'} already has an upcoming appointment at ${clinic.cln_name} on ${when}${conflict.vet_name ? ` with ${conflict.vet_name}` : ''}. Book another consultation anyway?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Book anyway', onPress: () => setStep(2) },
        ],
      )
      return
    }
    setStep(2)
  }

  function selectVet(vet: { stf_id: string; full_name: string }) {
    if (vet.stf_id !== vetId) {
      setVetId(vet.stf_id)
      setVetName(vet.full_name)
      setSlot(null)
    }
    setStep(3)
  }

  function selectDate(iso: string) {
    if (iso !== date) {
      setDate(iso)
      setSlot(null)
    }
  }

  function selectSlot(selected: OwnerSlot) {
    setSlot(selected)
    setStep(4)
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
      setStep(3)
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
      case 'SCREENING_REQUIRED': {
        // The scan is gone or invalid: booking only exists downstream of a
        // scan, so return the owner to the scanner instead of a dead step.
        Alert.alert('Skin scan needed', detail)
        handleGoScan()
        return
      }
      default:
        Alert.alert('Booking failed', detail)
    }
  }

  function handleBook(explicitPayId?: string, options?: { feeWaived?: boolean }) {
    if (!petId || !slot || !screeningId || bookingInFlight.current) return

    // A payment that already settled funds whichever slot is picked next.
    const payId = explicitPayId ?? (payment?.status === 'PAID' ? payment.pay_id : undefined)

    // Never call the booking API without a settled payment when the clinic
    // charges a fee — the server would refuse it anyway (PAYMENT_REQUIRED),
    // so return to the payment step instead of recording a failed attempt.
    // `feeWaived` is set only when the server itself just reported that this
    // clinic no longer requires payment.
    if (requiresPayment && !payId && !options?.feeWaived) {
      setFeeRequired(true)
      setPaymentError(null)
      setStep(PAYMENT_STEP)
      return
    }

    bookingInFlight.current = true

    bookAppointment.mutate(
      {
        pet_id: petId,
        slot_id: slot.vsl_id,
        apt_type: APT_TYPE,
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
    if (!petId || !slot) return
    setPaymentError(null)

    createCheckout.mutate(
      {
        pet_id: petId,
        slot_id: slot.vsl_id,
        apt_type: APT_TYPE,
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
            handleBook(undefined, { feeWaived: true })
            return
          }
          if (code === 'SLOT_UNAVAILABLE' || (code === null && apiErrorStatus(error) === 409)) {
            Alert.alert('Time slot taken', 'Pick another slot and try again.')
            setStep(3)
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
    (step === 2 && !!vetId) ||
    (step === 3 && !!slot) ||
    (step === 4 && !!slot)

  // No scan context (stale link, or the scan disappeared): booking cannot
  // exist without one, so offer the scanner instead of an empty wizard.
  if (!hasBookingContext || screeningMissing) {
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

        <View style={styles.guardWrap}>
          <View style={styles.blockCard}>
            <View style={styles.blockIcon}>
              <MaterialCommunityIcons color={colors.primary} name="calendar-search" size={28} />
            </View>
            <Text style={styles.blockTitle}>Skin scan required</Text>
            <Text style={styles.blockText}>
              Booking starts from a skin screening result. Run a scan for your pet to continue.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={handleGoScan}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Start a skin screening</Text>
            </Pressable>
          </View>
        </View>
      </View>
    )
  }

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
          <View style={styles.stepper}>
            {Array.from({ length: totalSteps }).map((_, index) => {
              const position = index + 1
              const isDone = position < Math.min(step, totalSteps)
              const isCurrent = position === Math.min(step, totalSteps)
              return (
                <Fragment key={position}>
                  <View
                    style={[
                      styles.stepDot,
                      isDone && styles.stepDotDone,
                      isCurrent && styles.stepDotCurrent,
                    ]}
                  >
                    {isDone ? (
                      <Ionicons color={colors.inverse} name="checkmark" size={14} />
                    ) : (
                      <Text
                        style={[
                          styles.stepDotText,
                          isCurrent && styles.stepDotTextCurrent,
                          !isDone && !isCurrent && styles.stepDotTextUpcoming,
                        ]}
                      >
                        {position}
                      </Text>
                    )}
                  </View>
                  {index < totalSteps - 1 && (
                    <View style={[styles.stepLine, isDone && styles.stepLineDone]} />
                  )}
                </Fragment>
              )
            })}
          </View>
          <View style={styles.stepHeading}>
            <Text style={styles.stepTitle}>{STEP_TITLES[step - 1]}</Text>
            <Text style={styles.stepLabel}>
              Step {Math.min(step, totalSteps)} of {totalSteps}
            </Text>
          </View>
        </View>

        {step === 1 && (
          <View style={styles.list}>
            {clinicsLoading ? (
              <View style={styles.stateBox}><ActivityIndicator color={colors.primary} /></View>
            ) : clinicsError ? (
              <Text style={styles.statusText}>We couldn&apos;t load clinics. Please try again.</Text>
            ) : clinics.length > 0 ? (
              <>
                {/* Map of geocoded clinics above the list; tapping a pin runs
                    the same selection path as tapping the list row. Clinics
                    without coordinates simply have no pin but stay listed. */}
                <ClinicMap
                  clinics={clinics}
                  selectedClinicId={clinicId}
                  onSelect={(clinicIdToSelect) => {
                    const clinic = clinics.find((current) => current.cln_id === clinicIdToSelect)
                    if (clinic) selectClinic(clinic)
                  }}
                />
                {clinics.map((clinic) => {
                  const selected = clinicId === clinic.cln_id
                  return (
                    <Pressable
                      key={clinic.cln_id}
                      accessibilityRole="button"
                      onPress={() => selectClinic(clinic)}
                      style={[styles.optionCard, selected && styles.optionCardSelected]}
                    >
                      <ClinicLogo logoUrl={clinic.cln_logo_url} />
                      <View style={styles.optionBody}>
                        <Text style={styles.optionTitle}>{clinic.cln_name}</Text>
                        {clinic.cln_address ? (
                          <Text numberOfLines={1} style={styles.optionSubtitle}>{clinic.cln_address}</Text>
                        ) : null}
                      </View>
                      <View style={[styles.optionCheck, selected && styles.optionCheckOn]}>
                        {selected ? (
                          <Ionicons color={colors.inverse} name="checkmark" size={13} />
                        ) : null}
                      </View>
                    </Pressable>
                  )
                })}
              </>
            ) : (
              <View style={styles.stateBox}>
                <Text style={styles.statusText}>No clinics available for online booking.</Text>
              </View>
            )}
          </View>
        )}

        {step === 2 && (
          <View style={styles.list}>
            {vetsLoading ? (
              <View style={styles.stateBox}><ActivityIndicator color={colors.primary} /></View>
            ) : vetsError ? (
              <Text style={styles.statusText}>We couldn&apos;t load veterinarians. Please try again.</Text>
            ) : vets.length > 0 ? (
              vets.map((vet) => {
                const selected = vetId === vet.stf_id
                return (
                  <Pressable
                    key={vet.stf_id}
                    accessibilityRole="button"
                    onPress={() => selectVet(vet)}
                    style={[styles.optionCard, selected && styles.optionCardSelected]}
                  >
                    <View style={styles.optionIcon}>
                      <MaterialCommunityIcons color={colors.primary} name="stethoscope" size={20} />
                    </View>
                    <View style={styles.optionBody}>
                      <Text style={styles.optionTitle}>{vet.full_name}</Text>
                      {vet.available_count !== null ? (
                        <Text style={styles.optionSubtitle}>
                          {vet.available_count} slot{vet.available_count === 1 ? '' : 's'} available
                        </Text>
                      ) : null}
                    </View>
                    <View style={[styles.optionCheck, selected && styles.optionCheckOn]}>
                      {selected ? (
                        <Ionicons color={colors.inverse} name="checkmark" size={13} />
                      ) : null}
                    </View>
                  </Pressable>
                )
              })
            ) : (
              <View style={styles.stateBox}>
                <Text style={styles.statusText}>
                  No veterinarians are listed at this clinic right now. Try another clinic.
                </Text>
              </View>
            )}
          </View>
        )}

        {step === 3 && (
          <View style={styles.list}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dayRow}
            >
              {days.map((day) => {
                const selected = date === day.iso
                return (
                  <Pressable
                    key={day.iso}
                    accessibilityRole="button"
                    onPress={() => selectDate(day.iso)}
                    style={[styles.dayChip, selected && styles.dayChipSelected]}
                  >
                    <Text style={[styles.dayWeekday, selected && styles.dayChipTextSelected]}>
                      {day.weekday}
                    </Text>
                    <Text style={[styles.dayNumber, selected && styles.dayChipTextSelected]}>
                      {day.day}
                    </Text>
                    <Text style={[styles.dayMonth, selected && styles.dayChipTextSelected]}>
                      {day.month}
                    </Text>
                  </Pressable>
                )
              })}
            </ScrollView>

            {slotsLoading ? (
              <View style={styles.stateBox}><ActivityIndicator color={colors.primary} /></View>
            ) : slotsError ? (
              <Text style={styles.statusText}>We couldn&apos;t load time slots. Please try again.</Text>
            ) : slots.length > 0 ? (
              <View style={styles.slotGrid}>
                {slots.map((currentSlot) => {
                  const selected = slot?.vsl_id === currentSlot.vsl_id
                  return (
                    <Pressable
                      key={currentSlot.vsl_id}
                      accessibilityRole="button"
                      onPress={() => selectSlot(currentSlot)}
                      style={[styles.slotChip, selected && styles.slotChipSelected]}
                    >
                      <Text style={[styles.slotText, selected && styles.slotTextSelected]}>
                        {formatTime(currentSlot.vsl_start_time)}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            ) : (
              <View style={styles.stateBox}>
                <Text style={styles.statusText}>
                  No free slots with this veterinarian on this date. Try another day or go back to
                  pick a different veterinarian.
                </Text>
              </View>
            )}
          </View>
        )}

        {step === 4 && (
          <View style={styles.list}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Booking summary</Text>
              <View style={styles.summaryDivider} />
              <SummaryRow label="Clinic" value={clinicName ?? '—'} />
              <SummaryRow label="Pet" value={screening?.pet_name ?? 'Your pet'} />
              <SummaryRow label="Date" value={date} />
              <SummaryRow label="Veterinarian" value={vetName ?? '—'} />
              <SummaryRow label="Time" value={slot ? formatTime(slot.vsl_start_time) : '—'} />
              <SummaryRow label="Skin scan" value={screening?.disease ?? '—'} />
              {requiresPayment ? (
                <View style={styles.summaryFeeRow}>
                  <Text style={styles.summaryFeeLabel}>Consultation fee</Text>
                  <Text style={styles.summaryFeeValue}>
                    {formatMoney(consultationFee, payment?.currency ?? 'PHP')}
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Reason <Text style={styles.fieldOptional}>(optional)</Text></Text>
              <TextInput
                accessibilityLabel="Reason for the appointment"
                multiline
                onChangeText={setReason}
                placeholder="Describe the reason for this visit..."
                placeholderTextColor={colors.textMuted}
                style={styles.reasonInput}
                value={reason}
              />
            </View>
            {bookAppointment.isError && (
              <Text style={styles.errorText}>Booking failed. Please try again.</Text>
            )}
          </View>
        )}

        {step === PAYMENT_STEP && (
          <View style={styles.list}>
            <View style={styles.feeCard}>
              <Text style={styles.feeLabel}>Consultation fee</Text>
              <Text style={styles.feeAmount}>
                {formatMoney(payment?.amount ?? consultationFee, payment?.currency ?? 'PHP')}
              </Text>
              <View style={styles.summaryDivider} />
              <SummaryRow label="Clinic" value={clinicName ?? '—'} />
              <SummaryRow label="Pet" value={screening?.pet_name ?? 'Your pet'} />
              <SummaryRow
                label="Date & time"
                value={`${date}${slot ? ` · ${formatTime(slot.vsl_start_time)}` : ''}`}
              />
              {payment ? <SummaryRow label="Reference" value={payment.reference_no} /> : null}
            </View>

            {!payment ||
            payment.status === 'FAILED' ||
            payment.status === 'EXPIRED' ||
            payment.status === 'VOID' ? (
              <View style={styles.methodBlock}>
                <Text style={styles.fieldLabel}>Payment method</Text>
                <View style={styles.typeRow}>
                  {OWNER_METHODS.map((ownerMethod) => {
                    const selected = method === ownerMethod.value
                    return (
                      <Pressable
                        key={ownerMethod.value}
                        accessibilityRole="button"
                        onPress={() => setMethod(ownerMethod.value)}
                        style={[styles.typeChip, selected && styles.typeChipSelected]}
                      >
                        <Text style={[styles.typeText, selected && styles.typeTextSelected]}>
                          {ownerMethod.label}
                        </Text>
                      </Pressable>
                    )
                  })}
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
                  style={styles.primaryButton}
                >
                  <Text style={styles.primaryButtonText}>Open checkout page</Text>
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
                <View style={styles.successIcon}>
                  <MaterialCommunityIcons color={colors.primary} name="check-decagram" size={28} />
                </View>
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

/** Shows a clinic logo when available, falling back to the clinic icon. */
function ClinicLogo({ logoUrl }: { logoUrl: string | null }) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [imageFailed, setImageFailed] = useState(false)

  useEffect(() => {
    setImageFailed(false)
  }, [logoUrl])

  return (
    <View style={styles.optionIcon}>
      {logoUrl && !imageFailed ? (
        <Image
          accessibilityIgnoresInvertColors
          onError={() => setImageFailed(true)}
          resizeMode="cover"
          source={{ uri: logoUrl }}
          style={styles.clinicLogoImage}
        />
      ) : (
        <MaterialCommunityIcons color={colors.primary} name="hospital-building" size={20} />
      )}
    </View>
  )
}

/** A single labelled line in a booking / payment summary card. */
function SummaryRow({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme()
  const rowStyles = useMemo(() => createSummaryRowStyles(colors), [colors])
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.label}>{label}</Text>
      <Text numberOfLines={1} style={rowStyles.value}>{value}</Text>
    </View>
  )
}

const createSummaryRowStyles = (colors: AppColors) =>
  StyleSheet.create({
    row: {
      alignItems: 'flex-start',
      flexDirection: 'row',
      gap: 12,
      justifyContent: 'space-between',
      paddingVertical: 3,
    },
    label: { ...font.medium, color: colors.textSecondary, flexShrink: 0, fontSize: 13 },
    value: {
      ...font.semibold,
      color: colors.text,
      flexShrink: 1,
      fontSize: 13,
      textAlign: 'right',
    },
  })

const createStyles = (colors: AppColors) => StyleSheet.create({
  screen: { backgroundColor: colors.bg, flex: 1 },
  header: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    height: 54,
    paddingHorizontal: 8,
  },
  headerBack: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 },
  headerTitle: { ...font.semibold, color: colors.text, flex: 1, fontSize: 17, textAlign: 'center' },
  headerRight: { width: 44 },
  content: { gap: 20, paddingBottom: 28, paddingHorizontal: 20, paddingTop: 22 },
  guardWrap: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },

  progressHeader: { gap: 16 },
  stepper: { alignItems: 'center', flexDirection: 'row' },
  stepDot: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  stepDotDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  stepDotCurrent: { backgroundColor: colors.primary, borderColor: colors.primary },
  stepDotText: { ...font.semibold, fontSize: 12 },
  stepDotTextCurrent: { color: colors.inverse },
  stepDotTextUpcoming: { color: colors.textMuted },
  stepLine: { backgroundColor: colors.border, borderRadius: 2, flex: 1, height: 2, marginHorizontal: 6 },
  stepLineDone: { backgroundColor: colors.primary },
  stepHeading: { alignItems: 'center', gap: 3 },
  stepTitle: { ...font.semibold, color: colors.text, fontSize: 18, textAlign: 'center' },
  stepLabel: { ...font.medium, color: colors.textMuted, fontSize: 12, letterSpacing: 0.3 },

  list: { gap: 12 },
  stateBox: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 16,
    borderStyle: 'dashed',
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 150,
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  statusText: { ...font.regular, color: colors.textSecondary, fontSize: 13, lineHeight: 20, textAlign: 'center' },

  optionCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    minHeight: 72,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  optionCardSelected: { backgroundColor: colors.surfaceAlt, borderColor: colors.primary },
  optionIcon: {
    alignItems: 'center',
    backgroundColor: colors.iconBg,
    borderRadius: 12,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  clinicLogoImage: { borderRadius: 12, height: '100%', width: '100%' },
  optionBody: { flex: 1, gap: 2 },
  optionTitle: { ...font.semibold, color: colors.text, fontSize: 15 },
  optionSubtitle: { ...font.regular, color: colors.textSecondary, fontSize: 12.5 },
  optionCheck: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1.5,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  optionCheckOn: { backgroundColor: colors.primary, borderColor: colors.primary },

  dayRow: { gap: 8, paddingVertical: 2 },
  dayChip: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    gap: 2,
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: 60,
  },
  dayChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayChipTextSelected: { color: colors.inverse },
  dayWeekday: { ...font.medium, color: colors.textMuted, fontSize: 10, letterSpacing: 0.4, textTransform: 'uppercase' },
  dayNumber: { ...font.semibold, color: colors.text, fontSize: 17 },
  dayMonth: { ...font.medium, color: colors.textSecondary, fontSize: 10 },

  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  slotChip: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 100,
    paddingHorizontal: 16,
  },
  slotChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  slotText: { ...font.medium, color: colors.text, fontSize: 14 },
  slotTextSelected: { color: colors.inverse },

  summaryCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    gap: 2,
    padding: 18,
  },
  summaryTitle: { ...font.semibold, color: colors.text, fontSize: 15, marginBottom: 4 },
  summaryDivider: { backgroundColor: colors.border, height: StyleSheet.hairlineWidth, marginVertical: 10 },
  summaryFeeRow: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 12,
  },
  summaryFeeLabel: { ...font.medium, color: colors.textSecondary, fontSize: 13 },
  summaryFeeValue: { ...font.semibold, color: colors.primaryDark, fontSize: 14 },

  fieldBlock: { gap: 8 },
  fieldLabel: { ...font.medium, color: colors.text, fontSize: 13.5 },
  fieldOptional: { ...font.regular, color: colors.textMuted, fontSize: 12.5 },
  reasonInput: {
    ...font.regular,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    color: colors.text,
    fontSize: 14,
    minHeight: 96,
    padding: 14,
    textAlignVertical: 'top',
  },

  feeCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    gap: 2,
    padding: 18,
  },
  feeLabel: { ...font.medium, color: colors.textSecondary, fontSize: 12.5, letterSpacing: 0.3 },
  feeAmount: { ...font.semibold, color: colors.text, fontSize: 28, marginBottom: 2 },

  methodBlock: { gap: 10 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: 18,
  },
  typeChipSelected: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  typeText: { ...font.medium, color: colors.textSecondary, fontSize: 13 },
  typeTextSelected: { ...font.semibold, color: colors.primaryDark },

  payStatusCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    padding: 20,
  },
  successIcon: {
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: 999,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  blockCard: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 20,
    borderStyle: 'dashed',
    borderWidth: 1,
    gap: 12,
    justifyContent: 'center',
    padding: 28,
  },
  blockIcon: {
    alignItems: 'center',
    backgroundColor: colors.iconBg,
    borderRadius: 999,
    height: 60,
    justifyContent: 'center',
    marginBottom: 4,
    width: 60,
  },
  blockTitle: { ...font.semibold, color: colors.text, fontSize: 16 },
  blockText: { ...font.regular, color: colors.textSecondary, fontSize: 13.5, lineHeight: 20, textAlign: 'center' },
  errorText: { ...font.medium, color: colors.error, fontSize: 12.5, lineHeight: 18 },

  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 28,
    width: '100%',
  },
  primaryButtonText: { ...font.semibold, color: colors.inverse, fontSize: 14.5 },
  secondaryButton: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 20,
    width: '100%',
  },
  secondaryButtonText: { ...font.medium, color: colors.textSecondary, fontSize: 14 },

  footer: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  backButton: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: 24,
  },
  backButtonText: { ...font.medium, color: colors.text, fontSize: 14.5 },
  nextButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 14,
    flex: 1,
    justifyContent: 'center',
    minHeight: 50,
  },
  nextButtonDisabled: { opacity: 0.45 },
  nextButtonText: { ...font.semibold, color: colors.inverse, fontSize: 14.5 },
})

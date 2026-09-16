import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { Alert, Modal, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native'

import { useTheme, type AppColors } from '../../../src/context/ThemeContext'
import { MOCK_CONSULTATION_DETAIL } from '../../../features/vet/data/mock'
import type { ConsultationStatus } from '../../../features/vet/types'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const STATUS_BADGE_COLORS: Record<ConsultationStatus, { bg: string; text: string }> = {
  TODAY: { bg: '#FDEBD0', text: '#E67E22' },
  UPCOMING: { bg: '#D6EAF8', text: '#2E86C1' },
  COMPLETED: { bg: '#D5F5E3', text: '#27AE60' },
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

export default function VetConsultationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { colors, isDark } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])

  const detail = MOCK_CONSULTATION_DETAIL
  const isToday = detail.status === 'TODAY'
  const statusStyle = STATUS_BADGE_COLORS[detail.status]

  const [showRescheduleConfirm, setShowRescheduleConfirm] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [showRescheduleForm, setShowRescheduleForm] = useState(false)
  const [showCancelForm, setShowCancelForm] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  const [selectedDate, setSelectedDate] = useState(new Date())
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth())
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear())
  const [rescheduleReason, setRescheduleReason] = useState('')
  const [cancelReason, setCancelReason] = useState('')

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const daysInMonth = getDaysInMonth(calendarYear, calendarMonth)
  const firstDay = getFirstDayOfMonth(calendarYear, calendarMonth)
  const calendarDays: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) calendarDays.push(null)
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i)

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

  const handleRescheduleSubmit = () => {
    if (!rescheduleReason.trim()) {
      Alert.alert('Required', 'Please enter a reason for rescheduling.')
      return
    }
    setShowRescheduleForm(false)
    setRescheduleReason('')
    setShowSuccessModal(true)
  }

  const handleCancelSubmit = () => {
    if (!cancelReason.trim()) {
      Alert.alert('Required', 'Please enter a reason for cancellation.')
      return
    }
    setShowCancelForm(false)
    setCancelReason('')
    setShowSuccessModal(true)
  }

  const isDateDisabled = (day: number) => {
    const d = new Date(calendarYear, calendarMonth, day)
    d.setHours(0, 0, 0, 0)
    return d < today
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={styles.safeArea.backgroundColor} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} style={styles.backRow}>
          <View style={styles.backLeft}>
            <MaterialCommunityIcons color={colors.text} name="chevron-left" size={22} />
            <Text style={styles.backText}>Appointment Detail</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>{detail.status}</Text>
          </View>
        </Pressable>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Date of appointment</Text>
            <Text style={styles.infoValue}>{detail.date}</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Time</Text>
            <Text style={styles.infoValue}>{detail.time}</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Pet Name</Text>
            <Text style={styles.infoValue}>{detail.pet_name}</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Breed</Text>
            <Text style={styles.infoValue}>{detail.breed}</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Age</Text>
            <Text style={styles.infoValue}>{detail.age}</Text>
          </View>
        </View>

        {detail.screening && (
          <>
            <Text style={styles.sectionTitle}>AI Screening Analysis</Text>

            <View style={styles.screeningCard}>
              <View style={styles.screeningImagePlaceholder}>
                <MaterialCommunityIcons color={colors.textMuted} name="image-outline" size={40} />
              </View>
              <Text style={styles.screeningLabel}>Final Assessment</Text>
              <Text style={styles.screeningPrediction}>{detail.screening.prediction}</Text>
              <Text style={styles.screeningDesc}>
                An allergic reaction of atopic dermatitis - a chronic allergic condition.
              </Text>
            </View>

            <Text style={styles.sectionTitle}>Follow-up answers</Text>

            {detail.screening.follow_up_answers.map((item, index) => (
              <View key={index} style={styles.followUpCard}>
                <Text style={styles.followUpQuestion}>{item.question}</Text>
                <Text style={styles.followUpAnswer}>{item.answer}</Text>
              </View>
            ))}
          </>
        )}

        {isToday && (
          <View style={styles.actionRow}>
            <Pressable style={styles.rescheduleBtn} onPress={() => setShowRescheduleConfirm(true)}>
              <Text style={styles.rescheduleText}>Reschedule</Text>
            </Pressable>
            <Pressable style={styles.cancelBtn} onPress={() => setShowCancelConfirm(true)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Reschedule Confirmation Modal */}
      <Modal visible={showRescheduleConfirm} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Request to Reschedule</Text>
            <Text style={styles.modalMessage}>Are you sure you want to reschedule this appointment?</Text>
            <View style={styles.modalActions}>
              <Pressable style={styles.modalNoBtn} onPress={() => setShowRescheduleConfirm(false)}>
                <Text style={styles.modalNoText}>No</Text>
              </Pressable>
              <Pressable style={styles.modalYesGreenBtn} onPress={() => {
                setShowRescheduleConfirm(false)
                setShowRescheduleForm(true)
              }}>
                <Text style={styles.modalYesGreenText}>Yes</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Cancel Confirmation Modal */}
      <Modal visible={showCancelConfirm} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Request for Cancellation</Text>
            <Text style={styles.modalMessage}>Are you sure you want to cancel this appointment?</Text>
            <View style={styles.modalActions}>
              <Pressable style={styles.modalNoBtn} onPress={() => setShowCancelConfirm(false)}>
                <Text style={styles.modalNoText}>No</Text>
              </Pressable>
              <Pressable style={styles.modalYesRedBtn} onPress={() => {
                setShowCancelConfirm(false)
                setShowCancelForm(true)
              }}>
                <Text style={styles.modalYesRedText}>Yes</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reschedule Form Modal */}
      <Modal visible={showRescheduleForm} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>Reschedule Appointment</Text>
              <Pressable onPress={() => { setShowRescheduleForm(false); setRescheduleReason('') }}>
                <MaterialCommunityIcons color={colors.textSecondary} name="close" size={22} />
              </Pressable>
            </View>

            <Text style={styles.formLabel}>Select New Date</Text>
            <View style={styles.calendarContainer}>
              <View style={styles.calendarNav}>
                <Pressable onPress={() => {
                  if (calendarMonth === 0) { setCalendarMonth(11); setCalendarYear(calendarYear - 1) }
                  else { setCalendarMonth(calendarMonth - 1) }
                }}>
                  <MaterialCommunityIcons color={colors.text} name="chevron-left" size={22} />
                </Pressable>
                <Text style={styles.calendarMonthTitle}>{monthNames[calendarMonth]} {calendarYear}</Text>
                <Pressable onPress={() => {
                  if (calendarMonth === 11) { setCalendarMonth(0); setCalendarYear(calendarYear + 1) }
                  else { setCalendarMonth(calendarMonth + 1) }
                }}>
                  <MaterialCommunityIcons color={colors.text} name="chevron-right" size={22} />
                </Pressable>
              </View>
              <View style={styles.weekdayRow}>
                {WEEKDAYS.map((d) => (
                  <Text key={d} style={styles.weekdayText}>{d}</Text>
                ))}
              </View>
              <View style={styles.daysGrid}>
                {calendarDays.map((day, index) => {
                  if (day === null) return <View key={`empty-${index}`} style={styles.dayCell} />
                  const d = new Date(calendarYear, calendarMonth, day)
                  d.setHours(0, 0, 0, 0)
                  const isSelected = selectedDate.getTime() === d.getTime()
                  const disabled = isDateDisabled(day)
                  return (
                    <Pressable
                      key={`day-${day}`}
                      style={styles.dayCell}
                      onPress={() => { if (!disabled) setSelectedDate(d) }}
                      disabled={disabled}
                    >
                      <View style={[isSelected && styles.daySelected, disabled && styles.dayDisabled]}>
                        <Text style={[styles.dayText, isSelected && styles.dayTextSelected, disabled && styles.dayTextDisabled]}>
                          {day}
                        </Text>
                      </View>
                    </Pressable>
                  )
                })}
              </View>
            </View>
            <Text style={styles.selectedDateText}>Selected: {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</Text>

            <Text style={styles.formLabel}>Reason for Rescheduling</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter reason..."
              placeholderTextColor={colors.textMuted}
              value={rescheduleReason}
              onChangeText={setRescheduleReason}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <View style={styles.formActions}>
              <Pressable style={styles.formCancelBtn} onPress={() => { setShowRescheduleForm(false); setRescheduleReason('') }}>
                <Text style={styles.formCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.formSubmitGreenBtn} onPress={handleRescheduleSubmit}>
                <Text style={styles.formSubmitGreenText}>Submit</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Cancel Form Modal */}
      <Modal visible={showCancelForm} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>Cancel Appointment</Text>
              <Pressable onPress={() => { setShowCancelForm(false); setCancelReason('') }}>
                <MaterialCommunityIcons color={colors.textSecondary} name="close" size={22} />
              </Pressable>
            </View>

            <Text style={styles.formLabel}>Reason for Cancellation</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter reason..."
              placeholderTextColor={colors.textMuted}
              value={cancelReason}
              onChangeText={setCancelReason}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <View style={styles.formActions}>
              <Pressable style={styles.formCancelBtn} onPress={() => { setShowCancelForm(false); setCancelReason('') }}>
                <Text style={styles.formCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.formSubmitRedBtn} onPress={handleCancelSubmit}>
                <Text style={styles.formSubmitRedText}>Submit</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.successIconContainer}>
              <MaterialCommunityIcons color="#FFFFFF" name="check" size={32} />
            </View>
            <Text style={styles.modalTitle}>Request Submitted</Text>
            <Text style={styles.modalMessage}>Your request has been submitted successfully. You will be notified once it is reviewed.</Text>
            <Pressable style={styles.successBtn} onPress={() => {
              setShowSuccessModal(false)
              router.push('/(vet)/consultations')
            }}>
              <Text style={styles.successBtnText}>OK</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 },

  backRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  backLeft: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { color: colors.text, fontSize: 17, fontWeight: '700' },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },

  infoCard: { backgroundColor: colors.surface, borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.borderLight },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  infoLabel: { color: colors.textSecondary, fontSize: 14, fontWeight: '500' },
  infoValue: { color: colors.text, fontSize: 14, fontWeight: '700' },
  infoDivider: { height: 1, backgroundColor: colors.border },

  actionRow: { flexDirection: 'row', gap: 12, marginTop: 10, marginBottom: 10 },
  rescheduleBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 10, backgroundColor: '#27AE60' },
  rescheduleText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  cancelBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 10, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.borderLight },
  cancelText: { color: colors.textSecondary, fontSize: 14, fontWeight: '700' },

  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '700', marginBottom: 14 },

  screeningCard: { backgroundColor: colors.surface, borderRadius: 14, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: colors.borderLight },
  screeningImagePlaceholder: { alignItems: 'center', backgroundColor: colors.surfaceAlt, borderRadius: 12, height: 120, justifyContent: 'center', marginBottom: 14 },
  screeningLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 4 },
  screeningPrediction: { color: colors.primary, fontSize: 16, fontWeight: '800', marginBottom: 6 },
  screeningDesc: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },

  followUpCard: { backgroundColor: colors.surface, borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: colors.borderLight },
  followUpQuestion: { color: colors.text, fontSize: 14, fontWeight: '600', marginBottom: 6 },
  followUpAnswer: { color: colors.primary, fontSize: 14, fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  modalCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 24, width: '100%', alignItems: 'center' },
  modalTitle: { color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: 12 },
  modalMessage: { color: colors.textSecondary, fontSize: 14, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  modalActions: { flexDirection: 'row', gap: 12, width: '100%' },
  modalNoBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 10, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.borderLight },
  modalNoText: { color: colors.textSecondary, fontSize: 14, fontWeight: '700' },
  modalYesGreenBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 10, backgroundColor: '#27AE60' },
  modalYesGreenText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  modalYesRedBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 10, backgroundColor: '#E74C3C' },
  modalYesRedText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },

  formCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 24, width: '100%', maxHeight: '85%' },
  formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  formTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  formLabel: { color: colors.text, fontSize: 14, fontWeight: '700', marginBottom: 10 },

  calendarContainer: { backgroundColor: colors.surfaceAlt, borderRadius: 12, padding: 12, marginBottom: 10 },
  calendarNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  calendarMonthTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  weekdayRow: { flexDirection: 'row', marginBottom: 6 },
  weekdayText: { flex: 1, textAlign: 'center', color: colors.textSecondary, fontSize: 11, fontWeight: '600' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.28%', alignItems: 'center', paddingVertical: 4 },
  dayText: { color: colors.text, fontSize: 13, fontWeight: '500' },
  daySelected: { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  dayTextSelected: { color: '#FFFFFF', fontWeight: '700' },
  dayDisabled: { opacity: 0.3 },
  dayTextDisabled: { color: colors.textMuted },
  selectedDateText: { color: colors.primary, fontSize: 13, fontWeight: '600', marginBottom: 16 },

  textInput: { backgroundColor: colors.surfaceAlt, borderRadius: 12, borderWidth: 1, borderColor: colors.borderLight, padding: 14, color: colors.text, fontSize: 14, minHeight: 80, marginBottom: 20 },

  formActions: { flexDirection: 'row', gap: 12 },
  formCancelBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 10, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.borderLight },
  formCancelText: { color: colors.textSecondary, fontSize: 14, fontWeight: '700' },
  formSubmitGreenBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 10, backgroundColor: '#27AE60' },
  formSubmitGreenText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  formSubmitRedBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 10, backgroundColor: '#E74C3C' },
  formSubmitRedText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },

  successIconContainer: { alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: 28, backgroundColor: '#27AE60', marginBottom: 16 },
  successBtn: { width: '100%', alignItems: 'center', paddingVertical: 12, borderRadius: 10, backgroundColor: '#27AE60' },
  successBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
})

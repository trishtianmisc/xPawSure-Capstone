import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { ActivityIndicator, Alert, Modal, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native'

import { useTheme, type AppColors } from '../../../src/context/ThemeContext'
import { useVetAppointment } from '../../../features/vet/hooks/useVetAppointment'
import { useRequestVetCancel } from '../../../features/vet/hooks/useRequestVetCancel'
import { useRequestVetReschedule } from '../../../features/vet/hooks/useRequestVetReschedule'
import { ageFromBirthDate, formatShortDate, formatTime } from '../../../features/vet/lib/format'
import type { AppointmentStatus } from '../../../features/vet/types'
import { apiErrorMessage } from '../../../src/utils/error'

const STATUS_BADGE_COLORS: Record<AppointmentStatus, { bg: string; text: string }> = {
  PENDING: { bg: '#FDEBD0', text: '#E67E22' },
  CONFIRMED: { bg: '#D5F5E3', text: '#27AE60' },
  CHECKED_IN: { bg: '#FCF3CF', text: '#B7950B' },
  IN_PROGRESS: { bg: '#E8DAEF', text: '#6C3483' },
  COMPLETED: { bg: '#D6EAF8', text: '#2E86C1' },
  CANCELLED: { bg: '#FADBD8', text: '#E74C3C' },
  NO_SHOW: { bg: '#FADBD8', text: '#E74C3C' },
}

export default function VetConsultationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { colors, isDark } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])

  const { data: detail, isLoading, isError } = useVetAppointment(id)
  const requestReschedule = useRequestVetReschedule()
  const requestCancel = useRequestVetCancel()

  const [showRescheduleForm, setShowRescheduleForm] = useState(false)
  const [showCancelForm, setShowCancelForm] = useState(false)
  const [showRescheduleReview, setShowRescheduleReview] = useState(false)
  const [showCancelReview, setShowCancelReview] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [rescheduleReason, setRescheduleReason] = useState('')
  const [cancelReason, setCancelReason] = useState('')

  const canRequest =
    detail?.apt_status === 'CONFIRMED' &&
    !detail.apt_reschedule_request_reason &&
    !detail.apt_cancellation_request_reason
  const requesting = requestReschedule.isPending || requestCancel.isPending

  const handleRescheduleContinue = () => {
    if (!rescheduleReason.trim()) {
      Alert.alert('Required', 'Please enter a reason for rescheduling.')
      return
    }
    setShowRescheduleForm(false)
    setShowRescheduleReview(true)
  }

  const confirmReschedule = () => {
    if (!detail) return
    requestReschedule.mutate(
      { aptId: detail.apt_id, reason: rescheduleReason.trim() },
      {
        onSuccess: () => {
          setShowRescheduleReview(false)
          setRescheduleReason('')
          setShowSuccessModal(true)
        },
        onError: (error) => Alert.alert('Request failed', apiErrorMessage(error)),
      },
    )
  }

  const handleCancelContinue = () => {
    if (!cancelReason.trim()) {
      Alert.alert('Required', 'Please enter a reason for cancellation.')
      return
    }
    setShowCancelForm(false)
    setShowCancelReview(true)
  }

  const confirmCancel = () => {
    if (!detail) return
    requestCancel.mutate(
      { aptId: detail.apt_id, reason: cancelReason.trim() },
      {
        onSuccess: () => {
          setShowCancelReview(false)
          setCancelReason('')
          setShowSuccessModal(true)
        },
        onError: (error) => Alert.alert('Request failed', apiErrorMessage(error)),
      },
    )
  }

  const statusStyle = detail ? STATUS_BADGE_COLORS[detail.apt_status] : STATUS_BADGE_COLORS.PENDING

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={styles.safeArea.backgroundColor} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} style={styles.backRow}>
          <View style={styles.backLeft}>
            <MaterialCommunityIcons color={colors.text} name="chevron-left" size={22} />
            <Text style={styles.backText}>Appointment Detail</Text>
          </View>
          {detail && (
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
              <Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>{detail.apt_status}</Text>
            </View>
          )}
        </Pressable>

        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={styles.loading} />
        ) : isError || !detail ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Unable to load this appointment.</Text>
          </View>
        ) : (
          <>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Date of appointment</Text>
                <Text style={styles.infoValue}>{formatShortDate(detail.apt_scheduled_at)}</Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Time</Text>
                <Text style={styles.infoValue}>{formatTime(detail.apt_scheduled_at)}</Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Pet Name</Text>
                <Text style={styles.infoValue}>{detail.pet_name}</Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Breed</Text>
                <Text style={styles.infoValue}>{detail.pet_breed ?? '—'}</Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Age</Text>
                <Text style={styles.infoValue}>{ageFromBirthDate(detail.pet_birth_date)}</Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Owner</Text>
                <Text style={styles.infoValue}>{detail.owner_name ?? '—'}</Text>
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
                  <Text style={styles.screeningPrediction}>{detail.screening.disease}</Text>
                  <Text style={styles.screeningDesc}>
                    {Math.round(Number(detail.screening.ais_confidence))}% confidence · Model{' '}
                    {detail.screening.ais_model_version}
                  </Text>
                </View>
              </>
            )}

            {(detail.apt_reschedule_request_reason || detail.apt_cancellation_request_reason) && (
              <View style={styles.requestCard}>
                {detail.apt_reschedule_request_reason && (
                  <Text style={styles.requestText}>
                    Reschedule request: {detail.apt_reschedule_request_reason}
                  </Text>
                )}
                {detail.apt_cancellation_request_reason && (
                  <Text style={styles.requestText}>
                    Cancellation request: {detail.apt_cancellation_request_reason}
                  </Text>
                )}
              </View>
            )}

            {canRequest && (
              <View style={styles.actionRow}>
                <Pressable
                  style={styles.rescheduleBtn}
                  onPress={() => {
                    setRescheduleReason('')
                    setShowRescheduleForm(true)
                  }}
                >
                  <Text style={styles.rescheduleText}>Reschedule</Text>
                </Pressable>
                <Pressable
                  style={styles.cancelBtn}
                  onPress={() => {
                    setCancelReason('')
                    setShowCancelForm(true)
                  }}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
              </View>
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Reschedule Review Modal */}
      <Modal visible={showRescheduleReview} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Submit reschedule request?</Text>
            <Text style={styles.modalMessage}>
              You&apos;re requesting to reschedule {detail?.pet_name} on{' '}
              {detail ? formatShortDate(detail.apt_scheduled_at) : ''} at{' '}
              {detail ? formatTime(detail.apt_scheduled_at) : ''}. The appointment stays Confirmed
              until clinic staff reviews this request.
            </Text>
            <View style={styles.reasonEcho}>
              <Text style={styles.reasonEchoLabel}>Reason</Text>
              <Text style={styles.reasonEchoText}>{rescheduleReason.trim()}</Text>
            </View>
            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalNoBtn}
                onPress={() => {
                  setShowRescheduleReview(false)
                  setShowRescheduleForm(true)
                }}
                disabled={requesting}
              >
                <Text style={styles.modalNoText}>Go Back</Text>
              </Pressable>
              <Pressable style={styles.modalYesGreenBtn} onPress={confirmReschedule} disabled={requesting}>
                <Text style={styles.modalYesGreenText}>{requesting ? 'Submitting...' : 'Submit Request'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Cancel Review Modal */}
      <Modal visible={showCancelReview} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Submit cancellation request?</Text>
            <Text style={styles.modalMessage}>
              You&apos;re requesting to cancel {detail?.pet_name} on{' '}
              {detail ? formatShortDate(detail.apt_scheduled_at) : ''} at{' '}
              {detail ? formatTime(detail.apt_scheduled_at) : ''}. The appointment stays Confirmed
              until clinic staff reviews this request.
            </Text>
            <View style={styles.reasonEcho}>
              <Text style={styles.reasonEchoLabel}>Reason</Text>
              <Text style={styles.reasonEchoText}>{cancelReason.trim()}</Text>
            </View>
            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalNoBtn}
                onPress={() => {
                  setShowCancelReview(false)
                  setShowCancelForm(true)
                }}
                disabled={requesting}
              >
                <Text style={styles.modalNoText}>Go Back</Text>
              </Pressable>
              <Pressable style={styles.modalYesRedBtn} onPress={confirmCancel} disabled={requesting}>
                <Text style={styles.modalYesRedText}>
                  {requesting ? 'Submitting...' : 'Submit Cancellation Request'}
                </Text>
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
              <Pressable style={styles.formSubmitGreenBtn} onPress={handleRescheduleContinue} disabled={requesting}>
                <Text style={styles.formSubmitGreenText}>Continue</Text>
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
              <Pressable style={styles.formSubmitRedBtn} onPress={handleCancelContinue} disabled={requesting}>
                <Text style={styles.formSubmitRedText}>Continue</Text>
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
  backText: { ...font.bold, color: colors.text, fontSize: 17 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusBadgeText: { ...font.bold, fontSize: 11 },

  loading: { marginVertical: 40 },

  infoCard: { backgroundColor: colors.surface, borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.borderLight },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  infoLabel: { ...font.medium, color: colors.textSecondary, fontSize: 14 },
  infoValue: { ...font.bold, color: colors.text, fontSize: 14 },
  infoDivider: { height: 1, backgroundColor: colors.border },

  actionRow: { flexDirection: 'row', gap: 12, marginTop: 10, marginBottom: 10 },
  rescheduleBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 10, backgroundColor: '#27AE60' },
  rescheduleText: { ...font.bold, color: '#FFFFFF', fontSize: 14 },
  cancelBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 10, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.borderLight },
  cancelText: { ...font.bold, color: colors.textSecondary, fontSize: 14 },

  sectionTitle: { ...font.bold, color: colors.text, fontSize: 17, marginBottom: 14 },

  screeningCard: { backgroundColor: colors.surface, borderRadius: 14, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: colors.borderLight },
  screeningImagePlaceholder: { alignItems: 'center', backgroundColor: colors.surfaceAlt, borderRadius: 12, height: 120, justifyContent: 'center', marginBottom: 14 },
  screeningLabel: { ...font.semibold, color: colors.textSecondary, fontSize: 12, marginBottom: 4 },
  screeningPrediction: { ...font.extrabold, color: colors.primary, fontSize: 16, marginBottom: 6 },
  screeningDesc: { ...font.regular, color: colors.textSecondary, fontSize: 13, lineHeight: 18 },

  requestCard: { backgroundColor: colors.surface, borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.borderLight, gap: 6 },
  requestText: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },

  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: colors.textSecondary, fontSize: 14, textAlign: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  modalCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 24, width: '100%', alignItems: 'center' },
  modalTitle: { color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: 12 },
  modalMessage: { color: colors.textSecondary, fontSize: 14, textAlign: 'center', marginBottom: 16, lineHeight: 20 },
  reasonEcho: { width: '100%', backgroundColor: colors.surfaceAlt, borderRadius: 10, borderWidth: 1, borderColor: colors.borderLight, padding: 12, marginBottom: 20 },
  reasonEchoLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  reasonEchoText: { color: colors.text, fontSize: 14, lineHeight: 20 },
  modalActions: { flexDirection: 'row', gap: 12, width: '100%' },
  modalNoBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 10, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.borderLight },
  modalNoText: { ...font.bold, color: colors.textSecondary, fontSize: 14 },
  modalYesGreenBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 10, backgroundColor: '#27AE60' },
  modalYesGreenText: { ...font.bold, color: '#FFFFFF', fontSize: 14 },
  modalYesRedBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 10, backgroundColor: '#E74C3C' },
  modalYesRedText: { ...font.bold, color: '#FFFFFF', fontSize: 14 },

  formCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 24, width: '100%', maxHeight: '85%' },
  formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  formTitle: { ...font.extrabold, color: colors.text, fontSize: 18 },
  formLabel: { ...font.bold, color: colors.text, fontSize: 14, marginBottom: 10 },

  textInput: { backgroundColor: colors.surfaceAlt, borderRadius: 12, borderWidth: 1, borderColor: colors.borderLight, padding: 14, color: colors.text, fontSize: 14, minHeight: 80, marginBottom: 20 },

  formActions: { flexDirection: 'row', gap: 12 },
  formCancelBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 10, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.borderLight },
  formCancelText: { ...font.bold, color: colors.textSecondary, fontSize: 14 },
  formSubmitGreenBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 10, backgroundColor: '#27AE60' },
  formSubmitGreenText: { ...font.bold, color: '#FFFFFF', fontSize: 14 },
  formSubmitRedBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 10, backgroundColor: '#E74C3C' },
  formSubmitRedText: { ...font.bold, color: '#FFFFFF', fontSize: 14 },

  successIconContainer: { alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: 28, backgroundColor: '#27AE60', marginBottom: 16 },
  successBtn: { width: '100%', alignItems: 'center', paddingVertical: 12, borderRadius: 10, backgroundColor: '#27AE60' },
  successBtnText: { ...font.bold, color: '#FFFFFF', fontSize: 14 },
})

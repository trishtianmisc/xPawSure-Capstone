import { MaterialCommunityIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ActivityIndicator, Modal, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native'
import { useEffect, useMemo, useState } from 'react'

import { useAuth } from '../../../src/context/AuthContext'
import { useTheme, type AppColors } from '../../../src/context/ThemeContext'
import { getProfile, updateProfile } from '../../../src/services/auth'
import { font } from '../../../src/theme/typography'
import { apiErrorMessage } from '../../../src/utils/error'

type FormState = {
  first_name: string
  last_name: string
  phone: string
  email: string
  clinic_name: string
  position: string
  license_number: string
  license_expiration_date: string
}

const INITIAL_FORM: FormState = {
  first_name: '',
  last_name: '',
  phone: '',
  email: '',
  clinic_name: '',
  position: '',
  license_number: '',
  license_expiration_date: '',
}

const POSITION_LABELS: Record<string, string> = {
  CLINIC_ADMIN: 'Clinic Admin',
  VETERINARIAN: 'Veterinarian',
  RECEPTIONIST: 'Receptionist',
}

export default function VetProfileScreen() {
  const { user, signOut, refreshUser } = useAuth()
  const { colors, isDark, toggleTheme } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])

  const [form, setForm] = useState<FormState>({
    ...INITIAL_FORM,
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    phone: user?.phone || '',
    email: user?.email || '',
    clinic_name: user?.clinic_name || '',
  })

  const [isEditing, setIsEditing] = useState(false)
  const [originalForm, setOriginalForm] = useState<FormState>(form)
  const [showSaveConfirm, setShowSaveConfirm] = useState(false)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true

    getProfile()
      .then((profile) => {
        if (!isActive) return

        const next: FormState = {
          first_name: profile.first_name || '',
          last_name: profile.last_name || '',
          phone: profile.phone || '',
          email: profile.email || '',
          clinic_name: profile.clinic_name || '',
          position: profile.position || '',
          license_number: profile.license_number || '',
          license_expiration_date: profile.license_expiration_date || '',
        }

        setForm(next)
        setOriginalForm(next)
      })
      .catch(() => {})

    return () => {
      isActive = false
    }
  }, [])

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function enterEditMode() {
    setOriginalForm({ ...form })
    setIsEditing(true)
  }

  function handlePencilPress() {
    if (isEditing) {
      setShowDiscardConfirm(true)
    } else {
      enterEditMode()
    }
  }

  function handleSave() {
    setSaveError(null)
    setShowSaveConfirm(true)
  }

  async function confirmSave() {
    const firstName = form.first_name.trim()
    const lastName = form.last_name.trim()

    if (!firstName || !lastName) {
      setSaveError('First name and last name are required.')
      return
    }

    setSaveError(null)
    setIsSaving(true)

    try {
      const updated = await updateProfile({
        first_name: firstName,
        last_name: lastName,
        phone: form.phone.trim(),
      })

      const next: FormState = {
        first_name: updated.first_name || firstName,
        last_name: updated.last_name || lastName,
        phone: updated.phone || form.phone.trim(),
        email: updated.email || form.email,
        clinic_name: updated.clinic_name || form.clinic_name,
        position: updated.position || form.position,
        license_number: updated.license_number || form.license_number,
        license_expiration_date: updated.license_expiration_date || form.license_expiration_date,
      }

      setForm(next)
      setOriginalForm(next)
      setShowSaveConfirm(false)
      setIsEditing(false)
      setShowSuccessModal(true)
      await refreshUser()
    } catch (error) {
      setSaveError(apiErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  function handleCancel() {
    const hasChanges = Object.keys(form).some(
      (key) => form[key as keyof FormState] !== originalForm[key as keyof FormState],
    )
    if (hasChanges) {
      setShowDiscardConfirm(true)
    } else {
      setIsEditing(false)
    }
  }

  function confirmDiscard() {
    setForm({ ...originalForm })
    setShowDiscardConfirm(false)
    setIsEditing(false)
  }

  function displayValue(value: string) {
    return value.trim() || 'N/A'
  }

  function displayPosition(value: string) {
    return value.trim() ? (POSITION_LABELS[value] ?? value) : 'N/A'
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={styles.safeArea.backgroundColor} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Profile Information</Text>

        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <MaterialCommunityIcons color={colors.primary} name="account-circle" size={56} />
          </View>
          <Pressable
            accessibilityLabel={isEditing ? 'Discard profile edits' : 'Edit profile'}
            style={styles.editAvatarBtn}
            onPress={handlePencilPress}
          >
            <MaterialCommunityIcons color={colors.inverse} name="pencil" size={12} />
          </Pressable>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.label}>First Name</Text>
          {isEditing ? (
            <TextInput
              style={styles.input}
              value={form.first_name}
              onChangeText={(v) => handleChange('first_name', v)}
              placeholder="First Name"
              placeholderTextColor={colors.textMuted}
            />
          ) : (
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={displayValue(form.first_name)}
              editable={false}
              placeholderTextColor={colors.textMuted}
            />
          )}

          <Text style={styles.label}>Last Name</Text>
          {isEditing ? (
            <TextInput
              style={styles.input}
              value={form.last_name}
              onChangeText={(v) => handleChange('last_name', v)}
              placeholder="Last Name"
              placeholderTextColor={colors.textMuted}
            />
          ) : (
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={displayValue(form.last_name)}
              editable={false}
              placeholderTextColor={colors.textMuted}
            />
          )}

          <Text style={styles.label}>Phone Number</Text>
          {isEditing ? (
            <TextInput
              style={styles.input}
              value={form.phone}
              onChangeText={(v) => handleChange('phone', v)}
              placeholder="+63 9XX XXX XXXX"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
            />
          ) : (
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={displayValue(form.phone)}
              editable={false}
              placeholderTextColor={colors.textMuted}
            />
          )}

          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={[styles.input, styles.inputDisabled]}
            value={displayValue(form.email)}
            editable={false}
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.label}>Associated Clinic</Text>
          <TextInput
            style={[styles.input, styles.inputDisabled]}
            value={displayValue(form.clinic_name)}
            editable={false}
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.label}>Position</Text>
          <TextInput
            style={[styles.input, styles.inputDisabled]}
            value={displayPosition(form.position)}
            editable={false}
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.label}>License Number</Text>
          <TextInput
            style={[styles.input, styles.inputDisabled]}
            value={displayValue(form.license_number)}
            editable={false}
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.label}>License Expiration Date</Text>
          <TextInput
            style={[styles.input, styles.inputDisabled]}
            value={displayValue(form.license_expiration_date)}
            editable={false}
            placeholderTextColor={colors.textMuted}
          />
        </View>

        {isEditing && (
          <View style={styles.actionsRow}>
            <Pressable style={styles.cancelBtn} onPress={handleCancel}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Save</Text>
            </Pressable>
          </View>
        )}

        {!isEditing && (
          <View style={styles.actionsSection}>
            <Pressable onPress={toggleTheme} style={styles.row}>
              <MaterialCommunityIcons color={colors.text} name={isDark ? 'weather-sunny' : 'weather-night'} size={22} />
              <Text style={styles.rowText}>{isDark ? 'Light Mode' : 'Dark Mode'}</Text>
              <MaterialCommunityIcons color={colors.textSecondary} name="chevron-right" size={22} />
            </Pressable>

            <Pressable onPress={signOut} style={styles.row}>
              <MaterialCommunityIcons color={colors.error} name="logout" size={22} />
              <Text style={[styles.rowText, { color: colors.error }]}>Sign Out</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* Save Confirmation Modal */}
      <Modal visible={showSaveConfirm} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Save Changes?</Text>
            <Text style={styles.modalMessage}>Are you sure you want to save these changes to your profile?</Text>
            {saveError && <Text style={styles.modalErrorText}>{saveError}</Text>}
            <View style={styles.modalActions}>
              <Pressable
                disabled={isSaving}
                style={[styles.modalNoBtn, isSaving && styles.modalButtonDisabled]}
                onPress={() => setShowSaveConfirm(false)}
              >
                <Text style={styles.modalNoText}>Cancel</Text>
              </Pressable>
              <Pressable
                disabled={isSaving}
                style={[styles.modalYesGreenBtn, isSaving && styles.modalButtonDisabled]}
                onPress={confirmSave}
              >
                {isSaving ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalYesGreenText}>Save</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Discard Confirmation Modal */}
      <Modal visible={showDiscardConfirm} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Discard Changes?</Text>
            <Text style={styles.modalMessage}>You have unsaved changes. Are you sure you want to discard them?</Text>
            <View style={styles.modalActions}>
              <Pressable style={styles.modalNoBtn} onPress={() => setShowDiscardConfirm(false)}>
                <Text style={styles.modalNoText}>Keep Editing</Text>
              </Pressable>
              <Pressable style={styles.modalYesRedBtn} onPress={confirmDiscard}>
                <Text style={styles.modalYesRedText}>Discard</Text>
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
            <Text style={styles.modalTitle}>Saved Successfully</Text>
            <Text style={styles.modalMessage}>Your profile has been updated successfully.</Text>
            <Pressable style={styles.successBtn} onPress={() => setShowSuccessModal(false)}>
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

  title: { ...font.extrabold, color: colors.text, fontSize: 22, marginBottom: 20 },

  avatarSection: { alignItems: 'center', marginBottom: 24, position: 'relative' },
  avatar: { alignItems: 'center', backgroundColor: colors.iconBg, borderRadius: 32, height: 64, justifyContent: 'center', width: 64, overflow: 'hidden' },
  editAvatarBtn: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 10, bottom: 0, height: 20, justifyContent: 'center', position: 'absolute', right: '38%', width: 20 },

  formSection: { marginBottom: 24 },
  label: { ...font.semibold, color: colors.text, fontSize: 13, marginBottom: 6, marginTop: 14 },
  input: { ...font.regular, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 10, borderWidth: 1, color: colors.text, fontSize: 15, height: 48, paddingHorizontal: 14 },
  inputDisabled: { backgroundColor: colors.surfaceAlt, opacity: 0.7 },

  actionsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  cancelBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 10, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.borderLight },
  cancelBtnText: { ...font.bold, color: colors.textSecondary, fontSize: 14 },
  saveBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 10, backgroundColor: '#27AE60' },
  saveBtnText: { ...font.bold, color: '#FFFFFF', fontSize: 14 },

  actionsSection: { gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.borderLight },
  rowText: { ...font.medium, flex: 1, color: colors.text, fontSize: 15, marginLeft: 12 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  modalCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 24, width: '100%', alignItems: 'center' },
  modalTitle: { ...font.extrabold, color: colors.text, fontSize: 18, marginBottom: 12 },
  modalMessage: { ...font.regular, color: colors.textSecondary, fontSize: 14, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  modalErrorText: { ...font.medium, color: colors.error, fontSize: 13, marginBottom: 16, textAlign: 'center' },
  modalButtonDisabled: { opacity: 0.6 },
  modalActions: { flexDirection: 'row', gap: 12, width: '100%' },
  modalNoBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 10, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.borderLight },
  modalNoText: { ...font.bold, color: colors.textSecondary, fontSize: 14 },
  modalYesGreenBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 10, backgroundColor: '#27AE60' },
  modalYesGreenText: { ...font.bold, color: '#FFFFFF', fontSize: 14 },
  modalYesRedBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 10, backgroundColor: '#E74C3C' },
  modalYesRedText: { ...font.bold, color: '#FFFFFF', fontSize: 14 },

  successIconContainer: { alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: 28, backgroundColor: '#27AE60', marginBottom: 16 },
  successBtn: { width: '100%', alignItems: 'center', paddingVertical: 12, borderRadius: 10, backgroundColor: '#27AE60' },
  successBtnText: { ...font.bold, color: '#FFFFFF', fontSize: 14 },
})

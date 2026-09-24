import { MaterialCommunityIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Modal, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View, Image } from 'react-native'
import { useEffect, useMemo, useState } from 'react'
import * as ImagePicker from 'expo-image-picker'

import { useAuth } from '../../../src/context/AuthContext'
import { useTheme, type AppColors } from '../../../src/context/ThemeContext'
import { getProfile } from '../../../src/services/auth'

type FormState = {
  first_name: string
  last_name: string
  phone: string
  email: string
  date_of_birth: string
  address: string
  associated_clinic: string
  specialization: string
  license_number: string
}

const INITIAL_FORM: FormState = {
  first_name: '',
  last_name: '',
  phone: '',
  email: '',
  date_of_birth: '',
  address: '',
  associated_clinic: 'Escardo Paw Pet Clinic',
  specialization: '',
  license_number: '',
}

const READ_ONLY_FIELDS = ['email', 'associated_clinic']

export default function VetProfileScreen() {
  const { user, signOut } = useAuth()
  const { colors, isDark, toggleTheme } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])

  const [form, setForm] = useState<FormState>({
    ...INITIAL_FORM,
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    phone: user?.phone || '',
    email: user?.email || '',
  })

  const [isEditing, setIsEditing] = useState(false)
  const [originalForm, setOriginalForm] = useState<FormState>(form)
  const [showSaveConfirm, setShowSaveConfirm] = useState(false)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [profileImage, setProfileImage] = useState<string | null>(null)

  useEffect(() => {
    getProfile().then((profile) => {
      setForm((prev) => ({
        ...prev,
        first_name: profile.first_name || prev.first_name,
        last_name: profile.last_name || prev.last_name,
        phone: profile.phone || prev.phone,
        email: profile.email || prev.email,
      }))
    }).catch(() => {})
  }, [])

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handlePickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) return

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })

    if (!result.canceled && result.assets[0]) {
      setProfileImage(result.assets[0].uri)
    }
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
    setShowSaveConfirm(true)
  }

  function confirmSave() {
    setShowSaveConfirm(false)
    setIsEditing(false)
    setShowSuccessModal(true)
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={styles.safeArea.backgroundColor} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Profile Information</Text>

        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.avatarImage} />
            ) : (
              <MaterialCommunityIcons color={colors.primary} name="account-circle" size={56} />
            )}
          </View>
          {isEditing ? (
            <Pressable style={styles.editAvatarBtn} onPress={handlePickImage}>
              <MaterialCommunityIcons color={colors.inverse} name="plus" size={12} />
            </Pressable>
          ) : (
            <Pressable style={styles.editAvatarBtn} onPress={handlePencilPress}>
              <MaterialCommunityIcons color={colors.inverse} name="pencil" size={12} />
            </Pressable>
          )}
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

          <Text style={styles.label}>Date of Birth</Text>
          {isEditing ? (
            <TextInput
              style={styles.input}
              value={form.date_of_birth}
              onChangeText={(v) => handleChange('date_of_birth', v)}
              placeholder="mm/dd/yyyy"
              placeholderTextColor={colors.textMuted}
            />
          ) : (
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={displayValue(form.date_of_birth)}
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

          <Text style={styles.label}>Address</Text>
          {isEditing ? (
            <TextInput
              style={styles.input}
              value={form.address}
              onChangeText={(v) => handleChange('address', v)}
              placeholder="Enter your address"
              placeholderTextColor={colors.textMuted}
            />
          ) : (
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={displayValue(form.address)}
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
            value={displayValue(form.associated_clinic)}
            editable={false}
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.label}>Specialization</Text>
          {isEditing ? (
            <TextInput
              style={styles.input}
              value={form.specialization}
              onChangeText={(v) => handleChange('specialization', v)}
              placeholder="e.g. Dermatology"
              placeholderTextColor={colors.textMuted}
            />
          ) : (
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={displayValue(form.specialization)}
              editable={false}
              placeholderTextColor={colors.textMuted}
            />
          )}

          <Text style={styles.label}>License Number</Text>
          {isEditing ? (
            <TextInput
              style={styles.input}
              value={form.license_number}
              onChangeText={(v) => handleChange('license_number', v)}
              placeholder="Enter license number"
              placeholderTextColor={colors.textMuted}
            />
          ) : (
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={displayValue(form.license_number)}
              editable={false}
              placeholderTextColor={colors.textMuted}
            />
          )}
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
            <View style={styles.modalActions}>
              <Pressable style={styles.modalNoBtn} onPress={() => setShowSaveConfirm(false)}>
                <Text style={styles.modalNoText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalYesGreenBtn} onPress={confirmSave}>
                <Text style={styles.modalYesGreenText}>Save</Text>
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

  title: { color: colors.text, fontSize: 22, fontWeight: '800', marginBottom: 20 },

  avatarSection: { alignItems: 'center', marginBottom: 24, position: 'relative' },
  avatar: { alignItems: 'center', backgroundColor: colors.iconBg, borderRadius: 32, height: 64, justifyContent: 'center', width: 64, overflow: 'hidden' },
  avatarImage: { width: 64, height: 64, borderRadius: 32 },
  editAvatarBtn: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 10, bottom: 0, height: 20, justifyContent: 'center', position: 'absolute', right: '38%', width: 20 },

  formSection: { marginBottom: 24 },
  label: { color: colors.text, fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 10, borderWidth: 1, color: colors.text, fontSize: 15, height: 48, paddingHorizontal: 14 },
  inputDisabled: { backgroundColor: colors.surfaceAlt, opacity: 0.7 },

  actionsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  cancelBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 10, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.borderLight },
  cancelBtnText: { color: colors.textSecondary, fontSize: 14, fontWeight: '700' },
  saveBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 10, backgroundColor: '#27AE60' },
  saveBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },

  actionsSection: { gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.borderLight },
  rowText: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '500', marginLeft: 12 },

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

  successIconContainer: { alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: 28, backgroundColor: '#27AE60', marginBottom: 16 },
  successBtn: { width: '100%', alignItems: 'center', paddingVertical: 12, borderRadius: 10, backgroundColor: '#27AE60' },
  successBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
})

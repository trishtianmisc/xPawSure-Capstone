import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'expo-router'
import { useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'

import { useChangePassword } from '../../../features/profile/hooks/useChangePassword'
import {
  changePasswordSchema,
  type ChangePasswordFormValues,
} from '../../../features/profile/schemas/profile'
import { useTheme, type AppColors } from '../../../src/context/ThemeContext'
import { apiErrorMessage } from '../../../src/utils/error'
import { font } from '../../../src/theme/typography'
import Ionicons from '@expo/vector-icons/build/Ionicons'

export default function ChangePasswordScreen() {
  const router = useRouter()
  const { colors } = useTheme()
  const changePassword = useChangePassword()

  const { control, handleSubmit, formState: { errors } } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      old_password: '',
      new_password: '',
      confirm_password: '',
    },
  })

  const styles = useMemo(() => createStyles(colors), [colors])

  const onSubmit = async (data: ChangePasswordFormValues) => {
    changePassword.mutate(
      { old_password: data.old_password, new_password: data.new_password },
      {
        onSuccess: () => {
          router.back()
        },
      },
    )
  }

  return (
    <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', default: undefined })} style={[styles.flex, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable style={styles.headerBack} onPress={router.back}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Change Password</Text>
          <Text style={styles.headerHint}>Your new password must be at least 8 characters</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.label}>Current Password *</Text>
          <Controller
            control={control}
            name="old_password"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                autoCapitalize="none"
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder="Enter current password"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                style={[styles.input, errors.old_password && styles.inputError]}
                value={value}
              />
            )}
          />
          {errors.old_password && <Text style={styles.fieldError}>{errors.old_password.message}</Text>}

          <Text style={styles.label}>New Password *</Text>
          <Controller
            control={control}
            name="new_password"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                autoCapitalize="none"
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder="Enter new password"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                style={[styles.input, errors.new_password && styles.inputError]}
                value={value}
              />
            )}
          />
          {errors.new_password && <Text style={styles.fieldError}>{errors.new_password.message}</Text>}

          <Text style={styles.label}>Confirm New Password *</Text>
          <Controller
            control={control}
            name="confirm_password"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                autoCapitalize="none"
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder="Re-enter new password"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                style={[styles.input, errors.confirm_password && styles.inputError]}
                value={value}
              />
            )}
          />
          {errors.confirm_password && <Text style={styles.fieldError}>{errors.confirm_password.message}</Text>}
        </View>

        <Pressable
          disabled={changePassword.isPending}
          onPress={handleSubmit(onSubmit)}
          style={[styles.submitButton, changePassword.isPending && styles.submitDisabled]}
        >
          {changePassword.isPending ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.submitText}>Update Password</Text>
          )}
        </Pressable>

        {changePassword.isError && (
          <View style={styles.apiErrorWrap}>
            <Text style={styles.apiErrorIcon}>!</Text>
            <Text style={styles.apiErrorText}>{apiErrorMessage(changePassword.error)}</Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingTop: 20, paddingBottom: 48 },
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
  header: {height: 30, marginHorizontal: 10, marginBottom: 8, marginTop: -10},
  headerBack: {
    alignItems: 'center',
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  headerTitle: { ...font.extrabold, color: colors.text, fontSize: 20, marginTop: -45, marginLeft: 60 },
  headerHint: { ...font.regular, color: colors.textSecondary, fontSize: 12, marginTop: -3, marginLeft: 60 },
  sectionTitle: { ...font.bold, color: colors.text, fontSize: 17, marginBottom: 4 },
  sectionHint: { ...font.regular, color: colors.textMuted, fontSize: 12, marginBottom: 12, marginTop: -2 },
  label: { ...font.semibold, color: colors.text, fontSize: 13, marginBottom: 6, marginTop: 16 },
  input: {
    ...font.regular,
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.text,
    fontSize: 15,
    height: 50,
    paddingHorizontal: 16,
  },
  inputError: { borderColor: colors.error },
  fieldError: { ...font.regular, color: colors.error, fontSize: 12, marginTop: 4 },
  submitButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 16,
    flexDirection: 'row',
    height: 56,
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 28,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    gap: 8,
  },
  submitDisabled: { opacity: 0.6 },
  submitText: { ...font.extrabold, color: '#FFFFFF', fontSize: 17 },
  apiErrorWrap: {
    alignItems: 'center',
    backgroundColor: colors.errorBg,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 20,
    marginTop: 16,
    padding: 14,
  },
  apiErrorIcon: {
    ...font.extrabold,
    backgroundColor: colors.error,
    borderRadius: 12,
    color: '#FFFFFF',
    fontSize: 14,
    height: 24,
    overflow: 'hidden',
    textAlign: 'center',
    width: 24,
    lineHeight: 24,
  },
  apiErrorText: { ...font.regular, color: colors.error, flex: 1, fontSize: 13 },
})

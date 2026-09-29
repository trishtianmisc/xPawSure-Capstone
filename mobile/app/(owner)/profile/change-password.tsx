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
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Change Password</Text>
          <Text style={styles.sectionHint}>Your new password must be at least 8 characters</Text>

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
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '700', marginBottom: 4 },
  sectionHint: { color: colors.textMuted, fontSize: 12, marginBottom: 12, marginTop: -2 },
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
  inputError: { borderColor: colors.error },
  fieldError: { color: colors.error, fontSize: 12, marginTop: 4 },
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
  submitText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
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

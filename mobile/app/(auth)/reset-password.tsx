import { zodResolver } from '@hookform/resolvers/zod'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { z } from 'zod'

import * as authService from '../../src/services/auth'
import { useTheme, type AppColors } from '../../src/context/ThemeContext'
import { apiErrorMessage } from '../../src/utils/error'
import { font } from '../../src/theme/typography'

const resetPasswordSchema = z
  .object({
    new_password: z.string().min(8, 'Password must be at least 8 characters'),
    confirm_password: z.string().min(1, 'Please confirm your password'),
  })
  .refine((values) => values.new_password === values.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  })

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>

export default function ResetPasswordScreen() {
  const router = useRouter()
  const { token: tokenParam } = useLocalSearchParams<{ token?: string | string[] }>()
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const token = Array.isArray(tokenParam) ? tokenParam[0] ?? '' : tokenParam ?? ''
  const [resetComplete, setResetComplete] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { new_password: '', confirm_password: '' },
  })

  const onSubmit = async ({ new_password }: ResetPasswordForm) => {
    setServerError(null)
    try {
      await authService.confirmPasswordReset(token, new_password)
      setResetComplete(true)
    } catch (error: unknown) {
      setServerError(apiErrorMessage(error))
    }
  }

  const openForgotPassword = () => router.replace('/(auth)/forgot-password')
  const openLogin = () => router.replace('/(auth)/login')

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Back to sign in"
          accessibilityRole="button"
          hitSlop={8}
          onPress={openLogin}
          style={styles.backButton}
        >
          <MaterialCommunityIcons color={colors.text} name="arrow-left" size={22} />
        </Pressable>
        <Text style={styles.headerTitle}>Reset password</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons color={colors.primary} name="lock-reset" size={30} />
        </View>
        <Text style={styles.title}>{resetComplete ? 'Password updated' : 'Choose a new password'}</Text>
        <Text style={styles.subtitle}>
          {resetComplete
            ? 'Your password has been changed. Sign in with your new password.'
            : 'Choose a password with at least 8 characters.'}
        </Text>

        {!token ? (
          <View accessibilityRole="alert" style={styles.errorBanner}>
            <MaterialCommunityIcons color={colors.error} name="alert-circle-outline" size={17} />
            <Text style={styles.errorText}>This reset link is incomplete. Request a new one.</Text>
            <Pressable accessibilityRole="button" onPress={openForgotPassword}>
              <Text style={styles.inlineLink}>Request link</Text>
            </Pressable>
          </View>
        ) : resetComplete ? (
          <Pressable accessibilityRole="button" onPress={openLogin} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Back to sign in</Text>
          </Pressable>
        ) : (
          <>
            {serverError ? (
              <View accessibilityRole="alert" style={styles.errorBanner}>
                <MaterialCommunityIcons color={colors.error} name="alert-circle-outline" size={17} />
                <Text style={styles.errorText}>{serverError}</Text>
              </View>
            ) : null}

            <Text style={styles.label}>New password</Text>
            <Controller
              control={control}
              name="new_password"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  accessibilityLabel="New password"
                  autoCapitalize="none"
                  autoComplete="new-password"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  placeholder="At least 8 characters"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry
                  style={[styles.input, errors.new_password && styles.inputError]}
                  value={value}
                />
              )}
            />
            {errors.new_password ? (
              <Text style={styles.fieldError}>{errors.new_password.message}</Text>
            ) : null}

            <Text style={[styles.label, styles.secondLabel]}>Confirm new password</Text>
            <Controller
              control={control}
              name="confirm_password"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  accessibilityLabel="Confirm new password"
                  autoCapitalize="none"
                  autoComplete="new-password"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  placeholder="Re-enter your password"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry
                  style={[styles.input, errors.confirm_password && styles.inputError]}
                  value={value}
                />
              )}
            />
            {errors.confirm_password ? (
              <Text style={styles.fieldError}>{errors.confirm_password.message}</Text>
            ) : null}

            <Pressable
              accessibilityRole="button"
              disabled={isSubmitting}
              onPress={handleSubmit(onSubmit)}
              style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]}
            >
              {isSubmitting ? (
                <ActivityIndicator color={colors.inverse} size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>Update password</Text>
              )}
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  screen: { backgroundColor: colors.bg, flex: 1 },
  header: { alignItems: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  backButton: { alignItems: 'center', borderRadius: 20, height: 40, justifyContent: 'center', width: 40 },
  headerTitle: { ...font.bold, color: colors.text, fontSize: 16 },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingBottom: 40 },
  iconWrap: { alignItems: 'center', alignSelf: 'center', backgroundColor: colors.primaryLight, borderRadius: 28, height: 56, justifyContent: 'center', marginBottom: 18, width: 56 },
  title: { ...font.extrabold, color: colors.text, fontSize: 24, textAlign: 'center' },
  subtitle: { ...font.regular, color: colors.textSecondary, fontSize: 14, lineHeight: 21, marginBottom: 26, marginTop: 8, textAlign: 'center' },
  label: { ...font.semibold, color: colors.text, fontSize: 14, marginBottom: 8 },
  secondLabel: { marginTop: 18 },
  input: { ...font.regular, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 12, borderWidth: 1, color: colors.text, fontSize: 15, minHeight: 52, paddingHorizontal: 16 },
  inputError: { borderColor: colors.error },
  fieldError: { ...font.regular, color: colors.error, fontSize: 12, marginTop: 5 },
  errorBanner: { alignItems: 'center', backgroundColor: colors.errorBg, borderRadius: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18, padding: 12 },
  errorText: { ...font.regular, color: colors.error, flex: 1, fontSize: 13 },
  inlineLink: { ...font.bold, color: colors.primary, fontSize: 13 },
  primaryButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 12, justifyContent: 'center', marginTop: 20, minHeight: 52, paddingHorizontal: 18 },
  primaryButtonText: { ...font.bold, color: colors.inverse, fontSize: 15 },
  buttonDisabled: { opacity: 0.65 },
})

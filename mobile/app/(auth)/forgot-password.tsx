import { zodResolver } from '@hookform/resolvers/zod'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
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

import { font } from '../../src/theme/typography'
import { useTheme, type AppColors } from '../../src/context/ThemeContext'
import { apiErrorMessage } from '../../src/utils/error'
import * as authService from '../../src/services/auth'

const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
})

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>

export default function ForgotPasswordScreen() {
  const router = useRouter()
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  const onSubmit = async ({ email }: ForgotPasswordForm) => {
    setServerError(null)
    setSuccessMessage(null)
    try {
      const response = await authService.requestPasswordReset(email)
      setSuccessMessage(response.detail)
    } catch (error: unknown) {
      setServerError(apiErrorMessage(error))
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Back to sign in"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => router.replace('/(auth)/login')}
          style={styles.backButton}
        >
          <MaterialCommunityIcons color={colors.text} name="arrow-left" size={22} />
        </Pressable>
        <Text style={styles.headerTitle}>Forgot password</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons color={colors.primary} name="lock-reset" size={30} />
        </View>
        <Text style={styles.title}>Reset your password</Text>
        <Text style={styles.subtitle}>
          Enter the email address for your XPawSure account. If it is registered,
          we&apos;ll send a reset link.
        </Text>

        {successMessage ? (
          <View accessibilityRole="alert" style={styles.successCard}>
            <MaterialCommunityIcons color={colors.primary} name="email-check-outline" size={22} />
            <Text style={styles.successText}>{successMessage}</Text>
            <Text style={styles.helperText}>
              The link expires in one hour and can only be used once. Check your
              inbox and spam folder.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.replace('/(auth)/login')}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Back to sign in</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {serverError ? (
              <View accessibilityRole="alert" style={styles.errorBanner}>
                <MaterialCommunityIcons color={colors.error} name="alert-circle-outline" size={17} />
                <Text style={styles.errorText}>{serverError}</Text>
              </View>
            ) : null}

            <Text style={styles.label}>Email</Text>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  accessibilityLabel="Email address"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  keyboardType="email-address"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.textMuted}
                  returnKeyType="send"
                  style={[styles.input, errors.email && styles.inputError]}
                  value={value}
                />
              )}
            />
            {errors.email ? <Text style={styles.fieldError}>{errors.email.message}</Text> : null}

            <Pressable
              accessibilityRole="button"
              disabled={isSubmitting}
              onPress={handleSubmit(onSubmit)}
              style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]}
            >
              {isSubmitting ? (
                <ActivityIndicator color={colors.inverse} size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>Send reset link</Text>
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
  input: { ...font.regular, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 12, borderWidth: 1, color: colors.text, fontSize: 15, minHeight: 52, paddingHorizontal: 16 },
  inputError: { borderColor: colors.error },
  fieldError: { ...font.regular, color: colors.error, fontSize: 12, marginTop: 5 },
  errorBanner: { alignItems: 'center', backgroundColor: colors.errorBg, borderRadius: 10, flexDirection: 'row', gap: 8, marginBottom: 18, padding: 12 },
  errorText: { ...font.regular, color: colors.error, flex: 1, fontSize: 13 },
  primaryButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 12, justifyContent: 'center', marginTop: 20, minHeight: 52, paddingHorizontal: 18 },
  primaryButtonText: { ...font.bold, color: colors.inverse, fontSize: 15 },
  buttonDisabled: { opacity: 0.65 },
  successCard: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 16, borderWidth: 1, gap: 12, padding: 22 },
  successText: { ...font.semibold, color: colors.text, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  helperText: { ...font.regular, color: colors.textSecondary, fontSize: 13, lineHeight: 19, textAlign: 'center' },
})

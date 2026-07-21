import { zodResolver } from '@hookform/resolvers/zod'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Link, router } from 'expo-router'
import { useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { z } from 'zod'

import { useAuth } from '../../src/context/AuthContext'
import { useTheme, type AppColors } from '../../src/context/ThemeContext'

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginForm = z.infer<typeof loginSchema>

function DecorativeBlob({ color, style }: { color: string; style: object }) {
  return <View pointerEvents="none" style={[blobStyle, { backgroundColor: color }, style]} />
}

const blobStyle = { borderRadius: 999, position: 'absolute' } as const

function PawPattern({ style }: { style: ReturnType<typeof StyleSheet.create> }) {
  const { isDark } = useTheme()
  const pawColor = isDark ? '#5A4A40' : '#D3B29A'
  const pawColor2 = isDark ? '#4A3A30' : '#B8957E'
  const pawColor3 = isDark ? '#6A5A50' : '#E9CDB7'
  return (
    <View pointerEvents="none" style={style.pawPattern}>
      <MaterialCommunityIcons color={pawColor} name="paw" size={28} style={style.pawOne} />
      <MaterialCommunityIcons color={pawColor2} name="paw" size={20} style={style.pawTwo} />
      <MaterialCommunityIcons color={pawColor3} name="paw" size={16} style={style.pawThree} />
    </View>
  )
}

export default function LoginScreen() {
  const { login } = useAuth()
  const { colors, isDark } = useTheme()
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const styles = useMemo(() => createStyles(colors), [colors])

  const onSubmit = async (data: LoginForm) => {
    setServerError(null)
    try {
      await login(data.email, data.password)
      router.replace('/(owner)/')
    } catch (error: unknown) {
      if (error && typeof error === 'object') {
        const axiosError = error as { response?: { data?: { detail?: string } }; code?: string }
        if (axiosError.response) {
          setServerError(axiosError.response.data?.detail || 'Invalid email or password.')
        } else {
          setServerError('Network error. Please try again.')
        }
      } else {
        setServerError('Network error. Please try again.')
      }
    }
  }

  const blobColor1 = isDark ? '#3A2518' : '#F6DFC1'
  const blobColor2 = isDark ? '#2A1A10' : '#F1D4AF'

  return (
    <SafeAreaView style={styles.screen}>
      <DecorativeBlob color={blobColor1} style={styles.topBlob} />
      <DecorativeBlob color={blobColor2} style={styles.bottomBlob} />
      <PawPattern style={styles} />

      <View style={styles.topBar}>
        <Link asChild href="/(auth)/">
          <Pressable accessibilityRole="link" style={styles.backLink}>
            <MaterialCommunityIcons color={colors.text} name="chevron-left" size={22} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
        </Link>
      </View>

      <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', default: undefined })} style={styles.keyboardView}>
        <ScrollView bounces={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.formContainer}>
            <View style={styles.brandSection}>
              <View style={styles.brandIconWrap}>
                <MaterialCommunityIcons color={colors.primary} name="dog" size={30} />
              </View>
              <Text style={styles.brandName}>XPawSure</Text>
              <Text style={styles.brandTagline}>Veterinary Management System</Text>
            </View>

            <Text style={styles.welcomeText}>Welcome back</Text>
            <Text style={styles.subtitle}>Sign in to your account</Text>

            {serverError && (
              <View style={styles.errorBanner}>
                <MaterialCommunityIcons color={colors.inverse} name="alert-circle" size={16} />
                <Text style={styles.errorBannerText}>{serverError}</Text>
              </View>
            )}

            <View style={styles.form}>
              <Text style={styles.label}>Email</Text>
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    placeholder="john@example.com"
                    placeholderTextColor={colors.textMuted}
                    style={[styles.input, errors.email && styles.inputError]}
                    value={value}
                  />
                )}
              />
              {errors.email && <Text style={styles.fieldError}>{errors.email.message}</Text>}

              <Text style={styles.label}>Password</Text>
              <View style={[styles.passwordField, errors.password && styles.inputError]}>
                <Controller
                  control={control}
                  name="password"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      autoComplete="current-password"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      placeholder="Enter your password"
                      placeholderTextColor={colors.textMuted}
                      secureTextEntry={!passwordVisible}
                      style={styles.passwordInput}
                      value={value}
                    />
                  )}
                />
                <Pressable
                  accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}
                  accessibilityRole="button"
                  hitSlop={10}
                  onPress={() => setPasswordVisible((visible) => !visible)}
                  style={styles.visibilityButton}
                >
                  <MaterialCommunityIcons color={colors.textSecondary} name={passwordVisible ? 'eye-off-outline' : 'eye-outline'} size={20} />
                </Pressable>
              </View>
              {errors.password && <Text style={styles.fieldError}>{errors.password.message}</Text>}

              <View style={styles.optionsRow}>
                <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: rememberMe }} onPress={() => setRememberMe((selected) => !selected)} style={styles.rememberOption}>
                  <View style={[styles.checkbox, rememberMe && styles.checkboxSelected]}>
                    {rememberMe ? <MaterialCommunityIcons color={colors.inverse} name="check" size={12} /> : null}
                  </View>
                  <Text style={styles.optionText}>Remember me</Text>
                </Pressable>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </View>

              <Pressable
                accessibilityRole="button"
                disabled={isSubmitting}
                onPress={handleSubmit(onSubmit)}
                style={({ pressed }) => [styles.submitButton, pressed && !isSubmitting && styles.submitButtonPressed, isSubmitting && styles.submitButtonDisabled]}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={colors.inverse} size="small" />
                ) : (
                  <Text style={styles.submitText}>Sign in</Text>
                )}
              </Pressable>

              <View style={styles.switchRow}>
                <Text style={styles.switchText}>Don&apos;t have an account? </Text>
                <Link href="/(auth)/register" style={styles.switchLink}>Sign up</Link>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  screen: { backgroundColor: colors.bg, flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center' },
  topBlob: { height: 190, left: -95, top: -94, width: 225 },
  bottomBlob: { bottom: -118, height: 220, right: -92, width: 220 },
  pawPattern: { height: 160, position: 'absolute', right: 0, top: 90, width: 130 },
  pawOne: { position: 'absolute', right: 10, top: 5, transform: [{ rotate: '21deg' }] },
  pawTwo: { left: 8, position: 'absolute', top: 70, transform: [{ rotate: '-23deg' }] },
  pawThree: { bottom: 5, position: 'absolute', right: 6, transform: [{ rotate: '12deg' }] },
  topBar: { left: 20, position: 'absolute', top: 8, zIndex: 10 },
  backLink: { alignItems: 'center', flexDirection: 'row' },
  backText: { color: colors.text, fontSize: 15, fontWeight: '500' },
  formContainer: { paddingHorizontal: 28, paddingTop: 60 },
  brandSection: { alignItems: 'center', marginBottom: 32 },
  brandIconWrap: { alignItems: 'center', backgroundColor: colors.primaryLight, borderRadius: 22, height: 44, justifyContent: 'center', marginBottom: 8, width: 44 },
  brandName: { color: colors.primaryDark, fontSize: 26, fontWeight: '800', letterSpacing: -0.7 },
  brandTagline: { color: colors.textSecondary, fontSize: 10, fontWeight: '500', marginTop: 2 },
  welcomeText: { color: colors.text, fontSize: 22, fontWeight: '700', marginBottom: 2, textAlign: 'center' },
  subtitle: { color: colors.textSecondary, fontSize: 14, marginBottom: 28, textAlign: 'center' },
  errorBanner: { alignItems: 'center', backgroundColor: colors.errorBg, borderRadius: 8, flexDirection: 'row', gap: 8, marginBottom: 16, paddingHorizontal: 14, paddingVertical: 10 },
  errorBannerText: { color: colors.inverse, flex: 1, fontSize: 13, fontWeight: '500' },
  form: { width: '100%' },
  label: { color: colors.text, fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 16 },
  input: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 10, borderWidth: 1, color: colors.text, fontSize: 15, height: 48, paddingHorizontal: 14 },
  inputError: { borderColor: colors.error },
  fieldError: { color: colors.error, fontSize: 12, marginTop: 4 },
  passwordField: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 10, borderWidth: 1, flexDirection: 'row', height: 48 },
  passwordInput: { color: colors.text, flex: 1, fontSize: 15, paddingHorizontal: 14 },
  visibilityButton: { alignItems: 'center', justifyContent: 'center', width: 44 },
  optionsRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  rememberOption: { alignItems: 'center', flexDirection: 'row' },
  checkbox: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 4, borderWidth: 1.5, height: 18, justifyContent: 'center', marginRight: 8, width: 18 },
  checkboxSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  optionText: { color: colors.linkMuted, fontSize: 13 },
  forgotText: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  submitButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 12, height: 52, justifyContent: 'center', marginTop: 28 },
  submitButtonPressed: { opacity: 0.85 },
  submitButtonDisabled: { opacity: 0.6 },
  submitText: { color: colors.inverse, fontSize: 16, fontWeight: '800' },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  switchText: { color: colors.linkMuted, fontSize: 14 },
  switchLink: { color: colors.primary, fontSize: 14, fontWeight: '700' },
})

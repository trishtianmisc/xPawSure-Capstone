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

const registerSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(100),
  last_name: z.string().min(1, 'Last name is required').max(100),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  phone: z.string().max(20).optional().or(z.literal('')),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  acceptTerms: z.literal(true, { message: 'You must accept the terms and conditions' }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type RegisterForm = z.infer<typeof registerSchema>

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

export default function RegisterScreen() {
  const { register } = useAuth()
  const { colors, isDark } = useTheme()
  const [serverError, setServerError] = useState<string | null>(null)

  const { control, handleSubmit, formState: { errors, isSubmitting }, setValue, watch } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false as unknown as true,
    },
  })

  const acceptedTerms = watch('acceptTerms')
  const styles = useMemo(() => createStyles(colors), [colors])

  const onSubmit = async (data: RegisterForm) => {
    setServerError(null)
    try {
      await register({
        email: data.email,
        password: data.password,
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone || undefined,
      })
      router.push('/(auth)/login')
    } catch (error: unknown) {
      if (error && typeof error === 'object') {
        const axiosError = error as {
          response?: { status: number; data?: Record<string, unknown> }
          code?: string
        }

        if (axiosError.response) {
          const data = axiosError.response.data
          if (data && typeof data === 'object') {
            const errObj = data as Record<string, unknown>
            if (typeof errObj.detail === 'string') {
              setServerError(errObj.detail)
            } else {
              const firstFieldError = Object.entries(errObj).find(
                ([key, val]) => key !== 'detail' && Array.isArray(val) && val.length > 0,
              ) as [string, string[]] | undefined
              if (firstFieldError) {
                setServerError(firstFieldError[1][0])
              } else {
                setServerError('Registration failed. Please check your information.')
              }
            }
          } else {
            setServerError('Registration failed. Please try again.')
          }
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
        <ScrollView bounces={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.formContainer}>
            <View style={styles.brandSection}>
              <View style={styles.brandIconWrap}>
                <MaterialCommunityIcons color={colors.primary} name="dog" size={30} />
              </View>
              <Text style={styles.brandName}>XPawSure</Text>
              <Text style={styles.brandTagline}>Veterinary Management System</Text>
            </View>

            <Text style={styles.heading}>Create your account</Text>
            <Text style={styles.subtitle}>Fill in your details to get started</Text>

            {serverError && (
              <View style={styles.errorBanner}>
                <MaterialCommunityIcons color={colors.inverse} name="alert-circle" size={16} />
                <Text style={styles.errorBannerText}>{serverError}</Text>
              </View>
            )}

            <View style={styles.form}>
              <Text style={styles.label}>First Name</Text>
              <Controller
                control={control}
                name="first_name"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    autoCapitalize="words"
                    autoComplete="name"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    placeholder="First Name"
                    placeholderTextColor={colors.textMuted}
                    style={[styles.input, errors.first_name && styles.inputError]}
                    value={value}
                  />
                )}
              />
              {errors.first_name && <Text style={styles.fieldError}>{errors.first_name.message}</Text>}

              <Text style={styles.label}>Last Name</Text>
              <Controller
                control={control}
                name="last_name"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    autoCapitalize="words"
                    autoComplete="name"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    placeholder="Last Name"
                    placeholderTextColor={colors.textMuted}
                    style={[styles.input, errors.last_name && styles.inputError]}
                    value={value}
                  />
                )}
              />
              {errors.last_name && <Text style={styles.fieldError}>{errors.last_name.message}</Text>}

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

              <Text style={styles.label}>Phone Number</Text>
              <Controller
                control={control}
                name="phone"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    autoComplete="tel"
                    keyboardType="phone-pad"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    placeholder="Phone Number"
                    placeholderTextColor={colors.textMuted}
                    style={styles.input}
                    value={value}
                  />
                )}
              />

              <Text style={styles.label}>Password</Text>
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={[styles.passwordField, errors.password && styles.inputError]}>
                    <TextInput
                      autoComplete="new-password"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      placeholder="Min. 8 characters"
                      placeholderTextColor={colors.textMuted}
                      secureTextEntry
                      style={styles.passwordInput}
                      value={value}
                    />
                  </View>
                )}
              />
              {errors.password && <Text style={styles.fieldError}>{errors.password.message}</Text>}

              <Text style={styles.label}>Confirm Password</Text>
              <Controller
                control={control}
                name="confirmPassword"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={[styles.passwordField, errors.confirmPassword && styles.inputError]}>
                    <TextInput
                      autoComplete="new-password"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      placeholder="Repeat your password"
                      placeholderTextColor={colors.textMuted}
                      secureTextEntry
                      style={styles.passwordInput}
                      value={value}
                    />
                  </View>
                )}
              />
              {errors.confirmPassword && <Text style={styles.fieldError}>{errors.confirmPassword.message}</Text>}

              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: !!acceptedTerms }}
                onPress={() => setValue('acceptTerms', !acceptedTerms as unknown as true, { shouldValidate: true })}
                style={styles.termsRow}
              >
                <View style={[styles.checkbox, acceptedTerms ? styles.checkboxSelected : null]}>
                  {acceptedTerms ? <MaterialCommunityIcons color={colors.inverse} name="check" size={12} /> : null}
                </View>
                <Text style={styles.termsText}>I have read the <Text style={styles.termsStrong}>Terms &amp; Conditions</Text></Text>
              </Pressable>
              {errors.acceptTerms && <Text style={styles.fieldError}>{errors.acceptTerms.message}</Text>}

              <Pressable
                accessibilityRole="button"
                disabled={isSubmitting}
                onPress={handleSubmit(onSubmit)}
                style={({ pressed }) => [styles.submitButton, pressed && !isSubmitting && styles.submitButtonPressed, isSubmitting && styles.submitButtonDisabled]}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={colors.inverse} size="small" />
                ) : (
                  <Text style={styles.submitText}>Create account</Text>
                )}
              </Pressable>

              <View style={styles.switchRow}>
                <Text style={styles.switchText}>Already have an account? </Text>
                <Link href="/(auth)/login" style={styles.switchLink}>Sign in</Link>
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
  scrollContent: { flexGrow: 1 },
  topBlob: { height: 190, left: -95, top: -94, width: 225 },
  bottomBlob: { bottom: -118, height: 220, right: -92, width: 220 },
  pawPattern: { height: 160, position: 'absolute', right: 0, top: 90, width: 130 },
  pawOne: { position: 'absolute', right: 10, top: 5, transform: [{ rotate: '21deg' }] },
  pawTwo: { left: 8, position: 'absolute', top: 70, transform: [{ rotate: '-23deg' }] },
  pawThree: { bottom: 5, position: 'absolute', right: 6, transform: [{ rotate: '12deg' }] },
  topBar: { left: 20, position: 'absolute', top: 8, zIndex: 10 },
  backLink: { alignItems: 'center', flexDirection: 'row' },
  backText: { color: colors.text, fontSize: 15, fontWeight: '500' },
  formContainer: { paddingHorizontal: 28, paddingTop: 60, paddingBottom: 40 },
  brandSection: { alignItems: 'center', marginBottom: 28 },
  brandIconWrap: { alignItems: 'center', backgroundColor: colors.primaryLight, borderRadius: 22, height: 44, justifyContent: 'center', marginBottom: 8, width: 44 },
  brandName: { color: colors.primaryDark, fontSize: 26, fontWeight: '800', letterSpacing: -0.7 },
  brandTagline: { color: colors.textSecondary, fontSize: 10, fontWeight: '500', marginTop: 2 },
  heading: { color: colors.text, fontSize: 22, fontWeight: '700', marginBottom: 2, textAlign: 'center' },
  subtitle: { color: colors.textSecondary, fontSize: 14, marginBottom: 24, textAlign: 'center' },
  errorBanner: { alignItems: 'center', backgroundColor: colors.errorBg, borderRadius: 8, flexDirection: 'row', gap: 8, marginBottom: 16, paddingHorizontal: 14, paddingVertical: 10 },
  errorBannerText: { color: colors.inverse, flex: 1, fontSize: 13, fontWeight: '500' },
  form: { width: '100%' },
  label: { color: colors.text, fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 10, borderWidth: 1, color: colors.text, fontSize: 15, height: 48, paddingHorizontal: 14 },
  inputError: { borderColor: colors.error },
  fieldError: { color: colors.error, fontSize: 12, marginTop: 4 },
  passwordField: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 10, borderWidth: 1, flexDirection: 'row', height: 48 },
  passwordInput: { color: colors.text, flex: 1, fontSize: 15, paddingHorizontal: 14 },
  termsRow: { alignItems: 'center', flexDirection: 'row', marginTop: 18, paddingLeft: 2 },
  checkbox: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 4, borderWidth: 1.5, height: 18, justifyContent: 'center', marginRight: 8, width: 18 },
  checkboxSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  termsText: { color: colors.linkMuted, fontSize: 13 },
  termsStrong: { fontWeight: '700' },
  submitButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 12, height: 52, justifyContent: 'center', marginTop: 24 },
  submitButtonPressed: { opacity: 0.85 },
  submitButtonDisabled: { opacity: 0.6 },
  submitText: { color: colors.inverse, fontSize: 16, fontWeight: '800' },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  switchText: { color: colors.linkMuted, fontSize: 14 },
  switchLink: { color: colors.primary, fontSize: 14, fontWeight: '700' },
})

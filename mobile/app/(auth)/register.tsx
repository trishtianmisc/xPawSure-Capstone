import { zodResolver } from '@hookform/resolvers/zod'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Link, router } from 'expo-router'
import { useState } from 'react'
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
  return <View pointerEvents="none" style={[styles.blob, { backgroundColor: color }, style]} />
}

function PawPattern() {
  return (
    <View pointerEvents="none" style={styles.pawPattern}>
      <MaterialCommunityIcons color="#D3B29A" name="paw" size={28} style={styles.pawOne} />
      <MaterialCommunityIcons color="#B8957E" name="paw" size={20} style={styles.pawTwo} />
      <MaterialCommunityIcons color="#E9CDB7" name="paw" size={16} style={styles.pawThree} />
    </View>
  )
}

export default function RegisterScreen() {
  const { register } = useAuth()
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

  return (
    <SafeAreaView style={styles.screen}>
      <DecorativeBlob color="#F6DFC1" style={styles.topBlob} />
      <DecorativeBlob color="#F1D4AF" style={styles.bottomBlob} />
      <PawPattern />

      <View style={styles.topBar}>
        <Link asChild href="/(auth)/">
          <Pressable accessibilityRole="link" style={styles.backLink}>
            <MaterialCommunityIcons color="#3A2112" name="chevron-left" size={22} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
        </Link>
      </View>

      <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', default: undefined })} style={styles.keyboardView}>
        <ScrollView bounces={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.formContainer}>
            <View style={styles.brandSection}>
              <View style={styles.brandIconWrap}>
                <MaterialCommunityIcons color="#8B4324" name="dog" size={30} />
              </View>
              <Text style={styles.brandName}>XPawSure</Text>
              <Text style={styles.brandTagline}>Veterinary Management System</Text>
            </View>

            <Text style={styles.heading}>Create your account</Text>
            <Text style={styles.subtitle}>Fill in your details to get started</Text>

            {serverError && (
              <View style={styles.errorBanner}>
                <MaterialCommunityIcons color="#FFFFFF" name="alert-circle" size={16} />
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
                    placeholderTextColor="#A89A91"
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
                    placeholderTextColor="#A89A91"
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
                    placeholderTextColor="#A89A91"
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
                    placeholderTextColor="#A89A91"
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
                      placeholderTextColor="#A89A91"
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
                      placeholderTextColor="#A89A91"
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
                  {acceptedTerms ? <MaterialCommunityIcons color="#FFFFFF" name="check" size={12} /> : null}
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
                  <ActivityIndicator color="#FFFFFF" size="small" />
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

const styles = StyleSheet.create({
  screen: { backgroundColor: '#FFFCF8', flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  blob: { borderRadius: 999, position: 'absolute' },
  topBlob: { height: 190, left: -95, top: -94, width: 225 },
  bottomBlob: { bottom: -118, height: 220, right: -92, width: 220 },
  pawPattern: { height: 160, position: 'absolute', right: 0, top: 90, width: 130 },
  pawOne: { position: 'absolute', right: 10, top: 5, transform: [{ rotate: '21deg' }] },
  pawTwo: { left: 8, position: 'absolute', top: 70, transform: [{ rotate: '-23deg' }] },
  pawThree: { bottom: 5, position: 'absolute', right: 6, transform: [{ rotate: '12deg' }] },
  topBar: { left: 20, position: 'absolute', top: 8, zIndex: 10 },
  backLink: { alignItems: 'center', flexDirection: 'row' },
  backText: { color: '#3A2112', fontSize: 15, fontWeight: '500' },
  formContainer: { paddingHorizontal: 28, paddingTop: 60, paddingBottom: 40 },
  brandSection: { alignItems: 'center', marginBottom: 28 },
  brandIconWrap: { alignItems: 'center', backgroundColor: '#F8E6D0', borderRadius: 22, height: 44, justifyContent: 'center', marginBottom: 8, width: 44 },
  brandName: { color: '#4D2515', fontSize: 26, fontWeight: '800', letterSpacing: -0.7 },
  brandTagline: { color: '#806C60', fontSize: 10, fontWeight: '500', marginTop: 2 },
  heading: { color: '#1A0E08', fontSize: 22, fontWeight: '700', marginBottom: 2, textAlign: 'center' },
  subtitle: { color: '#806C60', fontSize: 14, marginBottom: 24, textAlign: 'center' },
  errorBanner: { alignItems: 'center', backgroundColor: '#C0392B', borderRadius: 8, flexDirection: 'row', gap: 8, marginBottom: 16, paddingHorizontal: 14, paddingVertical: 10 },
  errorBannerText: { color: '#FFFFFF', flex: 1, fontSize: 13, fontWeight: '500' },
  form: { width: '100%' },
  label: { color: '#3A2112', fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: '#FFFFFF', borderColor: '#E5DFDA', borderRadius: 10, borderWidth: 1, color: '#1A0E08', fontSize: 15, height: 48, paddingHorizontal: 14 },
  inputError: { borderColor: '#C0392B' },
  fieldError: { color: '#C0392B', fontSize: 12, marginTop: 4 },
  passwordField: { backgroundColor: '#FFFFFF', borderColor: '#E5DFDA', borderRadius: 10, borderWidth: 1, flexDirection: 'row', height: 48 },
  passwordInput: { color: '#1A0E08', flex: 1, fontSize: 15, paddingHorizontal: 14 },
  termsRow: { alignItems: 'center', flexDirection: 'row', marginTop: 18, paddingLeft: 2 },
  checkbox: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#B8A99E', borderRadius: 4, borderWidth: 1.5, height: 18, justifyContent: 'center', marginRight: 8, width: 18 },
  checkboxSelected: { backgroundColor: '#8B4324', borderColor: '#8B4324' },
  termsText: { color: '#5A4539', fontSize: 13 },
  termsStrong: { fontWeight: '700' },
  submitButton: { alignItems: 'center', backgroundColor: '#8B4324', borderRadius: 12, height: 52, justifyContent: 'center', marginTop: 24 },
  submitButtonPressed: { opacity: 0.85 },
  submitButtonDisabled: { opacity: 0.6 },
  submitText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  switchText: { color: '#5A4539', fontSize: 14 },
  switchLink: { color: '#8B4324', fontSize: 14, fontWeight: '700' },
})

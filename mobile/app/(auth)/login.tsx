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

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginForm = z.infer<typeof loginSchema>

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

export default function LoginScreen() {
  const { login } = useAuth()
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

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
        <ScrollView bounces={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.formContainer}>
            <View style={styles.brandSection}>
              <View style={styles.brandIconWrap}>
                <MaterialCommunityIcons color="#8B4324" name="dog" size={30} />
              </View>
              <Text style={styles.brandName}>XPawSure</Text>
              <Text style={styles.brandTagline}>Veterinary Management System</Text>
            </View>

            <Text style={styles.welcomeText}>Welcome back</Text>
            <Text style={styles.subtitle}>Sign in to your account</Text>

            {serverError && (
              <View style={styles.errorBanner}>
                <MaterialCommunityIcons color="#FFFFFF" name="alert-circle" size={16} />
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
                    placeholderTextColor="#A89A91"
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
                      placeholderTextColor="#A89A91"
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
                  <MaterialCommunityIcons color="#806C60" name={passwordVisible ? 'eye-off-outline' : 'eye-outline'} size={20} />
                </Pressable>
              </View>
              {errors.password && <Text style={styles.fieldError}>{errors.password.message}</Text>}

              <View style={styles.optionsRow}>
                <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: rememberMe }} onPress={() => setRememberMe((selected) => !selected)} style={styles.rememberOption}>
                  <View style={[styles.checkbox, rememberMe && styles.checkboxSelected]}>
                    {rememberMe ? <MaterialCommunityIcons color="#FFFFFF" name="check" size={12} /> : null}
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
                  <ActivityIndicator color="#FFFFFF" size="small" />
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

const styles = StyleSheet.create({
  screen: { backgroundColor: '#FFFCF8', flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center' },
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
  formContainer: { paddingHorizontal: 28, paddingTop: 60 },
  brandSection: { alignItems: 'center', marginBottom: 32 },
  brandIconWrap: { alignItems: 'center', backgroundColor: '#F8E6D0', borderRadius: 22, height: 44, justifyContent: 'center', marginBottom: 8, width: 44 },
  brandName: { color: '#4D2515', fontSize: 26, fontWeight: '800', letterSpacing: -0.7 },
  brandTagline: { color: '#806C60', fontSize: 10, fontWeight: '500', marginTop: 2 },
  welcomeText: { color: '#1A0E08', fontSize: 22, fontWeight: '700', marginBottom: 2, textAlign: 'center' },
  subtitle: { color: '#806C60', fontSize: 14, marginBottom: 28, textAlign: 'center' },
  errorBanner: { alignItems: 'center', backgroundColor: '#C0392B', borderRadius: 8, flexDirection: 'row', gap: 8, marginBottom: 16, paddingHorizontal: 14, paddingVertical: 10 },
  errorBannerText: { color: '#FFFFFF', flex: 1, fontSize: 13, fontWeight: '500' },
  form: { width: '100%' },
  label: { color: '#3A2112', fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 16 },
  input: { backgroundColor: '#FFFFFF', borderColor: '#E5DFDA', borderRadius: 10, borderWidth: 1, color: '#1A0E08', fontSize: 15, height: 48, paddingHorizontal: 14 },
  inputError: { borderColor: '#C0392B' },
  fieldError: { color: '#C0392B', fontSize: 12, marginTop: 4 },
  passwordField: { backgroundColor: '#FFFFFF', borderColor: '#E5DFDA', borderRadius: 10, borderWidth: 1, flexDirection: 'row', height: 48 },
  passwordInput: { color: '#1A0E08', flex: 1, fontSize: 15, paddingHorizontal: 14 },
  visibilityButton: { alignItems: 'center', justifyContent: 'center', width: 44 },
  optionsRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  rememberOption: { alignItems: 'center', flexDirection: 'row' },
  checkbox: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#B8A99E', borderRadius: 4, borderWidth: 1.5, height: 18, justifyContent: 'center', marginRight: 8, width: 18 },
  checkboxSelected: { backgroundColor: '#8B4324', borderColor: '#8B4324' },
  optionText: { color: '#5A4539', fontSize: 13 },
  forgotText: { color: '#8B4324', fontSize: 13, fontWeight: '600' },
  submitButton: { alignItems: 'center', backgroundColor: '#8B4324', borderRadius: 12, height: 52, justifyContent: 'center', marginTop: 28 },
  submitButtonPressed: { opacity: 0.85 },
  submitButtonDisabled: { opacity: 0.6 },
  submitText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  switchText: { color: '#5A4539', fontSize: 14 },
  switchLink: { color: '#8B4324', fontSize: 14, fontWeight: '700' },
})

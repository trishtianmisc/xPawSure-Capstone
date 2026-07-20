import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Link } from 'expo-router'
import { useState } from 'react'
import {
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

type RegistrationField = {
  autoComplete?: 'email' | 'name' | 'tel' | 'password' | 'new-password'
  keyboardType?: 'default' | 'email-address' | 'phone-pad'
  label: string
  secure?: boolean
}

const registrationFields: RegistrationField[] = [
  { label: 'First Name', autoComplete: 'name' },
  { label: 'Last Name', autoComplete: 'name' },
  { label: 'Date of Birth' },
  { label: 'Phone Number', autoComplete: 'tel', keyboardType: 'phone-pad' },
  { label: 'Address' },
  { label: 'Email', autoComplete: 'email', keyboardType: 'email-address' },
  { label: 'Password', autoComplete: 'new-password', secure: true },
  { label: 'Confirm Password', autoComplete: 'new-password', secure: true },
]

export default function RegisterScreen() {
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({})

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

            <View style={styles.form}>
              {registrationFields.map((field) => {
                const isPasswordVisible = visiblePasswords[field.label] ?? false

                return (
                  <View key={field.label}>
                    <Text style={styles.label}>{field.label}</Text>
                    {field.secure ? (
                      <View style={styles.passwordField}>
                        <TextInput
                          autoComplete={field.autoComplete}
                          placeholder={field.label}
                          placeholderTextColor="#A89A91"
                          secureTextEntry={!isPasswordVisible}
                          style={styles.passwordInput}
                        />
                        <Pressable
                          accessibilityLabel={isPasswordVisible ? `Hide ${field.label}` : `Show ${field.label}`}
                          accessibilityRole="button"
                          hitSlop={10}
                          onPress={() => setVisiblePasswords((passwords) => ({ ...passwords, [field.label]: !isPasswordVisible }))}
                          style={styles.visibilityButton}
                        >
                          <MaterialCommunityIcons color="#806C60" name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'} size={20} />
                        </Pressable>
                      </View>
                    ) : (
                      <TextInput
                        autoCapitalize={field.keyboardType === 'email-address' ? 'none' : 'words'}
                        autoComplete={field.autoComplete}
                        keyboardType={field.keyboardType}
                        placeholder={field.label}
                        placeholderTextColor="#A89A91"
                        style={styles.input}
                      />
                    )}
                  </View>
                )
              })}

              <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: acceptedTerms }} onPress={() => setAcceptedTerms((accepted) => !accepted)} style={styles.termsRow}>
                <View style={[styles.checkbox, acceptedTerms && styles.checkboxSelected]}>
                  {acceptedTerms ? <MaterialCommunityIcons color="#FFFFFF" name="check" size={12} /> : null}
                </View>
                <Text style={styles.termsText}>I have read the <Text style={styles.termsStrong}>Terms &amp; Conditions</Text></Text>
              </Pressable>

              <Pressable accessibilityRole="button" style={({ pressed }) => [styles.submitButton, pressed && styles.submitButtonPressed]}>
                <Text style={styles.submitText}>Create account</Text>
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
  form: { width: '100%' },
  label: { color: '#3A2112', fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: '#FFFFFF', borderColor: '#E5DFDA', borderRadius: 10, borderWidth: 1, color: '#1A0E08', fontSize: 15, height: 48, paddingHorizontal: 14 },
  passwordField: { backgroundColor: '#FFFFFF', borderColor: '#E5DFDA', borderRadius: 10, borderWidth: 1, flexDirection: 'row', height: 48 },
  passwordInput: { color: '#1A0E08', flex: 1, fontSize: 15, paddingHorizontal: 14 },
  visibilityButton: { alignItems: 'center', justifyContent: 'center', width: 44 },
  termsRow: { alignItems: 'center', flexDirection: 'row', marginTop: 18, paddingLeft: 2 },
  checkbox: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#B8A99E', borderRadius: 4, borderWidth: 1.5, height: 18, justifyContent: 'center', marginRight: 8, width: 18 },
  checkboxSelected: { backgroundColor: '#8B4324', borderColor: '#8B4324' },
  termsText: { color: '#5A4539', fontSize: 13 },
  termsStrong: { fontWeight: '700' },
  submitButton: { alignItems: 'center', backgroundColor: '#8B4324', borderRadius: 12, height: 52, justifyContent: 'center', marginTop: 24 },
  submitButtonPressed: { opacity: 0.85 },
  submitText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  switchText: { color: '#5A4539', fontSize: 14 },
  switchLink: { color: '#8B4324', fontSize: 14, fontWeight: '700' },
})

import { MaterialCommunityIcons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  type ColorValue,
} from 'react-native'

import { useTheme, type AppColors } from '../../src/context/ThemeContext'
import { font } from '../../src/theme/typography'
import { Image } from 'react-native'


const SPLASH_DURATION_MS = 3000

const onboardingPages = [
  {
    title: 'Early Detection Tool',
    description: 'Helps pet owners identify possible skin diseases before visiting a vet.',
    icon: 'dog-side' as const,
    accent: '#8B4324',
    iconBackground: '#F2D0A3',
  },
  {
    title: 'Convenient Vaccine Tracking',
    description: 'Centralized and organized pet vaccination records at your fingertips.',
    icon: 'needle' as const,
    accent: '#8B4324',
    iconBackground: '#EBC69D',
  },
  {
    title: 'Detect, Protect, Care',
    description: 'Promotes responsible pet ownership and better care for every pet.',
    icon: 'dog' as const,
    accent: '#B96A37',
    iconBackground: '#F3D1A9',
  },
] as const

type DecorativeBlobProps = {
  backgroundColor: ColorValue
  style: object
}

function DecorativeBlob({ backgroundColor, style }: DecorativeBlobProps) {
  return <View pointerEvents="none" style={[blobStyle, { backgroundColor }, style]} />
}

const blobStyle = { borderRadius: 999, position: 'absolute' } as const

function PawPattern({ style }: { style: ReturnType<typeof StyleSheet.create> }) {
  const { isDark } = useTheme()
  const c1 = isDark ? '#5A4A40' : '#D3B29A'
  const c2 = isDark ? '#4A3A30' : '#B8957E'
  const c3 = isDark ? '#6A5A50' : '#E9CDB7'
  const c4 = isDark ? '#55453B' : '#C49C81'
  return (
    <View pointerEvents="none" style={style.pawPattern}>
      <MaterialCommunityIcons color={c1} name="paw" size={70} style={style.pawOne} />
      <MaterialCommunityIcons color={c2} name="paw" size={24} style={style.pawTwo} />
      <MaterialCommunityIcons color={c3} name="paw" size={45} style={style.pawThree} />
      <MaterialCommunityIcons color={c4} name="paw" size={27} style={style.pawFour} />
    </View>
  )
}

function BrandMark({ style }: { style: ReturnType<typeof createStyles> }) {
  return (
    <View style={style.brandMark}>
      <Image
        source={require('../../assets/Component 1.png')}
        style={style.brandLogo}
        resizeMode="contain"
        accessibilityLabel="XPawSure"
      />
      <Text style={style.brandTagline}>AI-Assisted Canine Skin Condition Preliminary Screening</Text>
    </View>
  )
}

export default function WelcomeScreen() {
  const { colors, isDark } = useTheme()
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [pageIndex, setPageIndex] = useState(0)

  useEffect(() => {
    const timeoutId = setTimeout(() => setShowOnboarding(true), SPLASH_DURATION_MS)
    return () => clearTimeout(timeoutId)
  }, [])

  const styles = useMemo(() => createStyles(colors), [colors])

  const page = onboardingPages[pageIndex]
  const isFinalPage = pageIndex === onboardingPages.length - 1

  const handlePrimaryAction = () => {
    if (isFinalPage) {
      router.push('/(auth)/register')
      return
    }

    setPageIndex((currentIndex) => currentIndex + 1)
  }

  if (!showOnboarding) {
    return (
      <SafeAreaView style={styles.splashScreen}>
        <DecorativeBlob backgroundColor="#7b3a2069" style={styles.splashTopBlob} />
        <DecorativeBlob backgroundColor="#5A2A16" style={styles.splashBottomBlob} />
        <DecorativeBlob backgroundColor="#B77752" style={styles.splashSideBlob} />
        <View style={styles.splashContent}>
          <View style={styles.splashLogoCircle}>
            <Image
              source={require('../../assets/xpawsure-logo.png')}
              style={styles.splashLogoImage}
              resizeMode="contain"
              accessibilityLabel="XPawSure"
            />
          </View>
          <BrandMark style={styles} />
        </View>
      </SafeAreaView>
    )
  }

  const blobColor1 = isDark ? '#3A2518' : '#F6DFC1'
  const blobColor2 = isDark ? '#2A1A10' : '#F1D4AF'

  return (
    <SafeAreaView style={styles.screen}>
      <DecorativeBlob backgroundColor={blobColor1} style={styles.topBlob} />
      <DecorativeBlob backgroundColor={blobColor2} style={styles.bottomBlob} />
      <PawPattern style={styles} />

      <View style={styles.content}>
        <BrandMark style={styles} />

        <View style={[styles.illustration, { backgroundColor: page.iconBackground }]}>
          <View style={[styles.illustrationCircle, { borderColor: page.accent }]}>
            <MaterialCommunityIcons color={page.accent} name={page.icon} size={116} />
          </View>
          <MaterialCommunityIcons color="#FFF9F1" name="paw" size={33} style={styles.illustrationPaw} />
        </View>

        <View style={styles.copyContainer}>
          <Text style={[styles.title, { color: page.accent }]}>{page.title}</Text>
          <Text style={styles.description}>{page.description}</Text>
        </View>

        <View style={styles.footer}>
          <View accessibilityLabel={`Onboarding page ${pageIndex + 1} of ${onboardingPages.length}`} style={styles.pagination}>
            {onboardingPages.map((onboardingPage, index) => (
              <View
                key={onboardingPage.title}
                style={[styles.paginationDot, index === pageIndex && styles.paginationDotActive]}
              />
            ))}
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={handlePrimaryAction}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
          >
            <Text style={styles.primaryButtonText}>{isFinalPage ? 'Sign Up' : 'Explore'}</Text>
          </Pressable>

          {isFinalPage ? (
            <Pressable accessibilityRole="button" onPress={() => router.push('/(auth)/login')} style={styles.signInLink}>
              <Text style={styles.signInText}>
                Already have an account? <Text style={styles.signInTextStrong}>Sign in</Text>
              </Text>
            </Pressable>
          ) : (
            <Pressable accessibilityRole="button" onPress={() => setPageIndex(onboardingPages.length - 1)} style={styles.skipLink}>
              <Text style={styles.skipText}>Skip</Text>
            </Pressable>
          )}
        </View>
      </View>
    </SafeAreaView>
  )
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, overflow: 'hidden' },
  splashScreen: { flex: 1, backgroundColor: '#FFE1B8', overflow: 'hidden' },
  splashLogoImage: { height: 200, width: 200 },
  content: { flex: 1, alignItems: 'center', paddingHorizontal: 30, paddingTop: 40, paddingBottom: 20 },
  splashContent: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  brandMark: { alignItems: 'center', gap: 2 },
  brandLogo: { width: 176, height: 50 },
  brandTagline: { ...font.medium, color: colors.textSecondary, fontSize: 10, marginTop: -5, textAlign: 'center' },
  splashLogoCircle: {
    alignItems: 'center', backgroundColor: '#F8C98F', borderColor: '#8B4324', borderRadius: 150,
    borderWidth: 9, height: 220, justifyContent: 'center', width: 220,
  },
  illustration: {
    alignItems: 'center', borderRadius: 140, height: 220, justifyContent: 'center', marginTop: 44,
    overflow: 'hidden', width: 220,
  },
  illustrationCircle: { alignItems: 'center', borderRadius: 93, borderWidth: 9, height: 186, justifyContent: 'center', width: 186 },
  illustrationPaw: { bottom: 17, position: 'absolute', right: 23, transform: [{ rotate: '-15deg' }] },
  copyContainer: { alignItems: 'center', marginTop: 35, minHeight: 86 },
  title: { ...font.extrabold, fontSize: 24, letterSpacing: -0.7, textAlign: 'center' },
  description: { ...font.regular, color: colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 10, maxWidth: 275, textAlign: 'center' },
  footer: { alignItems: 'center', marginTop: 'auto', width: '100%' },
  pagination: { flexDirection: 'row', gap: 7, marginBottom: 22 },
  paginationDot: { backgroundColor: colors.border, borderRadius: 5, height: 5, width: 17 },
  paginationDotActive: { backgroundColor: colors.primary, width: 28 },
  primaryButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 12, justifyContent: 'center', minHeight: 52, width: '100%' },
  primaryButtonPressed: { opacity: 0.85 },
  primaryButtonText: { ...font.extrabold, color: colors.inverse, fontSize: 16 },
  skipLink: { paddingTop: 14, paddingBottom: 25 },
  skipText: { ...font.semibold, color: colors.textSecondary, fontSize: 13 },
  signInLink: { paddingTop: 14, paddingBottom: 40 },
  signInText: { ...font.regular, color: colors.textSecondary, fontSize: 12 },
  signInTextStrong: { ...font.extrabold, color: colors.primary },
  topBlob: { height: 200, left: -95, top: -94, width: 225 },
  bottomBlob: { bottom: -118, height: 220, right: -92, width: 220 },
  splashTopBlob: { height: 175, left: -70, top: -92, width: 255 },
  splashBottomBlob: { bottom: -80, height: 225, left: -105, width: 260 },
  splashSideBlob: { height: 175, right: -115, top: 200, width: 195 },
  pawPattern: { height: 215, position: 'absolute', right: -4, top: 68, width: 200 },
  pawOne: { position: 'absolute', right: 50, top: 430, transform: [{ rotate: '-30deg' }] },
  pawTwo: { right: 20, position: 'absolute', top: 10, transform: [{ rotate: '30deg' }] },
  pawThree: { bottom: -50, position: 'absolute', left: -150, transform: [{ rotate: '10deg' }] },
  pawFour: { bottom: 42, left: 47, position: 'absolute', transform: [{ rotate: '-18deg' }] },
})

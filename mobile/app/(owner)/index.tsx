import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useMemo, type ComponentProps } from 'react'
import { Image, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native'

import { useAuth } from '../../src/context/AuthContext'
import { useTheme, type AppColors } from '../../src/context/ThemeContext'
import { usePets } from '../../features/pet/hooks/usePets'

type Shortcut = {
  label: string
  icon: ComponentProps<typeof MaterialCommunityIcons>['name']
  route: '/(owner)/pets' | '/(owner)/pets/screening' | '/(owner)/appointments' | '/(owner)/records'
}

const shortcuts: Shortcut[] = [
  { label: 'Screen Skin', icon: 'camera-outline', route: '/(owner)/pets/screening' },
  { label: 'My Pets', icon: 'paw-outline', route: '/(owner)/pets' },
  { label: 'QR Code', icon: 'qrcode', route: '/(owner)/records' },
  { label: 'Find Vet', icon: 'map-marker-outline', route: '/(owner)/appointments' },
]

export default function HomeScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const { colors, isDark } = useTheme()
  const firstName = user?.first_name?.trim() || 'Pet Parent'
  const styles = useMemo(() => createStyles(colors), [colors])
  const { data: pets, isLoading: petsLoading } = usePets(user?.id)

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={styles.safeArea.backgroundColor} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.welcome}>Welcome Back {firstName}!</Text>
            <Text style={styles.subtitle}>Let&apos;s keep your pet happy and healthy.</Text>
          </View>
        </View>

        <Pressable onPress={() => router.push('/(owner)/pets/screening')} style={styles.screeningCard}>
          <View style={styles.cardCircleTop} />
          <View style={styles.cardCircleBottom} />
          <View style={styles.cardPaw}>
            <MaterialCommunityIcons color="#A75127" name="paw" size={24} />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Pet Skin Health Check</Text>
            <Text style={styles.cardCopy}>Quick AI-powered screening for{`\n`}your pet&apos;s skin condition.</Text>
            <View style={styles.screenButton}>
              <Text style={styles.screenButtonText}>Start Screening</Text>
              <MaterialCommunityIcons color="#FFFFFF" name="arrow-right" size={15} />
            </View>
          </View>
        </Pressable>

        <View style={styles.shortcuts}>
          {shortcuts.map((shortcut) => (
            <Pressable key={shortcut.label} onPress={() => router.push(shortcut.route)} style={styles.shortcut}>
              <View style={styles.shortcutIcon}>
                <MaterialCommunityIcons color={colors.iconColor} name={shortcut.icon} size={20} />
              </View>
              <Text style={styles.shortcutLabel}>{shortcut.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Pets</Text>
          <Pressable onPress={() => router.push('/(owner)/pets')}><Text style={styles.seeAll}>See All</Text></Pressable>
        </View>
        {petsLoading ? (
          <View style={styles.emptyPets}>
            <Text style={styles.emptyPetsText}>Loading...</Text>
          </View>
        ) : pets && pets.length > 0 ? (
          <View style={styles.petList}>
            {pets.slice(0, 3).map((pet) => (
              <Pressable key={pet.id} onPress={() => router.push(`/(owner)/pets/${pet.id}`)} style={[styles.petCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
                {pet.profile_picture ? (
                  <Image source={{ uri: pet.profile_picture }} style={styles.petAvatar} />
                ) : (
                  <View style={[styles.petAvatarPlaceholder, { backgroundColor: colors.iconBg }]}>
                    <MaterialCommunityIcons color={colors.iconColor} name="paw" size={18} />
                  </View>
                )}
                <View style={styles.petInfo}>
                  <Text style={styles.petName}>{pet.name}</Text>
                  <Text style={styles.petMeta}>{pet.breed_name} · {pet.sex === 'MALE' ? '♂' : '♀'}</Text>
                </View>
                <MaterialCommunityIcons color={colors.textMuted} name="chevron-right" size={18} />
              </Pressable>
            ))}
          </View>
        ) : (
          <Pressable onPress={() => router.push('/(owner)/pets/new')} style={styles.emptyPets}>
            <View style={styles.addPetIcon}>
              <MaterialCommunityIcons color="#9A532F" name="paw" size={18} />
            </View>
            <Text style={styles.emptyPetsText}>Register your first pet to get started</Text>
          </Pressable>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Screenings</Text>
          <Pressable onPress={() => router.push('/(owner)/records')}><Text style={styles.seeAll}>See All</Text></Pressable>
        </View>
        <Pressable onPress={() => router.push('/(owner)/records')} style={styles.screeningPreview}>
          <View style={styles.previewIcon}><MaterialCommunityIcons color="#B96534" name="dog" size={19} /></View>
          <View style={styles.previewText}>
            <Text style={styles.previewTitle}>Allergic Dermatitis</Text>
            <Text style={styles.previewMeta}>Milo · 12 Mar, 10:30 AM</Text>
          </View>
          <MaterialCommunityIcons color={colors.textSecondary} name="chevron-right" size={20} />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  welcome: { color: colors.text, fontSize: 22, fontWeight: '800', lineHeight: 28 },
  subtitle: { color: colors.textSecondary, fontSize: 13, marginTop: 4, lineHeight: 18 },
  screeningCard: { backgroundColor: '#D27A40', borderRadius: 20, height: 180, overflow: 'hidden', padding: 22, position: 'relative' },
  cardContent: { zIndex: 1 },
  cardPaw: { alignItems: 'center', backgroundColor: '#F2C49B', borderRadius: 24, height: 48, justifyContent: 'center', marginBottom: 12, width: 48 },
  cardTitle: { color: '#FFFFFF', fontSize: 19, fontWeight: '800', lineHeight: 24 },
  cardCopy: { color: '#FFF6EE', fontSize: 12, lineHeight: 18, marginTop: 4 },
  screenButton: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: '#6C2D17', borderRadius: 10, flexDirection: 'row', gap: 6, marginTop: 5, paddingHorizontal: 14, paddingVertical: 8 },
  screenButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  cardCircleTop: { backgroundColor: '#B85A28', borderRadius: 48, height: 96, position: 'absolute', right: -16, top: -24, width: 96 },
  cardCircleBottom: { backgroundColor: '#E8A568', borderRadius: 32, bottom: -10, height: 64, position: 'absolute', right: 20, width: 64 },

  shortcuts: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24, marginBottom: 24 },
  shortcut: { alignItems: 'center', flex: 1, gap: 6 },
  shortcutIcon: { alignItems: 'center', backgroundColor: colors.iconBg, borderRadius: 14, height: 48, justifyContent: 'center', width: 48 },
  shortcutLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: '600' },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  seeAll: { color: colors.primary, fontSize: 12, fontWeight: '600' },

  petList: { gap: 8, marginBottom: 24 },
  petCard: { alignItems: 'center', borderRadius: 14, borderWidth: 1, flexDirection: 'row', padding: 12, gap: 12 },
  petAvatar: { borderRadius: 22, height: 44, width: 44 },
  petAvatarPlaceholder: { alignItems: 'center', borderRadius: 22, height: 44, justifyContent: 'center', width: 44 },
  petInfo: { flex: 1 },
  petName: { color: colors.text, fontSize: 15, fontWeight: '700' },
  petMeta: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  emptyPets: { alignItems: 'center', backgroundColor: colors.surfaceAlt, borderColor: colors.borderLight, borderRadius: 16, borderStyle: 'dashed', borderWidth: 1.5, gap: 10, justifyContent: 'center', marginBottom: 24, minHeight: 120, padding: 20 },
  addPetIcon: { alignItems: 'center', backgroundColor: colors.iconBg, borderRadius: 20, height: 40, justifyContent: 'center', width: 40 },
  emptyPetsText: { color: colors.textSecondary, fontSize: 13, lineHeight: 18, textAlign: 'center' },

  screeningPreview: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: 14, flexDirection: 'row', padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  previewIcon: { alignItems: 'center', backgroundColor: colors.iconBg, borderRadius: 10, height: 40, justifyContent: 'center', width: 40 },
  previewText: { flex: 1, marginLeft: 12 },
  previewTitle: { color: colors.text, fontSize: 14, fontWeight: '600' },
  previewMeta: { color: colors.textSecondary, fontSize: 11, marginTop: 3 },
})

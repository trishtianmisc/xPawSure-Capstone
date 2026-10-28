import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useMemo } from 'react'
import { ActivityIndicator, Image, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useAuth } from '../../src/context/AuthContext'
import { useTheme, type AppColors } from '../../src/context/ThemeContext'
import { font } from '../../src/theme/typography'
import { StatusPill } from '../../features/appointment/components/StatusPill'
import { useMyAppointments } from '../../features/appointment/hooks/useMyAppointments'
import { usePets } from '../../features/pet/hooks/usePets'
import { BOOKED_PILL } from '../../features/screening/constants'
import { useAllScreenings } from '../../features/screening/hooks/useAllScreenings'

function formatScreeningDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

export default function HomeScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const { colors, isDark } = useTheme()
  const firstName = user?.first_name?.trim() || 'Pet Parent'
  const styles = useMemo(() => createStyles(colors), [colors])
  const { data: pets, isLoading: petsLoading } = usePets(user?.id)
  const { data: appointments } = useMyAppointments()
  const {
    data: screeningsData,
    isLoading: screeningsLoading,
    isError: screeningsError,
  } = useAllScreenings()

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const nextAppointment = useMemo(() => {
    const activeStatuses = ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS']
    const now = Date.now()
    return appointments?.results
      .filter(
        (appointment) =>
          activeStatuses.includes(appointment.apt_status) &&
          new Date(appointment.apt_scheduled_at).getTime() >= now,
      )
      .sort(
        (first, second) =>
          new Date(first.apt_scheduled_at).getTime() - new Date(second.apt_scheduled_at).getTime(),
      )[0]
  }, [appointments])

  const recentScreenings = useMemo(
    () =>
      [...(screeningsData?.results ?? [])]
        .sort(
          (first, second) =>
            new Date(second.ais_created_at).getTime() - new Date(first.ais_created_at).getTime(),
        )
        .slice(0, 3),
    [screeningsData],
  )

  const scheduled = nextAppointment ? new Date(nextAppointment.apt_scheduled_at) : null
  const upcomingLabel = scheduled
    ? scheduled.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    : null

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={styles.safeArea.backgroundColor}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>
            {greeting}, {firstName}.
          </Text>
          <Text style={styles.dateLine}>{today}</Text>
        </View>

        {/* Skin screening hero */}
        <Pressable
          accessibilityHint="Opens the skin screening camera"
          accessibilityLabel="Start a pet skin health check"
          accessibilityRole="button"
          onPress={() => router.push('/(owner)/pets/screening')}
          style={styles.hero}
        >
          <View style={styles.heroWatermark}>
            <MaterialCommunityIcons color="#FFFFFF" name="paw" size={120} />
          </View>
          <Text style={styles.heroLabel}>On-device AI screening</Text>
          <Text style={styles.heroTitle}>Pet Skin Health Check</Text>
          <Text style={styles.heroCopy}>
            Quick AI-powered screening for your pet&apos;s skin condition.
          </Text>
          <View style={styles.heroButton}>
            <Text style={styles.heroButtonText}>Start Screening</Text>
            <MaterialCommunityIcons color={colors.primaryDark} name="arrow-right" size={15} />
          </View>
        </Pressable>

        {/* Next appointment */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Next Appointment</Text>
            <Pressable accessibilityRole="button" onPress={() => router.push('/(owner)/appointments')}>
              <Text style={styles.seeAll}>See All</Text>
            </Pressable>
          </View>
          {nextAppointment && scheduled ? (
            <Pressable
              accessibilityHint="Opens the appointment details"
              accessibilityLabel={`Appointment for ${nextAppointment.pet_name} on ${scheduled.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}`}
              accessibilityRole="button"
              onPress={() => router.push(`/(owner)/appointments/${nextAppointment.apt_id}`)}
              style={styles.appointmentCard}
            >
              <View style={styles.dateBlock}>
                <Text style={styles.dateDay}>{scheduled.getDate()}</Text>
                <Text style={styles.dateWeekday}>
                  {scheduled.toLocaleDateString(undefined, { weekday: 'short' })}
                </Text>
              </View>
              <View style={styles.appointmentBody}>
                <View style={styles.appointmentHeader}>
                  <Text numberOfLines={1} style={styles.petName}>
                    {nextAppointment.pet_name}
                  </Text>
                  <StatusPill status={nextAppointment.apt_status} />
                </View>
                <View style={styles.metaRow}>
                  <MaterialCommunityIcons color={colors.primary} name="stethoscope" size={14} />
                  <Text numberOfLines={1} style={styles.metaText}>
                    {nextAppointment.vet_name ?? 'Vet to be assigned'}
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  <MaterialCommunityIcons color={colors.primary} name="clock-outline" size={14} />
                  <Text style={styles.metaText}>{upcomingLabel}</Text>
                </View>
              </View>
              <MaterialCommunityIcons color={colors.textMuted} name="chevron-right" size={18} />
            </Pressable>
          ) : (
            <View style={[styles.appointmentCard, styles.appointmentEmpty]}>
              <MaterialCommunityIcons color={colors.textMuted} name="calendar-blank-outline" size={16} />
              <Text style={styles.emptyCardText}>
                No upcoming appointments yet. Run a skin screening to book one.
              </Text>
            </View>
          )}
        </View>

        {/* My pets */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Pets</Text>
            <Pressable accessibilityRole="button" onPress={() => router.push('/(owner)/pets')}>
              <Text style={styles.seeAll}>See All</Text>
            </Pressable>
          </View>
          {petsLoading ? (
            <View style={styles.emptyCard}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : pets && pets.length > 0 ? (
            <View style={styles.petList}>
              {pets.slice(0, 3).map((pet) => (
                <Pressable
                  key={pet.id}
                  accessibilityHint="Opens this pet's medical profile"
                  accessibilityLabel={`Open profile of ${pet.name}`}
                  accessibilityRole="button"
                  onPress={() => router.push(`/(owner)/pets/${pet.id}`)}
                  style={styles.petCard}
                >
                  {pet.profile_picture ? (
                    <Image source={{ uri: pet.profile_picture }} style={styles.petAvatar} />
                  ) : (
                    <View style={styles.petAvatarPlaceholder}>
                      <MaterialCommunityIcons color={colors.iconColor} name="paw" size={18} />
                    </View>
                  )}
                  <View style={styles.petInfo}>
                    <Text numberOfLines={1} style={styles.petName}>
                      {pet.name}
                    </Text>
                    <Text style={styles.petMeta}>
                      {pet.breed_name} · {pet.sex === 'MALE' ? 'Male' : 'Female'}
                    </Text>
                  </View>
                  <MaterialCommunityIcons color={colors.textMuted} name="chevron-right" size={18} />
                </Pressable>
              ))}
            </View>
          ) : (
            <Pressable
              accessibilityLabel="Register a new pet"
              accessibilityRole="button"
              onPress={() => router.push('/(owner)/pets/new')}
              style={styles.emptyCard}
            >
              <View style={styles.addPetIcon}>
                <MaterialCommunityIcons color={colors.iconColor} name="paw" size={18} />
              </View>
              <Text style={styles.emptyCardText}>Register your first pet to get started.</Text>
            </Pressable>
          )}
        </View>

        {/* Recent screenings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Screenings</Text>
            <Pressable accessibilityRole="button" onPress={() => router.push('/(owner)/screenings')}>
              <Text style={styles.seeAll}>See All</Text>
            </Pressable>
          </View>
          {screeningsLoading ? (
            <View style={styles.emptyCard}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : screeningsError ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyCardText}>
                We couldn&apos;t load recent screenings. Please try again.
              </Text>
            </View>
          ) : recentScreenings.length > 0 ? (
            <View style={styles.screeningList}>
              {recentScreenings.map((screening) => (
                <Pressable
                  key={screening.ais_id}
                  accessibilityHint="Opens your screening history"
                  accessibilityLabel={`Screening result ${screening.disease} for ${screening.pet_name}`}
                  accessibilityRole="button"
                  onPress={() => router.push('/(owner)/screenings')}
                  style={styles.screeningRow}
                >
                  <View style={styles.previewIcon}>
                    <MaterialCommunityIcons color={colors.iconColor} name="dog" size={19} />
                  </View>
                  <View style={styles.previewText}>
                    <Text numberOfLines={1} style={styles.previewTitle}>
                      {screening.disease}
                    </Text>
                    <Text numberOfLines={1} style={styles.previewMeta}>
                      {screening.pet_name} · {formatScreeningDate(screening.ais_created_at)}
                    </Text>
                  </View>
                  {screening.is_booked ? (
                    <View style={[styles.previewStatus, { backgroundColor: BOOKED_PILL.bg }]}>
                      <Text style={[styles.previewStatusText, { color: BOOKED_PILL.fg }]}>
                        {BOOKED_PILL.label}
                      </Text>
                    </View>
                  ) : null}
                  <MaterialCommunityIcons color={colors.textMuted} name="chevron-right" size={18} />
                </Pressable>
              ))}
            </View>
          ) : (
            <Pressable
              accessibilityLabel="Start your first skin screening"
              accessibilityRole="button"
              onPress={() => router.push('/(owner)/pets/screening')}
              style={styles.emptyCard}
            >
              <MaterialCommunityIcons color={colors.textMuted} name="camera-outline" size={18} />
              <Text style={styles.emptyCardText}>No screenings yet. Start your first scan.</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    content: { paddingHorizontal: 24, paddingTop: 15, paddingBottom: 40 },

    header: { marginBottom: 20 },
    greeting: { ...font.extrabold, color: colors.text, fontSize: 22, lineHeight: 28 },
    dateLine: { ...font.regular, color: colors.textSecondary, fontSize: 13, marginTop: 4 },

    hero: {
      backgroundColor: colors.primaryDark,
      borderRadius: 18,
      marginBottom: 20,
      overflow: 'hidden',
      padding: 20,
      position: 'relative',
    },
    heroWatermark: { bottom: -30, opacity: 0.08, position: 'absolute', right: -18 },
    heroLabel: {
      ...font.bold,
      color: '#FFFFFFB3',
      fontSize: 10,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    heroTitle: { ...font.extrabold, color: '#FFFFFF', fontSize: 20, lineHeight: 26, marginTop: 6 },
    heroCopy: { ...font.regular, color: '#FFFFFFD9', fontSize: 13, lineHeight: 19, marginTop: 4 },
    heroButton: {
      alignItems: 'center',
      alignSelf: 'flex-start',
      backgroundColor: '#FFFFFF',
      borderRadius: 10,
      flexDirection: 'row',
      gap: 6,
      marginTop: 14,
      minHeight: 40,
      paddingHorizontal: 16,
    },
    heroButtonText: { ...font.bold, color: colors.primaryDark, fontSize: 13 },

    section: { marginBottom: 24 },
    sectionHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    sectionTitle: { ...font.extrabold, color: colors.text, fontSize: 16 },
    seeAll: { ...font.semibold, color: colors.primary, fontSize: 12 },

    appointmentCard: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 14,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    appointmentEmpty: { borderStyle: 'dashed', gap: 8, justifyContent: 'center', minHeight: 76 },
    dateBlock: {
      alignItems: 'center',
      backgroundColor: colors.surfaceAlt,
      borderRadius: 12,
      paddingVertical: 8,
      width: 54,
    },
    dateDay: { ...font.extrabold, color: colors.text, fontSize: 20, lineHeight: 24 },
    dateWeekday: {
      ...font.bold,
      color: colors.textMuted,
      fontSize: 10,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    appointmentBody: { flex: 1, gap: 4 },
    appointmentHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    petName: { ...font.bold, color: colors.text, flex: 1, fontSize: 15, marginRight: 8 },
    metaRow: { alignItems: 'center', flexDirection: 'row', gap: 6 },
    metaText: { ...font.semibold, color: colors.textSecondary, fontSize: 12, flexShrink: 1 },

    petList: { gap: 8 },
    petCard: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 14,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 12,
      padding: 12,
    },
    petAvatar: { borderRadius: 22, height: 44, width: 44 },
    petAvatarPlaceholder: {
      alignItems: 'center',
      backgroundColor: colors.iconBg,
      borderRadius: 22,
      height: 44,
      justifyContent: 'center',
      width: 44,
    },
    petInfo: { flex: 1 },
    petMeta: { ...font.regular, color: colors.textSecondary, fontSize: 12, marginTop: 2 },
    addPetIcon: {
      alignItems: 'center',
      backgroundColor: colors.iconBg,
      borderRadius: 20,
      height: 40,
      justifyContent: 'center',
      width: 40,
    },

    screeningList: { gap: 8 },
    screeningRow: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 14,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 10,
      padding: 14,
    },
    previewIcon: {
      alignItems: 'center',
      backgroundColor: colors.iconBg,
      borderRadius: 10,
      height: 40,
      justifyContent: 'center',
      width: 40,
    },
    previewText: { flex: 1 },
    previewTitle: { ...font.semibold, color: colors.text, fontSize: 14 },
    previewMeta: { ...font.regular, color: colors.textSecondary, fontSize: 11, marginTop: 3 },
    previewStatus: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
    previewStatusText: { ...font.bold, fontSize: 10 },

    emptyCard: {
      alignItems: 'center',
      backgroundColor: colors.surfaceAlt,
      borderColor: colors.border,
      borderRadius: 14,
      borderStyle: 'dashed',
      borderWidth: 1,
      gap: 10,
      justifyContent: 'center',
      minHeight: 110,
      padding: 20,
    },
    emptyCardText: {
      ...font.regular,
      color: colors.textSecondary,
      fontSize: 13,
      lineHeight: 19,
      textAlign: 'center',
    },
  })

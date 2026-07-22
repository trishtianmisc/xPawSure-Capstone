import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useMemo } from 'react'
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import QRCode from 'react-native-qrcode-svg'

import { useTheme, type AppColors } from '../../../src/context/ThemeContext'
import { usePet } from '../hooks/usePet'

function computeAge(birthDate: string | null): string {
  if (!birthDate) return 'Unknown'
  const diff = Date.now() - new Date(birthDate).getTime()
  const years = Math.floor(diff / 31536000000)
  const months = Math.floor((diff % 31536000000) / 2592000000)
  if (years > 0) return `${years}y ${months}m`
  if (months > 0) return `${months}m`
  return '< 1m'
}

function InfoCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])

  return (
    <View style={styles.infoCard}>
      <View style={styles.infoCardIcon}>
        <Ionicons color={colors.primary} name={icon as any} size={18} />
      </View>
      <Text style={styles.infoCardLabel}>{label}</Text>
      <Text style={styles.infoCardValue} numberOfLines={1}>{value}</Text>
    </View>
  )
}

function StatusBadge({ status, overdue }: { status: string; overdue?: boolean }) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const isOverdue = overdue ?? status.toLowerCase() === 'overdue'

  return (
    <View style={[styles.badge, isOverdue ? styles.badgeOverdue : styles.badgeUpToDate]}>
      <Text style={[styles.badgeText, isOverdue ? styles.badgeTextOverdue : styles.badgeTextUpToDate]}>
        {status}
      </Text>
    </View>
  )
}

export default function PetProfileScreen() {
  const router = useRouter()
  const { colors } = useTheme()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data: pet, isLoading, isError, error } = usePet(id)
  const styles = useMemo(() => createStyles(colors), [colors])

  const renderHeader = (title?: string) => (
    <View style={styles.header}>
      <Pressable
        accessibilityLabel="Go back"
        accessibilityRole="button"
        hitSlop={8}
        onPress={() => router.back()}
        style={styles.headerBack}
      >
        <Ionicons color={colors.text} name="arrow-back" size={22} />
      </Pressable>
      <Text style={styles.headerTitle} numberOfLines={1}>{title || 'Pet Profile'}</Text>
      <View style={styles.headerRight} />
    </View>
  )

  if (isLoading) {
    return (
      <View style={styles.screen}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.loadingText}>Loading pet details...</Text>
        </View>
      </View>
    )
  }

  if (isError || !pet) {
    return (
      <View style={styles.screen}>
        {renderHeader()}
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons color={colors.error} name="alert-circle-outline" size={48} />
          <Text style={styles.errorTitle}>Unable to Load</Text>
          <Text style={styles.errorMessage}>
            {(error as Error)?.message || 'Something went wrong. Please try again.'}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            style={styles.errorButton}
          >
            <Text style={styles.errorButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.screen}>
      {renderHeader(pet.name)}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.coverSection}>
          <View style={styles.coverGradient}>
            <MaterialCommunityIcons color="rgba(255,255,255,0.12)" name="paw" size={100} style={styles.coverPaw1} />
            <MaterialCommunityIcons color="rgba(255,255,255,0.08)" name="paw" size={70} style={styles.coverPaw2} />
            <MaterialCommunityIcons color="rgba(255,255,255,0.10)" name="paw" size={50} style={styles.coverPaw3} />
          </View>
        </View>

        <View style={styles.profileSection}>
          <View style={styles.avatarFrame}>
            {pet.profile_picture ? (
              <Image source={{ uri: pet.profile_picture }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <MaterialCommunityIcons color={colors.primary} name="dog" size={36} />
              </View>
            )}
          </View>
          <Text style={styles.petName}>{pet.name}</Text>
          <Text style={styles.petBreed}>{pet.breed_name || 'Breed not specified'}</Text>
        </View>

        <View style={styles.actionsRow}>
          <Pressable
            accessibilityLabel={`Start a skin screening for ${pet.name}`}
            accessibilityRole="button"
            onPress={() => router.push('/(owner)/pets/screening')}
            style={styles.actionButton}
          >
            <MaterialCommunityIcons color="#FFFFFF" name="face-man-profile" size={18} />
            <Text style={styles.actionButtonText}>Scan Skin</Text>
          </Pressable>
          <Pressable
            accessibilityLabel={`View ${pet.name}'s QR code section`}
            accessibilityRole="button"
            onPress={() => router.push(`/(owner)/pets/${pet.id}?showQR=true`)}
            style={[styles.actionButton, styles.actionButtonSecondary]}
          >
            <MaterialCommunityIcons color={colors.primary} name="qrcode" size={18} />
            <Text style={[styles.actionButtonText, styles.actionButtonTextSecondary]}>QR Code</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.infoGrid}>
            <InfoCard icon="calendar-outline" label="Age" value={computeAge(pet.date_of_birth)} />
            <InfoCard icon="scale-outline" label="Weight" value={pet.weight ? `${pet.weight} kg` : 'N/A'} />
            <InfoCard icon="color-palette-outline" label="Color" value={pet.color || 'N/A'} />
            <InfoCard icon="male-female-outline" label="Sex" value={pet.sex === 'MALE' ? 'Male' : 'Female'} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Identification</Text>
          <View style={styles.identificationCard}>
            <View style={styles.identificationRow}>
              <Text style={styles.identificationLabel}>Microchip</Text>
              <Text style={styles.identificationValue}>{pet.microchip_number || 'Not registered'}</Text>
            </View>
            <View style={styles.identificationDivider} />
            <View style={styles.identificationRow}>
              <Text style={styles.identificationLabel}>QR Code ID</Text>
              <Text style={styles.identificationValue} numberOfLines={1}>{pet.qr_code || pet.id}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>QR Code</Text>
          <View style={styles.qrCard}>
            <View style={styles.qrContainer}>
              {pet.qr_code ? (
                <QRCode value={pet.qr_code} size={140} backgroundColor="#FFFFFF" color="#000000" />
              ) : (
                <QRCode value={pet.id} size={140} backgroundColor="#FFFFFF" color="#000000" />
              )}
            </View>
            <Text style={styles.qrHint}>Scan this code to quickly access {pet.name}'s profile</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vaccination Records</Text>
          <View style={styles.comingSoonCard}>
            <MaterialCommunityIcons color={colors.textMuted} name="medical-bag" size={24} />
            <Text style={styles.comingSoonText}>Vaccination records will appear here</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Medical Notes</Text>
          <View style={styles.comingSoonCard}>
            <MaterialCommunityIcons color={colors.textMuted} name="note-text-outline" size={24} />
            <Text style={styles.comingSoonText}>Medical notes will appear here</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Screening History</Text>
          <View style={styles.comingSoonCard}>
            <MaterialCommunityIcons color={colors.textMuted} name="face-man-profile" size={24} />
            <Text style={styles.comingSoonText}>Screening history will appear here</Text>
          </View>
        </View>

        <View style={styles.spacer} />
      </ScrollView>
    </View>
  )
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  screen: {
    backgroundColor: colors.surface,
    flex: 1,
  },
  content: {
    paddingBottom: 32,
  },

  header: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    height: 48,
    paddingHorizontal: 4,
  },
  headerBack: {
    alignItems: 'center',
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  headerTitle: {
    color: colors.text,
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerRight: {
    width: 48,
  },

  coverSection: {
    height: 160,
    overflow: 'hidden',
  },
  coverGradient: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    flex: 1,
    justifyContent: 'center',
    position: 'relative',
  },
  coverPaw1: {
    left: 24,
    position: 'absolute',
    top: 10,
  },
  coverPaw2: {
    bottom: 15,
    position: 'absolute',
    right: 30,
  },
  coverPaw3: {
    bottom: 50,
    left: '55%',
    position: 'absolute',
  },

  profileSection: {
    alignItems: 'center',
    marginTop: -44,
    paddingBottom: 4,
  },
  avatarFrame: {
    borderRadius: 48,
    borderWidth: 4,
    borderColor: colors.surface,
    height: 88,
    overflow: 'hidden',
    width: 88,
  },
  avatar: {
    height: '100%',
    width: '100%',
  },
  avatarPlaceholder: {
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    flex: 1,
    justifyContent: 'center',
  },
  petName: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    marginTop: 10,
  },
  petBreed: {
    color: colors.textSecondary,
    fontSize: 15,
    marginTop: 2,
  },

  actionsRow: {
    columnGap: 12,
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 18,
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    height: 44,
    justifyContent: 'center',
  },
  actionButtonSecondary: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  actionButtonTextSecondary: {
    color: colors.primary,
  },

  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 12,
  },

  infoGrid: {
    columnGap: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 12,
  },
  infoCard: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 14,
    width: '47.5%',
  },
  infoCardIcon: {
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    marginBottom: 4,
    width: 44,
  },
  infoCardLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  infoCardValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },

  identificationCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  identificationRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 36,
  },
  identificationLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  identificationValue: {
    color: colors.text,
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 16,
    textAlign: 'right',
  },
  identificationDivider: {
    backgroundColor: colors.border,
    height: 1,
    marginVertical: 4,
  },

  qrCard: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    paddingBottom: 18,
    paddingTop: 20,
  },
  qrContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
  },
  qrHint: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 12,
    textAlign: 'center',
  },

  badge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeOverdue: {
    backgroundColor: '#FFE5E5',
  },
  badgeUpToDate: {
    backgroundColor: '#E5F9E7',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgeTextOverdue: {
    color: '#D92D2D',
  },
  badgeTextUpToDate: {
    color: '#1B8A3B',
  },

  comingSoonCard: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  comingSoonText: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },

  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    gap: 12,
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 15,
  },

  errorContainer: {
    alignItems: 'center',
    flex: 1,
    gap: 8,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    marginTop: 12,
  },
  errorMessage: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
    textAlign: 'center',
  },
  errorButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 44,
    justifyContent: 'center',
    marginTop: 20,
    paddingHorizontal: 24,
  },
  errorButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  spacer: {
    height: 32,
  },
})

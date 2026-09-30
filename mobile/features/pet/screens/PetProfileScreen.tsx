import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useMemo, useRef } from 'react'
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import QRCode from 'react-native-qrcode-svg'

import { useAuth } from '../../../src/context/AuthContext'
import { useTheme, type AppColors } from '../../../src/context/ThemeContext'
import { apiErrorMessage } from '../../../src/utils/error'
import { useConsultations } from '../../records/hooks/useConsultations'
import { useVaccinations } from '../../records/hooks/useVaccinations'
import { useScreenings } from '../../screening/hooks/useScreenings'
import { PetRecordSection } from '../components/PetRecordSection'
import { ConsultationRow, ScreeningRow, VaccinationRow } from '../components/PetRecordRows'
import { useDeletePet } from '../hooks/useDeletePet'
import { usePet } from '../hooks/usePet'
import { buildPetPublicUrl } from '../utils/qr'

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

export default function PetProfileScreen() {
  const router = useRouter()
  const { colors } = useTheme()
  const { user } = useAuth()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data: pet, isLoading, isError, error } = usePet(id)
  const deletePet = useDeletePet(user?.id ?? '')
  const vaccinations = useVaccinations(pet?.id, !!pet)
  const consultations = useConsultations(pet?.id, !!pet)
  const screenings = useScreenings(pet?.id, !!pet)
  const styles = useMemo(() => createStyles(colors), [colors])
  const scrollViewRef = useRef<ScrollView>(null)
  const qrSectionY = useRef(0)

  const scrollToQrSection = () => {
    scrollViewRef.current?.scrollTo({ y: qrSectionY.current, animated: true })
  }

  const confirmDelete = () => {
    if (!pet) return
    Alert.alert(
      'Delete pet?',
      `${pet.name}'s profile will be removed from your pets. Existing medical records are preserved.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deletePet.mutate(pet.id, {
              onSuccess: () => router.back(),
            })
          },
        },
      ],
    )
  }

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
      {pet ? (
        <Pressable
          accessibilityLabel={`Edit ${pet.name}`}
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => router.push(`/(owner)/pets/edit/${pet.id}`)}
          style={styles.headerBack}
        >
          <Ionicons color={colors.text} name="pencil-outline" size={20} />
        </Pressable>
      ) : (
        <View style={styles.headerRight} />
      )}
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
      <ScrollView ref={scrollViewRef} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
            onPress={scrollToQrSection}
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

        <View
          onLayout={(event) => {
            qrSectionY.current = event.nativeEvent.layout.y
          }}
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>QR Code</Text>
          <View style={styles.qrCard}>
            <View style={styles.qrContainer}>
              <QRCode
                value={buildPetPublicUrl(pet.qr_code || pet.id)}
                size={140}
                backgroundColor="#FFFFFF"
                color="#000000"
              />
            </View>
            <Text style={styles.qrHint}>
              Scan this code to view {pet.name}'s public profile
            </Text>
          </View>
        </View>

        <PetRecordSection
          title="Vaccination Records"
          isLoading={vaccinations.isLoading}
          isError={vaccinations.isError}
          itemCount={(vaccinations.data ?? []).length}
          emptyIcon="medical-bag"
          emptyText="No vaccination records yet."
          emptyAction={{
            label: 'Record a vaccination',
            onPress: () => router.push(`/(owner)/records/vaccinations/new?petId=${pet.id}`),
          }}
          headerAction={{
            label: 'Add',
            onPress: () => router.push(`/(owner)/records/vaccinations/new?petId=${pet.id}`),
          }}
          seeAllLabel="See all"
          onSeeAll={() => router.push('/(owner)/records?tab=vaccinations')}
        >
          {(vaccinations.data ?? []).slice(0, 3).map((record) => (
            <VaccinationRow
              key={record.id}
              record={record}
              onPress={() => router.push(`/(owner)/records/vaccinations/${record.id}`)}
            />
          ))}
        </PetRecordSection>

        <PetRecordSection
          title="Medical Notes"
          isLoading={consultations.isLoading}
          isError={consultations.isError}
          itemCount={(consultations.data ?? []).length}
          emptyIcon="note-text-outline"
          emptyText="No medical notes yet."
          seeAllLabel="See all"
          onSeeAll={() => router.push('/(owner)/records?tab=consultations')}
        >
          {(consultations.data ?? []).slice(0, 3).map((record) => (
            <ConsultationRow
              key={record.id}
              record={record}
              onPress={() => router.push(`/(owner)/records/consultations/${record.id}`)}
            />
          ))}
        </PetRecordSection>

        <PetRecordSection
          title="Screening History"
          isLoading={screenings.isLoading}
          isError={screenings.isError}
          itemCount={(screenings.data?.results ?? []).length}
          emptyIcon="face-man-profile"
          emptyText="No screenings yet."
          emptyAction={{
            label: 'Start a skin screening',
            onPress: () => router.push('/(owner)/pets/screening'),
          }}
          seeAllLabel="See all"
          onSeeAll={() => router.push('/(owner)/screenings')}
        >
          {(screenings.data?.results ?? []).slice(0, 3).map((screening) => (
            <ScreeningRow
              key={screening.ais_id}
              screening={screening}
              onPress={() => router.push('/(owner)/screenings')}
            />
          ))}
        </PetRecordSection>

        <View style={styles.section}>
          <Pressable
            accessibilityLabel={`Delete ${pet.name}`}
            accessibilityRole="button"
            disabled={deletePet.isPending}
            onPress={confirmDelete}
            style={[styles.deleteButton, deletePet.isPending && styles.deleteButtonDisabled]}
          >
            {deletePet.isPending ? (
              <ActivityIndicator color={colors.error} size="small" />
            ) : (
              <>
                <MaterialCommunityIcons color={colors.error} name="trash-can-outline" size={18} />
                <Text style={styles.deleteButtonText}>Delete Pet</Text>
              </>
            )}
          </Pressable>
          {deletePet.isError && (
            <Text style={styles.deleteError}>{apiErrorMessage(deletePet.error)}</Text>
          )}
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

  deleteButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.error,
    borderRadius: 12,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 8,
    height: 46,
    justifyContent: 'center',
  },
  deleteButtonDisabled: {
    opacity: 0.6,
  },
  deleteButtonText: {
    color: colors.error,
    fontSize: 15,
    fontWeight: '700',
  },
  deleteError: {
    color: colors.error,
    fontSize: 12,
    marginTop: 8,
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

import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useMemo } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import { useTheme, type AppColors } from '../../../src/context/ThemeContext'
import { CONFIDENCE_THRESHOLDS } from '../../../ai/constants/diseases'
import { STATUS_STYLES } from '../constants'
import { useAllScreenings } from '../hooks/useAllScreenings'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function ScreeningHistoryScreen() {
  const router = useRouter()
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const { data, isLoading, isError } = useAllScreenings()

  const screenings = data?.results ?? []
  const pendingScreenings = screenings.filter((s) => s.ais_status === 'PENDING_REVIEW')
  const hasPending = pendingScreenings.length > 0
  const hasLowConfidence = pendingScreenings.some(
    (s) => Number(s.ais_confidence) / 100 < CONFIDENCE_THRESHOLDS.MODERATE,
  )

  const openBooking = () => router.push('/(owner)/appointments/book')

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.statusState}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : isError ? (
          <Text style={styles.statusText}>
            We couldn&apos;t load your screening history. Please try again.
          </Text>
        ) : screenings.length > 0 ? (
          <>
            {hasPending && (
              <View style={styles.guideCard}>
                <View style={styles.guideRow}>
                  <MaterialCommunityIcons color={colors.primary} name="stethoscope" size={22} />
                  <Text style={styles.guideText}>
                    {hasLowConfidence
                      ? 'This result was uncertain. For a reliable assessment, please book a veterinary appointment.'
                      : "Concerned about your dog's skin condition? Book a veterinary appointment for a professional assessment."}
                  </Text>
                </View>
                <Pressable
                  accessibilityHint="Opens the appointment booking flow"
                  accessibilityLabel="Book a veterinary appointment"
                  accessibilityRole="button"
                  onPress={openBooking}
                  style={styles.guideBtn}
                >
                  <MaterialCommunityIcons color="#FFFFFF" name="calendar-check-outline" size={16} />
                  <Text style={styles.guideBtnText}>Book an Appointment</Text>
                </Pressable>
              </View>
            )}
            {screenings.map((screening) => {
              const status = STATUS_STYLES[screening.ais_status]
              const showBookAction = screening.ais_status === 'PENDING_REVIEW'
              return (
                <View key={screening.ais_id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text numberOfLines={1} style={styles.petName}>{screening.pet_name}</Text>
                    {showBookAction ? (
                      <Pressable
                        accessibilityHint="Opens the appointment booking flow"
                        accessibilityLabel={`Book a veterinary appointment for ${screening.pet_name}`}
                        accessibilityRole="button"
                        onPress={openBooking}
                        style={styles.bookChip}
                      >
                        <MaterialCommunityIcons color="#FFFFFF" name="calendar-outline" size={13} />
                        <Text style={styles.bookChipText}>Book</Text>
                      </Pressable>
                    ) : (
                      <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
                        <Text style={[styles.statusPillText, { color: status.fg }]}>{status.label}</Text>
                      </View>
                    )}
                  </View>
                  <Text numberOfLines={1} style={styles.disease}>{screening.disease}</Text>
                <View style={styles.cardFooter}>
                  <Text style={styles.meta}>
                    {screening.ais_confidence}% confidence · {formatDate(screening.ais_created_at)}
                  </Text>
                  <Text style={styles.source}>{screening.ais_source}</Text>
                </View>
              </View>
            )
          })}
          </>
        ) : (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons color={colors.textMuted} name="face-man-profile" size={28} />
            <Text style={styles.statusText}>No screenings yet.</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/(owner)/pets/screening')}
              style={styles.emptyButton}
            >
              <Text style={styles.emptyButtonText}>Start a skin screening</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  screen: { backgroundColor: colors.surface, flex: 1 },
  content: { gap: 12, paddingBottom: 24, paddingHorizontal: 20, paddingTop: 16 },
  statusState: { alignItems: 'center', justifyContent: 'center', minHeight: 160 },
  statusText: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, textAlign: 'center' },

  guideCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: 14,
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  guideRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 10 },
  guideText: { color: colors.text, flex: 1, fontSize: 13, lineHeight: 19 },
  guideBtn: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  guideBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },

  bookChip: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  bookChipText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  cardHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  petName: { color: colors.text, flex: 1, fontSize: 16, fontWeight: '700', marginRight: 10 },
  statusPill: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusPillText: { fontSize: 11, fontWeight: '700' },
  disease: { color: colors.text, fontSize: 14, fontWeight: '600' },
  cardFooter: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  meta: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  source: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 6,
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  emptyState: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 14,
    borderStyle: 'dashed',
    borderWidth: 1,
    gap: 12,
    justifyContent: 'center',
    minHeight: 160,
    paddingHorizontal: 24,
  },
  emptyButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: 18,
  },
  emptyButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
})

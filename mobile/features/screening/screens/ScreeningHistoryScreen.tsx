import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useMemo } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import { useTheme, type AppColors } from '../../../src/context/ThemeContext'
import { font } from '../../../src/theme/typography'
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
  const { petId } = useLocalSearchParams<{ petId?: string }>()

  const handleBack = () => {
    if (petId) {
      router.replace(`/(owner)/pets/${petId}`)
    } else if (router.canGoBack()) {
      router.back()
    } else {
      router.replace('/(owner)/pets')
    }
  }

  const screenings = data?.results ?? []

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.headerBack}>
          <MaterialCommunityIcons color={colors.text} name="arrow-left" size={22} />
        </Pressable>
        <Text style={styles.headerTitle}>Screening History</Text>
        <View style={styles.headerRight} />
      </View>

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
          screenings.map((screening) => {
            const status = STATUS_STYLES[screening.ais_status]
          

            return (
              
              <View key={screening.ais_id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text numberOfLines={1} style={styles.petName}>{screening.pet_name}</Text>
                  <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
                    <Text style={[styles.statusPillText, { color: status.fg }]}>{status.label}</Text>
                  </View>
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
          })
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
  content: { gap: 12, paddingBottom: 24, paddingHorizontal: 20, paddingTop: 30 },
  statusState: { alignItems: 'center', justifyContent: 'center', minHeight: 160 },
  statusText: { ...font.regular, color: colors.textSecondary, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    gap: 3,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  header: { height: 50, marginHorizontal: 10, marginBottom: 8, marginTop: -10 },
  headerBack: {
    alignItems: 'center',
    height: 50,
    justifyContent: 'center',
    width: 50,
    marginTop: 20,
  }, 
  headerTitle: { ...font.extrabold, color: colors.text, fontSize: 20, marginTop: -40, marginLeft: 50 },
  headerRight: { width: 20 },
  cardHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  petName: { ...font.bold, color: colors.text, flex: 1, fontSize: 16, marginRight: 10 },
  statusPill: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusPillText: { ...font.bold, fontSize: 11 },
  disease: { ...font.semibold, color: colors.text, fontSize: 14 },
  cardFooter: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  meta: { ...font.semibold, color: colors.textSecondary, fontSize: 13 },
  source: {
    ...font.bold,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 6,
    color: colors.textMuted,
    fontSize: 10,
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
  emptyButtonText: { ...font.bold, color: '#FFFFFF', fontSize: 14 },
})

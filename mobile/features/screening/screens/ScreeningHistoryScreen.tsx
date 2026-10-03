import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useMemo } from 'react'
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'

import { ErrorRetry } from '../../../src/components/ErrorRetry'
import { useTheme, type AppColors } from '../../../src/context/ThemeContext'
import { usePullToRefresh } from '../../../src/hooks/usePullToRefresh'
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
  const { data, isLoading, isError, refetch } = useAllScreenings()
  const { refreshing, onRefresh } = usePullToRefresh(refetch)

  const screenings = data?.results ?? []

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl colors={[colors.primary]} onRefresh={onRefresh} refreshing={refreshing} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.statusState}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : isError ? (
          <ErrorRetry message="We couldn't load your screening history." onRetry={() => void refetch()} />
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
  content: { gap: 12, paddingBottom: 24, paddingHorizontal: 20, paddingTop: 16 },
  statusState: { alignItems: 'center', justifyContent: 'center', minHeight: 160 },
  statusText: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, textAlign: 'center' },
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

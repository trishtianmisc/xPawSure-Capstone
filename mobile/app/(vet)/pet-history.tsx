import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useMemo } from 'react'
import { ActivityIndicator, Pressable, RefreshControl, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native'

import { ConsultationSummary } from '../../features/vet/components/ConsultationSummary'
import { usePullToRefresh } from '../../features/vet/hooks/usePullToRefresh'
import { useVetPetConsultationHistory } from '../../features/vet/hooks/useVetPetConsultationHistory'
import { useTheme, type AppColors } from '../../src/context/ThemeContext'
import { font } from '../../src/theme/typography'

export default function VetPetHistoryScreen() {
  const { petId, aptId } = useLocalSearchParams<{ petId: string; aptId?: string }>()
  const router = useRouter()
  const { colors, isDark } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])

  const { data, isLoading, isError, refetch, isFetching } = useVetPetConsultationHistory(petId)
  const { refreshing, onRefresh } = usePullToRefresh(refetch)

  const consultations = useMemo(
    () => (data?.consultations ?? []).filter((item) => item.appointment_id !== aptId),
    [data, aptId],
  )

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={styles.safeArea.backgroundColor} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.back()} style={styles.backRow}>
          <View style={styles.backLeft}>
            <MaterialCommunityIcons color={colors.text} name="chevron-left" size={22} />
            <Text style={styles.backText}>Appointment Detail</Text>
          </View>
        </Pressable>

        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={styles.loading} />
        ) : isError || !data ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Unable to load the consultation history.</Text>
            <Pressable
              accessibilityRole="button"
              disabled={isFetching}
              onPress={() => refetch()}
              style={styles.retryBtn}
            >
              <Text style={styles.retryText}>{isFetching ? 'Retrying...' : 'Try again'}</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.headerCard}>
              <Text style={styles.petName}>{data.pet.pet_name}</Text>
              <Text style={styles.subtitle}>
                Consultation history at your clinic
                {data.pet.pet_species ? ` · ${data.pet.pet_species}` : ''}
              </Text>
            </View>

            {consultations.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>
                  No previous consultations recorded for this pet at your clinic.
                </Text>
              </View>
            ) : (
              consultations.map((consultation) => (
                <ConsultationSummary consultation={consultation} key={consultation.id} />
              ))
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 },

  backRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  backLeft: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { ...font.bold, color: colors.text, fontSize: 17 },

  loading: { marginVertical: 40 },

  headerCard: {
    backgroundColor: colors.surface,
    borderColor: colors.borderLight,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
    padding: 16,
  },
  petName: { ...font.extrabold, color: colors.text, fontSize: 20 },
  subtitle: { ...font.regular, color: colors.textSecondary, fontSize: 13, marginTop: 4 },

  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: colors.textSecondary, fontSize: 14, textAlign: 'center' },
  retryBtn: {
    backgroundColor: colors.primaryLight,
    borderRadius: 999,
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  retryText: { ...font.bold, color: colors.primary, fontSize: 13 },
})

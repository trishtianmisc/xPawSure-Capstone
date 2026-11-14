import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useMemo } from 'react'
import { ActivityIndicator, BackHandler, Pressable, RefreshControl, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native'

import { ConsultationSummary } from '../../features/vet/components/ConsultationSummary'
import { VetPetHero } from '../../features/vet/components/VetPetHero'
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

  const consultations = data?.consultations ?? []

  const returnToAppointment = useCallback(() => {
    if (aptId) {
      router.navigate({
        pathname: '/(vet)/consultations/[id]',
        params: { id: aptId },
      })
      return
    }
    if (router.canGoBack()) {
      router.back()
      return
    }
    router.navigate('/(vet)/consultations')
  }, [aptId, router])

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        returnToAppointment()
        return true
      })
      return () => subscription.remove()
    }, [returnToAppointment]),
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
        <Pressable onPress={returnToAppointment} style={styles.backRow}>
          <View style={styles.backLeft}>
            <MaterialCommunityIcons color={colors.text} name="chevron-left" size={22} />
            <Text style={styles.backText}>Consultation History</Text>
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
            <VetPetHero
              breed={data.pet.pet_species}
              imageUrl={data.pet.pet_profile_image}
              petName={data.pet.pet_name}
            />

            {consultations.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>
                  No previous consultations recorded for this pet at your clinic.
                </Text>
              </View>
            ) : (
              consultations.map((consultation) => (
                <ConsultationSummary
                  collapsible
                  consultation={consultation}
                  key={consultation.id}
                  onMoreDetails={() =>
                    router.push({
                      pathname: '/(vet)/consultations/[id]',
                      params: { id: consultation.appointment_id },
                    })
                  }
                />
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

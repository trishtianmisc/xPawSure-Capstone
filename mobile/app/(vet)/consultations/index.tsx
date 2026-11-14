import { useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, RefreshControl, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'

import { useTheme, type AppColors } from '../../../src/context/ThemeContext'
import { font } from '../../../src/theme/typography'
import { VetAppointmentCard } from '../../../features/vet/components/VetAppointmentCard'
import { usePullToRefresh } from '../../../features/vet/hooks/usePullToRefresh'
import { useRefreshVetOnFocus } from '../../../features/vet/hooks/useRefreshVetOnFocus'
import { useVetAppointments } from '../../../features/vet/hooks/useVetAppointments'
import { formatShortDate, formatTime } from '../../../features/vet/lib/format'
import { manilaDateKey } from '../../../src/utils/datetime'
import type { AppointmentStatus, ConsultationTab } from '../../../features/vet/types'

const TABS: ConsultationTab[] = ['TODAY', 'UPCOMING', 'COMPLETED', 'CANCELLED']

const INACTIVE: AppointmentStatus[] = ['CANCELLED', 'NO_SHOW']

export default function VetConsultationListScreen() {
  const router = useRouter()
  const { colors, isDark } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [activeTab, setActiveTab] = useState<ConsultationTab>('TODAY')

  const { data, isLoading, isError, refetch } = useVetAppointments({})
  const { refreshing, onRefresh } = usePullToRefresh(refetch)
  useRefreshVetOnFocus('appointments')
  const appointments = data ?? []
  const todayStr = manilaDateKey()

  const filtered = useMemo(() => {
    if (activeTab === 'TODAY') {
      return appointments
        .filter((a) => manilaDateKey(a.apt_scheduled_at) === todayStr && !INACTIVE.includes(a.apt_status))
        .sort((a, b) => a.apt_scheduled_at.localeCompare(b.apt_scheduled_at))
    }
    if (activeTab === 'UPCOMING') {
      return appointments
        .filter((a) => manilaDateKey(a.apt_scheduled_at) > todayStr && !INACTIVE.includes(a.apt_status))
        .sort((a, b) => a.apt_scheduled_at.localeCompare(b.apt_scheduled_at))
    }
    if (activeTab === 'CANCELLED') {
      return appointments
        .filter((a) => INACTIVE.includes(a.apt_status))
        .sort((a, b) => b.apt_scheduled_at.localeCompare(a.apt_scheduled_at))
    }
    return appointments
      .filter((a) => a.apt_status === 'COMPLETED')
      .sort((a, b) => b.apt_scheduled_at.localeCompare(a.apt_scheduled_at))
  }, [activeTab, appointments, todayStr])

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
        <Text style={styles.title}>Consultations</Text>

        <View style={styles.tabRow}>
          {TABS.map((tab) => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
            >
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
                style={[styles.tabText, activeTab === tab && styles.tabTextActive]}
              >
                {tab.charAt(0) + tab.slice(1).toLowerCase()}
              </Text>
            </Pressable>
          ))}
        </View>

        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={styles.loading} />
        ) : isError ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Unable to load consultations.</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No consultations found.</Text>
          </View>
        ) : (
          filtered.map((item) => (
            <VetAppointmentCard
              breed={item.pet_breed ?? item.pet_species}
              imageUrl={item.pet_profile_image}
              key={item.apt_id}
              meta={`${formatShortDate(item.apt_scheduled_at)} · ${formatTime(item.apt_scheduled_at)}`}
              onPress={() => router.push(`/(vet)/consultations/${item.apt_id}`)}
              petName={item.pet_name}
              status={item.apt_status}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 },

  title: { ...font.extrabold, color: colors.text, fontSize: 22, marginBottom: 16 },

  tabRow: { flexDirection: 'row', backgroundColor: colors.surfaceAlt, borderRadius: 10, padding: 4, marginBottom: 20, gap: 2 },
  tab: { flex: 1, minWidth: 0, alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4, borderRadius: 8 },
  tabActive: { backgroundColor: colors.surface },
  tabText: { ...font.semibold, color: colors.textSecondary, fontSize: 12 },
  tabTextActive: { color: colors.text },

  loading: { marginVertical: 40 },

  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { ...font.regular, color: colors.textSecondary, fontSize: 14 },
})

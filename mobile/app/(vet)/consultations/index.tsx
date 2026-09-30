import { useMemo, useState } from 'react'
import { Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'

import { useTheme, type AppColors } from '../../../src/context/ThemeContext'
import { MOCK_VET_CONSULTATIONS } from '../../../features/vet/data/mock'
import type { ConsultationStatus } from '../../../features/vet/types'

const TABS: ConsultationStatus[] = ['TODAY', 'UPCOMING', 'COMPLETED']

const STATUS_COLORS: Record<ConsultationStatus, { bg: string; text: string }> = {
  TODAY: { bg: '#FDEBD0', text: '#E67E22' },
  UPCOMING: { bg: '#D6EAF8', text: '#2E86C1' },
  COMPLETED: { bg: '#D5F5E3', text: '#27AE60' },
}

const TODAY_DATE = 'April 9, 2026'

export default function VetConsultationListScreen() {
  const router = useRouter()
  const { colors, isDark } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [activeTab, setActiveTab] = useState<ConsultationStatus>('TODAY')

  const filtered = useMemo(() => {
    if (activeTab === 'TODAY') {
      const todayItems = MOCK_VET_CONSULTATIONS.filter((c) => c.status === 'TODAY')
      const completedToday = MOCK_VET_CONSULTATIONS.filter((c) => c.status === 'COMPLETED' && c.date === TODAY_DATE)
      return [...todayItems, ...completedToday]
    }
    if (activeTab === 'UPCOMING') {
      return MOCK_VET_CONSULTATIONS.filter((c) => c.status === 'UPCOMING')
    }
    return MOCK_VET_CONSULTATIONS.filter((c) => c.status === 'COMPLETED')
  }, [activeTab])

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={styles.safeArea.backgroundColor} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Consultations</Text>

        <View style={styles.tabRow}>
          {TABS.map((tab) => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab.charAt(0) + tab.slice(1).toLowerCase()}
              </Text>
            </Pressable>
          ))}
        </View>

        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No consultations found.</Text>
          </View>
        ) : (
          filtered.map((item) => {
            const statusStyle = STATUS_COLORS[item.status]
            return (
              <Pressable
                key={item.id}
                onPress={() => router.push(`/(vet)/consultations/${item.id}`)}
                style={styles.card}
              >
                <View style={styles.cardTop}>
                  <View style={styles.cardDateTime}>
                    <Text style={styles.cardDate}>{item.date} | {item.time}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                    <Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>{item.status}</Text>
                  </View>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.petName}>{item.pet_name} <Text style={styles.petBreed}>| {item.breed}</Text></Text>
                  <Text style={styles.ownerName}>Owner: {item.owner_name}</Text>
                </View>
              </Pressable>
            )
          })
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 },

  title: { color: colors.text, fontSize: 22, fontWeight: '800', marginBottom: 16 },

  tabRow: { flexDirection: 'row', backgroundColor: colors.surfaceAlt, borderRadius: 10, padding: 4, marginBottom: 20 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8 },
  tabActive: { backgroundColor: colors.surface },
  tabText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: colors.text },

  card: { backgroundColor: colors.surface, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.borderLight },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardDateTime: {},
  cardDate: { color: colors.text, fontSize: 14, fontWeight: '700' },
  cardInfo: { marginTop: 10 },
  petName: { color: colors.text, fontSize: 16, fontWeight: '700' },
  petBreed: { color: colors.textSecondary, fontSize: 14, fontWeight: '500' },
  ownerName: { color: colors.textSecondary, fontSize: 13, marginTop: 4 },

  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },

  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: colors.textSecondary, fontSize: 14 },
})

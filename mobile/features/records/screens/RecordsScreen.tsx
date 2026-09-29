import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import { useTheme, type AppColors } from '../../../src/context/ThemeContext'
import type {
  ConsultationRecord,
  PrescriptionRecord,
  VaccinationRecordItem,
} from '../../../src/services/records'
import { VaccinationStatusPill } from '../components/VaccinationStatusPill'
import { useConsultations } from '../hooks/useConsultations'
import { usePrescriptions } from '../hooks/usePrescriptions'
import { useVaccinations } from '../hooks/useVaccinations'

type Tab = 'consultations' | 'prescriptions' | 'vaccinations'

const TABS: { value: Tab; label: string }[] = [
  { value: 'consultations', label: 'Consults' },
  { value: 'prescriptions', label: 'Meds' },
  { value: 'vaccinations', label: 'Vaccines' },
]

function parseTab(value: string | string[] | undefined): Tab | null {
  if (value === 'consultations' || value === 'prescriptions' || value === 'vaccinations') {
    return value
  }
  return null
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function RecordCard({
  petName,
  title,
  meta,
  footer,
  badge,
  onPress,
}: {
  petName: string
  title: string
  meta?: string
  footer: string
  badge?: ReactNode
  onPress: () => void
}) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.card}>
      <View style={styles.cardHeader}>
        <Text numberOfLines={1} style={styles.petName}>{petName}</Text>
        {badge}
      </View>
      <Text numberOfLines={1} style={styles.cardTitle}>{title}</Text>
      {meta ? <Text numberOfLines={1} style={styles.meta}>{meta}</Text> : null}
      <View style={styles.cardFooter}>
        <Text style={styles.dateText}>{footer}</Text>
        <Ionicons color={colors.textMuted} name="chevron-forward" size={16} />
      </View>
    </Pressable>
  )
}

export default function RecordsScreen() {
  const router = useRouter()
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const params = useLocalSearchParams<{ tab?: string }>()
  const [tab, setTab] = useState<Tab>(() => parseTab(params.tab) ?? 'consultations')

  useEffect(() => {
    const requested = parseTab(params.tab)
    if (requested) setTab(requested)
  }, [params.tab])

  const consultations = useConsultations()
  const prescriptions = usePrescriptions()
  const vaccinations = useVaccinations()

  const active = tab === 'consultations' ? consultations
    : tab === 'prescriptions' ? prescriptions
      : vaccinations
  const { data, isError, isLoading } = active

  const emptyText =
    tab === 'consultations' ? 'No consultation records yet.'
      : tab === 'prescriptions' ? 'No prescriptions yet.'
        : 'No vaccination records yet.'

  const emptyIcon =
    tab === 'consultations' ? 'clipboard-text-outline'
      : tab === 'prescriptions' ? 'pill'
        : 'needle'

  const renderList = () => {
    if (isLoading) {
      return (
        <View style={styles.statusState}>
          <ActivityIndicator color={colors.primary} />
        </View>
      )
    }

    if (isError) {
      return (
        <Text style={styles.statusText}>
          We couldn&apos;t load your records. Please try again.
        </Text>
      )
    }

    if (tab === 'consultations') {
      const items = (data as ConsultationRecord[] | undefined) ?? []
      if (items.length === 0) return renderEmpty()
      return items.map((record) => (
        <RecordCard
          key={record.id}
          petName={record.pet_name}
          title={record.diagnosis}
          meta={record.veterinarian}
          footer={formatDate(record.created_at)}
          onPress={() => router.push(`/(owner)/records/consultations/${record.id}`)}
        />
      ))
    }

    if (tab === 'prescriptions') {
      const items = (data as PrescriptionRecord[] | undefined) ?? []
      if (items.length === 0) return renderEmpty()
      return items.map((record) => (
        <RecordCard
          key={record.id}
          petName={record.pet_name}
          title={record.items.length === 1 ? record.items[0].medicine_name : `${record.items.length} medications`}
          meta={record.veterinarian}
          footer={formatDate(record.created_at)}
          onPress={() => router.push(`/(owner)/records/prescriptions/${record.id}`)}
        />
      ))
    }

    const items = (data as VaccinationRecordItem[] | undefined) ?? []
    if (items.length === 0) return renderEmpty()
    return items.map((record) => (
      <RecordCard
        key={record.id}
        petName={record.pet_name}
        title={record.name}
        meta={record.source === 'OWNER' ? 'Reported by you' : (record.veterinarian ?? undefined)}
        footer={`Given ${formatDate(record.date_given)}`}
        badge={<VaccinationStatusPill nextDue={record.next_due} />}
        onPress={() => router.push(`/(owner)/records/vaccinations/${record.id}`)}
      />
    ))
  }

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons color={colors.textMuted} name={emptyIcon as any} size={26} />
      <Text style={styles.statusText}>{emptyText}</Text>
    </View>
  )

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.tabs}>
          {TABS.map(({ value, label }) => (
            <Pressable
              key={value}
              accessibilityRole="tab"
              onPress={() => setTab(value)}
              style={[styles.tab, tab === value && styles.tabActive]}
            >
              <Text style={[styles.tabText, tab === value && styles.tabTextActive]}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        {tab === 'vaccinations' ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/(owner)/records/vaccinations/new')}
            style={styles.addButton}
          >
            <MaterialCommunityIcons color={colors.primary} name="plus" size={18} />
            <Text style={styles.addButtonText}>Add vaccination record</Text>
          </Pressable>
        ) : null}

        <View style={styles.list}>{renderList()}</View>
      </ScrollView>
    </View>
  )
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  screen: { backgroundColor: colors.surface, flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 24, paddingTop: 16 },
  tabs: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 4,
    padding: 4,
  },
  tab: {
    alignItems: 'center',
    borderRadius: 9,
    flex: 1,
    minHeight: 36,
    justifyContent: 'center',
  },
  tabActive: { backgroundColor: colors.surface },
  tabText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: colors.text },
  addButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderRadius: 12,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 44,
    marginTop: 12,
  },
  addButtonText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  list: { gap: 12, paddingTop: 20 },
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
  cardTitle: { color: colors.text, fontSize: 14, fontWeight: '600' },
  meta: { color: colors.textSecondary, fontSize: 13 },
  cardFooter: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  dateText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  statusState: { alignItems: 'center', justifyContent: 'center', minHeight: 160 },
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
  statusText: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, textAlign: 'center' },
})

import { Ionicons } from '@expo/vector-icons'
import { useMemo, type ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { useTheme, type AppColors } from '../../../src/context/ThemeContext'
import type { ConsultationRecord, VaccinationRecordItem } from '../../../src/services/records'
import { VaccinationStatusPill } from '../../records/components/VaccinationStatusPill'
import { STATUS_STYLES } from '../../screening/constants'
import type { Screening } from '../../screening/types'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function RowShell({
  title,
  meta,
  badge,
  onPress,
}: {
  title: string
  meta: string
  badge?: ReactNode
  onPress: () => void
}) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.row}>
      <View style={styles.rowMain}>
        <Text numberOfLines={1} style={styles.rowTitle}>{title}</Text>
        <Text numberOfLines={1} style={styles.rowMeta}>{meta}</Text>
      </View>
      <View style={styles.rowAside}>
        {badge}
        <Ionicons color={colors.textMuted} name="chevron-forward" size={16} />
      </View>
    </Pressable>
  )
}

export function VaccinationRow({
  record,
  onPress,
}: {
  record: VaccinationRecordItem
  onPress: () => void
}) {
  return (
    <RowShell
      title={record.name}
      meta={`Given ${formatDate(record.date_given)}`}
      badge={<VaccinationStatusPill nextDue={record.next_due} />}
      onPress={onPress}
    />
  )
}

export function ConsultationRow({
  record,
  onPress,
}: {
  record: ConsultationRecord
  onPress: () => void
}) {
  return (
    <RowShell
      title={record.diagnosis || record.chief_complaint || 'Consultation'}
      meta={`${record.veterinarian} · ${formatDate(record.created_at)}`}
      onPress={onPress}
    />
  )
}

export function ScreeningRow({
  screening,
  onPress,
}: {
  screening: Screening
  onPress: () => void
}) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const status = STATUS_STYLES[screening.ais_status]

  return (
    <RowShell
      title={screening.disease}
      meta={`${screening.ais_confidence}% confidence · ${formatDate(screening.ais_created_at)}`}
      badge={
        <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
          <Text style={[styles.statusPillText, { color: status.fg }]}>{status.label}</Text>
        </View>
      }
      onPress={onPress}
    />
  )
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  row: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowMain: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  rowMeta: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  rowAside: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },

  statusPill: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
})

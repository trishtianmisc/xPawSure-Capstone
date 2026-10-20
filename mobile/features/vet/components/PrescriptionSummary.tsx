import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { useTheme, type AppColors } from '../../../src/context/ThemeContext'
import { font } from '../../../src/theme/typography'
import { formatShortDate } from '../lib/format'
import type { VetPrescriptionInfo } from '../types'

const ROUTE_LABELS: Record<string, string> = {
  ORAL: 'Oral',
  TOPICAL: 'Topical',
  INJECTION: 'Injection',
  EAR: 'Ear',
  EYE: 'Eye',
  OTHER: 'Other',
}

function hasText(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function routeLabel(value: string): string {
  return ROUTE_LABELS[value] ?? value
}

export function PrescriptionSummary({ prescription }: { prescription: VetPrescriptionInfo }) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])

  const meta = [prescription.veterinarian, formatShortDate(prescription.created_at)]
    .filter((value) => value.trim().length > 0)
    .join(' · ')

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Prescription</Text>
      {meta ? <Text style={styles.meta}>{meta}</Text> : null}

      {hasText(prescription.instructions) ? (
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsLabel}>Instructions</Text>
          <Text style={styles.instructionsText}>{prescription.instructions}</Text>
        </View>
      ) : null}

      <Text style={styles.itemsTitle}>Medications ({prescription.items.length})</Text>
      {prescription.items.length === 0 ? (
        <Text style={styles.emptyText}>No medications recorded.</Text>
      ) : (
        <View style={styles.items}>
          {prescription.items.map((item) => {
            const schedule = [item.dosage, item.frequency, item.duration]
              .filter(hasText)
              .join(' · ')

            return (
              <View key={item.id} style={styles.medCard}>
                <View style={styles.medHeader}>
                  <Text numberOfLines={2} style={styles.medName}>{item.medicine_name}</Text>
                  <View style={styles.routeBadge}>
                    <Text style={styles.routeBadgeText}>{routeLabel(item.route)}</Text>
                  </View>
                </View>
                {hasText(item.generic_name) ? (
                  <Text style={styles.medMeta}>Generic: {item.generic_name}</Text>
                ) : null}
                {schedule ? <Text style={styles.medDose}>{schedule}</Text> : null}
                {item.quantity != null ? (
                  <Text style={styles.medMeta}>Quantity: {item.quantity}</Text>
                ) : null}
                {hasText(item.notes) ? (
                  <Text style={styles.medNotes}>{item.notes}</Text>
                ) : null}
              </View>
            )
          })}
        </View>
      )}
    </View>
  )
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.borderLight,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
    padding: 16,
  },
  title: { ...font.extrabold, color: colors.text, fontSize: 17 },
  meta: { ...font.regular, color: colors.textSecondary, fontSize: 12, marginTop: 4 },
  instructionsCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    marginTop: 14,
    padding: 14,
  },
  instructionsLabel: {
    ...font.bold,
    color: colors.primary,
    fontSize: 11,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  instructionsText: { ...font.regular, color: colors.text, fontSize: 14, lineHeight: 21 },
  itemsTitle: {
    ...font.bold,
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 8,
    marginTop: 16,
    textTransform: 'uppercase',
  },
  items: { gap: 10 },
  medCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    gap: 6,
    padding: 14,
  },
  medHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  medName: { ...font.bold, color: colors.text, flex: 1, fontSize: 15, marginRight: 10 },
  routeBadge: {
    backgroundColor: colors.primaryLight,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  routeBadgeText: { ...font.bold, color: colors.primary, fontSize: 11 },
  medDose: { ...font.regular, color: colors.textSecondary, fontSize: 13 },
  medMeta: { ...font.regular, color: colors.textSecondary, fontSize: 13 },
  medNotes: { ...font.regular, color: colors.textMuted, fontSize: 13, fontStyle: 'italic' },
  emptyText: { ...font.regular, color: colors.textSecondary, fontSize: 14 },
})

import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'

import type { PrescriptionRecord } from '../../../src/services/records'
import { useTheme, type AppColors } from '../../../src/context/ThemeContext'
import { font } from '../../../src/theme/typography'
import { PrescriptionImageModal } from '../../records/components/PrescriptionImageModal'
import { usePrescriptionPdfExport } from '../../records/hooks/usePrescriptionPdfExport'
import { formatShortDate } from '../lib/format'
import type { VetAppointment, VetPrescriptionInfo } from '../types'

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

function toPrescriptionRecord(
  prescription: VetPrescriptionInfo,
  appointment: VetAppointment,
): PrescriptionRecord {
  return {
    id: prescription.id,
    consultation_id: prescription.consultation_id,
    pet_id: prescription.pet_id,
    pet_name: prescription.pet_name,
    pet_breed: appointment.pet_breed ?? null,
    pet_sex: appointment.pet_sex ?? null,
    pet_birth_date: appointment.pet_birth_date ?? null,
    pet_weight: appointment.pet_weight ?? null,
    pet_color: appointment.pet_color ?? null,
    owner_name: appointment.owner_name,
    veterinarian: prescription.veterinarian,
    vet_license_number:
      prescription.vet_license_number ?? appointment.vet_license_number ?? null,
    clinic_name: appointment.clinic_name ?? '',
    clinic_address: appointment.clinic_address ?? null,
    clinic_phone: appointment.clinic_phone ?? null,
    instructions: prescription.instructions,
    items: prescription.items,
    created_at: prescription.created_at,
  }
}

interface PrescriptionSummaryProps {
  prescription: VetPrescriptionInfo
  appointment: VetAppointment
}

export function PrescriptionSummary({ prescription, appointment }: PrescriptionSummaryProps) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const { exportPdf, isExporting } = usePrescriptionPdfExport()
  const [imageModalVisible, setImageModalVisible] = useState(false)

  const record = useMemo(
    () => toPrescriptionRecord(prescription, appointment),
    [prescription, appointment],
  )

  const vetName = prescription.veterinarian.trim()
  const licenseNumber =
    (prescription.vet_license_number ?? appointment.vet_license_number)?.trim() ?? ''
  const date = formatShortDate(prescription.created_at)
  const meta = [
    licenseNumber ? `License No. ${licenseNumber}` : '',
    date,
  ]
    .filter((value) => value.trim().length > 0)
    .join(' · ')

  return (
    <>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Prescription</Text>
          <View style={styles.headerActions}>
            <Pressable
              accessibilityLabel="Save or share prescription PDF"
              accessibilityRole="button"
              disabled={isExporting}
              onPress={() => void exportPdf(record)}
              style={({ pressed }) => [
                styles.pdfButton,
                pressed && !isExporting && styles.pdfButtonPressed,
                isExporting && styles.pdfButtonDisabled,
              ]}
            >
              {isExporting ? (
                <ActivityIndicator color={colors.inverse} size="small" />
              ) : (
                <MaterialCommunityIcons color={colors.inverse} name="file-pdf-box" size={14} />
              )}
              <Text style={styles.pdfButtonText}>PDF</Text>
            </Pressable>

            <Pressable
              accessibilityLabel="View prescription as an image"
              accessibilityRole="button"
              onPress={() => setImageModalVisible(true)}
              style={({ pressed }) => [
                styles.imageButton,
                pressed && styles.imageButtonPressed,
              ]}
            >
              <MaterialCommunityIcons color={colors.primary} name="image-outline" size={14} />
              <Text style={styles.imageButtonText}>Image</Text>
            </Pressable>
          </View>
        </View>
        {vetName ? <Text style={styles.vetName}>{vetName}</Text> : null}
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

      <PrescriptionImageModal
        onClose={() => setImageModalVisible(false)}
        prescription={record}
        visible={imageModalVisible}
      />
    </>
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
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  headerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  title: { ...font.extrabold, color: colors.text, flexShrink: 1, fontSize: 17 },
  pdfButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 4,
    minHeight: 28,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pdfButtonPressed: { opacity: 0.85 },
  pdfButtonDisabled: { opacity: 0.65 },
  pdfButtonText: { ...font.bold, color: colors.inverse, fontSize: 11 },
  imageButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    minHeight: 28,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  imageButtonPressed: { backgroundColor: colors.primaryLight },
  imageButtonText: { ...font.bold, color: colors.primary, fontSize: 11 },
  vetName: { ...font.semibold, color: colors.text, fontSize: 13, marginTop: 6 },
  meta: { ...font.regular, color: colors.textSecondary, fontSize: 12, marginTop: 2 },
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

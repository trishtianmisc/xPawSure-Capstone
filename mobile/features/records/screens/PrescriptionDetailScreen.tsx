import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useLocalSearchParams } from 'expo-router'
import { useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import { useTheme, type AppColors } from '../../../src/context/ThemeContext'
import type { PrescriptionItemRecord } from '../../../src/services/records'
import { font } from '../../../src/theme/typography'
import { formatDate } from '../../../src/utils/datetime'
import { PrescriptionImageModal } from '../components/PrescriptionImageModal'
import { usePrescription } from '../hooks/usePrescription'
import { usePrescriptionPdfExport } from '../hooks/usePrescriptionPdfExport'
import { useRecordDetailBack } from '../lib/recordNavigation'

function formatLongDate(iso: string): string {
  return formatDate(iso, { day: 'numeric', month: 'long', year: 'numeric' })
}

function MedicationCard({ item }: { item: PrescriptionItemRecord }) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])

  return (
    <View style={styles.medCard}>
      <View style={styles.medHeader}>
        <Text numberOfLines={1} style={styles.medName}>{item.medicine_name}</Text>
        <View style={styles.routeBadge}>
          <Text style={styles.routeBadgeText}>{item.route}</Text>
        </View>
      </View>
      <Text style={styles.medDose}>{item.dosage} · {item.frequency} · {item.duration}</Text>
      {item.quantity != null && (
        <Text style={styles.medMeta}>Quantity: {item.quantity}</Text>
      )}
      {item.notes ? <Text style={styles.medNotes}>{item.notes}</Text> : null}
    </View>
  )
}

export default function PrescriptionDetailScreen() {
  const { id, fromConsultation } = useLocalSearchParams<{
    id: string
    fromConsultation?: string
  }>()
  const { colors } = useTheme()
  const { data: prescription, isLoading, isError, error } = usePrescription(id)
  const { exportPdf, isExporting } = usePrescriptionPdfExport()
  const [imageModalVisible, setImageModalVisible] = useState(false)
  const styles = useMemo(() => createStyles(colors), [colors])
  const backHref = fromConsultation
    ? `/(owner)/records/consultations/${fromConsultation}`
    : undefined
  const handleBack = useRecordDetailBack('prescriptions', backHref)

  const renderHeader = () => (
    <View style={styles.header}>
      <Pressable
        accessibilityLabel={fromConsultation ? 'Back to consultation' : 'Go back'}
        accessibilityRole="button"
        hitSlop={8}
        onPress={handleBack}
        style={styles.headerBack}
      >
        <MaterialCommunityIcons color={colors.text} name="arrow-left" size={22} />
      </Pressable>
      <Text style={styles.headerTitle}>Prescription Details</Text>
      <View style={styles.headerRight} />
    </View>
  )

  if (isLoading) {
    return (
      <View style={styles.screen}>
        {renderHeader()}
        <View style={styles.stateContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.stateText}>Loading prescription...</Text>
        </View>
      </View>
    )
  }

  if (isError || !prescription) {
    return (
      <View style={styles.screen}>
        {renderHeader()}
        <View style={styles.stateContainer}>
          <MaterialCommunityIcons color={colors.error} name="alert-circle-outline" size={42} />
          <Text style={styles.stateText}>
            {(error as Error)?.message || 'Unable to load this prescription.'}
          </Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.screen}>
      {renderHeader()}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerCard}>
          <Text style={styles.petName}>{prescription.pet_name}</Text>
          <Text style={styles.meta}>
            {formatLongDate(prescription.created_at)} · {prescription.veterinarian}
          </Text>
        </View>

        <View style={styles.actionRow}>
          <Pressable
            accessibilityLabel="Save or share prescription PDF"
            accessibilityRole="button"
            disabled={isExporting}
            onPress={() => void exportPdf(prescription)}
            style={({ pressed }) => [
              styles.pdfButton,
              pressed && !isExporting && styles.pdfButtonPressed,
              isExporting && styles.pdfButtonDisabled,
            ]}
          >
            {isExporting ? (
              <ActivityIndicator color={colors.inverse} size="small" />
            ) : (
              <MaterialCommunityIcons color={colors.inverse} name="file-pdf-box" size={18} />
            )}
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              numberOfLines={1}
              style={styles.pdfButtonText}
            >
              {isExporting ? 'Creating PDF...' : 'Save / Share PDF'}
            </Text>
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
            <MaterialCommunityIcons color={colors.primary} name="image-outline" size={18} />
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              numberOfLines={1}
              style={styles.imageButtonText}
            >
              View as Image
            </Text>
          </Pressable>
        </View>

        {prescription.instructions ? (
          <View style={styles.instructionsCard}>
            <Text style={styles.instructionsLabel}>Instructions</Text>
            <Text style={styles.instructionsText}>{prescription.instructions}</Text>
          </View>
        ) : null}

        <Text style={styles.listTitle}>
          Medications ({prescription.items.length})
        </Text>
        {prescription.items.map((item) => (
          <MedicationCard key={item.id} item={item} />
        ))}
      </ScrollView>

      <PrescriptionImageModal
        onClose={() => setImageModalVisible(false)}
        prescription={prescription}
        visible={imageModalVisible}
      />
    </View>
  )
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  screen: { backgroundColor: colors.surface, flex: 1 },
  header: { alignItems: 'center', flexDirection: 'row', height: 48, marginBottom: 4, marginHorizontal: 10, marginTop: 4 },
  headerBack: { alignItems: 'center', height: 48, justifyContent: 'center', width: 48 },
  headerTitle: { ...font.extrabold, color: colors.text, fontSize: 20, marginLeft: 2 },
  headerRight: { width: 48 },
  content: { gap: 14, paddingBottom: 32, paddingHorizontal: 20, paddingTop: 16 },
  stateContainer: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    flex: 1,
    gap: 10,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  stateText: { ...font.regular, color: colors.textSecondary, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  headerCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  petName: { ...font.extrabold, color: colors.text, fontSize: 20 },
  meta: { ...font.regular, color: colors.textSecondary, fontSize: 13, marginTop: 4 },
  instructionsCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  instructionsLabel: {
    ...font.bold,
    color: colors.primary,
    fontSize: 11,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  instructionsText: { ...font.regular, color: colors.text, fontSize: 14, lineHeight: 21 },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pdfButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 14,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minWidth: 0,
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  pdfButtonPressed: { opacity: 0.85 },
  pdfButtonDisabled: { opacity: 0.65 },
  pdfButtonText: { ...font.bold, color: colors.inverse, flexShrink: 1, fontSize: 13 },
  imageButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderRadius: 14,
    borderWidth: 1.5,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minWidth: 0,
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  imageButtonPressed: { backgroundColor: colors.primaryLight },
  imageButtonText: { ...font.bold, color: colors.primary, flexShrink: 1, fontSize: 13 },
  listTitle: { ...font.extrabold, color: colors.text, fontSize: 16, marginTop: 4 },
  medCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  medHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
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
})

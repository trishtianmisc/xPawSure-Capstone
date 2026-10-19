import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useMemo } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import { useTheme, type AppColors } from '../../../src/context/ThemeContext'
import type { PrescriptionItemRecord } from '../../../src/services/records'
import { font } from '../../../src/theme/typography'
import { usePrescription } from '../hooks/usePrescription'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
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
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { colors } = useTheme()
  const { data: prescription, isLoading, isError, error } = usePrescription(id)
  const styles = useMemo(() => createStyles(colors), [colors])

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back()
    } else {
      router.replace('/(owner)/records')
    }
  }

  const renderHeader = () => (
    <View style={styles.header}>
      <Pressable
        accessibilityLabel="Go back"
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
            {formatDate(prescription.created_at)} · {prescription.veterinarian}
          </Text>
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

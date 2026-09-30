import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useMemo } from 'react'
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import { useTheme, type AppColors } from '../../../src/context/ThemeContext'
import { apiErrorMessage } from '../../../src/utils/error'
import { VaccinationStatusPill } from '../components/VaccinationStatusPill'
import { useDeleteVaccination } from '../hooks/useDeleteVaccination'
import { useVaccination } from '../hooks/useVaccination'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function DetailRow({ label, value }: { label: string; value: string | null }) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])

  if (!value) return null

  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  )
}

export default function VaccinationDetailScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { colors } = useTheme()
  const { data: vaccination, isLoading, isError, error } = useVaccination(id)
  const deleteVaccination = useDeleteVaccination()
  const styles = useMemo(() => createStyles(colors), [colors])

  const isOwnerRecord = vaccination?.source === 'OWNER'
  const vetLabel = !vaccination
    ? null
    : vaccination.source === 'OWNER'
      ? 'Reported by you'
      : (vaccination.veterinarian ?? 'Clinic record')

  const confirmDelete = () => {
    if (!vaccination) return
    Alert.alert(
      'Delete vaccination?',
      `${vaccination.name} will be permanently removed from ${vaccination.pet_name}'s record.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteVaccination.mutate(vaccination.id, {
              onSuccess: () => router.back(),
            })
          },
        },
      ],
    )
  }

  if (isLoading) {
    return (
      <View style={styles.stateContainer}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.stateText}>Loading vaccination record...</Text>
      </View>
    )
  }

  if (isError || !vaccination) {
    return (
      <View style={styles.stateContainer}>
        <MaterialCommunityIcons color={colors.error} name="alert-circle-outline" size={42} />
        <Text style={styles.stateText}>
          {(error as Error)?.message || 'Unable to load this vaccination record.'}
        </Text>
      </View>
    )
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      style={styles.screen}
    >
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <Text style={styles.vaccineName}>{vaccination.name}</Text>
          <VaccinationStatusPill nextDue={vaccination.next_due} />
        </View>
        <Text style={styles.petName}>{vaccination.pet_name}</Text>
        <Text style={styles.meta}>
          Given {formatDate(vaccination.date_given)}{vetLabel ? ` · ${vetLabel}` : ''}
        </Text>
      </View>

      <View style={styles.detailsCard}>
        <DetailRow label="Brand" value={vaccination.brand} />
        <DetailRow label="Batch No." value={vaccination.batch_no} />
        <DetailRow label="Dose" value={vaccination.dose} />
        <DetailRow label="Route" value={vaccination.route} />
        <DetailRow
          label="Next Due"
          value={vaccination.next_due ? formatDate(vaccination.next_due) : null}
        />
      </View>

      {vaccination.notes ? (
        <View style={styles.detailsCard}>
          <Text style={styles.notesLabel}>Notes</Text>
          <Text style={styles.notesText}>{vaccination.notes}</Text>
        </View>
      ) : null}

      {isOwnerRecord ? (
        <View style={styles.actionsRow}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/(owner)/records/vaccinations/edit/${vaccination.id}`)}
            style={styles.editButton}
          >
            <MaterialCommunityIcons color={colors.primary} name="pencil-outline" size={18} />
            <Text style={styles.editButtonText}>Edit</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={deleteVaccination.isPending}
            onPress={confirmDelete}
            style={[styles.deleteButton, deleteVaccination.isPending && styles.deleteButtonDisabled]}
          >
            {deleteVaccination.isPending ? (
              <ActivityIndicator color={colors.error} size="small" />
            ) : (
              <>
                <MaterialCommunityIcons color={colors.error} name="trash-can-outline" size={18} />
                <Text style={styles.deleteButtonText}>Delete</Text>
              </>
            )}
          </Pressable>
        </View>
      ) : null}

      {deleteVaccination.isError ? (
        <Text style={styles.deleteError}>{apiErrorMessage(deleteVaccination.error)}</Text>
      ) : null}
    </ScrollView>
  )
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  screen: { backgroundColor: colors.surface, flex: 1 },
  content: { gap: 14, paddingBottom: 32, paddingHorizontal: 20, paddingTop: 16 },
  stateContainer: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    flex: 1,
    gap: 10,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  stateText: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  headerCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  vaccineName: { color: colors.text, flex: 1, fontSize: 20, fontWeight: '800', marginRight: 10 },
  petName: { color: colors.text, fontSize: 15, fontWeight: '700', marginTop: 8 },
  meta: { color: colors.textSecondary, fontSize: 13, marginTop: 4 },
  detailsCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  detailRow: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingVertical: 8,
  },
  detailLabel: { color: colors.textSecondary, fontSize: 13, fontWeight: '500' },
  detailValue: { color: colors.text, flex: 1, fontSize: 14, fontWeight: '700', textAlign: 'right' },
  notesLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 10,
    textTransform: 'uppercase',
  },
  notesText: { color: colors.text, fontSize: 14, lineHeight: 21, paddingBottom: 10 },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderRadius: 12,
    borderWidth: 1.5,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    height: 46,
    justifyContent: 'center',
  },
  editButtonText: { color: colors.primary, fontSize: 15, fontWeight: '700' },
  deleteButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.error,
    borderRadius: 12,
    borderWidth: 1.5,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    height: 46,
    justifyContent: 'center',
  },
  deleteButtonDisabled: { opacity: 0.6 },
  deleteButtonText: { color: colors.error, fontSize: 15, fontWeight: '700' },
  deleteError: { color: colors.error, fontSize: 12, textAlign: 'center' },
})

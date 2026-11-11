import { Platform, StyleSheet, Text, View, type TextProps } from 'react-native'

import type { PrescriptionRecord } from '../../../src/services/records'
import { font } from '../../../src/theme/typography'
import {
  calculatePetAge,
  formatClinicLine,
  formatPetSex,
  formatPetWeight,
  formatPrescriptionDate,
  formatRoute,
} from '../lib/prescriptionPdf'

const PRINT = {
  teal: '#1F6F8B',
  ink: '#1C1917',
  secondary: '#57534E',
  muted: '#78716C',
  line: '#E7E5E4',
  white: '#FFFFFF',
}

function DocText({ style, ...props }: TextProps) {
  return <Text allowFontScaling={false} style={style} {...props} />
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <View style={styles.field}>
      <DocText style={styles.fieldLabel}>{label}</DocText>
      <DocText style={styles.fieldValue}>{value?.trim() || '—'}</DocText>
    </View>
  )
}

interface PrescriptionImageDocumentProps {
  prescription: PrescriptionRecord
  width: number
}

export function PrescriptionImageDocument({
  prescription,
  width,
}: PrescriptionImageDocumentProps) {
  const vetName = prescription.veterinarian.trim() || 'Veterinarian'
  const clinicLine = formatClinicLine(prescription.clinic_name, prescription.clinic_address)
  const clinicPhone = prescription.clinic_phone?.trim() ?? ''
  const instructions = prescription.instructions?.trim() ?? ''
  const licenseNumber = prescription.vet_license_number?.trim() || '—'

  return (
    <View
      collapsable={false}
      style={[styles.sheet, { minHeight: Math.round(width * 1.414), width }]}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <DocText style={styles.vetName}>{vetName}, DVM</DocText>
          <DocText style={styles.subtitle}>Veterinary Medicine</DocText>
          {clinicPhone ? <DocText style={styles.clinicPhone}>{clinicPhone}</DocText> : null}
          {clinicLine ? <DocText style={styles.clinicLine}>{clinicLine}</DocText> : null}
          <View style={styles.ruleThick} />
          <View style={styles.ruleThin} />
        </View>

        <View style={styles.info}>
          <View style={styles.fieldRow}>
            <Field label="Owner's Name" value={prescription.owner_name} />
            <Field
              label="Date"
              value={formatPrescriptionDate(prescription.created_at)}
            />
          </View>

          <View style={styles.infoRule} />

          <View style={styles.fieldRow}>
            <Field label="Pet's Name" value={prescription.pet_name} />
            <Field
              label="Pet's Age"
              value={calculatePetAge(prescription.pet_birth_date)}
            />
          </View>
          <View style={styles.fieldRow}>
            <Field label="Sex" value={formatPetSex(prescription.pet_sex)} />
            <Field label="Weight" value={formatPetWeight(prescription.pet_weight)} />
          </View>
          <View style={styles.fieldRow}>
            <Field label="Breed" value={prescription.pet_breed} />
            <Field label="Color" value={prescription.pet_color} />
          </View>
        </View>

        <View style={styles.rxSection}>
          <DocText style={styles.rxMark}>Rx</DocText>
          <View style={styles.rxBody}>
            <View style={styles.tableHeader}>
              <DocText style={[styles.tableHeaderText, styles.medicineColumn]}>
                Medicine
              </DocText>
              <DocText style={[styles.tableHeaderText, styles.scheduleColumn]}>
                Dosage & schedule
              </DocText>
            </View>

            {prescription.items.length === 0 ? (
              <DocText style={styles.emptyText}>No medications listed.</DocText>
            ) : (
              prescription.items.map((item) => {
                const genericName = item.generic_name?.trim()
                const notes = item.notes?.trim()

                return (
                  <View key={item.id} style={styles.medicationRow}>
                    <View style={styles.medicineColumn}>
                      <DocText style={styles.medicationName}>
                        {item.medicine_name}
                      </DocText>
                      {genericName ? (
                        <DocText style={styles.medicationGeneric}>{genericName}</DocText>
                      ) : null}
                      {notes ? (
                        <DocText style={styles.medicationNotes}>Notes: {notes}</DocText>
                      ) : null}
                    </View>
                    <View style={styles.scheduleColumn}>
                      <DocText style={styles.schedulePrimary}>{item.dosage}</DocText>
                      <DocText style={styles.scheduleSecondary}>
                        {item.frequency} · {item.duration}
                      </DocText>
                      <DocText style={styles.scheduleSecondary}>
                        {formatRoute(item.route)} · Qty:{' '}
                        {item.quantity == null ? '—' : item.quantity}
                      </DocText>
                    </View>
                  </View>
                )
              })
            )}

            {instructions ? (
              <DocText style={styles.instructions}>
                <DocText style={styles.instructionsLabel}>Instructions: </DocText>
                {instructions}
              </DocText>
            ) : null}
          </View>
        </View>

        <View style={styles.signature}>
          <View style={styles.signatureLine} />
          <DocText style={styles.signatureName}>{vetName}, DVM</DocText>
          <View style={styles.licenseRow}>
            <DocText style={styles.licenseLabel}>License #:</DocText>
            <DocText style={styles.licenseValue}>{licenseNumber}</DocText>
          </View>
        </View>
      </View>

      <View style={styles.brandBar} />
    </View>
  )
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: PRINT.white,
    flexDirection: 'column',
    padding: 24,
  },
  content: {
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
  },
  vetName: {
    ...font.extrabold,
    color: PRINT.teal,
    fontSize: 19,
    letterSpacing: 0.7,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  subtitle: {
    ...font.semibold,
    color: PRINT.teal,
    fontSize: 7,
    letterSpacing: 1.8,
    marginTop: 2,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  clinicPhone: {
    ...font.regular,
    color: PRINT.secondary,
    fontSize: 8,
    marginTop: 5,
    textAlign: 'center',
  },
  clinicLine: {
    ...font.semibold,
    color: PRINT.secondary,
    fontSize: 7,
    letterSpacing: 0.6,
    marginTop: 2,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  ruleThick: {
    backgroundColor: PRINT.teal,
    height: 3,
    marginTop: 12,
    width: '100%',
  },
  ruleThin: {
    backgroundColor: PRINT.teal,
    height: 1,
    marginTop: 3,
    width: '100%',
  },
  info: {
    marginTop: 16,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 18,
    marginBottom: 9,
  },
  field: {
    flex: 1,
    minWidth: 0,
  },
  fieldLabel: {
    ...font.semibold,
    color: PRINT.secondary,
    fontSize: 7,
    letterSpacing: 0.4,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  fieldValue: {
    ...font.medium,
    borderBottomColor: PRINT.muted,
    borderBottomWidth: 1,
    color: PRINT.ink,
    fontSize: 10,
    lineHeight: 14,
    minHeight: 17,
    paddingBottom: 2,
  },
  infoRule: {
    backgroundColor: PRINT.teal,
    height: 2,
    marginBottom: 12,
    marginTop: 3,
  },
  rxSection: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  rxMark: {
    color: PRINT.teal,
    fontFamily: Platform.select({ android: 'serif', ios: 'Georgia', default: 'serif' }),
    fontSize: 38,
    fontWeight: '700',
    lineHeight: 42,
    width: 42,
  },
  rxBody: {
    flex: 1,
    minWidth: 0,
  },
  tableHeader: {
    borderTopColor: PRINT.teal,
    borderTopWidth: 2,
    flexDirection: 'row',
    gap: 10,
    paddingBottom: 4,
    paddingTop: 6,
  },
  tableHeaderText: {
    ...font.semibold,
    color: PRINT.teal,
    fontSize: 7,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  medicineColumn: {
    flex: 1.15,
    minWidth: 0,
  },
  scheduleColumn: {
    flex: 1,
    minWidth: 0,
  },
  medicationRow: {
    borderBottomColor: PRINT.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 8,
  },
  medicationName: {
    ...font.semibold,
    color: PRINT.ink,
    fontSize: 10,
    lineHeight: 13,
  },
  medicationGeneric: {
    ...font.regular,
    color: PRINT.muted,
    fontSize: 8,
    lineHeight: 11,
    marginTop: 1,
  },
  medicationNotes: {
    ...font.regular,
    color: PRINT.secondary,
    fontSize: 8,
    fontStyle: 'italic',
    lineHeight: 11,
    marginTop: 2,
  },
  schedulePrimary: {
    ...font.semibold,
    color: PRINT.ink,
    fontSize: 9,
    lineHeight: 12,
  },
  scheduleSecondary: {
    ...font.regular,
    color: PRINT.secondary,
    fontSize: 8,
    lineHeight: 11,
    marginTop: 1,
  },
  emptyText: {
    ...font.regular,
    color: PRINT.muted,
    fontSize: 9,
    fontStyle: 'italic',
    paddingVertical: 10,
  },
  instructions: {
    ...font.regular,
    color: PRINT.secondary,
    fontSize: 9,
    lineHeight: 13,
    marginTop: 10,
  },
  instructionsLabel: {
    ...font.semibold,
    color: PRINT.ink,
  },
  signature: {
    alignItems: 'flex-end',
    marginTop: 24,
  },
  signatureLine: {
    borderTopColor: PRINT.muted,
    borderTopWidth: 1,
    marginBottom: 5,
    width: 150,
  },
  signatureName: {
    ...font.bold,
    color: PRINT.teal,
    fontSize: 10,
  },
  licenseRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    marginTop: 6,
  },
  licenseLabel: {
    ...font.regular,
    color: PRINT.secondary,
    fontSize: 8,
  },
  licenseValue: {
    ...font.medium,
    borderBottomColor: PRINT.muted,
    borderBottomWidth: 1,
    color: PRINT.ink,
    fontSize: 8,
    marginLeft: 4,
    minWidth: 70,
    paddingBottom: 1,
  },
  brandBar: {
    backgroundColor: PRINT.teal,
    height: 8,
    marginTop: 18,
  },
})

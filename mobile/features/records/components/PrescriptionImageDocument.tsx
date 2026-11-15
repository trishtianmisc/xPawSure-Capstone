import { useMemo } from 'react'
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

type DocumentStyles = ReturnType<typeof createDocumentStyles>

function Field({
  label,
  styles,
  value,
}: {
  label: string
  styles: DocumentStyles
  value: string | null | undefined
}) {
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
  const styles = useMemo(() => createDocumentStyles(width), [width])
  const vetName = prescription.veterinarian.trim() || 'Veterinarian'
  const clinicLine = formatClinicLine(prescription.clinic_name, prescription.clinic_address)
  const clinicPhone = prescription.clinic_phone?.trim() ?? ''
  const instructions = prescription.instructions?.trim() ?? ''
  const licenseNumber = prescription.vet_license_number?.trim() || '—'

  return (
    <View collapsable={false} style={styles.sheet}>
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
            <Field label="Owner's Name" styles={styles} value={prescription.owner_name} />
            <Field
              label="Date"
              styles={styles}
              value={formatPrescriptionDate(prescription.created_at)}
            />
          </View>

          <View style={styles.infoRule} />

          <View style={styles.fieldRow}>
            <Field label="Pet's Name" styles={styles} value={prescription.pet_name} />
            <Field
              label="Pet's Age"
              styles={styles}
              value={calculatePetAge(prescription.pet_birth_date)}
            />
          </View>
          <View style={styles.fieldRow}>
            <Field label="Sex" styles={styles} value={formatPetSex(prescription.pet_sex)} />
            <Field label="Weight" styles={styles} value={formatPetWeight(prescription.pet_weight)} />
          </View>
          <View style={styles.fieldRow}>
            <Field label="Breed" styles={styles} value={prescription.pet_breed} />
            <Field label="Color" styles={styles} value={prescription.pet_color} />
          </View>
        </View>

        <View style={styles.rxSection}>
          <DocText numberOfLines={1} style={styles.rxMark}>
            Rx
          </DocText>
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

const A4_WIDTH_MM = 210
const A4_HEIGHT_MM = 297
const MM_PER_INCH = 25.4
const PRINT_DPI = 96
const POINTS_PER_INCH = 72

function createDocumentStyles(width: number) {
  const scale = width / ((A4_WIDTH_MM / MM_PER_INCH) * PRINT_DPI)
  const px = (value: number) => value * scale
  const pt = (value: number) => (value / POINTS_PER_INCH) * PRINT_DPI * scale
  const mm = (value: number) => (value / MM_PER_INCH) * PRINT_DPI * scale

  return StyleSheet.create({
    sheet: {
      backgroundColor: PRINT.white,
      flexDirection: 'column',
      minHeight: Math.round(width * (A4_HEIGHT_MM / A4_WIDTH_MM)),
      padding: mm(12),
      width,
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
      fontSize: pt(20),
      letterSpacing: pt(20) * 0.04,
      lineHeight: pt(20) * 1.45,
      textAlign: 'center',
      textTransform: 'uppercase',
    },
    subtitle: {
      ...font.semibold,
      color: PRINT.teal,
      fontSize: pt(7.5),
      letterSpacing: pt(7.5) * 0.2,
      lineHeight: pt(7.5) * 1.45,
      marginTop: px(2),
      textAlign: 'center',
      textTransform: 'uppercase',
    },
    clinicPhone: {
      ...font.regular,
      color: PRINT.secondary,
      fontSize: pt(8),
      lineHeight: pt(8) * 1.45,
      marginTop: px(5),
      textAlign: 'center',
    },
    clinicLine: {
      ...font.semibold,
      color: PRINT.secondary,
      fontSize: pt(7.5),
      letterSpacing: pt(7.5) * 0.08,
      lineHeight: pt(7.5) * 1.45,
      marginTop: px(2),
      textAlign: 'center',
      textTransform: 'uppercase',
    },
    ruleThick: {
      backgroundColor: PRINT.teal,
      height: px(3),
      marginTop: px(12),
      width: '100%',
    },
    ruleThin: {
      backgroundColor: PRINT.teal,
      height: px(1),
      marginTop: px(3),
      width: '100%',
    },
    info: {
      marginTop: px(18),
    },
    fieldRow: {
      flexDirection: 'row',
      gap: px(36),
      marginBottom: px(9),
    },
    field: {
      flex: 1,
      minWidth: 0,
    },
    fieldLabel: {
      ...font.semibold,
      color: PRINT.secondary,
      fontSize: pt(7.5),
      letterSpacing: pt(7.5) * 0.04,
      lineHeight: pt(7.5) * 1.45,
      marginBottom: px(2),
      textTransform: 'uppercase',
    },
    fieldValue: {
      ...font.medium,
      borderBottomColor: PRINT.muted,
      borderBottomWidth: px(1),
      color: PRINT.ink,
      fontSize: pt(9.5),
      lineHeight: pt(9.5) * 1.45,
      minHeight: px(17),
      paddingBottom: px(2),
    },
    infoRule: {
      backgroundColor: PRINT.teal,
      height: px(2),
      marginBottom: px(12),
      marginTop: px(5),
    },
    rxSection: {
      flexDirection: 'row',
      flexGrow: 1,
      gap: px(20),
      marginTop: px(18),
    },
    rxMark: {
      color: PRINT.teal,
      flexShrink: 0,
      fontFamily: Platform.select({ android: 'serif', ios: 'Georgia', default: 'serif' }),
      fontSize: pt(54),
      fontWeight: '700',
      lineHeight: pt(54) * 1.1,
      minWidth: px(84),
      paddingTop: px(5),
    },
    rxBody: {
      flex: 1,
      minWidth: 0,
    },
    tableHeader: {
      borderTopColor: PRINT.teal,
      borderTopWidth: px(2),
      flexDirection: 'row',
      gap: px(8),
      paddingBottom: px(7),
      paddingTop: px(7),
    },
    tableHeaderText: {
      ...font.semibold,
      color: PRINT.teal,
      fontSize: pt(7),
      letterSpacing: pt(7) * 0.04,
      lineHeight: pt(7) * 1.45,
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
      borderBottomWidth: px(1),
      flexDirection: 'row',
      gap: px(8),
      paddingVertical: px(7),
    },
    medicationName: {
      ...font.semibold,
      color: PRINT.ink,
      fontSize: pt(8),
      lineHeight: pt(8) * 1.45,
    },
    medicationGeneric: {
      ...font.regular,
      color: PRINT.muted,
      fontSize: pt(7.5),
      lineHeight: pt(7.5) * 1.45,
      marginTop: px(1),
    },
    medicationNotes: {
      ...font.regular,
      color: PRINT.secondary,
      fontSize: pt(7.5),
      fontStyle: 'italic',
      lineHeight: pt(7.5) * 1.45,
      marginTop: px(2),
    },
    schedulePrimary: {
      ...font.semibold,
      color: PRINT.ink,
      fontSize: pt(8),
      lineHeight: pt(8) * 1.45,
    },
    scheduleSecondary: {
      ...font.regular,
      color: PRINT.secondary,
      fontSize: pt(8),
      lineHeight: pt(8) * 1.45,
      marginTop: px(1),
    },
    emptyText: {
      ...font.regular,
      color: PRINT.muted,
      fontSize: pt(8),
      fontStyle: 'italic',
      lineHeight: pt(8) * 1.45,
      paddingVertical: px(12),
    },
    instructions: {
      ...font.regular,
      color: PRINT.secondary,
      fontSize: pt(8),
      lineHeight: pt(8) * 1.45,
      marginTop: px(12),
    },
    instructionsLabel: {
      ...font.semibold,
      color: PRINT.ink,
    },
    signature: {
      alignItems: 'flex-end',
      marginTop: px(24),
    },
    signatureLine: {
      borderTopColor: PRINT.muted,
      borderTopWidth: px(1),
      marginBottom: px(5),
      width: px(210),
    },
    signatureName: {
      ...font.bold,
      color: PRINT.teal,
      fontSize: pt(9),
      lineHeight: pt(9) * 1.45,
    },
    licenseRow: {
      alignItems: 'flex-end',
      flexDirection: 'row',
      marginTop: px(10),
    },
    licenseLabel: {
      ...font.regular,
      color: PRINT.secondary,
      fontSize: pt(8),
      lineHeight: pt(8) * 1.45,
    },
    licenseValue: {
      ...font.medium,
      borderBottomColor: PRINT.muted,
      borderBottomWidth: px(1),
      color: PRINT.ink,
      fontSize: pt(8),
      lineHeight: pt(8) * 1.45,
      marginLeft: px(4),
      minWidth: px(130),
      paddingBottom: px(1),
    },
    brandBar: {
      backgroundColor: PRINT.teal,
      height: mm(9),
      marginTop: mm(10),
    },
  })
}

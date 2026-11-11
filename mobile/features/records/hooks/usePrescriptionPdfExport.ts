import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import { useCallback, useRef, useState } from 'react'
import { Alert } from 'react-native'

import type { PrescriptionRecord } from '../../../src/services/records'
import { buildPrescriptionPdfHtml } from '../lib/prescriptionPdf'

export function usePrescriptionPdfExport() {
  const [isExporting, setIsExporting] = useState(false)
  const exportingRef = useRef(false)

  const exportPdf = useCallback(
    async (prescription: PrescriptionRecord) => {
      if (exportingRef.current) return
      exportingRef.current = true

      setIsExporting(true)
      try {
        const html = buildPrescriptionPdfHtml(prescription)
        const { uri } = await Print.printToFileAsync({
          html,
          width: 595,
          height: 842,
        })

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            dialogTitle: `Prescription for ${prescription.pet_name}`,
            mimeType: 'application/pdf',
            UTI: 'com.adobe.pdf',
          })
        } else {
          Alert.alert('PDF created', `The prescription PDF was saved to:\n${uri}`)
        }
      } catch (error) {
        Alert.alert(
          'Could not create PDF',
          error instanceof Error ? error.message : 'Please try again.',
        )
      } finally {
        exportingRef.current = false
        setIsExporting(false)
      }
    },
    [],
  )

  return { exportPdf, isExporting }
}

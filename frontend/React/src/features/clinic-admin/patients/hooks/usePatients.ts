import { useQuery } from '@tanstack/react-query'

import {
  getClinicPatient,
  listBreeds,
  listClinicPatients,
} from '../services/patients.service'
import type { ClinicPatientQuery } from '../types/patient.types'

export function useClinicPatients(params: ClinicPatientQuery) {
  return useQuery({
    queryKey: ['clinic-admin', 'patients', params],
    queryFn: () => listClinicPatients(params),
    staleTime: 30_000,
  })
}

export function useClinicPatient(patientId: string) {
  return useQuery({
    queryKey: ['clinic-admin', 'patient', patientId],
    queryFn: () => getClinicPatient(patientId),
    enabled: Boolean(patientId),
    staleTime: 30_000,
  })
}

export function useBreeds() {
  return useQuery({
    queryKey: ['clinic-admin', 'breeds'],
    queryFn: listBreeds,
    staleTime: 300_000,
  })
}

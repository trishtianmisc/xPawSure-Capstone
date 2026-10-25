import http from '../../../../services/http'
import type {
  BreedOption,
  ClinicPatientDetail,
  ClinicPatientListResponse,
  ClinicPatientQuery,
} from '../types/patient.types'

export async function listClinicPatients(
  params: ClinicPatientQuery,
): Promise<ClinicPatientListResponse> {
  const { data } = await http.get('/clinic/patients/', { params })
  return data
}

export async function getClinicPatient(
  patientId: string,
): Promise<ClinicPatientDetail> {
  const { data } = await http.get(`/clinic/patients/${patientId}/`)
  return data
}

export async function listBreeds(): Promise<BreedOption[]> {
  const { data } = await http.get('/breeds/')
  return data
}

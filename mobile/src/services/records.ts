import { http } from './http'

export interface ConsultationRecord {
  id: string
  appointment_id: string
  pet_id: string
  pet_name: string
  veterinarian: string
  chief_complaint: string | null
  subjective: string | null
  objective: string | null
  assessment: string | null
  plan: string | null
  diagnosis: string
  treatment: string | null
  notes: string | null
  created_at: string
}

export interface PrescriptionItemRecord {
  id: string
  medicine_name: string
  dosage: string
  frequency: string
  duration: string
  route: string
  quantity: number | null
  notes: string | null
}

export interface PrescriptionRecord {
  id: string
  consultation_id: string
  pet_id: string
  pet_name: string
  veterinarian: string
  instructions: string | null
  items: PrescriptionItemRecord[]
  created_at: string
}

export interface VaccinationRecordItem {
  id: string
  consultation_id: string | null
  pet_id: string
  pet_name: string
  veterinarian: string | null
  name: string
  brand: string | null
  batch_no: string | null
  dose: string
  route: string
  date_given: string
  next_due: string | null
  notes: string | null
  source: 'VET' | 'OWNER'
  created_at: string
}

export interface VaccinationWritePayload {
  pet_id?: string
  name: string
  brand: string | null
  batch_no: string | null
  dose: string
  route: string
  date_given: string
  next_due: string | null
  notes: string | null
}

export async function getConsultations(petId?: string): Promise<ConsultationRecord[]> {
  const { data } = await http.get('/consultations/', {
    params: petId ? { pet_id: petId } : undefined,
  })
  return data
}

export async function getConsultation(id: string): Promise<ConsultationRecord> {
  const { data } = await http.get(`/consultations/${id}/`)
  return data
}

export async function getPrescriptions(petId?: string): Promise<PrescriptionRecord[]> {
  const { data } = await http.get('/prescriptions/', {
    params: petId ? { pet_id: petId } : undefined,
  })
  return data
}

export async function getPrescription(id: string): Promise<PrescriptionRecord> {
  const { data } = await http.get(`/prescriptions/${id}/`)
  return data
}

export async function getVaccinations(petId?: string): Promise<VaccinationRecordItem[]> {
  const { data } = await http.get('/vaccinations/', {
    params: petId ? { pet_id: petId } : undefined,
  })
  return data
}

export async function getVaccination(id: string): Promise<VaccinationRecordItem> {
  const { data } = await http.get(`/vaccinations/${id}/`)
  return data
}

export async function createVaccination(
  payload: VaccinationWritePayload & { pet_id: string },
): Promise<VaccinationRecordItem> {
  const { data } = await http.post('/vaccinations/', payload)
  return data
}

export async function updateVaccination(
  id: string,
  payload: VaccinationWritePayload,
): Promise<VaccinationRecordItem> {
  const { data } = await http.put(`/vaccinations/${id}/`, payload)
  return data
}

export async function deleteVaccination(id: string): Promise<void> {
  await http.delete(`/vaccinations/${id}/`)
}

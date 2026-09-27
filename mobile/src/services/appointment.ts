import type {
  AppointmentDetail,
  AppointmentListResponse,
  BookAppointmentPayload,
  OwnerClinic,
  OwnerSlot,
  OwnerVet,
} from '../../features/appointment/types'
import { http } from './http'

export async function getOwnerClinics(): Promise<OwnerClinic[]> {
  const { data } = await http.get('/owner/clinics/')
  return data
}

export async function getOwnerVets(clinicId: string, date: string): Promise<OwnerVet[]> {
  const { data } = await http.get('/owner/vets/', { params: { clinic_id: clinicId, date } })
  return data
}

export async function getOwnerSlots(vetId: string, date: string): Promise<OwnerSlot[]> {
  const { data } = await http.get('/owner/slots/', { params: { vet_id: vetId, date } })
  return data
}

export async function getMyAppointments(): Promise<AppointmentListResponse> {
  const { data } = await http.get('/owner/appointments/', { params: { page_size: 100 } })
  return data
}

export async function getAppointment(aptId: string): Promise<AppointmentDetail> {
  const { data } = await http.get(`/owner/appointments/${aptId}/`)
  return data
}

export async function bookAppointment(payload: BookAppointmentPayload): Promise<AppointmentDetail> {
  const { data } = await http.post('/owner/appointments/', payload)
  return data
}

export async function cancelAppointment(aptId: string, reason?: string): Promise<AppointmentDetail> {
  const { data } = await http.post(`/owner/appointments/${aptId}/cancel/`, { reason: reason ?? '' })
  return data
}

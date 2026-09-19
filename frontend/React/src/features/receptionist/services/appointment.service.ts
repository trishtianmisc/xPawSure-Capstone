import http from '../../../services/http'
import type {
  Appointment,
  AppointmentDetail,
  AppointmentListResponse,
  CreateAppointmentPayload,
} from '../types/receptionist.types'

export async function listAppointments(params: {
  date?: string
  status?: string
  vet_id?: string
  pet_id?: string
  search?: string
  page?: number
  page_size?: number
}): Promise<AppointmentListResponse> {
  const { data } = await http.get('/appointments/', { params })
  return data
}

export async function getAppointmentDetail(aptId: string): Promise<AppointmentDetail> {
  const { data } = await http.get(`/appointments/${aptId}/`)
  return data
}

export async function createAppointment(
  payload: CreateAppointmentPayload,
): Promise<AppointmentDetail> {
  const { data } = await http.post('/appointments/', payload)
  return data
}

export async function updateAppointmentStatus(
  aptId: string,
  status: string,
  cancellationReason?: string,
): Promise<AppointmentDetail> {
  const payload: Record<string, string> = { apt_status: status }
  if (cancellationReason) {
    payload.cancellation_reason = cancellationReason
  }
  const { data } = await http.patch(`/appointments/${aptId}/`, payload)
  return data
}

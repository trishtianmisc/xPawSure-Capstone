import type { VetAppointment, VetDashboardData } from '../../features/vet/types'
import { http } from './http'

export async function getVetDashboard(date?: string): Promise<VetDashboardData> {
  const { data } = await http.get<VetDashboardData>('/veterinarian/dashboard/', {
    params: date ? { date } : undefined,
  })
  return data
}

export async function getVetAppointments(range: {
  start_date?: string
  end_date?: string
}): Promise<VetAppointment[]> {
  const { data } = await http.get<VetAppointment[] | { results: VetAppointment[] }>(
    '/veterinarian/appointments/',
    { params: range },
  )
  return Array.isArray(data) ? data : data.results
}

export async function getVetAppointment(aptId: string): Promise<VetAppointment> {
  const { data } = await http.get<VetAppointment>(`/appointments/${aptId}/`)
  return data
}

export async function requestVetReschedule(
  aptId: string,
  reason: string,
): Promise<VetAppointment> {
  const { data } = await http.post<VetAppointment>(
    `/veterinarian/appointments/${aptId}/request-reschedule/`,
    { reason },
  )
  return data
}

export async function requestVetCancel(
  aptId: string,
  reason: string,
): Promise<VetAppointment> {
  const { data } = await http.post<VetAppointment>(
    `/veterinarian/appointments/${aptId}/request-cancel/`,
    { reason },
  )
  return data
}

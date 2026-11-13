import http from '../../../../services/http'
import { clinicDateKey } from '../../../../utils/format'
import type {
  ConsultationFormValues,
  PrescriptionSavePayload,
  VetAppointmentDetail,
  VetAppointmentSummary,
  VetConsultationInfo,
  VetDashboardData,
  VetPetConsultationHistory,
  VetPrescriptionInfo,
} from '../types/dashboard.types'

export const dashboardService = {
  async get(): Promise<VetDashboardData> {
    const { data } = await http.get('/veterinarian/dashboard/', {
      params: { date: clinicDateKey() },
    })
    return data
  },

  async listAppointments(range?: {
    start_date?: string
    end_date?: string
  }): Promise<VetAppointmentSummary[]> {
    const { data } = await http.get<
      VetAppointmentSummary[] | { results: VetAppointmentSummary[] }
    >('/veterinarian/appointments/', { params: range })
    return Array.isArray(data) ? data : data.results
  },

  async getAppointmentDetail(aptId: string): Promise<VetAppointmentDetail> {
    const { data } = await http.get<VetAppointmentDetail>(`/appointments/${aptId}/`)
    return data
  },

  async getPetConsultationHistory(petId: string): Promise<VetPetConsultationHistory> {
    const { data } = await http.get<VetPetConsultationHistory>(
      `/veterinarian/pets/${petId}/history/`,
    )
    return data
  },

  async startConsultation(aptId: string): Promise<VetAppointmentDetail> {
    const { data } = await http.post<VetAppointmentDetail>(
      `/veterinarian/appointments/${aptId}/start/`,
    )
    return data
  },

  async requestReschedule(
    aptId: string,
    reason: string,
  ): Promise<VetAppointmentDetail> {
    const { data } = await http.post<VetAppointmentDetail>(
      `/veterinarian/appointments/${aptId}/request-reschedule/`,
      { reason },
    )
    return data
  },

  async requestCancellation(
    aptId: string,
    reason: string,
  ): Promise<VetAppointmentDetail> {
    const { data } = await http.post<VetAppointmentDetail>(
      `/veterinarian/appointments/${aptId}/request-cancel/`,
      { reason },
    )
    return data
  },

  async createConsultation(
    aptId: string,
    payload: ConsultationFormValues,
  ): Promise<VetConsultationInfo> {
    const { data } = await http.post<VetConsultationInfo>('/consultations/', {
      ...payload,
      appointment_id: aptId,
    })
    return data
  },

  async updateConsultation(
    conId: string,
    payload: ConsultationFormValues,
  ): Promise<VetConsultationInfo> {
    const { data } = await http.put<VetConsultationInfo>(
      `/consultations/${conId}/`,
      payload,
    )
    return data
  },

  async savePrescription(
    payload: PrescriptionSavePayload,
  ): Promise<VetPrescriptionInfo> {
    const { data } = await http.post<VetPrescriptionInfo>('/prescriptions/', payload)
    return data
  },
}

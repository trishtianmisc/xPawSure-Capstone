import http from '../../../../services/http'
import type {
  ConsultationFormValues,
  PrescriptionSavePayload,
  VetAppointmentDetail,
  VetAppointmentSummary,
  VetConsultationInfo,
  VetDashboardData,
  VetPrescriptionInfo,
} from '../types/dashboard.types'

function localToday(): string {
  const now = new Date()
  const month = `${now.getMonth() + 1}`.padStart(2, '0')
  const day = `${now.getDate()}`.padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

export const dashboardService = {
  async get(): Promise<VetDashboardData> {
    const { data } = await http.get('/veterinarian/dashboard/', {
      params: { date: localToday() },
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

  async startConsultation(aptId: string): Promise<VetAppointmentDetail> {
    const { data } = await http.post<VetAppointmentDetail>(
      `/veterinarian/appointments/${aptId}/start/`,
    )
    return data
  },

  async cancelAppointment(
    aptId: string,
    reason: string,
  ): Promise<VetAppointmentDetail> {
    const { data } = await http.patch<VetAppointmentDetail>(`/appointments/${aptId}/`, {
      apt_status: 'CANCELLED',
      cancellation_reason: reason,
    })
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

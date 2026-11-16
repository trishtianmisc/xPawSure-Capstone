import http from '../../../../services/http'

import type {
  AccuracyReport,
  AccuracyReportParams,
  ConsultationOutcomeParams,
  ConsultationOutcomeReport,
  DiseaseReport,
  DiseaseReportParams,
} from '../types/report.types'

export const reportService = {
  async getConsultationOutcomes(params: ConsultationOutcomeParams = {}): Promise<ConsultationOutcomeReport> {
    const searchParams = new URLSearchParams()
    if (params.clinic_id) searchParams.set('clinic_id', params.clinic_id)
    if (params.disease_code) searchParams.set('disease_code', params.disease_code)
    if (params.outcome) searchParams.set('outcome', params.outcome)
    if (params.date_from) searchParams.set('date_from', params.date_from)
    if (params.date_to) searchParams.set('date_to', params.date_to)
    if (params.page) searchParams.set('page', String(params.page))
    if (params.page_size) searchParams.set('page_size', String(params.page_size))

    const query = searchParams.toString()
    const response = await http.get(`/super-admin/analytics/consultation-outcomes/${query ? `?${query}` : ''}`)
    return response.data
  },

  async downloadConsultationOutcomes(params: ConsultationOutcomeParams): Promise<Blob> {
    const { data } = await http.post(
      '/super-admin/analytics/consultation-outcomes/',
      null,
      { params, responseType: 'blob' },
    )
    return data as Blob
  },

  async getAccuracy(params: AccuracyReportParams = {}): Promise<AccuracyReport> {
    const searchParams = new URLSearchParams()
    if (params.clinic_id) searchParams.set('clinic_id', params.clinic_id)
    if (params.model_version) searchParams.set('model_version', params.model_version)
    if (params.date_from) searchParams.set('date_from', params.date_from)
    if (params.date_to) searchParams.set('date_to', params.date_to)

    const query = searchParams.toString()
    const response = await http.get(`/super-admin/analytics/accuracy/${query ? `?${query}` : ''}`)
    return response.data
  },

  async getDiseases(params: DiseaseReportParams = {}): Promise<DiseaseReport> {
    const searchParams = new URLSearchParams()
    if (params.clinic_id) searchParams.set('clinic_id', params.clinic_id)
    if (params.date_from) searchParams.set('date_from', params.date_from)
    if (params.date_to) searchParams.set('date_to', params.date_to)

    const query = searchParams.toString()
    const response = await http.get(`/super-admin/analytics/diseases/${query ? `?${query}` : ''}`)
    return response.data
  },
}

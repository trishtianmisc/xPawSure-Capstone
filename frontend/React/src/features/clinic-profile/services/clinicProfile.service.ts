import http from '../../../services/http'
import type {
  ClinicProfile,
  ClinicSettings,
  OperatingHoursDay,
  UpdateOperatingHoursPayload,
  UpdateProfilePayload,
  UpdateSettingsPayload,
} from '../types/clinicProfile.types'

export const clinicProfileService = {
  async getProfile(): Promise<ClinicProfile> {
    const response = await http.get('/clinic/profile/')
    return response.data
  },

  async updateProfile(data: UpdateProfilePayload): Promise<ClinicProfile> {
    const response = await http.put('/clinic/profile/', data)
    return response.data
  },

  async getSettings(): Promise<ClinicSettings> {
    const response = await http.get('/clinic/settings/')
    return response.data
  },

  async updateSettings(data: UpdateSettingsPayload): Promise<ClinicSettings> {
    const response = await http.put('/clinic/settings/', data)
    return response.data
  },

  async uploadLogo(file: File): Promise<ClinicProfile> {
    const formData = new FormData()
    formData.append('logo', file)
    const response = await http.post('/clinic/logo/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  async getOperatingHours(): Promise<OperatingHoursDay[]> {
    const response = await http.get('/clinic/operating-hours/')
    return response.data
  },

  async updateOperatingHours(data: UpdateOperatingHoursPayload): Promise<OperatingHoursDay[]> {
    const response = await http.put('/clinic/operating-hours/', data)
    return response.data
  },
}

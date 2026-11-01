import http from '../../../services/http'
import type { ClinicSettings } from '../../clinic-profile/types/clinicProfile.types'

/**
 * Receptionists read clinic settings (the consultation fee gates booking) but
 * cannot write them — only Clinic Admins may update settings.
 */
export async function getClinicSettings(): Promise<ClinicSettings> {
  const { data } = await http.get('/clinic/settings/')
  return data
}

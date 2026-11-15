import http from '../../../services/http'
import type { ClinicSettings } from '../../clinic-profile/types/clinicProfile.types'

/**
 * Receptionists read clinic settings (e.g. the consultation fee shown on
 * Payments) but cannot write them — only Clinic Admins may update settings.
 */
export async function getClinicSettings(): Promise<ClinicSettings> {
  const { data } = await http.get('/clinic/settings/')
  return data
}

import { useQuery } from '@tanstack/react-query'

import { getClinicSettings } from '../services/clinic.service'

/** Clinic settings as seen from the front desk; mostly used for the fee. */
export function useClinicSettings() {
  return useQuery({
    queryKey: ['receptionist', 'clinic-settings'],
    queryFn: getClinicSettings,
    staleTime: 5 * 60 * 1000,
  })
}

/** Consultation fee; `undefined` while loading, 0 when no fee applies. */
export function useConsultationFee(): number | undefined {
  const { data } = useClinicSettings()
  return data ? Number(data.consultation_fee ?? 0) : undefined
}

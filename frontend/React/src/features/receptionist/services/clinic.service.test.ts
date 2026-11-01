import http from '../../../services/http'
import { getClinicSettings } from './clinic.service'

vi.mock('../../../services/http')

describe('getClinicSettings', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('reads the clinic settings the booking flow needs', async () => {
    const settings = {
      opening_time: '09:00:00',
      closing_time: '17:00:00',
      appointment_duration: 30,
      max_appointments_per_day: 50,
      allow_owner_booking: true,
      consultation_fee: 500,
      timezone: 'Asia/Manila',
    }
    vi.mocked(http.get).mockResolvedValue({ data: settings })

    const result = await getClinicSettings()

    expect(http.get).toHaveBeenCalledWith('/clinic/settings/')
    expect(result.consultation_fee).toBe(500)
  })

  it('treats a missing fee as 0 so free clinics book normally', async () => {
    vi.mocked(http.get).mockResolvedValue({
      data: {
        opening_time: '09:00:00',
        closing_time: '17:00:00',
        appointment_duration: 30,
        max_appointments_per_day: 50,
        allow_owner_booking: true,
        consultation_fee: undefined,
        timezone: 'Asia/Manila',
      },
    })

    const result = await getClinicSettings()

    expect(Number(result.consultation_fee ?? 0)).toBe(0)
  })
})

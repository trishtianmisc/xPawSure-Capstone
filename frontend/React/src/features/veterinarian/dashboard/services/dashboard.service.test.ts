import http from '../../../../services/http'
import { dashboardService } from './dashboard.service'

vi.mock('../../../../services/http')

const consultationPayload = {
  chief_complaint: 'Itchy skin',
  objective: 'Red patches',
  diagnosis: 'Fungal',
  notes: 'Follow up',
}

const prescriptionPayload = {
  consultation_id: 'con-1',
  instructions: '',
  items: [
    {
      medicine_name: 'Antifungal Cream',
      generic_name: 'Miconazole',
      dosage: 'Thin layer',
      frequency: 'Twice daily',
      duration: '14 days',
      route: 'TOPICAL',
      notes: 'Apply to affected area',
    },
  ],
}

describe('dashboardService consultation and prescription saves', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('createConsultation posts payload with appointment_id', async () => {
    const mockResponse = { data: { id: 'con-1', diagnosis: 'Fungal' } }
    vi.mocked(http.post).mockResolvedValue(mockResponse)

    const result = await dashboardService.createConsultation('apt-1', consultationPayload)

    expect(http.post).toHaveBeenCalledWith('/consultations/', {
      ...consultationPayload,
      appointment_id: 'apt-1',
    })
    expect(result).toEqual(mockResponse.data)
  })

  it('updateConsultation puts payload to consultation detail', async () => {
    const mockResponse = { data: { id: 'con-1', diagnosis: 'Mange' } }
    vi.mocked(http.put).mockResolvedValue(mockResponse)

    const result = await dashboardService.updateConsultation('con-1', consultationPayload)

    expect(http.put).toHaveBeenCalledWith('/consultations/con-1/', consultationPayload)
    expect(result).toEqual(mockResponse.data)
  })

  it('savePrescription posts payload to prescriptions', async () => {
    const mockResponse = { data: { id: 'prs-1', items: [] } }
    vi.mocked(http.post).mockResolvedValue(mockResponse)

    const result = await dashboardService.savePrescription(prescriptionPayload)

    expect(http.post).toHaveBeenCalledWith('/prescriptions/', prescriptionPayload)
    expect(result).toEqual(mockResponse.data)
  })
})

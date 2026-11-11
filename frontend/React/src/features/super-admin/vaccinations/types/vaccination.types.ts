export interface VaccinationRecord {
  id: string
  consultation_id: string | null
  pet_id: string
  pet_name: string
  veterinarian: string | null
  name: string
  brand: string | null
  batch_no: string | null
  dose: string | null
  route: string
  date_given: string
  next_due: string | null
  notes: string | null
  source: string
  created_at: string
  owner_name: string
}

export interface VaccinationListResponse {
  total: number
  page: number
  page_size: number
  total_pages: number
  results: VaccinationRecord[]
}

export interface VaccinationListParams {
  clinic_id?: string
  search?: string
  date_from?: string
  date_to?: string
  page?: number
  page_size?: number
}

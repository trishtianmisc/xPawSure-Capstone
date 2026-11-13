export type VaccinationStatus = 'OVERDUE' | 'DUE_SOON' | 'CURRENT' | 'NO_DUE_DATE'

export interface PublicPet {
  qr_code: string
  name: string
  breed_name: string | null
  sex: string
  date_of_birth: string | null
  age: number | null
  color: string | null
  profile_picture: string | null
  owner_contact_number: string | null
  vaccination_statuses: VaccinationStatus[]
}

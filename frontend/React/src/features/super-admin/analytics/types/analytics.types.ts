export interface GrowthPoint {
  month: string
  count: number
}

export interface PlatformAnalytics {
  generated_at: string
  clinics: {
    total: number
    by_status: Record<string, number>
  }
  users: {
    total: number
    by_role: Record<string, number>
    active: number
    inactive: number
  }
  owners: number
  pets: {
    total: number
  }
  appointments: {
    total: number
    by_status: Record<string, number>
  }
  consultations: number
  prescriptions: number
  vaccinations: number
  screenings: {
    total: number
  }
  payments: {
    paid_amount: string
    paid_count: number
    total_count: number
  }
  growth: {
    clinics: GrowthPoint[]
    users: GrowthPoint[]
    pets: GrowthPoint[]
    appointments: GrowthPoint[]
  }
}

export interface ClinicOverview {
  clinic_id: string
  clinic_name: string
  status: string
  staff: {
    total: number
    clinic_admins: number
    veterinarians: number
    receptionists: number
    active: number
    inactive: number
  }
  owners: number
  pets: number
  appointments: {
    total: number
    by_status: Record<string, number>
    this_month: number
  }
  consultations: number
  prescriptions: number
  vaccinations: number
  screenings: number
  payments: {
    paid_amount: string
    paid_count: number
    total_count: number
  }
}

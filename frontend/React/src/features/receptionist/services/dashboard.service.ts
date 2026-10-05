import http from '../../../services/http'
import type { DashboardStats } from '../types/receptionist.types'

export async function getDashboardStats(): Promise<DashboardStats> {
  const { data } = await http.get('/dashboard/stats/')
  return data
}

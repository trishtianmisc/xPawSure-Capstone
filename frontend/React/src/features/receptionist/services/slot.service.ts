import http from '../../../services/http'
import type {
  BlockRemainingResponse,
  GenerateSlotsPayload,
  GenerateSlotsResponse,
  ScheduleResponse,
  UpdateSlotStatusPayload,
  UpdateSlotStatusResponse,
  Vet,
  VetScheduleListResponse,
  VetSlot,
} from '../types/receptionist.types'

export async function getAvailableSlots(
  vetId: string,
  date: string,
): Promise<VetSlot[]> {
  const { data } = await http.get('/available-slots/', {
    params: { vet_id: vetId, date },
  })
  return data
}

export async function getVetsForDate(date: string): Promise<Vet[]> {
  const { data } = await http.get('/vets/', { params: { date } })
  return data
}

export async function getSchedule(
  startDate: string,
  endDate: string,
  vetId?: string,
): Promise<ScheduleResponse> {
  const params: Record<string, string> = {
    start_date: startDate,
    end_date: endDate,
  }
  if (vetId) params.vet_id = vetId
  const { data } = await http.get('/schedule/', { params })
  return data
}

export async function getVetScheduleList(
  date?: string,
): Promise<VetScheduleListResponse> {
  const params: Record<string, string> = {}
  if (date) params.date = date
  const { data } = await http.get('/schedule/vet-list/', { params })
  return data
}

export async function generateSlots(
  payload: GenerateSlotsPayload,
): Promise<GenerateSlotsResponse> {
  const { data } = await http.post('/generate-slots/', payload)
  return data
}

export async function updateSlotStatus(
  slotId: string,
  payload: UpdateSlotStatusPayload,
): Promise<UpdateSlotStatusResponse> {
  const { data } = await http.patch(`/schedule/slots/${slotId}/status/`, payload)
  return data
}

export async function blockRemainingSlots(
  vetId: string,
  date: string,
): Promise<BlockRemainingResponse> {
  const { data } = await http.post(`/schedule/vets/${vetId}/block-remaining/`, null, {
    params: { date },
  })
  return data
}

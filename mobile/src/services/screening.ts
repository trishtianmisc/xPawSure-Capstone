import type {
  ClaudeAnalysisResponse,
  CreateScreeningPayload,
  Screening,
  ScreeningListResponse,
} from '../../features/screening/types'
import { http } from './http'

const VISION_ANALYSIS_TIMEOUT_MS = 45_000

export async function getScreenings(petId?: string): Promise<ScreeningListResponse> {
  const { data } = await http.get('/owner/screenings/', {
    params: { pet_id: petId, page_size: 100 },
  })
  return data
}

/**
 * Request the independent Claude image review for the same JPEG that will be
 * used for on-device inference. Nothing is persisted by this endpoint; its
 * signed token is attached to the final create request.
 */
export async function analyzeScreeningImage(
  imageUri: string,
): Promise<ClaudeAnalysisResponse> {
  const form = new FormData()
  form.append('image', {
    uri: imageUri,
    name: 'screening.jpg',
    type: 'image/jpeg',
  } as unknown as Blob)

  const { data } = await http.post('/owner/screenings/vision-analysis/', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: VISION_ANALYSIS_TIMEOUT_MS,
  })
  return data
}

export async function createScreening(payload: CreateScreeningPayload): Promise<Screening> {
  if (payload.image_uri) {
    const form = new FormData()
    form.append('pet_id', payload.pet_id)
    form.append('source', payload.source)
    form.append('prediction', payload.prediction)
    form.append('confidence', String(payload.confidence))
    form.append('model_version', payload.model_version)
    if (payload.inference_time_ms !== undefined) {
      form.append('inference_time_ms', String(payload.inference_time_ms))
    }
    if (payload.device) form.append('device', payload.device)
    if (payload.claude_token) form.append('claude_token', payload.claude_token)
    if (payload.symptom_answers && payload.symptom_answers.length > 0) {
      form.append('symptom_answers', JSON.stringify(payload.symptom_answers))
    }
    form.append('image', {
      uri: payload.image_uri,
      name: 'screening.jpg',
      type: 'image/jpeg',
    } as unknown as Blob)

    const { data } = await http.post('/owner/screenings/', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  }

  const { data } = await http.post('/owner/screenings/', payload)
  return data
}

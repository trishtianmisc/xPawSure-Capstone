/**
 * Screening HTTP client (axios via src/services/http).
 *
 *  - hashScreeningImage: SHA-256 of the prepared image bytes (expo-crypto) —
 *    bound into the Claude token and re-verified by the backend.
 *  - validateScreeningImage: multipart POST to /owner/screenings/vision-analysis/;
 *    network failures map to a failureStatus consumed by the gate's retry policy.
 *  - createScreening: when image_uri AND claude_token are both present it
 *    sends multipart (fields + image + token); otherwise falls back to legacy
 *    JSON (kept for backward compatibility — the backend rejects a token-less
 *    image).
 */
import { isAxiosError } from 'axios'
import * as Crypto from 'expo-crypto'
import { File } from 'expo-file-system'

import type {
  ClaudeAnalysisResponse,
  CreateScreeningPayload,
  Screening,
  ScreeningListResponse,
} from '../../features/screening/types'
import { mapHttpFailure } from '../../ai/services/claudeValidation'
import type { ClaudeCallOutcome } from '../../ai/services/claudeValidation'
import { http } from './http'

const SCREENING_UPLOAD_NAME = 'screening.jpg'
const SCREENING_UPLOAD_TYPE = 'image/jpeg'
const SCREENING_UPLOAD_TIMEOUT_MS = 45000

function toFilePart(uri: string): Blob {
  return {
    uri,
    name: SCREENING_UPLOAD_NAME,
    type: SCREENING_UPLOAD_TYPE,
  } as unknown as Blob
}

export async function hashScreeningImage(imageUri: string): Promise<string> {
  const bytes = await new File(imageUri).bytes()
  const digest = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, bytes)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export async function validateScreeningImage(imageUri: string): Promise<ClaudeCallOutcome> {
  try {
    const form = new FormData()
    form.append('image', toFilePart(imageUri))

    const { data } = await http.post<ClaudeAnalysisResponse>(
      '/owner/screenings/vision-analysis/',
      form,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: SCREENING_UPLOAD_TIMEOUT_MS,
      },
    )
    return data
  } catch (error) {
    const statusCode = isAxiosError(error) ? error.response?.status : undefined
    const timedOut =
      isAxiosError(error) && (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT')
    return { failureStatus: mapHttpFailure(statusCode, timedOut) }
  }
}

export async function getScreenings(petId?: string): Promise<ScreeningListResponse> {
  const { data } = await http.get('/owner/screenings/', {
    params: { pet_id: petId, page_size: 100 },
  })
  return data
}

export async function createScreening(payload: CreateScreeningPayload): Promise<Screening> {
  const { image_uri: imageUri, claude_token: claudeToken, ...fields } = payload

  // Multipart path: image + signed token must travel together. The backend
  // rejects a token-less image, so missing either falls through to legacy JSON.
  if (imageUri && claudeToken) {
    const form = new FormData()
    for (const [key, value] of Object.entries(fields)) {
      if (value === undefined || value === null) continue
      form.append(key, String(value))
    }
    form.append('image', toFilePart(imageUri))
    form.append('claude_token', claudeToken)

    const { data } = await http.post('/owner/screenings/', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: SCREENING_UPLOAD_TIMEOUT_MS,
    })
    return data
  }

  const { data } = await http.post('/owner/screenings/', fields)
  return data
}

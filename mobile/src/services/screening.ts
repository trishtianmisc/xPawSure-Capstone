import type {
  CreateScreeningPayload,
  QuizQuestionsPayload,
  QuizValidatePayload,
  QuizValidateResult,
  Screening,
  ScreeningListResponse,
} from '../../features/screening/types'
import { http } from './http'

export async function getScreenings(petId?: string): Promise<ScreeningListResponse> {
  const { data } = await http.get('/owner/screenings/', {
    params: { pet_id: petId, page_size: 100 },
  })
  return data
}

export async function createScreening(payload: CreateScreeningPayload): Promise<Screening> {
  const { data } = await http.post('/owner/screenings/', payload)
  return data
}

export async function getQuizQuestions(
  payload: QuizQuestionsPayload,
): Promise<{ questions: { id: number; text: string }[] }> {
  const { data } = await http.post('/owner/screenings/quiz-questions/', payload)
  return data
}

export async function validateQuizAnswers(payload: QuizValidatePayload): Promise<QuizValidateResult> {
  const { data } = await http.post('/owner/screenings/quiz-validate/', payload)
  return data
}

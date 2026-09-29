import { useCallback, useEffect, useMemo, useState } from 'react'
import { File } from 'expo-file-system'

import * as screeningService from '../../../src/services/screening'
import type { Prediction } from '../../../ai/types/ai.types'
import type {
  QuizAnswer,
  QuizPredictionInput,
  QuizQuestion,
  QuizValidateResult,
} from '../types'

const MAX_IMAGE_B64_LENGTH = Math.floor((2 * 1024 * 1024) * 4 / 3)

export type QuizStatus = 'loading' | 'ready' | 'failed' | 'validating' | 'refined'

export interface ScreeningQuiz {
  status: QuizStatus
  questions: QuizQuestion[]
  answers: Record<number, QuizAnswer>
  allAnswered: boolean
  refined: QuizValidateResult | null
  imageBase64: string | null
  setAnswer: (id: number, answer: QuizAnswer) => void
  submit: () => Promise<void>
}

export function useScreeningQuiz(options: {
  petId: string
  predictions: Prediction[]
  imageUri?: string
}): ScreeningQuiz {
  const [status, setStatus] = useState<QuizStatus>('loading')
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [answers, setAnswers] = useState<Record<number, QuizAnswer>>({})
  const [refined, setRefined] = useState<QuizValidateResult | null>(null)
  const [imageBase64, setImageBase64] = useState<string | null>(null)

  const top3: QuizPredictionInput[] = useMemo(
    () =>
      [...options.predictions]
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 3)
        .map((p) => ({ disease_code: p.disease, confidence: Number(p.confidence.toFixed(2)) })),
    [options.predictions],
  )

  const { petId, imageUri } = options

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      let b64: string | null = null
      if (imageUri) {
        try {
          b64 = await new File(imageUri).base64()
        } catch {
          b64 = null
        }
      }
      if (cancelled) return
      const usable = b64 && b64.length <= MAX_IMAGE_B64_LENGTH ? b64 : null
      if (usable) setImageBase64(usable)

      try {
        const res = await screeningService.getQuizQuestions({
          pet_id: petId,
          predictions: top3,
          image: usable ?? undefined,
        })
        if (cancelled) return
        setQuestions(res.questions)
        setStatus('ready')
      } catch {
        if (!cancelled) setStatus('failed')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [petId, imageUri, top3])

  const setAnswer = useCallback((id: number, answer: QuizAnswer) => {
    setAnswers((prev) => ({ ...prev, [id]: answer }))
  }, [])

  const allAnswered =
    questions.length > 0 && questions.every((q) => answers[q.id] != null)

  const submit = useCallback(async () => {
    if (!allAnswered) return
    setStatus('validating')
    try {
      const result = await screeningService.validateQuizAnswers({
        pet_id: petId,
        predictions: top3,
        questions,
        answers: Object.fromEntries(
          Object.entries(answers).map(([id, answer]) => [String(id), answer]),
        ),
      })
      setRefined(result)
      setStatus('refined')
    } catch {
      setStatus('failed')
    }
  }, [allAnswered, answers, petId, questions, top3])

  return {
    status,
    questions,
    answers,
    allAnswered,
    refined,
    imageBase64,
    setAnswer,
    submit,
  }
}

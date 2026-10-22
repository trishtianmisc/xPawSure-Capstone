import { useCallback, useRef, useState } from 'react'

import { loadModel, runScreening, isReady } from '../services/tensorflow.service'
import type { ScreeningResult } from '../types/ai.types'

interface UseAIScreeningReturn {
  isModelLoaded: boolean
  isModelLoading: boolean
  modelError: string | null
  isScreening: boolean
  result: ScreeningResult | null
  screeningError: string | null
  screenImage: (imageUri: string) => Promise<ScreeningResult>
  reset: () => void
}

export function useAIScreening(): UseAIScreeningReturn {
  const [isModelLoading, setIsModelLoading] = useState(false)
  const [modelError, setModelError] = useState<string | null>(null)
  const [isScreening, setIsScreening] = useState(false)
  const [result, setResult] = useState<ScreeningResult | null>(null)
  const [screeningError, setScreeningError] = useState<string | null>(null)
  const modelLoadPromiseRef = useRef<Promise<void> | null>(null)

  const ensureModel = useCallback(async () => {
    if (isReady()) return
    if (!modelLoadPromiseRef.current) {
      setIsModelLoading(true)
      setModelError(null)

      modelLoadPromiseRef.current = loadModel()
        .then(() => undefined)
        .catch((error) => {
          setModelError(`Failed to load AI model: ${error}`)
          throw error
        })
        .finally(() => {
          setIsModelLoading(false)
          modelLoadPromiseRef.current = null
        })
    }

    await modelLoadPromiseRef.current
  }, [])

  const screenImage = useCallback(async (imageUri: string): Promise<ScreeningResult> => {
    setIsScreening(true)
    setScreeningError(null)
    setResult(null)

    try {
      await ensureModel()
      const screeningResult = await runScreening(imageUri)
      setResult(screeningResult)
      return screeningResult
    } catch (error) {
      const message = `Screening failed: ${error}`
      setScreeningError(message)
      throw new Error(message)
    } finally {
      setIsScreening(false)
    }
  }, [ensureModel])

  const reset = useCallback(() => {
    setResult(null)
    setScreeningError(null)
  }, [])

  return {
    isModelLoaded: isReady(),
    isModelLoading,
    modelError,
    isScreening,
    result,
    screeningError,
    screenImage,
    reset,
  }
}

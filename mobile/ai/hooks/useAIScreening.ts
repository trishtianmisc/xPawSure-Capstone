import { useCallback, useEffect, useState } from 'react'

import { loadModel, runScreening, isReady, disposeModel } from '../services/tensorflow.service'
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
  const [isModelLoading, setIsModelLoading] = useState(true)
  const [modelError, setModelError] = useState<string | null>(null)
  const [isScreening, setIsScreening] = useState(false)
  const [result, setResult] = useState<ScreeningResult | null>(null)
  const [screeningError, setScreeningError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function init() {
      try {
        await loadModel()
        if (mounted) {
          setIsModelLoading(false)
        }
      } catch (error) {
        if (mounted) {
          setModelError(`Failed to load AI model: ${error}`)
          setIsModelLoading(false)
        }
      }
    }

    init()

    return () => {
      mounted = false
      disposeModel()
    }
  }, [])

  const screenImage = useCallback(async (imageUri: string): Promise<ScreeningResult> => {
    setIsScreening(true)
    setScreeningError(null)
    setResult(null)

    try {
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
  }, [])

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

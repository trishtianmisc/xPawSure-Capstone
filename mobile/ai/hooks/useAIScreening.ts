/**
 * React hook bridging the UI screens to the screening pipeline.
 *
 * Exposes screenImages(imageUris, sessionId): loads the TFLite model if needed,
 * then runs tensorflow.service.runMultiScreening with real network I/O wired in
 * (vision-analysis API call + SHA-256 hashing via src/services/screening.ts).
 * Surfaces isScreening / screeningError state for the capture screen.
 *
 * Note: the legacy single-photo screenImage path (which bypassed the Claude
 * gate) was intentionally removed — three-photo screening is the only entry.
 */
import { useCallback, useRef, useState } from 'react'

import { hashScreeningImage, validateScreeningImage } from '../../src/services/screening'
import { loadModel, runMultiScreening, isReady } from '../services/tensorflow.service'
import type { ScreeningResult } from '../types/ai.types'

interface UseAIScreeningReturn {
  isModelLoaded: boolean
  isModelLoading: boolean
  modelError: string | null
  isScreening: boolean
  result: ScreeningResult | null
  screeningError: string | null
  screenImages: (imageUris: string[], sessionId: string) => Promise<ScreeningResult>
  reset: () => void
}

export function useAIScreening(): UseAIScreeningReturn {
  const [isModelLoading, setIsModelLoading] = useState(false)
  const [modelError, setModelError] = useState<string | null>(null)
  const [isScreening, setIsScreening] = useState(false)
  const [result, setResult] = useState<ScreeningResult | null>(null)
  const [screeningError, setScreeningError] = useState<string | null>(null)
  const loadingRef = useRef(false)

  const ensureModel = useCallback(async () => {
    if (isReady()) return
    if (loadingRef.current) return

    loadingRef.current = true
    setIsModelLoading(true)
    setModelError(null)

    try {
      await loadModel()
    } catch (error) {
      setModelError(`Failed to load AI model: ${error}`)
      loadingRef.current = false
      setIsModelLoading(false)
      throw error
    }

    loadingRef.current = false
    setIsModelLoading(false)
  }, [])

  const screenImages = useCallback(
    async (imageUris: string[], sessionId: string): Promise<ScreeningResult> => {
      setIsScreening(true)
      setScreeningError(null)
      setResult(null)

      try {
        await ensureModel()
        const screeningResult = await runMultiScreening(imageUris, sessionId, {
          callApi: validateScreeningImage,
          shaFor: hashScreeningImage,
        })
        setResult(screeningResult)
        return screeningResult
      } catch (error) {
        const message = `Screening failed: ${error}`
        setScreeningError(message)
        throw new Error(message)
      } finally {
        setIsScreening(false)
      }
    },
    [ensureModel],
  )

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
    screenImages,
    reset,
  }
}

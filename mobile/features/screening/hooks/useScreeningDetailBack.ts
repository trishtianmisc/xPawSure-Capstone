import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback } from 'react'
import { BackHandler } from 'react-native'

export function useScreeningDetailBack(fromConsultation?: string) {
  const router = useRouter()
  // The source consultation sits in the Records tab stack, a sibling of
  // Screenings, so POP_TO cannot reach it — navigate across the tabs instead.
  const handleBack = useCallback(() => {
    if (fromConsultation) {
      router.navigate(`/(owner)/records/consultations/${fromConsultation}`)
    } else if (router.canGoBack()) {
      router.back()
    } else {
      router.replace('/(owner)/screenings')
    }
  }, [fromConsultation, router])

  useFocusEffect(useCallback(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBack()
      return true
    })
    return () => subscription.remove()
  }, [handleBack]))

  return handleBack
}

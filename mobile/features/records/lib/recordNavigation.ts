import { useCallback } from 'react'
import { BackHandler } from 'react-native'
import { router, useFocusEffect } from 'expo-router'

export type RecordsTab = 'consultations' | 'prescriptions' | 'vaccinations'

let requestedTab: RecordsTab | null = null

export function consumeRequestedRecordsTab(): RecordsTab | null {
  const tab = requestedTab
  requestedTab = null
  return tab
}

export function useRecordDetailBack(tab: RecordsTab, backHref?: string): () => void {
  const handleBack = useCallback(() => {
    if (backHref) {
      router.dismissTo(backHref)
      return
    }

    requestedTab = tab
    router.dismissTo('/(owner)/records')
  }, [tab, backHref])

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        handleBack()
        return true
      })

      return () => subscription.remove()
    }, [handleBack]),
  )

  return handleBack
}

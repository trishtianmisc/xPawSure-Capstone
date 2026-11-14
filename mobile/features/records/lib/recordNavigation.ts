import { useCallback } from 'react'
import { BackHandler } from 'react-native'
import { router, useFocusEffect } from 'expo-router'

export type RecordsTab = 'consultations' | 'prescriptions' | 'vaccinations' | 'screenings'

let requestedTab: RecordsTab | null = null

export function consumeRequestedRecordsTab(): RecordsTab | null {
  const tab = requestedTab
  requestedTab = null
  return tab
}

export function useRecordDetailBack(tab: RecordsTab, backHref?: string): () => void {
  const handleBack = useCallback(() => {
    if (backHref) {
      // `backHref` can point at the Screenings tab stack, a sibling of Records,
      // where POP_TO is unhandled. `navigate` covers both the same-tab and the
      // cross-tab case and reuses the record instead of pushing a duplicate.
      router.navigate(backHref)
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

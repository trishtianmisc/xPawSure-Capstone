import { useRouter } from 'expo-router'

import { NotificationList } from '../../features/notification/components/NotificationList'
import type { OwnerNotification } from '../../features/notification/types'

export default function VetNotificationsScreen() {
  const router = useRouter()

  const openNotification = (notification: OwnerNotification) => {
    if (
      notification.ntf_reference_table === 'APPOINTMENT' &&
      notification.ntf_reference_id
    ) {
      router.push(`/(vet)/consultations/${notification.ntf_reference_id}`)
    }
  }

  return <NotificationList onOpenNotification={openNotification} />
}

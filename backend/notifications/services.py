import logging

from django.utils import timezone

from notifications.models import Notification, NotificationType

logger = logging.getLogger(__name__)


class NotificationService:

    @staticmethod
    def create_notification(user_id, title, message, ntf_type,
                            ref_table=None, ref_id=None):
        return Notification.objects.create(
            usr_id_id=user_id,
            ntf_title=title,
            ntf_message=message,
            ntf_type=ntf_type,
            ntf_reference_table=ref_table,
            ntf_reference_id=ref_id,
        )

    @staticmethod
    def list_notifications(user_id, unread_only=False, page=1, page_size=20):
        qs = Notification.objects.filter(usr_id_id=user_id)

        if unread_only:
            qs = qs.filter(ntf_is_read=False)

        total = qs.count()
        start = (page - 1) * page_size
        results = qs[start:start + page_size]

        return {
            'total': total,
            'page': page,
            'page_size': page_size,
            'total_pages': (total + page_size - 1) // page_size,
            'results': results,
        }

    @staticmethod
    def get_unread_count(user_id):
        return Notification.objects.filter(
            usr_id_id=user_id, ntf_is_read=False,
        ).count()

    @staticmethod
    def mark_read(notification_id, user_id):
        try:
            ntf = Notification.objects.get(
                ntf_id=notification_id, usr_id_id=user_id,
            )
        except Notification.DoesNotExist:
            return None

        if not ntf.ntf_is_read:
            ntf.ntf_is_read = True
            ntf.ntf_read_at = timezone.now()
            ntf.save(update_fields=['ntf_is_read', 'ntf_read_at'])

        return ntf

    @staticmethod
    def mark_all_read(user_id):
        now = timezone.now()
        Notification.objects.filter(
            usr_id_id=user_id, ntf_is_read=False,
        ).update(ntf_is_read=True, ntf_read_at=now)

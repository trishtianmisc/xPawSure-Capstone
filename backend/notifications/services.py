import logging
from datetime import datetime, timedelta

from django.db import transaction
from django.utils import timezone

from clinics.models import Clinic
from notifications.models import Notification, NotificationType
from users.models import StaffPosition, StaffProfile, User, UserRole

logger = logging.getLogger(__name__)

LICENSE_WARNING_WINDOW_DAYS = 30
LICENSE_URGENT_DAYS = 7


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
    def notify_clinic_admins(clinic_id, title, message, ref_table=None,
                             ref_id=None, exclude_user_id=None):
        """Best-effort fan-out of one notice to a clinic's admins.

        Used by event-driven staff/vet-request producers. Individual row
        failures are logged and skipped so the originating action never
        fails because of a notification.
        """
        admins = User.objects.filter(
            usr_role=UserRole.CLINIC_ADMIN,
            staffprofile__cln_id=clinic_id,
        )
        if exclude_user_id:
            admins = admins.exclude(usr_id=exclude_user_id)

        for admin_id in admins.values_list('usr_id', flat=True):
            try:
                NotificationService.create_notification(
                    user_id=admin_id,
                    title=title,
                    message=message,
                    ntf_type=NotificationType.SYSTEM,
                    ref_table=ref_table,
                    ref_id=ref_id,
                )
            except Exception:
                logger.warning(
                    'Clinic-admin notification failed (clinic=%s, title=%s)',
                    clinic_id, title, exc_info=True,
                )

    @staticmethod
    def ensure_license_expiry_warnings(clinic_id):
        """Create idempotent T-30/T-7 license warnings for a clinic's admins.

        Runs under a clinic row lock so concurrent readers (list +
        unread-count) cannot create duplicate warnings. "Today" is the
        clinic's local calendar day. Active veterinarians only; expired
        licenses are ignored, and the 30-day warning is skipped once 7 days
        or fewer remain. Messages carry absolute dates, so a renewed license
        naturally falls outside the window and no old warnings are touched.
        """
        from appointments.services import get_clinic_timezone

        with transaction.atomic():
            Clinic.objects.select_for_update().get(cln_id=clinic_id)

            today = datetime.now(get_clinic_timezone(clinic_id)).date()

            vets = StaffProfile.objects.filter(
                cln_id_id=clinic_id,
                stf_position=StaffPosition.VETERINARIAN,
                usr_id__usr_is_active=True,
                stf_license_expiration_date__isnull=False,
                stf_license_expiration_date__gte=today,
                stf_license_expiration_date__lte=(
                    today + timedelta(days=LICENSE_WARNING_WINDOW_DAYS)
                ),
            ).select_related('usr_id')
            if not vets:
                return

            admin_ids = list(
                User.objects.filter(
                    usr_role=UserRole.CLINIC_ADMIN,
                    staffprofile__cln_id=clinic_id,
                ).values_list('usr_id', flat=True)
            )
            if not admin_ids:
                return

            for vet in vets:
                days_left = (vet.stf_license_expiration_date - today).days
                if days_left <= LICENSE_URGENT_DAYS:
                    title = 'License Expiring This Week'
                else:
                    title = 'License Expiring Soon'

                name = f'{vet.usr_id.usr_first_name} {vet.usr_id.usr_last_name}'
                message = (
                    f'The veterinary license for {name} expires on '
                    f'{vet.stf_license_expiration_date:%Y-%m-%d}.'
                )

                for admin_id in admin_ids:
                    exists = Notification.objects.filter(
                        usr_id_id=admin_id,
                        ntf_title=title,
                        ntf_reference_table='STAFF',
                        ntf_reference_id=vet.usr_id_id,
                        ntf_message=message,
                    ).exists()
                    if exists:
                        continue
                    NotificationService.create_notification(
                        user_id=admin_id,
                        title=title,
                        message=message,
                        ntf_type=NotificationType.SYSTEM,
                        ref_table='STAFF',
                        ref_id=vet.usr_id_id,
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

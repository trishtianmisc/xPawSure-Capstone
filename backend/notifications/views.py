import logging

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import HasRole
from notifications.serializers import (
    NotificationSerializer,
    build_appointment_map,
)
from notifications.services import NotificationService
from users.models import UserRole

logger = logging.getLogger(__name__)

# Owners, receptionists and veterinarians read their own notices. Clinic
# admins receive operational notices (vet reschedule/cancel requests, license
# warnings, staff account changes) and read them from the header bell.
IsNotificationRecipient = HasRole(
    UserRole.OWNER,
    UserRole.RECEPTIONIST,
    UserRole.VETERINARIAN,
    UserRole.CLINIC_ADMIN,
)


def _run_license_scan(user):
    """Best-effort, idempotent license-expiry warnings for clinic admins.

    Lazy on-read: every list/unread-count call from a clinic admin first
    ensures T-30/T-7 warnings exist. A scan failure must never break the
    bell endpoints, so it is logged and swallowed.
    """
    if getattr(user, 'usr_role', None) != UserRole.CLINIC_ADMIN:
        return
    staff = getattr(user, 'staffprofile', None)
    if staff is None or staff.cln_id_id is None:
        return
    try:
        NotificationService.ensure_license_expiry_warnings(staff.cln_id_id)
    except Exception:
        logger.warning('License expiry scan failed', exc_info=True)


class NotificationListView(APIView):
    permission_classes = [IsNotificationRecipient]

    def get(self, request):
        _run_license_scan(request.user)
        unread_only = request.query_params.get('unread_only', 'false').lower() == 'true'
        try:
            page = max(int(request.query_params.get('page', 1) or 1), 1)
        except (ValueError, TypeError):
            page = 1
        try:
            page_size = min(max(int(request.query_params.get('page_size', 20) or 20), 1), 100)
        except (ValueError, TypeError):
            page_size = 20

        result = NotificationService.list_notifications(
            user_id=request.user.usr_id,
            unread_only=unread_only,
            page=page,
            page_size=page_size,
        )

        notifications = list(result['results'])
        serializer = NotificationSerializer(
            notifications,
            many=True,
            context={'appointment_map': build_appointment_map(notifications)},
        )
        return Response({
            'total': result['total'],
            'page': result['page'],
            'page_size': result['page_size'],
            'total_pages': result['total_pages'],
            'results': serializer.data,
        })

    def delete(self, request):
        NotificationService.clear_notifications(request.user.usr_id)
        return Response({'detail': 'All notifications cleared.'})


class NotificationUnreadCountView(APIView):
    permission_classes = [IsNotificationRecipient]

    def get(self, request):
        _run_license_scan(request.user)
        count = NotificationService.get_unread_count(request.user.usr_id)
        return Response({'unread_count': count})


class NotificationMarkReadView(APIView):
    permission_classes = [IsNotificationRecipient]

    def patch(self, request, ntf_id):
        ntf = NotificationService.mark_read(ntf_id, request.user.usr_id)
        if ntf is None:
            return Response(
                {'detail': 'Notification not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = NotificationSerializer(
            ntf,
            context={'appointment_map': build_appointment_map([ntf])},
        )
        return Response(serializer.data)


class NotificationMarkAllReadView(APIView):
    permission_classes = [IsNotificationRecipient]

    def patch(self, request):
        NotificationService.mark_all_read(request.user.usr_id)
        return Response({'detail': 'All notifications marked as read.'})

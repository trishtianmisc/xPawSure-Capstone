from django.db.models import OuterRef, Q, Subquery
from rest_framework.response import Response
from rest_framework.views import APIView

from audit_log.models import AuditLog
from audit_log.serializers import AuditLogSerializer
from core.permissions import IsClinicAdmin
from users.models import StaffProfile, User

DEFAULT_LIMIT = 10
MAX_LIMIT = 50

STAFF_MODULES_Q = Q(adl_module__in=['STAFF', 'VETERINARIANS'])
CLINIC_MODULES_Q = Q(adl_module__in=['CLINIC', 'CLINIC_SETTINGS'])
CANCELLATION_Q = (
    Q(adl_module='appointments')
    & Q(adl_table_name='APPOINTMENT')
    & Q(adl_action='UPDATE')
    & Q(adl_new_values__apt_status='CANCELLED')
)


class AuditLogListView(APIView):
    permission_classes = [IsClinicAdmin]

    def get(self, request):
        clinic = request.user.staffprofile.cln_id
        limit = self._parse_limit(request.query_params.get('limit'))

        clinic_user_ids = StaffProfile.objects.filter(cln_id=clinic).values_list('usr_id', flat=True)

        rows = (
            AuditLog.objects.filter(usr_id__in=clinic_user_ids)
            .filter(STAFF_MODULES_Q | CLINIC_MODULES_Q | CANCELLATION_Q)
            .annotate(
                actor_first=Subquery(
                    User.objects.filter(pk=OuterRef('usr_id')).values('usr_first_name')[:1],
                ),
                actor_last=Subquery(
                    User.objects.filter(pk=OuterRef('usr_id')).values('usr_last_name')[:1],
                ),
            )
            .order_by('-adl_created_at')[:limit]
        )

        serializer = AuditLogSerializer(rows, many=True)
        return Response(serializer.data)

    @staticmethod
    def _parse_limit(raw: str | None) -> int:
        try:
            limit = int(raw) if raw else DEFAULT_LIMIT
        except (TypeError, ValueError):
            return DEFAULT_LIMIT
        return min(max(limit, 1), MAX_LIMIT)

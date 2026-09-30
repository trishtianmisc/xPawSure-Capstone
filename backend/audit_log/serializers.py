from rest_framework import serializers

from audit_log.models import AuditLog

STAFF_MODULES = frozenset({'STAFF', 'VETERINARIANS'})
CLINIC_MODULES = frozenset({'CLINIC', 'CLINIC_SETTINGS'})


class AuditLogSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source='adl_id', read_only=True)
    title = serializers.SerializerMethodField()
    subtitle = serializers.SerializerMethodField()
    category = serializers.SerializerMethodField()
    timestamp = serializers.DateTimeField(source='adl_created_at')

    class Meta:
        model = AuditLog
        fields = ['id', 'title', 'subtitle', 'category', 'timestamp']
        read_only_fields = fields

    def get_title(self, obj) -> str:
        return obj.adl_description or ''

    def get_subtitle(self, obj) -> str:
        first = getattr(obj, 'actor_first', None)
        last = getattr(obj, 'actor_last', None)
        if not first and not last:
            return ''
        return f'by {first} {last}'.strip()

    def get_category(self, obj) -> str:
        if obj.adl_module in STAFF_MODULES:
            return 'staff'
        if obj.adl_module in CLINIC_MODULES:
            return 'clinic'
        return 'cancellation'

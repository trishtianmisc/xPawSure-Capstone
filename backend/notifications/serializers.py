from rest_framework import serializers

from notifications.models import Notification


def build_appointment_map(notifications):
    """Resolve referenced appointments in one query for notification lists."""
    appointment_ids = {
        notification.ntf_reference_id
        for notification in notifications
        if (
            notification.ntf_reference_table == 'APPOINTMENT'
            and notification.ntf_reference_id
        )
    }
    if not appointment_ids:
        return {}

    from appointments.models import Appointment

    appointments = Appointment.objects.filter(
        apt_id__in=appointment_ids,
    ).select_related('pet_id')
    return {str(appointment.apt_id): appointment for appointment in appointments}


class NotificationSerializer(serializers.ModelSerializer):
    pet_name = serializers.SerializerMethodField()
    pet_profile_image = serializers.SerializerMethodField()
    appointment_scheduled_at = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            'ntf_id', 'ntf_title', 'ntf_message', 'ntf_type',
            'ntf_is_read', 'ntf_reference_table', 'ntf_reference_id',
            'ntf_created_at', 'ntf_read_at',
            'pet_name', 'pet_profile_image', 'appointment_scheduled_at',
        ]

    def _get_appointment(self, obj):
        cache = self.context.get('appointment_map')
        if cache is not None:
            return cache.get(str(obj.ntf_reference_id))

        from appointments.models import Appointment

        return Appointment.objects.select_related('pet_id').filter(
            apt_id=obj.ntf_reference_id,
        ).first()

    def _referenced_appointment(self, obj):
        if (
            obj.ntf_reference_table != 'APPOINTMENT'
            or not obj.ntf_reference_id
        ):
            return None
        return self._get_appointment(obj)

    def get_pet_name(self, obj):
        appointment = self._referenced_appointment(obj)
        return appointment.pet_id.pet_name if appointment else None

    def get_pet_profile_image(self, obj):
        appointment = self._referenced_appointment(obj)
        return appointment.pet_id.pet_profile_image if appointment else None

    def get_appointment_scheduled_at(self, obj):
        appointment = self._referenced_appointment(obj)
        if appointment is None:
            return None
        return appointment.apt_scheduled_at.isoformat()


class NotificationListResponseSerializer(serializers.Serializer):
    total = serializers.IntegerField()
    page = serializers.IntegerField()
    page_size = serializers.IntegerField()
    total_pages = serializers.IntegerField()
    results = NotificationSerializer(many=True)

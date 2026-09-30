from rest_framework import serializers

from notifications.models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            'ntf_id', 'ntf_title', 'ntf_message', 'ntf_type',
            'ntf_is_read', 'ntf_reference_table', 'ntf_reference_id',
            'ntf_created_at', 'ntf_read_at',
        ]


class NotificationListResponseSerializer(serializers.Serializer):
    total = serializers.IntegerField()
    page = serializers.IntegerField()
    page_size = serializers.IntegerField()
    total_pages = serializers.IntegerField()
    results = NotificationSerializer(many=True)

import uuid

from django.db import models


class NotificationType(models.TextChoices):
    APPOINTMENT_CREATED = 'APPOINTMENT_CREATED'
    APPOINTMENT_CONFIRMED = 'APPOINTMENT_CONFIRMED'
    APPOINTMENT_CANCELLED = 'APPOINTMENT_CANCELLED'
    APPOINTMENT_REMINDER = 'APPOINTMENT_REMINDER'
    CONSULTATION_AVAILABLE = 'CONSULTATION_AVAILABLE'
    PRESCRIPTION_AVAILABLE = 'PRESCRIPTION_AVAILABLE'
    VACCINATION_REMINDER = 'VACCINATION_REMINDER'
    AI_SCREENING_COMPLETED = 'AI_SCREENING_COMPLETED'
    AI_SCREENING_REVIEWED = 'AI_SCREENING_REVIEWED'
    SYSTEM = 'SYSTEM'


class Notification(models.Model):
    ntf_id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False, db_column='NTF_ID',
    )
    usr_id = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        db_column='USR_ID',
        related_name='notifications',
    )
    ntf_title = models.CharField(max_length=255, db_column='NTF_TITLE')
    ntf_message = models.TextField(db_column='NTF_MESSAGE')
    ntf_type = models.CharField(
        max_length=30,
        choices=NotificationType.choices,
        db_column='NTF_TYPE',
    )
    ntf_is_read = models.BooleanField(default=False, db_column='NTF_IS_READ')
    ntf_reference_table = models.CharField(
        max_length=100, null=True, blank=True, db_column='NTF_REFERENCE_TABLE',
    )
    ntf_reference_id = models.UUIDField(
        null=True, blank=True, db_column='NTF_REFERENCE_ID',
    )
    ntf_created_at = models.DateTimeField(
        auto_now_add=True, db_index=True, db_column='NTF_CREATED_AT',
    )
    ntf_read_at = models.DateTimeField(null=True, blank=True, db_column='NTF_READ_AT')

    class Meta:
        managed = True
        db_table = 'NOTIFICATION'
        ordering = ['-ntf_created_at']
        indexes = [
            models.Index(fields=['usr_id', 'ntf_is_read'], name='idx_ntf_user_read'),
            models.Index(fields=['ntf_type'], name='idx_ntf_type'),
        ]

    def __str__(self):
        return f'{self.ntf_title} - {self.usr_id}'

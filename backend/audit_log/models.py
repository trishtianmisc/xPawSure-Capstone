import uuid

from django.db import models


class AuditAction(models.TextChoices):
    CREATE = 'CREATE'
    UPDATE = 'UPDATE'
    DELETE = 'DELETE'
    LOGIN = 'LOGIN'
    LOGOUT = 'LOGOUT'
    REGISTER = 'REGISTER'
    PASSWORD_CHANGE = 'PASSWORD_CHANGE'
    PASSWORD_RESET = 'PASSWORD_RESET'
    AI_SCREENING = 'AI_SCREENING'
    BOOK_APPOINTMENT = 'BOOK_APPOINTMENT'
    UPLOAD_ATTACHMENT = 'UPLOAD_ATTACHMENT'
    EXPORT_REPORT = 'EXPORT_REPORT'


class AuditLog(models.Model):
    adl_id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False, db_column='ADL_ID',
    )
    usr_id = models.UUIDField(db_index=True, db_column='USR_ID')
    adl_action = models.CharField(max_length=50, choices=AuditAction.choices, db_column='ADL_ACTION')
    adl_module = models.CharField(max_length=100, db_column='ADL_MODULE')
    adl_table_name = models.CharField(max_length=100, db_index=True, db_column='ADL_TABLE_NAME')
    adl_record_id = models.UUIDField(db_index=True, db_column='ADL_RECORD_ID')
    adl_description = models.TextField(null=True, blank=True, db_column='ADL_DESCRIPTION')
    adl_old_values = models.JSONField(null=True, blank=True, db_column='ADL_OLD_VALUES')
    adl_new_values = models.JSONField(null=True, blank=True, db_column='ADL_NEW_VALUES')
    adl_ip_address = models.CharField(max_length=50, null=True, blank=True, db_column='ADL_IP_ADDRESS')
    adl_device = models.CharField(max_length=255, null=True, blank=True, db_column='ADL_DEVICE')
    adl_created_at = models.DateTimeField(auto_now_add=True, db_index=True, db_column='ADL_CREATED_AT')

    class Meta:
        managed = True
        db_table = 'AUDIT_LOG'

    def __str__(self):
        return f'{self.adl_action} on {self.adl_table_name} at {self.adl_created_at}'

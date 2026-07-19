import uuid

from django.db import models


class ClinicStatus(models.TextChoices):
    ACTIVE = 'ACTIVE'
    INACTIVE = 'INACTIVE'
    SUSPENDED = 'SUSPENDED'
    ARCHIVED = 'ARCHIVED'


class Clinic(models.Model):
    cln_id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False, db_column='CLN_ID',
    )
    cln_name = models.CharField(max_length=255, unique=True, db_column='CLN_NAME')
    cln_email = models.EmailField(
        max_length=255, unique=True, null=True, blank=True, db_column='CLN_EMAIL',
    )
    cln_phone = models.CharField(max_length=20, null=True, blank=True, db_column='CLN_PHONE')
    cln_address = models.TextField(null=True, blank=True, db_column='CLN_ADDRESS')
    cln_logo_url = models.TextField(null=True, blank=True, db_column='CLN_LOGO_URL')
    cln_license_no = models.CharField(
        max_length=100, null=True, blank=True, db_column='CLN_LICENSE_NO',
    )
    cln_status = models.CharField(
        max_length=20, choices=ClinicStatus.choices,
        default=ClinicStatus.ACTIVE, db_column='CLN_STATUS',
    )
    cln_created_at = models.DateTimeField(auto_now_add=True, db_column='CLN_CREATED_AT')
    cln_updated_at = models.DateTimeField(auto_now=True, db_column='CLN_UPDATED_AT')
    cln_deleted_at = models.DateTimeField(null=True, blank=True, db_column='CLN_DELETED_AT')

    class Meta:
        managed = True
        db_table = 'CLINIC'

    def __str__(self):
        return self.cln_name

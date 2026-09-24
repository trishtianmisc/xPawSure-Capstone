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
        default=ClinicStatus.ACTIVE, db_index=True, db_column='CLN_STATUS',
    )
    cln_created_at = models.DateTimeField(auto_now_add=True, db_column='CLN_CREATED_AT')
    cln_updated_at = models.DateTimeField(auto_now=True, db_column='CLN_UPDATED_AT')
    cln_deleted_at = models.DateTimeField(null=True, blank=True, db_index=True, db_column='CLN_DELETED_AT')

    class Meta:
        managed = True
        db_table = 'CLINIC'

    def __str__(self):
        return self.cln_name


# TODO: Move clinic logo storage to Supabase Storage before production deployment.
# Local file storage (MEDIA_ROOT/clinic_logos/) is used for development only.
CLINIC_LOGO_DIR = 'clinic_logos'


class ClinicSettings(models.Model):
    cls_id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False, db_column='CLS_ID',
    )
    cln_id = models.OneToOneField(
        Clinic, on_delete=models.CASCADE, related_name='settings', db_column='CLN_ID',
    )
    cls_opening_time = models.TimeField(default='09:00', db_column='CLS_OPENING_TIME')
    cls_closing_time = models.TimeField(default='17:00', db_column='CLS_CLOSING_TIME')
    cls_appointment_duration = models.PositiveIntegerField(
        default=30, db_column='CLS_APPOINTMENT_DURATION',
    )
    cls_max_appointments_per_day = models.PositiveIntegerField(
        default=50, db_column='CLS_MAX_APPOINTMENTS_PER_DAY',
    )
    cls_allow_owner_booking = models.BooleanField(
        default=True, db_column='CLS_ALLOW_OWNER_BOOKING',
    )
    cls_timezone = models.CharField(
        max_length=50, default='UTC', db_column='CLS_TIMEZONE',
    )
    cls_created_at = models.DateTimeField(auto_now_add=True, db_column='CLS_CREATED_AT')
    cls_updated_at = models.DateTimeField(auto_now=True, db_column='CLS_UPDATED_AT')

    class Meta:
        managed = True
        db_table = 'CLINIC_SETTINGS'

    def __str__(self):
        return f'Settings for {self.cln_id}'


class ClinicOperatingHours(models.Model):
    class DayOfWeek(models.TextChoices):
        MON = 'MON', 'Monday'
        TUE = 'TUE', 'Tuesday'
        WED = 'WED', 'Wednesday'
        THU = 'THU', 'Thursday'
        FRI = 'FRI', 'Friday'
        SAT = 'SAT', 'Saturday'
        SUN = 'SUN', 'Sunday'

    coa_id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False, db_column='COA_ID',
    )
    cln_id = models.ForeignKey(
        Clinic, on_delete=models.CASCADE, related_name='operating_hours', db_column='CLN_ID',
    )
    day_of_week = models.CharField(max_length=3, choices=DayOfWeek.choices, db_column='DAY_OF_WEEK')
    day_index = models.PositiveSmallIntegerField(db_column='DAY_INDEX')
    opening_time = models.TimeField(null=True, blank=True, db_column='OPENING_TIME')
    closing_time = models.TimeField(null=True, blank=True, db_column='CLOSING_TIME')
    is_closed = models.BooleanField(default=True, db_column='IS_CLOSED')

    class Meta:
        managed = True
        db_table = 'CLINIC_OPERATING_HOURS'
        ordering = ['day_index']
        constraints = [
            models.UniqueConstraint(
                fields=['cln_id', 'day_of_week'],
                name='uq_clinic_operating_hours_day',
            ),
        ]

    def __str__(self):
        status = 'Closed' if self.is_closed else f'{self.opening_time}–{self.closing_time}'
        return f'{self.get_day_of_week_display()}: {status}'

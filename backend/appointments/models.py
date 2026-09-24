import uuid

from django.db import models


class AppointmentType(models.TextChoices):
    CONSULTATION = 'CONSULTATION', 'Consultation'
    FOLLOW_UP = 'FOLLOW_UP', 'Follow Up'
    VACCINATION = 'VACCINATION', 'Vaccination'
    AI_REVIEW = 'AI_REVIEW', 'Ai Review'
    EMERGENCY = 'EMERGENCY', 'Emergency'


class AppointmentStatus(models.TextChoices):
    BOOKED = 'BOOKED', 'Booked'
    CHECKED_IN = 'CHECKED_IN', 'Checked In'
    COMPLETED = 'COMPLETED', 'Completed'
    CANCELLED = 'CANCELLED', 'Cancelled'
    NO_SHOW = 'NO_SHOW', 'No Show'


class SlotStatus(models.TextChoices):
    AVAILABLE = 'AVAILABLE', 'Available'
    BOOKED = 'BOOKED', 'Booked'
    BLOCKED = 'BLOCKED', 'Blocked'


class Appointment(models.Model):
    apt_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, db_column='APT_ID')
    pet_id = models.ForeignKey('pets.Pet', on_delete=models.CASCADE, related_name='appointments', db_column='PET_ID')
    cln_id = models.ForeignKey('clinics.Clinic', on_delete=models.CASCADE, related_name='appointments', db_column='CLN_ID')
    stf_id = models.ForeignKey('users.StaffProfile', on_delete=models.SET_NULL, null=True, blank=True, related_name='appointments', db_column='STF_ID')
    apt_type = models.CharField(max_length=20, choices=AppointmentType.choices, db_column='APT_TYPE')
    apt_status = models.CharField(max_length=20, choices=AppointmentStatus.choices, default=AppointmentStatus.BOOKED, db_index=True, db_column='APT_STATUS')
    apt_scheduled_at = models.DateTimeField(db_column='APT_SCHEDULED_AT')
    apt_reason = models.TextField(null=True, blank=True, db_column='APT_REASON')
    apt_checked_in_at = models.DateTimeField(null=True, blank=True, db_column='APT_CHECKED_IN_AT')
    apt_completed_at = models.DateTimeField(null=True, blank=True, db_column='APT_COMPLETED_AT')
    apt_cancelled_at = models.DateTimeField(null=True, blank=True, db_column='APT_CANCELLED_AT')
    apt_cancellation_reason = models.TextField(null=True, blank=True, db_column='APT_CANCELLATION_REASON')
    apt_created_at = models.DateTimeField(auto_now_add=True, db_column='APT_CREATED_AT')
    apt_updated_at = models.DateTimeField(auto_now=True, db_column='APT_UPDATED_AT')
    apt_deleted_at = models.DateTimeField(null=True, blank=True, db_index=True, db_column='APT_DELETED_AT')
    apt_created_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, related_name='created_appointments', db_column='APT_CREATED_BY')

    class Meta:
        managed = True
        db_table = 'APPOINTMENT'
        ordering = ['-apt_scheduled_at']
        indexes = [
            models.Index(fields=['cln_id', 'apt_scheduled_at'], name='idx_apt_clinic_date'),
            models.Index(fields=['stf_id', 'apt_scheduled_at'], name='idx_apt_vet_date'),
            models.Index(fields=['pet_id'], name='idx_apt_pet'),
        ]

    def __str__(self):
        return f'{self.pet_id} - {self.apt_status}'


class VetSlot(models.Model):
    vsl_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, db_column='VSL_ID')
    cln_id = models.ForeignKey('clinics.Clinic', on_delete=models.CASCADE, related_name='vet_slots', db_column='CLN_ID')
    stf_id = models.ForeignKey('users.StaffProfile', on_delete=models.CASCADE, related_name='vet_slots', db_column='STF_ID')
    vsl_date = models.DateField(db_column='VSL_DATE')
    vsl_start_time = models.TimeField(db_column='VSL_START_TIME')
    vsl_end_time = models.TimeField(db_column='VSL_END_TIME')
    vsl_appointment = models.OneToOneField(
        Appointment,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='vet_slot',
        db_column='VSL_APPOINTMENT',
    )
    vsl_status = models.CharField(
        max_length=20,
        choices=SlotStatus.choices,
        default=SlotStatus.AVAILABLE,
        db_column='VSL_STATUS',
    )
    vsl_created_at = models.DateTimeField(auto_now_add=True, db_column='VSL_CREATED_AT')
    vsl_updated_at = models.DateTimeField(auto_now=True, db_column='VSL_UPDATED_AT')

    class Meta:
        managed = True
        db_table = 'VET_SLOT'
        ordering = ['vsl_date', 'vsl_start_time']
        constraints = [
            models.UniqueConstraint(fields=['stf_id', 'vsl_date', 'vsl_start_time'], name='uq_vet_slot_vet_date_start'),
        ]

    def __str__(self):
        return f'{self.stf_id} {self.vsl_date} {self.vsl_start_time}'

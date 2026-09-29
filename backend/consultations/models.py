import uuid

from django.db import models


class Consultation(models.Model):
    con_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, db_column='CON_ID')
    apt_id = models.OneToOneField(
        'appointments.Appointment',
        on_delete=models.PROTECT,
        related_name='consultation',
        db_column='APT_ID',
    )
    stf_id = models.ForeignKey(
        'users.StaffProfile',
        on_delete=models.PROTECT,
        related_name='consultations',
        db_column='STF_ID',
    )
    con_chief_complaint = models.TextField(null=True, blank=True, db_column='CON_CHIEF_COMPLAINT')
    con_subjective = models.TextField(null=True, blank=True, db_column='CON_SUBJECTIVE')
    con_objective = models.TextField(null=True, blank=True, db_column='CON_OBJECTIVE')
    con_assessment = models.TextField(null=True, blank=True, db_column='CON_ASSESSMENT')
    con_plan = models.TextField(null=True, blank=True, db_column='CON_PLAN')
    con_diagnosis = models.TextField(db_column='CON_DIAGNOSIS')
    con_treatment = models.TextField(null=True, blank=True, db_column='CON_TREATMENT')
    con_notes = models.TextField(null=True, blank=True, db_column='CON_NOTES')
    con_created_at = models.DateTimeField(auto_now_add=True, db_column='CON_CREATED_AT')
    con_updated_at = models.DateTimeField(auto_now=True, db_column='CON_UPDATED_AT')

    class Meta:
        managed = True
        db_table = 'CONSULTATION'
        ordering = ['-con_created_at']
        indexes = [
            models.Index(fields=['apt_id'], name='idx_con_appointment'),
            models.Index(fields=['stf_id'], name='idx_con_veterinarian'),
        ]

    def __str__(self):
        return f'Consultation {self.con_id}'

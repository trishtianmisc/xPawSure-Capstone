import uuid

from django.db import models


class PrescriptionRoute(models.TextChoices):
    ORAL = 'ORAL'
    TOPICAL = 'TOPICAL'
    INJECTION = 'INJECTION'
    EAR = 'EAR'
    EYE = 'EYE'
    OTHER = 'OTHER'


class Prescription(models.Model):
    prs_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, db_column='PRS_ID')
    con_id = models.OneToOneField(
        'consultations.Consultation',
        on_delete=models.PROTECT,
        related_name='prescription',
        db_column='CON_ID',
    )
    stf_id = models.ForeignKey(
        'users.StaffProfile',
        on_delete=models.PROTECT,
        related_name='prescriptions',
        db_column='STF_ID',
    )
    prs_instructions = models.TextField(null=True, blank=True, db_column='PRS_INSTRUCTIONS')
    prs_created_at = models.DateTimeField(auto_now_add=True, db_column='PRS_CREATED_AT')
    prs_updated_at = models.DateTimeField(auto_now=True, db_column='PRS_UPDATED_AT')

    class Meta:
        managed = True
        db_table = 'PRESCRIPTION'
        ordering = ['-prs_created_at']
        indexes = [
            models.Index(fields=['stf_id'], name='idx_prs_veterinarian'),
        ]

    def __str__(self):
        return f'Prescription {self.prs_id}'


class PrescriptionItem(models.Model):
    pri_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, db_column='PRI_ID')
    prs_id = models.ForeignKey(
        Prescription,
        on_delete=models.PROTECT,
        related_name='items',
        db_column='PRS_ID',
    )
    pri_medicine_name = models.CharField(max_length=255, db_column='PRI_MEDICINE_NAME')
    pri_generic_name = models.CharField(max_length=255, null=True, blank=True, db_column='PRI_GENERIC_NAME')
    pri_dosage = models.CharField(max_length=100, db_column='PRI_DOSAGE')
    pri_frequency = models.CharField(max_length=100, db_column='PRI_FREQUENCY')
    pri_duration = models.CharField(max_length=100, db_column='PRI_DURATION')
    pri_route = models.CharField(max_length=20, choices=PrescriptionRoute.choices, db_column='PRI_ROUTE')
    pri_quantity = models.IntegerField(null=True, blank=True, db_column='PRI_QUANTITY')
    pri_notes = models.TextField(null=True, blank=True, db_column='PRI_NOTES')
    pri_created_at = models.DateTimeField(auto_now_add=True, db_column='PRI_CREATED_AT')

    class Meta:
        managed = True
        db_table = 'PRESCRIPTION_ITEM'
        ordering = ['pri_created_at']

    def __str__(self):
        return f'{self.pri_medicine_name} ({self.pri_dosage})'

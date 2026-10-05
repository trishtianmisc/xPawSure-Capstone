import uuid

from django.db import models


class VaccinationRoute(models.TextChoices):
    SUBCUTANEOUS = 'SUBCUTANEOUS'
    INTRAMUSCULAR = 'INTRAMUSCULAR'
    INTRAVENOUS = 'INTRAVENOUS'
    ORAL = 'ORAL'
    OTHER = 'OTHER'


class VaccinationSource(models.TextChoices):
    VET = 'VET'
    OWNER = 'OWNER'


class VaccinationRecord(models.Model):
    vac_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, db_column='VAC_ID')
    con_id = models.ForeignKey(
        'consultations.Consultation',
        on_delete=models.PROTECT,
        related_name='vaccinations',
        null=True,
        blank=True,
        db_column='CON_ID',
    )
    pet_id = models.ForeignKey(
        'pets.Pet',
        on_delete=models.PROTECT,
        related_name='vaccinations',
        db_column='PET_ID',
    )
    stf_id = models.ForeignKey(
        'users.StaffProfile',
        on_delete=models.PROTECT,
        related_name='vaccinations',
        null=True,
        blank=True,
        db_column='STF_ID',
    )
    vac_name = models.CharField(max_length=255, db_column='VAC_NAME')
    vac_brand = models.CharField(max_length=255, null=True, blank=True, db_column='VAC_BRAND')
    vac_batch_no = models.CharField(max_length=100, null=True, blank=True, db_column='VAC_BATCH_NO')
    vac_dose = models.CharField(max_length=100, db_column='VAC_DOSE')
    vac_route = models.CharField(max_length=20, choices=VaccinationRoute.choices, db_column='VAC_ROUTE')
    vac_date_given = models.DateField(db_column='VAC_DATE_GIVEN')
    vac_next_due = models.DateField(null=True, blank=True, db_column='VAC_NEXT_DUE')
    vac_notes = models.TextField(null=True, blank=True, db_column='VAC_NOTES')
    vac_source = models.CharField(max_length=10, choices=VaccinationSource.choices, default=VaccinationSource.VET, db_column='VAC_SOURCE')
    vac_created_at = models.DateTimeField(auto_now_add=True, db_column='VAC_CREATED_AT')
    vac_updated_at = models.DateTimeField(auto_now=True, db_column='VAC_UPDATED_AT')

    class Meta:
        managed = True
        db_table = 'VACCINATION_RECORD'
        ordering = ['-vac_date_given', '-vac_created_at']
        indexes = [
            models.Index(fields=['pet_id'], name='idx_vac_pet'),
            models.Index(fields=['con_id'], name='idx_vac_consultation'),
            models.Index(fields=['stf_id'], name='idx_vac_veterinarian'),
            models.Index(fields=['vac_next_due'], name='idx_vac_next_due'),
        ]

    def __str__(self):
        return f'{self.vac_name} - {self.pet_id}'

import uuid

from django.db import models


class DiseaseSeverity(models.TextChoices):
    LOW = 'LOW', 'Low'
    MODERATE = 'MODERATE', 'Moderate'
    HIGH = 'HIGH', 'High'
    UNKNOWN = 'UNKNOWN', 'Unknown'


class Disease(models.Model):
    dis_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, db_column='DIS_ID')
    dis_code = models.CharField(max_length=50, unique=True, db_column='DIS_CODE')
    dis_name = models.CharField(max_length=150, unique=True, db_column='DIS_NAME')
    dis_description = models.TextField(null=True, blank=True, db_column='DIS_DESCRIPTION')
    dis_severity = models.CharField(max_length=10, choices=DiseaseSeverity.choices, default=DiseaseSeverity.UNKNOWN, db_column='DIS_SEVERITY')
    dis_created_at = models.DateTimeField(auto_now_add=True, db_column='DIS_CREATED_AT')

    class Meta:
        managed = True
        db_table = 'DISEASE'

    def __str__(self):
        return self.dis_name


class ScreeningStatus(models.TextChoices):
    PENDING_REVIEW = 'PENDING_REVIEW', 'Pending Review'
    REVIEWED = 'REVIEWED', 'Reviewed'
    CONFIRMED = 'CONFIRMED', 'Confirmed'
    DISMISSED = 'DISMISSED', 'Dismissed'


class ScreeningSource(models.TextChoices):
    MOCK = 'MOCK', 'Mock Data'
    DEVICE = 'DEVICE', 'On-device AI'


class SecondCheckVerdict(models.TextChoices):
    AGREE = 'AGREE', 'Agree'
    DISAGREE = 'DISAGREE', 'Disagree'
    UNCERTAIN = 'UNCERTAIN', 'Uncertain'
    UNAVAILABLE = 'UNAVAILABLE', 'Unavailable'


class AiScreening(models.Model):
    ais_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, db_column='AIS_ID')
    pet_id = models.ForeignKey('pets.Pet', on_delete=models.CASCADE, related_name='screenings', db_column='PET_ID')
    dis_id = models.ForeignKey(Disease, on_delete=models.PROTECT, related_name='screenings', db_column='DIS_ID')
    usr_id = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, related_name='screenings', db_column='USR_ID')
    ais_confidence = models.DecimalField(max_digits=5, decimal_places=2, db_column='AIS_CONFIDENCE')
    ais_model_version = models.CharField(max_length=50, db_column='AIS_MODEL_VERSION')
    ais_inference_time_ms = models.PositiveIntegerField(null=True, blank=True, db_column='AIS_INFERENCE_TIME_MS')
    ais_device = models.CharField(max_length=100, null=True, blank=True, db_column='AIS_DEVICE')
    ais_status = models.CharField(max_length=20, choices=ScreeningStatus.choices, default=ScreeningStatus.PENDING_REVIEW, db_column='AIS_STATUS')
    ais_source = models.CharField(max_length=10, choices=ScreeningSource.choices, default=ScreeningSource.MOCK, db_column='AIS_SOURCE')
    ais_check_verdict = models.CharField(max_length=20, choices=SecondCheckVerdict.choices, null=True, blank=True, db_column='AIS_CHECK_VERDICT')
    ais_check_notes = models.TextField(blank=True, default='', db_column='AIS_CHECK_NOTES')
    ais_check_remedy = models.TextField(blank=True, default='', db_column='AIS_CHECK_REMEDY')
    ais_check_model = models.CharField(max_length=50, blank=True, default='', db_column='AIS_CHECK_MODEL')
    ais_check_at = models.DateTimeField(null=True, blank=True, db_column='AIS_CHECK_AT')
    ais_refinement = models.JSONField(null=True, blank=True, db_column='AIS_REFINEMENT')
    ais_created_at = models.DateTimeField(auto_now_add=True, db_index=True, db_column='AIS_CREATED_AT')

    class Meta:
        managed = True
        db_table = 'AI_SCREENING'
        ordering = ['-ais_created_at']
        indexes = [
            models.Index(fields=['pet_id', 'ais_created_at'], name='idx_ais_pet_created'),
            models.Index(fields=['ais_status'], name='idx_ais_status'),
        ]

    def __str__(self):
        return f'{self.dis_id} ({self.ais_confidence}%) - {self.pet_id}'

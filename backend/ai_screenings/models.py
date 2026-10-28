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
    DEVICE = 'DEVICE', 'On-device AI'


class ClaudeAnalysisStatus(models.TextChoices):
    NOT_REQUESTED = 'NOT_REQUESTED', 'Not requested'
    OK = 'OK', 'Completed'
    NOT_CONFIGURED = 'NOT_CONFIGURED', 'Not configured'
    TIMEOUT = 'TIMEOUT', 'Timed out'
    RATE_LIMITED = 'RATE_LIMITED', 'Rate limited'
    QUOTA_EXHAUSTED = 'QUOTA_EXHAUSTED', 'Quota exhausted'
    MALFORMED_RESPONSE = 'MALFORMED_RESPONSE', 'Malformed response'
    PROVIDER_ERROR = 'PROVIDER_ERROR', 'Provider error'


class CrossAnalysisStatus(models.TextChoices):
    COMPATIBLE = 'COMPATIBLE', 'Compatible'
    DIFFERENT = 'DIFFERENT', 'Different'
    INSUFFICIENT_EVIDENCE = 'INSUFFICIENT_EVIDENCE', 'Insufficient evidence'


class AiScreening(models.Model):
    ais_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, db_column='AIS_ID')
    pet_id = models.ForeignKey('pets.Pet', on_delete=models.CASCADE, related_name='screenings', db_column='PET_ID')
    dis_id = models.ForeignKey(Disease, on_delete=models.PROTECT, related_name='screenings', db_column='DIS_ID')
    usr_id = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, related_name='screenings', db_column='USR_ID')
    con_id = models.ForeignKey(
        'consultations.Consultation', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='screenings', db_column='CON_ID',
    )
    ais_confidence = models.DecimalField(max_digits=5, decimal_places=2, db_column='AIS_CONFIDENCE')
    ais_model_version = models.CharField(max_length=50, db_column='AIS_MODEL_VERSION')
    ais_inference_time_ms = models.PositiveIntegerField(null=True, blank=True, db_column='AIS_INFERENCE_TIME_MS')
    ais_device = models.CharField(max_length=100, null=True, blank=True, db_column='AIS_DEVICE')
    ais_status = models.CharField(max_length=20, choices=ScreeningStatus.choices, default=ScreeningStatus.PENDING_REVIEW, db_column='AIS_STATUS')
    ais_source = models.CharField(max_length=10, choices=ScreeningSource.choices, default=ScreeningSource.DEVICE, db_column='AIS_SOURCE')
    ais_is_correct = models.BooleanField(null=True, blank=True, db_column='AIS_IS_CORRECT')
    ais_compared_diagnosis = models.TextField(null=True, blank=True, db_column='AIS_COMPARED_DIAGNOSIS')
    ais_compared_at = models.DateTimeField(null=True, blank=True, db_column='AIS_COMPARED_AT')

    # Second, independent image review. These fields are null/not-requested
    # for historical and legacy screenings, which stay fully readable.
    ais_claude_status = models.CharField(
        max_length=30, choices=ClaudeAnalysisStatus.choices,
        default=ClaudeAnalysisStatus.NOT_REQUESTED, db_column='AIS_CLAUDE_STATUS',
    )
    ais_claude_model = models.CharField(max_length=100, null=True, blank=True, db_column='AIS_CLAUDE_MODEL')
    ais_claude_result = models.JSONField(null=True, blank=True, db_column='AIS_CLAUDE_RESULT')
    ais_claude_analyzed_at = models.DateTimeField(null=True, blank=True, db_column='AIS_CLAUDE_ANALYZED_AT')
    ais_claude_latency_ms = models.PositiveIntegerField(null=True, blank=True, db_column='AIS_CLAUDE_LATENCY_MS')
    ais_claude_input_tokens = models.PositiveIntegerField(null=True, blank=True, db_column='AIS_CLAUDE_INPUT_TOKENS')
    ais_claude_output_tokens = models.PositiveIntegerField(null=True, blank=True, db_column='AIS_CLAUDE_OUTPUT_TOKENS')
    ais_cross_analysis_status = models.CharField(
        max_length=25, choices=CrossAnalysisStatus.choices,
        default=CrossAnalysisStatus.INSUFFICIENT_EVIDENCE,
        db_column='AIS_CROSS_ANALYSIS_STATUS',
    )
    ais_cross_analysis_summary = models.TextField(null=True, blank=True, db_column='AIS_CROSS_ANALYSIS_SUMMARY')

    # Display-ready supplementary questionnaire rows (question/answer text).
    # Never used for prediction, confidence, ranking, review, or booking.
    ais_symptom_answers = models.JSONField(null=True, blank=True, db_column='AIS_SYMPTOM_ANSWERS')

    ais_created_at = models.DateTimeField(auto_now_add=True, db_index=True, db_column='AIS_CREATED_AT')

    class Meta:
        managed = True
        db_table = 'AI_SCREENING'
        ordering = ['-ais_created_at']
        indexes = [
            models.Index(fields=['pet_id', 'ais_created_at'], name='idx_ais_pet_created'),
            models.Index(fields=['ais_status'], name='idx_ais_status'),
            models.Index(fields=['ais_claude_status'], name='idx_ais_claude_status'),
        ]

    def __str__(self):
        return f'{self.dis_id} ({self.ais_confidence}%) - {self.pet_id}'


class AiScreeningImage(models.Model):
    """Exactly one stored image per screening.

    The image URL and storage path are kept separately so the Supabase and
    local-development storage backends can both be supported.
    """

    asi_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, db_column='ASI_ID')
    ais_id = models.OneToOneField(
        AiScreening, on_delete=models.CASCADE, related_name='image', db_column='AIS_ID',
    )
    asi_url = models.TextField(db_column='ASI_URL')
    asi_storage_path = models.CharField(max_length=500, db_column='ASI_STORAGE_PATH')
    asi_content_type = models.CharField(max_length=50, db_column='ASI_CONTENT_TYPE')
    asi_size_bytes = models.PositiveIntegerField(db_column='ASI_SIZE_BYTES')
    asi_sha256 = models.CharField(max_length=64, db_index=True, db_column='ASI_SHA256')
    asi_created_at = models.DateTimeField(auto_now_add=True, db_column='ASI_CREATED_AT')

    class Meta:
        managed = True
        db_table = 'AI_SCREENING_IMAGE'

    def __str__(self):
        return f'Image for screening {self.ais_id}'

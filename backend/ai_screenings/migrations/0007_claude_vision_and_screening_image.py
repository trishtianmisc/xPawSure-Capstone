import django.db.models.deletion
import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ai_screenings', '0006_Trishtian_delete_cascade_'),
    ]

    operations = [
        migrations.AddField(
            model_name='aiscreening',
            name='ais_claude_status',
            field=models.CharField(
                choices=[
                    ('NOT_REQUESTED', 'Not requested'),
                    ('OK', 'Completed'),
                    ('NOT_CONFIGURED', 'Not configured'),
                    ('TIMEOUT', 'Timed out'),
                    ('RATE_LIMITED', 'Rate limited'),
                    ('QUOTA_EXHAUSTED', 'Quota exhausted'),
                    ('MALFORMED_RESPONSE', 'Malformed response'),
                    ('PROVIDER_ERROR', 'Provider error'),
                ],
                db_column='AIS_CLAUDE_STATUS',
                default='NOT_REQUESTED',
                max_length=30,
            ),
        ),
        migrations.AddField(
            model_name='aiscreening',
            name='ais_claude_model',
            field=models.CharField(
                blank=True, db_column='AIS_CLAUDE_MODEL', max_length=100, null=True,
            ),
        ),
        migrations.AddField(
            model_name='aiscreening',
            name='ais_claude_result',
            field=models.JSONField(
                blank=True, db_column='AIS_CLAUDE_RESULT', null=True,
            ),
        ),
        migrations.AddField(
            model_name='aiscreening',
            name='ais_claude_analyzed_at',
            field=models.DateTimeField(
                blank=True, db_column='AIS_CLAUDE_ANALYZED_AT', null=True,
            ),
        ),
        migrations.AddField(
            model_name='aiscreening',
            name='ais_claude_latency_ms',
            field=models.PositiveIntegerField(
                blank=True, db_column='AIS_CLAUDE_LATENCY_MS', null=True,
            ),
        ),
        migrations.AddField(
            model_name='aiscreening',
            name='ais_claude_input_tokens',
            field=models.PositiveIntegerField(
                blank=True, db_column='AIS_CLAUDE_INPUT_TOKENS', null=True,
            ),
        ),
        migrations.AddField(
            model_name='aiscreening',
            name='ais_claude_output_tokens',
            field=models.PositiveIntegerField(
                blank=True, db_column='AIS_CLAUDE_OUTPUT_TOKENS', null=True,
            ),
        ),
        migrations.AddField(
            model_name='aiscreening',
            name='ais_cross_analysis_status',
            field=models.CharField(
                choices=[
                    ('COMPATIBLE', 'Compatible'),
                    ('DIFFERENT', 'Different'),
                    ('INSUFFICIENT_EVIDENCE', 'Insufficient evidence'),
                ],
                db_column='AIS_CROSS_ANALYSIS_STATUS',
                default='INSUFFICIENT_EVIDENCE',
                max_length=25,
            ),
        ),
        migrations.AddField(
            model_name='aiscreening',
            name='ais_cross_analysis_summary',
            field=models.TextField(
                blank=True, db_column='AIS_CROSS_ANALYSIS_SUMMARY', null=True,
            ),
        ),
        migrations.AddIndex(
            model_name='aiscreening',
            index=models.Index(
                fields=['ais_claude_status'], name='idx_ais_claude_status',
            ),
        ),
        migrations.CreateModel(
            name='AiScreeningImage',
            fields=[
                (
                    'asi_id',
                    models.UUIDField(
                        db_column='ASI_ID', default=uuid.uuid4, editable=False,
                        primary_key=True, serialize=False,
                    ),
                ),
                ('asi_url', models.TextField(db_column='ASI_URL')),
                (
                    'asi_storage_path',
                    models.CharField(db_column='ASI_STORAGE_PATH', max_length=500),
                ),
                (
                    'asi_content_type',
                    models.CharField(db_column='ASI_CONTENT_TYPE', max_length=50),
                ),
                ('asi_size_bytes', models.PositiveIntegerField(db_column='ASI_SIZE_BYTES')),
                (
                    'asi_sha256',
                    models.CharField(db_column='ASI_SHA256', db_index=True, max_length=64),
                ),
                ('asi_created_at', models.DateTimeField(auto_now_add=True, db_column='ASI_CREATED_AT')),
                (
                    'ais_id',
                    models.OneToOneField(
                        db_column='AIS_ID',
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='image',
                        to='ai_screenings.aiscreening',
                    ),
                ),
            ],
            options={
                'db_table': 'AI_SCREENING_IMAGE',
                'managed': True,
            },
        ),
    ]

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('ai_screenings', '0004_delete_mock_screenings'),
    ]

    operations = [
        migrations.RunSQL(
            sql=[
                'ALTER TABLE "AI_SCREENING" DROP COLUMN IF EXISTS "AIS_CHECK_AT";',
                'ALTER TABLE "AI_SCREENING" DROP COLUMN IF EXISTS "AIS_CHECK_MODEL";',
                'ALTER TABLE "AI_SCREENING" DROP COLUMN IF EXISTS "AIS_CHECK_NOTES";',
                'ALTER TABLE "AI_SCREENING" DROP COLUMN IF EXISTS "AIS_CHECK_VERDICT";',
                'ALTER TABLE "AI_SCREENING" DROP COLUMN IF EXISTS "AIS_CHECK_REMEDY";',
                'ALTER TABLE "AI_SCREENING" DROP COLUMN IF EXISTS "AIS_REFINEMENT";',
                (
                    "DELETE FROM django_migrations WHERE app = 'ai_screenings' AND name IN ("
                    "'0003_aiscreening_ais_check_at_aiscreening_ais_check_model_and_more', "
                    "'0004_aiscreening_ais_check_remedy', "
                    "'0005_aiscreening_ais_refinement');"
                ),
            ],
            # Restoring the columns would re-break inserts on this branch.
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]

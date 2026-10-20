
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('ai_screenings', '0005_drop_gemini_check_columns'),
    ]

    operations = [
        migrations.RunSQL(
            sql=[
                '''
                ALTER TABLE public."AI_SCREENING"
                DROP CONSTRAINT IF EXISTS
                "AI_SCREENING_CON_ID_2c5c17e7_fk_CONSULTATION_CON_ID";

                ALTER TABLE public."AI_SCREENING"
                ADD CONSTRAINT
                "AI_SCREENING_CON_ID_2c5c17e7_fk_CONSULTATION_CON_ID"
                FOREIGN KEY ("CON_ID")
                REFERENCES public."CONSULTATION" ("CON_ID")
                ON DELETE SET NULL
                DEFERRABLE INITIALLY DEFERRED;
                ''',
                '''
                ALTER TABLE public."APPOINTMENT"
                DROP CONSTRAINT IF EXISTS
                "APPOINTMENT_APT_SCREENING_ID_ae97fbed_fk_AI_SCREENING_AIS_ID";

                ALTER TABLE public."APPOINTMENT"
                ADD CONSTRAINT
                "APPOINTMENT_APT_SCREENING_ID_ae97fbed_fk_AI_SCREENING_AIS_ID"
                FOREIGN KEY ("APT_SCREENING_ID")
                REFERENCES public."AI_SCREENING" ("AIS_ID")
                ON DELETE SET NULL
                DEFERRABLE INITIALLY DEFERRED;
                ''',
            ],
            reverse_sql=[
                '''
                ALTER TABLE public."APPOINTMENT"
                DROP CONSTRAINT IF EXISTS
                "APPOINTMENT_APT_SCREENING_ID_ae97fbed_fk_AI_SCREENING_AIS_ID";

                ALTER TABLE public."APPOINTMENT"
                ADD CONSTRAINT
                "APPOINTMENT_APT_SCREENING_ID_ae97fbed_fk_AI_SCREENING_AIS_ID"
                FOREIGN KEY ("APT_SCREENING_ID")
                REFERENCES public."AI_SCREENING" ("AIS_ID")
                DEFERRABLE INITIALLY DEFERRED;
                ''',
                '''
                ALTER TABLE public."AI_SCREENING"
                DROP CONSTRAINT IF EXISTS
                "AI_SCREENING_CON_ID_2c5c17e7_fk_CONSULTATION_CON_ID";

                ALTER TABLE public."AI_SCREENING"
                ADD CONSTRAINT
                "AI_SCREENING_CON_ID_2c5c17e7_fk_CONSULTATION_CON_ID"
                FOREIGN KEY ("CON_ID")
                REFERENCES public."CONSULTATION" ("CON_ID")
                DEFERRABLE INITIALLY DEFERRED;
                ''',
            ],
        ),
    ]

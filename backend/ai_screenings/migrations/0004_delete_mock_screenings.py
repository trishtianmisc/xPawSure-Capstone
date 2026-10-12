from django.db import migrations


def delete_mock_screenings(apps, schema_editor):
    """Remove fabricated demo screenings; appointments keep a NULL link (SET_NULL)."""
    AiScreening = apps.get_model('ai_screenings', 'AiScreening')
    AiScreening.objects.filter(ais_source='MOCK').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('ai_screenings', '0003_aiscreening_ais_compared_at_and_more'),
    ]

    operations = [
        migrations.RunPython(delete_mock_screenings, migrations.RunPython.noop),
    ]

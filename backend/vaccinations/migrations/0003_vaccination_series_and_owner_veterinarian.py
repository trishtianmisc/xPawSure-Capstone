import unicodedata
import uuid

from django.db import migrations, models


def backfill_vaccination_series(apps, schema_editor):
    VaccinationRecord = apps.get_model('vaccinations', 'VaccinationRecord')
    database = schema_editor.connection.alias
    series_by_pet_and_name = {}

    records = VaccinationRecord.objects.using(database).order_by(
        'pet_id_id', 'vac_date_given', 'vac_created_at', 'vac_id',
    ).values('vac_id', 'pet_id_id', 'vac_name')
    for record in records.iterator():
        normalized_name = ' '.join(
            unicodedata.normalize('NFKC', record['vac_name'] or '').casefold().split()
        )
        key = (record['pet_id_id'], normalized_name)
        series_id = series_by_pet_and_name.setdefault(key, uuid.uuid4())
        VaccinationRecord.objects.using(database).filter(
            vac_id=record['vac_id'],
        ).update(vac_series_id=series_id)


class Migration(migrations.Migration):

    dependencies = [
        ('vaccinations', '0002_vaccinationrecord_vac_source_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='vaccinationrecord',
            name='vac_veterinarian_name',
            field=models.CharField(blank=True, db_column='VAC_VETERINARIAN_NAME', max_length=255, null=True),
        ),
        migrations.AddField(
            model_name='vaccinationrecord',
            name='vac_series_id',
            field=models.UUIDField(db_column='VAC_SERIES_ID', null=True),
        ),
        migrations.AlterField(
            model_name='vaccinationrecord',
            name='vac_dose',
            field=models.CharField(blank=True, db_column='VAC_DOSE', max_length=100, null=True),
        ),
        migrations.AlterField(
            model_name='vaccinationrecord',
            name='vac_route',
            field=models.CharField(blank=True, choices=[('SUBCUTANEOUS', 'Subcutaneous'), ('INTRAMUSCULAR', 'Intramuscular'), ('INTRAVENOUS', 'Intravenous'), ('ORAL', 'Oral'), ('OTHER', 'Other')], db_column='VAC_ROUTE', max_length=20, null=True),
        ),
        migrations.RunPython(backfill_vaccination_series, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='vaccinationrecord',
            name='vac_series_id',
            field=models.UUIDField(db_column='VAC_SERIES_ID', default=uuid.uuid4),
        ),
        migrations.AddIndex(
            model_name='vaccinationrecord',
            index=models.Index(fields=['pet_id', 'vac_series_id'], name='idx_vac_pet_series'),
        ),
    ]

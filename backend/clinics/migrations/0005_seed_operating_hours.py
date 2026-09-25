from django.db import migrations

OPERATING_HOURS_DEFAULTS = [
    ('MON', 0, '09:00', '17:00', False),
    ('TUE', 1, '09:00', '17:00', False),
    ('WED', 2, '09:00', '17:00', False),
    ('THU', 3, '09:00', '17:00', False),
    ('FRI', 4, '09:00', '17:00', False),
    ('SAT', 5, None, None, True),
    ('SUN', 6, None, None, True),
]


def seed_operating_hours(apps, schema_editor):
    Clinic = apps.get_model('clinics', 'Clinic')
    ClinicOperatingHours = apps.get_model('clinics', 'ClinicOperatingHours')

    for clinic in Clinic.objects.filter(cln_deleted_at__isnull=True):
        if ClinicOperatingHours.objects.filter(cln_id=clinic).exists():
            continue

        ClinicOperatingHours.objects.bulk_create([
            ClinicOperatingHours(
                cln_id=clinic,
                day_of_week=day,
                day_index=index,
                opening_time=open_t,
                closing_time=close_t,
                is_closed=closed,
            )
            for day, index, open_t, close_t, closed in OPERATING_HOURS_DEFAULTS
        ])
        print(f'Seeded operating hours for clinic: {clinic.cln_name}')


def reverse_seed(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('clinics', '0004_remove_clinicoperatinghours_coh_created_at_and_more'),
    ]

    operations = [
        migrations.RunPython(seed_operating_hours, reverse_seed),
    ]

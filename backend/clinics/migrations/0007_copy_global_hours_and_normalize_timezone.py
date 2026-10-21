from django.db import migrations


DAY_DEFAULTS = [
    ('MON', 0, False),
    ('TUE', 1, False),
    ('WED', 2, False),
    ('THU', 3, False),
    ('FRI', 4, False),
    ('SAT', 5, True),
    ('SUN', 6, True),
]


def copy_global_hours_and_normalize_timezone(apps, schema_editor):
    ClinicSettings = apps.get_model('clinics', 'ClinicSettings')
    ClinicOperatingHours = apps.get_model('clinics', 'ClinicOperatingHours')
    db_alias = schema_editor.connection.alias

    copied_clinics = 0
    settings_qs = ClinicSettings.objects.using(db_alias).all()
    for settings_obj in settings_qs.iterator():
        has_hours = ClinicOperatingHours.objects.using(db_alias).filter(
            cln_id_id=settings_obj.cln_id_id,
        ).exists()
        if has_hours:
            continue

        ClinicOperatingHours.objects.using(db_alias).bulk_create([
            ClinicOperatingHours(
                cln_id_id=settings_obj.cln_id_id,
                day_of_week=day,
                day_index=index,
                opening_time=None if is_closed else settings_obj.cls_opening_time,
                closing_time=None if is_closed else settings_obj.cls_closing_time,
                is_closed=is_closed,
            )
            for day, index, is_closed in DAY_DEFAULTS
        ])
        copied_clinics += 1

    timezone_rows = ClinicSettings.objects.using(db_alias).filter(
        cls_timezone='UTC',
    ).update(cls_timezone='Asia/Manila')

    print(
        'Per-day hours copied for '
        f'{copied_clinics} clinic(s); timezone changed for '
        f'{timezone_rows} row(s).'
    )


class Migration(migrations.Migration):

    dependencies = [
        ('clinics', '0006_remove_clinicoperatinghours_uq_clinic_operating_hours_clinic_day_and_more'),
    ]

    operations = [
        migrations.RunPython(
            copy_global_hours_and_normalize_timezone,
            migrations.RunPython.noop,
        ),
    ]

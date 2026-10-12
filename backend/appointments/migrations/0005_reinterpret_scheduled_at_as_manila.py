from datetime import timedelta

from django.db import migrations

# apt_scheduled_at was encoded with make_aware() defaulting to UTC, storing
# clinic wall-clock times as if they were UTC (a 10:00 PHT slot became
# 10:00Z instead of 02:00Z). Re-interpret existing rows as Asia/Manila by
# shifting them back 8 hours. The Philippines has no DST, so the offset is
# fixed and the operation is exactly reversible.
SHIFT = timedelta(hours=8)


def shift_scheduled_at_back(apps, schema_editor):
    appointment_model = apps.get_model('appointments', 'Appointment')
    queryset = appointment_model.objects.all().only('apt_id', 'apt_scheduled_at')
    for appointment in queryset.iterator(chunk_size=500):
        appointment.apt_scheduled_at = appointment.apt_scheduled_at - SHIFT
        appointment.save(update_fields=['apt_scheduled_at'])


def shift_scheduled_at_forward(apps, schema_editor):
    appointment_model = apps.get_model('appointments', 'Appointment')
    queryset = appointment_model.objects.all().only('apt_id', 'apt_scheduled_at')
    for appointment in queryset.iterator(chunk_size=500):
        appointment.apt_scheduled_at = appointment.apt_scheduled_at + SHIFT
        appointment.save(update_fields=['apt_scheduled_at'])


class Migration(migrations.Migration):

    dependencies = [
        ('appointments', '0004_appointment_apt_screening'),
    ]

    operations = [
        migrations.RunPython(
            shift_scheduled_at_back,
            shift_scheduled_at_forward,
        ),
    ]

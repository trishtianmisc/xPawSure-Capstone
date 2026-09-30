from django.db import migrations, models


def book_to_pending(apps, schema_editor):
    Appointment = apps.get_model('appointments', 'Appointment')
    Appointment.objects.filter(apt_status='BOOKED').update(apt_status='PENDING')


def pending_to_book(apps, schema_editor):
    Appointment = apps.get_model('appointments', 'Appointment')
    Appointment.objects.filter(apt_status='PENDING').update(apt_status='BOOKED')


class Migration(migrations.Migration):

    dependencies = [
        ('appointments', '0002_add_vsl_status'),
    ]

    operations = [
        # The VSL_STATUS column is created by 0002 via RunSQL, but that
        # migration never registered the field in the migration state.
        # Update state only — the column already exists in the database.
        migrations.SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[
                migrations.AddField(
                    model_name='vetslot',
                    name='vsl_status',
                    field=models.CharField(
                        choices=[
                            ('AVAILABLE', 'Available'),
                            ('BOOKED', 'Booked'),
                            ('BLOCKED', 'Blocked'),
                        ],
                        db_column='VSL_STATUS',
                        default='AVAILABLE',
                        max_length=20,
                    ),
                ),
            ],
        ),
        migrations.AlterField(
            model_name='appointment',
            name='apt_status',
            field=models.CharField(
                choices=[
                    ('PENDING', 'Pending'),
                    ('CONFIRMED', 'Confirmed'),
                    ('CHECKED_IN', 'Checked In'),
                    ('IN_PROGRESS', 'In Progress'),
                    ('COMPLETED', 'Completed'),
                    ('CANCELLED', 'Cancelled'),
                    ('NO_SHOW', 'No Show'),
                ],
                db_column='APT_STATUS',
                db_index=True,
                default='PENDING',
                max_length=20,
            ),
        ),
        migrations.RunPython(book_to_pending, pending_to_book),
    ]

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('owners', '0002_remove_ownerprofile_own_first_name_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='ownerprofile',
            name='own_public_phone_consent',
            field=models.BooleanField(
                db_column='OWN_PUBLIC_PHONE_CONSENT',
                default=False,
            ),
        ),
    ]

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('consultations', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='consultation',
            name='con_specific_disease',
            field=models.TextField(blank=True, db_column='CON_SPECIFIC_DISEASE', null=True),
        ),
    ]

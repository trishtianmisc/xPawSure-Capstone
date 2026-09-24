from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('appointments', '0001_initial'),
    ]

    operations = [
        migrations.RunSQL(
            sql='ALTER TABLE "VET_SLOT" ADD COLUMN "VSL_STATUS" varchar(20) NOT NULL DEFAULT \'AVAILABLE\';',
            reverse_sql='ALTER TABLE "VET_SLOT" DROP COLUMN "VSL_STATUS";',
        ),
        migrations.RunSQL(
            sql='UPDATE "VET_SLOT" SET "VSL_STATUS" = \'BOOKED\' WHERE "VSL_APPOINTMENT" IS NOT NULL;',
            reverse_sql='UPDATE "VET_SLOT" SET "VSL_STATUS" = \'AVAILABLE\';',
        ),
    ]

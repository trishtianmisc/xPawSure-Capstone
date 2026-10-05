from django.db import migrations

DISEASES = [
    {
        'dis_code': 'ALLERGIC_DERMATITIS',
        'dis_name': 'Allergic Dermatitis',
        'dis_description': 'Chronic skin inflammation triggered by environmental allergens, causing itching, redness, and hives.',
    },
    {
        'dis_code': 'BACTERIAL',
        'dis_name': 'Bacterial',
        'dis_description': 'Bacterial skin infection causing pustules, redness, moist lesions, and discomfort.',
    },
    {
        'dis_code': 'FUNGAL',
        'dis_name': 'Fungal',
        'dis_description': 'Fungal overgrowth on the skin, often causing circular lesions, scaling, and irritation.',
    },
    {
        'dis_code': 'HOTSPOT',
        'dis_name': 'Hotspot',
        'dis_description': 'Acute moist dermatitis; rapidly developing inflamed, weepy skin lesion with intense itching.',
    },
    {
        'dis_code': 'MANGE',
        'dis_name': 'Mange',
        'dis_description': 'Caused by mites burrowing into the skin, causing intense itching, hair loss, and thickened skin.',
    },
]


def seed_diseases(apps, schema_editor):
    Disease = apps.get_model('ai_screenings', 'Disease')
    for item in DISEASES:
        Disease.objects.get_or_create(
            dis_code=item['dis_code'],
            defaults={
                'dis_name': item['dis_name'],
                'dis_description': item['dis_description'],
            },
        )


def unseed_diseases(apps, schema_editor):
    Disease = apps.get_model('ai_screenings', 'Disease')
    codes = [item['dis_code'] for item in DISEASES]
    Disease.objects.filter(dis_code__in=codes).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('ai_screenings', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(seed_diseases, unseed_diseases),
    ]

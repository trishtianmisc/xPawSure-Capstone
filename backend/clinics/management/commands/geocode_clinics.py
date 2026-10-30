from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db.models import Q

from clinics.geocoding import geocode_address
from clinics.models import Clinic


class Command(BaseCommand):
    help = 'Resolve missing clinic coordinates through OpenStreetMap Nominatim.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Re-geocode clinics that already have coordinates.',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='List the clinics that would be geocoded without calling Nominatim.',
        )

    def handle(self, *args, **options):
        if not settings.NOMINATIM_USER_AGENT.strip():
            raise CommandError(
                'NOMINATIM_USER_AGENT must be set before geocoding clinics.',
            )

        clinics = (
            Clinic.objects.filter(cln_deleted_at__isnull=True)
            .exclude(cln_address__isnull=True)
            .exclude(cln_address='')
            .order_by('cln_name')
        )
        if not options['force']:
            clinics = clinics.filter(
                Q(cln_latitude__isnull=True) | Q(cln_longitude__isnull=True),
            )

        if options['dry_run']:
            self.stdout.write(
                f'Would geocode {clinics.count()} clinic(s) using Nominatim:',
            )
            for clinic in clinics.iterator():
                self.stdout.write(f'  - {clinic.cln_name}: {clinic.cln_address}')
            return

        success_count = 0
        failure_count = 0

        for clinic in clinics.iterator():
            address = (clinic.cln_address or '').strip()
            if not address:
                continue

            coordinates = geocode_address(address)
            if coordinates is None:
                failure_count += 1
                self.stdout.write(
                    self.style.WARNING(
                        f'Could not geocode "{clinic.cln_name}" ({address}).',
                    ),
                )
                continue

            clinic.cln_latitude, clinic.cln_longitude = coordinates
            clinic.save(
                update_fields=['cln_latitude', 'cln_longitude', 'cln_updated_at'],
            )
            success_count += 1
            self.stdout.write(
                self.style.SUCCESS(
                    f'Geocoded "{clinic.cln_name}" to '
                    f'{clinic.cln_latitude}, {clinic.cln_longitude}.',
                ),
            )

        self.stdout.write(
            self.style.SUCCESS(
                f'Finished: {success_count} geocoded, {failure_count} failed.',
            ),
        )

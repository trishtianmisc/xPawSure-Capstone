"""Create or update the XPawSure platform Super Admin account.

The React app authenticates against the custom ``users.User`` model, so
Django's ``createsuperuser`` command cannot create a usable app login. This
command creates the correct role, activates the account, and sets the password
through Django's password validators.

Use it in a Render Shell or in a terminal with the production environment:

    python manage.py create_super_admin --email admin@example.com

The password is prompted for without echo. ``--password`` exists for
non-interactive environments but is not recommended because it can be captured
in shell history or process listings.
"""

from getpass import getpass

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError

from users.models import User, UserRole


class Command(BaseCommand):
    help = (
        'Create the XPawSure platform Super Admin in users.User '
        '(not Django auth.User).'
    )

    def add_arguments(self, parser):
        parser.add_argument('--email', required=True, help='Super Admin email address.')
        parser.add_argument('--first-name', default='Super')
        parser.add_argument('--last-name', default='Admin')
        parser.add_argument(
            '--password',
            help=(
                'Password value. Omit this option to be prompted without echo; '
                'the argument form can leak through shell history.'
            ),
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Update an existing account instead of refusing to overwrite it.',
        )

    def handle(self, *args, **options):
        email = options['email'].strip().lower()
        if not email:
            raise CommandError('--email must not be empty.')

        existing = User.objects.filter(usr_email__iexact=email).first()
        if existing and not options['force']:
            raise CommandError(
                f'A user with {email} already exists. '
                'Use --force to reset its role and password.',
            )

        password = options['password'] or getpass('Password: ')
        if options['password'] is None:
            confirmation = getpass('Confirm password: ')
            if password != confirmation:
                raise CommandError('Passwords do not match.')

        user = existing or User(usr_email=email)
        user.usr_first_name = options['first_name'].strip() or 'Super'
        user.usr_last_name = options['last_name'].strip() or 'Admin'
        user.usr_role = UserRole.SUPER_ADMIN
        user.usr_is_active = True
        user.usr_email_verified = True
        user.usr_must_change_password = False
        user.usr_deleted_at = None

        try:
            validate_password(password, user=user)
        except ValidationError as exc:
            raise CommandError('; '.join(exc.messages)) from exc

        user.set_password(password)
        user.save()

        action = 'Updated' if existing else 'Created'
        self.stdout.write(self.style.SUCCESS(
            f'{action} Super Admin: {user.usr_email} ({user.usr_id})',
        ))

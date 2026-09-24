import logging
import os
import secrets

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from audit_log.models import AuditAction
from audit_log.services import AuditService
from clinics.models import CLINIC_LOGO_DIR, Clinic, ClinicOperatingHours, ClinicSettings, ClinicStatus
from clinics.tasks import send_clinic_welcome_email
from users.services import AuthService

logger = logging.getLogger(__name__)

OPERATING_HOURS_DEFAULTS = [
    ('MON', 0, '09:00', '17:00', False),
    ('TUE', 1, '09:00', '17:00', False),
    ('WED', 2, '09:00', '17:00', False),
    ('THU', 3, '09:00', '17:00', False),
    ('FRI', 4, '09:00', '17:00', False),
    ('SAT', 5, None, None, True),
    ('SUN', 6, None, None, True),
]

VALID_DAYS = {'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'}


def _audit(**kwargs):
    try:
        AuditService.log(**kwargs)
    except Exception as e:
        logger.warning('Audit log failed (non-fatal): %s', e)


class ClinicService:

    @staticmethod
    def create(data: dict, user_id: str | None = None, ip_address: str | None = None) -> Clinic:
        with transaction.atomic():
            clinic_name = data['cln_name']
            clinic_email = data.get('cln_email') or None

            clinic = Clinic.objects.create(
                cln_name=clinic_name,
                cln_email=clinic_email,
                cln_phone=data.get('cln_phone') or None,
                cln_address=data.get('cln_address') or None,
                cln_license_no=data.get('cln_license_no') or None,
            )

            admin_email = clinic_email or f'admin@{clinic_name.lower().replace(" ", "")}.com'
            temp_password = secrets.token_urlsafe(16)
            admin_first_name = clinic_name.split()[0] if clinic_name.split() else 'Clinic'
            admin_last_name = 'Admin'

            ClinicSettings.objects.create(cln_id=clinic)

            for day, index, open_t, close_t, closed in OPERATING_HOURS_DEFAULTS:
                ClinicOperatingHours.objects.create(
                    cln_id=clinic,
                    day_of_week=day,
                    day_index=index,
                    opening_time=open_t,
                    closing_time=close_t,
                    is_closed=closed,
                )

            AuthService.create_clinic_admin(
                email=admin_email,
                password=temp_password,
                first_name=admin_first_name,
                last_name=admin_last_name,
                clinic=clinic,
            )

            if user_id:
                _audit(
                    user_id=user_id,
                    action=AuditAction.CREATE,
                    module='CLINIC',
                    table_name='CLINIC',
                    record_id=str(clinic.cln_id),
                    description=f'Clinic "{clinic.cln_name}" created with admin account',
                    new_values={'name': clinic.cln_name, 'status': clinic.cln_status},
                    ip_address=ip_address,
                )

        if clinic_email:
            login_url = f'{settings.FRONTEND_URL}/login'
            transaction.on_commit(lambda: send_clinic_welcome_email.delay(
                clinic_name=clinic.cln_name,
                clinic_email=clinic_email,
                admin_email=admin_email,
                temp_password=temp_password,
                login_url=login_url,
                support_email=settings.SUPPORT_EMAIL,
            ))
            clinic._email_sent = True
        else:
            clinic._email_sent = False

        clinic._temp_password = temp_password

        return clinic

    @staticmethod
    def get_by_id(clinic_id: str) -> Clinic:
        return Clinic.objects.get(cln_id=clinic_id, cln_deleted_at__isnull=True)

    @staticmethod
    def update(clinic: Clinic, data: dict, user_id: str, ip_address: str | None = None) -> Clinic:
        old_values = {
            'name': clinic.cln_name,
            'email': clinic.cln_email,
            'phone': clinic.cln_phone,
            'address': clinic.cln_address,
            'license_number': clinic.cln_license_no,
        }

        changed = False
        for field, value in data.items():
            setattr(clinic, field, value)
            changed = True

        if changed:
            clinic.save()

            new_values = {
                'name': clinic.cln_name,
                'email': clinic.cln_email,
                'phone': clinic.cln_phone,
                'address': clinic.cln_address,
                'license_number': clinic.cln_license_no,
            }

            _audit(
                user_id=user_id,
                action=AuditAction.UPDATE,
                module='CLINIC',
                table_name='CLINIC',
                record_id=str(clinic.cln_id),
                description=f'Clinic "{clinic.cln_name}" updated',
                old_values=old_values,
                new_values=new_values,
                ip_address=ip_address,
            )

        return clinic

    @staticmethod
    def update_status(clinic: Clinic, new_status: ClinicStatus, user_id: str, ip_address: str | None = None) -> Clinic:
        old_status = clinic.cln_status
        clinic.cln_status = new_status
        clinic.save()

        _audit(
            user_id=user_id,
            action=AuditAction.UPDATE,
            module='CLINIC',
            table_name='CLINIC',
            record_id=str(clinic.cln_id),
            description=f'Clinic "{clinic.cln_name}" status changed from {old_status} to {new_status}',
            old_values={'status': old_status},
            new_values={'status': new_status},
            ip_address=ip_address,
        )

        return clinic

    @staticmethod
    def soft_delete(clinic: Clinic, user_id: str, ip_address: str | None = None) -> Clinic:
        clinic.cln_deleted_at = timezone.now()
        clinic.save()

        _audit(
            user_id=user_id,
            action=AuditAction.DELETE,
            module='CLINIC',
            table_name='CLINIC',
            record_id=str(clinic.cln_id),
            description=f'Clinic "{clinic.cln_name}" deleted',
            old_values={'deleted_at': None},
            new_values={'deleted_at': str(clinic.cln_deleted_at)},
            ip_address=ip_address,
        )

        return clinic

    @staticmethod
    def get_stats() -> dict:
        from django.db.models import Count, Q

        base = Q(cln_deleted_at__isnull=True)
        counts = Clinic.objects.filter(base).aggregate(
            total=Count('cln_id'),
            active=Count('cln_id', filter=base & Q(cln_status=ClinicStatus.ACTIVE)),
            suspended=Count('cln_id', filter=base & Q(cln_status=ClinicStatus.SUSPENDED)),
            inactive=Count('cln_id', filter=base & Q(cln_status=ClinicStatus.INACTIVE)),
            archived=Count('cln_id', filter=base & Q(cln_status=ClinicStatus.ARCHIVED)),
        )

        recent = list(
            Clinic.objects.filter(base)
            .order_by('-cln_created_at')[:5]
            .values('cln_id', 'cln_name', 'cln_status', 'cln_created_at')
        )

        return {
            **counts,
            'recent': [
                {
                    'id': str(r['cln_id']),
                    'name': r['cln_name'],
                    'status': r['cln_status'],
                    'created_at': r['cln_created_at'].isoformat() if r['cln_created_at'] else None,
                }
                for r in recent
            ],
        }


class ClinicProfileService:

    @staticmethod
    def get_profile(clinic: Clinic) -> Clinic:
        return clinic

    @staticmethod
    def update_profile(
        clinic: Clinic,
        data: dict,
        user_id: str,
        ip_address: str | None = None,
    ) -> Clinic:
        old_values = {}
        new_values = {}
        field_map = {
            'cln_name': 'name',
            'cln_email': 'email',
            'cln_phone': 'phone',
            'cln_address': 'address',
        }

        for field, key in field_map.items():
            old_val = getattr(clinic, field)
            new_val = data.get(key)
            if new_val is not None and new_val != old_val:
                old_values[key] = str(old_val) if old_val is not None else None
                new_values[key] = str(new_val) if new_val is not None else None
                setattr(clinic, field, new_val)

        if new_values:
            clinic.save()
            _audit(
                user_id=user_id,
                action=AuditAction.UPDATE_CLINIC_PROFILE,
                module='CLINIC',
                table_name='CLINIC',
                record_id=str(clinic.cln_id),
                description=f'Clinic "{clinic.cln_name}" profile updated',
                old_values=old_values,
                new_values=new_values,
                ip_address=ip_address,
            )

        return clinic

    @staticmethod
    def get_settings(clinic: Clinic) -> ClinicSettings:
        settings_obj, _ = ClinicSettings.objects.get_or_create(
            cln_id=clinic,
            defaults={
                'cls_opening_time': '09:00',
                'cls_closing_time': '17:00',
                'cls_appointment_duration': 30,
                'cls_max_appointments_per_day': 50,
                'cls_allow_owner_booking': True,
                'cls_timezone': 'UTC',
            },
        )
        return settings_obj

    @staticmethod
    def update_settings(
        clinic: Clinic,
        data: dict,
        user_id: str,
        ip_address: str | None = None,
    ) -> ClinicSettings:
        settings_obj = ClinicProfileService.get_settings(clinic)

        old_values = {
            'opening_time': str(settings_obj.cls_opening_time),
            'closing_time': str(settings_obj.cls_closing_time),
            'appointment_duration': settings_obj.cls_appointment_duration,
            'max_appointments_per_day': settings_obj.cls_max_appointments_per_day,
            'allow_owner_booking': settings_obj.cls_allow_owner_booking,
        }

        field_map = {
            'opening_time': 'cls_opening_time',
            'closing_time': 'cls_closing_time',
            'appointment_duration': 'cls_appointment_duration',
            'max_appointments_per_day': 'cls_max_appointments_per_day',
            'allow_owner_booking': 'cls_allow_owner_booking',
        }

        new_values = {}
        for key, field in field_map.items():
            if key in data:
                new_values[key] = str(data[key]) if not isinstance(data[key], bool) else data[key]

        for key, field in field_map.items():
            if key in data:
                setattr(settings_obj, field, data[key])

        settings_obj.save()

        changed_keys = [k for k in new_values if new_values[k] != old_values.get(k)]
        if changed_keys:
            _audit(
                user_id=user_id,
                action=AuditAction.UPDATE_CLINIC_SETTINGS,
                module='CLINIC_SETTINGS',
                table_name='CLINIC_SETTINGS',
                record_id=str(settings_obj.cls_id),
                description=f'Clinic "{clinic.cln_name}" settings updated',
                old_values={k: old_values[k] for k in changed_keys},
                new_values={k: new_values[k] for k in changed_keys},
                ip_address=ip_address,
            )

        return settings_obj

    @staticmethod
    def upload_logo(
        clinic: Clinic,
        file,
        user_id: str,
        ip_address: str | None = None,
    ) -> Clinic:
        ext = os.path.splitext(file.name)[1].lower()
        filename = f'{clinic.cln_id}_{timezone.now().timestamp()}{ext}'
        relative_path = os.path.join(CLINIC_LOGO_DIR, filename)

        logo_dir = os.path.join(settings.MEDIA_ROOT, CLINIC_LOGO_DIR)
        os.makedirs(logo_dir, exist_ok=True)
        full_path = os.path.join(logo_dir, filename)

        with open(full_path, 'wb+') as dest:
            for chunk in file.chunks():
                dest.write(chunk)

        old_path = clinic.cln_logo_url
        if old_path:
            old_full = os.path.join(settings.MEDIA_ROOT, old_path)
            if os.path.exists(old_full):
                os.remove(old_full)

        clinic.cln_logo_url = relative_path
        clinic.save(update_fields=['cln_logo_url', 'cln_updated_at'])

        _audit(
            user_id=user_id,
            action=AuditAction.UPLOAD_LOGO,
            module='CLINIC',
            table_name='CLINIC',
            record_id=str(clinic.cln_id),
            description=f'Clinic "{clinic.cln_name}" logo uploaded',
            old_values={'logo_url': old_path},
            new_values={'logo_url': relative_path},
            ip_address=ip_address,
        )

        return clinic

    @staticmethod
    def get_operating_hours(clinic: Clinic):
        return list(
            ClinicOperatingHours.objects.filter(cln_id=clinic).order_by('day_index')
        )

    @staticmethod
    def update_operating_hours(
        clinic: Clinic,
        data: list,
        user_id: str,
        ip_address: str | None = None,
    ):
        incoming_days = [d['day_of_week'] for d in data]

        if len(data) != 7:
            raise ValueError('Exactly 7 days required.')
        if len(set(incoming_days)) != 7:
            raise ValueError('Duplicate days in payload.')
        if set(incoming_days) != VALID_DAYS:
            raise ValueError('Missing or invalid days in payload.')

        with transaction.atomic():
            for day_data in data:
                if day_data.get('is_closed', True):
                    day_data['opening_time'] = None
                    day_data['closing_time'] = None

                ClinicOperatingHours.objects.update_or_create(
                    cln_id=clinic,
                    day_of_week=day_data['day_of_week'],
                    defaults={
                        'day_index': day_data['day_index'],
                        'opening_time': day_data.get('opening_time'),
                        'closing_time': day_data.get('closing_time'),
                        'is_closed': day_data.get('is_closed', True),
                    },
                )

            _audit(
                user_id=user_id,
                action=AuditAction.UPDATE,
                module='CLINIC',
                table_name='CLINIC_OPERATING_HOURS',
                record_id=str(clinic.cln_id),
                description=f'Clinic "{clinic.cln_name}" operating hours updated',
                ip_address=ip_address,
            )

        return ClinicProfileService.get_operating_hours(clinic)

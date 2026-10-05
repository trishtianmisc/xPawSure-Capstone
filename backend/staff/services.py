import logging
import re
import secrets
from datetime import date, timedelta

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from audit_log.models import AuditAction
from audit_log.services import AuditService
from staff.tasks import send_staff_welcome_email
from clinics.models import Clinic
from users.models import StaffPosition, StaffProfile, User, UserRole

logger = logging.getLogger(__name__)

_PHONE_RE = re.compile(r'^\+63\d{10}$')
_NAME_RE = re.compile(r'^[A-Za-zÀ-ÿ\u00C0-\u024F]+([.\u0027\u2019 -][A-Za-zÀ-ÿ\u00C0-\u024F]+)*$')


def _normalize_name(value: str) -> str:
    value = value.strip()
    value = re.sub(r'\s+', ' ', value)
    if not _NAME_RE.match(value):
        raise ValueError(f'Invalid name format: {value}')
    return value


def normalize_phone(phone: str) -> str:
    digits = re.sub(r'\D', '', phone)
    if digits.startswith('0') and len(digits) == 11:
        return '+63' + digits[1:]
    if digits.startswith('63') and len(digits) == 12:
        return '+' + digits
    if digits.startswith('9') and len(digits) == 10:
        return '+63' + digits
    if phone.startswith('+63') and _PHONE_RE.match(phone):
        return phone
    raise ValueError(f'Invalid phone format: {phone}')


def _normalize_staff_data(data: dict) -> dict:
    data['email'] = data['email'].strip().lower()
    data['first_name'] = _normalize_name(data['first_name'])
    data['last_name'] = _normalize_name(data['last_name'])
    phone = (data.get('phone') or '').strip()
    if phone:
        data['phone'] = normalize_phone(phone)
    else:
        data['phone'] = ''
    if data.get('license_number'):
        data['license_number'] = data['license_number'].strip()
    return data


def _audit(**kwargs):
    try:
        AuditService.log(**kwargs)
    except Exception as e:
        logger.warning('Audit log failed (non-fatal): %s', e)


class StaffService:

    @staticmethod
    def create_staff(data: dict, clinic: Clinic, user_id: str | None = None, ip_address: str | None = None) -> dict:
        data = _normalize_staff_data(data)
        with transaction.atomic():
            temp_password = secrets.token_urlsafe(16)

            user = User(
                usr_email=data['email'],
                usr_role=data['role'],
                usr_first_name=data['first_name'],
                usr_last_name=data['last_name'],
                usr_phone=data.get('phone', ''),
                usr_must_change_password=True,
            )
            user.set_password(temp_password)
            user.save()

            position_map = {
                UserRole.VETERINARIAN: StaffPosition.VETERINARIAN,
                UserRole.RECEPTIONIST: StaffPosition.RECEPTIONIST,
            }

            staff = StaffProfile.objects.create(
                usr_id=user,
                cln_id=clinic,
                stf_position=position_map[data['role']],
                stf_license_number=data.get('license_number') or None,
                stf_license_expiration_date=data.get('license_expiration_date') or None,
            )

            if user_id:
                _audit(
                    user_id=user_id,
                    action=AuditAction.CREATE,
                    module='STAFF',
                    table_name='STAFF_PROFILE',
                    record_id=str(staff.stf_id),
                    description=f'{data["role"]} "{user.usr_first_name} {user.usr_last_name}" created',
                    new_values={
                        'email': data['email'],
                        'role': data['role'],
                        'position': position_map[data['role']],
                    },
                    ip_address=ip_address,
                )

        login_url = f'{settings.FRONTEND_URL}/login'
        transaction.on_commit(lambda: send_staff_welcome_email.delay(
            email=data['email'],
            first_name=data['first_name'],
            last_name=data['last_name'],
            role=data['role'],
            temp_password=temp_password,
            login_url=login_url,
            clinic_name=clinic.cln_name,
            support_email=settings.SUPPORT_EMAIL,
        ))

        return {
            'id': str(staff.stf_id),
            'user_id': str(user.usr_id),
            'email': data['email'],
            'role': data['role'],
            'first_name': data['first_name'],
            'last_name': data['last_name'],
            'temp_password': temp_password,
            'must_change_password': True,
            'license_number': staff.stf_license_number,
            'license_expiration_date': staff.stf_license_expiration_date,
        }

    @staticmethod
    def get_by_id(staff_id: str) -> StaffProfile:
        return StaffProfile.objects.select_related('usr_id', 'cln_id').get(usr_id__usr_id=staff_id, usr_id__usr_deleted_at__isnull=True)

    @staticmethod
    def update_staff(staff: StaffProfile, data: dict, user_id: str | None = None, ip_address: str | None = None) -> StaffProfile:
        with transaction.atomic():
            user = staff.usr_id
            changed_fields = []

            for field in ('first_name', 'last_name', 'phone'):
                api_key = field
                model_key = f'usr_{field}'
                if api_key in data:
                    old_val = getattr(user, model_key, None)
                    new_val = data[api_key]
                    if old_val != new_val:
                        setattr(user, model_key, new_val)
                        changed_fields.append(field)

            if changed_fields:
                user.save(update_fields=[f'usr_{f}' for f in changed_fields] + ['usr_updated_at'])

            staff_fields = []
            if 'license_number' in data:
                staff.stf_license_number = data['license_number'] or None
                staff_fields.append('stf_license_number')
            if 'license_expiration_date' in data:
                staff.stf_license_expiration_date = data['license_expiration_date'] or None
                staff_fields.append('stf_license_expiration_date')
            if staff_fields:
                staff_fields.append('stf_updated_at')
                staff.save(update_fields=staff_fields)

            if changed_fields:
                _audit(
                    user_id=user_id,
                    action=AuditAction.UPDATE,
                    module='STAFF',
                    table_name='STAFF_PROFILE',
                    record_id=str(staff.stf_id),
                    description=f'Staff member updated: {", ".join(changed_fields)}',
                    new_values={f: data[f] for f in changed_fields if f in data},
                    ip_address=ip_address,
                )
        return staff

    @staticmethod
    def deactivate_staff(staff: StaffProfile, user_id: str | None = None, ip_address: str | None = None) -> None:
        user = staff.usr_id
        user.usr_is_active = False
        user.save(update_fields=['usr_is_active', 'usr_updated_at'])
        _audit(
            user_id=user_id,
            action=AuditAction.UPDATE,
            module='STAFF',
            table_name='STAFF_PROFILE',
            record_id=str(staff.stf_id),
            description=f'Staff member deactivated: {user.usr_email}',
            new_values={'is_active': False},
            ip_address=ip_address,
        )

    @staticmethod
    def activate_staff(staff: StaffProfile, user_id: str | None = None, ip_address: str | None = None) -> None:
        user = staff.usr_id
        user.usr_is_active = True
        user.save(update_fields=['usr_is_active', 'usr_updated_at'])
        _audit(
            user_id=user_id,
            action=AuditAction.UPDATE,
            module='STAFF',
            table_name='STAFF_PROFILE',
            record_id=str(staff.stf_id),
            description=f'Staff member activated: {user.usr_email}',
            new_values={'is_active': True},
            ip_address=ip_address,
        )

    @staticmethod
    def resend_welcome(staff: StaffProfile, user_id: str | None = None, ip_address: str | None = None) -> None:
        temp_password = secrets.token_urlsafe(16)
        user = staff.usr_id
        user.set_password(temp_password)
        user.usr_must_change_password = True
        user.save(update_fields=['usr_password_hash', 'usr_must_change_password', 'usr_updated_at'])

        _audit(
            user_id=user_id,
            action=AuditAction.UPDATE,
            module='STAFF',
            table_name='STAFF_PROFILE',
            record_id=str(staff.stf_id),
            description=f'Welcome email resent: {user.usr_email}',
            ip_address=ip_address,
        )

        clinic = staff.cln_id
        login_url = f'{settings.FRONTEND_URL}/login'
        transaction.on_commit(lambda: send_staff_welcome_email.delay(
            email=user.usr_email,
            first_name=user.usr_first_name,
            last_name=user.usr_last_name,
            role=user.usr_role,
            temp_password=temp_password,
            login_url=login_url,
            clinic_name=clinic.cln_name,
            support_email=settings.SUPPORT_EMAIL,
        ))

    @staticmethod
    def reset_password(staff: StaffProfile, user_id: str | None = None, ip_address: str | None = None) -> dict:
        temp_password = secrets.token_urlsafe(16)
        user = staff.usr_id
        user.set_password(temp_password)
        user.usr_must_change_password = True
        user.save(update_fields=['usr_password_hash', 'usr_must_change_password', 'usr_updated_at'])

        _audit(
            user_id=user_id,
            action=AuditAction.UPDATE,
            module='STAFF',
            table_name='STAFF_PROFILE',
            record_id=str(staff.stf_id),
            description=f'Password reset for: {user.usr_email}',
            ip_address=ip_address,
        )

        clinic = staff.cln_id
        login_url = f'{settings.FRONTEND_URL}/login'
        transaction.on_commit(lambda: send_staff_welcome_email.delay(
            email=user.usr_email,
            first_name=user.usr_first_name,
            last_name=user.usr_last_name,
            role=user.usr_role,
            temp_password=temp_password,
            login_url=login_url,
            clinic_name=clinic.cln_name,
            support_email=settings.SUPPORT_EMAIL,
        ))
        return {'temp_password': temp_password}

    @staticmethod
    def get_stats(clinic_id: str) -> dict:
        from django.db.models import Q
        base = StaffProfile.objects.filter(
            cln_id=clinic_id,
            usr_id__usr_deleted_at__isnull=True,
        )

        now = timezone.now()
        expiry_cutoff = now + timedelta(days=90)

        return {
            'total': base.count(),
            'veterinarians': base.filter(usr_id__usr_role=UserRole.VETERINARIAN).count(),
            'receptionists': base.filter(usr_id__usr_role=UserRole.RECEPTIONIST).count(),
            'active': base.filter(usr_id__usr_is_active=True, usr_id__usr_must_change_password=False).count(),
            'pending_setup': base.filter(usr_id__usr_is_active=True, usr_id__usr_must_change_password=True).count(),
            'deactivated': base.filter(usr_id__usr_is_active=False).count(),
            'licenses_expiring_soon': base.filter(
                Q(stf_license_expiration_date__lte=expiry_cutoff.date())
                & Q(stf_license_expiration_date__gte=now.date())
            ).count(),
        }

    @staticmethod
    def list_staff(clinic_id: str, role: str | None = None, search: str = '', status: str | None = None, page: int = 1, page_size: int = 20) -> dict:
        queryset = StaffProfile.objects.filter(
            cln_id=clinic_id,
            usr_id__usr_deleted_at__isnull=True,
        ).select_related('usr_id', 'cln_id')

        if role:
            role = role.upper()
            if role in [UserRole.VETERINARIAN, UserRole.RECEPTIONIST]:
                queryset = queryset.filter(usr_id__usr_role=role)

        if status:
            status_upper = status.upper()
            if status_upper == 'ACTIVE':
                queryset = queryset.filter(usr_id__usr_is_active=True, usr_id__usr_must_change_password=False)
            elif status_upper == 'PENDING':
                queryset = queryset.filter(usr_id__usr_must_change_password=True)
            elif status_upper == 'DEACTIVATED':
                queryset = queryset.filter(usr_id__usr_is_active=False)

        if search:
            from django.db.models import Q
            queryset = queryset.filter(
                Q(usr_id__usr_first_name__icontains=search)
                | Q(usr_id__usr_last_name__icontains=search)
                | Q(usr_id__usr_email__icontains=search)
                | Q(stf_license_number__icontains=search)
            )

        queryset = queryset.order_by('usr_id__usr_first_name')

        total = queryset.count()
        page = max(page, 1)
        page_size = min(max(page_size, 1), 100)
        start = (page - 1) * page_size
        end = start + page_size
        results = queryset[start:end]

        return {
            'total': total,
            'page': page,
            'page_size': page_size,
            'total_pages': (total + page_size - 1) // page_size,
            'results': list(results),
        }

    @staticmethod
    def bulk_create_staff(
        rows: list[dict],
        clinic: Clinic,
        user_id: str | None = None,
        ip_address: str | None = None,
    ) -> dict:
        duplicates: set[str] = set()
        results = []
        errors = []

        for index, row in enumerate(rows, start=2):
            email = (row.get('email') or '').strip().lower()
            errors_for_row = []

            if not email:
                errors_for_row.append('Email is required.')
            elif User.objects.filter(usr_email__iexact=email).exists() or email in duplicates:
                errors_for_row.append('A user with this email already exists.')
            else:
                duplicates.add(email)

            role = (row.get('role') or '').strip().upper()
            if role not in [UserRole.VETERINARIAN, UserRole.RECEPTIONIST]:
                errors_for_row.append('Role must be VETERINARIAN or RECEPTIONIST.')

            if not (row.get('first_name') or '').strip():
                errors_for_row.append('First name is required.')
            if not (row.get('last_name') or '').strip():
                errors_for_row.append('Last name is required.')

            first_name = (row.get('first_name') or '').strip()
            last_name = (row.get('last_name') or '').strip()
            if first_name and not _NAME_RE.match(first_name):
                errors_for_row.append('First name contains invalid characters.')
            if last_name and not _NAME_RE.match(last_name):
                errors_for_row.append('Last name contains invalid characters.')

            phone_raw = (row.get('phone') or '').strip()
            if phone_raw:
                try:
                    normalize_phone(phone_raw)
                except ValueError:
                    errors_for_row.append('Phone must be a valid Philippine number (e.g. 09171234567 or +639171234567).')

            license_number = (row.get('license_number') or '').strip() or None
            license_expiration_date = (row.get('license_expiration_date') or '').strip() or None

            if role == UserRole.VETERINARIAN:
                if not license_number:
                    errors_for_row.append('License number is required for veterinarians.')
                if not license_expiration_date:
                    errors_for_row.append('License expiration date is required for veterinarians.')
                elif license_expiration_date:
                    try:
                        from datetime import datetime as _dt
                        parsed = _dt.strptime(license_expiration_date, '%Y-%m-%d').date()
                        if parsed < date.today():
                            errors_for_row.append('License expiration date cannot be in the past.')
                    except ValueError:
                        errors_for_row.append('License expiration date must be in YYYY-MM-DD format.')

            if license_number:
                if StaffProfile.objects.filter(
                    cln_id=clinic,
                    stf_license_number__iexact=license_number,
                    usr_id__usr_deleted_at__isnull=True,
                ).exists():
                    errors_for_row.append(f'License number "{license_number}" is already in use at this clinic.')

            if errors_for_row:
                errors.append({
                    'row': index,
                    'email': email,
                    'errors': '; '.join(errors_for_row),
                })
                continue

            try:
                staff_result = StaffService.create_staff(
                    data={
                        'email': email,
                        'first_name': (row.get('first_name') or '').strip(),
                        'last_name': (row.get('last_name') or '').strip(),
                        'phone': (row.get('phone') or '').strip() or '',
                        'role': role,
                        'license_number': license_number,
                        'license_expiration_date': license_expiration_date,
                    },
                    clinic=clinic,
                    user_id=user_id,
                    ip_address=ip_address,
                )
                results.append({
                    'id': staff_result['id'],
                    'email': email,
                    'first_name': (row.get('first_name') or '').strip(),
                    'last_name': (row.get('last_name') or '').strip(),
                    'role': role,
                })
            except Exception as e:
                logger.warning('Bulk upload row %s failed: %s', index, e)
                errors.append({
                    'row': index,
                    'email': email,
                    'errors': f'Failed to create staff member: {e}',
                })

        return {
            'total_rows': len(rows),
            'success_count': len(results),
            'fail_count': len(errors),
            'results': results,
            'errors': errors,
        }

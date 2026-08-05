import logging
import secrets

from django.conf import settings
from django.db import transaction

from audit_log.models import AuditAction
from audit_log.services import AuditService
from staff.tasks import send_staff_welcome_email
from clinics.models import Clinic
from users.models import StaffPosition, StaffProfile, User, UserRole

logger = logging.getLogger(__name__)


def _audit(**kwargs):
    try:
        AuditService.log(**kwargs)
    except Exception as e:
        logger.warning('Audit log failed (non-fatal): %s', e)


class StaffService:

    @staticmethod
    def create_staff(data: dict, clinic: Clinic, user_id: str | None = None, ip_address: str | None = None) -> dict:
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
        return StaffProfile.objects.select_related('usr_id', 'cln_id').get(stf_id=staff_id, usr_id__usr_deleted_at__isnull=True)

    @staticmethod
    def list_staff(clinic_id: str, role: str | None = None, search: str = '', page: int = 1, page_size: int = 20) -> dict:
        queryset = StaffProfile.objects.filter(
            cln_id=clinic_id,
            usr_id__usr_deleted_at__isnull=True,
        ).select_related('usr_id', 'cln_id')

        if role:
            role = role.upper()
            if role in [UserRole.VETERINARIAN, UserRole.RECEPTIONIST]:
                queryset = queryset.filter(usr_id__usr_role=role)

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

            license_number = (row.get('license_number') or '').strip() or None
            license_expiration_date = (row.get('license_expiration_date') or '').strip() or None

            if role == UserRole.VETERINARIAN:
                if not license_number:
                    errors_for_row.append('License number is required for veterinarians.')
                if not license_expiration_date:
                    errors_for_row.append('License expiration date is required for veterinarians.')

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

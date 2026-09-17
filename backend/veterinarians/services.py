import logging
import secrets

from django.conf import settings
from django.db import transaction

from audit_log.models import AuditAction
from audit_log.services import AuditService
from users.models import StaffProfile, StaffPosition, User, UserRole

from veterinarians.tasks import send_veterinarian_welcome_email

logger = logging.getLogger(__name__)


def _audit(**kwargs):
    try:
        AuditService.log(**kwargs)
    except Exception as e:
        logger.warning('Audit log failed (non-fatal): %s', e)


class VeterinarianService:

    @staticmethod
    @transaction.atomic
    def create_veterinarian(data: dict, clinic, user_id: str, ip_address: str | None = None) -> StaffProfile:
        temp_password = secrets.token_urlsafe(16)

        user = User(
            usr_email=data['email'],
            usr_role=UserRole.VETERINARIAN,
            usr_first_name=data['first_name'],
            usr_last_name=data['last_name'],
            usr_phone=data.get('phone', ''),
            usr_is_active=True,
            usr_must_change_password=True,
        )
        user.set_password(temp_password)
        user.save()

        staff = StaffProfile.objects.create(
            usr_id=user,
            cln_id=clinic,
            stf_position=StaffPosition.VETERINARIAN,
            stf_license_number=data.get('license_number'),
            stf_license_expiration_date=data.get('license_expiration_date'),
        )

        _audit(
            user_id=user_id,
            action=AuditAction.CREATE,
            module='VETERINARIANS',
            table_name='STAFF_PROFILE',
            record_id=str(staff.stf_id),
            description=f'Veterinarian "{user.usr_first_name} {user.usr_last_name}" created',
            new_values={
                'email': user.usr_email,
                'first_name': user.usr_first_name,
                'last_name': user.usr_last_name,
                'license_number': data.get('license_number'),
                'position': StaffPosition.VETERINARIAN,
            },
            ip_address=ip_address,
        )

        transaction.on_commit(lambda: send_veterinarian_welcome_email.delay(
            email=user.usr_email,
            first_name=user.usr_first_name,
            last_name=user.usr_last_name,
            clinic_name=clinic.cln_name,
            temp_password=temp_password,
            login_url=f'{settings.FRONTEND_URL}/login',
            support_email=settings.SUPPORT_EMAIL,
        ))

        staff._temp_password = temp_password
        return staff

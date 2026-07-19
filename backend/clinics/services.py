import logging
import secrets

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from audit_log.models import AuditAction
from audit_log.services import AuditService
from clinics.models import Clinic, ClinicStatus
from core.email_service import send_templated_email
from users.services import AuthService

logger = logging.getLogger(__name__)


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

        email_sent = False
        if clinic_email:
            login_url = f'{settings.FRONTEND_URL}/login'
            result = send_templated_email(
                subject=f'Welcome to XPawSure — {clinic_name}',
                to_email=clinic_email,
                template_name='emails/clinic_welcome.html',
                context={
                    'clinic_name': clinic_name,
                    'login_url': login_url,
                    'email': admin_email,
                    'temporary_password': temp_password,
                    'support_email': settings.SUPPORT_EMAIL,
                },
            )
            email_sent = result.success
            if not result.success:
                logger.warning(
                    'Clinic %s created but welcome email to %s failed: %s',
                    clinic.cln_id, clinic_email, result.error,
                )

        clinic._email_sent = email_sent
        clinic._temp_password = temp_password if not email_sent else None

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

import logging
import secrets
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.db.models import Count, Q, Sum
from django.db.models.functions import TruncMonth
from django.utils import timezone

from appointments.models import Appointment, AppointmentStatus
from audit_log.models import AuditAction, AuditLog
from audit_log.services import AuditService
from clinics.models import Clinic, ClinicStatus
from consultations.models import Consultation
from owners.models import OwnerProfile
from payments.models import Payment, PaymentStatus
from pets.models import Pet
from prescriptions.models import Prescription
from staff.services import normalize_phone
from staff.tasks import send_staff_welcome_email
from users.models import StaffPosition, StaffProfile, User, UserRole
from vaccinations.models import VaccinationRecord

logger = logging.getLogger(__name__)

GROWTH_MONTHS = 12


def _audit(**kwargs):
    try:
        AuditService.log(**kwargs)
    except Exception as e:
        logger.warning('Audit log failed (non-fatal): %s', e)


def _status_counts(queryset, field: str, choices) -> dict:
    """Map every choice to a count, filling gaps with zero."""
    rows = queryset.values(field).annotate(count=Count('pk'))
    counts = {row[field]: row['count'] for row in rows}
    return {choice.value: counts.get(choice.value, 0) for choice in choices}


def _monthly_series(queryset, date_field: str) -> list[dict]:
    """Entries per month for the last GROWTH_MONTHS months, zero-filled."""
    now = timezone.now()
    start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    for _ in range(GROWTH_MONTHS - 1):
        start = (start - timedelta(days=1)).replace(day=1)

    rows = (
        queryset.filter(**{f'{date_field}__gte': start})
        .annotate(month=TruncMonth(date_field))
        .values('month')
        .annotate(count=Count('pk'))
        .order_by('month')
    )
    by_month = {row['month'].strftime('%Y-%m'): row['count'] for row in rows if row['month']}

    series = []
    cursor = start
    for _ in range(GROWTH_MONTHS):
        key = cursor.strftime('%Y-%m')
        series.append({'month': key, 'count': by_month.get(key, 0)})
        cursor = (cursor.replace(day=28) + timedelta(days=4)).replace(day=1)
    return series


class PlatformAnalyticsService:
    """Cross-clinic read-only aggregates for the Super Admin dashboard."""

    @staticmethod
    def get_overview() -> dict:
        now = timezone.now()
        clinics = Clinic.objects.filter(cln_deleted_at__isnull=True)
        users = User.objects.filter(usr_deleted_at__isnull=True)
        pets = Pet.objects.filter(pet_deleted_at__isnull=True, pet_is_active=True)
        appointments = Appointment.objects.filter(apt_deleted_at__isnull=True)
        payments = Payment.objects.all()

        return {
            'generated_at': now.isoformat(),
            'clinics': {
                'total': clinics.count(),
                'by_status': _status_counts(clinics, 'cln_status', ClinicStatus),
            },
            'users': {
                'total': users.count(),
                'by_role': {
                    role.value: users.filter(usr_role=role.value).count()
                    for role in UserRole
                },
                'active': users.filter(usr_is_active=True).count(),
                'inactive': users.filter(usr_is_active=False).count(),
            },
            'owners': OwnerProfile.objects.count(),
            'pets': {
                'total': pets.count(),
            },
            'appointments': {
                'total': appointments.count(),
                'by_status': _status_counts(appointments, 'apt_status', AppointmentStatus),
            },
            'consultations': Consultation.objects.count(),
            'prescriptions': Prescription.objects.count(),
            'vaccinations': VaccinationRecord.objects.count(),
            'screenings': {
                'total': 0,
            },
            'payments': {
                'paid_amount': str(
                    payments.filter(pay_status=PaymentStatus.PAID).aggregate(t=Sum('pay_amount'))['t'] or 0
                ),
                'paid_count': payments.filter(pay_status=PaymentStatus.PAID).count(),
                'total_count': payments.count(),
            },
            'growth': {
                'clinics': _monthly_series(clinics, 'cln_created_at'),
                'users': _monthly_series(users, 'usr_created_at'),
                'pets': _monthly_series(Pet.objects.filter(pet_deleted_at__isnull=True), 'pet_created_at'),
                'appointments': _monthly_series(appointments, 'apt_created_at'),
            },
        }

    @staticmethod
    def get_clinic_overview(clinic: Clinic) -> dict:
        clinic_id = str(clinic.cln_id)
        staff = StaffProfile.objects.filter(
            cln_id=clinic_id,
            usr_id__usr_deleted_at__isnull=True,
        )
        appointments = Appointment.objects.filter(
            cln_id=clinic_id,
            apt_deleted_at__isnull=True,
        )
        pets = Pet.objects.filter(
            appointments__cln_id_id=clinic_id,
            appointments__apt_deleted_at__isnull=True,
            pet_deleted_at__isnull=True,
        ).distinct()
        owners = OwnerProfile.objects.filter(
            pets__appointments__cln_id_id=clinic_id,
            pets__appointments__apt_deleted_at__isnull=True,
        ).distinct()
        screenings = clinic_screenings(clinic_id)
        payments = Payment.objects.filter(cln_id=clinic_id)

        now = timezone.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        return {
            'clinic_id': clinic_id,
            'clinic_name': clinic.cln_name,
            'status': clinic.cln_status,
            'staff': {
                'total': staff.count(),
                'clinic_admins': staff.filter(stf_position=StaffPosition.CLINIC_ADMIN).count(),
                'veterinarians': staff.filter(stf_position=StaffPosition.VETERINARIAN).count(),
                'receptionists': staff.filter(stf_position=StaffPosition.RECEPTIONIST).count(),
                'active': staff.filter(usr_id__usr_is_active=True).count(),
                'inactive': staff.filter(usr_id__usr_is_active=False).count(),
            },
            'owners': owners.count(),
            'pets': pets.count(),
            'appointments': {
                'total': appointments.count(),
                'by_status': _status_counts(appointments, 'apt_status', AppointmentStatus),
                'this_month': appointments.filter(apt_created_at__gte=month_start).count(),
            },
            'consultations': Consultation.objects.filter(apt_id__cln_id=clinic_id).count(),
            'prescriptions': Prescription.objects.filter(con_id__apt_id__cln_id=clinic_id).count(),
            'vaccinations': VaccinationRecord.objects.filter(
                Q(con_id__apt_id__cln_id=clinic_id) | Q(stf_id__cln_id=clinic_id),
            ).distinct().count(),
            'screenings': screenings.count(),
            'payments': {
                'paid_amount': str(
                    payments.filter(pay_status=PaymentStatus.PAID).aggregate(t=Sum('pay_amount'))['t'] or 0
                ),
                'paid_count': payments.filter(pay_status=PaymentStatus.PAID).count(),
                'total_count': payments.count(),
            },
        }


def clinic_screenings(clinic_id: str):
    from ai_screenings.models import AiScreening
    return AiScreening.objects.filter(
        pet_id__appointments__cln_id_id=clinic_id,
        pet_id__appointments__apt_deleted_at__isnull=True,
    ).distinct()


class ClinicAdminService:
    """Super Admin management of a clinic's Clinic Admin accounts."""

    @staticmethod
    def list_admins(clinic_id: str) -> list[StaffProfile]:
        return list(
            StaffProfile.objects.filter(
                cln_id=clinic_id,
                stf_position=StaffPosition.CLINIC_ADMIN,
                usr_id__usr_deleted_at__isnull=True,
            )
            .select_related('usr_id', 'cln_id')
            .order_by('usr_id__usr_first_name')
        )

    @staticmethod
    def list_all_admins(
        clinic_id: str | None = None,
        search: str = '',
        status_filter: str = '',
        page: int = 1,
        page_size: int = 20,
    ) -> dict:
        queryset = StaffProfile.objects.filter(
            stf_position=StaffPosition.CLINIC_ADMIN,
            usr_id__usr_deleted_at__isnull=True,
        ).select_related('usr_id', 'cln_id')

        if clinic_id:
            queryset = queryset.filter(cln_id=clinic_id)

        if status_filter:
            upper = status_filter.upper()
            if upper == 'ACTIVE':
                queryset = queryset.filter(usr_id__usr_is_active=True)
            elif upper == 'DEACTIVATED':
                queryset = queryset.filter(usr_id__usr_is_active=False)
            elif upper == 'PENDING':
                queryset = queryset.filter(usr_id__usr_must_change_password=True)

        if search:
            queryset = queryset.filter(
                Q(usr_id__usr_first_name__icontains=search)
                | Q(usr_id__usr_last_name__icontains=search)
                | Q(usr_id__usr_email__icontains=search)
                | Q(cln_id__cln_name__icontains=search)
            )

        queryset = queryset.order_by('cln_id__cln_name', 'usr_id__usr_first_name')

        total = queryset.count()
        page = max(page, 1)
        page_size = min(max(page_size, 1), 100)
        start = (page - 1) * page_size

        from super_admin.serializers import ClinicAdminSerializer

        return {
            'total': total,
            'page': page,
            'page_size': page_size,
            'total_pages': (total + page_size - 1) // page_size,
            'results': ClinicAdminSerializer(queryset[start:start + page_size], many=True).data,
        }

    @staticmethod
    def create_admin(
        clinic: Clinic,
        email: str,
        first_name: str,
        last_name: str,
        phone: str = '',
        user_id: str | None = None,
        ip_address: str | None = None,
    ) -> dict:
        email = email.strip().lower()
        if User.objects.filter(usr_email__iexact=email).exists():
            raise ValueError('A user with this email already exists.')

        phone = normalize_phone(phone) if phone else ''

        temp_password = secrets.token_urlsafe(16)

        with transaction.atomic():
            user = User(
                usr_email=email,
                usr_role=UserRole.CLINIC_ADMIN,
                usr_first_name=first_name,
                usr_last_name=last_name,
                usr_phone=phone,
                usr_must_change_password=True,
            )
            user.set_password(temp_password)
            user.save()

            staff = StaffProfile.objects.create(
                usr_id=user,
                cln_id=clinic,
                stf_position=StaffPosition.CLINIC_ADMIN,
            )

            _audit(
                user_id=user_id,
                action=AuditAction.CREATE,
                module='CLINIC',
                table_name='STAFF_PROFILE',
                record_id=str(staff.stf_id),
                description=f'Clinic Admin "{first_name} {last_name}" created for {clinic.cln_name}',
                new_values={'email': email, 'role': UserRole.CLINIC_ADMIN, 'clinic': clinic.cln_name},
                ip_address=ip_address,
            )

        login_url = f'{settings.FRONTEND_URL}/login'
        transaction.on_commit(lambda: send_staff_welcome_email(
            email=email,
            first_name=first_name,
            last_name=last_name,
            role=UserRole.CLINIC_ADMIN,
            temp_password=temp_password,
            login_url=login_url,
            clinic_name=clinic.cln_name,
            support_email=settings.SUPPORT_EMAIL,
        ))

        return {
            'user_id': str(user.usr_id),
            'staff_id': str(staff.stf_id),
            'email': email,
            'first_name': first_name,
            'last_name': last_name,
            'phone': phone,
            'temp_password': temp_password,
            'must_change_password': True,
        }

    @staticmethod
    def get_admin_user(admin_user_id: str) -> User:
        return User.objects.select_related('staffprofile').get(
            usr_id=admin_user_id,
            usr_role=UserRole.CLINIC_ADMIN,
            usr_deleted_at__isnull=True,
        )

    @staticmethod
    def resend_credentials(
        admin_user: User,
        actor_user_id: str | None = None,
        ip_address: str | None = None,
    ) -> dict:
        temp_password = secrets.token_urlsafe(16)

        with transaction.atomic():
            admin_user.set_password(temp_password)
            admin_user.usr_must_change_password = True
            # Rotate the token version so any active session is invalidated.
            admin_user.usr_token_version += 1
            admin_user.save(update_fields=[
                'usr_password_hash', 'usr_must_change_password',
                'usr_token_version', 'usr_updated_at',
            ])

            _audit(
                user_id=actor_user_id,
                action=AuditAction.PASSWORD_RESET,
                module='CLINIC',
                table_name='USER',
                record_id=str(admin_user.usr_id),
                description=f'Credentials resent to Clinic Admin: {admin_user.usr_email}',
                ip_address=ip_address,
            )

        clinic = admin_user.staffprofile.cln_id
        login_url = f'{settings.FRONTEND_URL}/login'
        transaction.on_commit(lambda: send_staff_welcome_email(
            email=admin_user.usr_email,
            first_name=admin_user.usr_first_name,
            last_name=admin_user.usr_last_name,
            role=UserRole.CLINIC_ADMIN,
            temp_password=temp_password,
            login_url=login_url,
            clinic_name=clinic.cln_name,
            support_email=settings.SUPPORT_EMAIL,
        ))

        return {'email_sent': clinic.cln_email is not None}

    @staticmethod
    def deactivate(
        admin_user: User,
        actor_user_id: str | None = None,
        ip_address: str | None = None,
    ) -> None:
        with transaction.atomic():
            admin_user.usr_is_active = False
            admin_user.usr_token_version += 1
            admin_user.save(update_fields=['usr_is_active', 'usr_token_version', 'usr_updated_at'])

            _audit(
                user_id=actor_user_id,
                action=AuditAction.UPDATE,
                module='CLINIC',
                table_name='USER',
                record_id=str(admin_user.usr_id),
                description=f'Clinic Admin deactivated: {admin_user.usr_email}',
                new_values={'is_active': False},
                ip_address=ip_address,
            )

    @staticmethod
    def activate(
        admin_user: User,
        actor_user_id: str | None = None,
        ip_address: str | None = None,
    ) -> None:
        with transaction.atomic():
            admin_user.usr_is_active = True
            admin_user.save(update_fields=['usr_is_active', 'usr_updated_at'])

            _audit(
                user_id=actor_user_id,
                action=AuditAction.UPDATE,
                module='CLINIC',
                table_name='USER',
                record_id=str(admin_user.usr_id),
                description=f'Clinic Admin activated: {admin_user.usr_email}',
                new_values={'is_active': True},
                ip_address=ip_address,
            )


class CrossClinicReadService:
    """Read-only cross-clinic listings. No write operations by design."""

    @staticmethod
    def list_owners(clinic_id: str, search: str = '', page: int = 1, page_size: int = 20) -> dict:
        queryset = OwnerProfile.objects.filter(
            pets__appointments__cln_id_id=clinic_id,
            pets__appointments__apt_deleted_at__isnull=True,
        ).select_related('usr_id').distinct()

        if search:
            queryset = queryset.filter(
                Q(usr_id__usr_first_name__icontains=search)
                | Q(usr_id__usr_last_name__icontains=search)
                | Q(usr_id__usr_email__icontains=search)
            )

        queryset = queryset.order_by('usr_id__usr_first_name')
        return _paginate(queryset, page, page_size, serializer='owner')

    @staticmethod
    def list_pets(clinic_id: str, search: str = '', page: int = 1, page_size: int = 20) -> dict:
        queryset = Pet.objects.filter(
            appointments__cln_id_id=clinic_id,
            appointments__apt_deleted_at__isnull=True,
            pet_deleted_at__isnull=True,
        ).select_related('own_id__usr_id', 'brd_id').distinct()

        if search:
            queryset = queryset.filter(
                Q(pet_name__icontains=search)
                | Q(own_id__usr_id__usr_first_name__icontains=search)
                | Q(own_id__usr_id__usr_last_name__icontains=search)
            )

        queryset = queryset.order_by('-pet_created_at')
        return _paginate(queryset, page, page_size, serializer='pet')

    @staticmethod
    def list_appointments(
        clinic_id: str,
        status: str = '',
        page: int = 1,
        page_size: int = 20,
    ) -> dict:
        queryset = Appointment.objects.filter(
            cln_id=clinic_id,
            apt_deleted_at__isnull=True,
        ).select_related('pet_id__own_id__usr_id', 'stf_id__usr_id')

        if status:
            queryset = queryset.filter(apt_status=status.upper())

        queryset = queryset.order_by('-apt_scheduled_at')
        return _paginate(queryset, page, page_size, serializer='appointment')


class CrossClinicAuditService:
    """Cross-clinic audit log listing for the Super Admin."""

    @staticmethod
    def list_logs(
        clinic_id: str | None = None,
        module: str = '',
        action: str = '',
        search: str = '',
        date_from=None,
        date_to=None,
        page: int = 1,
        page_size: int = 20,
    ) -> dict:
        queryset = AuditLog.objects.all()

        if clinic_id:
            clinic_user_ids = StaffProfile.objects.filter(cln_id=clinic_id).values_list('usr_id', flat=True)
            queryset = queryset.filter(usr_id__in=clinic_user_ids)

        if module:
            queryset = queryset.filter(adl_module__iexact=module.strip())

        if action:
            queryset = queryset.filter(adl_action__iexact=action.strip())

        if search:
            queryset = queryset.filter(
                Q(adl_description__icontains=search)
                | Q(adl_table_name__icontains=search)
            )

        if date_from:
            queryset = queryset.filter(adl_created_at__gte=date_from)
        if date_to:
            queryset = queryset.filter(adl_created_at__lte=date_to)

        queryset = queryset.order_by('-adl_created_at')
        return _paginate(queryset, page, page_size, serializer='audit')


def _paginate(queryset, page: int, page_size: int, serializer: str) -> dict:
    from super_admin.serializers import (
        AppointmentListSerializer,
        AuditLogListSerializer,
        OwnerListSerializer,
        PetListSerializer,
    )

    serializers = {
        'audit': AuditLogListSerializer,
        'owner': OwnerListSerializer,
        'pet': PetListSerializer,
        'appointment': AppointmentListSerializer,
    }

    total = queryset.count()
    page = max(page, 1)
    page_size = min(max(page_size, 1), 100)
    start = (page - 1) * page_size
    results = queryset[start:start + page_size]

    return {
        'total': total,
        'page': page,
        'page_size': page_size,
        'total_pages': (total + page_size - 1) // page_size,
        'results': serializers[serializer](results, many=True).data,
    }

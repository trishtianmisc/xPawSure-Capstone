import logging
import secrets
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.db.models import Count, Q, Sum
from django.db.models.functions import Lower, TruncMonth, Trim
from django.utils import timezone

from ai_screenings.models import AiScreening, DiseaseSeverity
from appointments.models import Appointment, AppointmentStatus
from audit_log.models import AuditAction, AuditLog
from audit_log.services import AuditService
from clinics.models import Clinic, ClinicStatus
from consultations.models import Consultation
from owners.models import OwnerProfile
from owners.services import OwnerProfileService
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
        .annotate(count=Count('pk', distinct=True))
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
            clinic_id=clinic.cln_id,
            staff_user_id=user.usr_id,
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
            clinic_id=clinic.cln_id,
            staff_user_id=admin_user.usr_id,
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
        SuperAdminOwnerListSerializer,
        VaccinationListSerializer,
    )

    serializers = {
        'audit': AuditLogListSerializer,
        'owner': OwnerListSerializer,
        'pet': PetListSerializer,
        'appointment': AppointmentListSerializer,
        'owner_sa': SuperAdminOwnerListSerializer,
        'vaccination': VaccinationListSerializer,
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


class SuperAdminOwnerService:
    """Cross-clinic pet owner contact management for the Super Admin.

    Owners have no clinic FK; they are linked to clinics through their pets'
    appointments. Every write is audit-logged because it can affect multiple
    clinics at once.
    """

    @staticmethod
    def list_owners(clinic_id: str | None = None, search: str = '', page: int = 1, page_size: int = 20) -> dict:
        queryset = OwnerProfile.objects.select_related('usr_id')

        if clinic_id:
            queryset = queryset.filter(
                pets__appointments__cln_id_id=clinic_id,
                pets__appointments__apt_deleted_at__isnull=True,
            ).distinct()

        if search:
            queryset = queryset.filter(
                Q(usr_id__usr_first_name__icontains=search)
                | Q(usr_id__usr_last_name__icontains=search)
                | Q(usr_id__usr_email__icontains=search)
                | Q(usr_id__usr_phone__icontains=search)
            )

        queryset = queryset.order_by('usr_id__usr_first_name', 'usr_id__usr_last_name')
        return _paginate(queryset, page, page_size, serializer='owner_sa')

    @staticmethod
    def get_owner(own_id) -> OwnerProfile | None:
        try:
            return OwnerProfile.objects.select_related('usr_id').get(own_id=own_id)
        except OwnerProfile.DoesNotExist:
            return None

    @staticmethod
    def linked_clinics(owner: OwnerProfile) -> list[Clinic]:
        clinic_ids = (
            Appointment.objects.filter(pet_id__own_id=owner, apt_deleted_at__isnull=True)
            .values_list('cln_id_id', flat=True)
            .distinct()
        )
        return list(
            Clinic.objects.filter(cln_id__in=clinic_ids, cln_deleted_at__isnull=True)
            .order_by('cln_name')
        )

    @staticmethod
    def pet_count(owner: OwnerProfile) -> int:
        return owner.pets.filter(pet_is_active=True, pet_deleted_at__isnull=True).count()

    @staticmethod
    @transaction.atomic
    def update_contact(
        owner: OwnerProfile,
        data: dict,
        user_id: str | None = None,
        ip_address: str | None = None,
    ) -> OwnerProfile:
        """Update owner contact info only (name/phone on User, address on profile).

        Email and role are deliberately not editable here: the email is the
        login identity and the role is fixed at registration.
        """
        user = owner.usr_id
        old_phone = user.usr_phone
        old_values = {
            'first_name': user.usr_first_name,
            'last_name': user.usr_last_name,
            'phone': user.usr_phone,
            'address': owner.own_address,
        }

        user.usr_first_name = data['first_name']
        user.usr_last_name = data['last_name']
        if 'phone' in data:
            user.usr_phone = data['phone'] or None
        user.save(update_fields=['usr_first_name', 'usr_last_name', 'usr_phone', 'usr_updated_at'])

        if 'address' in data:
            owner.own_address = data['address'] or None
            owner.save(update_fields=['own_address', 'own_updated_at'])

        new_values = {
            'first_name': user.usr_first_name,
            'last_name': user.usr_last_name,
            'phone': user.usr_phone,
            'address': owner.own_address,
        }
        _audit(
            user_id=user_id,
            action=AuditAction.UPDATE,
            module='owners',
            table_name='OWNER_PROFILE',
            record_id=str(owner.own_id),
            description=f'Owner contact updated: {user.usr_email}',
            old_values=old_values,
            new_values=new_values,
            ip_address=ip_address,
        )

        if old_phone != user.usr_phone:
            OwnerProfileService.revoke_public_phone_consent(
                owner,
                user_id=user_id or '',
                ip_address=ip_address or '',
            )
        return owner


class VaccinationReadService:
    """Read-only cross-clinic vaccination listing. No writes by design —
    vaccination records are medical history and stay immutable."""

    @staticmethod
    def list_vaccinations(
        clinic_id: str | None = None,
        search: str = '',
        date_from=None,
        date_to=None,
        page: int = 1,
        page_size: int = 20,
    ) -> dict:
        queryset = VaccinationRecord.objects.select_related(
            'pet_id__own_id__usr_id', 'stf_id__usr_id', 'con_id',
        )

        if clinic_id:
            queryset = queryset.filter(
                Q(stf_id__cln_id=clinic_id)
                | Q(con_id__apt_id__cln_id=clinic_id)
                | Q(pet_id__appointments__cln_id_id=clinic_id),
            ).distinct()

        if search:
            queryset = queryset.filter(
                Q(vac_name__icontains=search)
                | Q(pet_id__pet_name__icontains=search)
                | Q(pet_id__own_id__usr_id__usr_first_name__icontains=search)
                | Q(pet_id__own_id__usr_id__usr_last_name__icontains=search)
            )

        if date_from:
            queryset = queryset.filter(vac_date_given__gte=date_from)
        if date_to:
            queryset = queryset.filter(vac_date_given__lte=date_to)

        queryset = queryset.order_by('-vac_date_given', '-vac_created_at')
        return _paginate(queryset, page, page_size, serializer='vaccination')


def _pct(correct: int, compared: int) -> float | None:
    if compared <= 0:
        return None
    return round(correct * 100.0 / compared, 1)


class AccuracyReportService:
    """Preliminary accuracy of the on-device classifier vs. the veterinarian's
    confirmed diagnosis.

    Aggregates `ais_is_correct`, which the consultations post_save signal
    records after each consultation via `record_comparison`. This is
    historical, after-the-fact analytics only — it never fuses the classifier
    and Claude review outputs, and agreement is not treated as confirmation.
    """

    @staticmethod
    def get_report(
        clinic_id: str | None = None,
        model_version: str = '',
        date_from=None,
        date_to=None,
    ) -> dict:
        queryset = AiScreening.objects.all()

        if clinic_id:
            queryset = queryset.filter(
                pet_id__appointments__cln_id_id=clinic_id,
                pet_id__appointments__apt_deleted_at__isnull=True,
            )
        if model_version:
            queryset = queryset.filter(ais_model_version__iexact=model_version.strip())
        if date_from:
            queryset = queryset.filter(ais_created_at__gte=date_from)
        if date_to:
            queryset = queryset.filter(ais_created_at__lte=date_to)

        compared_qs = queryset.filter(ais_compared_at__isnull=False)

        total = queryset.distinct().count()
        compared = compared_qs.distinct().count()
        correct = compared_qs.filter(ais_is_correct=True).distinct().count()

        def grouped(keys: list[str], rename: dict[str, str]) -> list[dict]:
            rows = (
                compared_qs.values(*keys)
                .annotate(
                    compared=Count('ais_id', distinct=True),
                    correct=Count('ais_id', filter=Q(ais_is_correct=True), distinct=True),
                )
                .order_by(*keys)
            )
            out = []
            for row in rows:
                item = {rename.get(key, key): value for key, value in row.items()}
                item['accuracy_percent'] = _pct(item['correct'], item['compared'])
                out.append(item)
            return out

        by_model_version = grouped(
            ['ais_model_version'], {'ais_model_version': 'model_version'},
        )
        by_disease = grouped(
            ['dis_id__dis_name'], {'dis_id__dis_name': 'disease'},
        )

        by_clinic = []
        clinic_rows = (
            compared_qs.values('pet_id__appointments__cln_id_id')
            .annotate(
                compared=Count('ais_id', distinct=True),
                correct=Count('ais_id', filter=Q(ais_is_correct=True), distinct=True),
            )
        )
        clinic_names = {
            str(clin.cln_id): clin.cln_name
            for clin in Clinic.objects.filter(cln_deleted_at__isnull=True)
        }
        for row in clinic_rows:
            clinic_pk = row.get('pet_id__appointments__cln_id_id')
            if clinic_pk is None:
                continue
            by_clinic.append({
                'clinic_id': str(clinic_pk),
                'clinic_name': clinic_names.get(str(clinic_pk), 'Unknown clinic'),
                'compared': row['compared'],
                'correct': row['correct'],
                'accuracy_percent': _pct(row['correct'], row['compared']),
            })
        by_clinic.sort(key=lambda r: (-r['compared'], r['clinic_name']))

        trend = _monthly_series(compared_qs, 'ais_compared_at')
        trend_counts = {
            row['month'].strftime('%Y-%m'): row
            for row in (
                compared_qs.annotate(month=TruncMonth('ais_compared_at'))
                .values('month')
                .annotate(
                    compared=Count('ais_id', distinct=True),
                    correct=Count('ais_id', filter=Q(ais_is_correct=True), distinct=True),
                )
            )
            if row['month']
        }
        trend_out = []
        for point in trend:
            counts = trend_counts.get(point['month'], {'compared': 0, 'correct': 0})
            trend_out.append({
                'month': point['month'],
                'compared': counts['compared'],
                'correct': counts['correct'],
            })

        # Meta.ordering would otherwise add AIS_CREATED_AT to the
        # SELECT DISTINCT, defeating deduplication.
        model_versions = sorted(
            queryset.order_by().values_list('ais_model_version', flat=True).distinct()
        )

        return {
            'generated_at': timezone.now().isoformat(),
            'filters': {
                'clinic_id': str(clinic_id) if clinic_id else None,
                'model_version': model_version or None,
                'date_from': date_from.isoformat() if date_from else None,
                'date_to': date_to.isoformat() if date_to else None,
            },
            'summary': {
                'total_screenings': total,
                'compared': compared,
                'correct': correct,
                'incorrect': compared - correct,
                'awaiting_comparison': max(total - compared, 0),
                'accuracy_percent': _pct(correct, compared),
            },
            'model_versions': model_versions,
            'by_model_version': by_model_version,
            'by_disease': by_disease,
            'by_clinic': by_clinic,
            'trend': trend_out,
        }


class DiseaseReportService:
    """Cross-clinic disease distribution: AI screening predictions (structured
    FK with severity) plus confirmed diagnoses from consultations (free text,
    grouped case-insensitively)."""

    @staticmethod
    def get_report(clinic_id: str | None = None, date_from=None, date_to=None) -> dict:
        screenings = AiScreening.objects.all()
        consultations = Consultation.objects.filter(
            con_specific_disease__isnull=False,
        ).exclude(con_specific_disease='')

        if clinic_id:
            screenings = screenings.filter(
                pet_id__appointments__cln_id_id=clinic_id,
                pet_id__appointments__apt_deleted_at__isnull=True,
            )
            consultations = consultations.filter(apt_id__cln_id=clinic_id)

        if date_from:
            screenings = screenings.filter(ais_created_at__gte=date_from)
            consultations = consultations.filter(con_created_at__gte=date_from)
        if date_to:
            screenings = screenings.filter(ais_created_at__lte=date_to)
            consultations = consultations.filter(con_created_at__lte=date_to)

        screenings_by_disease = [
            {
                'disease': row['dis_id__dis_name'],
                'severity': row['dis_id__dis_severity'],
                'count': row['count'],
            }
            for row in (
                screenings.values('dis_id__dis_name', 'dis_id__dis_severity')
                .annotate(count=Count('ais_id', distinct=True))
                .order_by('-count', 'dis_id__dis_name')
            )
        ]

        confirmed_by_disease = [
            {'disease': row['disease_key'], 'count': row['count']}
            for row in (
                consultations.annotate(disease_key=Lower(Trim('con_specific_disease')))
                .values('disease_key')
                .annotate(count=Count('con_id', distinct=True))
                .order_by('-count', 'disease_key')[:20]
            )
        ]

        severity_breakdown = {
            severity.value: 0 for severity in DiseaseSeverity
        }
        for row in (
            screenings.values('dis_id__dis_severity')
            .annotate(count=Count('ais_id', distinct=True))
        ):
            severity_breakdown[row['dis_id__dis_severity']] = row['count']

        trend = _monthly_series(screenings, 'ais_created_at')

        return {
            'generated_at': timezone.now().isoformat(),
            'filters': {
                'clinic_id': str(clinic_id) if clinic_id else None,
                'date_from': date_from.isoformat() if date_from else None,
                'date_to': date_to.isoformat() if date_to else None,
            },
            'totals': {
                'screenings': screenings.distinct().count(),
                'confirmed_diagnoses': consultations.distinct().count(),
            },
            'screenings_by_disease': screenings_by_disease,
            'confirmed_by_disease': confirmed_by_disease,
            'severity_breakdown': severity_breakdown,
            'trend': trend,
        }

import uuid
from datetime import datetime, timedelta

from django.db.models import (
    Count,
    DateTimeField,
    Exists,
    F,
    IntegerField,
    Max,
    Min,
    OuterRef,
    Prefetch,
    Q,
    Subquery,
    Value,
)
from django.db.models.functions import Coalesce, Lower
from django.utils import timezone

from ai_screenings.models import AiScreening
from appointments.models import Appointment, AppointmentStatus
from appointments.services import (
    NON_PATIENT_APPOINTMENT_STATUSES,
    filter_clinic_patients,
    get_clinic_timezone,
)
from consultations.models import Consultation
from pets.models import Pet
from pets.services.public_pet_service import DUE_SOON_DAYS
from vaccinations.models import VaccinationRecord

UPCOMING_APPOINTMENT_STATUSES = (
    AppointmentStatus.PENDING,
    AppointmentStatus.CONFIRMED,
)

VACCINATION_STATUS_VALUES = {
    'up_to_date',
    'due_soon',
    'overdue',
    'none_recorded',
}


class InvalidPatientFilterError(ValueError):
    pass


class ClinicAdminPatientService:

    @staticmethod
    def _appointment_count_annotation(clinic_id, statuses=None):
        queryset = Appointment.objects.filter(
            cln_id_id=clinic_id,
            apt_deleted_at__isnull=True,
        )
        if statuses is not None:
            queryset = queryset.filter(apt_status__in=statuses)

        count_subquery = queryset.filter(
            pet_id=OuterRef('pk'),
        ).values('pet_id').annotate(
            total=Count('apt_id'),
        ).values('total')[:1]

        return Coalesce(
            Subquery(count_subquery, output_field=IntegerField()),
            Value(0),
        )

    @staticmethod
    def _last_visit_annotation(clinic_id, now):
        latest = Appointment.objects.filter(
            pet_id=OuterRef('pk'),
            cln_id_id=clinic_id,
            apt_deleted_at__isnull=True,
            apt_scheduled_at__lt=now,
        ).exclude(
            apt_status__in=NON_PATIENT_APPOINTMENT_STATUSES,
        ).values('pet_id').annotate(
            value=Max('apt_scheduled_at'),
        ).values('value')[:1]

        return Subquery(latest, output_field=DateTimeField())

    @staticmethod
    def _next_appointment_annotation(clinic_id, now):
        upcoming = Appointment.objects.filter(
            pet_id=OuterRef('pk'),
            cln_id_id=clinic_id,
            apt_deleted_at__isnull=True,
            apt_status__in=UPCOMING_APPOINTMENT_STATUSES,
            apt_scheduled_at__gte=now,
        ).values('pet_id').annotate(
            value=Min('apt_scheduled_at'),
        ).values('value')[:1]

        return Subquery(upcoming, output_field=DateTimeField())

    @staticmethod
    def _base_queryset(clinic_id):
        return filter_clinic_patients(
            Pet.objects.filter(
                pet_is_active=True,
                pet_deleted_at__isnull=True,
            ),
            clinic_id,
        )

    @staticmethod
    def _parse_page(value, default, maximum=None):
        try:
            parsed = int(value)
        except (TypeError, ValueError):
            parsed = default
        parsed = max(parsed, 1)
        if maximum is not None:
            parsed = min(parsed, maximum)
        return parsed

    @staticmethod
    def _apply_ordering(queryset, sort, order):
        descending = order == 'desc'

        if sort == 'last_visit':
            primary = F('last_visit_at')
        elif sort == 'no_shows':
            primary = F('no_show_count')
        else:
            primary = Lower('pet_name')

        if descending:
            primary = primary.desc(nulls_last=True)
        elif sort == 'last_visit':
            primary = primary.asc(nulls_last=True)

        return queryset.order_by(primary, Lower('pet_name'), 'pet_id')

    @staticmethod
    def list_patients(
        clinic_id,
        search=None,
        breed=None,
        vaccination_status=None,
        has_no_shows=False,
        sort='name',
        order='asc',
        page=1,
        page_size=20,
    ):
        now = timezone.now()
        tz = get_clinic_timezone(clinic_id)
        today = datetime.now(tz).date()

        base = ClinicAdminPatientService._base_queryset(clinic_id)
        total_patients = base.count()

        vaccinations = VaccinationRecord.objects.filter(
            pet_id=OuterRef('pk'),
        )
        has_any_vaccination = Exists(vaccinations)
        has_overdue = Exists(vaccinations.filter(vac_next_due__lt=today))
        has_due_soon = Exists(vaccinations.filter(
            vac_next_due__gte=today,
            vac_next_due__lte=today + timedelta(days=DUE_SOON_DAYS),
        ))

        queryset = base.annotate(
            total_appointments=ClinicAdminPatientService._appointment_count_annotation(
                clinic_id,
            ),
            no_show_count=ClinicAdminPatientService._appointment_count_annotation(
                clinic_id,
                (AppointmentStatus.NO_SHOW,),
            ),
            cancelled_count=ClinicAdminPatientService._appointment_count_annotation(
                clinic_id,
                (AppointmentStatus.CANCELLED,),
            ),
            last_visit_at=ClinicAdminPatientService._last_visit_annotation(
                clinic_id, now,
            ),
            next_appointment_at=ClinicAdminPatientService._next_appointment_annotation(
                clinic_id, now,
            ),
            has_any_vaccination=has_any_vaccination,
            has_overdue_vaccination=has_overdue,
            has_due_soon_vaccination=has_due_soon,
        )

        has_filters = False
        search = (search or '').strip()
        if search:
            has_filters = True
            queryset = queryset.filter(
                Q(pet_name__icontains=search)
                | Q(own_id__usr_id__usr_first_name__icontains=search)
                | Q(own_id__usr_id__usr_last_name__icontains=search)
                | Q(own_id__usr_id__usr_phone__icontains=search)
                | Q(own_id__usr_id__usr_email__icontains=search)
            )

        if breed:
            has_filters = True
            try:
                breed_id = uuid.UUID(str(breed))
            except (AttributeError, TypeError, ValueError) as exc:
                raise InvalidPatientFilterError(
                    "Invalid 'breed'; expected a UUID.",
                ) from exc
            queryset = queryset.filter(brd_id_id=breed_id)

        if vaccination_status:
            has_filters = True
            if vaccination_status not in VACCINATION_STATUS_VALUES:
                raise InvalidPatientFilterError(
                    "Invalid 'vaccination_status'.",
                )
            if vaccination_status == 'overdue':
                queryset = queryset.filter(has_overdue_vaccination=True)
            elif vaccination_status == 'due_soon':
                queryset = queryset.filter(
                    has_overdue_vaccination=False,
                    has_due_soon_vaccination=True,
                )
            elif vaccination_status == 'up_to_date':
                queryset = queryset.filter(
                    has_any_vaccination=True,
                    has_overdue_vaccination=False,
                    has_due_soon_vaccination=False,
                )
            else:
                queryset = queryset.filter(has_any_vaccination=False)

        if has_no_shows:
            has_filters = True
            queryset = queryset.filter(no_show_count__gt=0)

        queryset = ClinicAdminPatientService._apply_ordering(
            queryset, sort, order,
        )

        if has_filters:
            total = queryset.count()
        else:
            total = total_patients

        page = ClinicAdminPatientService._parse_page(page, 1)
        page_size = ClinicAdminPatientService._parse_page(
            page_size, 20, maximum=100,
        )
        start = (page - 1) * page_size
        results = queryset.select_related(
            'own_id__usr_id', 'brd_id',
        ).prefetch_related(
            Prefetch(
                'vaccinations',
                queryset=VaccinationRecord.objects.only(
                    'vac_id', 'pet_id', 'vac_name', 'vac_date_given', 'vac_next_due',
                ).order_by('-vac_date_given', '-vac_created_at'),
                to_attr='admin_vaccinations',
            ),
        )[start:start + page_size]

        return {
            'total': total,
            'total_patients': total_patients,
            'page': page,
            'page_size': page_size,
            'total_pages': (total + page_size - 1) // page_size,
            'results': list(results),
            'today': today,
            'timezone': tz,
        }

    @staticmethod
    def get_patient_detail(pet_id, clinic_id):
        tz = get_clinic_timezone(clinic_id)
        today = datetime.now(tz).date()

        try:
            pet = ClinicAdminPatientService._base_queryset(
                clinic_id,
            ).select_related(
                'own_id__usr_id', 'brd_id',
            ).get(
                pet_id=pet_id,
            )
        except Pet.DoesNotExist:
            return None

        vaccinations = list(
            VaccinationRecord.objects.filter(
                pet_id=pet,
            ).only(
                'vac_id', 'pet_id', 'vac_name', 'vac_date_given', 'vac_next_due',
            ).order_by('-vac_date_given', '-vac_created_at')
        )

        appointments = list(
            Appointment.objects.filter(
                pet_id=pet,
                cln_id_id=clinic_id,
                apt_deleted_at__isnull=True,
            ).select_related(
                'stf_id__usr_id',
            ).order_by('-apt_scheduled_at')[:50]
        )

        consultation_count = Consultation.objects.filter(
            apt_id__pet_id=pet,
            apt_id__cln_id_id=clinic_id,
            apt_id__apt_deleted_at__isnull=True,
        ).count()

        screening_count = AiScreening.objects.filter(
            pet_id=pet,
        ).count()

        return {
            'pet': pet,
            'vaccinations': vaccinations,
            'appointments': appointments,
            'consultation_count': consultation_count,
            'screening_count': screening_count,
            'today': today,
            'timezone': tz,
        }

    @staticmethod
    def list_patient_appointments(pet_id, clinic_id, page=1, page_size=10):
        """Paginated appointment history for one clinic patient.

        Same scoping and ordering as the detail payload's embedded history
        (newest first), but sliced like every other list endpoint so the
        history table can page through instead of rendering everything.
        Returns None when the pet is not this clinic's patient (→ 404).
        """
        try:
            pet = ClinicAdminPatientService._base_queryset(
                clinic_id,
            ).get(pet_id=pet_id)
        except Pet.DoesNotExist:
            return None

        queryset = Appointment.objects.filter(
            pet_id=pet,
            cln_id_id=clinic_id,
            apt_deleted_at__isnull=True,
        ).select_related(
            'stf_id__usr_id',
        ).order_by('-apt_scheduled_at')

        total = queryset.count()
        page = ClinicAdminPatientService._parse_page(page, 1)
        page_size = ClinicAdminPatientService._parse_page(
            page_size, 10, maximum=100,
        )
        start = (page - 1) * page_size

        return {
            'total': total,
            'page': page,
            'page_size': page_size,
            'total_pages': (total + page_size - 1) // page_size,
            'results': list(queryset[start:start + page_size]),
        }

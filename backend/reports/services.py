from datetime import datetime, time, timedelta

from django.db.models import Avg, Count, Exists, Min, OuterRef, Q
from django.utils import timezone

from ai_screenings.models import AiScreening, ScreeningStatus
from appointments.models import Appointment, AppointmentStatus
from appointments.services import (
    DAY_MAP,
    NON_PATIENT_APPOINTMENT_STATUSES,
    AppointmentService,
    get_clinic_timezone,
)
from clinics.models import ClinicOperatingHours
from users.models import StaffProfile

# Guard rail: the series endpoint zero-fills every day in the window and the
# summary runs a second, equally sized previous-window query, so an unbounded
# range would do an arbitrary amount of work for one request.
MAX_REPORT_DAYS = 366

# Default window when the caller passes no dates: last 30 clinic-local days.
DEFAULT_DATE_FROM_OFFSET = 29


def resolve_window(clinic_id, date_from=None, date_to=None):
    """Pin both ends of the window to clinic-local calendar days.

    Returns (date_from, date_to) as concrete dates. The caller validates
    order and the 366-day cap against the resolved pair.
    """
    tz = get_clinic_timezone(clinic_id)
    if date_to is None:
        date_to = datetime.now(tz).date()
    if date_from is None:
        date_from = date_to - timedelta(days=DEFAULT_DATE_FROM_OFFSET)
    return date_from, date_to


def day_bounds(clinic_id, date_from, date_to):
    """Aware [start, end_exclusive) for a clinic-local inclusive day range."""
    tz = get_clinic_timezone(clinic_id)
    start = timezone.make_aware(datetime.combine(date_from, time.min), tz)
    end_exclusive = timezone.make_aware(
        datetime.combine(date_to + timedelta(days=1), time.min), tz,
    )
    return start, end_exclusive


def previous_window(date_from, date_to):
    """The equal-length window immediately before the requested one.

    "This month" on the 10th therefore compares 10 days against the 10 days
    before it, not against the first 10 days of last month. The UI labels the
    comparison by day count so the mismatch is never hidden.
    """
    length = (date_to - date_from).days + 1
    prev_to = date_from - timedelta(days=1)
    prev_from = prev_to - timedelta(days=length - 1)
    return prev_from, prev_to


def _rate(numerator, denominator):
    """Percentage rounded to one decimal; an empty denominator is 0, not an error."""
    if denominator <= 0:
        return 0.0
    return round(numerator * 100 / denominator, 1)


def _appointments_in_window(clinic_id, date_from, date_to, vet_id=None):
    start, end_exclusive = day_bounds(clinic_id, date_from, date_to)
    qs = Appointment.objects.filter(
        cln_id_id=clinic_id,
        apt_deleted_at__isnull=True,
        apt_scheduled_at__gte=start,
        apt_scheduled_at__lt=end_exclusive,
    )
    if vet_id:
        qs = qs.filter(stf_id_id=vet_id)
    return qs


def _counts(qs, now):
    total = qs.count()
    # "Elapsed" = the scheduled time has passed. Cancelled rows are excluded
    # from the rate denominator (a cancelled slot was never really due) but
    # stay in the cancellation rate's own denominator, which is all
    # appointments in the window. Reports never call _reconcile_past_due:
    # BUSINESS_RULES §23 keeps reports read-only, so a stale PENDING row is
    # counted as not-completed until the next dashboard/list reconciliation.
    elapsed = qs.filter(apt_scheduled_at__lt=now).exclude(
        apt_status=AppointmentStatus.CANCELLED,
    ).count()
    completed = qs.filter(apt_status=AppointmentStatus.COMPLETED).count()
    no_shows = qs.filter(apt_status=AppointmentStatus.NO_SHOW).count()
    cancelled = qs.filter(apt_status=AppointmentStatus.CANCELLED).count()
    return {
        'total_appointments': total,
        'completion_rate': _rate(completed, elapsed),
        'no_show_rate': _rate(no_shows, elapsed),
        'cancellation_rate': _rate(cancelled, total),
        'elapsed': elapsed,
        'completed': completed,
        'no_shows': no_shows,
        'cancelled': cancelled,
    }


def _new_patients(clinic_id, date_from, date_to):
    """Pets whose first qualifying appointment at this clinic is in the window.

    Qualifying mirrors the canonical patient rule (non-deleted, never
    CANCELLED/NO_SHOW). Always clinic-wide: the vet filter narrows
    appointment metrics, never clinic growth.
    """
    start, end_exclusive = day_bounds(clinic_id, date_from, date_to)
    first_visits = (
        Appointment.objects.filter(
            cln_id_id=clinic_id,
            apt_deleted_at__isnull=True,
        )
        .exclude(apt_status__in=NON_PATIENT_APPOINTMENT_STATUSES)
        .values('pet_id')
        .annotate(first=Min('apt_scheduled_at'))
        .filter(first__gte=start, first__lt=end_exclusive)
    )
    return first_visits.count()


class ReportService:
    """Read-only aggregates for the Clinic Admin reports page."""

    @staticmethod
    def get_summary(clinic_id, date_from, date_to, vet_id=None):
        now = timezone.localtime()

        current_qs = _appointments_in_window(
            clinic_id, date_from, date_to, vet_id=vet_id,
        )
        current = _counts(current_qs, now)
        new_patients = _new_patients(clinic_id, date_from, date_to)

        prev_from, prev_to = previous_window(date_from, date_to)
        prev_start, prev_end_exclusive = day_bounds(
            clinic_id, prev_from, prev_to,
        )
        prev_qs = Appointment.objects.filter(
            cln_id_id=clinic_id,
            apt_deleted_at__isnull=True,
            apt_scheduled_at__gte=prev_start,
            apt_scheduled_at__lt=prev_end_exclusive,
        )
        if vet_id:
            prev_qs = prev_qs.filter(stf_id_id=vet_id)
        previous = _counts(prev_qs, now)
        prev_new = _new_patients(clinic_id, prev_from, prev_to)

        return {
            'total_appointments': current['total_appointments'],
            'completion_rate': current['completion_rate'],
            'no_show_rate': current['no_show_rate'],
            'cancellation_rate': current['cancellation_rate'],
            'new_patients': new_patients,
            'previous': {
                'total_appointments': previous['total_appointments'],
                'completion_rate': previous['completion_rate'],
                'no_show_rate': previous['no_show_rate'],
                'cancellation_rate': previous['cancellation_rate'],
                'new_patients': prev_new,
            },
        }

    @staticmethod
    def get_appointments_report(clinic_id, date_from, date_to, vet_id=None):
        series = AppointmentService.get_volume(
            clinic_id=clinic_id,
            date_from=date_from,
            date_to=date_to,
            vet_id=vet_id,
        )
        qs = _appointments_in_window(
            clinic_id, date_from, date_to, vet_id=vet_id,
        )
        rows = qs.values('apt_status').annotate(count=Count('apt_id'))
        counts = {row['apt_status']: row['count'] for row in rows}
        # Zero-filled across every status so the donut legend stays stable
        # between periods (the API returns all seven statuses).
        by_status = [
            {'status': code, 'count': counts.get(code, 0)}
            for code in AppointmentStatus.values
        ]
        return {'series': series, 'by_status': by_status}

    @staticmethod
    def get_vet_workload(clinic_id, date_from, date_to, vet_id=None):
        qs = _appointments_in_window(
            clinic_id, date_from, date_to, vet_id=vet_id,
        ).exclude(stf_id__isnull=True)

        rows = list(
            qs.values('stf_id')
            .annotate(
                total=Count('apt_id'),
                completed=Count(
                    'apt_id',
                    filter=Q(apt_status=AppointmentStatus.COMPLETED),
                ),
                no_shows=Count(
                    'apt_id',
                    filter=Q(apt_status=AppointmentStatus.NO_SHOW),
                ),
            )
            .order_by('-total', 'stf_id')
        )
        days = _denominator_days(clinic_id, date_from, date_to)
        if not rows:
            return {'results': [], 'days': days}

        names = {
            row['stf_id']: (
                f"{row['usr_id__usr_first_name']} "
                f"{row['usr_id__usr_last_name']}"
            ).strip()
            for row in StaffProfile.objects.filter(
                stf_id__in=[row['stf_id'] for row in rows],
            ).values(
                'stf_id', 'usr_id__usr_first_name', 'usr_id__usr_last_name',
            )
        }

        results = [
            {
                'vet_id': str(row['stf_id']),
                'vet_name': names.get(row['stf_id'], 'Unknown'),
                'total': row['total'],
                'completed': row['completed'],
                'no_shows': row['no_shows'],
                'avg_per_day': round(row['total'] / days, 1),
            }
            for row in rows
            if row['stf_id'] in names
        ]
        return {'results': results, 'days': days}

    @staticmethod
    def get_screenings(clinic_id, date_from, date_to, vet_id=None):
        start, end_exclusive = day_bounds(clinic_id, date_from, date_to)

        # Clinic scope: the pet has a non-deleted appointment here. EXISTS is
        # a semi-join, so a pet with several appointments still contributes
        # exactly one row per screening (no join duplication).
        has_clinic_appointment = Exists(
            Appointment.objects.filter(
                pet_id=OuterRef('pet_id'),
                cln_id_id=clinic_id,
                apt_deleted_at__isnull=True,
            )
        )
        qs = AiScreening.objects.filter(
            ais_created_at__gte=start,
            ais_created_at__lt=end_exclusive,
        ).filter(has_clinic_appointment)

        if vet_id:
            # Vet attribution goes through the appointment that references
            # THIS screening (set when an owner books with a screening
            # attached). Unbooked screenings have no vet and therefore drop
            # out of the filtered view; clinic-wide totals still include them.
            qs = qs.filter(
                Exists(
                    Appointment.objects.filter(
                        apt_screening_id=OuterRef('pk'),
                        stf_id_id=vet_id,
                        cln_id_id=clinic_id,
                        apt_deleted_at__isnull=True,
                    )
                )
            )

        total = qs.count()
        by_condition = [
            {'disease': row['dis_id__dis_name'], 'count': row['count']}
            for row in qs.values('dis_id__dis_name')
            .annotate(count=Count('ais_id'))
            .order_by('-count', 'dis_id__dis_name')
        ]

        # The status field is never transitioned after comparison, so "reviewed"
        # is derived: compared at some point OR status moved off PENDING_REVIEW.
        reviewed_qs = qs.filter(
            Q(ais_compared_at__isnull=False)
            | ~Q(ais_status=ScreeningStatus.PENDING_REVIEW)
        )
        reviewed = reviewed_qs.count()
        pending = total - reviewed
        vet_confirmed = reviewed_qs.filter(ais_is_correct=True).count()
        vet_changed = reviewed_qs.filter(ais_is_correct=False).count()

        avg = qs.aggregate(value=Avg('ais_confidence'))['value']
        # ais_confidence is stored 0-100 (device posts a percentage), so the
        # value can be shown as-is; None means no screenings at all.
        avg_confidence = float(round(avg, 1)) if avg is not None else 0.0

        return {
            'by_condition': by_condition,
            'avg_confidence': avg_confidence,
            'reviewed': reviewed,
            'pending_review': pending,
            'vet_confirmed': vet_confirmed,
            'vet_changed': vet_changed,
        }


def _denominator_days(clinic_id, date_from, date_to):
    """Days the clinic was actually open in the window.

    Dividing by calendar days makes a Mon-Fri vet look ~30% busier than a
    Mon-Fri clinic's real daily load. Falls back to the calendar count when
    the clinic has no open day configured (or every day is closed), which
    also removes any division-by-zero risk.
    """
    calendar_days = (date_to - date_from).days + 1
    open_weekdays = set(
        ClinicOperatingHours.objects.filter(
            cln_id_id=clinic_id,
            is_closed=False,
        ).values_list('day_of_week', flat=True)
    )
    if not open_weekdays:
        return calendar_days

    open_days = 0
    day = date_from
    while day <= date_to:
        if DAY_MAP[day.weekday()] in open_weekdays:
            open_days += 1
        day += timedelta(days=1)
    return open_days or calendar_days

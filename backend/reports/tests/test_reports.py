from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from django.db import connection
from django.test import TestCase
from django.test.utils import CaptureQueriesContext

from ai_screenings.models import AiScreening, Disease, ScreeningStatus
from appointments.models import Appointment, AppointmentStatus, AppointmentType
from clinics.models import Clinic, ClinicOperatingHours
from owners.models import OwnerProfile
from pets.models import Breed, Pet, Sex
from rest_framework_simplejwt.tokens import RefreshToken
from users.models import StaffPosition, StaffProfile, User, UserRole

MNL = ZoneInfo('Asia/Manila')

# Fixed, already-past report window. The previous window for Oct 1-8 (8 days)
# is Sep 23-30: previous_window() compares equal day counts, never calendar
# months.
WINDOW = {'date_from': '2026-10-01', 'date_to': '2026-10-08'}
PREV_FROM, PREV_TO = '2026-09-23', '2026-09-30'

ENDPOINTS = (
    '/api/reports/summary/',
    '/api/reports/appointments/',
    '/api/reports/vet-workload/',
    '/api/reports/screenings/',
    '/api/reports/patients/',
)


class ReportsBase(TestCase):

    def setUp(self):
        self.clinic = Clinic.objects.create(cln_name='Happy Paws Clinic')
        self.other_clinic = Clinic.objects.create(cln_name='Rival Clinic')

        self.admin = self._create_user(
            'admin@clinic.test', UserRole.CLINIC_ADMIN, 'Ada', 'Admin',
        )
        StaffProfile.objects.create(
            usr_id=self.admin,
            cln_id=self.clinic,
            stf_position=StaffPosition.CLINIC_ADMIN,
        )
        self.other_admin = self._create_user(
            'admin2@clinic.test', UserRole.CLINIC_ADMIN, 'Otto', 'Other',
        )
        StaffProfile.objects.create(
            usr_id=self.other_admin,
            cln_id=self.other_clinic,
            stf_position=StaffPosition.CLINIC_ADMIN,
        )
        self.receptionist = self._create_user(
            'desk@clinic.test', UserRole.RECEPTIONIST, 'Rita', 'Desk',
        )
        StaffProfile.objects.create(
            usr_id=self.receptionist,
            cln_id=self.clinic,
            stf_position=StaffPosition.RECEPTIONIST,
        )

        self.vet_a = self._staff('vera@clinic.test', 'Vera', 'Vet', self.clinic)
        self.vet_b = self._staff('bo@clinic.test', 'Bo', 'Vet', self.clinic)
        self.foreign_vet = self._staff(
            'outsider@clinic.test', 'Ora', 'Other', self.other_clinic,
        )

        self.owner = self._create_user(
            'owner@clinic.test', UserRole.OWNER, 'Olivia', 'Owner',
        )
        owner_profile = OwnerProfile.objects.create(usr_id=self.owner)

        self.pet = Pet.objects.create(
            own_id=owner_profile, pet_name='Rex', pet_sex=Sex.MALE,
        )
        self.pet_multi = Pet.objects.create(
            own_id=owner_profile, pet_name='Milo', pet_sex=Sex.MALE,
        )
        self.pet_cancelled_only = Pet.objects.create(
            own_id=owner_profile, pet_name='Zoe', pet_sex=Sex.FEMALE,
        )
        self.pet_prev = Pet.objects.create(
            own_id=owner_profile, pet_name='Pip', pet_sex=Sex.FEMALE,
        )

        self.disease = Disease.objects.create(
            dis_code='TEST_MANGE', dis_name='Test Mange', dis_severity='LOW',
        )

        # Rex's first visit is before both windows, so he is never "new".
        self._apt(datetime(2026, 9, 20, 12, 0, tzinfo=MNL))

        # Current window (Oct 1-8): 8 appointments, hand-computed below.
        self.apt_completed = self._apt(
            datetime(2026, 10, 2, 12, 0, tzinfo=MNL),
            vet=self.vet_a, status=AppointmentStatus.COMPLETED,
        )
        self._apt(
            datetime(2026, 10, 3, 12, 0, tzinfo=MNL),
            vet=self.vet_a, status=AppointmentStatus.COMPLETED,
        )
        self._apt(
            datetime(2026, 10, 4, 12, 0, tzinfo=MNL),
            vet=self.vet_b, status=AppointmentStatus.NO_SHOW,
        )
        self._apt(
            datetime(2026, 10, 5, 12, 0, tzinfo=MNL),
            status=AppointmentStatus.CANCELLED,
        )
        self._apt(
            datetime(2026, 10, 6, 12, 0, tzinfo=MNL),
            status=AppointmentStatus.PENDING,
        )
        # Milo counts once as a new patient despite two visits.
        self._apt(
            datetime(2026, 10, 3, 14, 0, tzinfo=MNL),
            pet=self.pet_multi, status=AppointmentStatus.COMPLETED,
        )
        self._apt(
            datetime(2026, 10, 5, 14, 0, tzinfo=MNL),
            pet=self.pet_multi, status=AppointmentStatus.COMPLETED,
        )
        # Cancelled-only pets never become patients.
        self._apt(
            datetime(2026, 10, 7, 14, 0, tzinfo=MNL),
            pet=self.pet_cancelled_only, status=AppointmentStatus.CANCELLED,
        )
        # Other clinic's data must never appear in these numbers.
        self.apt_other_clinic = self._apt(
            datetime(2026, 10, 3, 12, 0, tzinfo=MNL),
            clinic=self.other_clinic, status=AppointmentStatus.COMPLETED,
        )

        # Previous window (Sep 23-30): 3 appointments.
        self._apt(
            datetime(2026, 9, 25, 12, 0, tzinfo=MNL),
            status=AppointmentStatus.COMPLETED,
        )
        self._apt(
            datetime(2026, 9, 28, 12, 0, tzinfo=MNL),
            status=AppointmentStatus.NO_SHOW,
        )
        # Pip's first visit lands in the previous window only.
        self._apt(
            datetime(2026, 9, 25, 13, 0, tzinfo=MNL),
            pet=self.pet_prev, status=AppointmentStatus.COMPLETED,
        )

    def _create_user(self, email, role, first_name, last_name):
        user = User.objects.create(
            usr_email=email,
            usr_password_hash='hashed',
            usr_role=role,
            usr_first_name=first_name,
            usr_last_name=last_name,
        )
        user.set_password('TestPass123!')
        user.save()
        return user

    def _staff(self, email, first_name, last_name, clinic):
        user = self._create_user(email, UserRole.VETERINARIAN,
                                 first_name, last_name)
        return StaffProfile.objects.create(
            usr_id=user, cln_id=clinic,
            stf_position=StaffPosition.VETERINARIAN,
        )

    def _apt(self, scheduled_at, clinic=None, vet=None, pet=None,
             status=AppointmentStatus.PENDING):
        return Appointment.objects.create(
            pet_id=pet or self.pet,
            cln_id=clinic or self.clinic,
            stf_id=vet,
            apt_type=AppointmentType.CONSULTATION,
            apt_status=status,
            apt_scheduled_at=scheduled_at,
        )

    def _screening(self, created_at, *, pet=None, confidence=80,
                   compared_at=None, is_correct=None,
                   status=ScreeningStatus.PENDING_REVIEW):
        screening = AiScreening.objects.create(
            pet_id=pet or self.pet,
            dis_id=self.disease,
            usr_id=self.owner,
            ais_confidence=confidence,
            ais_model_version='test-1.0.0',
            ais_status=status,
            ais_compared_at=compared_at,
            ais_is_correct=is_correct,
        )
        # ais_created_at is auto_now_add; move it into the report window.
        AiScreening.objects.filter(pk=screening.pk).update(
            ais_created_at=created_at,
        )
        screening.refresh_from_db()
        return screening

    def _open_weekdays(self):
        """Mon-Fri open, Sat-Sun closed (7 rows, as the UI seeds them)."""
        ClinicOperatingHours.objects.filter(cln_id=self.clinic).delete()
        for index, code in enumerate(('MON', 'TUE', 'WED', 'THU', 'FRI')):
            ClinicOperatingHours.objects.create(
                cln_id=self.clinic, day_of_week=code, day_index=index,
                opening_time='09:00', closing_time='17:00', is_closed=False,
            )
        for code, offset in (('SAT', 5), ('SUN', 6)):
            ClinicOperatingHours.objects.create(
                cln_id=self.clinic, day_of_week=code, day_index=offset,
                is_closed=True,
            )

    def _auth(self, user):
        refresh = RefreshToken()
        refresh['user_id'] = str(user.usr_id)
        refresh['token_version'] = user.usr_token_version
        return {'HTTP_AUTHORIZATION': f'Bearer {refresh.access_token}'}

    def _get(self, endpoint, user=None, **params):
        return self.client.get(
            endpoint, params, **self._auth(user or self.admin),
        )


class ReportPermissionTests(ReportsBase):

    def test_clinic_admin_can_read_every_endpoint(self):
        for endpoint in ENDPOINTS:
            response = self._get(endpoint)
            self.assertEqual(
                response.status_code, 200, (endpoint, response.data),
            )

    def test_receptionist_forbidden_on_every_endpoint(self):
        for endpoint in ENDPOINTS:
            response = self._get(endpoint, user=self.receptionist)
            self.assertEqual(response.status_code, 403, endpoint)

    def test_owner_forbidden_on_every_endpoint(self):
        for endpoint in ENDPOINTS:
            response = self._get(endpoint, user=self.owner)
            self.assertEqual(response.status_code, 403, endpoint)

    def test_anonymous_forbidden(self):
        for endpoint in ENDPOINTS:
            response = self.client.get(endpoint)
            self.assertIn(response.status_code, (401, 403), endpoint)

    def test_reports_are_read_only(self):
        # IsClinicAdminReadOnly denies unsafe methods before dispatch, so a
        # clinic admin POST is a 403 (the write never reaches the view).
        for endpoint in ENDPOINTS:
            response = self.client.post(
                endpoint, {}, format='json', **self._auth(self.admin),
            )
            self.assertEqual(response.status_code, 403, endpoint)

    def test_other_clinic_admin_sees_only_their_own_data(self):
        response = self._get('/api/reports/summary/', user=self.other_admin)
        self.assertEqual(response.status_code, 200, response.data)
        # Their clinic has exactly its own appointment (Oct 3), never the
        # 8 appointments of Happy Paws.
        self.assertEqual(response.data['total_appointments'], 1)
        self.assertEqual(response.data['completion_rate'], 100.0)


class ReportValidationTests(ReportsBase):

    def test_invalid_date_format(self):
        response = self._get(
            '/api/reports/summary/', date_from='01-10-2026',
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('YYYY-MM-DD', response.data['detail'])

    def test_reversed_range(self):
        response = self._get(
            '/api/reports/appointments/',
            date_from='2026-10-08', date_to='2026-10-01',
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('cannot be after', response.data['detail'])

    def test_range_capped_at_366_days(self):
        response = self._get(
            '/api/reports/vet-workload/',
            date_from='2025-01-01', date_to='2026-03-01',
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('at most 366 days', response.data['detail'])

    def test_range_of_exactly_366_days_is_allowed(self):
        response = self._get(
            '/api/reports/summary/',
            date_from='2026-01-01', date_to='2027-01-01',
        )
        # 366 inclusive days is inside the cap; one more day would be 400.
        self.assertEqual(response.status_code, 200, response.data)

    def test_malformed_vet_id(self):
        response = self._get('/api/reports/screenings/', vet_id='not-a-uuid')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['detail'], "Invalid 'vet_id'.")

    def test_vet_from_another_clinic_is_rejected(self):
        for endpoint in ENDPOINTS:
            response = self._get(
                endpoint, vet_id=str(self.foreign_vet.stf_id),
            )
            self.assertEqual(response.status_code, 400, endpoint)
            self.assertEqual(
                response.data['detail'],
                "'vet_id' does not belong to this clinic.",
            )
        # The rejection happens before any aggregation: nothing is returned
        # that could leak the other clinic's numbers.
        response = self._get(
            '/api/reports/vet-workload/',
            vet_id=str(self.foreign_vet.stf_id),
        )
        self.assertNotIn('results', response.data)

    def test_unknown_vet_id_is_rejected(self):
        response = self._get(
            '/api/reports/summary/',
            vet_id='11111111-2222-3333-4444-555555555555',
        )
        self.assertEqual(response.status_code, 400)


class ReportSummaryTests(ReportsBase):

    def test_rates_match_hand_computed_example(self):
        response = self._get('/api/reports/summary/', **WINDOW)
        self.assertEqual(response.status_code, 200, response.data)
        data = response.data

        # 8 appointments in the window: 4 completed, 1 no-show, 2 cancelled
        # (1 standalone + Zoe's), 1 pending. All scheduled times are in the
        # past, so elapsed = 8 - 2 cancelled = 6.
        self.assertEqual(data['total_appointments'], 8)
        self.assertEqual(data['completion_rate'], 66.7)   # 4 / 6
        self.assertEqual(data['no_show_rate'], 16.7)      # 1 / 6
        self.assertEqual(data['cancellation_rate'], 25.0)  # 2 / 8
        # Milo only (two visits, counted once); Zoe never (cancelled-only);
        # Rex first visited before the window.
        self.assertEqual(data['new_patients'], 1)

    def test_previous_window_matches_hand_computed_example(self):
        response = self._get('/api/reports/summary/', **WINDOW)
        self.assertEqual(response.status_code, 200, response.data)
        previous = response.data['previous']

        # Sep 23-30: 3 appointments (Rex completed + no-show, Pip completed),
        # none cancelled, so elapsed = 3.
        self.assertEqual(previous['total_appointments'], 3)
        self.assertEqual(previous['completion_rate'], 66.7)  # 2 / 3
        self.assertEqual(previous['no_show_rate'], 33.3)     # 1 / 3
        self.assertEqual(previous['cancellation_rate'], 0.0)
        self.assertEqual(previous['new_patients'], 1)  # Pip

    def test_empty_window_returns_zero_rates_without_errors(self):
        response = self._get(
            '/api/reports/summary/',
            date_from='2025-01-01', date_to='2025-01-08',
        )
        self.assertEqual(response.status_code, 200, response.data)
        data = response.data
        self.assertEqual(data['total_appointments'], 0)
        self.assertEqual(data['completion_rate'], 0.0)
        self.assertEqual(data['no_show_rate'], 0.0)
        self.assertEqual(data['cancellation_rate'], 0.0)
        self.assertEqual(data['new_patients'], 0)
        self.assertEqual(data['previous']['total_appointments'], 0)
        self.assertEqual(data['previous']['completion_rate'], 0.0)

    def test_vet_filter_narrows_appointments_but_not_new_patients(self):
        response = self._get(
            '/api/reports/summary/', vet_id=str(self.vet_a.stf_id),
            **WINDOW,
        )
        self.assertEqual(response.status_code, 200, response.data)
        data = response.data
        # Vera has exactly the two completed appointments on Oct 2-3.
        self.assertEqual(data['total_appointments'], 2)
        self.assertEqual(data['completion_rate'], 100.0)
        self.assertEqual(data['no_show_rate'], 0.0)
        self.assertEqual(data['cancellation_rate'], 0.0)
        # New Patients is a clinic-growth metric and stays clinic-wide; the
        # UI labels it "(all vets)" so the number is never misread.
        self.assertEqual(data['new_patients'], 1)

    def test_other_clinic_appointments_are_excluded(self):
        response = self._get('/api/reports/summary/', **WINDOW)
        # Fixture totals (8) already exclude the Rival Clinic appointment;
        # an inclusive total would be 9.
        self.assertEqual(response.data['total_appointments'], 8)


class ReportAppointmentsTests(ReportsBase):

    def test_series_is_zero_filled_and_bucketed_by_manila_day(self):
        # 06:00 PHT is the same calendar day in Manila and UTC, and a
        # 23:59 PHT appointment must not roll into the next day.
        early = self._apt(datetime(2026, 10, 5, 6, 0, tzinfo=MNL))
        self.assertIsNotNone(early)

        response = self._get('/api/reports/appointments/', **WINDOW)
        self.assertEqual(response.status_code, 200, response.data)
        series = {row['date']: row['count'] for row in response.data['series']}
        self.assertEqual(len(series), 8)
        # Oct 5 holds the fixture's cancelled appointment, Milo's 14:00
        # visit, and the 06:00 one added above.
        self.assertEqual(series['2026-10-05'], 3)
        # Every other fixture day lines up too, and gaps stay zero-filled.
        self.assertEqual(series['2026-10-01'], 0)
        self.assertEqual(series['2026-10-02'], 1)
        self.assertEqual(series['2026-10-07'], 1)
        self.assertEqual(series['2026-10-08'], 0)

    def test_midnight_boundary_splits_days_correctly(self):
        # 23:59 PHT on Sep 30 belongs to Sep 30; 06:00 PHT on Oct 1 to Oct 1.
        self._apt(datetime(2026, 9, 30, 23, 59, tzinfo=MNL))
        self._apt(datetime(2026, 10, 1, 6, 0, tzinfo=MNL))

        response = self._get(
            '/api/reports/appointments/',
            date_from='2026-09-30', date_to='2026-10-01',
        )
        self.assertEqual(response.status_code, 200, response.data)
        series = {row['date']: row['count'] for row in response.data['series']}
        # Base fixture has no Sep 30 / Oct 1 appointments, so these two are
        # the only ones in the range.
        self.assertEqual(series['2026-09-30'], 1)
        self.assertEqual(series['2026-10-01'], 1)

        # A one-day window proves the boundary in the summary too.
        summary = self._get(
            '/api/reports/summary/', date_from='2026-09-30',
            date_to='2026-09-30',
        )
        self.assertEqual(summary.data['total_appointments'], 1)
        summary = self._get(
            '/api/reports/summary/', date_from='2026-10-01',
            date_to='2026-10-01',
        )
        self.assertEqual(summary.data['total_appointments'], 1)

    def test_status_breakdown_is_zero_filled_across_all_seven(self):
        response = self._get('/api/reports/appointments/', **WINDOW)
        self.assertEqual(response.status_code, 200, response.data)
        by_status = {
            row['status']: row['count'] for row in response.data['by_status']
        }
        self.assertEqual(len(by_status), 7)
        self.assertEqual(by_status, {
            'PENDING': 1,
            'CONFIRMED': 0,
            'CHECKED_IN': 0,
            'IN_PROGRESS': 0,
            'COMPLETED': 4,
            'CANCELLED': 2,
            'NO_SHOW': 1,
        })
        # Status totals always reconcile with the series total.
        self.assertEqual(sum(by_status.values()), 8)

    def test_vet_filter_applies_to_series_and_statuses(self):
        response = self._get(
            '/api/reports/appointments/',
            vet_id=str(self.vet_a.stf_id), **WINDOW,
        )
        self.assertEqual(response.status_code, 200, response.data)
        series = {row['date']: row['count'] for row in response.data['series']}
        self.assertEqual(sum(series.values()), 2)
        by_status = {
            row['status']: row['count'] for row in response.data['by_status']
        }
        self.assertEqual(by_status['COMPLETED'], 2)
        self.assertEqual(by_status['NO_SHOW'], 0)

    def test_empty_window_returns_zero_filled_series(self):
        response = self._get(
            '/api/reports/appointments/',
            date_from='2025-01-01', date_to='2025-01-05',
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(len(response.data['series']), 5)
        self.assertTrue(
            all(row['count'] == 0 for row in response.data['series']),
        )
        self.assertTrue(
            all(row['count'] == 0 for row in response.data['by_status']),
        )


class ReportVetWorkloadTests(ReportsBase):

    def test_rows_are_grouped_per_vet_and_sorted(self):
        response = self._get('/api/reports/vet-workload/', **WINDOW)
        self.assertEqual(response.status_code, 200, response.data)
        results = response.data['results']
        self.assertEqual(len(results), 2)
        self.assertEqual(results[0]['vet_name'], 'Vera Vet')
        self.assertEqual(results[0]['total'], 2)
        self.assertEqual(results[0]['completed'], 2)
        self.assertEqual(results[0]['no_shows'], 0)
        self.assertEqual(results[1]['vet_name'], 'Bo Vet')
        self.assertEqual(results[1]['total'], 1)
        self.assertEqual(results[1]['no_shows'], 1)
        # No operating hours configured -> calendar days (8) fallback.
        self.assertEqual(response.data['days'], 8)
        self.assertEqual(results[0]['avg_per_day'], 0.2)  # 2/8 rounded

    def test_avg_per_day_divides_by_clinic_open_days(self):
        self._open_weekdays()
        response = self._get('/api/reports/vet-workload/', **WINDOW)
        self.assertEqual(response.status_code, 200, response.data)
        # Oct 1 2026 is a Thursday: Oct 1-8 contains 6 weekdays
        # (Oct 3 Sat and Oct 4 Sun are closed).
        self.assertEqual(response.data['days'], 6)
        vera = response.data['results'][0]
        self.assertEqual(vera['total'], 2)
        self.assertEqual(vera['avg_per_day'], 0.3)  # 2 / 6
        bo = response.data['results'][1]
        self.assertEqual(bo['avg_per_day'], 0.2)  # 1 / 6

    def test_vet_filter_returns_single_row(self):
        response = self._get(
            '/api/reports/vet-workload/',
            vet_id=str(self.vet_b.stf_id), **WINDOW,
        )
        self.assertEqual(response.status_code, 200, response.data)
        results = response.data['results']
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['vet_name'], 'Bo Vet')
        self.assertEqual(results[0]['total'], 1)

    def test_empty_window_returns_empty_results(self):
        response = self._get(
            '/api/reports/vet-workload/',
            date_from='2025-01-01', date_to='2025-01-08',
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['results'], [])
        self.assertGreater(response.data['days'], 0)


class ReportScreeningsTests(ReportsBase):

    def test_multi_appointment_pet_counts_once(self):
        # Rex has 6 appointments in the clinic; one screening must stay 1.
        self._screening(datetime(2026, 10, 3, 10, 0, tzinfo=MNL))
        response = self._get('/api/reports/screenings/', **WINDOW)
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(
            response.data['by_condition'],
            [{'disease': 'Test Mange', 'count': 1}],
        )
        self.assertEqual(response.data['reviewed'], 0)
        self.assertEqual(response.data['pending_review'], 1)

    def test_unbooked_screening_drops_out_when_a_vet_is_selected(self):
        # No appointment references this screening, so it has no vet.
        self._screening(datetime(2026, 10, 3, 10, 0, tzinfo=MNL))

        unfiltered = self._get('/api/reports/screenings/', **WINDOW)
        self.assertEqual(unfiltered.data['by_condition'][0]['count'], 1)

        filtered = self._get(
            '/api/reports/screenings/',
            vet_id=str(self.vet_a.stf_id), **WINDOW,
        )
        self.assertEqual(filtered.status_code, 200, filtered.data)
        self.assertEqual(filtered.data['by_condition'], [])
        self.assertEqual(filtered.data['reviewed'], 0)
        self.assertEqual(filtered.data['pending_review'], 0)
        self.assertEqual(filtered.data['avg_confidence'], 0)

    def test_booked_screening_counts_for_its_own_vet_only(self):
        screening = self._screening(
            datetime(2026, 10, 4, 10, 0, tzinfo=MNL),
        )
        # The booking links the screening to Vera's appointment.
        appointment = self._apt(
            datetime(2026, 10, 4, 15, 0, tzinfo=MNL),
            vet=self.vet_a, status=AppointmentStatus.COMPLETED,
        )
        appointment.apt_screening = screening
        appointment.save(update_fields=['apt_screening'])

        for_vera = self._get(
            '/api/reports/screenings/',
            vet_id=str(self.vet_a.stf_id), **WINDOW,
        )
        self.assertEqual(for_vera.data['by_condition'][0]['count'], 1)

        for_bo = self._get(
            '/api/reports/screenings/',
            vet_id=str(self.vet_b.stf_id), **WINDOW,
        )
        self.assertEqual(for_bo.data['by_condition'], [])

    def test_reviewed_pending_and_vet_agreement_counts(self):
        self._screening(
            datetime(2026, 10, 3, 9, 0, tzinfo=MNL),
            compared_at=datetime(2026, 10, 4, 9, 0, tzinfo=MNL),
            is_correct=True, status=ScreeningStatus.REVIEWED,
        )
        self._screening(
            datetime(2026, 10, 3, 10, 0, tzinfo=MNL),
            compared_at=datetime(2026, 10, 4, 10, 0, tzinfo=MNL),
            is_correct=False, status=ScreeningStatus.REVIEWED,
        )
        self._screening(datetime(2026, 10, 3, 11, 0, tzinfo=MNL))

        response = self._get('/api/reports/screenings/', **WINDOW)
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['reviewed'], 2)
        self.assertEqual(response.data['pending_review'], 1)
        self.assertEqual(response.data['vet_confirmed'], 1)
        self.assertEqual(response.data['vet_changed'], 1)

    def test_avg_confidence_is_percent_scale(self):
        self._screening(datetime(2026, 10, 3, 9, 0, tzinfo=MNL),
                        confidence=80)
        self._screening(datetime(2026, 10, 3, 10, 0, tzinfo=MNL),
                        confidence=90)
        response = self._get('/api/reports/screenings/', **WINDOW)
        self.assertEqual(response.status_code, 200, response.data)
        average = response.data['avg_confidence']
        self.assertGreaterEqual(average, 0)
        self.assertLessEqual(average, 100)
        self.assertEqual(average, 85.0)

    def test_screenings_outside_window_are_excluded(self):
        self._screening(datetime(2026, 9, 25, 10, 0, tzinfo=MNL))
        response = self._get('/api/reports/screenings/', **WINDOW)
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['by_condition'], [])
        self.assertEqual(response.data['avg_confidence'], 0)

    def test_empty_window_returns_zeros_and_empty_list(self):
        response = self._get(
            '/api/reports/screenings/',
            date_from='2025-01-01', date_to='2025-01-08',
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['by_condition'], [])
        self.assertEqual(response.data['avg_confidence'], 0)
        self.assertEqual(response.data['reviewed'], 0)
        self.assertEqual(response.data['pending_review'], 0)
        self.assertEqual(response.data['vet_confirmed'], 0)
        self.assertEqual(response.data['vet_changed'], 0)


class ReportPatientsTests(ReportsBase):

    def test_counts_distinct_qualifying_pets_once(self):
        response = self._get('/api/reports/patients/', **WINDOW)
        self.assertEqual(response.status_code, 200, response.data)
        data = response.data
        # Rex (several visits) and Milo (two visits) count once each. Zoe's
        # only visit is cancelled, Pip's only visit is in the previous
        # window, and the Rival Clinic visit is out of scope.
        self.assertEqual(data['total'], 2)
        self.assertEqual(
            data['by_breed'], [{'breed': 'Unknown', 'count': 2}],
        )
        self.assertEqual(data['by_sex'], [
            {'sex': 'MALE', 'count': 2},
            {'sex': 'FEMALE', 'count': 0},
        ])

    def test_vet_filter_does_not_narrow_demographics(self):
        unfiltered = self._get('/api/reports/patients/', **WINDOW)
        filtered = self._get(
            '/api/reports/patients/',
            vet_id=str(self.vet_a.stf_id), **WINDOW,
        )
        self.assertEqual(filtered.status_code, 200, filtered.data)
        # Like new_patients, demographics describe the clinic's patients,
        # not one vet's; the UI carries the "(all vets)" caveat.
        self.assertEqual(filtered.data, unfiltered.data)

    def test_empty_window_returns_zeroed_stable_shape(self):
        response = self._get(
            '/api/reports/patients/',
            date_from='2025-01-01', date_to='2025-01-08',
        )
        self.assertEqual(response.status_code, 200, response.data)
        data = response.data
        self.assertEqual(data['total'], 0)
        self.assertEqual(data['by_breed'], [])
        self.assertEqual(data['by_sex'], [
            {'sex': 'MALE', 'count': 0},
            {'sex': 'FEMALE', 'count': 0},
        ])
        self.assertEqual(
            [row['bucket'] for row in data['age_buckets']],
            ['<1 yr', '1–6 yrs', '7+ yrs', 'Unknown'],
        )
        self.assertTrue(all(row['count'] == 0 for row in data['age_buckets']))

    def test_age_buckets_split_on_whole_years(self):
        today = datetime.now(MNL).date()
        owner = self.pet.own_id
        # Offsets chosen so leap days can never shift the whole-year count.
        for offset in (timedelta(days=100), timedelta(days=400),
                       timedelta(days=365 * 6 + 100), timedelta(days=365 * 8)):
            pet = Pet.objects.create(
                own_id=owner, pet_name=f'Pet {offset.days}',
                pet_sex=Sex.FEMALE, pet_birth_date=today - offset,
            )
            self._apt(
                datetime(2026, 10, 6, 9, 0, tzinfo=MNL),
                pet=pet, status=AppointmentStatus.COMPLETED,
            )
        # A visited pet without a birth date lands in Unknown.
        no_birth = Pet.objects.create(
            own_id=owner, pet_name='Ageless', pet_sex=Sex.FEMALE,
        )
        self._apt(
            datetime(2026, 10, 6, 10, 0, tzinfo=MNL),
            pet=no_birth, status=AppointmentStatus.COMPLETED,
        )

        response = self._get('/api/reports/patients/', **WINDOW)
        self.assertEqual(response.status_code, 200, response.data)
        buckets = {
            row['bucket']: row['count'] for row in response.data['age_buckets']
        }
        # Fixture pets Rex and Milo have no birth date either.
        self.assertEqual(buckets, {
            '<1 yr': 1,
            '1–6 yrs': 2,
            '7+ yrs': 1,
            'Unknown': 3,
        })

    def test_breed_counts_sort_by_count_then_name(self):
        owner = self.pet.own_id
        beagle = Breed.objects.create(brd_name='Beagle')
        shih_tzu = Breed.objects.create(brd_name='Shih Tzu')
        self.pet.brd_id = beagle
        self.pet.save()
        self.pet_multi.brd_id = beagle
        self.pet_multi.save()
        for name, breed in (('Spot', shih_tzu), ('Stray', None)):
            pet = Pet.objects.create(
                own_id=owner, pet_name=name, pet_sex=Sex.FEMALE,
                brd_id=breed,
            )
            self._apt(
                datetime(2026, 10, 7, 9, 0, tzinfo=MNL),
                pet=pet, status=AppointmentStatus.COMPLETED,
            )

        response = self._get('/api/reports/patients/', **WINDOW)
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['total'], 4)
        self.assertEqual(response.data['by_breed'], [
            {'breed': 'Beagle', 'count': 2},
            {'breed': 'Shih Tzu', 'count': 1},
            {'breed': 'Unknown', 'count': 1},
        ])

    def test_inactive_and_deleted_pets_drop_out(self):
        owner = self.pet.own_id
        inactive = Pet.objects.create(
            own_id=owner, pet_name='Retired', pet_sex=Sex.MALE,
            pet_is_active=False,
        )
        self._apt(
            datetime(2026, 10, 6, 11, 0, tzinfo=MNL),
            pet=inactive, status=AppointmentStatus.COMPLETED,
        )
        deleted = Pet.objects.create(
            own_id=owner, pet_name='Gone', pet_sex=Sex.MALE,
            pet_deleted_at=datetime(2026, 10, 2, tzinfo=MNL),
        )
        self._apt(
            datetime(2026, 10, 6, 12, 0, tzinfo=MNL),
            pet=deleted, status=AppointmentStatus.COMPLETED,
        )

        response = self._get('/api/reports/patients/', **WINDOW)
        self.assertEqual(response.status_code, 200, response.data)
        # Both pets have qualifying visits but neither is an active,
        # non-deleted patient, so the fixture total is unchanged.
        self.assertEqual(response.data['total'], 2)

    def test_no_show_only_pets_are_not_patients(self):
        pet = Pet.objects.create(
            own_id=self.pet.own_id, pet_name='Ghost', pet_sex=Sex.FEMALE,
        )
        self._apt(
            datetime(2026, 10, 6, 13, 0, tzinfo=MNL),
            pet=pet, status=AppointmentStatus.NO_SHOW,
        )
        response = self._get('/api/reports/patients/', **WINDOW)
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['total'], 2)

    def test_other_clinic_sees_only_its_own_patients(self):
        response = self._get(
            '/api/reports/patients/', user=self.other_admin, **WINDOW,
        )
        self.assertEqual(response.status_code, 200, response.data)
        # Rival Clinic has exactly one qualifying visit (Rex, Oct 3).
        self.assertEqual(response.data['total'], 1)
        self.assertEqual(
            response.data['by_sex'][0], {'sex': 'MALE', 'count': 1},
        )


class ReportQueryCountTests(ReportsBase):

    def test_query_count_is_constant_as_appointments_grow(self):
        self._get('/api/reports/summary/', **WINDOW)

        with CaptureQueriesContext(connection) as small:
            response = self._get('/api/reports/summary/', **WINDOW)
        self.assertEqual(response.status_code, 200, response.data)
        small_count = len(small.captured_queries)

        for index in range(30):
            self._apt(
                datetime(2026, 10, 7, 8, 0, tzinfo=MNL)
                + timedelta(minutes=index),
                status=AppointmentStatus.COMPLETED,
            )

        with CaptureQueriesContext(connection) as large:
            response = self._get('/api/reports/summary/', **WINDOW)
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(len(large.captured_queries), small_count)

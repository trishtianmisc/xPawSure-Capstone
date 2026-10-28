from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

from django.db import connection
from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken

from ai_screenings.models import AiScreening, Disease, ScreeningSource, ScreeningStatus
from appointments.models import Appointment, AppointmentStatus, AppointmentType
from appointments.services import DashboardService
from clinics.models import Clinic
from consultations.models import Consultation
from owners.models import OwnerProfile
from pets.models import Breed, Pet, Sex
from users.models import StaffPosition, StaffProfile, User, UserRole
from vaccinations.models import VaccinationRecord, VaccinationRoute, VaccinationSource

MNL = ZoneInfo('Asia/Manila')
PASSWORD = 'TestPass123!'

ADMIN_EMAIL = 'patients-admin@clinic.test'
OTHER_ADMIN_EMAIL = 'patients-admin2@clinic.test'
RECEPTIONIST_EMAIL = 'patients-desk@clinic.test'
VET_EMAIL = 'patients-vet@clinic.test'
OWNER_EMAIL = 'patients-owner@example.com'
OWNER_PHONE = '09171234567'


class ClinicAdminPatientBase(TestCase):

    def setUp(self):
        self.clinic = Clinic.objects.create(cln_name='Patient Clinic')
        self.other_clinic = Clinic.objects.create(cln_name='Rival Patient Clinic')

        self.admin = self._create_user(
            ADMIN_EMAIL, UserRole.CLINIC_ADMIN, 'Ada', 'Admin',
        )
        StaffProfile.objects.create(
            usr_id=self.admin,
            cln_id=self.clinic,
            stf_position=StaffPosition.CLINIC_ADMIN,
        )
        self.other_admin = self._create_user(
            OTHER_ADMIN_EMAIL, UserRole.CLINIC_ADMIN, 'Otto', 'Other',
        )
        StaffProfile.objects.create(
            usr_id=self.other_admin,
            cln_id=self.other_clinic,
            stf_position=StaffPosition.CLINIC_ADMIN,
        )
        self.receptionist = self._create_user(
            RECEPTIONIST_EMAIL, UserRole.RECEPTIONIST, 'Rita', 'Desk',
        )
        StaffProfile.objects.create(
            usr_id=self.receptionist,
            cln_id=self.clinic,
            stf_position=StaffPosition.RECEPTIONIST,
        )
        self.vet_user = self._create_user(
            VET_EMAIL, UserRole.VETERINARIAN, 'Vera', 'Vet',
        )
        self.vet = StaffProfile.objects.create(
            usr_id=self.vet_user,
            cln_id=self.clinic,
            stf_position=StaffPosition.VETERINARIAN,
        )

        self.owner_user = self._create_user(
            OWNER_EMAIL,
            UserRole.OWNER,
            'Olivia',
            'Owner',
            phone=OWNER_PHONE,
        )
        self.owner = OwnerProfile.objects.create(usr_id=self.owner_user)

        self.breed = Breed.objects.create(brd_name='Labrador')
        self.other_breed = Breed.objects.create(brd_name='Beagle')

        self.patient = Pet.objects.create(
            own_id=self.owner,
            brd_id=self.breed,
            pet_name='Rex',
            pet_sex=Sex.MALE,
            pet_birth_date=datetime.now(MNL).date() - timedelta(days=365 * 3),
            pet_weight='12.50',
            pet_color='Brown',
            pet_microchip_no='CHIP-SECRET',
            pet_qr_code='QR-SECRET',
        )
        self.valid_appointment = self._appointment(
            self.patient,
            AppointmentStatus.COMPLETED,
            timezone.now() - timedelta(days=2),
            vet=self.vet,
        )

        self.cancelled_only = Pet.objects.create(
            own_id=self.owner,
            pet_name='Cancelled Only',
            pet_sex=Sex.FEMALE,
        )
        self._appointment(
            self.cancelled_only,
            AppointmentStatus.CANCELLED,
            timezone.now() - timedelta(days=1),
        )

        self.no_show_only = Pet.objects.create(
            own_id=self.owner,
            pet_name='No Show Only',
            pet_sex=Sex.FEMALE,
        )
        self._appointment(
            self.no_show_only,
            AppointmentStatus.NO_SHOW,
            timezone.now() - timedelta(days=1),
        )

        self.rival_patient = Pet.objects.create(
            own_id=self.owner,
            pet_name='Rival Pet',
            pet_sex=Sex.MALE,
        )
        Appointment.objects.create(
            pet_id=self.rival_patient,
            cln_id=self.other_clinic,
            apt_type=AppointmentType.CONSULTATION,
            apt_status=AppointmentStatus.COMPLETED,
            apt_scheduled_at=timezone.now() - timedelta(days=1),
        )

        self.stray = Pet.objects.create(
            own_id=self.owner,
            pet_name='Stray',
            pet_sex=Sex.FEMALE,
        )

    def _create_user(self, email, role, first_name, last_name, phone=None):
        user = User.objects.create(
            usr_email=email,
            usr_password_hash='hashed',
            usr_role=role,
            usr_first_name=first_name,
            usr_last_name=last_name,
            usr_phone=phone,
        )
        user.set_password(PASSWORD)
        user.save()
        return user

    def _auth(self, user):
        refresh = RefreshToken()
        refresh['user_id'] = str(user.usr_id)
        refresh['token_version'] = user.usr_token_version
        return {'HTTP_AUTHORIZATION': f'Bearer {refresh.access_token}'}

    def _appointment(
        self,
        pet,
        status=AppointmentStatus.CONFIRMED,
        scheduled_at=None,
        clinic=None,
        vet=None,
        cancellation_reason=None,
    ):
        return Appointment.objects.create(
            pet_id=pet,
            cln_id=clinic or self.clinic,
            stf_id=vet,
            apt_type=AppointmentType.CONSULTATION,
            apt_status=status,
            apt_scheduled_at=scheduled_at or timezone.now(),
            apt_cancellation_reason=cancellation_reason,
        )

    def _get(self, path, user=None, params=None):
        return self.client.get(
            path,
            params or {},
            **self._auth(user or self.admin),
        )

    def _detail(self, pet=None, user=None):
        return self._get(
            f'/api/clinic/patients/{(pet or self.patient).pet_id}/',
            user=user,
        )

    def _history(self, pet=None, user=None, params=None):
        return self._get(
            f'/api/clinic/patients/{(pet or self.patient).pet_id}/appointments/',
            user=user,
            params=params,
        )


class ClinicAdminPatientListTests(ClinicAdminPatientBase):

    def test_list_returns_only_canonical_patients_for_own_clinic(self):
        response = self._get('/api/clinic/patients/')

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['total'], 1)
        self.assertEqual(response.data['total_patients'], 1)
        self.assertEqual([row['name'] for row in response.data['results']], ['Rex'])

    def test_non_patients_are_excluded(self):
        response = self._get('/api/clinic/patients/')
        names = {row['name'] for row in response.data['results']}

        self.assertNotIn('Cancelled Only', names)
        self.assertNotIn('No Show Only', names)
        self.assertNotIn('Rival Pet', names)
        self.assertNotIn('Stray', names)

    def test_inactive_and_deleted_pets_are_excluded(self):
        inactive = Pet.objects.create(
            own_id=self.owner,
            pet_name='Inactive Patient',
            pet_sex=Sex.MALE,
            pet_is_active=False,
        )
        self._appointment(inactive, AppointmentStatus.COMPLETED)
        deleted = Pet.objects.create(
            own_id=self.owner,
            pet_name='Deleted Patient',
            pet_sex=Sex.MALE,
            pet_deleted_at=timezone.now(),
        )
        self._appointment(deleted, AppointmentStatus.COMPLETED)

        response = self._get('/api/clinic/patients/')
        names = {row['name'] for row in response.data['results']}

        self.assertEqual(response.data['total'], 1)
        self.assertNotIn('Inactive Patient', names)
        self.assertNotIn('Deleted Patient', names)

    def test_deleted_appointments_do_not_make_a_pet_a_patient(self):
        deleted_only = Pet.objects.create(
            own_id=self.owner,
            pet_name='Deleted Appointment',
            pet_sex=Sex.MALE,
        )
        appointment = self._appointment(
            deleted_only,
            AppointmentStatus.COMPLETED,
        )
        Appointment.objects.filter(pk=appointment.pk).update(
            apt_deleted_at=timezone.now(),
        )

        response = self._get('/api/clinic/patients/')
        names = {row['name'] for row in response.data['results']}

        self.assertEqual(response.data['total'], 1)
        self.assertNotIn('Deleted Appointment', names)

    def test_pet_with_cancelled_and_confirmed_appointments_is_patient(self):
        mixed = Pet.objects.create(
            own_id=self.owner,
            pet_name='Mixed History',
            pet_sex=Sex.FEMALE,
        )
        self._appointment(mixed, AppointmentStatus.CANCELLED)
        self._appointment(mixed, AppointmentStatus.CONFIRMED)

        response = self._get('/api/clinic/patients/')
        names = {row['name'] for row in response.data['results']}

        self.assertEqual(response.data['total'], 2)
        self.assertIn('Mixed History', names)

    def test_list_response_fields_are_whitelisted(self):
        response = self._get('/api/clinic/patients/')
        self.assertEqual(response.status_code, 200, response.data)

        row = response.data['results'][0]
        self.assertEqual(
            set(row.keys()),
            {
                'id', 'name', 'profile_picture', 'breed', 'sex', 'age',
                'owner', 'last_visit_date', 'next_appointment_date',
                'total_appointments', 'no_show_count', 'cancelled_count',
                'vaccination_status',
            },
        )
        self.assertEqual(set(row['owner'].keys()), {'name', 'phone', 'email'})
        self.assertEqual(row['owner']['phone'], OWNER_PHONE)
        self.assertEqual(row['owner']['email'], OWNER_EMAIL)
        self.assertEqual(row['breed'], 'Labrador')

        content = response.content.decode()
        self.assertNotIn('CHIP-SECRET', content)
        self.assertNotIn('QR-SECRET', content)
        self.assertNotIn('SECRET-DIAGNOSIS', content)

    def test_total_patients_matches_dashboard_kpi(self):
        response = self._get('/api/clinic/patients/')
        stats = DashboardService.get_stats(self.clinic.cln_id)

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['total_patients'], stats['total_pets'])

    def test_search_by_pet_name_owner_email_and_phone(self):
        for value in ('Rex', OWNER_EMAIL, OWNER_PHONE):
            response = self._get('/api/clinic/patients/', params={'search': value})
            self.assertEqual(response.status_code, 200, response.data)
            self.assertEqual(
                [row['name'] for row in response.data['results']],
                ['Rex'],
            )

    def test_breed_filter_and_invalid_breed(self):
        beagle_pet = Pet.objects.create(
            own_id=self.owner,
            brd_id=self.other_breed,
            pet_name='Beagle Patient',
            pet_sex=Sex.MALE,
        )
        self._appointment(beagle_pet, AppointmentStatus.COMPLETED)

        response = self._get(
            '/api/clinic/patients/',
            params={'breed': str(self.other_breed.brd_id)},
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(
            [row['name'] for row in response.data['results']],
            ['Beagle Patient'],
        )

        response = self._get('/api/clinic/patients/', params={'breed': 'nope'})
        self.assertEqual(response.status_code, 400)

    def test_vaccination_status_filters(self):
        today = datetime.now(MNL).date()
        overdue = Pet.objects.create(
            own_id=self.owner,
            pet_name='Overdue Vacc',
            pet_sex=Sex.MALE,
        )
        due_soon = Pet.objects.create(
            own_id=self.owner,
            pet_name='Due Soon Vacc',
            pet_sex=Sex.MALE,
        )
        current = Pet.objects.create(
            own_id=self.owner,
            pet_name='Current Vacc',
            pet_sex=Sex.MALE,
        )
        no_due = Pet.objects.create(
            own_id=self.owner,
            pet_name='No Due Vacc',
            pet_sex=Sex.MALE,
        )
        for pet in (overdue, due_soon, current, no_due):
            self._appointment(pet, AppointmentStatus.COMPLETED)

        self._vaccination(overdue, today - timedelta(days=1))
        self._vaccination(due_soon, today + timedelta(days=10))
        self._vaccination(current, today + timedelta(days=60))
        self._vaccination(no_due, None)

        expected = {
            'overdue': ['Overdue Vacc'],
            'due_soon': ['Due Soon Vacc'],
            'up_to_date': ['Current Vacc', 'No Due Vacc'],
            'none_recorded': ['Rex'],
        }
        for status_value, names in expected.items():
            response = self._get(
                '/api/clinic/patients/',
                params={'vaccination_status': status_value, 'page_size': 100},
            )
            self.assertEqual(response.status_code, 200, response.data)
            self.assertEqual(
                sorted(row['name'] for row in response.data['results']),
                names,
            )

        response = self._get(
            '/api/clinic/patients/',
            params={'vaccination_status': 'bogus'},
        )
        self.assertEqual(response.status_code, 400)

    def test_no_show_filter_and_counts(self):
        mixed = Pet.objects.create(
            own_id=self.owner,
            pet_name='Mixed Counts',
            pet_sex=Sex.MALE,
        )
        self._appointment(mixed, AppointmentStatus.CONFIRMED)
        self._appointment(mixed, AppointmentStatus.CANCELLED)
        self._appointment(mixed, AppointmentStatus.NO_SHOW)
        self._appointment(mixed, AppointmentStatus.NO_SHOW)

        response = self._get(
            '/api/clinic/patients/',
            params={'has_no_shows': 'true'},
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(
            [row['name'] for row in response.data['results']],
            ['Mixed Counts'],
        )
        row = response.data['results'][0]
        self.assertEqual(row['total_appointments'], 4)
        self.assertEqual(row['no_show_count'], 2)
        self.assertEqual(row['cancelled_count'], 1)

    def test_last_visit_excludes_no_shows_and_future_appointments(self):
        pet = Pet.objects.create(
            own_id=self.owner,
            pet_name='Visit Dates',
            pet_sex=Sex.MALE,
        )
        today = datetime.now(MNL).date()
        earlier = datetime.combine(
            today - timedelta(days=5), time(9, 0), tzinfo=MNL,
        )
        expected_last = datetime.combine(
            today - timedelta(days=2), time(9, 0), tzinfo=MNL,
        )
        self._appointment(pet, AppointmentStatus.COMPLETED, earlier)
        self._appointment(pet, AppointmentStatus.COMPLETED, expected_last)
        self._appointment(
            pet,
            AppointmentStatus.NO_SHOW,
            datetime.combine(today - timedelta(days=1), time(9, 0), tzinfo=MNL),
        )
        self._appointment(
            pet,
            AppointmentStatus.CANCELLED,
            datetime.combine(today - timedelta(days=1), time(10, 0), tzinfo=MNL),
        )
        self._appointment(
            pet,
            AppointmentStatus.CONFIRMED,
            datetime.combine(today + timedelta(days=1), time(9, 0), tzinfo=MNL),
        )

        response = self._get(
            '/api/clinic/patients/',
            params={'search': 'Visit Dates'},
        )
        row = response.data['results'][0]
        self.assertEqual(row['last_visit_date'], expected_last.date().isoformat())

    def test_early_morning_manila_dates_use_clinic_timezone(self):
        pet = Pet.objects.create(
            own_id=self.owner,
            pet_name='Manila Boundary',
            pet_sex=Sex.MALE,
        )
        today = datetime.now(MNL).date()
        last_visit = datetime.combine(
            today - timedelta(days=1), time(0, 30), tzinfo=MNL,
        )
        next_visit = datetime.combine(
            today + timedelta(days=2), time(0, 30), tzinfo=MNL,
        )
        self._appointment(pet, AppointmentStatus.COMPLETED, last_visit)
        self._appointment(pet, AppointmentStatus.CONFIRMED, next_visit)

        response = self._get(
            '/api/clinic/patients/',
            params={'search': 'Manila Boundary'},
        )
        row = response.data['results'][0]

        self.assertEqual(row['last_visit_date'], last_visit.date().isoformat())
        self.assertEqual(
            row['next_appointment_date'],
            next_visit.date().isoformat(),
        )

    def test_sorting_by_last_visit_and_no_shows(self):
        older = Pet.objects.create(
            own_id=self.owner,
            pet_name='Older Visit',
            pet_sex=Sex.MALE,
        )
        newer = Pet.objects.create(
            own_id=self.owner,
            pet_name='Newer Visit',
            pet_sex=Sex.MALE,
        )
        self._appointment(
            older,
            AppointmentStatus.COMPLETED,
            timezone.now() - timedelta(days=10),
        )
        self._appointment(
            newer,
            AppointmentStatus.COMPLETED,
            timezone.now() - timedelta(days=1),
        )
        self._appointment(newer, AppointmentStatus.NO_SHOW)

        response = self._get(
            '/api/clinic/patients/',
            params={'sort': 'last_visit', 'order': 'desc'},
        )
        names = [row['name'] for row in response.data['results']]
        self.assertLess(
            names.index('Newer Visit'),
            names.index('Older Visit'),
        )

        response = self._get(
            '/api/clinic/patients/',
            params={'sort': 'no_shows', 'order': 'desc'},
        )
        self.assertEqual(response.data['results'][0]['name'], 'Newer Visit')

    def test_pagination_and_invalid_page_params(self):
        for index in range(25):
            pet = Pet.objects.create(
                own_id=self.owner,
                pet_name=f'Paged {index:02d}',
                pet_sex=Sex.MALE,
            )
            self._appointment(pet, AppointmentStatus.COMPLETED)

        response = self._get('/api/clinic/patients/', params={'page_size': 10})
        self.assertEqual(response.data['total'], 26)
        self.assertEqual(response.data['page_size'], 10)
        self.assertEqual(len(response.data['results']), 10)
        self.assertEqual(response.data['total_pages'], 3)

        response = self._get(
            '/api/clinic/patients/',
            params={'page': 'abc', 'page_size': 'xyz'},
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['page'], 1)
        self.assertEqual(response.data['page_size'], 20)

    def test_query_count_is_constant_as_patients_grow(self):
        self._get('/api/clinic/patients/')

        with CaptureQueriesContext(connection) as small:
            response = self._get(
                '/api/clinic/patients/',
                params={'page_size': 100},
            )
        self.assertEqual(response.status_code, 200, response.data)
        small_count = len(small.captured_queries)

        for index in range(30):
            pet = Pet.objects.create(
                own_id=self.owner,
                pet_name=f'Bulk {index:02d}',
                pet_sex=Sex.MALE,
            )
            self._appointment(pet, AppointmentStatus.COMPLETED)

        with CaptureQueriesContext(connection) as large:
            response = self._get(
                '/api/clinic/patients/',
                params={'page_size': 100},
            )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(len(large.captured_queries), small_count)

    def _vaccination(self, pet, next_due):
        return VaccinationRecord.objects.create(
            pet_id=pet,
            vac_name='Rabies',
            vac_dose='1 ml',
            vac_route=VaccinationRoute.SUBCUTANEOUS,
            vac_date_given=datetime.now(MNL).date() - timedelta(days=365),
            vac_next_due=next_due,
            vac_source=VaccinationSource.VET,
            vac_notes='VAC-SECRET',
        )


class ClinicAdminPatientPermissionTests(ClinicAdminPatientBase):

    def test_clinic_admin_can_view_list_and_detail(self):
        self.assertEqual(self._get('/api/clinic/patients/').status_code, 200)
        self.assertEqual(self._detail().status_code, 200)
        self.assertEqual(self._history().status_code, 200)

    def test_other_clinic_admin_cannot_see_patient(self):
        response = self._get(
            '/api/clinic/patients/',
            user=self.other_admin,
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['total'], 1)
        self.assertEqual(
            [row['name'] for row in response.data['results']],
            ['Rival Pet'],
        )

        response = self._detail(user=self.other_admin)
        self.assertEqual(response.status_code, 404)

    def test_receptionist_vet_and_owner_are_forbidden(self):
        for user in (self.receptionist, self.vet_user, self.owner_user):
            response = self._get('/api/clinic/patients/', user=user)
            self.assertEqual(response.status_code, 403)
            response = self._detail(user=user)
            self.assertEqual(response.status_code, 403)
            response = self._history(user=user)
            self.assertEqual(response.status_code, 403)

    def test_admin_writes_are_forbidden(self):
        payload = {'pet_name': 'Hijacked'}

        response = self.client.post(
            '/api/clinic/patients/',
            payload,
            content_type='application/json',
            **self._auth(self.admin),
        )
        self.assertEqual(response.status_code, 403)

        response = self.client.patch(
            f'/api/clinic/patients/{self.patient.pet_id}/',
            payload,
            content_type='application/json',
            **self._auth(self.admin),
        )
        self.assertEqual(response.status_code, 403)

        response = self.client.delete(
            f'/api/clinic/patients/{self.patient.pet_id}/',
            **self._auth(self.admin),
        )
        self.assertEqual(response.status_code, 403)

        response = self.client.post(
            f'/api/clinic/patients/{self.patient.pet_id}/appointments/',
            payload,
            content_type='application/json',
            **self._auth(self.admin),
        )
        self.assertEqual(response.status_code, 403)

        self.patient.refresh_from_db()
        self.assertEqual(self.patient.pet_name, 'Rex')

    def test_missing_staff_profile_returns_400(self):
        loner = self._create_user(
            'patients-loner@clinic.test',
            UserRole.CLINIC_ADMIN,
            'Lone',
            'Admin',
        )
        response = self._get('/api/clinic/patients/', user=loner)
        self.assertEqual(response.status_code, 400)
        response = self._history(user=loner)
        self.assertEqual(response.status_code, 400)


class ClinicAdminPatientDetailTests(ClinicAdminPatientBase):

    def test_detail_returns_whitelisted_fields(self):
        response = self._detail()
        self.assertEqual(response.status_code, 200, response.data)

        self.assertEqual(
            set(response.data.keys()),
            {
                'id', 'name', 'profile_picture', 'breed', 'sex', 'age',
                'date_of_birth', 'weight', 'color', 'registered_at', 'owner',
                'summary', 'vaccination_status', 'vaccinations', 'appointments',
            },
        )
        self.assertEqual(
            set(response.data['summary'].keys()),
            {'consultations', 'vaccinations', 'ai_screenings'},
        )
        self.assertEqual(set(response.data['owner'].keys()), {'name', 'phone', 'email'})

        content = response.content.decode()
        for forbidden in ('CHIP-SECRET', 'QR-SECRET', 'SECRET-NOTES', 'VAC-SECRET'):
            self.assertNotIn(forbidden, content)

    def test_detail_404_for_non_patients_and_other_clinic(self):
        for pet in (self.cancelled_only, self.no_show_only, self.stray):
            response = self._detail(pet)
            self.assertEqual(response.status_code, 404, pet.pet_name)

    def test_summary_counts_are_scoped_correctly(self):
        own_consultation = Consultation.objects.create(
            apt_id=self.valid_appointment,
            stf_id=self.vet,
            con_diagnosis='SECRET-DIAGNOSIS',
            con_notes='SECRET-NOTES',
        )
        other_appointment = Appointment.objects.create(
            pet_id=self.patient,
            cln_id=self.other_clinic,
            apt_type=AppointmentType.CONSULTATION,
            apt_status=AppointmentStatus.COMPLETED,
            apt_scheduled_at=timezone.now() - timedelta(days=1),
        )
        Consultation.objects.create(
            apt_id=other_appointment,
            stf_id=self.vet,
            con_diagnosis='Other clinic diagnosis',
        )

        now_date = datetime.now(MNL).date()
        VaccinationRecord.objects.create(
            pet_id=self.patient,
            con_id=own_consultation,
            stf_id=self.vet,
            vac_name='Rabies',
            vac_dose='1 ml',
            vac_route=VaccinationRoute.SUBCUTANEOUS,
            vac_date_given=now_date - timedelta(days=365),
            vac_next_due=now_date - timedelta(days=1),
            vac_source=VaccinationSource.VET,
            vac_notes='VAC-SECRET',
        )
        VaccinationRecord.objects.create(
            pet_id=self.patient,
            vac_name='DHPPi',
            vac_dose='1 ml',
            vac_route=VaccinationRoute.SUBCUTANEOUS,
            vac_date_given=now_date - timedelta(days=200),
            vac_next_due=now_date + timedelta(days=60),
            vac_source=VaccinationSource.OWNER,
        )

        disease = Disease.objects.create(
            dis_code='DERM01',
            dis_name='Dermatitis',
        )
        AiScreening.objects.create(
            pet_id=self.patient,
            dis_id=disease,
            usr_id=self.owner_user,
            con_id=own_consultation,
            ais_confidence='87.50',
            ais_model_version='v1.0',
            ais_status=ScreeningStatus.PENDING_REVIEW,
            ais_source=ScreeningSource.DEVICE,
        )
        AiScreening.objects.create(
            pet_id=self.patient,
            dis_id=disease,
            usr_id=self.owner_user,
            con_id=other_appointment.consultation,
            ais_confidence='75.00',
            ais_model_version='v1.0',
            ais_status=ScreeningStatus.PENDING_REVIEW,
            ais_source=ScreeningSource.DEVICE,
        )

        response = self._detail()

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['summary']['consultations'], 1)
        self.assertEqual(response.data['summary']['vaccinations'], 2)
        self.assertEqual(response.data['summary']['ai_screenings'], 2)
        self.assertEqual(response.data['vaccination_status'], 'overdue')
        self.assertEqual(
            set(response.data['vaccinations'][0].keys()),
            {'name', 'date_given', 'next_due'},
        )

    def test_appointment_history_is_clinic_scoped_and_read_only(self):
        cancelled = self._appointment(
            self.patient,
            AppointmentStatus.CANCELLED,
            timezone.now() - timedelta(days=1),
            vet=self.vet,
            cancellation_reason='Owner unavailable',
        )
        no_show = self._appointment(
            self.patient,
            AppointmentStatus.NO_SHOW,
            timezone.now() - timedelta(days=3),
            vet=self.vet,
            cancellation_reason='Not applicable',
        )
        other_clinic = Appointment.objects.create(
            pet_id=self.patient,
            cln_id=self.other_clinic,
            apt_type=AppointmentType.CONSULTATION,
            apt_status=AppointmentStatus.COMPLETED,
            apt_scheduled_at=timezone.now(),
        )

        response = self._detail()
        self.assertEqual(response.status_code, 200, response.data)
        appointments = response.data['appointments']
        ids = [row['apt_id'] for row in appointments]

        self.assertEqual(len(appointments), 3)
        self.assertNotIn(str(other_clinic.apt_id), ids)
        self.assertEqual(
            set(appointments[0].keys()),
            {
                'apt_id', 'apt_scheduled_at', 'apt_type', 'apt_status',
                'vet_name', 'apt_cancellation_reason',
            },
        )

        by_id = {row['apt_id']: row for row in appointments}
        self.assertEqual(
            by_id[str(cancelled.apt_id)]['apt_cancellation_reason'],
            'Owner unavailable',
        )
        self.assertIsNone(
            by_id[str(no_show.apt_id)]['apt_cancellation_reason'],
        )
        self.assertEqual(
            by_id[str(cancelled.apt_id)]['vet_name'],
            'Vera Vet',
        )


class ClinicAdminPatientAppointmentHistoryTests(ClinicAdminPatientBase):
    """GET /api/clinic/patients/{id}/appointments/ — the paginated history."""

    def _seed(self, count):
        """Extra appointments with distinct, newest-first-able times."""
        created = []
        for index in range(count):
            created.append(self._appointment(
                self.patient,
                AppointmentStatus.COMPLETED,
                timezone.now() - timedelta(hours=index + 1),
                vet=self.vet,
            ))
        return created

    def test_envelope_follows_the_standard_list_shape(self):
        # Base fixture already has 1 appointment; 24 more make 25 total.
        self._seed(24)

        response = self._history()
        self.assertEqual(response.status_code, 200, response.data)
        data = response.data
        self.assertEqual(
            set(data.keys()),
            {'total', 'page', 'page_size', 'total_pages', 'results'},
        )
        self.assertEqual(data['total'], 25)
        self.assertEqual(data['page'], 1)
        self.assertEqual(data['page_size'], 10)
        self.assertEqual(data['total_pages'], 3)
        self.assertEqual(len(data['results']), 10)

    def test_pages_slice_the_full_history(self):
        self._seed(24)

        page_two = self._history(params={'page': 2})
        self.assertEqual(page_two.data['total'], 25)
        self.assertEqual(page_two.data['page'], 2)
        self.assertEqual(len(page_two.data['results']), 10)

        page_three = self._history(params={'page': 3})
        self.assertEqual(page_three.data['total_pages'], 3)
        self.assertEqual(len(page_three.data['results']), 5)

        # Beyond the last page: empty results, but the totals stay truthful.
        page_four = self._history(params={'page': 4})
        self.assertEqual(page_four.data['results'], [])
        self.assertEqual(page_four.data['total'], 25)
        self.assertEqual(page_four.data['total_pages'], 3)

    def test_results_are_newest_first_across_page_boundaries(self):
        self._seed(14)

        page_one = self._history(params={'page': 1}).data['results']
        page_two = self._history(params={'page': 2}).data['results']
        stamps = [
            row['apt_scheduled_at'] for row in page_one + page_two
        ]
        self.assertEqual(len(stamps), 15)
        self.assertEqual(stamps, sorted(stamps, reverse=True))

    def test_clinic_scoping_and_row_shape(self):
        other_clinic = Appointment.objects.create(
            pet_id=self.patient,
            cln_id=self.other_clinic,
            apt_type=AppointmentType.CONSULTATION,
            apt_status=AppointmentStatus.COMPLETED,
            apt_scheduled_at=timezone.now(),
        )
        cancelled = self._appointment(
            self.patient,
            AppointmentStatus.CANCELLED,
            timezone.now() - timedelta(hours=5),
            vet=self.vet,
            cancellation_reason='Owner unavailable',
        )

        response = self._history()
        self.assertEqual(response.status_code, 200, response.data)
        results = response.data['results']
        ids = [row['apt_id'] for row in results]
        self.assertNotIn(str(other_clinic.apt_id), ids)
        self.assertEqual(self._history().data['total'], 2)
        self.assertEqual(
            set(results[0].keys()),
            {
                'apt_id', 'apt_scheduled_at', 'apt_type', 'apt_status',
                'vet_name', 'apt_cancellation_reason',
            },
        )
        by_id = {row['apt_id']: row for row in results}
        self.assertEqual(
            by_id[str(cancelled.apt_id)]['apt_cancellation_reason'],
            'Owner unavailable',
        )

    def test_page_and_page_size_are_clamped(self):
        self._seed(24)

        oversized = self._history(params={'page_size': 1000})
        self.assertEqual(oversized.data['page_size'], 100)

        invalid_size = self._history(params={'page_size': 'many'})
        self.assertEqual(invalid_size.data['page_size'], 10)

        zero_page = self._history(params={'page': '0'})
        self.assertEqual(zero_page.data['page'], 1)

        invalid_page = self._history(params={'page': 'abc'})
        self.assertEqual(invalid_page.data['page'], 1)

    def test_soft_deleted_appointments_are_excluded(self):
        # A patient always has at least one qualifying appointment (the
        # detail/history guard is the canonical patient rule), so an empty
        # 200 response is unreachable; what matters is that a soft-deleted
        # row drops out while the pet stays a patient.
        keep = self._appointment(
            self.patient,
            AppointmentStatus.COMPLETED,
            timezone.now() - timedelta(days=1),
            vet=self.vet,
        )
        self.valid_appointment.apt_deleted_at = timezone.now()
        self.valid_appointment.save(update_fields=['apt_deleted_at'])

        response = self._history()
        self.assertEqual(response.status_code, 200, response.data)
        ids = [row['apt_id'] for row in response.data['results']]
        self.assertEqual(response.data['total'], 1)
        self.assertEqual(ids, [str(keep.apt_id)])
        self.assertNotIn(str(self.valid_appointment.apt_id), ids)

    def test_404_for_non_patients_and_other_clinic(self):
        for pet in (self.cancelled_only, self.no_show_only, self.stray):
            response = self._history(pet=pet)
            self.assertEqual(response.status_code, 404, pet.pet_name)

        response = self._history(user=self.other_admin)
        self.assertEqual(response.status_code, 404)

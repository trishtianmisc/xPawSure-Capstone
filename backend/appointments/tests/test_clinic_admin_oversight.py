from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from django.test import TestCase
from django.urls import resolve

from appointments.models import Appointment, AppointmentStatus, AppointmentType
from clinics.models import Clinic
from owners.models import OwnerProfile
from pets.models import Pet, Sex
from rest_framework_simplejwt.tokens import RefreshToken
from users.models import StaffPosition, StaffProfile, User, UserRole

MNL = ZoneInfo('Asia/Manila')

ADMIN_EMAIL = 'admin@clinic.test'
OTHER_ADMIN_EMAIL = 'admin2@clinic.test'
RECEPTIONIST_EMAIL = 'desk@clinic.test'
VET_EMAIL = 'vet@clinic.test'
OWNER_EMAIL = 'owner@clinic.test'


class OversightBase(TestCase):

    def setUp(self):
        self.clinic = Clinic.objects.create(cln_name='Happy Paws Clinic')
        self.other_clinic = Clinic.objects.create(cln_name='Rival Clinic')

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

        self.owner = self._create_user(
            OWNER_EMAIL, UserRole.OWNER, 'Olivia', 'Owner',
        )
        owner_profile = OwnerProfile.objects.create(usr_id=self.owner)
        self.pet = Pet.objects.create(
            own_id=owner_profile,
            pet_name='Rex',
            pet_sex=Sex.MALE,
        )

        # Fixed PHT dates: Oct 2 00:30 PHT == Oct 1 16:30 UTC — must bucket
        # to 2026-10-02 (Manila), not 2026-10-01.
        self.apt_oct1 = self._apt(datetime(2026, 10, 1, 23, 59, tzinfo=MNL))
        self.apt_oct2 = self._apt(datetime(2026, 10, 2, 0, 30, tzinfo=MNL))
        self.apt_oct3 = self._apt(
            datetime(2026, 10, 3, 12, 0, tzinfo=MNL), vet=self.vet,
        )
        self.apt_oct8 = self._apt(datetime(2026, 10, 8, 0, 0, tzinfo=MNL))
        self.apt_other_clinic = self._apt(
            datetime(2026, 10, 3, 12, 0, tzinfo=MNL),
            clinic=self.other_clinic,
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

    def _apt(self, scheduled_at, clinic=None, vet=None,
             status=AppointmentStatus.PENDING):
        return Appointment.objects.create(
            pet_id=self.pet,
            cln_id=clinic or self.clinic,
            stf_id=vet,
            apt_type=AppointmentType.CONSULTATION,
            apt_status=status,
            apt_scheduled_at=scheduled_at,
        )

    def _auth(self, user):
        refresh = RefreshToken()
        refresh['user_id'] = str(user.usr_id)
        refresh['token_version'] = user.usr_token_version
        return {'HTTP_AUTHORIZATION': f'Bearer {refresh.access_token}'}


class AppointmentListPermissionTests(OversightBase):

    def test_clinic_admin_can_list(self):
        response = self.client.get(
            '/api/appointments/', **self._auth(self.admin),
        )
        self.assertEqual(response.status_code, 200, response.data)

    def test_list_scoped_to_requesting_clinic(self):
        response = self.client.get(
            '/api/appointments/', page_size=100, **self._auth(self.admin),
        )
        self.assertEqual(response.status_code, 200)
        ids = {row['apt_id'] for row in response.data['results']}
        self.assertIn(str(self.apt_oct3.apt_id), ids)
        self.assertNotIn(str(self.apt_other_clinic.apt_id), ids)
        self.assertEqual(response.data['total'], 4)

    def test_receptionist_can_still_list(self):
        response = self.client.get(
            '/api/appointments/', **self._auth(self.receptionist),
        )
        self.assertEqual(response.status_code, 200, response.data)

    def test_owner_forbidden(self):
        response = self.client.get(
            '/api/appointments/', **self._auth(self.owner),
        )
        self.assertEqual(response.status_code, 403)

    def test_anonymous_forbidden(self):
        response = self.client.get('/api/appointments/')
        self.assertIn(response.status_code, (401, 403))

    def test_clinic_admin_cannot_create(self):
        response = self.client.post(
            '/api/appointments/', {}, format='json', **self._auth(self.admin),
        )
        self.assertEqual(response.status_code, 403)


class AppointmentDateRangeTests(OversightBase):

    def test_date_range_filters_on_manila_days(self):
        response = self.client.get(
            '/api/appointments/',
            {'date_from': '2026-10-02', 'date_to': '2026-10-07'},
            **self._auth(self.admin),
        )
        self.assertEqual(response.status_code, 200, response.data)
        ids = {row['apt_id'] for row in response.data['results']}
        self.assertEqual(
            ids, {str(self.apt_oct2.apt_id), str(self.apt_oct3.apt_id)},
        )

    def test_range_is_end_inclusive(self):
        response = self.client.get(
            '/api/appointments/',
            {'date_from': '2026-10-08', 'date_to': '2026-10-08'},
            **self._auth(self.admin),
        )
        self.assertEqual(response.status_code, 200)
        ids = {row['apt_id'] for row in response.data['results']}
        self.assertEqual(ids, {str(self.apt_oct8.apt_id)})

    def test_date_param_filters_on_manila_days(self):
        response = self.client.get(
            '/api/appointments/',
            {'date': '2026-10-01'},
            **self._auth(self.admin),
        )
        self.assertEqual(response.status_code, 200, response.data)
        ids = {row['apt_id'] for row in response.data['results']}
        # 23:59 PHT stays on Oct 1; Oct 2 00:30 PHT (Oct 1 16:30 UTC) excluded.
        self.assertEqual(ids, {str(self.apt_oct1.apt_id)})

        response = self.client.get(
            '/api/appointments/',
            {'date': '2026-10-02'},
            **self._auth(self.admin),
        )
        self.assertEqual(response.status_code, 200, response.data)
        ids = {row['apt_id'] for row in response.data['results']}
        # 00:30 PHT belongs to Oct 2 even though its UTC day is Oct 1.
        self.assertEqual(ids, {str(self.apt_oct2.apt_id)})

    def test_invalid_date_param_returns_400(self):
        response = self.client.get(
            '/api/appointments/',
            {'date': 'garbage'},
            **self._auth(self.admin),
        )
        self.assertEqual(response.status_code, 400)

    def test_vet_filter(self):
        response = self.client.get(
            '/api/appointments/',
            {'vet_id': str(self.vet.stf_id)},
            **self._auth(self.admin),
        )
        self.assertEqual(response.status_code, 200)
        ids = {row['apt_id'] for row in response.data['results']}
        self.assertEqual(ids, {str(self.apt_oct3.apt_id)})

    def test_status_filter(self):
        self._apt(
            datetime(2026, 10, 4, 9, 0, tzinfo=MNL),
            status=AppointmentStatus.COMPLETED,
        )
        response = self.client.get(
            '/api/appointments/',
            {'status': 'COMPLETED'},
            **self._auth(self.admin),
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['total'], 1)
        self.assertEqual(
            response.data['results'][0]['apt_status'], 'COMPLETED',
        )

    def test_invalid_date_format_returns_400(self):
        response = self.client.get(
            '/api/appointments/',
            {'date_from': '07-10-2026'},
            **self._auth(self.admin),
        )
        self.assertEqual(response.status_code, 400)

    def test_reversed_range_returns_400(self):
        response = self.client.get(
            '/api/appointments/',
            {'date_from': '2026-10-07', 'date_to': '2026-10-01'},
            **self._auth(self.admin),
        )
        self.assertEqual(response.status_code, 400)


class AppointmentVolumeTests(OversightBase):

    def test_requires_clinic_admin(self):
        response = self.client.get(
            '/api/appointments/volume/', **self._auth(self.receptionist),
        )
        self.assertEqual(response.status_code, 403)
        response = self.client.get(
            '/api/appointments/volume/', **self._auth(self.owner),
        )
        self.assertEqual(response.status_code, 403)

    def test_groups_by_manila_day_with_zero_fill(self):
        response = self.client.get(
            '/api/appointments/volume/',
            {'date_from': '2026-10-01', 'date_to': '2026-10-08'},
            **self._auth(self.admin),
        )
        self.assertEqual(response.status_code, 200, response.data)
        counts = {
            row['date']: row['count'] for row in response.data['results']
        }
        # Full window is returned with zero-filled gaps for chart timelines.
        self.assertEqual(len(counts), 8)
        # Oct 1 23:59 PHT -> 2026-10-01; Oct 2 00:30 PHT (Oct 1 16:30 UTC)
        # must bucket to 2026-10-02, proving Manila day boundaries.
        self.assertEqual(counts['2026-10-01'], 1)
        self.assertEqual(counts['2026-10-02'], 1)
        self.assertEqual(counts['2026-10-03'], 1)
        self.assertEqual(counts['2026-10-08'], 1)
        self.assertEqual(counts['2026-10-04'], 0)
        self.assertEqual(counts['2026-10-05'], 0)

    def test_vet_filter(self):
        response = self.client.get(
            '/api/appointments/volume/',
            {
                'date_from': '2026-10-01',
                'date_to': '2026-10-08',
                'vet_id': str(self.vet.stf_id),
            },
            **self._auth(self.admin),
        )
        self.assertEqual(response.status_code, 200)
        counts = {
            row['date']: row['count'] for row in response.data['results']
        }
        self.assertEqual(counts['2026-10-03'], 1)
        self.assertEqual(sum(counts.values()), 1)

    def test_status_filter(self):
        self._apt(
            datetime(2026, 10, 4, 9, 0, tzinfo=MNL),
            status=AppointmentStatus.CANCELLED,
        )
        response = self.client.get(
            '/api/appointments/volume/',
            {
                'date_from': '2026-10-01',
                'date_to': '2026-10-08',
                'status': 'CANCELLED',
            },
            **self._auth(self.admin),
        )
        self.assertEqual(response.status_code, 200)
        counts = {
            row['date']: row['count'] for row in response.data['results']
        }
        self.assertEqual(counts['2026-10-04'], 1)
        self.assertEqual(sum(counts.values()), 1)

    def test_default_window_is_last_30_days(self):
        inside = datetime.now(MNL).replace(
            hour=10, minute=0, second=0, microsecond=0,
        ) - timedelta(days=10)
        outside = inside - timedelta(days=50)
        self._apt(inside)
        self._apt(outside)

        response = self.client.get(
            '/api/appointments/volume/', **self._auth(self.admin),
        )
        self.assertEqual(response.status_code, 200)
        counts = {
            row['date']: row['count'] for row in response.data['results']
        }
        self.assertEqual(counts.get(inside.date().isoformat()), 1)
        self.assertNotIn(outside.date().isoformat(), counts)
        self.assertEqual(len(counts), 30)

    def test_invalid_date_returns_400(self):
        response = self.client.get(
            '/api/appointments/volume/',
            {'date_from': 'not-a-date'},
            **self._auth(self.admin),
        )
        self.assertEqual(response.status_code, 400)


class VeterinariansEndpointTests(OversightBase):

    def test_url_resolves(self):
        match = resolve('/api/veterinarians/')
        self.assertEqual(match.url_name, 'veterinarian-list-create')

    def test_clinic_admin_sees_clinic_vets_with_stf_ids(self):
        response = self.client.get(
            '/api/veterinarians/', page_size=100, **self._auth(self.admin),
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['total'], 1)
        self.assertEqual(response.data['results'][0]['id'], str(self.vet.stf_id))

    def test_other_clinic_admin_does_not_see_these_vets(self):
        response = self.client.get(
            '/api/veterinarians/', page_size=100,
            **self._auth(self.other_admin),
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['total'], 0)

    def test_receptionist_forbidden(self):
        response = self.client.get(
            '/api/veterinarians/', **self._auth(self.receptionist),
        )
        self.assertEqual(response.status_code, 403)

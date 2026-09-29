import json
import uuid
from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from appointments.models import Appointment, AppointmentStatus, AppointmentType
from clinics.models import Clinic
from consultations.models import Consultation
from owners.models import OwnerProfile
from pets.models import Breed, Pet, Sex
from users.models import StaffPosition, StaffProfile, User, UserRole
from vaccinations.models import VaccinationRecord, VaccinationRoute

PASSWORD = 'TestPass123!'
OWNER_EMAIL = 'vacowner@example.com'
FOREIGN_EMAIL = 'vacforeign@example.com'
VET_EMAIL = 'vacvet@example.com'

LIST_FIELDS = {
    'id', 'consultation_id', 'pet_id', 'pet_name', 'veterinarian',
    'name', 'brand', 'batch_no', 'dose', 'route',
    'date_given', 'next_due', 'notes', 'source', 'created_at',
}


class VaccinationBase(TestCase):

    def setUp(self):
        self.clinic = Clinic.objects.create(cln_name='Happy Paws Vaccinations')
        self.vet_user = self._create_user(VET_EMAIL, UserRole.VETERINARIAN, 'Vera', 'Vet')
        self.vet = StaffProfile.objects.create(
            usr_id=self.vet_user,
            cln_id=self.clinic,
            stf_position=StaffPosition.VETERINARIAN,
        )

        self.owner_user = self._create_user(OWNER_EMAIL, UserRole.OWNER, 'Olivia', 'Owner')
        self.owner = OwnerProfile.objects.create(usr_id=self.owner_user)
        self.breed = Breed.objects.create(brd_name='Labrador')
        self.pet = Pet.objects.create(
            own_id=self.owner,
            brd_id=self.breed,
            pet_name='Rex',
            pet_sex=Sex.MALE,
        )

        self.foreign_user = self._create_user(FOREIGN_EMAIL, UserRole.OWNER, 'Otto', 'Other')
        self.foreign_owner = OwnerProfile.objects.create(usr_id=self.foreign_user)
        self.foreign_pet = Pet.objects.create(
            own_id=self.foreign_owner,
            pet_name='Milo',
            pet_sex=Sex.MALE,
        )

        self.appointment = Appointment.objects.create(
            pet_id=self.pet,
            cln_id=self.clinic,
            stf_id=self.vet,
            apt_type=AppointmentType.VACCINATION,
            apt_status=AppointmentStatus.COMPLETED,
            apt_scheduled_at=timezone.now(),
        )
        self.foreign_appointment = Appointment.objects.create(
            pet_id=self.foreign_pet,
            cln_id=self.clinic,
            stf_id=self.vet,
            apt_type=AppointmentType.VACCINATION,
            apt_status=AppointmentStatus.COMPLETED,
            apt_scheduled_at=timezone.now(),
        )

        self.consultation = Consultation.objects.create(
            apt_id=self.appointment,
            stf_id=self.vet,
            con_diagnosis='Routine vaccination',
        )
        self.foreign_consultation = Consultation.objects.create(
            apt_id=self.foreign_appointment,
            stf_id=self.vet,
            con_diagnosis='Foreign diagnosis',
        )

        today = timezone.localdate()
        self.vaccination = VaccinationRecord.objects.create(
            con_id=self.consultation,
            pet_id=self.pet,
            stf_id=self.vet,
            vac_name='Rabies',
            vac_brand='Nobivac',
            vac_dose='1 ml',
            vac_route=VaccinationRoute.SUBCUTANEOUS,
            vac_date_given=today - timedelta(days=30),
            vac_next_due=today + timedelta(days=335),
        )
        self.foreign_vaccination = VaccinationRecord.objects.create(
            con_id=self.foreign_consultation,
            pet_id=self.foreign_pet,
            stf_id=self.vet,
            vac_name='Foreign vaccine',
            vac_dose='1 ml',
            vac_route=VaccinationRoute.ORAL,
            vac_date_given=today - timedelta(days=10),
        )

    def _create_user(self, email, role, first_name, last_name):
        user = User.objects.create(
            usr_email=email,
            usr_password_hash='hashed',
            usr_role=role,
            usr_first_name=first_name,
            usr_last_name=last_name,
        )
        user.set_password(PASSWORD)
        user.save()
        return user

    def _auth(self, email):
        response = self.client.post(
            '/api/auth/login/',
            {'email': email, 'password': PASSWORD},
        )
        self.assertEqual(response.status_code, 200, response.data)
        return {'HTTP_AUTHORIZATION': f"Bearer {response.data['access']}"}


class VaccinationListTests(VaccinationBase):

    def test_owner_lists_own_vaccinations(self):
        response = self.client.get('/api/vaccinations/', **self._auth(OWNER_EMAIL))
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(len(response.data), 1)

        record = response.data[0]
        self.assertEqual(set(record.keys()), LIST_FIELDS)
        self.assertEqual(record['id'], str(self.vaccination.vac_id))
        self.assertEqual(record['consultation_id'], str(self.consultation.con_id))
        self.assertEqual(record['pet_id'], str(self.pet.pet_id))
        self.assertEqual(record['pet_name'], 'Rex')
        self.assertEqual(record['veterinarian'], 'Vera Vet')
        self.assertEqual(record['name'], 'Rabies')
        self.assertEqual(record['brand'], 'Nobivac')
        self.assertEqual(record['route'], 'SUBCUTANEOUS')
        self.assertIsNotNone(record['next_due'])

    def test_list_excludes_other_owners_vaccinations(self):
        response = self.client.get('/api/vaccinations/', **self._auth(OWNER_EMAIL))
        ids = [item['id'] for item in response.data]
        self.assertNotIn(str(self.foreign_vaccination.vac_id), ids)

    def test_list_orders_by_date_given_desc(self):
        older = VaccinationRecord.objects.create(
            con_id=self.consultation,
            pet_id=self.pet,
            stf_id=self.vet,
            vac_name='DHPP',
            vac_dose='1 ml',
            vac_route=VaccinationRoute.INTRAMUSCULAR,
            vac_date_given=timezone.localdate() - timedelta(days=400),
        )

        response = self.client.get('/api/vaccinations/', **self._auth(OWNER_EMAIL))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 2)
        self.assertEqual(response.data[0]['id'], str(self.vaccination.vac_id))
        self.assertEqual(response.data[1]['id'], str(older.vac_id))

    def test_list_requires_authentication(self):
        response = self.client.get('/api/vaccinations/')
        self.assertEqual(response.status_code, 401)

    def test_list_filters_by_own_pet(self):
        response = self.client.get(
            f'/api/vaccinations/?pet_id={self.pet.pet_id}',
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

    def test_list_with_foreign_pet_filter_returns_empty(self):
        response = self.client.get(
            f'/api/vaccinations/?pet_id={self.foreign_pet.pet_id}',
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])

    def test_list_with_invalid_pet_filter_returns_400(self):
        response = self.client.get(
            '/api/vaccinations/?pet_id=not-a-uuid',
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 400)


class VaccinationDetailTests(VaccinationBase):

    def test_owner_reads_own_vaccination(self):
        response = self.client.get(
            f'/api/vaccinations/{self.vaccination.vac_id}/',
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['id'], str(self.vaccination.vac_id))
        self.assertEqual(response.data['name'], 'Rabies')
        self.assertEqual(response.data['pet_name'], 'Rex')

    def test_foreign_vaccination_returns_404(self):
        response = self.client.get(
            f'/api/vaccinations/{self.foreign_vaccination.vac_id}/',
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 404)

    def test_unknown_vaccination_returns_404(self):
        response = self.client.get(
            f'/api/vaccinations/{uuid.uuid4()}/',
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 404)

    def test_detail_requires_authentication(self):
        response = self.client.get(f'/api/vaccinations/{self.vaccination.vac_id}/')
        self.assertEqual(response.status_code, 401)


class VaccinationWriteTestMixin:

    def _create_payload(self, **overrides):
        payload = {
            'pet_id': str(self.pet.pet_id),
            'name': 'Leptospirosis',
            'brand': 'Zoetis',
            'batch_no': 'B-123',
            'dose': '1 ml',
            'route': 'SUBCUTANEOUS',
            'date_given': timezone.localdate().isoformat(),
            'next_due': (timezone.localdate() + timedelta(days=365)).isoformat(),
            'notes': 'No adverse reaction.',
        }
        payload.update(overrides)
        return payload

    def _create_owner_vaccination(self, **overrides):
        payload = self._create_payload(**overrides)
        response = self.client.post('/api/vaccinations/', payload, **self._auth(OWNER_EMAIL))
        self.assertEqual(response.status_code, 201, response.data)
        return response

    def _put_json(self, vac_id, payload, **auth):
        return self.client.put(
            f'/api/vaccinations/{vac_id}/',
            data=json.dumps(payload),
            content_type='application/json',
            **auth,
        )


class VaccinationCreateTests(VaccinationWriteTestMixin, VaccinationBase):

    def test_create_returns_201_with_owner_source(self):
        response = self.client.post(
            '/api/vaccinations/',
            self._create_payload(),
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['source'], 'OWNER')
        self.assertIsNone(response.data['veterinarian'])
        self.assertIsNone(response.data['consultation_id'])
        self.assertEqual(response.data['name'], 'Leptospirosis')
        self.assertEqual(response.data['pet_name'], 'Rex')

        record = VaccinationRecord.objects.get(vac_id=response.data['id'])
        self.assertIsNone(record.con_id)
        self.assertIsNone(record.stf_id)
        self.assertEqual(record.vac_source, 'OWNER')
        self.assertEqual(record.pet_id, self.pet)

    def test_create_missing_required_fields_returns_400(self):
        response = self.client.post(
            '/api/vaccinations/',
            {'pet_id': str(self.pet.pet_id)},
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 400)

    def test_create_future_date_returns_400(self):
        response = self.client.post(
            '/api/vaccinations/',
            self._create_payload(date_given=(timezone.localdate() + timedelta(days=1)).isoformat()),
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('date_given', response.data)

    def test_create_next_due_before_date_given_returns_400(self):
        response = self.client.post(
            '/api/vaccinations/',
            self._create_payload(next_due=(timezone.localdate() - timedelta(days=5)).isoformat()),
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('next_due', response.data)

    def test_create_invalid_route_returns_400(self):
        response = self.client.post(
            '/api/vaccinations/',
            self._create_payload(route='INJECTIONS'),
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 400)

    def test_create_foreign_pet_returns_404(self):
        response = self.client.post(
            '/api/vaccinations/',
            self._create_payload(pet_id=str(self.foreign_pet.pet_id)),
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 404)
        self.assertFalse(
            VaccinationRecord.objects.filter(pet_id=self.foreign_pet, vac_name='Leptospirosis').exists()
        )

    def test_create_requires_authentication(self):
        response = self.client.post('/api/vaccinations/', self._create_payload())
        self.assertEqual(response.status_code, 401)

    def test_veterinarian_cannot_use_owner_create(self):
        response = self.client.post(
            '/api/vaccinations/',
            self._create_payload(),
            **self._auth(VET_EMAIL),
        )
        self.assertEqual(response.status_code, 403)


class VaccinationUpdateTests(VaccinationWriteTestMixin, VaccinationBase):

    def test_owner_updates_own_record(self):
        created = self._create_owner_vaccination()
        vac_id = created.data['id']

        response = self._put_json(
            vac_id,
            self._create_payload(name='Leptospirosis 2nd dose', notes='Booster given.'),
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['name'], 'Leptospirosis 2nd dose')
        self.assertEqual(response.data['notes'], 'Booster given.')
        self.assertEqual(response.data['source'], 'OWNER')

        record = VaccinationRecord.objects.get(vac_id=vac_id)
        self.assertEqual(record.vac_name, 'Leptospirosis 2nd dose')

    def test_owner_cannot_update_vet_record(self):
        response = self._put_json(
            self.vaccination.vac_id,
            self._create_payload(name='Tampered'),
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 403)
        self.vaccination.refresh_from_db()
        self.assertEqual(self.vaccination.vac_name, 'Rabies')

    def test_foreign_vaccination_update_returns_404(self):
        response = self._put_json(
            self.foreign_vaccination.vac_id,
            self._create_payload(name='Tampered'),
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 404)
        self.foreign_vaccination.refresh_from_db()
        self.assertEqual(self.foreign_vaccination.vac_name, 'Foreign vaccine')

    def test_update_future_date_returns_400(self):
        created = self._create_owner_vaccination()
        response = self._put_json(
            created.data['id'],
            self._create_payload(date_given=(timezone.localdate() + timedelta(days=3)).isoformat()),
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 400)

    def test_update_next_due_before_date_given_returns_400(self):
        created = self._create_owner_vaccination()
        response = self._put_json(
            created.data['id'],
            self._create_payload(next_due=(timezone.localdate() - timedelta(days=1)).isoformat()),
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 400)

    def test_update_missing_required_fields_returns_400(self):
        created = self._create_owner_vaccination()
        response = self._put_json(
            created.data['id'],
            {'name': 'Missing everything else'},
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 400)

    def test_update_requires_authentication(self):
        response = self.client.put(
            f'/api/vaccinations/{self.vaccination.vac_id}/',
            data=json.dumps(self._create_payload()),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 401)

    def test_veterinarian_cannot_update(self):
        created = self._create_owner_vaccination()
        response = self._put_json(
            created.data['id'],
            self._create_payload(name='Staff edit'),
            **self._auth(VET_EMAIL),
        )
        self.assertEqual(response.status_code, 403)


class VaccinationDeleteTests(VaccinationWriteTestMixin, VaccinationBase):

    def test_owner_deletes_own_record(self):
        created = self._create_owner_vaccination()
        vac_id = created.data['id']

        response = self.client.delete(
            f'/api/vaccinations/{vac_id}/',
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 204)
        self.assertFalse(VaccinationRecord.objects.filter(vac_id=vac_id).exists())

        detail = self.client.get(f'/api/vaccinations/{vac_id}/', **self._auth(OWNER_EMAIL))
        self.assertEqual(detail.status_code, 404)

    def test_owner_cannot_delete_vet_record(self):
        response = self.client.delete(
            f'/api/vaccinations/{self.vaccination.vac_id}/',
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 403)
        self.assertTrue(VaccinationRecord.objects.filter(vac_id=self.vaccination.vac_id).exists())

    def test_foreign_vaccination_delete_returns_404(self):
        response = self.client.delete(
            f'/api/vaccinations/{self.foreign_vaccination.vac_id}/',
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 404)
        self.assertTrue(VaccinationRecord.objects.filter(vac_id=self.foreign_vaccination.vac_id).exists())

    def test_delete_requires_authentication(self):
        response = self.client.delete(f'/api/vaccinations/{self.vaccination.vac_id}/')
        self.assertEqual(response.status_code, 401)

    def test_veterinarian_cannot_delete(self):
        created = self._create_owner_vaccination()
        response = self.client.delete(
            f'/api/vaccinations/{created.data["id"]}/',
            **self._auth(VET_EMAIL),
        )
        self.assertEqual(response.status_code, 403)
        self.assertTrue(VaccinationRecord.objects.filter(vac_id=created.data['id']).exists())

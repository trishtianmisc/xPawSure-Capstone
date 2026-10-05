from django.test import TestCase

from ai_screenings.models import AiScreening, Disease, ScreeningSource, ScreeningStatus
from owners.models import OwnerProfile
from pets.models import Pet, Sex
from users.models import User, UserRole

PASSWORD = 'TestPass123!'
OWNER_EMAIL = 'scanowner@example.com'
OTHER_OWNER_EMAIL = 'scanother@example.com'
RECEPTIONIST_EMAIL = 'scandesk@example.com'


class OwnerScreeningBase(TestCase):

    def setUp(self):
        self.owner_user = self._create_user(OWNER_EMAIL, UserRole.OWNER, 'Olive', 'Owner')
        self.owner = OwnerProfile.objects.create(usr_id=self.owner_user)
        self.pet = Pet.objects.create(own_id=self.owner, pet_name='Rex', pet_sex=Sex.MALE)

        self.other_user = self._create_user(OTHER_OWNER_EMAIL, UserRole.OWNER, 'Otto', 'Other')
        self.other_owner = OwnerProfile.objects.create(usr_id=self.other_user)
        self.other_pet = Pet.objects.create(own_id=self.other_owner, pet_name='Milo', pet_sex=Sex.FEMALE)

        self.receptionist_user = self._create_user(
            RECEPTIONIST_EMAIL, UserRole.RECEPTIONIST, 'Rita', 'Desk',
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


class MockScreeningTests(OwnerScreeningBase):

    def test_mock_screening_created_with_fabricated_result(self):
        response = self.client.post(
            '/api/owner/screenings/',
            {'pet_id': str(self.pet.pet_id), 'source': 'MOCK'},
            format='json',
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['ais_source'], ScreeningSource.MOCK)
        self.assertEqual(response.data['ais_status'], ScreeningStatus.PENDING_REVIEW)
        self.assertEqual(response.data['ais_model_version'], 'mock-0.0.1')
        self.assertTrue(response.data['disease'])
        confidence = float(response.data['ais_confidence'])
        self.assertGreaterEqual(confidence, 62.0)
        self.assertLessEqual(confidence, 97.0)

    def test_mock_screening_for_other_owners_pet_returns_404(self):
        response = self.client.post(
            '/api/owner/screenings/',
            {'pet_id': str(self.other_pet.pet_id), 'source': 'MOCK'},
            format='json',
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 404)

    def test_seeded_diseases_exist(self):
        self.assertEqual(Disease.objects.count(), 5)


class DeviceScreeningTests(OwnerScreeningBase):

    def test_device_screening_with_valid_prediction(self):
        response = self.client.post(
            '/api/owner/screenings/',
            {
                'pet_id': str(self.pet.pet_id),
                'source': 'DEVICE',
                'prediction': 'MANGE',
                'confidence': 91.5,
                'model_version': '2.0.0',
                'inference_time_ms': 142,
                'device': 'Pixel 8',
            },
            format='json',
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['ais_source'], ScreeningSource.DEVICE)
        self.assertEqual(response.data['disease_code'], 'MANGE')
        self.assertEqual(response.data['ais_model_version'], '2.0.0')
        self.assertEqual(response.data['ais_inference_time_ms'], 142)

    def test_device_screening_unknown_prediction_returns_400(self):
        response = self.client.post(
            '/api/owner/screenings/',
            {
                'pet_id': str(self.pet.pet_id),
                'source': 'DEVICE',
                'prediction': 'NOT_A_DISEASE',
                'confidence': 80,
                'model_version': '2.0.0',
            },
            format='json',
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 400)

    def test_device_screening_missing_prediction_returns_400(self):
        response = self.client.post(
            '/api/owner/screenings/',
            {
                'pet_id': str(self.pet.pet_id),
                'source': 'DEVICE',
                'confidence': 80,
                'model_version': '2.0.0',
            },
            format='json',
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 400)


class ScreeningListTests(OwnerScreeningBase):

    def test_list_scoped_to_owner_and_filterable_by_pet(self):
        self.client.post(
            '/api/owner/screenings/',
            {'pet_id': str(self.pet.pet_id), 'source': 'MOCK'},
            format='json',
            **self._auth(OWNER_EMAIL),
        )
        self.client.post(
            '/api/owner/screenings/',
            {'pet_id': str(self.other_pet.pet_id), 'source': 'MOCK'},
            format='json',
            **self._auth(OTHER_OWNER_EMAIL),
        )

        response = self.client.get('/api/owner/screenings/', **self._auth(OWNER_EMAIL))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['total'], 1)
        self.assertEqual(response.data['results'][0]['pet_name'], 'Rex')

        filtered = self.client.get(
            '/api/owner/screenings/',
            {'pet_id': str(self.pet.pet_id)},
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(filtered.status_code, 200)
        self.assertEqual(filtered.data['total'], 1)

    def test_list_with_foreign_pet_id_returns_404(self):
        response = self.client.get(
            '/api/owner/screenings/',
            {'pet_id': str(self.other_pet.pet_id)},
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 404)

    def test_receptionist_cannot_use_owner_screening_endpoints(self):
        response = self.client.get('/api/owner/screenings/', **self._auth(RECEPTIONIST_EMAIL))
        self.assertEqual(response.status_code, 403)


class ScreeningModelTests(OwnerScreeningBase):

    def test_screening_status_defaults_to_pending_review(self):
        screening = AiScreening.objects.create(
            pet_id=self.pet,
            dis_id=Disease.objects.first(),
            ais_confidence=80,
            ais_model_version='mock-0.0.1',
        )
        self.assertEqual(screening.ais_status, ScreeningStatus.PENDING_REVIEW)
        self.assertEqual(screening.ais_source, ScreeningSource.MOCK)

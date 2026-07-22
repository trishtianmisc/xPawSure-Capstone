import io
import uuid
from pathlib import Path
from unittest.mock import patch

from django.conf import settings
from django.test import TestCase, override_settings
from PIL import Image

from owners.models import OwnerProfile
from pets.models import Breed, Pet, Sex
from pets.services.pet_service import PetService
from pets.utils.qr_generator import generate_qr_code
from users.models import User, UserRole


class QRGeneratorTest(TestCase):

    def test_generates_valid_png(self):
        data = str(uuid.uuid4())
        result = generate_qr_code(data)

        self.assertIsInstance(result, bytes)
        self.assertGreater(len(result), 100)

        img = Image.open(io.BytesIO(result))
        self.assertEqual(img.format, 'PNG')

    def test_encodes_correct_data(self):
        data = 'test-pet-uuid-12345'
        result = generate_qr_code(data)
        self.assertIsInstance(result, bytes)

    def test_different_inputs_produce_different_outputs(self):
        result_a = generate_qr_code('data-a')
        result_b = generate_qr_code('data-b')
        self.assertNotEqual(result_a, result_b)


class QRStorageServiceTest(TestCase):

    def tearDown(self):
        from django.conf import settings as s
        subdir = Path(s.MEDIA_ROOT) / 'qr_codes'
        if subdir.exists():
            import shutil
            shutil.rmtree(subdir)

    def test_saves_png_to_disk_and_returns_url(self):
        from pets.services.qr_service import QRStorageService

        qr_bytes = generate_qr_code(str(uuid.uuid4()))
        url = QRStorageService.save('pet-123', qr_bytes)

        expected_prefix = f'{settings.MEDIA_URL}qr_codes/'
        self.assertTrue(url.startswith(expected_prefix), f'URL {url} does not start with {expected_prefix}')
        self.assertTrue(url.endswith('.png'))

        relative_path = url[len(settings.MEDIA_URL):]
        filepath = Path(settings.MEDIA_ROOT) / relative_path
        self.assertTrue(filepath.exists(), f'File not found at {filepath}')
        self.assertGreater(filepath.stat().st_size, 100)


class PetServiceQRIntegrationTest(TestCase):

    def setUp(self):
        self.user = User.objects.create(
            usr_email='owner@example.com',
            usr_password_hash='hashed',
            usr_role=UserRole.OWNER,
            usr_first_name='John',
            usr_last_name='Doe',
        )
        self.owner_profile = OwnerProfile.objects.create(
            usr_id=self.user,
        )
        self.breed = Breed.objects.create(brd_name='Labrador')

    def tearDown(self):
        subdir = Path(settings.MEDIA_ROOT) / 'qr_codes'
        if subdir.exists():
            import shutil
            shutil.rmtree(subdir)

    def test_create_pet_generates_qr_code(self):
        pet = PetService.create(
            owner_profile=self.owner_profile,
            validated_data={
                'brd_id': self.breed.brd_id,
                'pet_name': 'Buddy',
                'pet_sex': Sex.MALE,
            },
            user_id=str(self.user.usr_id),
            ip_address='127.0.0.1',
        )

        self.assertIsNotNone(pet.pet_qr_code)
        self.assertEqual(pet.pet_qr_code, str(pet.pet_id))
        self.assertIsNotNone(pet.pet_qr_code_url)
        expected_prefix = f'{settings.MEDIA_URL}qr_codes/'
        self.assertTrue(
            pet.pet_qr_code_url.startswith(expected_prefix),
            f'URL {pet.pet_qr_code_url} does not start with {expected_prefix}',
        )
        self.assertTrue(pet.pet_qr_code_url.endswith('.png'))

        relative_path = pet.pet_qr_code_url[len(settings.MEDIA_URL):]
        filepath = Path(settings.MEDIA_ROOT) / relative_path
        self.assertTrue(filepath.exists(), f'File not found at {filepath}')
        self.assertGreater(filepath.stat().st_size, 100)

    def test_qr_image_is_valid_png(self):
        pet = PetService.create(
            owner_profile=self.owner_profile,
            validated_data={
                'brd_id': self.breed.brd_id,
                'pet_name': 'Max',
                'pet_sex': Sex.MALE,
            },
            user_id=str(self.user.usr_id),
        )

        relative_path = pet.pet_qr_code_url[len(settings.MEDIA_URL):]
        filepath = Path(settings.MEDIA_ROOT) / relative_path
        img = Image.open(filepath)
        self.assertEqual(img.format, 'PNG')

    def test_multiple_pets_get_unique_qr_codes(self):
        pet1 = PetService.create(
            owner_profile=self.owner_profile,
            validated_data={'brd_id': self.breed.brd_id, 'pet_name': 'A', 'pet_sex': Sex.MALE},
            user_id=str(self.user.usr_id),
        )
        pet2 = PetService.create(
            owner_profile=self.owner_profile,
            validated_data={'brd_id': self.breed.brd_id, 'pet_name': 'B', 'pet_sex': Sex.FEMALE},
            user_id=str(self.user.usr_id),
        )

        self.assertNotEqual(pet1.pet_qr_code, pet2.pet_qr_code)
        self.assertNotEqual(pet1.pet_qr_code_url, pet2.pet_qr_code_url)

    @patch('pets.services.pet_service.generate_qr_code')
    def test_transaction_rollback_on_qr_failure(self, mock_generate):
        mock_generate.side_effect = Exception('QR generation failed')

        with self.assertRaises(Exception):
            PetService.create(
                owner_profile=self.owner_profile,
                validated_data={
                    'brd_id': self.breed.brd_id,
                    'pet_name': 'Rollback',
                    'pet_sex': Sex.MALE,
                },
            )

        self.assertFalse(
            Pet.objects.filter(pet_name='Rollback').exists()
        )


class PetAPITest(TestCase):

    def setUp(self):
        self.password = 'TestPass123!'
        self.user = User.objects.create(
            usr_email='owner2@example.com',
            usr_password_hash='hashed',
            usr_role=UserRole.OWNER,
            usr_first_name='Jane',
            usr_last_name='Doe',
        )
        self.user.set_password(self.password)
        self.user.save()

        self.owner_profile = OwnerProfile.objects.create(
            usr_id=self.user,
        )
        self.breed = Breed.objects.create(brd_name='Beagle')

    def tearDown(self):
        subdir = Path(settings.MEDIA_ROOT) / 'qr_codes'
        if subdir.exists():
            import shutil
            shutil.rmtree(subdir)

    def _login(self):
        response = self.client.post('/api/auth/login/', {
            'email': 'owner2@example.com',
            'password': self.password,
        })
        return response.data['access']

    def _auth_header(self):
        return f'Bearer {self._login()}'

    def test_api_create_pet_returns_qr_fields(self):
        response = self.client.post(
            '/api/pets/',
            {
                'name': 'Charlie',
                'sex': 'MALE',
                'breed_id': str(self.breed.brd_id),
            },
            format='json',
            HTTP_AUTHORIZATION=self._auth_header(),
        )

        self.assertEqual(response.status_code, 201)
        self.assertIn('qr_code', response.data)
        self.assertIn('qr_code_url', response.data)
        self.assertIsNotNone(response.data['qr_code'])
        self.assertIsNotNone(response.data['qr_code_url'])

    def test_api_list_pets_includes_qr_fields(self):
        PetService.create(
            owner_profile=self.owner_profile,
            validated_data={
                'brd_id': self.breed.brd_id,
                'pet_name': 'Daisy',
                'pet_sex': Sex.FEMALE,
            },
            user_id=str(self.user.usr_id),
        )

        response = self.client.get(
            '/api/pets/',
            HTTP_AUTHORIZATION=self._auth_header(),
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertIn('qr_code', response.data[0])
        self.assertIn('qr_code_url', response.data[0])

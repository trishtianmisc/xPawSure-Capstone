import io
from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from PIL import Image

from core.storage_service import SupabaseStorageError, SupabaseStorageService
from owners.models import OwnerProfile
from pets.models import Breed, Sex
from pets.services.pet_service import PetService
from users.models import User, UserRole

SUPABASE_IMAGE_URL = 'https://test-project.supabase.co/storage/v1/object/public/pet-images/pet123/abc.jpg'
SUPABASE_QR_URL = 'https://test-project.supabase.co/storage/v1/object/public/qr-codes/pet123/abc.png'


def make_test_image(content_type='image/jpeg', width=100, height=100, fmt='JPEG'):
    buffer = io.BytesIO()
    img = Image.new('RGB', (width, height), color='red')
    img.save(buffer, format=fmt)
    return SimpleUploadedFile('test.jpg', buffer.getvalue(), content_type=content_type)


class SupabaseStorageServiceTest(TestCase):

    @patch('core.storage_service.http_requests.post')
    def test_upload_returns_public_url(self, mock_post):
        mock_post.return_value.status_code = 200
        mock_post.return_value.text = '{}'

        url = SupabaseStorageService.upload(
            bucket='pet-images',
            file_bytes=b'fake-bytes',
            content_type='image/jpeg',
            object_path='pet-abc/test.jpg',
        )

        from django.conf import settings
        expected = f'{settings.SUPABASE_URL.rstrip("/")}/storage/v1/object/public/pet-images/pet-abc/test.jpg'
        self.assertEqual(url, expected)
        mock_post.assert_called_once()

    @patch('core.storage_service.http_requests.post')
    def test_upload_raises_on_failure(self, mock_post):
        mock_post.return_value.status_code = 500
        mock_post.return_value.text = 'server error'

        with self.assertRaises(SupabaseStorageError):
            SupabaseStorageService.upload(
                bucket='pet-images',
                file_bytes=b'data',
                content_type='image/jpeg',
                object_path='path/test.jpg',
            )

    @patch('core.storage_service.http_requests.post')
    def test_upload_raises_on_network_error(self, mock_post):
        import requests
        mock_post.side_effect = requests.ConnectionError('network down')

        with self.assertRaises(SupabaseStorageError):
            SupabaseStorageService.upload(
                bucket='pet-images',
                file_bytes=b'data',
                content_type='image/jpeg',
                object_path='path/test.jpg',
            )

    def test_build_object_path_format(self):
        path = SupabaseStorageService.build_object_path('pet-abc', 'png')
        self.assertTrue(path.startswith('pet-abc/'))
        self.assertTrue(path.endswith('.png'))
        filename = path.split('/')[1]
        self.assertGreater(len(filename), 10)

    @patch('core.storage_service.http_requests.delete')
    def test_delete_returns_true_on_success(self, mock_delete):
        mock_delete.return_value.status_code = 200
        result = SupabaseStorageService.delete('pet-images', 'path/test.jpg')
        self.assertTrue(result)

    @patch('core.storage_service.http_requests.delete')
    def test_delete_returns_true_on_not_found(self, mock_delete):
        mock_delete.return_value.status_code = 404
        result = SupabaseStorageService.delete('pet-images', 'missing.jpg')
        self.assertTrue(result)


class PetImageUploadTest(TestCase):

    def setUp(self):
        self.user = User.objects.create(
            usr_email='imgowner@example.com',
            usr_password_hash='hashed',
            usr_role=UserRole.OWNER,
            usr_first_name='Img',
            usr_last_name='Owner',
        )
        self.owner_profile = OwnerProfile.objects.create(usr_id=self.user)
        self.breed = Breed.objects.create(brd_name='Poodle')

    @patch('pets.services.qr_service.QRStorageService.save', return_value=SUPABASE_QR_URL)
    @patch('core.storage_service.SupabaseStorageService.upload', return_value=SUPABASE_IMAGE_URL)
    def test_create_pet_with_image(self, mock_upload, mock_qr):
        image = make_test_image()

        pet = PetService.create(
            owner_profile=self.owner_profile,
            validated_data={
                'brd_id': self.breed.brd_id,
                'pet_name': 'Rex',
                'pet_sex': Sex.MALE,
                'pet_profile_image': image,
            },
            user_id=str(self.user.usr_id),
        )

        self.assertEqual(pet.pet_profile_image, SUPABASE_IMAGE_URL)
        mock_upload.assert_called_once()
        call_kwargs = mock_upload.call_args
        self.assertEqual(call_kwargs.kwargs['bucket'], 'pet-images')
        self.assertEqual(call_kwargs.kwargs['content_type'], 'image/jpeg')

    @patch('pets.services.qr_service.QRStorageService.save', return_value=SUPABASE_QR_URL)
    @patch('core.storage_service.SupabaseStorageService.upload')
    def test_create_pet_without_image(self, mock_upload, mock_qr):
        pet = PetService.create(
            owner_profile=self.owner_profile,
            validated_data={
                'brd_id': self.breed.brd_id,
                'pet_name': 'Bella',
                'pet_sex': Sex.FEMALE,
            },
            user_id=str(self.user.usr_id),
        )

        self.assertIsNone(pet.pet_profile_image)
        mock_upload.assert_not_called()

    @patch('pets.services.qr_service.QRStorageService.save', return_value=SUPABASE_QR_URL)
    @patch('core.storage_service.SupabaseStorageService.upload')
    def test_create_pet_rolls_back_on_image_upload_failure(self, mock_upload, mock_qr):
        mock_upload.side_effect = SupabaseStorageError('upload failed')

        with self.assertRaises(SupabaseStorageError):
            PetService.create(
                owner_profile=self.owner_profile,
                validated_data={
                    'brd_id': self.breed.brd_id,
                    'pet_name': 'FailPet',
                    'pet_sex': Sex.MALE,
                    'pet_profile_image': make_test_image(),
                },
                user_id=str(self.user.usr_id),
            )

        from pets.models import Pet
        self.assertFalse(Pet.objects.filter(pet_name='FailPet').exists())


class PetImageValidationTest(TestCase):

    def setUp(self):
        self.user = User.objects.create(
            usr_email='valowner@example.com',
            usr_password_hash='hashed',
            usr_role=UserRole.OWNER,
            usr_first_name='Val',
            usr_last_name='Owner',
        )
        self.owner_profile = OwnerProfile.objects.create(usr_id=self.user)
        self.breed = Breed.objects.create(brd_name='Lab')

    @patch('pets.services.qr_service.QRStorageService.save', return_value=SUPABASE_QR_URL)
    @patch('core.storage_service.SupabaseStorageService.upload', return_value=SUPABASE_IMAGE_URL)
    def test_api_create_pet_with_multipart_image(self, mock_upload, mock_qr):
        self.user.set_password('TestPass123!')
        self.user.save()

        response = self.client.post('/api/auth/login/', {
            'email': 'valowner@example.com',
            'password': 'TestPass123!',
        })
        token = response.data['access']

        image = make_test_image()
        response = self.client.post(
            '/api/pets/',
            {
                'name': 'Milo',
                'sex': 'MALE',
                'breed_id': str(self.breed.brd_id),
                'profile_picture': image,
            },
            format='multipart',
            HTTP_AUTHORIZATION=f'Bearer {token}',
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['profile_picture'], SUPABASE_IMAGE_URL)
        mock_upload.assert_called_once()

    def test_api_rejects_invalid_image_type(self):
        self.user.set_password('TestPass123!')
        self.user.save()

        response = self.client.post('/api/auth/login/', {
            'email': 'valowner@example.com',
            'password': 'TestPass123!',
        })
        token = response.data['access']

        bad_file = SimpleUploadedFile('evil.exe', b'MZ...', content_type='application/x-msdownload')
        response = self.client.post(
            '/api/pets/',
            {
                'name': 'BadPet',
                'sex': 'MALE',
                'breed_id': str(self.breed.brd_id),
                'profile_picture': bad_file,
            },
            format='multipart',
            HTTP_AUTHORIZATION=f'Bearer {token}',
        )

        self.assertEqual(response.status_code, 400)

    def test_api_rejects_oversized_image(self):
        self.user.set_password('TestPass123!')
        self.user.save()

        response = self.client.post('/api/auth/login/', {
            'email': 'valowner@example.com',
            'password': 'TestPass123!',
        })
        token = response.data['access']

        big_image = make_test_image(width=3000, height=3000, fmt='PNG')
        if big_image.size <= 2 * 1024 * 1024:
            big_image = SimpleUploadedFile('big.jpg', big_image.read() + b'\x00' * (2 * 1024 * 1024 + 1), content_type='image/jpeg')

        response = self.client.post(
            '/api/pets/',
            {
                'name': 'BigPet',
                'sex': 'MALE',
                'breed_id': str(self.breed.brd_id),
                'profile_picture': big_image,
            },
            format='multipart',
            HTTP_AUTHORIZATION=f'Bearer {token}',
        )

        self.assertEqual(response.status_code, 400)

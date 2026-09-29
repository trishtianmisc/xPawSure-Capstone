import io
import json
from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.test.client import BOUNDARY, MULTIPART_CONTENT, encode_multipart
from PIL import Image

from audit_log.models import AuditAction, AuditLog
from owners.models import OwnerProfile
from pets.models import Breed, Pet, Sex
from users.models import User, UserRole

PASSWORD = 'TestPass123!'
OWNER_EMAIL = 'petowner@example.com'
FOREIGN_EMAIL = 'petforeign@example.com'

SUPABASE_IMAGE_URL = (
    'https://test-project.supabase.co/storage/v1/object/public'
    '/pet-images/abc123/pet.jpg'
)
SUPABASE_QR_URL = (
    'https://test-project.supabase.co/storage/v1/object/public'
    '/qr-codes/abc123/pet.png'
)


def make_image(content_type='image/jpeg', fmt='JPEG', filename='pet.jpg'):
    buffer = io.BytesIO()
    Image.new('RGB', (50, 50), color='green').save(buffer, format=fmt)
    return SimpleUploadedFile(filename, buffer.getvalue(), content_type=content_type)


class PetUpdateDeleteBase(TestCase):

    def setUp(self):
        self.owner_user = self._create_user(OWNER_EMAIL, UserRole.OWNER, 'Pet', 'Owner')
        self.owner = OwnerProfile.objects.create(usr_id=self.owner_user)
        self.foreign_user = self._create_user(FOREIGN_EMAIL, UserRole.OWNER, 'Other', 'Owner')
        self.foreign_owner = OwnerProfile.objects.create(usr_id=self.foreign_user)
        self.breed = Breed.objects.create(brd_name='Beagle')
        self.pet = Pet.objects.create(
            own_id=self.owner,
            brd_id=self.breed,
            pet_name='Rex',
            pet_sex=Sex.MALE,
            pet_color='Brown',
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

    def _path(self):
        return f'/api/pets/{self.pet.pet_id}/'

    def _put_json(self, payload, **auth):
        return self.client.put(
            self._path(),
            data=json.dumps(payload),
            content_type='application/json',
            **auth,
        )

    def _put_multipart(self, data, **auth):
        # Django's test client does not multipart-encode PUT bodies, so encode
        # manually and send through generic() to preserve the boundary header.
        body = encode_multipart(BOUNDARY, data)
        return self.client.generic('PUT', self._path(), body, MULTIPART_CONTENT, **auth)


class PetUpdateTests(PetUpdateDeleteBase):

    def test_owner_can_update_own_pet(self):
        response = self._put_json(
            {'name': 'Rexy', 'weight': '12.50', 'color': 'Black'},
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['name'], 'Rexy')
        self.assertEqual(str(response.data['weight']), '12.50')
        self.pet.refresh_from_db()
        self.assertEqual(self.pet.pet_name, 'Rexy')
        self.assertEqual(str(self.pet.pet_weight), '12.50')

    def test_owner_can_change_breed(self):
        new_breed = Breed.objects.create(brd_name='Labrador')
        response = self._put_json(
            {'breed_id': str(new_breed.brd_id)},
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['breed_id'], str(new_breed.brd_id))
        self.assertEqual(response.data['breed_name'], 'Labrador')

    def test_update_rejects_unknown_breed(self):
        response = self._put_json(
            {'breed_id': '00000000-0000-0000-0000-000000000000'},
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 400)
        self.pet.refresh_from_db()
        self.assertEqual(self.pet.brd_id_id, self.breed.brd_id)

    def test_update_rejects_future_birth_date(self):
        response = self._put_json(
            {'date_of_birth': '2999-01-01'},
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 400)

    def test_update_rejects_non_positive_weight(self):
        response = self._put_json({'weight': '0'}, **self._auth(OWNER_EMAIL))
        self.assertEqual(response.status_code, 400)

    def test_update_rejects_invalid_sex(self):
        response = self._put_json({'sex': 'UNKNOWN'}, **self._auth(OWNER_EMAIL))
        self.assertEqual(response.status_code, 400)

    def test_update_rejects_duplicate_microchip(self):
        Pet.objects.create(
            own_id=self.owner,
            brd_id=self.breed,
            pet_name='Other',
            pet_sex=Sex.FEMALE,
            pet_microchip_no='CHIP-1',
        )
        response = self._put_json(
            {'microchip_number': 'CHIP-1'},
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 400)

    def test_update_allows_own_microchip_and_clears_with_blank(self):
        self.pet.pet_microchip_no = 'CHIP-9'
        self.pet.save()

        response = self._put_json(
            {'microchip_number': 'CHIP-9', 'name': 'Rex'},
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 200, response.data)

        response = self._put_json(
            {'microchip_number': ''},
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.pet.refresh_from_db()
        self.assertIsNone(self.pet.pet_microchip_no)

    def test_foreign_owner_cannot_update_pet(self):
        response = self._put_json(
            {'name': 'Hacked'},
            **self._auth(FOREIGN_EMAIL),
        )
        self.assertEqual(response.status_code, 404)
        self.pet.refresh_from_db()
        self.assertEqual(self.pet.pet_name, 'Rex')

    def test_update_requires_authentication(self):
        response = self.client.put(
            self._path(),
            data=json.dumps({'name': 'Nope'}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 401)

    def test_update_with_empty_body_is_noop(self):
        auth = self._auth(OWNER_EMAIL)
        audit_before = AuditLog.objects.count()
        response = self._put_json({}, **auth)
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['name'], 'Rex')
        self.assertEqual(AuditLog.objects.count(), audit_before)

    def test_update_logs_audit_with_old_and_new_values(self):
        response = self._put_json({'name': 'Max'}, **self._auth(OWNER_EMAIL))
        self.assertEqual(response.status_code, 200, response.data)

        log = AuditLog.objects.get(
            adl_record_id=str(self.pet.pet_id),
            adl_action=AuditAction.UPDATE,
        )
        self.assertEqual(log.adl_module, 'pets')
        self.assertEqual(log.adl_table_name, 'PET')
        self.assertEqual(log.adl_description, 'Pet updated: Max')
        self.assertEqual(log.adl_old_values['pet_name'], 'Rex')
        self.assertEqual(log.adl_new_values['pet_name'], 'Max')

    @patch('pets.services.pet_service.SupabaseStorageService.upload', return_value=SUPABASE_IMAGE_URL)
    def test_update_with_image_uploads_and_saves_url(self, mock_upload):
        response = self._put_multipart(
            {'name': 'Rex', 'profile_picture': make_image()},
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['profile_picture'], SUPABASE_IMAGE_URL)
        mock_upload.assert_called_once()
        call_kwargs = mock_upload.call_args.kwargs
        self.assertEqual(call_kwargs['bucket'], 'pet-images')
        self.assertTrue(call_kwargs['object_path'].startswith(str(self.pet.pet_id)))

    def test_update_with_null_picture_clears_it(self):
        self.pet.pet_profile_image = SUPABASE_IMAGE_URL
        self.pet.save()

        response = self._put_json({'profile_picture': None}, **self._auth(OWNER_EMAIL))
        self.assertEqual(response.status_code, 200, response.data)
        self.assertIsNone(response.data['profile_picture'])
        self.pet.refresh_from_db()
        self.assertIsNone(self.pet.pet_profile_image)

    def test_update_rejects_unsupported_image_type(self):
        bad_file = SimpleUploadedFile(
            'evil.exe',
            b'MZ...',
            content_type='application/x-msdownload',
        )
        response = self._put_multipart(
            {'name': 'Rex', 'profile_picture': bad_file},
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 400)
        self.pet.refresh_from_db()
        self.assertEqual(self.pet.pet_name, 'Rex')

    def test_update_rejects_gif_image(self):
        response = self._put_multipart(
            {'name': 'Rex', 'profile_picture': make_image(content_type='image/gif', fmt='GIF', filename='pet.gif')},
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 400)


class PetDeleteTests(PetUpdateDeleteBase):

    def test_owner_soft_deletes_own_pet(self):
        response = self.client.delete(self._path(), **self._auth(OWNER_EMAIL))
        self.assertEqual(response.status_code, 204)

        self.pet.refresh_from_db()
        self.assertIsNotNone(self.pet.pet_deleted_at)
        self.assertFalse(self.pet.pet_is_active)

    def test_deleted_pet_disappears_from_list_and_detail(self):
        auth = self._auth(OWNER_EMAIL)
        response = self.client.delete(self._path(), **auth)
        self.assertEqual(response.status_code, 204)

        list_response = self.client.get('/api/pets/', **auth)
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(list_response.data, [])

        detail_response = self.client.get(self._path(), **auth)
        self.assertEqual(detail_response.status_code, 404)

    def test_delete_logs_audit(self):
        response = self.client.delete(self._path(), **self._auth(OWNER_EMAIL))
        self.assertEqual(response.status_code, 204)

        log = AuditLog.objects.get(
            adl_record_id=str(self.pet.pet_id),
            adl_action=AuditAction.DELETE,
        )
        self.assertEqual(log.adl_module, 'pets')
        self.assertEqual(log.adl_description, 'Pet deleted: Rex')

    def test_foreign_owner_cannot_delete_pet(self):
        response = self.client.delete(self._path(), **self._auth(FOREIGN_EMAIL))
        self.assertEqual(response.status_code, 404)

        self.pet.refresh_from_db()
        self.assertTrue(self.pet.pet_is_active)
        self.assertIsNone(self.pet.pet_deleted_at)

    def test_delete_requires_authentication(self):
        response = self.client.delete(self._path())
        self.assertEqual(response.status_code, 401)

        self.pet.refresh_from_db()
        self.assertTrue(self.pet.pet_is_active)

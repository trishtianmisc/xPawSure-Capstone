import io
import json
from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.test.client import BOUNDARY, MULTIPART_CONTENT, encode_multipart
from django.utils import timezone
from PIL import Image

from appointments.models import Appointment, AppointmentStatus, AppointmentType
from clinics.models import Clinic
from owners.models import OwnerProfile
from pets.models import Pet, Sex
from users.models import StaffPosition, StaffProfile, User, UserRole

PASSWORD = 'TestPass123!'
OWNER_EMAIL = 'proowner@example.com'
OTHER_EMAIL = 'proother@example.com'
VET_EMAIL = 'provet@example.com'
DESK_EMAIL = 'prodesk@example.com'

SUPABASE_PICTURE_URL = (
    'https://test-project.supabase.co/storage/v1/object/public'
    '/owner-images/abc123/avatar.jpg'
)

GET_FIELDS = {'id', 'user', 'clinic', 'address', 'profile_picture'}
USER_FIELDS = {'id', 'email', 'full_name', 'phone'}


def make_image(content_type='image/jpeg', fmt='JPEG', filename='avatar.jpg'):
    buffer = io.BytesIO()
    Image.new('RGB', (50, 50), color='blue').save(buffer, format=fmt)
    return SimpleUploadedFile(filename, buffer.getvalue(), content_type=content_type)


class OwnerProfileBase(TestCase):

    def setUp(self):
        self.owner_user = self._create_user(OWNER_EMAIL, UserRole.OWNER, 'Olga', 'Owner')
        self.owner_user.usr_phone = '+15551234567'
        self.owner_user.save()
        self.owner = OwnerProfile.objects.create(
            usr_id=self.owner_user,
            own_address='12 Old Road',
        )
        self.vet_user = self._create_user(VET_EMAIL, UserRole.VETERINARIAN, 'Vic', 'Vet')

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

    def _put_multipart(self, path, data, **auth):
        # Django's test client does not multipart-encode PUT bodies, so encode
        # manually and send through generic() to preserve the boundary header.
        body = encode_multipart(BOUNDARY, data)
        return self.client.generic('PUT', path, body, MULTIPART_CONTENT, **auth)


class OwnerProfileGetTests(OwnerProfileBase):

    def test_get_returns_spec_shape(self):
        response = self.client.get('/api/owner/profile/', **self._auth(OWNER_EMAIL))
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(set(response.data.keys()), GET_FIELDS)
        self.assertEqual(set(response.data['user'].keys()), USER_FIELDS)
        self.assertEqual(response.data['user']['full_name'], 'Olga Owner')
        self.assertEqual(response.data['user']['email'], OWNER_EMAIL)
        self.assertEqual(response.data['user']['phone'], '+15551234567')
        self.assertIsNone(response.data['clinic'])
        self.assertEqual(response.data['address'], '12 Old Road')
        self.assertEqual(response.data['profile_picture'], '')
        self.assertEqual(str(response.data['id']), str(self.owner.own_id))

    def test_get_requires_owner_role(self):
        response = self.client.get('/api/owner/profile/', **self._auth(VET_EMAIL))
        self.assertEqual(response.status_code, 403)

    def test_get_unauthenticated_is_rejected(self):
        response = self.client.get('/api/owner/profile/')
        self.assertIn(response.status_code, (401, 403))

    def test_get_owner_without_profile_returns_404(self):
        self._create_user(OTHER_EMAIL, UserRole.OWNER, 'Otto', 'NoProfile')
        response = self.client.get('/api/owner/profile/', **self._auth(OTHER_EMAIL))
        self.assertEqual(response.status_code, 404)


class OwnerProfileUpdateTests(OwnerProfileBase):

    def test_put_updates_address_as_multipart(self):
        response = self._put_multipart(
            '/api/owner/profile/',
            {'address': '45 New Avenue'},
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['address'], '45 New Avenue')
        self.owner.refresh_from_db()
        self.assertEqual(self.owner.own_address, '45 New Avenue')

    def test_put_updates_address_as_json(self):
        response = self.client.put(
            '/api/owner/profile/',
            data=json.dumps({'address': '9 JSON Street'}),
            content_type='application/json',
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['address'], '9 JSON Street')

    def test_put_empty_body_returns_current_profile(self):
        response = self.client.put(
            '/api/owner/profile/',
            data=json.dumps({}),
            content_type='application/json',
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['address'], '12 Old Road')

    @patch('owners.services.SupabaseStorageService.upload', return_value=SUPABASE_PICTURE_URL)
    def test_put_with_picture_uploads_and_saves_url(self, mock_upload):
        response = self._put_multipart(
            '/api/owner/profile/',
            {'address': '12 Old Road', 'profile_picture': make_image()},
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['profile_picture'], SUPABASE_PICTURE_URL)
        mock_upload.assert_called_once()
        call_kwargs = mock_upload.call_args.kwargs
        self.assertEqual(call_kwargs['bucket'], 'owner-images')
        self.assertTrue(call_kwargs['object_path'].startswith(str(self.owner.own_id)))
        self.assertTrue(call_kwargs['object_path'].endswith('.jpg'))

    def test_put_with_picture_rejects_unsupported_type(self):
        response = self._put_multipart(
            '/api/owner/profile/',
            {'profile_picture': make_image(content_type='image/gif', fmt='GIF', filename='avatar.gif')},
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 400)

    def test_put_with_picture_rejects_oversized_file(self):
        buffer = io.BytesIO()
        Image.new('RGB', (50, 50), color='red').save(buffer, format='JPEG')
        oversized = SimpleUploadedFile(
            'avatar.jpg',
            buffer.getvalue() + b'\x00' * (2 * 1024 * 1024 + 1),
            content_type='image/jpeg',
        )
        response = self._put_multipart(
            '/api/owner/profile/',
            {'profile_picture': oversized},
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 400)

    def test_put_with_null_picture_clears_it(self):
        self.owner.own_profile_image = SUPABASE_PICTURE_URL
        self.owner.save(update_fields=['own_profile_image'])

        response = self.client.put(
            '/api/owner/profile/',
            data=json.dumps({'profile_picture': None}),
            content_type='application/json',
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['profile_picture'], '')
        self.owner.refresh_from_db()
        self.assertIsNone(self.owner.own_profile_image)

    def test_put_requires_owner_role(self):
        response = self.client.put(
            '/api/owner/profile/',
            data=json.dumps({'address': 'Nope'}),
            content_type='application/json',
            **self._auth(VET_EMAIL),
        )
        self.assertEqual(response.status_code, 403)


class OwnerListTests(OwnerProfileBase):

    def setUp(self):
        super().setUp()
        self.receptionist_user = self._create_user(
            DESK_EMAIL, UserRole.RECEPTIONIST, 'Rita', 'Desk',
        )
        self.clinic = Clinic.objects.create(cln_name='Pro Desk Clinic')
        StaffProfile.objects.create(
            usr_id=self.receptionist_user,
            cln_id=self.clinic,
            stf_position=StaffPosition.RECEPTIONIST,
        )
        rex = Pet.objects.create(own_id=self.owner, pet_name='Rex', pet_sex=Sex.MALE)
        Appointment.objects.create(
            pet_id=rex,
            cln_id=self.clinic,
            apt_type=AppointmentType.CONSULTATION,
            apt_status=AppointmentStatus.CONFIRMED,
            apt_scheduled_at=timezone.now(),
        )

    def test_receptionist_list_returns_owners_with_pets(self):
        response = self.client.get('/api/owners/', **self._auth(DESK_EMAIL))
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['total'], 1)
        self.assertEqual(response.data['page'], 1)
        self.assertEqual(response.data['page_size'], 20)
        result = response.data['results'][0]
        self.assertEqual(result['full_name'], 'Olga Owner')
        self.assertEqual(result['email'], OWNER_EMAIL)
        self.assertEqual(result['pet_count'], 1)

    def test_list_rejects_non_receptionist(self):
        response = self.client.get('/api/owners/', **self._auth(OWNER_EMAIL))
        self.assertEqual(response.status_code, 403)

    def test_list_with_invalid_pagination_falls_back_to_defaults(self):
        response = self.client.get(
            '/api/owners/',
            {'page': 'abc', 'page_size': 'xyz'},
            **self._auth(DESK_EMAIL),
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['page'], 1)
        self.assertEqual(response.data['page_size'], 20)

    def test_list_clamps_out_of_range_pagination(self):
        response = self.client.get(
            '/api/owners/',
            {'page': '0', 'page_size': '99999'},
            **self._auth(DESK_EMAIL),
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['page'], 1)
        self.assertEqual(response.data['page_size'], 100)

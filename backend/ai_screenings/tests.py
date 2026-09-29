import base64
from unittest import mock

import requests
from django.test import TestCase, override_settings

from ai_screenings.models import AiScreening, Disease, ScreeningSource, ScreeningStatus, SecondCheckVerdict
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


TINY_IMAGE = base64.b64encode(b'\xff\xd8\xff\xe0test-jpeg').decode()


def _gemini_response(text='{"verdict": "AGREE", "notes": "Consistent with the pet."}'):
    response = mock.Mock()
    response.status_code = 200
    response.json.return_value = {
        'candidates': [{'content': {'parts': [{'text': text}]}}],
    }
    response.raise_for_status.return_value = None
    return response


@override_settings(GEMINI_API_KEY='test-key', GEMINI_MODEL='test-model')
class SecondCheckTests(OwnerScreeningBase):

    def _post_device(self, **extra):
        payload = {
            'pet_id': str(self.pet.pet_id),
            'source': 'DEVICE',
            'prediction': 'MANGE',
            'confidence': 88.0,
            'model_version': '2.0.0',
        }
        payload.update(extra)
        return self.client.post(
            '/api/owner/screenings/', payload, format='json', **self._auth(OWNER_EMAIL),
        )

    def test_agree_verdict_saved_and_returned(self):
        with mock.patch('ai_screenings.services.requests.post', return_value=_gemini_response()) as post:
            response = self._post_device(image=TINY_IMAGE)

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['ais_check_verdict'], SecondCheckVerdict.AGREE)
        self.assertEqual(response.data['ais_check_notes'], 'Consistent with the pet.')
        self.assertEqual(response.data['ais_check_model'], 'test-model')
        self.assertIsNotNone(response.data['ais_check_at'])
        self.assertEqual(response.data['ais_status'], ScreeningStatus.PENDING_REVIEW)
        self.assertEqual(post.call_count, 1)

        sent = post.call_args.kwargs['json']
        inline = [p for p in sent['contents'][0]['parts'] if 'inline_data' in p]
        self.assertEqual(len(inline), 1)
        self.assertEqual(inline[0]['inline_data']['data'], TINY_IMAGE)

    def test_timeout_marks_unavailable_but_screening_created(self):
        with mock.patch('ai_screenings.services.requests.post', side_effect=requests.Timeout('slow')):
            response = self._post_device(image=TINY_IMAGE)

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['ais_check_verdict'], SecondCheckVerdict.UNAVAILABLE)
        self.assertEqual(response.data['ais_check_notes'], '')

    def test_malformed_llm_output_marks_unavailable(self):
        with mock.patch('ai_screenings.services.requests.post', return_value=_gemini_response('not-json')):
            response = self._post_device()

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['ais_check_verdict'], SecondCheckVerdict.UNAVAILABLE)

    def test_http_error_marks_unavailable(self):
        response_mock = mock.Mock()
        response_mock.raise_for_status.side_effect = requests.HTTPError('500')
        with mock.patch('ai_screenings.services.requests.post', return_value=response_mock):
            response = self._post_device()

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['ais_check_verdict'], SecondCheckVerdict.UNAVAILABLE)

    @override_settings(GEMINI_API_KEY='')
    def test_no_api_key_skips_check_without_calling_llm(self):
        with mock.patch('ai_screenings.services.requests.post') as post:
            response = self._post_device(image=TINY_IMAGE)

        self.assertEqual(response.status_code, 201, response.data)
        self.assertIsNone(response.data['ais_check_verdict'])
        post.assert_not_called()

    def test_mock_screening_never_calls_llm(self):
        with mock.patch('ai_screenings.services.requests.post') as post:
            response = self.client.post(
                '/api/owner/screenings/',
                {'pet_id': str(self.pet.pet_id), 'source': 'MOCK'},
                format='json',
                **self._auth(OWNER_EMAIL),
            )

        self.assertEqual(response.status_code, 201, response.data)
        self.assertIsNone(response.data['ais_check_verdict'])
        post.assert_not_called()

    def test_data_url_image_mime_preserved(self):
        data_url = f'data:image/png;base64,{TINY_IMAGE}'
        with mock.patch('ai_screenings.services.requests.post', return_value=_gemini_response()) as post:
            response = self._post_device(image=data_url)

        self.assertEqual(response.status_code, 201, response.data)
        sent = post.call_args.kwargs['json']
        inline = [p for p in sent['contents'][0]['parts'] if 'inline_data' in p][0]
        self.assertEqual(inline['inline_data']['mime_type'], 'image/png')

    def test_invalid_base64_image_returns_400(self):
        response = self._post_device(image='!!!not-base64!!!')
        self.assertEqual(response.status_code, 400)

    def test_oversized_image_returns_400(self):
        huge = base64.b64encode(b'a' * (2 * 1024 * 1024 + 1)).decode()
        response = self._post_device(image=huge)
        self.assertEqual(response.status_code, 400)

    def test_503_then_success_retries_once_and_saves_verdict(self):
        saturated = mock.Mock()
        saturated.status_code = 503
        saturated.raise_for_status.side_effect = requests.HTTPError('503')
        with mock.patch(
            'ai_screenings.services.requests.post',
            side_effect=[saturated, _gemini_response()],
        ) as post:
            response = self._post_device(image=TINY_IMAGE)

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['ais_check_verdict'], SecondCheckVerdict.AGREE)
        self.assertEqual(post.call_count, 2)

    def test_429_then_success_retries_once_and_saves_verdict(self):
        rate_limited = mock.Mock()
        rate_limited.status_code = 429
        rate_limited.raise_for_status.side_effect = requests.HTTPError('429')
        with mock.patch(
            'ai_screenings.services.requests.post',
            side_effect=[rate_limited, _gemini_response()],
        ) as post:
            response = self._post_device()

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['ais_check_verdict'], SecondCheckVerdict.AGREE)
        self.assertEqual(post.call_count, 2)

    def test_persistent_503_marks_unavailable_after_single_retry(self):
        saturated = mock.Mock()
        saturated.status_code = 503
        saturated.raise_for_status.side_effect = requests.HTTPError('503')
        with mock.patch(
            'ai_screenings.services.requests.post',
            side_effect=[saturated, saturated],
        ) as post:
            response = self._post_device()

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['ais_check_verdict'], SecondCheckVerdict.UNAVAILABLE)
        self.assertEqual(post.call_count, 2)

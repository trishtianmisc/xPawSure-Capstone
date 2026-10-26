import base64
import hashlib
import io
from unittest.mock import patch

from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.utils import timezone
from PIL import Image
from rest_framework import status

from ai_screenings.claude_service import (
    FINDINGS_TOOL,
    TOOL_NAME,
    ClaudeVisionOutcome,
    ClaudeVisionService,
    _normalize_result,
)
from ai_screenings.claude_token import ClaudeTokenError, issue_claude_token, read_claude_token
from ai_screenings.comparison import compare_analyses
from ai_screenings.image_service import (
    InvalidScreeningImage,
    read_screening_image,
)
from ai_screenings.models import (
    AiScreening, AiScreeningImage, ClaudeAnalysisStatus, CrossAnalysisStatus,
)
from ai_screenings.tests import (
    OWNER_EMAIL, RECEPTIONIST_EMAIL, OwnerScreeningBase,
)


def image_bytes(fmt='JPEG', size=(64, 64), color=(180, 80, 80)):
    buffer = io.BytesIO()
    Image.new('RGB', size, color).save(buffer, format=fmt)
    return buffer.getvalue()


def upload_from_bytes(content, content_type='image/jpeg', name='skin.jpg'):
    return SimpleUploadedFile(name, content, content_type=content_type)


def image_upload(fmt='JPEG', content_type='image/jpeg', name='skin.jpg'):
    return upload_from_bytes(image_bytes(fmt=fmt), content_type=content_type, name=name)


def tool_input(**overrides):
    data = {
        'image_suitability': 'SUITABLE',
        'screening_eligibility': 'ELIGIBLE',
        'visible_features': ['Red patches', 'Thinning hair around the muzzle'],
        'image_quality': {
            'adequate': True,
            'observations': ['The affected area is in focus and well lit'],
        },
        'comparison_label': 'MANGE',
        'other_possibilities': ['ALLERGIC_DERMATITIS'],
        'unclear': False,
        'rationale': 'The visible crusting is closest to the mange pattern.',
        'vet_recommendation': 'Have a veterinarian examine the skin in person.',
    }
    data.update(overrides)
    return data


def outcome(status=ClaudeAnalysisStatus.OK, result=None, model='test-claude-model'):
    return ClaudeVisionOutcome(
        status=status,
        model=model,
        analyzed_at=timezone.now(),
        result=_normalize_result(tool_input()) if result is None and status == ClaudeAnalysisStatus.OK else result,
        latency_ms=250,
        input_tokens=120,
        output_tokens=80,
    )


class FakeResponse:
    def __init__(self, status_code=200, body=None):
        self.status_code = status_code
        self._body = body if body is not None else {}

    def json(self):
        if isinstance(self._body, Exception):
            raise self._body
        return self._body


class FakeAnthropicResponse(FakeResponse):
    def __init__(self, tool_data=None, status_code=200, usage=None):
        super().__init__(
            status_code=status_code,
            body={
                'content': [
                    {
                        'type': 'tool_use',
                        'name': TOOL_NAME,
                        'input': tool_data if tool_data is not None else tool_input(),
                    },
                ],
                'usage': usage or {'input_tokens': 321, 'output_tokens': 123},
            },
        )


class ClaudeVisionServiceTests(OwnerScreeningBase):

    def setUp(self):
        super().setUp()
        self.image = read_screening_image(image_upload())

    @override_settings(ANTHROPIC_API_KEY='')
    @patch('ai_screenings.claude_service.requests.post')
    def test_missing_api_key_skips_request(self, mock_post):
        result = ClaudeVisionService.analyze(self.image)
        self.assertEqual(result.status, ClaudeAnalysisStatus.NOT_CONFIGURED)
        self.assertIsNone(result.result)
        mock_post.assert_not_called()

    @override_settings(
        ANTHROPIC_API_KEY='test-key', ANTHROPIC_MODEL='test-model',
        ANTHROPIC_API_VERSION='2023-06-01',
    )
    @patch('ai_screenings.claude_service.requests.post')
    def test_success_parses_structured_findings_and_usage(self, mock_post):
        mock_post.return_value = FakeAnthropicResponse()

        result = ClaudeVisionService.analyze(self.image)

        self.assertEqual(result.status, ClaudeAnalysisStatus.OK)
        self.assertEqual(result.input_tokens, 321)
        self.assertEqual(result.output_tokens, 123)
        self.assertEqual(result.result['image_suitability'], 'SUITABLE')
        self.assertEqual(result.result['screening_eligibility'], 'ELIGIBLE')
        self.assertIn('screening_message', result.result)
        self.assertEqual(
            result.result['condition_assessment']['closest_match'], 'MANGE',
        )
        self.assertEqual(result.result['visible_features'], [
            'Red patches', 'Thinning hair around the muzzle',
        ])
        self.assertNotIn('possible_interpretations', result.result)
        self.assertNotIn('limitations', result.result)
        self.assertNotIn('confidence', result.result)
        self.assertNotIn('combined', result.result)

        properties = FINDINGS_TOOL['input_schema']['properties']
        self.assertNotIn('possible_interpretations', properties)
        self.assertNotIn('limitations', properties)
        self.assertEqual(properties['visible_features']['type'], 'array')
        self.assertEqual(properties['visible_features']['items'], {'type': 'string'})

        call_kwargs = mock_post.call_args.kwargs
        self.assertEqual(call_kwargs['headers']['x-api-key'], 'test-key')
        self.assertEqual(call_kwargs['headers']['anthropic-version'], '2023-06-01')
        payload = call_kwargs['json']
        self.assertEqual(payload['model'], 'test-model')
        image_block = payload['messages'][0]['content'][0]
        self.assertEqual(image_block['type'], 'image')
        self.assertEqual(image_block['source']['media_type'], 'image/jpeg')
        self.assertEqual(
            base64.b64decode(image_block['source']['data']), self.image.content,
        )

    @override_settings(ANTHROPIC_API_KEY='test-key')
    @patch('ai_screenings.claude_service.requests.post')
    def test_timeout_returns_timeout_status(self, mock_post):
        import requests

        mock_post.side_effect = requests.Timeout('slow')
        result = ClaudeVisionService.analyze(self.image)
        self.assertEqual(result.status, ClaudeAnalysisStatus.TIMEOUT)

    @override_settings(ANTHROPIC_API_KEY='test-key')
    @patch('ai_screenings.claude_service.requests.post')
    def test_provider_429_quota_is_distinguished_from_rate_limit(self, mock_post):
        mock_post.return_value = FakeResponse(
            429, {'error': {'type': 'billing_error', 'message': 'credit balance'}},
        )
        result = ClaudeVisionService.analyze(self.image)
        self.assertEqual(result.status, ClaudeAnalysisStatus.QUOTA_EXHAUSTED)

        mock_post.return_value = FakeResponse(
            429, {'error': {'type': 'rate_limit_error', 'message': 'slow down'}},
        )
        result = ClaudeVisionService.analyze(self.image)
        self.assertEqual(result.status, ClaudeAnalysisStatus.RATE_LIMITED)

    @override_settings(ANTHROPIC_API_KEY='test-key')
    @patch('ai_screenings.claude_service.requests.post')
    def test_provider_errors_and_bad_key(self, mock_post):
        mock_post.return_value = FakeResponse(500, {})
        self.assertEqual(
            ClaudeVisionService.analyze(self.image).status,
            ClaudeAnalysisStatus.PROVIDER_ERROR,
        )

        mock_post.return_value = FakeResponse(401, {})
        self.assertEqual(
            ClaudeVisionService.analyze(self.image).status,
            ClaudeAnalysisStatus.NOT_CONFIGURED,
        )

        mock_post.return_value = FakeResponse(529, {})
        self.assertEqual(
            ClaudeVisionService.analyze(self.image).status,
            ClaudeAnalysisStatus.RATE_LIMITED,
        )

    @override_settings(ANTHROPIC_API_KEY='test-key')
    @patch('ai_screenings.claude_service.requests.post')
    def test_malformed_json_and_missing_tool_are_rejected(self, mock_post):
        mock_post.return_value = FakeResponse(200, ValueError('not json'))
        self.assertEqual(
            ClaudeVisionService.analyze(self.image).status,
            ClaudeAnalysisStatus.MALFORMED_RESPONSE,
        )

        mock_post.return_value = FakeResponse(200, {'content': []})
        self.assertEqual(
            ClaudeVisionService.analyze(self.image).status,
            ClaudeAnalysisStatus.MALFORMED_RESPONSE,
        )

    @override_settings(ANTHROPIC_API_KEY='test-key')
    @patch('ai_screenings.claude_service.requests.post')
    def test_invalid_structured_fields_are_rejected(self, mock_post):
        mock_post.return_value = FakeAnthropicResponse(
            tool_data=tool_input(comparison_label='DIAGNOSIS'),
        )
        self.assertEqual(
            ClaudeVisionService.analyze(self.image).status,
            ClaudeAnalysisStatus.MALFORMED_RESPONSE,
        )

        mock_post.return_value = FakeAnthropicResponse(
            tool_data=tool_input(
                image_suitability='NO_VISIBLE_LESIONS',
                screening_eligibility='ELIGIBLE',
            ),
        )
        self.assertEqual(
            ClaudeVisionService.analyze(self.image).status,
            ClaudeAnalysisStatus.MALFORMED_RESPONSE,
        )

        mock_post.return_value = FakeAnthropicResponse(
            tool_data=tool_input(visible_features=[{'text': 'Red patches'}]),
        )
        self.assertEqual(
            ClaudeVisionService.analyze(self.image).status,
            ClaudeAnalysisStatus.MALFORMED_RESPONSE,
        )

        mock_post.return_value = FakeAnthropicResponse(
            tool_data=tool_input(comparison_label='OTHER'),
        )
        self.assertEqual(
            ClaudeVisionService.analyze(self.image).status,
            ClaudeAnalysisStatus.MALFORMED_RESPONSE,
        )

    def test_non_eligible_gate_statuses_are_normalized(self):
        cases = (
            ('POOR_QUALITY', False, 'UNCLEAR', True, 'too blurred'),
            ('NOT_DOG_SKIN', True, 'UNCLEAR', True, 'does not appear to show dog skin'),
            ('NO_VISIBLE_LESIONS', True, 'UNCLEAR', True, 'skin appears healthy'),
            ('WOUND_OR_INJURY', True, 'OTHER', False, 'wound or injury'),
            ('UNCERTAIN', True, 'UNCLEAR', True, 'could not be confidently assessed'),
        )

        for suitability, adequate, label, unclear, phrase in cases:
            with self.subTest(suitability=suitability):
                normalized = _normalize_result(tool_input(
                    image_suitability=suitability,
                    screening_eligibility='NOT_ELIGIBLE',
                    image_quality={
                        'adequate': adequate,
                        'observations': ['Visible features are described.'],
                    },
                    comparison_label=label,
                    unclear=unclear,
                ))
                self.assertEqual(normalized['image_suitability'], suitability)
                self.assertEqual(normalized['screening_eligibility'], 'NOT_ELIGIBLE')
                self.assertIn(phrase, normalized['screening_message'])
                self.assertNotIn('possible_interpretations', normalized)
                self.assertNotIn('limitations', normalized)
                if suitability == 'NO_VISIBLE_LESIONS':
                    self.assertIn('does not rule out', normalized['screening_message'])
                if suitability == 'WOUND_OR_INJURY':
                    self.assertNotIn('healthy', normalized['screening_message'].lower())
                for feature in normalized['visible_features']:
                    self.assertIsInstance(feature, str)

    @override_settings(ANTHROPIC_API_KEY='secret-test-key')
    @patch('ai_screenings.claude_service.requests.post')
    def test_logs_never_contain_key_or_image_payload(self, mock_post):
        mock_post.return_value = FakeAnthropicResponse()
        with self.assertLogs('ai_screenings.claude_service', level='INFO') as captured:
            ClaudeVisionService.analyze(self.image)

        output = '\n'.join(captured.output)
        self.assertIn('status=OK', output)
        self.assertNotIn('secret-test-key', output)
        self.assertNotIn(
            base64.b64encode(self.image.content).decode('ascii'), output,
        )


class ClaudeTokenTests(OwnerScreeningBase):

    def test_round_trip_binds_user_image_and_result(self):
        token = issue_claude_token(
            user_id=self.owner_user.usr_id,
            image_sha256='abc123',
            outcome=outcome(),
        )
        payload = read_claude_token(
            token, user_id=self.owner_user.usr_id, image_sha256='abc123',
        )
        self.assertEqual(payload['status'], ClaudeAnalysisStatus.OK)
        self.assertEqual(
            payload['result']['condition_assessment']['closest_match'], 'MANGE',
        )
        self.assertIsNotNone(payload['analyzed_at'].tzinfo)

    def test_wrong_user_or_image_is_rejected(self):
        token = issue_claude_token(
            user_id=self.owner_user.usr_id,
            image_sha256='abc123',
            outcome=outcome(),
        )
        with self.assertRaises(ClaudeTokenError):
            read_claude_token(
                token, user_id=self.other_user.usr_id, image_sha256='abc123',
            )
        with self.assertRaises(ClaudeTokenError):
            read_claude_token(
                token, user_id=self.owner_user.usr_id, image_sha256='different',
            )

    def test_expired_or_garbage_token_is_rejected(self):
        token = issue_claude_token(
            user_id=self.owner_user.usr_id,
            image_sha256='abc123',
            outcome=outcome(),
        )
        with override_settings(SCREENING_CLAUDE_TOKEN_MAX_AGE=-1):
            with self.assertRaises(ClaudeTokenError):
                read_claude_token(
                    token, user_id=self.owner_user.usr_id, image_sha256='abc123',
                )
        with self.assertRaises(ClaudeTokenError):
            read_claude_token(
                'not-a-token', user_id=self.owner_user.usr_id, image_sha256='abc123',
            )

    def test_failure_outcome_has_no_result(self):
        token = issue_claude_token(
            user_id=self.owner_user.usr_id,
            image_sha256='abc123',
            outcome=outcome(status=ClaudeAnalysisStatus.TIMEOUT, result=None),
        )
        payload = read_claude_token(
            token, user_id=self.owner_user.usr_id, image_sha256='abc123',
        )
        self.assertEqual(payload['status'], ClaudeAnalysisStatus.TIMEOUT)
        self.assertIsNone(payload['result'])


class ComparisonTests(OwnerScreeningBase):

    def test_matching_category_is_compatible_but_not_confirmation(self):
        status, summary = compare_analyses(
            'MANGE', 'Mange', ClaudeAnalysisStatus.OK,
            _normalize_result(tool_input()),
        )
        self.assertEqual(status, CrossAnalysisStatus.COMPATIBLE)
        self.assertIn('does not confirm a diagnosis', summary)

    def test_different_category_is_different(self):
        status, summary = compare_analyses(
            'MANGE', 'Mange', ClaudeAnalysisStatus.OK,
            _normalize_result(tool_input(comparison_label='FUNGAL')),
        )
        self.assertEqual(status, CrossAnalysisStatus.DIFFERENT)
        self.assertIn('neither result', summary)

    def test_non_eligible_image_is_insufficient(self):
        status, summary = compare_analyses(
            'MANGE', 'Mange', ClaudeAnalysisStatus.OK,
            _normalize_result(tool_input(
                image_suitability='NO_VISIBLE_LESIONS',
                screening_eligibility='NOT_ELIGIBLE',
                comparison_label='UNCLEAR',
                unclear=True,
            )),
        )
        self.assertEqual(status, CrossAnalysisStatus.INSUFFICIENT_EVIDENCE)
        self.assertIn('did not approve', summary)

    def test_unclear_or_inadequate_image_is_insufficient(self):
        status, _ = compare_analyses(
            'MANGE', 'Mange', ClaudeAnalysisStatus.OK,
            _normalize_result(tool_input(
                image_suitability='UNCERTAIN',
                screening_eligibility='NOT_ELIGIBLE',
                comparison_label='UNCLEAR',
                unclear=True,
            )),
        )
        self.assertEqual(status, CrossAnalysisStatus.INSUFFICIENT_EVIDENCE)

        blurred = tool_input(
            image_suitability='POOR_QUALITY',
            screening_eligibility='NOT_ELIGIBLE',
            image_quality={
                'adequate': False,
                'observations': ['The photograph is blurry'],
            },
            comparison_label='UNCLEAR',
            unclear=True,
        )
        status, summary = compare_analyses(
            'MANGE', 'Mange', ClaudeAnalysisStatus.OK,
            _normalize_result(blurred),
        )
        self.assertEqual(status, CrossAnalysisStatus.INSUFFICIENT_EVIDENCE)
        self.assertIn('did not approve', summary)

    def test_failed_or_missing_analysis_is_insufficient(self):
        status, summary = compare_analyses(
            'MANGE', 'Mange', ClaudeAnalysisStatus.TIMEOUT, None,
        )
        self.assertEqual(status, CrossAnalysisStatus.INSUFFICIENT_EVIDENCE)
        self.assertIn('timed out', summary)

        status, summary = compare_analyses(
            'MANGE', 'Mange', ClaudeAnalysisStatus.NOT_REQUESTED, None,
        )
        self.assertEqual(status, CrossAnalysisStatus.INSUFFICIENT_EVIDENCE)
        self.assertIn('No image review', summary)

    def test_device_label_in_other_possibilities_still_counts_as_different(self):
        data = tool_input(
            comparison_label='FUNGAL',
            other_possibilities=['MANGE', 'BACTERIAL'],
        )
        status, _ = compare_analyses(
            'MANGE', 'Mange', ClaudeAnalysisStatus.OK,
            _normalize_result(data),
        )
        self.assertEqual(status, CrossAnalysisStatus.DIFFERENT)


class ScreeningImageValidationTests(OwnerScreeningBase):

    def test_valid_jpeg_and_png_are_accepted(self):
        jpeg = read_screening_image(image_upload())
        self.assertEqual(jpeg.content_type, 'image/jpeg')
        self.assertEqual(len(jpeg.sha256), 64)

        png = read_screening_image(image_upload(fmt='PNG', content_type='image/png', name='skin.png'))
        self.assertEqual(png.content_type, 'image/png')

    def test_spoofed_content_type_is_rejected(self):
        with self.assertRaises(InvalidScreeningImage):
            read_screening_image(image_upload(
                fmt='PNG', content_type='image/jpeg', name='skin.jpg',
            ))

    def test_unsupported_or_empty_file_is_rejected(self):
        with self.assertRaises(InvalidScreeningImage):
            read_screening_image(SimpleUploadedFile('skin.gif', b'GIF89a', content_type='image/gif'))
        with self.assertRaises(InvalidScreeningImage):
            read_screening_image(SimpleUploadedFile('skin.jpg', b'', content_type='image/jpeg'))
        with self.assertRaises(InvalidScreeningImage):
            read_screening_image(SimpleUploadedFile('skin.jpg', b'not-an-image', content_type='image/jpeg'))

    @override_settings(SCREENING_IMAGE_MAX_BYTES=10)
    def test_oversized_image_is_rejected(self):
        with self.assertRaises(InvalidScreeningImage):
            read_screening_image(image_upload())


class OwnerVisionAnalysisEndpointTests(OwnerScreeningBase):

    def _post_image(self, image=None, data=None):
        return self.client.post(
            '/api/owner/screenings/vision-analysis/',
            data=data if data is not None else {'image': image or image_upload()},
            format='multipart',
            **self._auth(OWNER_EMAIL),
        )

    @patch('ai_screenings.views_owner.ClaudeVisionService.analyze')
    def test_success_returns_result_and_signed_token(self, mock_analyze):
        mock_analyze.return_value = outcome()

        response = self._post_image()

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data['status'], ClaudeAnalysisStatus.OK)
        self.assertEqual(response.data['result']['image_suitability'], 'SUITABLE')
        self.assertEqual(response.data['result']['screening_eligibility'], 'ELIGIBLE')
        self.assertIn('screening_message', response.data['result'])
        self.assertEqual(
            response.data['result']['condition_assessment']['closest_match'],
            'MANGE',
        )
        self.assertTrue(response.data['token'])
        self.assertNotIn('test-key', str(response.data))

    @patch('ai_screenings.views_owner.ClaudeVisionService.analyze')
    def test_non_eligible_image_returns_gate_decision(self, mock_analyze):
        gate_result = _normalize_result(tool_input(
            image_suitability='POOR_QUALITY',
            screening_eligibility='NOT_ELIGIBLE',
            image_quality={
                'adequate': False,
                'observations': ['The photo is blurred.'],
            },
            comparison_label='UNCLEAR',
            unclear=True,
        ))
        mock_analyze.return_value = outcome(result=gate_result)

        response = self._post_image()

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data['result']['image_suitability'], 'POOR_QUALITY')
        self.assertEqual(
            response.data['result']['screening_eligibility'], 'NOT_ELIGIBLE',
        )
        self.assertIn('too blurred', response.data['result']['screening_message'])
        self.assertTrue(response.data['token'])

    @patch('ai_screenings.views_owner.ClaudeVisionService.analyze')
    def test_failure_still_returns_200_with_status_and_token(self, mock_analyze):
        mock_analyze.return_value = outcome(
            status=ClaudeAnalysisStatus.TIMEOUT, result=None,
        )
        response = self._post_image()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], ClaudeAnalysisStatus.TIMEOUT)
        self.assertIsNone(response.data['result'])
        self.assertTrue(response.data['token'])

    def test_image_is_required_and_receptionist_is_forbidden(self):
        response = self.client.post(
            '/api/owner/screenings/vision-analysis/',
            data={},
            format='multipart',
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        receptionist = self.client.post(
            '/api/owner/screenings/vision-analysis/',
            data={'image': image_upload()},
            format='multipart',
            **self._auth(RECEPTIONIST_EMAIL),
        )
        self.assertEqual(receptionist.status_code, status.HTTP_403_FORBIDDEN)

        anonymous = self.client.post(
            '/api/owner/screenings/vision-analysis/',
            data={'image': image_upload()},
            format='multipart',
        )
        self.assertEqual(anonymous.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_multiple_or_unexpected_files_are_rejected(self):
        multiple = self._post_image(data={
            'image': [image_upload(), image_upload(name='second.jpg')],
        })
        self.assertEqual(multiple.status_code, status.HTTP_400_BAD_REQUEST)

        unexpected = self._post_image(data={
            'image': image_upload(),
            'extra': image_upload(name='extra.jpg'),
        })
        self.assertEqual(unexpected.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_image_is_rejected_before_provider_call(self):
        response = self._post_image(data={
            'image': SimpleUploadedFile(
                'skin.jpg', b'not-an-image', content_type='image/jpeg',
            ),
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch('ai_screenings.views_owner.ClaudeVisionService.analyze')
    def test_vision_analysis_is_rate_limited(self, mock_analyze):
        from rest_framework.throttling import ScopedRateThrottle

        mock_analyze.return_value = outcome()
        cache.clear()
        self.addCleanup(cache.clear)

        auth = self._auth(OWNER_EMAIL)
        with patch.dict(
            ScopedRateThrottle.THROTTLE_RATES, {'vision-analysis': '1/hour'},
        ):
            first = self.client.post(
                '/api/owner/screenings/vision-analysis/',
                data={'image': image_upload()},
                format='multipart',
                **auth,
            )
            second = self.client.post(
                '/api/owner/screenings/vision-analysis/',
                data={'image': image_upload()},
                format='multipart',
                **auth,
            )
        self.assertEqual(first.status_code, status.HTTP_200_OK)
        self.assertEqual(second.status_code, status.HTTP_429_TOO_MANY_REQUESTS)


class CreateScreeningWithImageTests(OwnerScreeningBase):

    def _token_for(self, image, outcome_value=None):
        sha256 = hashlib.sha256(image).hexdigest()
        return issue_claude_token(
            user_id=self.owner_user.usr_id,
            image_sha256=sha256,
            outcome=outcome_value or outcome(),
        )

    def _create(self, image_content=None, token='', extra=None, image_list=False):
        content = image_content or image_bytes()
        upload = upload_from_bytes(content)
        data = {
            'pet_id': str(self.pet.pet_id),
            'source': 'DEVICE',
            'prediction': 'MANGE',
            'confidence': '85.0',
            'model_version': 'test-1.0.0',
        }
        data['claude_token'] = token or self._token_for(content)
        if image_list:
            data['image'] = [upload, upload_from_bytes(image_bytes(), name='second.jpg')]
        else:
            data['image'] = upload
        if extra:
            data.update(extra)
        return self.client.post(
            '/api/owner/screenings/',
            data=data,
            format='multipart',
            **self._auth(OWNER_EMAIL),
        )

    @override_settings(
        SUPABASE_URL='https://test.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY='test-service-key',
    )
    @patch('ai_screenings.image_service.SupabaseStorageService.upload')
    def test_create_with_image_and_claude_token_persists_both_outputs(self, mock_upload):
        mock_upload.return_value = (
            'https://test.supabase.co/storage/v1/object/public/'
            'screening-images/screenings/abc.jpg'
        )
        image_content = image_bytes()
        image = upload_from_bytes(image_content)
        token = self._token_for(image_content)

        response = self.client.post(
            '/api/owner/screenings/',
            data={
                'pet_id': str(self.pet.pet_id),
                'source': 'DEVICE',
                'prediction': 'MANGE',
                'confidence': '85.0',
                'model_version': 'test-1.0.0',
                'claude_token': token,
                'image': image,
            },
            format='multipart',
            **self._auth(OWNER_EMAIL),
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data['claude']['status'], ClaudeAnalysisStatus.OK)
        self.assertEqual(
            response.data['cross_analysis']['status'],
            CrossAnalysisStatus.COMPATIBLE,
        )
        self.assertIn('does not confirm a diagnosis', response.data['cross_analysis']['summary'])
        self.assertEqual(response.data['image']['content_type'], 'image/jpeg')
        self.assertEqual(response.data['image']['sha256'], hashlib.sha256(image_content).hexdigest())

        screening = AiScreening.objects.get(ais_id=response.data['ais_id'])
        self.assertEqual(screening.ais_claude_status, ClaudeAnalysisStatus.OK)
        self.assertEqual(
            screening.ais_claude_result['condition_assessment']['closest_match'],
            'MANGE',
        )
        self.assertEqual(screening.ais_claude_model, 'test-claude-model')
        stored = AiScreeningImage.objects.get(ais_id=screening)
        self.assertEqual(stored.asi_content_type, 'image/jpeg')
        mock_upload.assert_called_once()
        self.assertEqual(
            mock_upload.call_args.kwargs['bucket'],
            'screening-images',
        )

    @override_settings(SUPABASE_URL='', SUPABASE_SERVICE_ROLE_KEY='')
    @patch('ai_screenings.image_service.default_storage')
    def test_local_storage_fallback_with_validated_image(self, mock_storage):
        mock_storage.save.return_value = 'screenings/local.jpg'
        mock_storage.url.return_value = '/media/screenings/local.jpg'

        response = self._create()

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data['claude']['status'], ClaudeAnalysisStatus.OK)
        self.assertEqual(
            response.data['cross_analysis']['status'],
            CrossAnalysisStatus.COMPATIBLE,
        )
        self.assertTrue(response.data['image']['url'].startswith('http://testserver/media/'))
        mock_storage.save.assert_called_once()

    def test_failed_claude_validation_cannot_be_saved(self):
        image_content = image_bytes()
        token = self._token_for(
            image_content,
            outcome_value=outcome(status=ClaudeAnalysisStatus.TIMEOUT, result=None),
        )
        response = self.client.post(
            '/api/owner/screenings/',
            data={
                'pet_id': str(self.pet.pet_id),
                'source': 'DEVICE',
                'prediction': 'MANGE',
                'confidence': '85.0',
                'model_version': 'test-1.0.0',
                'claude_token': token,
                'image': upload_from_bytes(image_content),
            },
            format='multipart',
            **self._auth(OWNER_EMAIL),
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('not approved', response.data['detail'])
        self.assertEqual(AiScreening.objects.count(), 0)

    def test_image_without_validation_token_is_rejected(self):
        response = self.client.post(
            '/api/owner/screenings/',
            data={
                'pet_id': str(self.pet.pet_id),
                'source': 'DEVICE',
                'prediction': 'MANGE',
                'confidence': '85.0',
                'model_version': 'test-1.0.0',
                'image': image_upload(),
            },
            format='multipart',
            **self._auth(OWNER_EMAIL),
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Image validation is required', response.data['detail'])
        self.assertEqual(AiScreening.objects.count(), 0)

    def test_non_eligible_gate_token_cannot_be_saved(self):
        cases = (
            ('POOR_QUALITY', False, 'UNCLEAR', True),
            ('NOT_DOG_SKIN', True, 'UNCLEAR', True),
            ('NO_VISIBLE_LESIONS', True, 'UNCLEAR', True),
            ('WOUND_OR_INJURY', True, 'OTHER', False),
            ('UNCERTAIN', True, 'UNCLEAR', True),
        )
        image_content = image_bytes()

        for suitability, adequate, label, unclear in cases:
            with self.subTest(suitability=suitability):
                gate_result = _normalize_result(tool_input(
                    image_suitability=suitability,
                    screening_eligibility='NOT_ELIGIBLE',
                    image_quality={
                        'adequate': adequate,
                        'observations': ['Visible features are described.'],
                    },
                    comparison_label=label,
                    unclear=unclear,
                ))
                token = self._token_for(
                    image_content,
                    outcome_value=outcome(result=gate_result),
                )
                response = self.client.post(
                    '/api/owner/screenings/',
                    data={
                        'pet_id': str(self.pet.pet_id),
                        'source': 'DEVICE',
                        'prediction': 'MANGE',
                        'confidence': '85.0',
                        'model_version': 'test-1.0.0',
                        'claude_token': token,
                        'image': upload_from_bytes(image_content),
                    },
                    format='multipart',
                    **self._auth(OWNER_EMAIL),
                )
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertIn('not approved', response.data['detail'])

        self.assertEqual(AiScreening.objects.count(), 0)

    def test_token_without_image_is_rejected(self):
        response = self.client.post(
            '/api/owner/screenings/',
            data={
                'pet_id': str(self.pet.pet_id),
                'source': 'DEVICE',
                'prediction': 'MANGE',
                'confidence': 85.0,
                'model_version': 'test-1.0.0',
                'claude_token': self._token_for(image_bytes()),
            },
            format='json',
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(AiScreening.objects.count(), 0)

    def test_token_for_another_image_is_rejected(self):
        token = self._token_for(image_bytes(fmt='PNG'))
        response = self.client.post(
            '/api/owner/screenings/',
            data={
                'pet_id': str(self.pet.pet_id),
                'source': 'DEVICE',
                'prediction': 'MANGE',
                'confidence': '85.0',
                'model_version': 'test-1.0.0',
                'claude_token': token,
                'image': image_upload(),
            },
            format='multipart',
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(AiScreening.objects.count(), 0)

    def test_garbage_and_expired_tokens_are_rejected(self):
        garbage = self.client.post(
            '/api/owner/screenings/',
            data={
                'pet_id': str(self.pet.pet_id),
                'source': 'DEVICE',
                'prediction': 'MANGE',
                'confidence': '85.0',
                'model_version': 'test-1.0.0',
                'claude_token': 'not-a-token',
                'image': image_upload(),
            },
            format='multipart',
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(garbage.status_code, status.HTTP_400_BAD_REQUEST)

        image_content = image_bytes()
        token = self._token_for(image_content)
        with override_settings(SCREENING_CLAUDE_TOKEN_MAX_AGE=-1):
            expired = self.client.post(
                '/api/owner/screenings/',
                data={
                    'pet_id': str(self.pet.pet_id),
                    'source': 'DEVICE',
                    'prediction': 'MANGE',
                    'confidence': '85.0',
                    'model_version': 'test-1.0.0',
                    'claude_token': token,
                    'image': upload_from_bytes(image_content),
                },
                format='multipart',
                **self._auth(OWNER_EMAIL),
            )
        self.assertEqual(expired.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(AiScreening.objects.count(), 0)

    def test_multiple_or_unexpected_files_are_rejected(self):
        multiple = self._create(image_list=True)
        self.assertEqual(multiple.status_code, status.HTTP_400_BAD_REQUEST)

        unexpected = self._create(extra={'extra': image_upload(name='extra.jpg')})
        self.assertEqual(unexpected.status_code, status.HTTP_400_BAD_REQUEST)

        self.assertEqual(AiScreening.objects.count(), 0)

    def test_spoofed_image_is_rejected_and_nothing_is_saved(self):
        response = self.client.post(
            '/api/owner/screenings/',
            data={
                'pet_id': str(self.pet.pet_id),
                'source': 'DEVICE',
                'prediction': 'MANGE',
                'confidence': '85.0',
                'model_version': 'test-1.0.0',
                'image': image_upload(fmt='PNG', content_type='image/jpeg', name='skin.jpg'),
            },
            format='multipart',
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(AiScreening.objects.count(), 0)

    def test_legacy_json_without_image_still_works(self):
        response = self.client.post(
            '/api/owner/screenings/',
            self._device_payload(),
            format='json',
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertIsNone(response.data['image'])
        self.assertEqual(response.data['claude']['status'], ClaudeAnalysisStatus.NOT_REQUESTED)
        self.assertEqual(
            response.data['cross_analysis']['status'],
            CrossAnalysisStatus.INSUFFICIENT_EVIDENCE,
        )

    @override_settings(
        SUPABASE_URL='https://test.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY='test-service-key',
    )
    @patch('ai_screenings.image_service.SupabaseStorageService.upload')
    def test_list_exposes_both_outputs_and_image_reference(self, mock_upload):
        mock_upload.return_value = 'https://test.supabase.co/image.jpg'
        self._create()

        response = self.client.get('/api/owner/screenings/', **self._auth(OWNER_EMAIL))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        row = response.data['results'][0]
        self.assertEqual(row['claude']['status'], ClaudeAnalysisStatus.OK)
        self.assertEqual(row['cross_analysis']['status'], CrossAnalysisStatus.COMPATIBLE)
        self.assertTrue(row['image']['url'].startswith('https://test.supabase.co/'))

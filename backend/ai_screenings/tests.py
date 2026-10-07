from django.test import TestCase
from django.utils import timezone

from ai_screenings.models import AiScreening, Disease, ScreeningSource, ScreeningStatus
from ai_screenings.services import ScreeningService
from appointments.models import Appointment, AppointmentStatus
from clinics.models import Clinic, ClinicOperatingHours, ClinicSettings
from consultations.models import Consultation
from owners.models import OwnerProfile
from pets.models import Pet, Sex
from users.models import StaffPosition, StaffProfile, User, UserRole

PASSWORD = 'TestPass123!'
OWNER_EMAIL = 'scanowner@example.com'
OTHER_OWNER_EMAIL = 'scanother@example.com'
RECEPTIONIST_EMAIL = 'scandesk@example.com'
CLINIC_ADMIN_EMAIL = 'scanadmin@example.com'


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

    def _device_payload(self, pet=None, **overrides):
        payload = {
            'pet_id': str((pet or self.pet).pet_id),
            'source': 'DEVICE',
            'prediction': 'MANGE',
            'confidence': 85.0,
            'model_version': 'test-1.0.0',
        }
        payload.update(overrides)
        return payload


class MockScreeningRejectedTests(OwnerScreeningBase):

    def test_mock_source_is_rejected(self):
        response = self.client.post(
            '/api/owner/screenings/',
            {'pet_id': str(self.pet.pet_id), 'source': 'MOCK'},
            format='json',
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 400)

    def test_screening_without_prediction_returns_400(self):
        response = self.client.post(
            '/api/owner/screenings/',
            {'pet_id': str(self.pet.pet_id), 'source': 'DEVICE', 'model_version': '1.0'},
            format='json',
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 400)

    def test_screening_for_other_owners_pet_returns_404(self):
        response = self.client.post(
            '/api/owner/screenings/',
            self._device_payload(pet=self.other_pet),
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
            self._device_payload(
                confidence=91.5, model_version='2.0.0',
                inference_time_ms=142, device='Pixel 8',
            ),
            format='json',
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['ais_source'], ScreeningSource.DEVICE)
        self.assertEqual(response.data['disease_code'], 'MANGE')
        self.assertEqual(response.data['ais_model_version'], '2.0.0')
        self.assertEqual(response.data['ais_inference_time_ms'], 142)
        self.assertEqual(response.data['ais_status'], ScreeningStatus.PENDING_REVIEW)
        self.assertIsNone(response.data['ais_is_correct'])

    def test_device_screening_unknown_prediction_returns_400(self):
        response = self.client.post(
            '/api/owner/screenings/',
            self._device_payload(prediction='NOT_A_DISEASE'),
            format='json',
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 400)


class ScreeningListTests(OwnerScreeningBase):

    def test_list_scoped_to_owner_and_filterable_by_pet(self):
        self.client.post(
            '/api/owner/screenings/',
            self._device_payload(),
            format='json',
            **self._auth(OWNER_EMAIL),
        )
        self.client.post(
            '/api/owner/screenings/',
            self._device_payload(pet=self.other_pet),
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

    def test_screening_defaults(self):
        screening = AiScreening.objects.create(
            pet_id=self.pet,
            dis_id=Disease.objects.first(),
            ais_confidence=80,
            ais_model_version='test-1.0.0',
        )
        self.assertEqual(screening.ais_status, ScreeningStatus.PENDING_REVIEW)
        self.assertEqual(screening.ais_source, ScreeningSource.DEVICE)
        self.assertIsNone(screening.ais_is_correct)
        self.assertIsNone(screening.ais_compared_diagnosis)
        self.assertIsNone(screening.con_id)


class VerdictComparisonTests(OwnerScreeningBase):

    def _screening(self, disease=None):
        return AiScreening.objects.create(
            pet_id=self.pet,
            dis_id=disease or Disease.objects.get(dis_code='MANGE'),
            ais_confidence=90,
            ais_model_version='test-1.0.0',
        )

    def test_matching_diagnosis_records_correct(self):
        screening = self._screening()
        ScreeningService.record_comparison(screening, 'Sarcoptic mange infestation')

        screening.refresh_from_db()
        self.assertTrue(screening.ais_is_correct)
        self.assertEqual(screening.ais_compared_diagnosis, 'Sarcoptic mange infestation')
        self.assertIsNotNone(screening.ais_compared_at)

    def test_non_matching_diagnosis_records_incorrect(self):
        screening = self._screening()
        ScreeningService.record_comparison(screening, 'Allergic dermatitis')

        screening.refresh_from_db()
        self.assertFalse(screening.ais_is_correct)

    def test_consultation_save_triggers_comparison(self):
        from datetime import time

        date = timezone.localdate()
        day_codes = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
        clinic = Clinic.objects.create(cln_name='Verdict Clinic')
        ClinicOperatingHours.objects.create(
            cln_id=clinic,
            day_of_week=day_codes[date.weekday()],
            day_index=date.weekday() + 1,
            opening_time=time(9, 0),
            closing_time=time(17, 0),
            is_closed=False,
        )
        ClinicSettings.objects.create(cln_id=clinic, cls_appointment_duration=30)

        vet_user = User.objects.create(
            usr_email='verdictvet@example.com',
            usr_password_hash='hashed',
            usr_role=UserRole.VETERINARIAN,
            usr_first_name='Vera',
            usr_last_name='Vet',
        )
        vet_user.set_password(PASSWORD)
        vet_user.save()
        vet = StaffProfile.objects.create(
            usr_id=vet_user, cln_id=clinic, stf_position=StaffPosition.VETERINARIAN,
        )

        screening = self._screening()
        appointment = Appointment.objects.create(
            cln_id=clinic,
            pet_id=self.pet,
            stf_id=vet,
            apt_type='CONSULTATION',
            apt_status=AppointmentStatus.COMPLETED,
            apt_scheduled_at=timezone.now(),
            apt_screening=screening,
            apt_created_by=vet_user,
        )

        consultation = Consultation.objects.create(
            apt_id=appointment,
            stf_id=vet,
            con_diagnosis='Sarcoptic mange',
        )

        screening.refresh_from_db()
        self.assertTrue(screening.ais_is_correct)
        self.assertEqual(screening.con_id, consultation)

    def test_consultation_without_screening_is_noop(self):
        from datetime import time

        date = timezone.localdate()
        day_codes = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
        clinic = Clinic.objects.create(cln_name='No Screening Clinic')
        ClinicOperatingHours.objects.create(
            cln_id=clinic,
            day_of_week=day_codes[date.weekday()],
            day_index=date.weekday() + 1,
            opening_time=time(9, 0),
            closing_time=time(17, 0),
            is_closed=False,
        )
        ClinicSettings.objects.create(cln_id=clinic, cls_appointment_duration=30)

        vet_user = User.objects.create(
            usr_email='noscanvet@example.com',
            usr_password_hash='hashed',
            usr_role=UserRole.VETERINARIAN,
            usr_first_name='Vera',
            usr_last_name='Vet',
        )
        vet_user.set_password(PASSWORD)
        vet_user.save()
        vet = StaffProfile.objects.create(
            usr_id=vet_user, cln_id=clinic, stf_position=StaffPosition.VETERINARIAN,
        )

        appointment = Appointment.objects.create(
            cln_id=clinic,
            pet_id=self.pet,
            stf_id=vet,
            apt_type='CONSULTATION',
            apt_status=AppointmentStatus.COMPLETED,
            apt_scheduled_at=timezone.now(),
            apt_created_by=vet_user,
        )

        Consultation.objects.create(
            apt_id=appointment,
            stf_id=vet,
            con_diagnosis='Mange',
        )

        self.assertIsNone(Appointment.objects.get(apt_id=appointment.apt_id).apt_screening)

    def test_service_match_is_case_insensitive(self):
        screening = self._screening()
        self.assertTrue(ScreeningService.compare_with_diagnosis(screening, 'MANGE'))
        self.assertFalse(ScreeningService.compare_with_diagnosis(screening, ''))


class ScreeningStatsTests(TestCase):

    def setUp(self):
        self.date_owner_user = User.objects.create(
            usr_email=CLINIC_ADMIN_EMAIL, usr_password_hash='hashed',
            usr_role=UserRole.CLINIC_ADMIN, usr_first_name='Ada', usr_last_name='Admin',
        )
        self.date_owner_user.set_password(PASSWORD)
        self.date_owner_user.save()

        self.clinic = Clinic.objects.create(cln_name='Stats Clinic')
        self.other_clinic = Clinic.objects.create(cln_name='Other Stats Clinic')
        StaffProfile.objects.create(
            usr_id=self.date_owner_user,
            cln_id=self.clinic,
            stf_position=StaffPosition.CLINIC_ADMIN,
        )

        owner_user = User.objects.create(
            usr_email='statsowner@example.com', usr_password_hash='hashed',
            usr_role=UserRole.OWNER, usr_first_name='Olga', usr_last_name='Owner',
        )
        owner_user.set_password(PASSWORD)
        owner_user.save()
        owner = OwnerProfile.objects.create(usr_id=owner_user)
        self.pet = Pet.objects.create(own_id=owner, pet_name='Bella', pet_sex=Sex.FEMALE)

        self.other_owner_user = User.objects.create(
            usr_email='statsother@example.com', usr_password_hash='hashed',
            usr_role=UserRole.OWNER, usr_first_name='Omar', usr_last_name='Other',
        )
        self.other_owner_user.set_password(PASSWORD)
        self.other_owner_user.save()
        other_owner = OwnerProfile.objects.create(usr_id=self.other_owner_user)
        self.other_pet = Pet.objects.create(own_id=other_owner, pet_name='Zed', pet_sex=Sex.MALE)

        self.mange = Disease.objects.get(dis_code='MANGE')
        self.hotspot = Disease.objects.get(dis_code='HOTSPOT')

        self._make_screening(self.pet, self.mange, ScreeningStatus.PENDING_REVIEW)
        self._make_screening(self.pet, self.mange, ScreeningStatus.PENDING_REVIEW)
        self._make_screening(self.pet, self.hotspot, ScreeningStatus.REVIEWED)
        self._make_screening(self.other_pet, self.hotspot, ScreeningStatus.PENDING_REVIEW)

        self._link_to_clinic(self.pet, self.clinic)
        self._link_to_clinic(self.other_pet, self.other_clinic)

        self.receptionist_user = User.objects.create(
            usr_email=RECEPTIONIST_EMAIL, usr_password_hash='hashed',
            usr_role=UserRole.RECEPTIONIST, usr_first_name='Rita', usr_last_name='Desk',
        )
        self.receptionist_user.set_password(PASSWORD)
        self.receptionist_user.save()

    def _make_screening(self, pet, disease, status):
        return AiScreening.objects.create(
            pet_id=pet, dis_id=disease,
            ais_confidence=77, ais_model_version='test-1.0.0',
            ais_status=status,
        )

    def _link_to_clinic(self, pet, clinic):
        vet_user = User.objects.create(
            usr_email=f'vet-{pet.pet_name}@example.com'.lower(),
            usr_password_hash='hashed', usr_role=UserRole.VETERINARIAN,
            usr_first_name='V', usr_last_name='T',
        )
        vet_user.set_password(PASSWORD)
        vet_user.save()
        vet = StaffProfile.objects.create(
            usr_id=vet_user, cln_id=clinic, stf_position=StaffPosition.VETERINARIAN,
        )
        Appointment.objects.create(
            cln_id=clinic, pet_id=pet, stf_id=vet,
            apt_type='CONSULTATION', apt_status=AppointmentStatus.COMPLETED,
            apt_scheduled_at=timezone.now(),
            apt_created_by=vet_user,
        )

    def _auth(self, email):
        response = self.client.post(
            '/api/auth/login/',
            {'email': email, 'password': PASSWORD},
        )
        self.assertEqual(response.status_code, 200, response.data)
        return {'HTTP_AUTHORIZATION': f"Bearer {response.data['access']}"}

    def test_stats_returns_clinic_scoped_counts(self):
        response = self.client.get('/api/screenings/stats/', **self._auth(CLINIC_ADMIN_EMAIL))
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['screenings_pending_review'], 2)
        labels = {row['label']: row['value'] for row in response.data['screenings_by_disease']}
        self.assertEqual(labels, {'Mange': 2, 'Hotspot': 1})

    def test_owner_cannot_read_stats(self):
        response = self.client.get('/api/screenings/stats/', **self._auth('statsowner@example.com'))
        self.assertEqual(response.status_code, 403)

    def test_receptionist_cannot_read_stats(self):
        response = self.client.get('/api/screenings/stats/', **self._auth(RECEPTIONIST_EMAIL))
        self.assertEqual(response.status_code, 403)

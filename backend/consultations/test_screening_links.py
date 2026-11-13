import uuid
from datetime import timedelta
from unittest.mock import patch

from django.db import connection
from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from rest_framework.test import APIClient

from ai_screenings.models import AiScreening, Disease
from appointments.models import Appointment, AppointmentStatus, AppointmentType
from clinics.models import Clinic
from consultations.models import Consultation
from owners.models import OwnerProfile
from pets.models import Pet, Sex
from users.models import StaffPosition, StaffProfile, User, UserRole


class OwnerMedicalRecordLinkTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.owner_user = User.objects.create(
            usr_email='record-links@example.com', usr_role=UserRole.OWNER,
            usr_password_hash='unused',
        )
        cls.owner = OwnerProfile.objects.create(usr_id=cls.owner_user)
        cls.pet = Pet.objects.create(own_id=cls.owner, pet_name='Link Dog', pet_sex=Sex.MALE)
        cls.other_user = User.objects.create(
            usr_email='other-record-links@example.com', usr_role=UserRole.OWNER,
            usr_password_hash='unused',
        )
        cls.other_owner = OwnerProfile.objects.create(usr_id=cls.other_user)
        cls.other_pet = Pet.objects.create(own_id=cls.other_owner, pet_name='Other Dog', pet_sex=Sex.MALE)
        cls.vet_user = User.objects.create(
            usr_email='record-links-vet@example.com', usr_role=UserRole.VETERINARIAN,
            usr_password_hash='unused', usr_first_name='Vera', usr_last_name='Vet',
        )
        cls.clinic = Clinic.objects.create(cln_name='Record Links Clinic')
        cls.vet = StaffProfile.objects.create(
            usr_id=cls.vet_user, cln_id=cls.clinic, stf_position=StaffPosition.VETERINARIAN,
        )
        cls.screening = cls._screening(cls.pet)
        cls.other_screening = cls._screening(cls.other_pet)
        cls.appointment = cls._appointment(cls.pet, cls.screening)
        cls.consultation = Consultation.objects.create(
            apt_id=cls.appointment, stf_id=cls.vet, con_diagnosis='Mange',
        )

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(self.owner_user)

    @classmethod
    def _screening(cls, pet):
        return AiScreening.objects.create(
            pet_id=pet, usr_id=pet.own_id.usr_id, dis_id=Disease.objects.get(dis_code='MANGE'),
            ais_confidence='80.00', ais_model_version='test',
        )

    @classmethod
    def _appointment(cls, pet, screening=None, **extra):
        defaults = {
            'pet_id': pet,
            'cln_id': cls.clinic,
            'stf_id': cls.vet,
            'apt_screening': screening,
            'apt_type': AppointmentType.CONSULTATION,
            'apt_status': AppointmentStatus.COMPLETED,
            'apt_scheduled_at': timezone.now(),
        }
        defaults.update(extra)
        return Appointment.objects.create(**defaults)

    def _detail(self, screening=None):
        return self.client.get(f'/api/owner/screenings/{(screening or self.screening).pk}/')

    def test_consultation_list_and_detail_link_to_the_visit_screening(self):
        listing = self.client.get('/api/consultations/')
        detail = self.client.get(f'/api/consultations/{self.consultation.pk}/')
        self.assertEqual(listing.status_code, 200)
        self.assertEqual(listing.data[0]['screening_id'], str(self.screening.pk))
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.data['screening_id'], str(self.screening.pk))

    def test_screening_list_and_detail_link_to_consultation(self):
        expected = str(self.consultation.pk)
        detail = self._detail()
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.data['linked_consultations'][0]['id'], expected)
        self.assertEqual(detail.data['linked_consultations'][0]['kind'], 'ORIGINAL')
        self.assertEqual(detail.data['linked_consultations'][0]['veterinarian'], 'Vera Vet')
        self.assertEqual(
            set(detail.data['linked_consultations'][0]),
            {'kind', 'id', 'created_at', 'veterinarian'},
        )
        listing = self.client.get('/api/owner/screenings/')
        self.assertEqual(listing.data['results'][0]['linked_consultations'][0]['id'], expected)

    def test_unlinked_records_have_no_action_target(self):
        appointment = self._appointment(self.pet)
        consultation = Consultation.objects.create(apt_id=appointment, stf_id=self.vet, con_diagnosis='Other')
        response = self.client.get(f'/api/consultations/{consultation.pk}/')
        self.assertIsNone(response.data['screening_id'])
        unlinked_scan = self._screening(self.pet)
        self.assertEqual(self._detail(unlinked_scan).data['linked_consultations'], [])

    def test_booking_alone_does_not_create_a_consultation_link(self):
        scan = self._screening(self.pet)
        self._appointment(self.pet, scan)
        response = self._detail(scan)
        self.assertTrue(response.data['is_booked'])
        self.assertEqual(response.data['linked_consultations'], [])

    def test_finished_follow_up_adds_a_follow_up_link_after_the_original(self):
        follow_up = self._appointment(
            self.pet, self.screening, apt_type=AppointmentType.FOLLOW_UP,
            apt_source_consultation=self.consultation,
        )
        next_consultation = Consultation.objects.create(
            apt_id=follow_up, stf_id=self.vet, con_diagnosis='Mange follow-up',
        )
        response = self._detail()
        self.assertEqual(
            [(item['kind'], item['id']) for item in response.data['linked_consultations']],
            [('ORIGINAL', str(self.consultation.pk)), ('FOLLOW_UP', str(next_consultation.pk))],
        )

    def test_unfinished_follow_up_is_not_linked(self):
        for status in (
            AppointmentStatus.REVIEW,
            AppointmentStatus.CONFIRMATION,
            AppointmentStatus.CONFIRMED,
            AppointmentStatus.IN_PROGRESS,
        ):
            with self.subTest(status=status):
                Consultation.objects.exclude(pk=self.consultation.pk).delete()
                Appointment.objects.filter(apt_type=AppointmentType.FOLLOW_UP).delete()
                follow_up = self._appointment(
                    self.pet, self.screening, apt_status=status,
                    apt_type=AppointmentType.FOLLOW_UP,
                    apt_source_consultation=self.consultation,
                )
                Consultation.objects.create(
                    apt_id=follow_up, stf_id=self.vet, con_diagnosis='Mange follow-up',
                )
                self.assertEqual(
                    [item['kind'] for item in self._detail().data['linked_consultations']],
                    ['ORIGINAL'],
                )

    def test_completed_follow_up_without_a_consultation_is_not_linked(self):
        self._appointment(
            self.pet, self.screening, apt_type=AppointmentType.FOLLOW_UP,
            apt_source_consultation=self.consultation,
        )
        self.assertEqual(
            [item['kind'] for item in self._detail().data['linked_consultations']],
            ['ORIGINAL'],
        )

    def test_first_visit_stays_the_original_for_a_non_consultation_type(self):
        Appointment.objects.filter(pk=self.appointment.pk).update(
            apt_type=AppointmentType.EMERGENCY,
        )
        self.assertEqual(
            [(item['kind'], item['id']) for item in self._detail().data['linked_consultations']],
            [('ORIGINAL', str(self.consultation.pk))],
        )

    def test_follow_up_chain_exposes_only_original_and_newest_finished_follow_up(self):
        first_follow_up = self._appointment(
            self.pet, self.screening, apt_type=AppointmentType.FOLLOW_UP,
            apt_source_consultation=self.consultation,
        )
        second_consultation = Consultation.objects.create(
            apt_id=first_follow_up, stf_id=self.vet, con_diagnosis='Follow-up 1',
        )
        second_follow_up = self._appointment(
            self.pet, self.screening, apt_type=AppointmentType.FOLLOW_UP,
            apt_source_consultation=second_consultation,
        )
        third_consultation = Consultation.objects.create(
            apt_id=second_follow_up, stf_id=self.vet, con_diagnosis='Follow-up 2',
        )
        links = self._detail().data['linked_consultations']
        self.assertEqual(len(links), 2)
        self.assertEqual([item['kind'] for item in links], ['ORIGINAL', 'FOLLOW_UP'])
        self.assertEqual(links[0]['id'], str(self.consultation.pk))
        self.assertEqual(links[1]['id'], str(third_consultation.pk))

    def test_links_do_not_depend_on_ai_comparison_metadata(self):
        AiScreening.objects.filter(pk=self.screening.pk).update(con_id=None)
        response = self._detail()
        self.assertEqual(response.data['linked_consultations'][0]['id'], str(self.consultation.pk))

    def test_deleted_appointments_are_not_exposed_as_links(self):
        Appointment.objects.filter(pk=self.appointment.pk).update(apt_deleted_at=timezone.now())
        self.assertEqual(self._detail().data['linked_consultations'], [])

    def test_is_consulted_is_true_once_the_visit_is_completed_with_a_consultation(self):
        detail = self._detail()
        self.assertTrue(detail.data['is_booked'])
        self.assertTrue(detail.data['is_consulted'])

    def test_is_consulted_is_false_while_the_visit_is_still_in_progress(self):
        Appointment.objects.filter(pk=self.appointment.pk).update(
            apt_status=AppointmentStatus.IN_PROGRESS,
        )
        detail = self._detail()
        self.assertTrue(detail.data['is_booked'])
        self.assertFalse(detail.data['is_consulted'])

    def test_is_consulted_is_false_when_only_booked_without_a_consultation(self):
        scan = self._screening(self.pet)
        self._appointment(self.pet, scan)
        detail = self._detail(scan)
        self.assertTrue(detail.data['is_booked'])
        self.assertFalse(detail.data['is_consulted'])

    def test_is_consulted_is_false_for_a_cancelled_or_deleted_visit(self):
        Appointment.objects.filter(pk=self.appointment.pk).update(
            apt_status=AppointmentStatus.CANCELLED,
        )
        detail = self._detail()
        self.assertFalse(detail.data['is_booked'])
        self.assertFalse(detail.data['is_consulted'])

        Appointment.objects.filter(pk=self.appointment.pk).update(
            apt_status=AppointmentStatus.COMPLETED,
            apt_deleted_at=timezone.now(),
        )
        detail = self._detail()
        self.assertFalse(detail.data['is_booked'])
        self.assertFalse(detail.data['is_consulted'])

    def test_is_consulted_is_annotated_on_the_history_list(self):
        first = self.client.get('/api/owner/screenings/').data['results'][0]
        self.assertTrue(first['is_booked'])
        self.assertTrue(first['is_consulted'])

    def test_foreign_and_unknown_screening_detail_returns_404(self):
        self.assertEqual(self._detail(self.other_screening).status_code, 404)
        self.assertEqual(self.client.get(f'/api/owner/screenings/{uuid.uuid4()}/').status_code, 404)
        self.assertEqual(self.client.get(f'/api/consultations/{uuid.uuid4()}/').status_code, 404)

    def test_mismatched_pet_link_is_not_exposed_in_either_direction(self):
        Appointment.objects.filter(pk=self.appointment.pk).update(apt_screening=self.other_screening)
        response = self.client.get(f'/api/consultations/{self.consultation.pk}/')
        self.assertIsNone(response.data['screening_id'])
        self.client.force_authenticate(self.other_user)
        self.assertEqual(self._detail(self.other_screening).data['linked_consultations'], [])
        self.assertEqual(self.client.get(f'/api/consultations/{self.consultation.pk}/').status_code, 404)

    def test_screening_detail_is_owner_only_and_read_only(self):
        self.client.force_authenticate(None)
        self.assertEqual(self._detail().status_code, 401)
        self.client.force_authenticate(self.vet_user)
        self.assertEqual(self._detail().status_code, 403)
        self.client.force_authenticate(self.owner_user)
        self.assertEqual(self.client.patch(f'/api/owner/screenings/{self.screening.pk}/', {}).status_code, 405)

    def test_old_screening_opens_even_when_not_in_first_history_page(self):
        AiScreening.objects.filter(pk=self.screening.pk).update(ais_created_at=timezone.now() - timedelta(days=1))
        self._screening(self.pet)
        page = self.client.get('/api/owner/screenings/?page_size=1')
        self.assertNotEqual(page.data['results'][0]['ais_id'], str(self.screening.pk))
        self.assertEqual(self._detail().status_code, 200)

    def test_link_reads_do_not_modify_prediction_or_diagnosis(self):
        before = AiScreening.objects.filter(pk=self.screening.pk).values().get()
        with patch('ai_screenings.services.ScreeningService.record_comparison') as comparison:
            self._detail()
            self.client.get(f'/api/consultations/{self.consultation.pk}/')
            comparison.assert_not_called()
        self.assertEqual(before, AiScreening.objects.filter(pk=self.screening.pk).values().get())
        self.consultation.refresh_from_db()
        self.assertEqual(self.consultation.con_diagnosis, 'Mange')

    def test_history_links_are_prefetched_not_queried_per_screening(self):
        with CaptureQueriesContext(connection) as small:
            self.client.get('/api/owner/screenings/')
        for _ in range(3):
            scan = self._screening(self.pet)
            appointment = self._appointment(self.pet, scan)
            Consultation.objects.create(apt_id=appointment, stf_id=self.vet, con_diagnosis='Mange')
        with CaptureQueriesContext(connection) as large:
            response = self.client.get('/api/owner/screenings/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(small), len(large))

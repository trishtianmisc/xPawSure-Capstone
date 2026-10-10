from datetime import datetime, time, timedelta
import json

from django.test import TestCase
from django.utils import timezone

from appointments.models import Appointment, AppointmentStatus, AppointmentType
from clinics.models import Clinic
from consultations.models import Consultation
from owners.models import OwnerProfile
from pets.models import Breed, Pet, Sex
from prescriptions.models import Prescription
from users.models import StaffPosition, StaffProfile, User, UserRole

PASSWORD = 'TestPass123!'
VET_EMAIL = 'vet@example.com'
OTHER_VET_EMAIL = 'vet2@example.com'
RECEPTIONIST_EMAIL = 'desk@example.com'
OWNER_EMAIL = 'owner@example.com'


class VetDashboardBase(TestCase):

    def setUp(self):
        self.clinic = Clinic.objects.create(cln_name='Happy Paws Clinic')

        self.vet_user = self._create_user(
            VET_EMAIL, UserRole.VETERINARIAN, 'Vera', 'Vet',
        )
        self.vet = StaffProfile.objects.create(
            usr_id=self.vet_user,
            cln_id=self.clinic,
            stf_position=StaffPosition.VETERINARIAN,
        )

        self.other_vet_user = self._create_user(
            OTHER_VET_EMAIL, UserRole.VETERINARIAN, 'Otto', 'Other',
        )
        self.other_vet = StaffProfile.objects.create(
            usr_id=self.other_vet_user,
            cln_id=self.clinic,
            stf_position=StaffPosition.VETERINARIAN,
        )

        self.receptionist_user = self._create_user(
            RECEPTIONIST_EMAIL, UserRole.RECEPTIONIST, 'Rita', 'Desk',
        )
        StaffProfile.objects.create(
            usr_id=self.receptionist_user,
            cln_id=self.clinic,
            stf_position=StaffPosition.RECEPTIONIST,
        )

        owner_user = self._create_user(
            OWNER_EMAIL, UserRole.OWNER, 'Olivia', 'Owner',
        )
        owner = OwnerProfile.objects.create(usr_id=owner_user)
        self.breed = Breed.objects.create(brd_name='Pug')
        self.pet = Pet.objects.create(
            own_id=owner,
            brd_id=self.breed,
            pet_name='Max',
            pet_sex=Sex.MALE,
        )

        today = timezone.localdate()
        self.today_9am = self._aware(today, time(9, 0))
        self.today_1pm = self._aware(today, time(13, 0))
        self.tomorrow_9am = self._aware(today + timedelta(days=1), time(9, 0))

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

    @staticmethod
    def _aware(day, at):
        return timezone.make_aware(datetime.combine(day, at))

    def _make_appointment(self, vet, apt_status, scheduled_at, pet=None):
        return Appointment.objects.create(
            pet_id=pet or self.pet,
            cln_id=self.clinic,
            stf_id=vet,
            apt_type=AppointmentType.CONSULTATION,
            apt_status=apt_status,
            apt_scheduled_at=scheduled_at,
            apt_created_by=self.vet_user,
        )


class VetDashboardStatsTests(VetDashboardBase):

    def test_dashboard_requires_veterinarian(self):
        response = self.client.get(
            '/api/veterinarian/dashboard/',
            **self._auth(RECEPTIONIST_EMAIL),
        )
        self.assertEqual(response.status_code, 403)

    def test_stats_counts_are_scoped_to_vet(self):
        today = timezone.localdate()

        self._make_appointment(
            self.vet, AppointmentStatus.COMPLETED, self.today_9am,
        )
        self._make_appointment(
            self.vet,
            AppointmentStatus.COMPLETED,
            self._aware(today - timedelta(days=40), time(9, 0)),
        )
        self._make_appointment(
            self.vet, AppointmentStatus.CONFIRMED, self.tomorrow_9am,
        )
        self._make_appointment(
            self.vet, AppointmentStatus.CHECKED_IN, self.today_1pm,
        )
        self._make_appointment(
            self.vet, AppointmentStatus.IN_PROGRESS, self.today_1pm,
        )
        self._make_appointment(
            self.vet, AppointmentStatus.PENDING, self.today_1pm,
        )
        self._make_appointment(
            self.other_vet, AppointmentStatus.COMPLETED, self.today_9am,
        )

        response = self.client.get(
            '/api/veterinarian/dashboard/',
            **self._auth(VET_EMAIL),
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['clinic_name'], 'Happy Paws Clinic')

        stats = response.data['stats']
        self.assertEqual(stats['consultations_this_month'], 1)
        self.assertEqual(stats['pending'], 3)
        self.assertEqual(stats['completed'], 2)

    def test_today_consultations_exclude_pending_and_other_vets(self):
        confirmed = self._make_appointment(
            self.vet, AppointmentStatus.CONFIRMED, self.today_9am,
        )
        self._make_appointment(
            self.vet, AppointmentStatus.IN_PROGRESS, self.today_1pm,
        )
        self._make_appointment(
            self.vet, AppointmentStatus.PENDING, self.today_1pm,
        )
        self._make_appointment(
            self.vet, AppointmentStatus.CONFIRMED, self.tomorrow_9am,
        )
        self._make_appointment(
            self.other_vet, AppointmentStatus.CONFIRMED, self.today_9am,
        )

        today = timezone.localdate().isoformat()
        response = self.client.get(
            '/api/veterinarian/dashboard/',
            {'date': today},
            **self._auth(VET_EMAIL),
        )
        self.assertEqual(response.status_code, 200, response.data)

        rows = response.data['today_consultations']
        apt_ids = {row['apt_id'] for row in rows}
        self.assertIn(str(confirmed.apt_id), apt_ids)
        self.assertEqual(len(rows), 2)
        for row in rows:
            self.assertNotEqual(row['apt_status'], 'PENDING')
        self.assertEqual(rows[0]['pet_name'], 'Max')

    def test_invalid_date_is_rejected(self):
        response = self.client.get(
            '/api/veterinarian/dashboard/',
            {'date': 'not-a-date'},
            **self._auth(VET_EMAIL),
        )
        self.assertEqual(response.status_code, 400)


class VetAppointmentListTests(VetDashboardBase):

    def test_list_returns_only_own_appointments(self):
        mine = self._make_appointment(
            self.vet, AppointmentStatus.CONFIRMED, self.today_9am,
        )
        self._make_appointment(
            self.other_vet, AppointmentStatus.CONFIRMED, self.today_1pm,
        )

        response = self.client.get(
            '/api/veterinarian/appointments/',
            **self._auth(VET_EMAIL),
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['apt_id'], str(mine.apt_id))

    def test_list_filters_by_date_range(self):
        today = timezone.localdate()
        in_range_1 = self._make_appointment(
            self.vet, AppointmentStatus.CONFIRMED, self.today_9am,
        )
        in_range_2 = self._make_appointment(
            self.vet, AppointmentStatus.COMPLETED, self.tomorrow_9am,
        )
        self._make_appointment(
            self.vet,
            AppointmentStatus.CONFIRMED,
            self._aware(today - timedelta(days=10), time(9, 0)),
        )
        self._make_appointment(
            self.vet,
            AppointmentStatus.CONFIRMED,
            self._aware(today + timedelta(days=10), time(9, 0)),
        )

        response = self.client.get(
            '/api/veterinarian/appointments/',
            {
                'start_date': today.isoformat(),
                'end_date': (today + timedelta(days=1)).isoformat(),
            },
            **self._auth(VET_EMAIL),
        )
        self.assertEqual(response.status_code, 200, response.data)
        apt_ids = {row['apt_id'] for row in response.data}
        self.assertEqual(apt_ids, {
            str(in_range_1.apt_id),
            str(in_range_2.apt_id),
        })

    def test_list_start_date_only_filters_lower_bound(self):
        today = timezone.localdate()
        on_start = self._make_appointment(
            self.vet, AppointmentStatus.CONFIRMED, self.today_9am,
        )
        before_start = self._make_appointment(
            self.vet,
            AppointmentStatus.CONFIRMED,
            self._aware(today - timedelta(days=1), time(17, 0)),
        )

        response = self.client.get(
            '/api/veterinarian/appointments/',
            {'start_date': today.isoformat()},
            **self._auth(VET_EMAIL),
        )
        self.assertEqual(response.status_code, 200, response.data)
        apt_ids = {row['apt_id'] for row in response.data}
        self.assertIn(str(on_start.apt_id), apt_ids)
        self.assertNotIn(str(before_start.apt_id), apt_ids)

    def test_list_invalid_range_date_returns_400(self):
        today = timezone.localdate()
        response = self.client.get(
            '/api/veterinarian/appointments/',
            {'start_date': 'not-a-date', 'end_date': today.isoformat()},
            **self._auth(VET_EMAIL),
        )
        self.assertEqual(response.status_code, 400)

    def test_list_start_after_end_returns_400(self):
        today = timezone.localdate()
        response = self.client.get(
            '/api/veterinarian/appointments/',
            {
                'start_date': (today + timedelta(days=1)).isoformat(),
                'end_date': today.isoformat(),
            },
            **self._auth(VET_EMAIL),
        )
        self.assertEqual(response.status_code, 400)


class VetStartConsultationTests(VetDashboardBase):

    def test_start_moves_checked_in_to_in_progress(self):
        appointment = self._make_appointment(
            self.vet, AppointmentStatus.CHECKED_IN, self.today_9am,
        )

        response = self.client.post(
            f'/api/veterinarian/appointments/{appointment.apt_id}/start/',
            **self._auth(VET_EMAIL),
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['apt_status'], 'IN_PROGRESS')

        appointment.refresh_from_db()
        self.assertEqual(appointment.apt_status, AppointmentStatus.IN_PROGRESS)

    def test_start_rejects_confirmed_appointment(self):
        appointment = self._make_appointment(
            self.vet, AppointmentStatus.CONFIRMED, self.today_9am,
        )

        response = self.client.post(
            f'/api/veterinarian/appointments/{appointment.apt_id}/start/',
            **self._auth(VET_EMAIL),
        )
        self.assertEqual(response.status_code, 409)

        appointment.refresh_from_db()
        self.assertEqual(appointment.apt_status, AppointmentStatus.CONFIRMED)

    def test_start_rejects_pending_appointment(self):
        appointment = self._make_appointment(
            self.vet, AppointmentStatus.PENDING, self.today_9am,
        )

        response = self.client.post(
            f'/api/veterinarian/appointments/{appointment.apt_id}/start/',
            **self._auth(VET_EMAIL),
        )
        self.assertEqual(response.status_code, 409)

    def test_start_rejects_other_vets_appointment(self):
        appointment = self._make_appointment(
            self.other_vet, AppointmentStatus.CHECKED_IN, self.today_9am,
        )

        response = self.client.post(
            f'/api/veterinarian/appointments/{appointment.apt_id}/start/',
            **self._auth(VET_EMAIL),
        )
        self.assertEqual(response.status_code, 403)

    def test_start_missing_appointment_returns_404(self):
        import uuid

        response = self.client.post(
            f'/api/veterinarian/appointments/{uuid.uuid4()}/start/',
            **self._auth(VET_EMAIL),
        )
        self.assertEqual(response.status_code, 404)


class VetAppointmentDetailTests(VetDashboardBase):

    def test_vet_can_read_own_appointment_with_pet_birth_date(self):
        appointment = self._make_appointment(
            self.vet, AppointmentStatus.CONFIRMED, self.today_9am,
        )

        response = self.client.get(
            f'/api/appointments/{appointment.apt_id}/',
            **self._auth(VET_EMAIL),
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['pet_name'], 'Max')
        self.assertEqual(response.data['pet_breed'], 'Pug')
        self.assertIn('pet_birth_date', response.data)
        self.assertEqual(response.data['owner_name'], 'Olivia Owner')

    def test_vet_cannot_read_other_vets_appointment(self):
        appointment = self._make_appointment(
            self.other_vet, AppointmentStatus.CONFIRMED, self.today_9am,
        )

        response = self.client.get(
            f'/api/appointments/{appointment.apt_id}/',
            **self._auth(VET_EMAIL),
        )
        self.assertEqual(response.status_code, 403)

    def test_receptionist_can_still_read_any_appointment(self):
        appointment = self._make_appointment(
            self.vet, AppointmentStatus.CONFIRMED, self.today_9am,
        )

        response = self.client.get(
            f'/api/appointments/{appointment.apt_id}/',
            **self._auth(RECEPTIONIST_EMAIL),
        )
        self.assertEqual(response.status_code, 200, response.data)


class VetCancellationTests(VetDashboardBase):

    def test_vet_can_cancel_own_appointment(self):
        appointment = self._make_appointment(
            self.vet, AppointmentStatus.CONFIRMED, self.today_9am,
        )

        response = self.client.patch(
            f'/api/appointments/{appointment.apt_id}/',
            data=json.dumps({
                'apt_status': 'CANCELLED',
                'cancellation_reason': 'Vet unavailable',
            }),
            content_type='application/json',
            **self._auth(VET_EMAIL),
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['apt_status'], 'CANCELLED')

        appointment.refresh_from_db()
        self.assertEqual(appointment.apt_cancellation_reason, 'Vet unavailable')

    def test_vet_cannot_use_other_status_transitions(self):
        appointment = self._make_appointment(
            self.vet, AppointmentStatus.CONFIRMED, self.today_9am,
        )

        response = self.client.patch(
            f'/api/appointments/{appointment.apt_id}/',
            data=json.dumps({'apt_status': 'CHECKED_IN'}),
            content_type='application/json',
            **self._auth(VET_EMAIL),
        )
        self.assertEqual(response.status_code, 403)

    def test_vet_cannot_cancel_other_vets_appointment(self):
        appointment = self._make_appointment(
            self.other_vet, AppointmentStatus.CONFIRMED, self.today_9am,
        )

        response = self.client.patch(
            f'/api/appointments/{appointment.apt_id}/',
            data=json.dumps({'apt_status': 'CANCELLED'}),
            content_type='application/json',
            **self._auth(VET_EMAIL),
        )
        self.assertEqual(response.status_code, 403)


class VetConsultationSaveTests(VetDashboardBase):

    def _payload(self, appointment, **overrides):
        payload = {
            'appointment_id': str(appointment.apt_id),
            'chief_complaint': 'Itchy skin',
            'objective': 'Red patches on belly',
            'diagnosis': 'Fungal',
            'notes': 'Follow up in two weeks',
        }
        payload.update(overrides)
        return payload

    def _post(self, payload, email=VET_EMAIL):
        return self.client.post(
            '/api/consultations/',
            data=json.dumps(payload),
            content_type='application/json',
            **self._auth(email),
        )

    def _put(self, con_id, payload, email=VET_EMAIL):
        return self.client.put(
            f'/api/consultations/{con_id}/',
            data=json.dumps(payload),
            content_type='application/json',
            **self._auth(email),
        )

    def test_vet_creates_consultation_for_in_progress_appointment(self):
        appointment = self._make_appointment(
            self.vet, AppointmentStatus.IN_PROGRESS, self.today_9am,
        )

        response = self._post(self._payload(appointment))

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['diagnosis'], 'Fungal')
        self.assertEqual(response.data['appointment_id'], str(appointment.apt_id))
        self.assertTrue(
            Consultation.objects.filter(apt_id=appointment).exists(),
        )

    def test_cannot_save_before_start(self):
        appointment = self._make_appointment(
            self.vet, AppointmentStatus.CONFIRMED, self.today_9am,
        )

        response = self._post(self._payload(appointment))

        self.assertEqual(response.status_code, 409)
        self.assertFalse(Consultation.objects.filter(apt_id=appointment).exists())

    def test_duplicate_consultation_returns_409(self):
        appointment = self._make_appointment(
            self.vet, AppointmentStatus.IN_PROGRESS, self.today_9am,
        )
        self._post(self._payload(appointment))

        response = self._post(self._payload(appointment))

        self.assertEqual(response.status_code, 409)
        self.assertEqual(
            Consultation.objects.filter(apt_id=appointment).count(), 1,
        )

    def test_blank_diagnosis_returns_400(self):
        appointment = self._make_appointment(
            self.vet, AppointmentStatus.IN_PROGRESS, self.today_9am,
        )

        response = self._post(self._payload(appointment, diagnosis='   '))

        self.assertEqual(response.status_code, 400)
        self.assertFalse(Consultation.objects.filter(apt_id=appointment).exists())

    def test_other_vet_cannot_save_consultation(self):
        appointment = self._make_appointment(
            self.other_vet, AppointmentStatus.IN_PROGRESS, self.today_9am,
        )

        response = self._post(self._payload(appointment))

        self.assertEqual(response.status_code, 403)
        self.assertFalse(Consultation.objects.filter(apt_id=appointment).exists())

    def test_receptionist_cannot_save_consultation(self):
        appointment = self._make_appointment(
            self.vet, AppointmentStatus.IN_PROGRESS, self.today_9am,
        )

        response = self._post(self._payload(appointment), email=RECEPTIONIST_EMAIL)

        self.assertEqual(response.status_code, 403)

    def test_missing_appointment_returns_404(self):
        import uuid

        response = self._post(self._payload(self._make_appointment(
            self.vet, AppointmentStatus.IN_PROGRESS, self.today_9am,
        ), appointment_id=str(uuid.uuid4())))

        self.assertEqual(response.status_code, 404)

    def test_vet_updates_own_consultation_while_in_progress(self):
        appointment = self._make_appointment(
            self.vet, AppointmentStatus.IN_PROGRESS, self.today_9am,
        )
        created = self._post(self._payload(appointment))

        response = self._put(
            created.data['id'],
            self._payload(appointment, diagnosis='Mange', objective='Scraping done'),
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['diagnosis'], 'Mange')
        self.assertEqual(response.data['objective'], 'Scraping done')
        self.assertEqual(
            Consultation.objects.filter(apt_id=appointment).count(), 1,
        )

    def test_update_rejected_after_completion(self):
        appointment = self._make_appointment(
            self.vet, AppointmentStatus.COMPLETED, self.today_9am,
        )
        consultation = Consultation.objects.create(
            apt_id=appointment,
            stf_id=self.vet,
            con_diagnosis='Fungal',
        )

        response = self._put(
            consultation.con_id,
            self._payload(appointment, diagnosis='Mange'),
        )

        self.assertEqual(response.status_code, 409)
        consultation.refresh_from_db()
        self.assertEqual(consultation.con_diagnosis, 'Fungal')

    def test_other_vet_cannot_update_consultation(self):
        appointment = self._make_appointment(
            self.other_vet, AppointmentStatus.IN_PROGRESS, self.today_9am,
        )
        consultation = Consultation.objects.create(
            apt_id=appointment,
            stf_id=self.other_vet,
            con_diagnosis='Fungal',
        )

        response = self._put(
            consultation.con_id,
            self._payload(appointment, diagnosis='Mange'),
        )

        self.assertEqual(response.status_code, 403)
        consultation.refresh_from_db()
        self.assertEqual(consultation.con_diagnosis, 'Fungal')

    def test_appointment_detail_exposes_nested_consultation(self):
        appointment = self._make_appointment(
            self.vet, AppointmentStatus.IN_PROGRESS, self.today_9am,
        )

        empty = self.client.get(
            f'/api/appointments/{appointment.apt_id}/',
            **self._auth(VET_EMAIL),
        )
        self.assertEqual(empty.status_code, 200, empty.data)
        self.assertIsNone(empty.data['consultation'])

        self._post(self._payload(appointment))

        response = self.client.get(
            f'/api/appointments/{appointment.apt_id}/',
            **self._auth(VET_EMAIL),
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['consultation']['diagnosis'], 'Fungal')


class VetPrescriptionSaveTests(VetDashboardBase):

    def setUp(self):
        super().setUp()
        self.appointment = self._make_appointment(
            self.vet, AppointmentStatus.IN_PROGRESS, self.today_9am,
        )
        self.consultation = Consultation.objects.create(
            apt_id=self.appointment,
            stf_id=self.vet,
            con_diagnosis='Fungal',
        )

    def _payload(self, **overrides):
        payload = {
            'consultation_id': str(self.consultation.con_id),
            'instructions': 'Finish the full course.',
            'items': [
                {
                    'medicine_name': 'Antifungal Cream',
                    'generic_name': 'Miconazole',
                    'dosage': 'Thin layer',
                    'frequency': 'Twice daily',
                    'duration': '14 days',
                    'route': 'TOPICAL',
                    'notes': 'Apply to affected area',
                },
                {
                    'medicine_name': 'Antihistamine',
                    'generic_name': '',
                    'dosage': '5 mg',
                    'frequency': 'Once daily',
                    'duration': '7 days',
                    'route': 'ORAL',
                    'quantity': 7,
                },
            ],
        }
        payload.update(overrides)
        return payload

    def _post(self, payload, email=VET_EMAIL):
        return self.client.post(
            '/api/prescriptions/',
            data=json.dumps(payload),
            content_type='application/json',
            **self._auth(email),
        )

    def test_vet_creates_prescription_with_items(self):
        response = self._post(self._payload())

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['consultation_id'], str(self.consultation.con_id))
        self.assertEqual(len(response.data['items']), 2)
        self.assertEqual(response.data['items'][0]['generic_name'], 'Miconazole')
        self.assertEqual(response.data['items'][0]['route'], 'TOPICAL')
        self.assertIsNone(response.data['items'][1]['generic_name'])

        self.assertTrue(Prescription.objects.filter(con_id=self.consultation).exists())

    def test_empty_items_return_400(self):
        response = self._post(self._payload(items=[]))

        self.assertEqual(response.status_code, 400)
        self.assertFalse(Prescription.objects.filter(con_id=self.consultation).exists())

    def test_invalid_route_returns_400(self):
        payload = self._payload()
        payload['items'][0]['route'] = 'SMOKED'

        response = self._post(payload)

        self.assertEqual(response.status_code, 400)
        self.assertFalse(Prescription.objects.filter(con_id=self.consultation).exists())

    def test_prescription_rejected_when_not_in_progress(self):
        self.appointment.apt_status = AppointmentStatus.COMPLETED
        self.appointment.save(update_fields=['apt_status'])

        response = self._post(self._payload())

        self.assertEqual(response.status_code, 409)
        self.assertFalse(Prescription.objects.filter(con_id=self.consultation).exists())

    def test_other_vet_cannot_save_prescription(self):
        response = self._post(self._payload(), email=OTHER_VET_EMAIL)

        self.assertEqual(response.status_code, 403)
        self.assertFalse(Prescription.objects.filter(con_id=self.consultation).exists())

    def test_receptionist_cannot_save_prescription(self):
        response = self._post(self._payload(), email=RECEPTIONIST_EMAIL)

        self.assertEqual(response.status_code, 403)

    def test_second_save_updates_instead_of_duplicating(self):
        self._post(self._payload())

        payload = self._payload(instructions='Updated instructions.')
        payload['items'] = [payload['items'][0]]

        response = self._post(payload)

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['instructions'], 'Updated instructions.')
        self.assertEqual(len(response.data['items']), 1)
        self.assertEqual(
            Prescription.objects.filter(con_id=self.consultation).count(), 1,
        )

    def test_appointment_detail_exposes_nested_prescription(self):
        empty = self.client.get(
            f'/api/appointments/{self.appointment.apt_id}/',
            **self._auth(VET_EMAIL),
        )
        self.assertEqual(empty.status_code, 200, empty.data)
        self.assertIsNone(empty.data['prescription'])

        self._post(self._payload())

        response = self.client.get(
            f'/api/appointments/{self.appointment.apt_id}/',
            **self._auth(VET_EMAIL),
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(len(response.data['prescription']['items']), 2)

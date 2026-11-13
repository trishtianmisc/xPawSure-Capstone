from datetime import datetime, time, timedelta
from decimal import Decimal
import json

from django.test import TestCase
from django.utils import timezone

from ai_screenings.models import AiScreening, Disease
from appointments.models import Appointment, AppointmentStatus, AppointmentType
from appointments.services import CLINIC_TIMEZONE
from clinics.models import Clinic
from consultations.models import Consultation
from owners.models import OwnerProfile
from payments.models import Payment, PaymentMethod, PaymentProvider, PaymentStatus
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

        # Keep the future appointment inside the current month so the
        # month-scoped pending count stays stable when run on month end.
        next_day = today + timedelta(days=1)
        if next_day.month != today.month:
            next_day = today
        future_9am = self._aware(next_day, time(9, 0))

        self._make_appointment(
            self.vet, AppointmentStatus.COMPLETED, self.today_9am,
        )
        self._make_appointment(
            self.vet,
            AppointmentStatus.COMPLETED,
            self._aware(today - timedelta(days=40), time(9, 0)),
        )
        self._make_appointment(
            self.vet, AppointmentStatus.CONFIRMED, future_9am,
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
        self.assertEqual(stats['consultations_this_month'], 4)
        self.assertEqual(stats['pending'], 3)
        self.assertEqual(stats['completed'], 1)
        self.assertEqual(
            stats['consultations_this_month'],
            stats['pending'] + stats['completed'],
        )

    def test_stats_reset_each_month(self):
        today = timezone.localdate()
        prev_month_last_day = today.replace(day=1) - timedelta(days=1)

        self._make_appointment(
            self.vet,
            AppointmentStatus.COMPLETED,
            self._aware(prev_month_last_day, time(9, 0)),
        )
        self._make_appointment(
            self.vet,
            AppointmentStatus.CONFIRMED,
            self._aware(prev_month_last_day, time(10, 0)),
        )

        self._make_appointment(
            self.vet, AppointmentStatus.COMPLETED, self.today_9am,
        )
        self._make_appointment(
            self.vet, AppointmentStatus.CHECKED_IN, self.today_1pm,
        )

        response = self.client.get(
            '/api/veterinarian/dashboard/',
            **self._auth(VET_EMAIL),
        )
        self.assertEqual(response.status_code, 200, response.data)

        stats = response.data['stats']
        self.assertEqual(stats['consultations_this_month'], 2)
        self.assertEqual(stats['completed'], 1)
        self.assertEqual(stats['pending'], 1)

    def test_stats_exclude_unconfirmed_and_inactive_statuses(self):
        self._make_appointment(
            self.vet, AppointmentStatus.PENDING, self.today_9am,
        )
        self._make_appointment(
            self.vet, AppointmentStatus.CANCELLED, self.today_9am,
        )
        self._make_appointment(
            self.vet, AppointmentStatus.NO_SHOW, self.today_1pm,
        )
        self._make_appointment(
            self.vet, AppointmentStatus.CONFIRMED, self.today_1pm,
        )
        self._make_appointment(
            self.vet, AppointmentStatus.COMPLETED, self.today_1pm,
        )

        response = self.client.get(
            '/api/veterinarian/dashboard/',
            **self._auth(VET_EMAIL),
        )
        self.assertEqual(response.status_code, 200, response.data)

        stats = response.data['stats']
        self.assertEqual(stats['consultations_this_month'], 2)
        self.assertEqual(stats['pending'], 1)
        self.assertEqual(stats['completed'], 1)
        self.assertEqual(
            stats['consultations_this_month'],
            stats['pending'] + stats['completed'],
        )

    def test_today_stats_group_today_appointments_by_stage(self):
        self._make_appointment(
            self.vet, AppointmentStatus.CONFIRMED, self.today_9am,
        )
        self._make_appointment(
            self.vet, AppointmentStatus.CONFIRMED, self.today_1pm,
        )
        self._make_appointment(
            self.vet, AppointmentStatus.CHECKED_IN, self.today_1pm,
        )
        self._make_appointment(
            self.vet, AppointmentStatus.IN_PROGRESS, self.today_1pm,
        )
        self._make_appointment(
            self.vet, AppointmentStatus.COMPLETED, self.today_9am,
        )
        self._make_appointment(
            self.vet, AppointmentStatus.PENDING, self.today_1pm,
        )
        self._make_appointment(
            self.vet, AppointmentStatus.CANCELLED, self.today_1pm,
        )
        self._make_appointment(
            self.vet, AppointmentStatus.NO_SHOW, self.today_1pm,
        )
        self._make_appointment(
            self.vet, AppointmentStatus.CONFIRMED, self.tomorrow_9am,
        )
        self._make_appointment(
            self.other_vet, AppointmentStatus.CONFIRMED, self.today_9am,
        )

        response = self.client.get(
            '/api/veterinarian/dashboard/',
            {'date': timezone.localdate().isoformat()},
            **self._auth(VET_EMAIL),
        )
        self.assertEqual(response.status_code, 200, response.data)

        today_stats = response.data['stats']['today_stats']
        self.assertEqual(today_stats, {
            'total': 5,
            'confirmed': 2,
            'ongoing': 2,
            'completed': 1,
        })

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

    def test_upcoming_consultations_include_active_statuses_from_today_forward(self):
        confirmed = self._make_appointment(
            self.vet, AppointmentStatus.CONFIRMED, self.today_1pm,
        )
        checked_in = self._make_appointment(
            self.vet, AppointmentStatus.CHECKED_IN, self.today_1pm,
        )
        in_progress = self._make_appointment(
            self.vet, AppointmentStatus.IN_PROGRESS, self.today_1pm,
        )
        self._make_appointment(
            self.vet, AppointmentStatus.COMPLETED, self.today_9am,
        )
        self._make_appointment(
            self.vet, AppointmentStatus.PENDING, self.today_1pm,
        )
        tomorrow = self._make_appointment(
            self.vet, AppointmentStatus.CONFIRMED, self.tomorrow_9am,
        )
        self._make_appointment(
            self.other_vet, AppointmentStatus.CONFIRMED, self.today_1pm,
        )

        response = self.client.get(
            '/api/veterinarian/dashboard/',
            {'date': timezone.localdate().isoformat()},
            **self._auth(VET_EMAIL),
        )
        self.assertEqual(response.status_code, 200, response.data)

        rows = response.data['upcoming_consultations']
        self.assertEqual(len(rows), 4)
        apt_ids = {row['apt_id'] for row in rows}
        self.assertIn(str(confirmed.apt_id), apt_ids)
        self.assertIn(str(checked_in.apt_id), apt_ids)
        self.assertIn(str(in_progress.apt_id), apt_ids)
        self.assertEqual(rows[-1]['apt_id'], str(tomorrow.apt_id))
        self.assertEqual(
            {row['apt_status'] for row in rows},
            {'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'},
        )

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

    def test_list_exposes_pet_profile_image(self):
        appointment = self._make_appointment(
            self.vet, AppointmentStatus.CONFIRMED, self.today_9am,
        )
        self.pet.pet_profile_image = 'https://example.com/max.jpg'
        self.pet.save(update_fields=['pet_profile_image'])

        response = self.client.get(
            '/api/veterinarian/appointments/',
            **self._auth(VET_EMAIL),
        )
        self.assertEqual(response.status_code, 200, response.data)
        row = next(
            item for item in response.data
            if item['apt_id'] == str(appointment.apt_id)
        )
        self.assertEqual(row['pet_profile_image'], 'https://example.com/max.jpg')

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

        self.pet.pet_weight = '12.50'
        self.pet.pet_color = 'Black'
        self.pet.save(update_fields=['pet_weight', 'pet_color'])

        response = self.client.get(
            f'/api/appointments/{appointment.apt_id}/',
            **self._auth(VET_EMAIL),
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['pet_name'], 'Max')
        self.assertEqual(response.data['pet_breed'], 'Pug')
        self.assertIn('pet_birth_date', response.data)
        self.assertEqual(str(response.data['pet_weight']), '12.50')
        self.assertEqual(response.data['pet_color'], 'Black')
        self.assertEqual(response.data['owner_name'], 'Olivia Owner')

    def test_vet_can_read_pet_profile_image(self):
        appointment = self._make_appointment(
            self.vet, AppointmentStatus.CONFIRMED, self.today_9am,
        )

        self.pet.pet_profile_image = 'https://example.com/max.jpg'
        self.pet.save(update_fields=['pet_profile_image'])

        response = self.client.get(
            f'/api/appointments/{appointment.apt_id}/',
            **self._auth(VET_EMAIL),
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['pet_profile_image'], 'https://example.com/max.jpg')

    def test_appointment_detail_exposes_payment_provider_ref(self):
        appointment = self._make_appointment(
            self.vet, AppointmentStatus.CONFIRMED, self.today_9am,
        )
        Payment.objects.create(
            pay_reference='PAY-123',
            cln_id=self.clinic,
            own_id=self.pet.own_id,
            apt_id=appointment,
            pay_amount=Decimal('250.00'),
            pay_method=PaymentMethod.CASH,
            pay_provider=PaymentProvider.CASH,
            pay_status=PaymentStatus.PAID,
            pay_provider_ref='PROV-REF-123',
        )

        response = self.client.get(
            f'/api/appointments/{appointment.apt_id}/',
            **self._auth(VET_EMAIL),
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['payment_provider_ref'], 'PROV-REF-123')

    def test_appointment_detail_exposes_screening_symptom_answers(self):
        appointment = self._make_appointment(
            self.vet, AppointmentStatus.CONFIRMED, self.today_9am,
        )
        disease, _ = Disease.objects.get_or_create(
            dis_name='Fungal', defaults={'dis_code': 'FUNG'},
        )
        rows = [
            {'question': 'Is the skin itchy?', 'answer': 'Yes'},
            {'question': 'Is there hair loss?', 'answer': 'No'},
        ]
        screening = AiScreening.objects.create(
            pet_id=self.pet,
            dis_id=disease,
            ais_confidence=87.50,
            ais_model_version='v1.0',
            ais_symptom_answers=rows,
        )
        appointment.apt_screening = screening
        appointment.save(update_fields=['apt_screening'])

        response = self.client.get(
            f'/api/appointments/{appointment.apt_id}/',
            **self._auth(VET_EMAIL),
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['screening']['symptom_answers'], rows)

    def test_appointment_detail_returns_null_symptom_answers_without_questionnaire(self):
        appointment = self._make_appointment(
            self.vet, AppointmentStatus.CONFIRMED, self.today_9am,
        )
        disease, _ = Disease.objects.get_or_create(
            dis_name='Mange', defaults={'dis_code': 'MANG'},
        )
        screening = AiScreening.objects.create(
            pet_id=self.pet,
            dis_id=disease,
            ais_confidence=70.00,
            ais_model_version='v1.0',
        )
        appointment.apt_screening = screening
        appointment.save(update_fields=['apt_screening'])

        response = self.client.get(
            f'/api/appointments/{appointment.apt_id}/',
            **self._auth(VET_EMAIL),
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertIsNone(response.data['screening']['symptom_answers'])

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


class VetSymptomAnswersVisibilityTests(VetDashboardBase):
    """Owner questionnaire answers reach vet/receptionist surfaces as
    display-only context (symptom_answers) without changing AI fields."""

    ROWS = [
        {'question': 'Where is the affected area?', 'answer': 'Back, Ears'},
        {'question': 'How long has it been present?', 'answer': 'More than 2 weeks'},
    ]

    def _make_screening(self, answers=None):
        disease = Disease.objects.create(
            dis_code='TESTDIS', dis_name='Test Disease',
        )
        return AiScreening.objects.create(
            pet_id=self.pet,
            dis_id=disease,
            ais_confidence=85,
            ais_model_version='test-1.0.0',
            ais_symptom_answers=answers,
        )

    def _appointment_with_screening(self, answers=None):
        screening = self._make_screening(answers=answers)
        appointment = self._make_appointment(
            self.vet, AppointmentStatus.CONFIRMED, self.today_9am,
        )
        appointment.apt_screening = screening
        appointment.save()
        return appointment, screening

    def test_vet_appointment_detail_includes_symptom_answers(self):
        appointment, _ = self._appointment_with_screening(answers=self.ROWS)

        response = self.client.get(
            f'/api/appointments/{appointment.apt_id}/',
            **self._auth(VET_EMAIL),
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['screening']['symptom_answers'], self.ROWS)

    def test_vet_list_includes_symptom_answers(self):
        self._appointment_with_screening(answers=self.ROWS)

        response = self.client.get(
            '/api/veterinarian/appointments/',
            **self._auth(VET_EMAIL),
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['screening']['symptom_answers'], self.ROWS)

    def test_screening_without_answers_returns_null(self):
        appointment, _ = self._appointment_with_screening(answers=None)

        response = self.client.get(
            f'/api/appointments/{appointment.apt_id}/',
            **self._auth(VET_EMAIL),
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertIsNone(response.data['screening']['symptom_answers'])

    def test_other_vet_cannot_see_answers(self):
        appointment, _ = self._appointment_with_screening(answers=self.ROWS)

        response = self.client.get(
            f'/api/appointments/{appointment.apt_id}/',
            **self._auth(OTHER_VET_EMAIL),
        )
        self.assertEqual(response.status_code, 403)

    def test_receptionist_detail_includes_symptom_answers(self):
        appointment, _ = self._appointment_with_screening(answers=self.ROWS)

        response = self.client.get(
            f'/api/appointments/{appointment.apt_id}/',
            **self._auth(RECEPTIONIST_EMAIL),
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['screening']['symptom_answers'], self.ROWS)


class VetPetConsultationHistoryTests(VetDashboardBase):

    def _make_consultation(self, appointment, vet, diagnosis='Dermatitis'):
        return Consultation.objects.create(
            apt_id=appointment,
            stf_id=vet,
            con_diagnosis=diagnosis,
        )

    def _history_url(self, pet=None):
        return f'/api/veterinarian/pets/{(pet or self.pet).pet_id}/history/'

    def test_returns_clinic_consultations_for_pet(self):
        own_appointment = self._make_appointment(
            self.vet, AppointmentStatus.COMPLETED, self.today_9am,
        )
        own_appointment.apt_checked_in_at = self.today_9am
        own_appointment.apt_completed_at = self.today_1pm
        own_appointment.save(update_fields=['apt_checked_in_at', 'apt_completed_at'])
        own_consultation = self._make_consultation(own_appointment, self.vet)
        other_appointment = self._make_appointment(
            self.other_vet, AppointmentStatus.COMPLETED, self.today_1pm,
        )
        other_consultation = self._make_consultation(
            other_appointment, self.other_vet, 'Allergy',
        )

        response = self.client.get(
            self._history_url(), **self._auth(VET_EMAIL),
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['pet']['pet_id'], str(self.pet.pet_id))
        self.assertEqual(response.data['pet']['pet_name'], 'Max')
        self.assertEqual(response.data['pet']['pet_species'], 'Pug')
        self.assertEqual(
            {row['id'] for row in response.data['consultations']},
            {str(own_consultation.con_id), str(other_consultation.con_id)},
        )
        own_row = next(
            row for row in response.data['consultations']
            if row['id'] == str(own_consultation.con_id)
        )
        self.assertIsNotNone(own_row['scheduled_at'])
        self.assertIsNotNone(own_row['checked_in_at'])
        self.assertIsNotNone(own_row['completed_at'])

    def test_excludes_consultations_from_other_clinics(self):
        own_appointment = self._make_appointment(
            self.vet, AppointmentStatus.COMPLETED, self.today_9am,
        )
        self._make_consultation(own_appointment, self.vet)

        other_clinic = Clinic.objects.create(cln_name='Other Paws Clinic')
        foreign_appointment = Appointment.objects.create(
            pet_id=self.pet,
            cln_id=other_clinic,
            stf_id=self.other_vet,
            apt_type=AppointmentType.CONSULTATION,
            apt_status=AppointmentStatus.COMPLETED,
            apt_scheduled_at=self.today_1pm,
            apt_created_by=self.other_vet_user,
        )
        self._make_consultation(foreign_appointment, self.other_vet, 'Foreign')

        response = self.client.get(
            self._history_url(), **self._auth(VET_EMAIL),
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(len(response.data['consultations']), 1)
        self.assertEqual(
            response.data['consultations'][0]['diagnosis'], 'Dermatitis',
        )

    def test_returns_empty_list_when_pet_has_no_consultations(self):
        self._make_appointment(
            self.vet, AppointmentStatus.CONFIRMED, self.today_9am,
        )

        response = self.client.get(
            self._history_url(), **self._auth(VET_EMAIL),
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['consultations'], [])

    def test_excludes_consultations_from_unfinished_appointments(self):
        in_progress = self._make_appointment(
            self.vet, AppointmentStatus.IN_PROGRESS, self.today_9am,
        )
        self._make_consultation(in_progress, self.vet, 'Ongoing')

        response = self.client.get(
            self._history_url(), **self._auth(VET_EMAIL),
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['consultations'], [])

    def test_returns_404_for_pet_outside_clinic(self):
        other_clinic = Clinic.objects.create(cln_name='Other Paws Clinic')
        other_owner_user = self._create_user(
            'other-owner@example.com', UserRole.OWNER, 'Owen', 'Owner',
        )
        other_owner = OwnerProfile.objects.create(usr_id=other_owner_user)
        other_pet = Pet.objects.create(
            own_id=other_owner,
            brd_id=self.breed,
            pet_name='Rex',
            pet_sex=Sex.MALE,
        )
        Appointment.objects.create(
            pet_id=other_pet,
            cln_id=other_clinic,
            stf_id=self.other_vet,
            apt_type=AppointmentType.CONSULTATION,
            apt_status=AppointmentStatus.COMPLETED,
            apt_scheduled_at=self.today_9am,
            apt_created_by=self.other_vet_user,
        )

        response = self.client.get(
            self._history_url(other_pet), **self._auth(VET_EMAIL),
        )

        self.assertEqual(response.status_code, 404, response.data)

    def test_returns_404_for_unknown_pet(self):
        response = self.client.get(
            '/api/veterinarian/pets/00000000-0000-0000-0000-000000000000/history/',
            **self._auth(VET_EMAIL),
        )

        self.assertEqual(response.status_code, 404, response.data)

    def test_receptionist_cannot_read_pet_history(self):
        response = self.client.get(
            self._history_url(), **self._auth(RECEPTIONIST_EMAIL),
        )

        self.assertEqual(response.status_code, 403)


class VetCancellationTests(VetDashboardBase):

    def test_vet_cannot_cancel_directly(self):
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
        self.assertEqual(response.status_code, 403)

        appointment.refresh_from_db()
        self.assertEqual(appointment.apt_status, AppointmentStatus.CONFIRMED)
        self.assertIsNone(appointment.apt_cancellation_reason)

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


class VetAppointmentRequestTests(VetDashboardBase):

    def _request(self, action, apt_id, payload, email=VET_EMAIL):
        return self.client.post(
            f'/api/veterinarian/appointments/{apt_id}/{action}/',
            data=json.dumps(payload),
            content_type='application/json',
            **self._auth(email),
        )

    def test_vet_requests_reschedule_on_confirmed(self):
        appointment = self._make_appointment(
            self.vet, AppointmentStatus.CONFIRMED, self.today_9am,
        )

        response = self._request(
            'request-reschedule', appointment.apt_id, {'reason': 'Conflict'},
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(
            response.data['apt_reschedule_request_reason'], 'Conflict',
        )

        appointment.refresh_from_db()
        self.assertEqual(appointment.apt_reschedule_request_reason, 'Conflict')
        self.assertEqual(appointment.apt_status, AppointmentStatus.CONFIRMED)

    def test_vet_requests_cancellation_on_confirmed(self):
        appointment = self._make_appointment(
            self.vet, AppointmentStatus.CONFIRMED, self.today_9am,
        )

        response = self._request(
            'request-cancel', appointment.apt_id, {'reason': 'Sick'},
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(
            response.data['apt_cancellation_request_reason'], 'Sick',
        )

        appointment.refresh_from_db()
        self.assertEqual(appointment.apt_cancellation_request_reason, 'Sick')
        self.assertEqual(appointment.apt_status, AppointmentStatus.CONFIRMED)

    def test_request_requires_reason(self):
        appointment = self._make_appointment(
            self.vet, AppointmentStatus.CONFIRMED, self.today_9am,
        )

        response = self._request(
            'request-reschedule', appointment.apt_id, {'reason': '   '},
        )
        self.assertEqual(response.status_code, 400)

        appointment.refresh_from_db()
        self.assertIsNone(appointment.apt_reschedule_request_reason)

    def test_request_rejected_when_not_confirmed(self):
        appointment = self._make_appointment(
            self.vet, AppointmentStatus.PENDING, self.today_9am,
        )

        response = self._request(
            'request-cancel', appointment.apt_id, {'reason': 'Nope'},
        )
        self.assertEqual(response.status_code, 409)

    def test_request_rejected_for_other_vets_appointment(self):
        appointment = self._make_appointment(
            self.other_vet, AppointmentStatus.CONFIRMED, self.today_9am,
        )

        response = self._request(
            'request-reschedule', appointment.apt_id, {'reason': 'Mine now'},
        )
        self.assertEqual(response.status_code, 403)

    def test_request_missing_appointment_returns_404(self):
        import uuid

        response = self._request(
            'request-cancel', uuid.uuid4(), {'reason': 'Gone'},
        )
        self.assertEqual(response.status_code, 404)

    def test_receptionist_cannot_submit_request(self):
        appointment = self._make_appointment(
            self.vet, AppointmentStatus.CONFIRMED, self.today_9am,
        )

        response = self._request(
            'request-cancel', appointment.apt_id, {'reason': 'Desk'},
            email=RECEPTIONIST_EMAIL,
        )
        self.assertEqual(response.status_code, 403)


class VetConsultationSaveTests(VetDashboardBase):

    def _appointment_day(self, appointment):
        return timezone.localtime(
            appointment.apt_scheduled_at, CLINIC_TIMEZONE,
        ).date()

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

    def test_vet_creates_consultation_with_specific_disease(self):
        appointment = self._make_appointment(
            self.vet, AppointmentStatus.IN_PROGRESS, self.today_9am,
        )

        response = self._post(
            self._payload(appointment, specific_disease='Microsporum canis'),
        )

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['specific_disease'], 'Microsporum canis')
        consultation = Consultation.objects.get(apt_id=appointment)
        self.assertEqual(consultation.con_specific_disease, 'Microsporum canis')

    def test_specific_disease_defaults_to_null(self):
        appointment = self._make_appointment(
            self.vet, AppointmentStatus.IN_PROGRESS, self.today_9am,
        )

        response = self._post(self._payload(appointment))

        self.assertEqual(response.status_code, 201, response.data)
        self.assertIsNone(response.data['specific_disease'])
        consultation = Consultation.objects.get(apt_id=appointment)
        self.assertIsNone(consultation.con_specific_disease)

    def test_blank_specific_disease_is_stored_as_null(self):
        appointment = self._make_appointment(
            self.vet, AppointmentStatus.IN_PROGRESS, self.today_9am,
        )

        response = self._post(self._payload(appointment, specific_disease='   '))

        self.assertEqual(response.status_code, 201, response.data)
        self.assertIsNone(response.data['specific_disease'])
        consultation = Consultation.objects.get(apt_id=appointment)
        self.assertIsNone(consultation.con_specific_disease)

    def test_follow_up_defaults_to_not_required(self):
        appointment = self._make_appointment(
            self.vet, AppointmentStatus.IN_PROGRESS, self.today_9am,
        )

        response = self._post(self._payload(appointment))

        self.assertEqual(response.status_code, 201, response.data)
        self.assertFalse(response.data['follow_up_required'])
        self.assertIsNone(response.data['follow_up_target_date'])
        consultation = Consultation.objects.get(apt_id=appointment)
        self.assertFalse(consultation.con_follow_up_required)
        self.assertIsNone(consultation.con_follow_up_target_date)

    def test_vet_creates_consultation_with_follow_up(self):
        appointment = self._make_appointment(
            self.vet, AppointmentStatus.IN_PROGRESS, self.today_9am,
        )
        target_date = self._appointment_day(appointment) + timedelta(days=2)

        response = self._post(self._payload(
            appointment,
            follow_up_required=True,
            follow_up_target_date=target_date.isoformat(),
        ))

        self.assertEqual(response.status_code, 201, response.data)
        self.assertTrue(response.data['follow_up_required'])
        self.assertEqual(
            response.data['follow_up_target_date'], target_date.isoformat(),
        )
        consultation = Consultation.objects.get(apt_id=appointment)
        self.assertTrue(consultation.con_follow_up_required)
        self.assertEqual(consultation.con_follow_up_target_date, target_date)
        self.assertFalse(
            Appointment.objects.filter(
                apt_source_consultation=consultation,
            ).exists(),
        )

    def test_follow_up_requires_target_date(self):
        appointment = self._make_appointment(
            self.vet, AppointmentStatus.IN_PROGRESS, self.today_9am,
        )

        response = self._post(
            self._payload(appointment, follow_up_required=True),
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(Consultation.objects.filter(apt_id=appointment).exists())

    def test_follow_up_target_must_be_after_appointment_date(self):
        appointment = self._make_appointment(
            self.vet, AppointmentStatus.IN_PROGRESS, self.today_9am,
        )
        target_date = self._appointment_day(appointment)

        response = self._post(self._payload(
            appointment,
            follow_up_required=True,
            follow_up_target_date=target_date.isoformat(),
        ))

        self.assertEqual(response.status_code, 400)
        self.assertFalse(Consultation.objects.filter(apt_id=appointment).exists())

    def test_follow_up_target_cannot_be_in_the_past(self):
        appointment = self._make_appointment(
            self.vet, AppointmentStatus.IN_PROGRESS, self.today_9am,
        )
        target_date = timezone.localdate(timezone=CLINIC_TIMEZONE) - timedelta(days=1)

        response = self._post(self._payload(
            appointment,
            follow_up_required=True,
            follow_up_target_date=target_date.isoformat(),
        ))

        self.assertEqual(response.status_code, 400)
        self.assertFalse(Consultation.objects.filter(apt_id=appointment).exists())

    def test_vet_updates_follow_up(self):
        appointment = self._make_appointment(
            self.vet, AppointmentStatus.IN_PROGRESS, self.today_9am,
        )
        created = self._post(self._payload(appointment))
        target_date = self._appointment_day(appointment) + timedelta(days=3)

        response = self._put(
            created.data['id'],
            self._payload(
                appointment,
                follow_up_required=True,
                follow_up_target_date=target_date.isoformat(),
            ),
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertTrue(response.data['follow_up_required'])
        self.assertEqual(
            response.data['follow_up_target_date'], target_date.isoformat(),
        )

    def test_disabling_follow_up_clears_target_date(self):
        appointment = self._make_appointment(
            self.vet, AppointmentStatus.IN_PROGRESS, self.today_9am,
        )
        target_date = self._appointment_day(appointment) + timedelta(days=3)
        created = self._post(self._payload(
            appointment,
            follow_up_required=True,
            follow_up_target_date=target_date.isoformat(),
        ))

        response = self._put(
            created.data['id'],
            self._payload(appointment, follow_up_required=False),
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertFalse(response.data['follow_up_required'])
        self.assertIsNone(response.data['follow_up_target_date'])
        consultation = Consultation.objects.get(apt_id=appointment)
        self.assertIsNone(consultation.con_follow_up_target_date)

    def test_update_rejects_invalid_follow_up_date(self):
        appointment = self._make_appointment(
            self.vet, AppointmentStatus.IN_PROGRESS, self.today_9am,
        )
        created = self._post(self._payload(appointment))

        response = self._put(
            created.data['id'],
            self._payload(
                appointment,
                follow_up_required=True,
                follow_up_target_date=self._appointment_day(appointment).isoformat(),
            ),
        )

        self.assertEqual(response.status_code, 400)

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

    def test_vet_updates_specific_disease(self):
        appointment = self._make_appointment(
            self.vet, AppointmentStatus.IN_PROGRESS, self.today_9am,
        )
        created = self._post(self._payload(appointment))

        response = self._put(
            created.data['id'],
            self._payload(appointment, specific_disease='Microsporum canis'),
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['specific_disease'], 'Microsporum canis')
        consultation = Consultation.objects.get(apt_id=appointment)
        self.assertEqual(consultation.con_specific_disease, 'Microsporum canis')

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
                    'quantity': 1,
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

    def test_missing_quantity_returns_400(self):
        payload = self._payload()
        del payload['items'][0]['quantity']

        response = self._post(payload)

        self.assertEqual(response.status_code, 400)
        self.assertFalse(Prescription.objects.filter(con_id=self.consultation).exists())

    def test_non_positive_quantity_returns_400(self):
        payload = self._payload()
        payload['items'][0]['quantity'] = 0

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

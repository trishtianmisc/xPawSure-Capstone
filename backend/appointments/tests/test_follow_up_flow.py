from datetime import datetime, time, timedelta

from django.utils import timezone

from appointments.models import (
    Appointment,
    AppointmentStatus,
    AppointmentType,
    SlotStatus,
    VetSlot,
)
from appointments.services import AppointmentService, CLINIC_TIMEZONE, DashboardService
from appointments.tests.test_owner_booking import OwnerBookingBase
from consultations.models import Consultation
from consultations.services import ConsultationService, ConsultationStateError
from notifications.models import Notification, NotificationType


class FollowUpFlowBase(OwnerBookingBase):

    def setUp(self):
        super().setUp()
        source_scheduled_at = timezone.now()
        source_date = timezone.localtime(
            source_scheduled_at, CLINIC_TIMEZONE,
        ).date()
        self.target_date = source_date + timedelta(days=1)
        self.source_appointment = Appointment.objects.create(
            pet_id=self.pet,
            cln_id=self.clinic,
            stf_id=self.vet,
            apt_type=AppointmentType.CONSULTATION,
            apt_status=AppointmentStatus.IN_PROGRESS,
            apt_scheduled_at=source_scheduled_at,
        )

    def _create_consultation(self, follow_up_required=True):
        return ConsultationService.create_for_vet(
            appointment=self.source_appointment,
            validated_data={
                'diagnosis': 'Allergic dermatitis',
                'follow_up_required': follow_up_required,
                'follow_up_target_date': self.target_date,
            },
            staff=self.vet,
            user_id=str(self.vet_user.usr_id),
        )

    def _complete_source(self):
        self.source_appointment = AppointmentService.update_status(
            apt_id=self.source_appointment.apt_id,
            new_status=AppointmentStatus.COMPLETED,
            user_id=str(self.receptionist_user.usr_id),
        )
        return self.source_appointment

    def _create_follow_up(self):
        consultation = self._create_consultation()
        self._complete_source()
        return consultation

    def _slot(self, start_time=time(9, 0), date=None):
        return VetSlot.objects.create(
            cln_id=self.clinic,
            stf_id=self.vet,
            vsl_date=date or self.target_date,
            vsl_start_time=start_time,
            vsl_end_time=(
                datetime.combine(date or self.target_date, start_time)
                + timedelta(minutes=30)
            ).time(),
        )

    def _confirm(self, appointment, slot):
        return self.client.post(
            f'/api/appointments/{appointment.apt_id}/confirm-follow-up/',
            {'slot_id': str(slot.vsl_id)},
            content_type='application/json',
            **self._auth('desk@example.com'),
        )


class ConsultationFollowUpSyncTests(FollowUpFlowBase):

    def test_follow_up_required_creates_review_appointment_on_completion(self):
        consultation = self._create_consultation()

        self.assertFalse(
            Appointment.objects.filter(
                apt_source_consultation=consultation,
            ).exists(),
        )

        self._complete_source()

        appointment = Appointment.objects.get(
            apt_source_consultation=consultation,
        )
        self.assertEqual(appointment.apt_type, AppointmentType.FOLLOW_UP)
        self.assertEqual(appointment.apt_status, AppointmentStatus.REVIEW)
        self.assertEqual(appointment.pet_id_id, self.pet.pet_id)
        self.assertEqual(appointment.cln_id_id, self.clinic.cln_id)
        self.assertEqual(appointment.stf_id_id, self.vet.stf_id)
        self.assertEqual(appointment.apt_created_by_id, self.vet_user.usr_id)
        self.assertEqual(
            timezone.localtime(
                appointment.apt_scheduled_at, CLINIC_TIMEZONE,
            ).date(),
            self.target_date,
        )

    def test_clearing_follow_up_before_completion_creates_none(self):
        consultation = self._create_consultation()

        ConsultationService.update_for_vet(
            consultation=consultation,
            validated_data={
                'diagnosis': 'Allergic dermatitis',
                'follow_up_required': False,
            },
            staff=self.vet,
            user_id=str(self.vet_user.usr_id),
        )
        self._complete_source()

        self.assertFalse(
            Appointment.objects.filter(
                apt_source_consultation=consultation,
            ).exists(),
        )

    def test_changing_target_date_before_completion_uses_final_date(self):
        consultation = self._create_consultation()
        new_target = self.target_date + timedelta(days=2)

        ConsultationService.update_for_vet(
            consultation=consultation,
            validated_data={
                'diagnosis': 'Allergic dermatitis',
                'follow_up_required': True,
                'follow_up_target_date': new_target,
            },
            staff=self.vet,
            user_id=str(self.vet_user.usr_id),
        )
        self._complete_source()

        linked = Appointment.objects.get(apt_source_consultation=consultation)
        self.assertEqual(linked.apt_status, AppointmentStatus.REVIEW)
        self.assertEqual(
            timezone.localtime(
                linked.apt_scheduled_at, CLINIC_TIMEZONE,
            ).date(),
            new_target,
        )

    def test_follow_up_not_required_creates_none(self):
        consultation = self._create_consultation(follow_up_required=False)
        self._complete_source()

        self.assertFalse(
            Appointment.objects.filter(
                apt_source_consultation=consultation,
            ).exists(),
        )

    def test_completing_without_consultation_creates_none(self):
        self._complete_source()

        self.assertFalse(
            Appointment.objects.filter(
                apt_type=AppointmentType.FOLLOW_UP,
            ).exists(),
        )

    def test_cancelling_source_creates_none(self):
        consultation = self._create_consultation()

        AppointmentService.update_status(
            apt_id=self.source_appointment.apt_id,
            new_status=AppointmentStatus.CANCELLED,
            user_id=str(self.receptionist_user.usr_id),
        )

        self.assertFalse(
            Appointment.objects.filter(
                apt_source_consultation=consultation,
            ).exists(),
        )

    def test_processed_legacy_follow_up_does_not_block_completion(self):
        consultation = self._create_consultation()
        legacy = Appointment.objects.create(
            pet_id=self.pet,
            cln_id=self.clinic,
            stf_id=self.vet,
            apt_type=AppointmentType.FOLLOW_UP,
            apt_status=AppointmentStatus.CONFIRMATION,
            apt_scheduled_at=self.source_appointment.apt_scheduled_at,
            apt_source_consultation=consultation,
        )

        self._complete_source()

        legacy.refresh_from_db()
        self.assertEqual(legacy.apt_status, AppointmentStatus.CONFIRMATION)
        self.assertEqual(
            Appointment.objects.get(
                apt_source_consultation=consultation,
            ).apt_id,
            legacy.apt_id,
        )

    def test_receptionist_completion_creates_review_appointment(self):
        consultation = self._create_consultation()

        response = self.client.patch(
            f'/api/appointments/{self.source_appointment.apt_id}/',
            {'apt_status': AppointmentStatus.COMPLETED},
            content_type='application/json',
            **self._auth('desk@example.com'),
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertTrue(
            Appointment.objects.filter(
                apt_source_consultation=consultation,
                apt_status=AppointmentStatus.REVIEW,
            ).exists(),
        )


class ConfirmFollowUpViewTests(FollowUpFlowBase):

    def test_confirm_books_slot_and_sets_confirmation(self):
        follow_up = Appointment.objects.get(
            apt_source_consultation=self._create_follow_up(),
        )
        slot = self._slot()

        response = self._confirm(follow_up, slot)

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['apt_status'], AppointmentStatus.CONFIRMATION)

        follow_up.refresh_from_db()
        slot.refresh_from_db()
        self.assertEqual(follow_up.apt_status, AppointmentStatus.CONFIRMATION)
        self.assertEqual(
            timezone.localtime(follow_up.apt_scheduled_at, CLINIC_TIMEZONE),
            timezone.make_aware(
                datetime.combine(self.target_date, slot.vsl_start_time),
                CLINIC_TIMEZONE,
            ),
        )
        self.assertEqual(slot.vsl_status, SlotStatus.BOOKED)
        self.assertEqual(slot.vsl_appointment_id, follow_up.apt_id)

    def test_confirm_rejects_unavailable_slot(self):
        follow_up = Appointment.objects.get(
            apt_source_consultation=self._create_follow_up(),
        )
        slot = self._slot()
        slot.vsl_status = SlotStatus.BLOCKED
        slot.save(update_fields=['vsl_status'])

        response = self._confirm(follow_up, slot)

        self.assertEqual(response.status_code, 409, response.data)
        follow_up.refresh_from_db()
        self.assertEqual(follow_up.apt_status, AppointmentStatus.REVIEW)

    def test_generic_patch_cannot_confirm_review(self):
        follow_up = Appointment.objects.get(
            apt_source_consultation=self._create_follow_up(),
        )

        response = self.client.patch(
            f'/api/appointments/{follow_up.apt_id}/',
            {'apt_status': 'CONFIRMATION'},
            content_type='application/json',
            **self._auth('desk@example.com'),
        )

        self.assertEqual(response.status_code, 400, response.data)
        follow_up.refresh_from_db()
        self.assertEqual(follow_up.apt_status, AppointmentStatus.REVIEW)

    def test_cancelling_confirmation_releases_slot(self):
        follow_up = Appointment.objects.get(
            apt_source_consultation=self._create_follow_up(),
        )
        slot = self._slot()
        self._confirm(follow_up, slot)

        response = self.client.patch(
            f'/api/appointments/{follow_up.apt_id}/',
            {'apt_status': 'CANCELLED', 'cancellation_reason': 'Owner declined'},
            content_type='application/json',
            **self._auth('desk@example.com'),
        )

        self.assertEqual(response.status_code, 200, response.data)
        follow_up.refresh_from_db()
        slot.refresh_from_db()
        self.assertEqual(follow_up.apt_status, AppointmentStatus.CANCELLED)
        self.assertEqual(slot.vsl_status, SlotStatus.AVAILABLE)
        self.assertIsNone(slot.vsl_appointment_id)

    def test_cancelling_review_does_not_notify_owner(self):
        follow_up = Appointment.objects.get(
            apt_source_consultation=self._create_follow_up(),
        )

        response = self.client.patch(
            f'/api/appointments/{follow_up.apt_id}/',
            {'apt_status': 'CANCELLED', 'cancellation_reason': 'Duplicate follow-up'},
            content_type='application/json',
            **self._auth('desk@example.com'),
        )

        self.assertEqual(response.status_code, 200, response.data)
        follow_up.refresh_from_db()
        self.assertEqual(follow_up.apt_status, AppointmentStatus.CANCELLED)
        self.assertFalse(
            Notification.objects.filter(
                usr_id=self.owner_user,
                ntf_type=NotificationType.APPOINTMENT_CANCELLED,
            ).exists(),
        )

    def test_consultation_is_read_only_after_source_completion(self):
        created = self._create_follow_up()
        consultation = Consultation.objects.get(con_id=created.con_id)

        with self.assertRaises(ConsultationStateError):
            ConsultationService.update_for_vet(
                consultation=consultation,
                validated_data={
                    'diagnosis': 'Allergic dermatitis',
                    'follow_up_required': True,
                    'follow_up_target_date': self.target_date + timedelta(days=1),
                },
                staff=self.vet,
                user_id=str(self.vet_user.usr_id),
            )


class FollowUpVisibilityTests(FollowUpFlowBase):

    def test_owner_cannot_see_review_but_sees_awaiting_payment(self):
        follow_up = Appointment.objects.get(
            apt_source_consultation=self._create_follow_up(),
        )

        list_response = self.client.get(
            '/api/owner/appointments/',
            **self._auth('owner@example.com'),
        )
        self.assertEqual(list_response.status_code, 200, list_response.data)
        ids = [item['apt_id'] for item in list_response.data['results']]
        self.assertNotIn(str(follow_up.apt_id), ids)

        detail_response = self.client.get(
            f'/api/owner/appointments/{follow_up.apt_id}/',
            **self._auth('owner@example.com'),
        )
        self.assertEqual(detail_response.status_code, 404)

        self._confirm(follow_up, self._slot())
        detail_response = self.client.get(
            f'/api/owner/appointments/{follow_up.apt_id}/',
            **self._auth('owner@example.com'),
        )
        self.assertEqual(detail_response.status_code, 200, detail_response.data)
        self.assertEqual(
            detail_response.data['apt_status'],
            AppointmentStatus.CONFIRMATION,
        )

    def test_vet_list_excludes_review_and_confirmation(self):
        follow_up = Appointment.objects.get(
            apt_source_consultation=self._create_follow_up(),
        )

        response = self.client.get(
            '/api/veterinarian/appointments/',
            **self._auth('vet@example.com'),
        )
        self.assertEqual(response.status_code, 200, response.data)
        ids = [item['apt_id'] for item in response.data]
        self.assertNotIn(str(follow_up.apt_id), ids)

        self._confirm(follow_up, self._slot())
        response = self.client.get(
            '/api/veterinarian/appointments/',
            **self._auth('vet@example.com'),
        )
        ids = [item['apt_id'] for item in response.data]
        self.assertNotIn(str(follow_up.apt_id), ids)

    def test_dashboard_reports_pending_review_only_after_completion(self):
        self._create_consultation()

        response = self.client.get(
            '/api/dashboard/stats/',
            **self._auth('desk@example.com'),
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['review_pending'], 0)

        self._complete_source()
        response = self.client.get(
            '/api/dashboard/stats/',
            **self._auth('desk@example.com'),
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['review_pending'], 1)


class FollowUpExpiryTests(FollowUpFlowBase):

    def test_past_due_confirmation_is_cancelled_and_slot_released(self):
        follow_up = Appointment.objects.get(
            apt_source_consultation=self._create_follow_up(),
        )
        past_date = timezone.localdate() - timedelta(days=1)
        slot = self._slot(date=past_date)
        follow_up.apt_scheduled_at = timezone.make_aware(
            datetime.combine(past_date, slot.vsl_start_time),
            CLINIC_TIMEZONE,
        )
        follow_up.apt_status = AppointmentStatus.CONFIRMATION
        follow_up.save(update_fields=['apt_scheduled_at', 'apt_status'])
        slot.vsl_appointment = follow_up
        slot.vsl_status = SlotStatus.BOOKED
        slot.save(update_fields=['vsl_appointment', 'vsl_status'])

        summary = AppointmentService.close_past_due(clinic_id=self.clinic.cln_id)

        self.assertEqual(summary['cancelled'], 1)
        follow_up.refresh_from_db()
        slot.refresh_from_db()
        self.assertEqual(follow_up.apt_status, AppointmentStatus.CANCELLED)
        self.assertEqual(
            follow_up.apt_cancellation_reason,
            'Payment not completed before appointment time',
        )
        self.assertEqual(slot.vsl_status, SlotStatus.AVAILABLE)
        self.assertIsNone(slot.vsl_appointment_id)

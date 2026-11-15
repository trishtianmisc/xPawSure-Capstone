import json
from datetime import datetime, time, timedelta

from django.utils import timezone

from appointments.models import (
    Appointment,
    AppointmentStatus,
    AppointmentType,
    SlotStatus,
    VetSlot,
)
from appointments.services import VetSlotService, get_clinic_timezone
from appointments.tests.test_owner_booking import (
    OWNER_EMAIL,
    OTHER_OWNER_EMAIL,
    RECEPTIONIST_EMAIL,
    OwnerBookingBase,
)
from audit_log.models import AuditLog
from notifications.models import Notification, NotificationType
from users.models import UserRole


class OwnerRescheduleApprovalBase(OwnerBookingBase):

    def setUp(self):
        super().setUp()
        self.other_owner_without_profile_email = 'noprofile@example.com'
        self.no_profile_user = self._create_user(
            self.other_owner_without_profile_email,
            UserRole.OWNER,
            'Nora',
            'NoProfile',
        )

    def _future_scheduled_at(self, days=5, hour=10):
        tz = get_clinic_timezone(self.clinic.cln_id)
        return timezone.make_aware(
            datetime.combine(self.date + timedelta(days=days), time(hour, 0)),
            tz,
        )

    def _confirmed_appointment(self, status=AppointmentStatus.CONFIRMED):
        return Appointment.objects.create(
            pet_id=self.pet,
            cln_id=self.clinic,
            stf_id=self.vet,
            apt_type=AppointmentType.CONSULTATION,
            apt_status=status,
            apt_scheduled_at=self._future_scheduled_at(),
            apt_created_by=self.receptionist_user,
        )

    def _available_slots(self):
        slots = list(VetSlotService.get_available_slots(
            self.clinic.cln_id, self.vet.stf_id, self.date,
        ))
        self.assertGreaterEqual(len(slots), 2)
        return slots

    def _reschedule(self, apt_id, slot_id, email=RECEPTIONIST_EMAIL):
        return self.client.post(
            f'/api/appointments/{apt_id}/reschedule/',
            data=json.dumps({'slot_id': str(slot_id)}),
            content_type='application/json',
            **self._auth(email),
        )

    def _approve(self, apt_id, email=OWNER_EMAIL):
        return self.client.post(
            f'/api/owner/appointments/{apt_id}/reschedule/approve/',
            data=json.dumps({}),
            content_type='application/json',
            **self._auth(email),
        )

    def _rescheduled_appointment(self):
        appointment = self._confirmed_appointment()
        response = self._reschedule(
            appointment.apt_id, self._available_slots()[0].vsl_id,
        )
        self.assertEqual(response.status_code, 200, response.data)
        appointment.refresh_from_db()
        return appointment, response


class RescheduleApprovalTests(OwnerRescheduleApprovalBase):

    def test_reschedule_marks_owner_approval_pending(self):
        appointment, response = self._rescheduled_appointment()

        self.assertIsNotNone(appointment.apt_rescheduled_at)
        self.assertIsNone(appointment.apt_reschedule_acknowledged_at)
        self.assertTrue(response.data['reschedule_approval_pending'])
        self.assertIsNotNone(response.data['apt_rescheduled_at'])
        self.assertIsNone(response.data['apt_reschedule_acknowledged_at'])

    def test_reschedule_notifies_owner_with_actionable_type(self):
        appointment, _ = self._rescheduled_appointment()

        notification = Notification.objects.filter(
            usr_id_id=self.owner_user.usr_id,
            ntf_type=NotificationType.APPOINTMENT_RESCHEDULED,
            ntf_reference_id=appointment.apt_id,
        ).first()
        self.assertIsNotNone(notification)
        self.assertEqual(notification.ntf_reference_table, 'APPOINTMENT')

    def test_owner_approve_records_acknowledgement_only(self):
        appointment, _ = self._rescheduled_appointment()

        response = self._approve(appointment.apt_id)

        self.assertEqual(response.status_code, 200, response.data)
        appointment.refresh_from_db()
        self.assertEqual(appointment.apt_status, AppointmentStatus.CONFIRMED)
        self.assertIsNotNone(appointment.apt_reschedule_acknowledged_at)
        self.assertFalse(response.data['reschedule_approval_pending'])
        self.assertTrue(AuditLog.objects.filter(
            adl_record_id=appointment.apt_id,
            adl_description='Owner approved rescheduled appointment',
        ).exists())

    def test_approve_is_idempotent(self):
        appointment, _ = self._rescheduled_appointment()

        first = self._approve(appointment.apt_id)
        self.assertEqual(first.status_code, 200, first.data)
        appointment.refresh_from_db()
        acknowledged_at = appointment.apt_reschedule_acknowledged_at

        second = self._approve(appointment.apt_id)
        self.assertEqual(second.status_code, 200, second.data)
        appointment.refresh_from_db()
        self.assertEqual(
            appointment.apt_reschedule_acknowledged_at,
            acknowledged_at,
        )

    def test_second_reschedule_requires_approval_again(self):
        appointment, _ = self._rescheduled_appointment()
        self.assertEqual(self._approve(appointment.apt_id).status_code, 200)

        slot = self._available_slots()[0]
        response = self._reschedule(appointment.apt_id, slot.vsl_id)

        self.assertEqual(response.status_code, 200, response.data)
        appointment.refresh_from_db()
        self.assertIsNone(appointment.apt_reschedule_acknowledged_at)
        self.assertTrue(response.data['reschedule_approval_pending'])
        self.assertEqual(
            Notification.objects.filter(
                usr_id_id=self.owner_user.usr_id,
                ntf_type=NotificationType.APPOINTMENT_RESCHEDULED,
                ntf_reference_id=appointment.apt_id,
            ).count(),
            2,
        )

    def test_other_owner_cannot_approve(self):
        appointment, _ = self._rescheduled_appointment()

        response = self._approve(appointment.apt_id, email=OTHER_OWNER_EMAIL)

        self.assertEqual(response.status_code, 404)

    def test_unknown_appointment_cannot_be_approved(self):
        response = self._approve('00000000-0000-0000-0000-000000000000')

        self.assertEqual(response.status_code, 404)

    def test_approve_requires_owner_role(self):
        appointment, _ = self._rescheduled_appointment()

        response = self._approve(
            appointment.apt_id, email=RECEPTIONIST_EMAIL,
        )

        self.assertEqual(response.status_code, 403)

    def test_owner_without_profile_gets_400(self):
        appointment, _ = self._rescheduled_appointment()

        response = self._approve(
            appointment.apt_id,
            email=self.other_owner_without_profile_email,
        )

        self.assertEqual(response.status_code, 400)

    def test_appointment_without_reschedule_cannot_be_approved(self):
        appointment = self._confirmed_appointment()

        response = self._approve(appointment.apt_id)

        self.assertEqual(response.status_code, 400)
        self.assertIn('has not been rescheduled', response.data['detail'])

    def test_non_bookable_status_cannot_be_approved(self):
        appointment, _ = self._rescheduled_appointment()
        Appointment.objects.filter(apt_id=appointment.apt_id).update(
            apt_status=AppointmentStatus.CHECKED_IN,
        )

        response = self._approve(appointment.apt_id)

        self.assertEqual(response.status_code, 400)

    def test_past_appointment_cannot_be_approved(self):
        appointment, _ = self._rescheduled_appointment()
        Appointment.objects.filter(apt_id=appointment.apt_id).update(
            apt_scheduled_at=timezone.now() - timedelta(hours=1),
        )

        response = self._approve(appointment.apt_id)

        self.assertEqual(response.status_code, 400)

    def test_owner_can_cancel_after_reschedule(self):
        appointment, _ = self._rescheduled_appointment()
        target_slot = VetSlot.objects.get(vsl_appointment_id=appointment.apt_id)

        response = self.client.post(
            f'/api/owner/appointments/{appointment.apt_id}/cancel/',
            data=json.dumps({'reason': 'Plans changed'}),
            content_type='application/json',
            **self._auth(OWNER_EMAIL),
        )

        self.assertEqual(response.status_code, 200, response.data)
        appointment.refresh_from_db()
        self.assertEqual(appointment.apt_status, AppointmentStatus.CANCELLED)
        target_slot.refresh_from_db()
        self.assertEqual(target_slot.vsl_status, SlotStatus.AVAILABLE)
        self.assertIsNone(target_slot.vsl_appointment_id)
        self.assertFalse(response.data['reschedule_approval_pending'])

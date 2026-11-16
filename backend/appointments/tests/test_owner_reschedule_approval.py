import json
import uuid
from datetime import datetime, time, timedelta
from decimal import Decimal

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
from audit_log.models import AuditAction, AuditLog
from notifications.models import Notification, NotificationType
from payments.models import (
    Payment,
    PaymentEvent,
    PaymentEventType,
    PaymentMethod,
    PaymentProvider,
    PaymentStatus,
)
from reports.services import ReportService
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

    def _paid_payment(self, appointment, amount=Decimal('500.00')):
        return Payment.objects.create(
            pay_reference=f'XPS-TEST-{uuid.uuid4().hex[:12].upper()}',
            cln_id=self.clinic,
            own_id=self.owner,
            apt_id=appointment,
            pay_amount=amount,
            pay_method=PaymentMethod.GCASH,
            pay_status=PaymentStatus.PAID,
            pay_provider=PaymentProvider.MOCK,
            pay_paid_at=timezone.now(),
            pay_metadata={'pet_name': self.pet.pet_name},
        )

    def _cancel_owner(self, apt_id, reason='Plans changed'):
        return self.client.post(
            f'/api/owner/appointments/{apt_id}/cancel/',
            data=json.dumps({'reason': reason}),
            content_type='application/json',
            **self._auth(OWNER_EMAIL),
        )

    def _cancel_staff(self, apt_id):
        return self.client.patch(
            f'/api/appointments/{apt_id}/',
            data=json.dumps({'apt_status': 'CANCELLED'}),
            content_type='application/json',
            **self._auth(RECEPTIONIST_EMAIL),
        )


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

        response = self._cancel_owner(appointment.apt_id)

        self.assertEqual(response.status_code, 200, response.data)
        appointment.refresh_from_db()
        self.assertEqual(appointment.apt_status, AppointmentStatus.CANCELLED)
        target_slot.refresh_from_db()
        self.assertEqual(target_slot.vsl_status, SlotStatus.AVAILABLE)
        self.assertIsNone(target_slot.vsl_appointment_id)
        self.assertFalse(response.data['reschedule_approval_pending'])


class RescheduledCancellationRefundTests(OwnerRescheduleApprovalBase):

    def test_owner_cancel_after_reschedule_refunds_paid_fee(self):
        appointment, _ = self._rescheduled_appointment()
        payment = self._paid_payment(appointment)

        response = self._cancel_owner(appointment.apt_id)

        self.assertEqual(response.status_code, 200, response.data)
        payment.refresh_from_db()
        self.assertEqual(payment.pay_status, PaymentStatus.REFUNDED)
        self.assertIsNotNone(payment.pay_refunded_at)
        self.assertTrue(payment.pay_refund_reference.startswith('RFD-'))
        self.assertEqual(
            payment.pay_refund_reason,
            'Owner cancelled a rescheduled appointment.',
        )
        self.assertTrue(PaymentEvent.objects.filter(
            pay_id=payment,
            evt_type=PaymentEventType.REFUNDED,
        ).exists())
        self.assertTrue(AuditLog.objects.filter(
            adl_record_id=payment.pay_id,
            adl_action=AuditAction.PAYMENT_REFUNDED,
        ).exists())
        self.assertTrue(Notification.objects.filter(
            usr_id_id=self.owner_user.usr_id,
            ntf_type=NotificationType.PAYMENT_REFUNDED,
            ntf_reference_id=payment.pay_id,
        ).exists())
        self.assertEqual(response.data['payment']['status'], 'REFUNDED')
        self.assertEqual(
            response.data['payment']['refund_reference'],
            payment.pay_refund_reference,
        )

    def test_owner_cancel_deducts_refund_from_revenue(self):
        appointment, _ = self._rescheduled_appointment()
        self._paid_payment(appointment, amount=Decimal('500.00'))
        today = timezone.now().astimezone(
            get_clinic_timezone(self.clinic.cln_id),
        ).date()
        before = ReportService.get_revenue(self.clinic.cln_id, today, today)
        self.assertEqual(before['revenue'], '500.00')

        response = self._cancel_owner(appointment.apt_id)

        self.assertEqual(response.status_code, 200, response.data)
        after = ReportService.get_revenue(self.clinic.cln_id, today, today)
        self.assertEqual(after['revenue'], '0.00')
        self.assertEqual(after['payment_count'], 0)

    def test_owner_cancel_without_reschedule_does_not_refund(self):
        appointment = self._confirmed_appointment()
        payment = self._paid_payment(appointment)

        response = self._cancel_owner(appointment.apt_id)

        self.assertEqual(response.status_code, 200, response.data)
        payment.refresh_from_db()
        self.assertEqual(payment.pay_status, PaymentStatus.PAID)
        self.assertIsNone(payment.pay_refunded_at)

    def test_staff_cancel_after_reschedule_refunds_paid_fee(self):
        appointment, _ = self._rescheduled_appointment()
        payment = self._paid_payment(appointment)

        response = self._cancel_staff(appointment.apt_id)

        self.assertEqual(response.status_code, 200, response.data)
        payment.refresh_from_db()
        self.assertEqual(payment.pay_status, PaymentStatus.REFUNDED)
        self.assertEqual(
            payment.pay_refund_reason,
            'Receptionist cancelled the appointment.',
        )
        self.assertEqual(response.data['payment']['status'], 'REFUNDED')

    def test_staff_cancel_without_reschedule_refunds_paid_fee(self):
        appointment = self._confirmed_appointment()
        payment = self._paid_payment(appointment)

        response = self._cancel_staff(appointment.apt_id)

        self.assertEqual(response.status_code, 200, response.data)
        payment.refresh_from_db()
        self.assertEqual(payment.pay_status, PaymentStatus.REFUNDED)
        self.assertIsNotNone(payment.pay_refunded_at)
        self.assertTrue(payment.pay_refund_reference.startswith('RFD-'))
        self.assertEqual(
            payment.pay_refund_reason,
            'Receptionist cancelled the appointment.',
        )
        self.assertTrue(PaymentEvent.objects.filter(
            pay_id=payment,
            evt_type=PaymentEventType.REFUNDED,
        ).exists())
        self.assertTrue(AuditLog.objects.filter(
            adl_record_id=payment.pay_id,
            adl_action=AuditAction.PAYMENT_REFUNDED,
        ).exists())
        self.assertTrue(Notification.objects.filter(
            usr_id_id=self.owner_user.usr_id,
            ntf_type=NotificationType.PAYMENT_REFUNDED,
            ntf_reference_id=payment.pay_id,
        ).exists())
        self.assertEqual(response.data['payment']['status'], 'REFUNDED')
        self.assertEqual(
            response.data['payment']['refund_reference'],
            payment.pay_refund_reference,
        )

    def test_staff_cancel_with_unpaid_fee_creates_no_refund(self):
        appointment = self._confirmed_appointment()
        payment = self._paid_payment(appointment)
        payment.pay_status = PaymentStatus.PENDING
        payment.pay_paid_at = None
        payment.save(update_fields=['pay_status', 'pay_paid_at'])

        response = self._cancel_staff(appointment.apt_id)

        self.assertEqual(response.status_code, 200, response.data)
        payment.refresh_from_db()
        self.assertEqual(payment.pay_status, PaymentStatus.PENDING)
        self.assertIsNone(payment.pay_refund_reference)
        self.assertFalse(PaymentEvent.objects.filter(
            pay_id=payment,
            evt_type=PaymentEventType.REFUNDED,
        ).exists())

    def test_owner_cancel_after_second_reschedule_refunds(self):
        appointment, _ = self._rescheduled_appointment()
        self.assertEqual(self._approve(appointment.apt_id).status_code, 200)
        second_slot = self._available_slots()[0]
        self.assertEqual(
            self._reschedule(appointment.apt_id, second_slot.vsl_id).status_code,
            200,
        )
        payment = self._paid_payment(appointment)

        response = self._cancel_owner(appointment.apt_id)

        self.assertEqual(response.status_code, 200, response.data)
        payment.refresh_from_db()
        self.assertEqual(payment.pay_status, PaymentStatus.REFUNDED)

    def test_owner_cancel_with_unpaid_fee_creates_no_refund(self):
        appointment, _ = self._rescheduled_appointment()
        payment = self._paid_payment(appointment)
        payment.pay_status = PaymentStatus.PENDING
        payment.pay_paid_at = None
        payment.save(update_fields=['pay_status', 'pay_paid_at'])

        response = self._cancel_owner(appointment.apt_id)

        self.assertEqual(response.status_code, 200, response.data)
        payment.refresh_from_db()
        self.assertEqual(payment.pay_status, PaymentStatus.PENDING)
        self.assertIsNone(payment.pay_refund_reference)
        self.assertFalse(PaymentEvent.objects.filter(
            pay_id=payment,
            evt_type=PaymentEventType.REFUNDED,
        ).exists())

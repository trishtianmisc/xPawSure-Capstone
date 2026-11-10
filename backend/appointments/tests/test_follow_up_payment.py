from datetime import timedelta
from decimal import Decimal
from urllib.parse import parse_qs, urlparse

from django.test import override_settings
from django.utils import timezone
from rest_framework import status

from appointments.models import Appointment, AppointmentStatus, AppointmentType
from appointments.tests.test_follow_up_flow import FollowUpFlowBase
from clinics.models import ClinicSettings
from notifications.models import Notification, NotificationType
from payments.models import Payment, PaymentEvent, PaymentEventType, PaymentStatus


@override_settings(PAYMENT_MODE='mock')
class FollowUpPaymentTests(FollowUpFlowBase):

    def _scheduled_follow_up(
        self,
        expected_status=AppointmentStatus.CONFIRMATION,
    ):
        follow_up = Appointment.objects.get(
            apt_source_consultation=self._create_follow_up(),
        )
        slot = self._slot()
        response = self._confirm(follow_up, slot)
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        follow_up.refresh_from_db()
        self.assertEqual(follow_up.apt_status, expected_status)
        return follow_up, slot

    def _checkout(self, follow_up, method='GCASH', email='owner@example.com'):
        return self.client.post(
            f'/api/owner/appointments/{follow_up.apt_id}/checkout/',
            {'method': method},
            format='json',
            **self._auth(email),
        )

    def _pending_payment(self, follow_up):
        response = self._checkout(follow_up)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        return Payment.objects.get(pay_id=response.data['pay_id'])

    def _token(self, payment):
        return parse_qs(urlparse(payment.pay_checkout_url).query)['token'][0]

    def _confirm_mock(self, payment, outcome='success'):
        return self.client.post(
            f'/api/payments/mock/{payment.pay_reference}/confirm/',
            {'token': self._token(payment), 'outcome': outcome},
            format='json',
        )

    def test_scheduled_follow_up_detail_exposes_fee_and_pay_notification(self):
        follow_up, _ = self._scheduled_follow_up()

        response = self.client.get(
            f'/api/owner/appointments/{follow_up.apt_id}/',
            **self._auth('owner@example.com'),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data['apt_status'], AppointmentStatus.CONFIRMATION)
        self.assertEqual(response.data['consultation_fee'], 500.0)
        self.assertTrue(
            Notification.objects.filter(
                usr_id=self.owner_user,
                ntf_type=NotificationType.APPOINTMENT_CREATED,
                ntf_reference_id=follow_up.apt_id,
            ).exists(),
        )

    def test_checkout_creates_pending_payment_and_lists_it(self):
        follow_up, _ = self._scheduled_follow_up()

        response = self._checkout(follow_up)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data['status'], PaymentStatus.PENDING)
        self.assertEqual(response.data['amount'], 500.0)
        self.assertIsNone(response.data['appointment_id'])
        self.assertTrue(response.data['checkout_url'])

        payment = Payment.objects.get(pay_id=response.data['pay_id'])
        self.assertIsNone(payment.apt_id_id)
        self.assertEqual(payment.pay_metadata['appointment_id'], str(follow_up.apt_id))
        self.assertEqual(payment.pay_metadata['booking_channel'], 'owner_follow_up')

        list_response = self.client.get(
            '/api/owner/payments/',
            {'appointment': str(follow_up.apt_id)},
            **self._auth('owner@example.com'),
        )
        self.assertEqual(list_response.status_code, status.HTTP_200_OK, list_response.data)
        self.assertEqual(list_response.data['total'], 1)
        self.assertEqual(list_response.data['results'][0]['pay_id'], str(payment.pay_id))

    def test_checkout_reuses_a_pending_attempt(self):
        follow_up, _ = self._scheduled_follow_up()

        first = self._checkout(follow_up)
        second = self._checkout(follow_up)

        self.assertEqual(first.status_code, status.HTTP_201_CREATED, first.data)
        self.assertEqual(second.status_code, status.HTTP_201_CREATED, second.data)
        self.assertEqual(first.data['pay_id'], second.data['pay_id'])
        self.assertEqual(
            Payment.objects.filter(
                pay_metadata__appointment_id=str(follow_up.apt_id),
            ).count(),
            1,
        )

    def test_checkout_is_owner_scoped(self):
        follow_up, _ = self._scheduled_follow_up()

        response = self._checkout(follow_up, email='other@example.com')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND, response.data)

    def test_checkout_rejects_non_follow_up_appointment(self):
        appointment = Appointment.objects.create(
            pet_id=self.pet,
            cln_id=self.clinic,
            stf_id=self.vet,
            apt_type=AppointmentType.CONSULTATION,
            apt_status=AppointmentStatus.CONFIRMATION,
            apt_scheduled_at=timezone.now() + timedelta(days=1),
        )

        response = self._checkout(appointment)

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT, response.data)
        self.assertEqual(response.data['code'], 'NOT_A_FOLLOW_UP')

    def test_checkout_rejects_past_due_follow_up(self):
        follow_up, _ = self._scheduled_follow_up()
        follow_up.apt_scheduled_at = timezone.now() - timedelta(hours=1)
        follow_up.save(update_fields=['apt_scheduled_at'])

        response = self._checkout(follow_up)

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT, response.data)
        self.assertEqual(response.data['code'], 'APPOINTMENT_EXPIRED')

    def test_checkout_rejects_unknown_method(self):
        follow_up, _ = self._scheduled_follow_up()

        response = self._checkout(follow_up, method='CASH')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, response.data)

    def test_mock_payment_confirms_follow_up_and_links_payment(self):
        follow_up, _ = self._scheduled_follow_up()
        payment = self._pending_payment(follow_up)

        response = self._confirm_mock(payment)

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        payment.refresh_from_db()
        follow_up.refresh_from_db()
        self.assertEqual(payment.pay_status, PaymentStatus.PAID)
        self.assertEqual(payment.apt_id_id, follow_up.apt_id)
        self.assertEqual(follow_up.apt_status, AppointmentStatus.CONFIRMED)
        self.assertTrue(
            PaymentEvent.objects.filter(
                pay_id=payment,
                evt_type=PaymentEventType.LINKED,
            ).exists(),
        )
        self.assertTrue(
            Notification.objects.filter(
                usr_id=self.owner_user,
                ntf_type=NotificationType.APPOINTMENT_CONFIRMED,
                ntf_reference_id=follow_up.apt_id,
            ).exists(),
        )

    def test_expired_checkout_can_be_retried(self):
        follow_up, _ = self._scheduled_follow_up()
        first = self._pending_payment(follow_up)
        first.pay_expires_at = timezone.now() - timedelta(minutes=1)
        first.save(update_fields=['pay_expires_at'])

        second = self._checkout(follow_up)

        self.assertEqual(second.status_code, status.HTTP_201_CREATED, second.data)
        self.assertNotEqual(str(first.pay_id), second.data['pay_id'])
        first.refresh_from_db()
        self.assertEqual(first.pay_status, PaymentStatus.EXPIRED)

    def test_payment_after_cancellation_does_not_confirm(self):
        follow_up, _ = self._scheduled_follow_up()
        payment = self._pending_payment(follow_up)

        cancel_response = self.client.patch(
            f'/api/appointments/{follow_up.apt_id}/',
            {'apt_status': 'CANCELLED', 'cancellation_reason': 'Owner declined'},
            content_type='application/json',
            **self._auth('desk@example.com'),
        )
        self.assertEqual(cancel_response.status_code, status.HTTP_200_OK)

        response = self._confirm_mock(payment)

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        payment.refresh_from_db()
        follow_up.refresh_from_db()
        self.assertEqual(payment.pay_status, PaymentStatus.PAID)
        self.assertIsNone(payment.apt_id_id)
        self.assertEqual(follow_up.apt_status, AppointmentStatus.CANCELLED)

    def test_zero_fee_follow_up_confirms_without_payment(self):
        ClinicSettings.objects.filter(cln_id=self.clinic).update(
            cls_consultation_fee=Decimal('0.00'),
        )
        follow_up, _ = self._scheduled_follow_up(
            expected_status=AppointmentStatus.CONFIRMED,
        )

        self.assertEqual(follow_up.apt_status, AppointmentStatus.CONFIRMED)
        self.assertFalse(
            Payment.objects.filter(
                pay_metadata__appointment_id=str(follow_up.apt_id),
            ).exists(),
        )

        response = self._checkout(follow_up)

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT, response.data)
        self.assertEqual(response.data['code'], 'NOT_AWAITING_PAYMENT')

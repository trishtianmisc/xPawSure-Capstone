import hashlib
import hmac
import json
from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch
from urllib.parse import parse_qs, urlparse

from django.test import override_settings
from django.utils import timezone
from rest_framework import status

from appointments.models import Appointment
from appointments.tests.test_owner_booking import (
    OTHER_OWNER_EMAIL,
    OWNER_EMAIL,
    RECEPTIONIST_EMAIL,
    VET_EMAIL,
    OwnerBookingBase,
)
from clinics.models import Clinic, ClinicSettings
from notifications.models import Notification, NotificationType
from payments.models import Payment, PaymentEvent, PaymentStatus
from payments.services import PaymentService
from users.models import StaffPosition, StaffProfile, UserRole

FEE = Decimal('500.00')
WEBHOOK_SECRET = 'whsec_test_secret'


@override_settings(PAYMENT_MODE='mock')
class PaymentTestBase(OwnerBookingBase):
    """Owner booking fixtures plus a clinic that actually charges a fee.

    ``PAYMENT_MODE`` is pinned so a developer's ``.env`` (which may point at a
    real gateway) cannot change what these tests exercise. Gateway-specific
    suites override it again on their own classes.
    """

    def setUp(self):
        super().setUp()
        ClinicSettings.objects.filter(cln_id=self.clinic).update(
            cls_consultation_fee=FEE,
        )
        self.slot_id = self._get_slots(OWNER_EMAIL)[0]['vsl_id']

    def _checkout_payload(self, **overrides):
        payload = {
            'pet_id': str(self.pet.pet_id),
            'slot_id': self.slot_id,
            'apt_type': 'CONSULTATION',
            'method': 'GCASH',
            'reason': 'Itchy skin',
        }
        payload.update(overrides)
        return payload

    def _checkout(self, payload=None, email=RECEPTIONIST_EMAIL):
        return self.client.post(
            '/api/payments/checkout/',
            payload or self._checkout_payload(),
            format='json',
            **self._auth(email),
        )

    def _token_from(self, checkout_url):
        return parse_qs(urlparse(checkout_url).query)['token'][0]

    def _confirm(self, reference, token, outcome='success'):
        return self.client.post(
            f'/api/payments/mock/{reference}/confirm/',
            {'token': token, 'outcome': outcome},
            format='json',
        )

    def _pay(self, email=RECEPTIONIST_EMAIL, pet=None):
        """Checkout and drive the mock provider to PAID; returns the payment."""
        pet = pet or self.pet
        payload = self._checkout_payload(pet_id=str(pet.pet_id))
        if email in (OWNER_EMAIL, OTHER_OWNER_EMAIL):
            screening = self._create_screening(pet=pet, email=email)
            payload['screening_id'] = screening['ais_id']

        response = self._checkout(payload, email=email)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        payment = Payment.objects.get(pay_id=response.data['pay_id'])
        result = self._confirm(
            payment.pay_reference, self._token_from(payment.pay_checkout_url),
        )
        self.assertEqual(result.status_code, status.HTTP_200_OK, result.data)
        payment.refresh_from_db()
        self.assertEqual(payment.pay_status, PaymentStatus.PAID)
        return payment

    def _book(self, pay_id=None, slot_id=None, email=RECEPTIONIST_EMAIL):
        payload = {
            'pet_id': str(self.pet.pet_id),
            'slot_id': slot_id or self.slot_id,
            'apt_type': 'CONSULTATION',
            'reason': 'Itchy skin',
        }
        if pay_id:
            payload['pay_id'] = str(pay_id)
        return self.client.post(
            '/api/appointments/', payload, format='json', **self._auth(email),
        )

    def _owner_checkout(self):
        """Owner checkout (screening included); returns the PENDING payment."""
        screening = self._create_screening(pet=self.pet, email=OWNER_EMAIL)
        payload = self._checkout_payload(screening_id=screening['ais_id'])
        response = self._checkout(payload, email=OWNER_EMAIL)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        return Payment.objects.get(pay_id=response.data['pay_id'])


class CheckoutTests(PaymentTestBase):

    def test_receptionist_checkout_creates_pending_payment(self):
        response = self._checkout()

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data['status'], PaymentStatus.PENDING)
        self.assertEqual(response.data['amount'], 500.0)
        self.assertEqual(response.data['method'], 'GCASH')
        self.assertEqual(response.data['provider'], 'MOCK')
        self.assertTrue(response.data['reference_no'].startswith('XPS-'))
        self.assertIn('/payments/mock/', response.data['checkout_url'])
        self.assertIsNone(response.data['appointment_id'])

        payment = Payment.objects.get(pay_id=response.data['pay_id'])
        self.assertEqual(payment.cln_id_id, self.clinic.cln_id)
        self.assertEqual(payment.own_id_id, self.owner.own_id)
        self.assertEqual(payment.pay_metadata['pet_id'], str(self.pet.pet_id))

    @override_settings(PAYMENT_MODE='paymongo', PAYMONGO_SECRET_KEY='')
    def test_unconfigured_gateway_returns_503_without_creating_a_payment(self):
        before = Payment.objects.count()

        response = self._checkout()

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(response.data['code'], 'PROVIDER_NOT_CONFIGURED')
        self.assertEqual(Payment.objects.count(), before)

    @override_settings(PAYMENT_MODE='xendit', XENDIT_SECRET_KEY='')
    def test_unconfigured_xendit_returns_503_without_creating_a_payment(self):
        before = Payment.objects.count()

        response = self._checkout()

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(response.data['code'], 'PROVIDER_NOT_CONFIGURED')
        self.assertEqual(Payment.objects.count(), before)

    def test_owner_clinic_list_exposes_the_fee(self):
        # The booking wizard shows what the owner must pay before checkout.
        response = self.client.get('/api/owner/clinics/', **self._auth(OWNER_EMAIL))

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        clinic = next(
            row for row in response.data
            if row['cln_id'] == str(self.clinic.cln_id)
        )
        self.assertEqual(clinic['consultation_fee'], float(FEE))

    def test_checkout_is_skipped_when_no_fee_is_configured(self):
        ClinicSettings.objects.filter(cln_id=self.clinic).update(
            cls_consultation_fee=Decimal('0.00'),
        )

        response = self._checkout()

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['code'], 'PAYMENT_NOT_REQUIRED')

    def test_cash_checkout_is_paid_immediately(self):
        response = self._checkout(self._checkout_payload(method='CASH'))

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data['status'], PaymentStatus.PAID)
        self.assertEqual(response.data['provider'], 'CASH')
        self.assertIsNone(response.data['checkout_url'])
        self.assertIsNotNone(response.data['paid_at'])

    def test_owner_cannot_record_cash(self):
        screening = self._create_screening()
        payload = self._checkout_payload(
            method='CASH', screening_id=screening['ais_id'],
        )

        response = self._checkout(payload, email=OWNER_EMAIL)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['code'], 'METHOD_NOT_ALLOWED')

    def test_owner_checkout_needs_a_screening(self):
        response = self._checkout(self._checkout_payload(), email=OWNER_EMAIL)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data['code'], 'SCREENING_REQUIRED')

    def test_owner_checkout_for_own_pet_with_screening(self):
        screening = self._create_screening()
        payload = self._checkout_payload(screening_id=screening['ais_id'])

        response = self._checkout(payload, email=OWNER_EMAIL)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data['status'], PaymentStatus.PENDING)
        self.assertEqual(response.data['owner_id'], str(self.owner.own_id))

    def test_owner_cannot_pay_for_another_owners_pet(self):
        screening = self._create_screening(pet=self.other_pet, email=OTHER_OWNER_EMAIL)
        payload = self._checkout_payload(
            pet_id=str(self.other_pet.pet_id),
            screening_id=screening['ais_id'],
        )

        response = self._checkout(payload, email=OWNER_EMAIL)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data['code'], 'PET_NOT_FOUND')

    def test_checkout_rejects_unknown_slot(self):
        payload = self._checkout_payload(slot_id='11111111-1111-1111-1111-111111111111')

        response = self._checkout(payload)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data['code'], 'SLOT_NOT_FOUND')

    def test_checkout_rejects_veterinarian(self):
        response = self._checkout(email=VET_EMAIL)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_checkout_requires_authentication(self):
        response = self.client.post(
            '/api/payments/checkout/', self._checkout_payload(), format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class MockCheckoutTests(PaymentTestBase):

    def _start_checkout(self, email=RECEPTIONIST_EMAIL):
        response = self._checkout(email=email)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        payment = Payment.objects.get(pay_id=response.data['pay_id'])
        token = self._token_from(payment.pay_checkout_url)
        return payment, token

    def test_status_endpoint_reads_signed_link(self):
        payment, token = self._start_checkout()

        response = self.client.get(
            f'/api/payments/mock/{payment.pay_reference}/?token={token}',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data['status'], PaymentStatus.PENDING)

    def test_status_endpoint_rejects_tampered_token(self):
        payment, token = self._start_checkout()

        response = self.client.get(
            f'/api/payments/mock/{payment.pay_reference}/?token={token[:-2]}xx',
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data['code'], 'INVALID_TOKEN')

    def test_confirm_success_marks_paid(self):
        payment, token = self._start_checkout()

        response = self._confirm(payment.pay_reference, token, 'success')

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data['status'], PaymentStatus.PAID)
        payment.refresh_from_db()
        self.assertIsNotNone(payment.pay_paid_at)
        self.assertTrue(
            payment.events.filter(evt_type='PAID').exists(),
        )
        self.assertTrue(
            PaymentEvent.objects.filter(
                pay_id=payment, evt_type='PAID',
            ).exists(),
        )

    def test_confirm_decline_marks_failed(self):
        payment, token = self._start_checkout()

        response = self._confirm(payment.pay_reference, token, 'decline')

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        payment.refresh_from_db()
        self.assertEqual(payment.pay_status, PaymentStatus.FAILED)

    def test_confirm_is_single_use(self):
        payment, token = self._start_checkout()
        self._confirm(payment.pay_reference, token, 'success')

        response = self._confirm(payment.pay_reference, token, 'decline')

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(response.data['code'], 'PAYMENT_PROCESSED')

    def test_confirm_rejects_missing_payment(self):
        response = self._confirm('XPS-00000000-DEADBE', 'not-a-token', 'success')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data['code'], 'PAYMENT_NOT_FOUND')


class BookingGateTests(PaymentTestBase):

    def test_booking_without_payment_is_rejected(self):
        response = self._book()

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['code'], 'PAYMENT_REQUIRED')
        self.assertEqual(response.data['amount'], 500.0)
        self.assertEqual(response.data['currency'], 'PHP')
        self.assertFalse(Appointment.objects.exists())

    def test_booking_with_pending_payment_is_rejected(self):
        checkout = self._checkout()
        self.assertEqual(checkout.status_code, status.HTTP_201_CREATED, checkout.data)

        response = self._book(pay_id=checkout.data['pay_id'])

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['code'], 'PAYMENT_REQUIRED')
        self.assertFalse(Appointment.objects.exists())

    def test_booking_with_paid_payment_succeeds_and_consumes_it(self):
        payment = self._pay()

        response = self._book(pay_id=payment.pay_id)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        payment.refresh_from_db()
        self.assertIsNotNone(payment.apt_id)
        self.assertEqual(payment.apt_id.apt_status, 'CONFIRMED')
        self.assertTrue(
            PaymentEvent.objects.filter(
                pay_id=payment, evt_type='LINKED',
            ).exists(),
        )

    def test_paid_payment_cannot_be_used_twice(self):
        payment = self._pay()
        first = self._book(pay_id=payment.pay_id)
        self.assertEqual(first.status_code, status.HTTP_201_CREATED, first.data)
        other_slot = self._get_slots(OWNER_EMAIL)[1]['vsl_id']

        second = self._book(pay_id=payment.pay_id, slot_id=other_slot)

        self.assertEqual(second.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(second.data['code'], 'PAYMENT_INVALID')

    def test_payment_belonging_to_another_owner_is_rejected(self):
        other_payment = self._pay(email=OTHER_OWNER_EMAIL, pet=self.other_pet)

        response = self._book(pay_id=other_payment.pay_id)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['code'], 'PAYMENT_INVALID')
        other_payment.refresh_from_db()
        self.assertIsNone(other_payment.apt_id)

    def test_expired_payment_is_rejected_and_marked_expired(self):
        payment = self._pay()
        Payment.objects.filter(pay_id=payment.pay_id).update(
            pay_status=PaymentStatus.PENDING,
            pay_paid_at=None,
            pay_expires_at='2020-01-01T00:00:00Z',
        )

        response = self._book(pay_id=payment.pay_id)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['code'], 'PAYMENT_REQUIRED')
        payment.refresh_from_db()
        self.assertEqual(payment.pay_status, PaymentStatus.EXPIRED)

    def test_unknown_payment_id_is_rejected(self):
        response = self._book(pay_id='22222222-2222-2222-2222-222222222222')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['code'], 'PAYMENT_INVALID')

    def test_explicit_json_null_pay_id_is_rejected(self):
        # Mobile clients may send pay_id: null rather than omitting the key.
        response = self.client.post(
            '/api/appointments/',
            data=json.dumps({
                'pet_id': str(self.pet.pet_id),
                'slot_id': self.slot_id,
                'apt_type': 'CONSULTATION',
                'reason': 'Itchy skin',
                'pay_id': None,
            }),
            content_type='application/json',
            **self._auth(RECEPTIONIST_EMAIL),
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['code'], 'PAYMENT_REQUIRED')

    def test_zero_fee_keeps_the_old_behaviour(self):
        ClinicSettings.objects.filter(cln_id=self.clinic).update(
            cls_consultation_fee=Decimal('0.00'),
        )

        response = self._book()

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(Payment.objects.count(), 0)


class OwnerBookingGateTests(PaymentTestBase):

    def _book_as_owner(self, pay_id=None, screening_id=None):
        screening_id = screening_id or self._create_screening()['ais_id']
        payload = {
            'pet_id': str(self.pet.pet_id),
            'slot_id': self.slot_id,
            'apt_type': 'CONSULTATION',
            'reason': 'Itchy skin',
            'screening_id': screening_id,
        }
        if pay_id:
            payload['pay_id'] = str(pay_id)
        return self.client.post(
            '/api/owner/appointments/',
            payload,
            format='json',
            **self._auth(OWNER_EMAIL),
        )

    def test_owner_booking_without_payment_is_rejected(self):
        response = self._book_as_owner()

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['code'], 'PAYMENT_REQUIRED')
        self.assertEqual(response.data['amount'], 500.0)

    def test_owner_booking_with_paid_payment_succeeds(self):
        screening = self._create_screening()
        checkout = self._checkout(
            self._checkout_payload(screening_id=screening['ais_id']),
            email=OWNER_EMAIL,
        )
        self.assertEqual(checkout.status_code, status.HTTP_201_CREATED, checkout.data)
        payment = Payment.objects.get(pay_id=checkout.data['pay_id'])
        self._confirm(
            payment.pay_reference, self._token_from(payment.pay_checkout_url),
        )

        response = self._book_as_owner(
            pay_id=payment.pay_id, screening_id=screening['ais_id'],
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        payment.refresh_from_db()
        self.assertIsNotNone(payment.apt_id)


class PaymentReadTests(PaymentTestBase):

    def test_owner_can_read_own_payment_only(self):
        payment = self._pay()

        own = self.client.get(
            f'/api/payments/{payment.pay_id}/', **self._auth(OWNER_EMAIL),
        )
        other = self.client.get(
            f'/api/payments/{payment.pay_id}/', **self._auth(OTHER_OWNER_EMAIL),
        )

        self.assertEqual(own.status_code, status.HTTP_200_OK, own.data)
        self.assertEqual(own.data['reference_no'], payment.pay_reference)
        self.assertEqual(other.status_code, status.HTTP_404_NOT_FOUND)

    def test_owner_cannot_use_the_clinic_list(self):
        response = self.client.get('/api/payments/', **self._auth(OWNER_EMAIL))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_owner_list_returns_own_receipts_only(self):
        mine = self._pay(email=OWNER_EMAIL)
        theirs = self._pay(email=OTHER_OWNER_EMAIL, pet=self.other_pet)

        response = self.client.get('/api/owner/payments/', **self._auth(OWNER_EMAIL))

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data['total'], 1)
        result = response.data['results'][0]
        self.assertEqual(result['pay_id'], str(mine.pay_id))
        self.assertNotEqual(result['pay_id'], str(theirs.pay_id))

    def test_owner_list_filters_by_status_and_paginates(self):
        self._pay(email=OWNER_EMAIL)
        self._owner_checkout()

        paid = self.client.get(
            '/api/owner/payments/?status=PAID', **self._auth(OWNER_EMAIL),
        )
        pending = self.client.get(
            '/api/owner/payments/?status=PENDING', **self._auth(OWNER_EMAIL),
        )
        first_page = self.client.get(
            '/api/owner/payments/?page=1&page_size=1', **self._auth(OWNER_EMAIL),
        )

        self.assertEqual(paid.data['total'], 1)
        self.assertEqual(pending.data['total'], 1)
        self.assertEqual(first_page.data['total'], 2)
        self.assertEqual(first_page.data['total_pages'], 2)
        self.assertEqual(len(first_page.data['results']), 1)

    def test_staff_cannot_use_the_owner_list(self):
        response = self.client.get('/api/owner/payments/', **self._auth(RECEPTIONIST_EMAIL))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_owner_list_requires_authentication(self):
        response = self.client.get('/api/owner/payments/')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_is_scoped_to_the_requesting_clinic(self):
        self._pay()
        other_clinic = Clinic.objects.create(cln_name='Other Clinic')
        other_user = self._create_user(
            'other-desk@example.com', UserRole.RECEPTIONIST, 'Dana', 'Desk',
        )
        StaffProfile.objects.create(
            usr_id=other_user,
            cln_id=other_clinic,
            stf_position=StaffPosition.RECEPTIONIST,
        )

        mine = self.client.get('/api/payments/', **self._auth(RECEPTIONIST_EMAIL))
        theirs = self.client.get('/api/payments/', **self._auth('other-desk@example.com'))

        self.assertEqual(mine.status_code, status.HTTP_200_OK, mine.data)
        self.assertEqual(mine.data['total'], 1)
        self.assertEqual(theirs.data['total'], 0)

    def test_list_filters_by_status(self):
        self._pay()

        paid = self.client.get(
            '/api/payments/?status=PAID', **self._auth(RECEPTIONIST_EMAIL),
        )
        pending = self.client.get(
            '/api/payments/?status=PENDING', **self._auth(RECEPTIONIST_EMAIL),
        )

        self.assertEqual(paid.data['total'], 1)
        self.assertEqual(pending.data['total'], 0)

    def test_list_filters_by_appointment(self):
        payment = self._pay()
        appointment = self._book(pay_id=payment.pay_id)
        self.assertEqual(appointment.status_code, status.HTTP_201_CREATED, appointment.data)
        payment.refresh_from_db()

        response = self.client.get(
            f"/api/payments/?appointment={payment.apt_id_id}",
            **self._auth(RECEPTIONIST_EMAIL),
        )

        self.assertEqual(response.data['total'], 1)
        self.assertEqual(response.data['results'][0]['pay_id'], str(payment.pay_id))


class PaymentNotificationTests(PaymentTestBase):
    """The owner hears about their money without having to poll."""

    def test_paid_checkout_notifies_the_owner(self):
        payment = self._pay(email=OWNER_EMAIL)

        notification = Notification.objects.get(
            ntf_type=NotificationType.PAYMENT_COMPLETED,
        )
        self.assertEqual(notification.usr_id_id, payment.own_id.usr_id_id)
        self.assertEqual(notification.ntf_reference_table, 'PAYMENT')
        self.assertEqual(str(notification.ntf_reference_id), str(payment.pay_id))
        self.assertIn(payment.pay_reference, notification.ntf_message)

    def test_cash_recorded_at_the_counter_notifies_the_owner(self):
        response = self._checkout(self._checkout_payload(method='CASH'))
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        payment = Payment.objects.get(pay_id=response.data['pay_id'])

        notification = Notification.objects.get(
            ntf_type=NotificationType.PAYMENT_COMPLETED,
        )
        self.assertEqual(notification.usr_id_id, payment.own_id.usr_id_id)

    def test_expired_checkout_notifies_the_owner(self):
        payment = self._owner_checkout()
        Payment.objects.filter(pay_id=payment.pay_id).update(
            pay_expires_at=timezone.now() - timedelta(minutes=1),
        )

        response = self._book(pay_id=payment.pay_id)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['code'], 'PAYMENT_REQUIRED')
        payment.refresh_from_db()
        self.assertEqual(payment.pay_status, PaymentStatus.EXPIRED)
        self.assertTrue(
            Notification.objects.filter(
                ntf_type=NotificationType.PAYMENT_EXPIRED,
                ntf_reference_id=payment.pay_id,
            ).exists(),
        )

    def test_replayed_webhook_does_not_duplicate_the_notification(self):
        payment = self._owner_checkout()

        for _ in range(2):
            PaymentService.apply_provider_event(
                reference=payment.pay_reference,
                event_type='checkout_session.payment.paid',
                payload={'event_id': 'evt_replay'},
            )

        self.assertEqual(
            Notification.objects.filter(
                ntf_type=NotificationType.PAYMENT_COMPLETED,
            ).count(),
            1,
        )

    def test_a_broken_notification_never_fails_the_payment(self):
        checkout = self._checkout()
        payment = Payment.objects.get(pay_id=checkout.data['pay_id'])

        with patch(
            'notifications.services.NotificationService.create_notification',
            side_effect=RuntimeError('notification backend down'),
        ):
            result = self._confirm(
                payment.pay_reference, self._token_from(payment.pay_checkout_url),
            )

        self.assertEqual(result.status_code, status.HTTP_200_OK, result.data)
        payment.refresh_from_db()
        self.assertEqual(payment.pay_status, PaymentStatus.PAID)


class PaymentCancelTests(PaymentTestBase):

    def test_pending_payment_can_be_cancelled(self):
        checkout = self._checkout()
        payment = Payment.objects.get(pay_id=checkout.data['pay_id'])

        response = self.client.post(
            f'/api/payments/{payment.pay_id}/cancel/', {}, format='json',
            **self._auth(RECEPTIONIST_EMAIL),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data['status'], PaymentStatus.VOID)

        again = self.client.post(
            f'/api/payments/{payment.pay_id}/cancel/', {}, format='json',
            **self._auth(RECEPTIONIST_EMAIL),
        )
        self.assertEqual(again.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(again.data['code'], 'PAYMENT_PROCESSED')

    def test_paid_payment_cannot_be_cancelled(self):
        payment = self._pay()

        response = self.client.post(
            f'/api/payments/{payment.pay_id}/cancel/', {}, format='json',
            **self._auth(RECEPTIONIST_EMAIL),
        )

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        payment.refresh_from_db()
        self.assertEqual(payment.pay_status, PaymentStatus.PAID)


@override_settings(PAYMONGO_WEBHOOK_SECRET=WEBHOOK_SECRET)
class PayMongoWebhookTests(PaymentTestBase):

    def _body(self, reference, event_type='checkout_session.payment.paid'):
        return {
            'data': {
                'id': 'evt_test',
                'type': event_type,
                'attributes': {
                    'type': event_type,
                    'data': {
                        'id': 'cs_test',
                        'type': 'checkout_session',
                        'attributes': {'reference_number': reference},
                    },
                },
            },
        }

    def _v2_body(self, reference, event_type='checkout_session.payment.paid'):
        """Payload as /v2/checkout_sessions actually sends it.

        The session sits under ``data.data``, unlike the legacy envelope the
        ``_body`` helper above builds.
        """
        return {
            'data': {
                'id': 'evt_test',
                'type': event_type,
                'resource': 'checkout_session',
                'data': {
                    'id': 'cs_test',
                    'type': 'checkout_session',
                    'attributes': {
                        'reference_number': reference,
                        'payments': [
                            {'id': 'pay_test', 'attributes': {'status': 'paid'}},
                        ],
                    },
                },
            },
        }

    def _post(self, body, header):
        raw = json.dumps(body).encode('utf-8')
        return self.client.post(
            '/api/payments/webhooks/paymongo/',
            data=raw,
            content_type='application/json',
            HTTP_PAYMONGO_SIGNATURE=header,
        )

    def _signed_header(self, raw, secret=WEBHOOK_SECRET, timestamp='1700000000'):
        digest = hmac.new(
            secret.encode('utf-8'), f'{timestamp}.'.encode('utf-8') + raw,
            hashlib.sha256,
        ).hexdigest()
        return f't={timestamp},te={digest},li='

    def test_rejects_bad_signature(self):
        checkout = self._checkout()
        payment = Payment.objects.get(pay_id=checkout.data['pay_id'])
        raw = json.dumps(self._body(payment.pay_reference)).encode('utf-8')

        response = self._post(
            json.loads(raw), self._signed_header(raw, secret='wrong-secret'),
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        payment.refresh_from_db()
        self.assertEqual(payment.pay_status, PaymentStatus.PENDING)

    def test_paid_event_marks_payment_paid(self):
        checkout = self._checkout()
        payment = Payment.objects.get(pay_id=checkout.data['pay_id'])
        body = self._body(payment.pay_reference)
        raw = json.dumps(body).encode('utf-8')

        response = self._post(body, self._signed_header(raw))

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        payment.refresh_from_db()
        self.assertEqual(payment.pay_status, PaymentStatus.PAID)
        self.assertIsNotNone(payment.pay_paid_at)

    def test_replayed_event_is_applied_once(self):
        checkout = self._checkout()
        payment = Payment.objects.get(pay_id=checkout.data['pay_id'])
        body = self._body(payment.pay_reference)
        raw = json.dumps(body).encode('utf-8')

        self._post(body, self._signed_header(raw))
        Payment.objects.filter(pay_id=payment.pay_id).update(
            pay_status=PaymentStatus.PENDING, pay_paid_at=None,
        )
        second = self._post(body, self._signed_header(raw))

        self.assertEqual(second.status_code, status.HTTP_200_OK)
        payment.refresh_from_db()
        self.assertEqual(payment.pay_status, PaymentStatus.PAID)
        self.assertEqual(
            payment.events.filter(evt_type='PAID').count(), 1,
        )

    def test_v2_payload_marks_payment_paid(self):
        checkout = self._checkout()
        payment = Payment.objects.get(pay_id=checkout.data['pay_id'])
        body = self._v2_body(payment.pay_reference)
        raw = json.dumps(body).encode('utf-8')

        response = self._post(body, self._signed_header(raw))

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        payment.refresh_from_db()
        self.assertEqual(payment.pay_status, PaymentStatus.PAID)
        self.assertIsNotNone(payment.pay_paid_at)

    def test_v2_expired_event_expires_payment(self):
        checkout = self._checkout()
        payment = Payment.objects.get(pay_id=checkout.data['pay_id'])
        body = self._v2_body(
            payment.pay_reference, event_type='checkout_session.expired',
        )
        raw = json.dumps(body).encode('utf-8')

        response = self._post(body, self._signed_header(raw))

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        payment.refresh_from_db()
        self.assertEqual(payment.pay_status, PaymentStatus.EXPIRED)

    def test_unknown_reference_is_acknowledged(self):
        body = self._body('XPS-00000000-000000')
        raw = json.dumps(body).encode('utf-8')

        response = self._post(body, self._signed_header(raw))

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_unconfigured_secret_returns_503(self):
        with override_settings(PAYMONGO_WEBHOOK_SECRET=''):
            body = self._body('XPS-00000000-000000')
            raw = json.dumps(body).encode('utf-8')
            response = self._post(body, self._signed_header(raw))

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)


XENDIT_KEY = 'xnd_development_test_key'
XENDIT_TOKEN = 'xendit_callback_token'
XENDIT_SESSION_URL = 'https://checkout.xendit.co/web/ps-test-123'


class FakeXenditResponse:
    def __init__(self, status_code=200, body=None, text=''):
        self.status_code = status_code
        self._body = body or {}
        self.text = text

    def json(self):
        return self._body


XENDIT_RETURN_BASE = 'https://app.xpawsure.test'


@override_settings(
    PAYMENT_MODE='xendit',
    XENDIT_SECRET_KEY=XENDIT_KEY,
    XENDIT_CALLBACK_TOKEN=XENDIT_TOKEN,
    XENDIT_RETURN_BASE_URL=XENDIT_RETURN_BASE,
)
class XenditCheckoutTests(PaymentTestBase):

    def _session(self, **overrides):
        body = {
            'payment_session_id': 'ps-test-123',
            'status': 'ACTIVE',
            'payment_link_url': XENDIT_SESSION_URL,
        }
        body.update(overrides)
        return FakeXenditResponse(body=body)

    @patch('payments.providers.xendit.requests.post')
    def test_checkout_creates_session_and_returns_hosted_url(self, post):
        post.return_value = self._session()

        response = self._checkout()

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data['provider'], 'XENDIT')
        self.assertEqual(response.data['checkout_url'], XENDIT_SESSION_URL)

        payment = Payment.objects.get(pay_id=response.data['pay_id'])
        self.assertEqual(payment.pay_provider, 'XENDIT')
        self.assertEqual(payment.pay_provider_ref, 'ps-test-123')

    @patch('payments.providers.xendit.requests.post')
    def test_session_payload_matches_xendit_contract(self, post):
        post.return_value = self._session()

        checkout = self._checkout()

        url = post.call_args.args[0]
        payload = post.call_args.kwargs['json']

        self.assertTrue(url.endswith('/sessions'), url)
        self.assertEqual(post.call_args.kwargs['auth'], (XENDIT_KEY, ''))
        self.assertEqual(payload['reference_id'], checkout.data['reference_no'])
        self.assertEqual(payload['session_type'], 'PAY')
        self.assertEqual(payload['mode'], 'PAYMENT_LINK')
        # Centavos, not pesos.
        self.assertEqual(payload['amount'], 50000)
        self.assertEqual(payload['currency'], 'PHP')
        self.assertEqual(payload['country'], 'PH')
        self.assertEqual(payload['allowed_payment_channels'], ['GCASH'])
        self.assertIn(
            f"/payments/success/{checkout.data['reference_no']}",
            payload['success_return_url'],
        )
        self.assertIn(
            f"/payments/cancelled/{checkout.data['reference_no']}",
            payload['cancel_return_url'],
        )
        self.assertEqual(payload['customer']['email'], self.owner.usr_id.usr_email)

    @override_settings(XENDIT_RETURN_BASE_URL='https://tunnel.example/')
    @patch('payments.providers.xendit.requests.post')
    def test_return_urls_use_the_https_return_base(self, post):
        post.return_value = self._session()

        checkout = self._checkout()

        payload = post.call_args.kwargs['json']
        reference = checkout.data['reference_no']
        self.assertEqual(
            payload['success_return_url'],
            f'https://tunnel.example/payments/success/{reference}',
        )
        self.assertEqual(
            payload['cancel_return_url'],
            f'https://tunnel.example/payments/cancelled/{reference}',
        )

    @override_settings(XENDIT_RETURN_BASE_URL='http://localhost:5173')
    @patch('payments.providers.xendit.requests.post')
    def test_http_return_base_fails_before_calling_xendit(self, post):
        before = Payment.objects.count()

        response = self._checkout()

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(response.data['code'], 'PROVIDER_MISCONFIGURED')
        post.assert_not_called()
        self.assertEqual(Payment.objects.count(), before)

    @patch('payments.providers.xendit.requests.post')
    def test_card_checkout_requests_the_cards_channel(self, post):
        post.return_value = self._session()

        self._checkout(self._checkout_payload(method='CARD'))

        self.assertEqual(
            post.call_args.kwargs['json']['allowed_payment_channels'], ['CARDS'],
        )

    @patch('payments.providers.xendit.requests.post')
    def test_gateway_error_leaves_no_payment_row(self, post):
        post.return_value = FakeXenditResponse(status_code=500, text='boom')
        before = Payment.objects.count()

        response = self._checkout()

        self.assertEqual(response.status_code, status.HTTP_502_BAD_GATEWAY)
        self.assertEqual(response.data['code'], 'PROVIDER_ERROR')
        self.assertEqual(Payment.objects.count(), before)


@override_settings(
    PAYMENT_MODE='xendit',
    XENDIT_SECRET_KEY=XENDIT_KEY,
    XENDIT_CALLBACK_TOKEN=XENDIT_TOKEN,
    XENDIT_RETURN_BASE_URL=XENDIT_RETURN_BASE,
)
class XenditWebhookTests(PaymentTestBase):

    def _pending_payment(self):
        with patch('payments.providers.xendit.requests.post') as post:
            post.return_value = FakeXenditResponse(body={
                'payment_session_id': 'ps-test-123',
                'payment_link_url': XENDIT_SESSION_URL,
            })
            checkout = self._checkout()
        self.assertEqual(checkout.status_code, status.HTTP_201_CREATED, checkout.data)
        return Payment.objects.get(pay_id=checkout.data['pay_id'])

    def _body(self, reference, event='payment_session.completed'):
        return {
            'event': event,
            'business_id': 'biz_test',
            'created': '2026-10-26T12:00:00.000Z',
            'data': {
                'id': 'ps-test-123',
                'payment_session_id': 'ps-test-123',
                'reference_id': reference,
                'status': 'COMPLETED',
                'amount': 50000,
                'currency': 'PHP',
            },
        }

    def _post(self, body, token=XENDIT_TOKEN):
        return self.client.post(
            '/api/payments/webhooks/xendit/',
            data=json.dumps(body).encode('utf-8'),
            content_type='application/json',
            HTTP_X_CALLBACK_TOKEN=token,
        )

    def test_completed_event_marks_payment_paid(self):
        payment = self._pending_payment()

        response = self._post(self._body(payment.pay_reference))

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        payment.refresh_from_db()
        self.assertEqual(payment.pay_status, PaymentStatus.PAID)
        self.assertIsNotNone(payment.pay_paid_at)

    def test_expired_event_expires_payment(self):
        payment = self._pending_payment()

        response = self._post(
            self._body(payment.pay_reference, event='payment_session.expired'),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        payment.refresh_from_db()
        self.assertEqual(payment.pay_status, PaymentStatus.EXPIRED)

    def test_wrong_callback_token_is_rejected(self):
        payment = self._pending_payment()

        response = self._post(self._body(payment.pay_reference), token='not-the-token')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        payment.refresh_from_db()
        self.assertEqual(payment.pay_status, PaymentStatus.PENDING)

    def test_unknown_event_is_acknowledged(self):
        payment = self._pending_payment()

        response = self._post(
            self._body(payment.pay_reference, event='payment.capture'),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payment.refresh_from_db()
        self.assertEqual(payment.pay_status, PaymentStatus.PENDING)

    def test_unconfigured_token_returns_503(self):
        with override_settings(XENDIT_CALLBACK_TOKEN=''):
            response = self._post(self._body('XPS-00000000-000000'))

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)

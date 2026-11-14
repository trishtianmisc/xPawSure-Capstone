import json
from datetime import datetime, time, timedelta

from django.utils import timezone

from appointments.models import (
    Appointment,
    AppointmentRequestStatus,
    AppointmentRequestType,
    AppointmentStatus,
    AppointmentType,
    SlotStatus,
    VetSlot,
)
from appointments.services import get_clinic_timezone
from appointments.tests.test_owner_booking import (
    OWNER_EMAIL,
    OTHER_OWNER_EMAIL,
    RECEPTIONIST_EMAIL,
    VET_EMAIL,
    OwnerBookingBase,
)
from clinics.models import Clinic
from notifications.models import Notification, NotificationType
from users.models import StaffPosition, StaffProfile, User, UserRole

ADMIN_EMAIL = 'admin@example.com'
OTHER_DESK_EMAIL = 'other-desk@example.com'


class VetRequestHandlingBase(OwnerBookingBase):

    def setUp(self):
        super().setUp()
        self.admin_user = self._create_user(
            ADMIN_EMAIL, UserRole.CLINIC_ADMIN, 'Ada', 'Admin',
        )
        StaffProfile.objects.create(
            usr_id=self.admin_user,
            cln_id=self.clinic,
            stf_position=StaffPosition.CLINIC_ADMIN,
        )

        self.other_clinic = Clinic.objects.create(cln_name='Other Clinic')
        self.other_desk_user = self._create_user(
            OTHER_DESK_EMAIL, UserRole.RECEPTIONIST, 'Dana', 'Desk',
        )
        StaffProfile.objects.create(
            usr_id=self.other_desk_user,
            cln_id=self.other_clinic,
            stf_position=StaffPosition.RECEPTIONIST,
        )

    def _patch_status(self, apt_id, status, email=RECEPTIONIST_EMAIL, **extra):
        payload = {'apt_status': status, **extra}
        return self.client.patch(
            f'/api/appointments/{apt_id}/',
            data=json.dumps(payload),
            content_type='application/json',
            **self._auth(email),
        )

    def _vet_request(self, action, apt_id, reason, email=VET_EMAIL):
        return self.client.post(
            f'/api/veterinarian/appointments/{apt_id}/{action}/',
            data=json.dumps({'reason': reason}),
            content_type='application/json',
            **self._auth(email),
        )

    def _confirmed_appointment(self, pet=None, email=OWNER_EMAIL):
        """Owner-booked appointment moved to CONFIRMED; returns (apt_id, old_slot_id)."""
        slots = self._get_slots()
        created = self._book(pet=pet, slot_id=slots[0]['vsl_id'], email=email)
        self.assertEqual(created.status_code, 201, created.data)
        apt_id = created.data['apt_id']
        patched = self._patch_status(apt_id, 'CONFIRMED')
        self.assertEqual(patched.status_code, 200, patched.data)
        return apt_id, slots[0]['vsl_id']

    def _make_confirmed_with_request(
        self, action='request-reschedule', reason='Conflict',
    ):
        apt_id, old_slot_id = self._confirmed_appointment()
        response = self._vet_request(action, apt_id, reason)
        self.assertEqual(response.status_code, 200, response.data)
        return apt_id, old_slot_id

    def _set_request(
        self, apt, request_type, request_status,
        reason='Stored reason', requested_by=None,
    ):
        apt.apt_request_type = request_type
        apt.apt_request_status = request_status
        apt.apt_requested_by = requested_by or self.vet
        apt.apt_requested_at = timezone.now()
        if request_type == AppointmentRequestType.RESCHEDULE:
            apt.apt_reschedule_request_reason = reason
        else:
            apt.apt_cancellation_request_reason = reason
        apt.save()
        return apt

    def _direct_appointment(self, scheduled_at, status=AppointmentStatus.CONFIRMED):
        return Appointment.objects.create(
            pet_id=self.pet,
            cln_id=self.clinic,
            stf_id=self.vet,
            apt_type=AppointmentType.CONSULTATION,
            apt_status=status,
            apt_scheduled_at=scheduled_at,
            apt_created_by=self.receptionist_user,
        )

    def _owner_notifs(self, apt_id, ntf_type=NotificationType.SYSTEM):
        return Notification.objects.filter(
            usr_id_id=self.owner_user.usr_id,
            ntf_type=ntf_type,
            ntf_reference_id=apt_id,
        )

    @staticmethod
    def _dump(data):
        return json.dumps(data, default=str)


class VetRequestSubmitTests(VetRequestHandlingBase):

    def test_submit_records_lifecycle_columns(self):
        apt_id, _ = self._confirmed_appointment()

        response = self._vet_request('request-reschedule', apt_id, 'Conflict')

        self.assertEqual(response.status_code, 200, response.data)
        appointment = Appointment.objects.get(apt_id=apt_id)
        self.assertEqual(
            appointment.apt_request_type, AppointmentRequestType.RESCHEDULE,
        )
        self.assertEqual(
            appointment.apt_request_status, AppointmentRequestStatus.OPEN,
        )
        self.assertEqual(appointment.apt_requested_by_id, self.vet.stf_id)
        self.assertIsNotNone(appointment.apt_requested_at)
        self.assertEqual(appointment.apt_status, AppointmentStatus.CONFIRMED)

    def test_second_open_request_is_rejected(self):
        apt_id, _ = self._make_confirmed_with_request(
            action='request-reschedule', reason='First reason',
        )

        response = self._vet_request('request-cancel', apt_id, 'Second reason')

        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn('already has an open request', response.data['detail'])
        appointment = Appointment.objects.get(apt_id=apt_id)
        self.assertEqual(
            appointment.apt_request_type, AppointmentRequestType.RESCHEDULE,
        )
        self.assertEqual(appointment.apt_reschedule_request_reason, 'First reason')
        self.assertIsNone(appointment.apt_cancellation_request_reason)

    def test_submit_notifies_clinic_receptionists_neutrally(self):
        apt_id, _ = self._confirmed_appointment()

        self._vet_request('request-reschedule', apt_id, 'Surgery conflict')

        notifs = Notification.objects.filter(
            usr_id_id=self.receptionist_user.usr_id,
            ntf_type=NotificationType.SYSTEM,
            ntf_reference_id=apt_id,
        )
        self.assertTrue(notifs.exists())
        body = notifs.first().ntf_message
        self.assertIn('Reschedule requested for', body)
        self.assertNotIn('Surgery conflict', body)

    def test_submit_does_not_notify_other_clinic_or_vet(self):
        apt_id, _ = self._confirmed_appointment()

        self._vet_request('request-reschedule', apt_id, 'Surgery conflict')

        self.assertFalse(
            Notification.objects.filter(
                usr_id_id=self.other_desk_user.usr_id,
                ntf_reference_id=apt_id,
            ).exists(),
        )
        self.assertFalse(
            Notification.objects.filter(
                usr_id_id=self.vet_user.usr_id,
                ntf_type=NotificationType.SYSTEM,
                ntf_reference_id=apt_id,
            ).exists(),
        )

    def test_submit_notifies_clinic_admins_neutrally(self):
        apt_id, _ = self._confirmed_appointment()

        self._vet_request('request-reschedule', apt_id, 'Surgery conflict')

        notifs = Notification.objects.filter(
            usr_id_id=self.admin_user.usr_id,
            ntf_type=NotificationType.SYSTEM,
            ntf_reference_id=apt_id,
        )
        self.assertTrue(notifs.exists())
        body = notifs.first().ntf_message
        self.assertIn('Reschedule requested for', body)
        self.assertNotIn('Surgery conflict', body)

    def test_submit_cancel_notifies_clinic_admins_neutrally(self):
        apt_id, _ = self._confirmed_appointment()

        self._vet_request('request-cancel', apt_id, 'Vet is unavailable')

        notifs = Notification.objects.filter(
            usr_id_id=self.admin_user.usr_id,
            ntf_type=NotificationType.SYSTEM,
            ntf_reference_id=apt_id,
        )
        self.assertTrue(notifs.exists())
        body = notifs.first().ntf_message
        self.assertIn('Cancellation requested for', body)
        self.assertNotIn('Vet is unavailable', body)

    def test_legacy_reason_without_lifecycle_can_be_requested_again(self):
        apt_id, _ = self._confirmed_appointment()
        appointment = Appointment.objects.get(apt_id=apt_id)
        appointment.apt_reschedule_request_reason = 'Legacy text'
        appointment.save(update_fields=['apt_reschedule_request_reason'])

        response = self._vet_request('request-cancel', apt_id, 'Fresh reason')

        self.assertEqual(response.status_code, 200, response.data)
        appointment.refresh_from_db()
        self.assertEqual(
            appointment.apt_request_type, AppointmentRequestType.CANCEL,
        )
        self.assertEqual(
            appointment.apt_request_status, AppointmentRequestStatus.OPEN,
        )


class VetRequestLeakTests(VetRequestHandlingBase):
    """Owner and admin responses must never carry the vet's reason text."""

    REASON = 'Vet needs the slot for surgery'

    def _open_request_appointment(self, action='request-reschedule'):
        apt_id, _ = self._make_confirmed_with_request(
            action=action, reason=self.REASON,
        )
        return apt_id

    def test_receptionist_list_includes_request_block(self):
        apt_id = self._open_request_appointment()

        response = self.client.get(
            '/api/appointments/', **self._auth(RECEPTIONIST_EMAIL),
        )

        self.assertEqual(response.status_code, 200, response.data)
        row = next(r for r in response.data['results'] if r['apt_id'] == apt_id)
        self.assertTrue(row['has_open_request'])
        self.assertEqual(row['vet_request']['type'], 'RESCHEDULE')
        self.assertEqual(row['vet_request']['status'], 'OPEN')
        self.assertEqual(row['vet_request']['reason'], self.REASON)
        self.assertEqual(row['vet_request']['requested_by'], 'Vera Vet')

    def test_receptionist_list_row_without_request_is_null_block(self):
        apt_id, _ = self._confirmed_appointment()

        response = self.client.get(
            '/api/appointments/', **self._auth(RECEPTIONIST_EMAIL),
        )

        row = next(r for r in response.data['results'] if r['apt_id'] == apt_id)
        self.assertFalse(row['has_open_request'])
        self.assertIsNone(row['vet_request'])

    def test_receptionist_detail_includes_request_block(self):
        apt_id = self._open_request_appointment()

        response = self.client.get(
            f'/api/appointments/{apt_id}/', **self._auth(RECEPTIONIST_EMAIL),
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertTrue(response.data['has_open_request'])
        self.assertEqual(response.data['vet_request']['reason'], self.REASON)

    def test_owner_list_excludes_request_data(self):
        apt_id = self._open_request_appointment()

        response = self.client.get(
            '/api/owner/appointments/', **self._auth(OWNER_EMAIL),
        )

        self.assertEqual(response.status_code, 200, response.data)
        row = next(r for r in response.data['results'] if r['apt_id'] == apt_id)
        self.assertNotIn('vet_request', row)
        self.assertNotIn('has_open_request', row)
        self.assertNotIn('apt_reschedule_request_reason', row)
        self.assertNotIn('apt_cancellation_request_reason', row)
        self.assertNotIn(self.REASON, self._dump(response.data))

    def test_owner_detail_excludes_request_data(self):
        apt_id = self._open_request_appointment()

        response = self.client.get(
            f'/api/owner/appointments/{apt_id}/', **self._auth(OWNER_EMAIL),
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertNotIn('vet_request', response.data)
        self.assertNotIn('has_open_request', response.data)
        self.assertNotIn('apt_reschedule_request_reason', response.data)
        self.assertNotIn('apt_cancellation_request_reason', response.data)
        self.assertNotIn(self.REASON, self._dump(response.data))

    def test_owner_cancel_response_excludes_request_data(self):
        apt_id = self._open_request_appointment(action='request-cancel')

        response = self.client.post(
            f'/api/owner/appointments/{apt_id}/cancel/',
            data=json.dumps({'reason': 'Owner changed plans'}),
            content_type='application/json',
            **self._auth(OWNER_EMAIL),
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertNotIn('vet_request', response.data)
        self.assertNotIn('apt_reschedule_request_reason', response.data)
        self.assertNotIn('apt_cancellation_request_reason', response.data)
        self.assertNotIn(self.REASON, self._dump(response.data))

    def test_admin_list_excludes_request_data(self):
        apt_id = self._open_request_appointment()

        response = self.client.get(
            '/api/appointments/', **self._auth(ADMIN_EMAIL),
        )

        self.assertEqual(response.status_code, 200, response.data)
        row = next(r for r in response.data['results'] if r['apt_id'] == apt_id)
        self.assertNotIn('vet_request', row)
        self.assertNotIn('has_open_request', row)
        self.assertNotIn('apt_reschedule_request_reason', row)
        self.assertNotIn('apt_cancellation_request_reason', row)
        self.assertNotIn(self.REASON, self._dump(response.data))

    def test_admin_detail_excludes_request_data(self):
        apt_id = self._open_request_appointment()

        response = self.client.get(
            f'/api/appointments/{apt_id}/', **self._auth(ADMIN_EMAIL),
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertNotIn('vet_request', response.data)
        self.assertNotIn('apt_reschedule_request_reason', response.data)
        self.assertNotIn('apt_cancellation_request_reason', response.data)
        self.assertNotIn(self.REASON, self._dump(response.data))

    def test_owner_cancel_notification_never_contains_vet_reason(self):
        apt_id = self._open_request_appointment(action='request-cancel')

        response = self.client.post(
            f'/api/owner/appointments/{apt_id}/cancel/',
            data=json.dumps({}),
            content_type='application/json',
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 200, response.data)

        notifs = self._owner_notifs(
            apt_id, NotificationType.APPOINTMENT_CANCELLED,
        )
        self.assertTrue(notifs.exists())
        body = notifs.first().ntf_message
        self.assertNotIn(self.REASON, body)
        self.assertNotIn('vet request', body.lower())


class DeclineRequestTests(VetRequestHandlingBase):

    def _decline(self, apt_id, note, email=RECEPTIONIST_EMAIL):
        return self.client.post(
            f'/api/appointments/{apt_id}/request/decline/',
            data=json.dumps({'note': note}),
            content_type='application/json',
            **self._auth(email),
        )

    def test_decline_marks_request_declined_without_touching_appointment(self):
        apt_id, old_slot_id = self._make_confirmed_with_request(
            action='request-cancel', reason='Vet is unavailable',
        )
        old_slot = VetSlot.objects.get(vsl_id=old_slot_id)

        response = self._decline(apt_id, 'We found another vet')

        self.assertEqual(response.status_code, 200, response.data)
        appointment = Appointment.objects.get(apt_id=apt_id)
        self.assertEqual(
            appointment.apt_request_status, AppointmentRequestStatus.DECLINED,
        )
        self.assertEqual(appointment.apt_decline_note, 'We found another vet')
        self.assertEqual(appointment.apt_resolved_by_id, self.receptionist_user.usr_id)
        self.assertIsNotNone(appointment.apt_resolved_at)
        # Appointment itself is untouched.
        self.assertEqual(appointment.apt_status, AppointmentStatus.CONFIRMED)
        self.assertEqual(appointment.apt_cancellation_request_reason, 'Vet is unavailable')
        old_slot.refresh_from_db()
        self.assertEqual(old_slot.vsl_status, SlotStatus.BOOKED)
        self.assertEqual(old_slot.vsl_appointment_id, appointment.apt_id)

    def test_decline_notifies_requesting_vet_with_note(self):
        apt_id, _ = self._make_confirmed_with_request()

        response = self._decline(apt_id, 'Slot already committed elsewhere')

        self.assertEqual(response.status_code, 200, response.data)
        notifs = Notification.objects.filter(
            usr_id_id=self.vet_user.usr_id,
            ntf_type=NotificationType.SYSTEM,
            ntf_reference_id=apt_id,
        )
        self.assertTrue(notifs.exists())
        body = notifs.first().ntf_message
        self.assertIn('declined', body.lower())
        self.assertIn('Slot already committed elsewhere', body)

    def test_decline_requires_note(self):
        apt_id, _ = self._make_confirmed_with_request()

        response = self._decline(apt_id, '   ')

        self.assertEqual(response.status_code, 400, response.data)
        appointment = Appointment.objects.get(apt_id=apt_id)
        self.assertEqual(
            appointment.apt_request_status, AppointmentRequestStatus.OPEN,
        )

    def test_decline_rejects_note_over_200_chars(self):
        apt_id, _ = self._make_confirmed_with_request()

        response = self._decline(apt_id, 'x' * 201)

        self.assertEqual(response.status_code, 400, response.data)
        appointment = Appointment.objects.get(apt_id=apt_id)
        self.assertEqual(
            appointment.apt_request_status, AppointmentRequestStatus.OPEN,
        )

    def test_decline_without_open_request_is_400(self):
        apt_id, _ = self._confirmed_appointment()

        response = self._decline(apt_id, 'Nothing to decline')

        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn('no open request', response.data['detail'])

    def test_decline_cross_clinic_is_404(self):
        apt_id, _ = self._make_confirmed_with_request()

        response = self._decline(
            apt_id, 'Other clinic', email=OTHER_DESK_EMAIL,
        )

        self.assertEqual(response.status_code, 404, response.data)

    def test_decline_forbidden_for_vet_and_owner(self):
        apt_id, _ = self._make_confirmed_with_request()

        vet_response = self._decline(apt_id, 'Vet self-approve', email=VET_EMAIL)
        owner_response = self._decline(
            apt_id, 'Owner declines', email=OWNER_EMAIL,
        )

        self.assertEqual(vet_response.status_code, 403)
        self.assertEqual(owner_response.status_code, 403)
        appointment = Appointment.objects.get(apt_id=apt_id)
        self.assertEqual(
            appointment.apt_request_status, AppointmentRequestStatus.OPEN,
        )


class CancelResolvesRequestTests(VetRequestHandlingBase):

    def test_receptionist_cancel_uses_default_reason_and_resolves(self):
        apt_id, _ = self._make_confirmed_with_request(
            action='request-cancel', reason='Vet is unavailable',
        )

        response = self._patch_status(apt_id, 'CANCELLED')

        self.assertEqual(response.status_code, 200, response.data)
        appointment = Appointment.objects.get(apt_id=apt_id)
        self.assertEqual(appointment.apt_cancellation_reason, 'Cancelled by clinic')
        self.assertEqual(
            appointment.apt_request_status, AppointmentRequestStatus.RESOLVED,
        )
        self.assertEqual(appointment.apt_resolved_by_id, self.receptionist_user.usr_id)
        self.assertIsNotNone(appointment.apt_resolved_at)

    def test_receptionist_cancel_keeps_supplied_reason_and_resolves(self):
        apt_id, _ = self._make_confirmed_with_request(
            action='request-reschedule', reason='Conflict',
        )

        response = self._patch_status(
            apt_id, 'CANCELLED', cancellation_reason='Owner asked to move',
        )

        self.assertEqual(response.status_code, 200, response.data)
        appointment = Appointment.objects.get(apt_id=apt_id)
        self.assertEqual(
            appointment.apt_cancellation_reason, 'Owner asked to move',
        )
        self.assertEqual(
            appointment.apt_request_status, AppointmentRequestStatus.RESOLVED,
        )

    def test_cancel_without_request_leaves_request_fields_empty(self):
        apt_id, _ = self._confirmed_appointment()

        response = self._patch_status(
            apt_id, 'CANCELLED', cancellation_reason='Owner asked to move',
        )

        self.assertEqual(response.status_code, 200, response.data)
        appointment = Appointment.objects.get(apt_id=apt_id)
        self.assertIsNone(appointment.apt_request_type)
        self.assertIsNone(appointment.apt_request_status)
        self.assertIsNone(appointment.apt_resolved_by_id)
        self.assertIsNone(appointment.apt_resolved_at)

    def test_default_reason_cancel_notification_stays_owner_safe(self):
        apt_id, _ = self._make_confirmed_with_request(
            action='request-cancel', reason='Vet needs the slot for surgery',
        )

        response = self._patch_status(apt_id, 'CANCELLED')
        self.assertEqual(response.status_code, 200, response.data)

        notifs = self._owner_notifs(
            apt_id, NotificationType.APPOINTMENT_CANCELLED,
        )
        self.assertTrue(notifs.exists())
        body = notifs.first().ntf_message
        self.assertNotIn('surgery', body)
        self.assertNotIn('vet request', body.lower())
        self.assertIn('Cancelled by clinic', body)


class RescheduleEndpointTests(VetRequestHandlingBase):

    def _reschedule(self, apt_id, slot_id, email=RECEPTIONIST_EMAIL):
        return self.client.post(
            f'/api/appointments/{apt_id}/reschedule/',
            data=json.dumps({'slot_id': str(slot_id)}),
            content_type='application/json',
            **self._auth(email),
        )

    def test_reschedule_moves_appointment_and_frees_old_slot(self):
        apt_id, old_slot_id = self._confirmed_appointment()
        target = self._get_slots()[0]

        response = self._reschedule(apt_id, target['vsl_id'])

        self.assertEqual(response.status_code, 200, response.data)
        appointment = Appointment.objects.get(apt_id=apt_id)
        tz = get_clinic_timezone(self.clinic.cln_id)
        slot = VetSlot.objects.get(vsl_id=target['vsl_id'])
        expected = timezone.make_aware(
            datetime.combine(slot.vsl_date, slot.vsl_start_time), tz,
        )
        self.assertEqual(appointment.apt_scheduled_at, expected)
        self.assertEqual(appointment.apt_status, AppointmentStatus.CONFIRMED)

        old_slot = VetSlot.objects.get(vsl_id=old_slot_id)
        old_slot.refresh_from_db()
        self.assertEqual(old_slot.vsl_status, SlotStatus.AVAILABLE)
        self.assertIsNone(old_slot.vsl_appointment_id)

        slot.refresh_from_db()
        self.assertEqual(slot.vsl_status, SlotStatus.BOOKED)
        self.assertEqual(slot.vsl_appointment_id, appointment.apt_id)

    def test_reschedule_without_request_sends_generic_owner_message(self):
        apt_id, _ = self._confirmed_appointment()
        target = self._get_slots()[0]

        response = self._reschedule(apt_id, target['vsl_id'])

        self.assertEqual(response.status_code, 200, response.data)
        notifs = self._owner_notifs(apt_id)
        self.assertTrue(notifs.exists())
        body = notifs.first().ntf_message
        self.assertIn('has been rescheduled to', body)
        self.assertNotIn('veterinarian is unavailable', body)

    def test_reschedule_resolving_request_uses_vet_unavailable_message(self):
        apt_id, _ = self._make_confirmed_with_request(
            action='request-reschedule', reason='Vet surgery conflict',
        )
        target = self._get_slots()[0]

        response = self._reschedule(apt_id, target['vsl_id'])

        self.assertEqual(response.status_code, 200, response.data)
        appointment = Appointment.objects.get(apt_id=apt_id)
        self.assertEqual(
            appointment.apt_request_status, AppointmentRequestStatus.RESOLVED,
        )
        self.assertEqual(appointment.apt_resolved_by_id, self.receptionist_user.usr_id)

        notifs = self._owner_notifs(apt_id)
        self.assertTrue(notifs.exists())
        body = notifs.first().ntf_message
        self.assertIn('Your veterinarian is unavailable', body)
        self.assertNotIn('surgery', body)

    def test_reschedule_leaves_open_cancel_request_untouched(self):
        apt_id, _ = self._make_confirmed_with_request(
            action='request-cancel', reason='Vet is unavailable',
        )
        target = self._get_slots()[0]

        response = self._reschedule(apt_id, target['vsl_id'])

        self.assertEqual(response.status_code, 200, response.data)
        appointment = Appointment.objects.get(apt_id=apt_id)
        self.assertEqual(
            appointment.apt_request_status, AppointmentRequestStatus.OPEN,
        )
        notifs = self._owner_notifs(apt_id)
        body = notifs.first().ntf_message
        self.assertIn('has been rescheduled to', body)
        self.assertNotIn('veterinarian is unavailable', body)

    def test_reschedule_to_stale_slot_is_400(self):
        apt_id, _ = self._confirmed_appointment()
        other_apt, _ = self._confirmed_appointment(
            pet=self.other_pet, email=OTHER_OWNER_EMAIL,
        )
        stale = VetSlot.objects.get(vsl_appointment_id=other_apt)

        response = self._reschedule(apt_id, stale.vsl_id)

        self.assertEqual(response.status_code, 400, response.data)
        self.assertEqual(
            response.data['detail'], 'That slot is no longer available.',
        )
        stale.refresh_from_db()
        self.assertEqual(stale.vsl_status, SlotStatus.BOOKED)
        self.assertEqual(str(stale.vsl_appointment_id), str(other_apt))

    def test_reschedule_to_past_slot_is_400(self):
        apt_id, _ = self._confirmed_appointment()
        past = timezone.localdate() - timedelta(days=1)
        slot = VetSlot.objects.create(
            cln_id=self.clinic,
            stf_id=self.vet,
            vsl_date=past,
            vsl_start_time=time(9, 0),
            vsl_end_time=time(9, 30),
            vsl_status=SlotStatus.AVAILABLE,
        )

        response = self._reschedule(apt_id, slot.vsl_id)

        self.assertEqual(response.status_code, 400, response.data)
        self.assertEqual(response.data['detail'], 'This slot is in the past.')

    def test_reschedule_to_other_vets_slot_is_400(self):
        apt_id, _ = self._confirmed_appointment()
        other_vet_user = self._create_user(
            'vet2@example.com', UserRole.VETERINARIAN, 'Otto', 'Other',
        )
        other_vet = StaffProfile.objects.create(
            usr_id=other_vet_user,
            cln_id=self.clinic,
            stf_position=StaffPosition.VETERINARIAN,
        )
        slot = VetSlot.objects.create(
            cln_id=self.clinic,
            stf_id=other_vet,
            vsl_date=self.date,
            vsl_start_time=time(15, 30),
            vsl_end_time=time(16, 0),
            vsl_status=SlotStatus.AVAILABLE,
        )

        response = self._reschedule(apt_id, slot.vsl_id)

        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn(
            "does not belong to this appointment's veterinarian",
            response.data['detail'],
        )

    def test_reschedule_twice_to_same_slot_is_400(self):
        apt_id, _ = self._confirmed_appointment()
        target = self._get_slots()[0]

        first = self._reschedule(apt_id, target['vsl_id'])
        second = self._reschedule(apt_id, target['vsl_id'])

        self.assertEqual(first.status_code, 200, first.data)
        self.assertEqual(second.status_code, 400, second.data)
        self.assertEqual(
            second.data['detail'], 'That slot is no longer available.',
        )

    def test_reschedule_rejects_non_bookable_status(self):
        apt_id, _ = self._confirmed_appointment()
        Appointment.objects.filter(apt_id=apt_id).update(
            apt_status=AppointmentStatus.CHECKED_IN,
        )
        target = self._get_slots()[0]

        response = self._reschedule(apt_id, target['vsl_id'])

        self.assertEqual(response.status_code, 409, response.data)

    def test_reschedule_requires_slot_id(self):
        apt_id, _ = self._confirmed_appointment()

        response = self.client.post(
            f'/api/appointments/{apt_id}/reschedule/',
            data=json.dumps({}),
            content_type='application/json',
            **self._auth(RECEPTIONIST_EMAIL),
        )

        self.assertEqual(response.status_code, 400, response.data)

    def test_reschedule_with_malformed_slot_id_is_400(self):
        apt_id, _ = self._confirmed_appointment()

        response = self._reschedule(apt_id, 'not-a-uuid')

        self.assertEqual(response.status_code, 400, response.data)
        self.assertEqual(
            response.data['detail'], 'That slot is no longer available.',
        )

    def test_reschedule_cross_clinic_is_404(self):
        apt_id, _ = self._confirmed_appointment()
        target = self._get_slots()[0]

        response = self._reschedule(
            apt_id, target['vsl_id'], email=OTHER_DESK_EMAIL,
        )

        self.assertEqual(response.status_code, 404, response.data)

    def test_reschedule_forbidden_for_vet_and_owner(self):
        apt_id, _ = self._confirmed_appointment()
        target = self._get_slots()[0]

        vet_response = self._reschedule(apt_id, target['vsl_id'], email=VET_EMAIL)
        owner_response = self._reschedule(
            apt_id, target['vsl_id'], email=OWNER_EMAIL,
        )

        self.assertEqual(vet_response.status_code, 403)
        self.assertEqual(owner_response.status_code, 403)


class HasRequestFilterTests(VetRequestHandlingBase):

    def test_has_request_filter_returns_only_open_requests(self):
        now = timezone.now()
        open_apt = self._set_request(
            self._direct_appointment(now + timedelta(hours=1)),
            AppointmentRequestType.RESCHEDULE,
            AppointmentRequestStatus.OPEN,
            reason='Open one',
        )
        self._set_request(
            self._direct_appointment(now + timedelta(hours=2)),
            AppointmentRequestType.CANCEL,
            AppointmentRequestStatus.RESOLVED,
            reason='Done one',
        )
        self._direct_appointment(now + timedelta(hours=3))

        response = self.client.get(
            '/api/appointments/',
            {'has_request': '1'},
            **self._auth(RECEPTIONIST_EMAIL),
        )

        self.assertEqual(response.status_code, 200, response.data)
        ids = [r['apt_id'] for r in response.data['results']]
        self.assertEqual(ids, [str(open_apt.apt_id)])

    def test_has_request_filter_combines_with_admin_role_without_leaking(self):
        apt = self._set_request(
            self._direct_appointment(timezone.now() + timedelta(hours=1)),
            AppointmentRequestType.RESCHEDULE,
            AppointmentRequestStatus.OPEN,
            reason='Secret reason',
        )

        response = self.client.get(
            '/api/appointments/',
            {'has_request': 'true'},
            **self._auth(ADMIN_EMAIL),
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(len(response.data['results']), 1)
        self.assertNotIn('Secret reason', self._dump(response.data))
        self.assertNotIn('vet_request', response.data['results'][0])
        self.assertEqual(response.data['results'][0]['apt_id'], str(apt.apt_id))


class DashboardVetRequestGroupTests(VetRequestHandlingBase):

    def _stats(self, email):
        return self.client.get('/api/dashboard/stats/', **self._auth(email))

    def test_receptionist_stats_include_sorted_truncated_group(self):
        now = timezone.now()
        soon = now + timedelta(hours=1)
        later = now + timedelta(hours=3)
        cancelled = now + timedelta(hours=2)
        long_reason = 'R' * 150

        first = self._set_request(
            self._direct_appointment(soon),
            AppointmentRequestType.RESCHEDULE,
            AppointmentRequestStatus.OPEN,
            reason=long_reason,
        )
        self._set_request(
            self._direct_appointment(later),
            AppointmentRequestType.CANCEL,
            AppointmentRequestStatus.OPEN,
            reason='Second request',
        )
        self._set_request(
            self._direct_appointment(
                cancelled, status=AppointmentStatus.CANCELLED,
            ),
            AppointmentRequestType.CANCEL,
            AppointmentRequestStatus.OPEN,
            reason='Cancelled row',
        )
        self._set_request(
            self._direct_appointment(now + timedelta(hours=4)),
            AppointmentRequestType.CANCEL,
            AppointmentRequestStatus.RESOLVED,
            reason='Resolved row',
        )

        response = self._stats(RECEPTIONIST_EMAIL)

        self.assertEqual(response.status_code, 200, response.data)
        group = response.data['vet_requests']
        self.assertEqual(len(group), 2)
        self.assertEqual(group[0]['apt_id'], str(first.apt_id))
        self.assertEqual(group[0]['pet_name'], 'Rex')
        self.assertEqual(group[0]['owner_name'], 'Olivia Owner')
        self.assertEqual(group[0]['request_type'], 'RESCHEDULE')
        self.assertEqual(group[0]['reason'], 'R' * 120)
        self.assertEqual(group[1]['request_type'], 'CANCEL')
        self.assertEqual(group[1]['reason'], 'Second request')

    def test_receptionist_stats_group_empty_without_open_requests(self):
        self._direct_appointment(timezone.now() + timedelta(hours=1))

        response = self._stats(RECEPTIONIST_EMAIL)

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['vet_requests'], [])

    def test_admin_stats_never_include_vet_requests_key(self):
        self._set_request(
            self._direct_appointment(timezone.now() + timedelta(hours=1)),
            AppointmentRequestType.RESCHEDULE,
            AppointmentRequestStatus.OPEN,
            reason='Secret reason',
        )

        response = self._stats(ADMIN_EMAIL)

        self.assertEqual(response.status_code, 200, response.data)
        self.assertNotIn('vet_requests', response.data)
        self.assertNotIn('Secret reason', self._dump(response.data))

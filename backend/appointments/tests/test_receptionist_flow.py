import json

from appointments.models import Appointment, AppointmentStatus, SlotStatus, VetSlot
from appointments.tests.test_owner_booking import OwnerBookingBase, RECEPTIONIST_EMAIL
from clinics.models import Clinic
from notifications.models import NotificationType
from users.models import StaffPosition, StaffProfile, UserRole

OTHER_DESK_EMAIL = 'other-desk@example.com'


class ReceptionistAppointmentFlowTests(OwnerBookingBase):

    def _other_clinic_receptionist(self):
        other_clinic = Clinic.objects.create(cln_name='Other Clinic')
        user = self._create_user(
            OTHER_DESK_EMAIL, UserRole.RECEPTIONIST, 'Dana', 'Desk',
        )
        StaffProfile.objects.create(
            usr_id=user,
            cln_id=other_clinic,
            stf_position=StaffPosition.RECEPTIONIST,
        )
        return user

    def _receptionist_create(self, slot_id):
        return self.client.post(
            '/api/appointments/',
            {
                'pet_id': str(self.pet.pet_id),
                'slot_id': str(slot_id),
                'apt_type': 'CONSULTATION',
                'reason': 'Desk booking',
            },
            format='json',
            **self._auth(RECEPTIONIST_EMAIL),
        )

    def _patch_status(self, apt_id, status, email=RECEPTIONIST_EMAIL, **extra):
        payload = {'apt_status': status, **extra}
        return self.client.patch(
            f'/api/appointments/{apt_id}/',
            data=json.dumps(payload),
            content_type='application/json',
            **self._auth(email),
        )

    def test_desk_booking_is_created_confirmed(self):
        slot = self._get_slots()[0]

        response = self._receptionist_create(slot['vsl_id'])

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['apt_status'], AppointmentStatus.CONFIRMED)

        db_slot = VetSlot.objects.get(vsl_id=slot['vsl_id'])
        self.assertEqual(db_slot.vsl_status, SlotStatus.BOOKED)
        self.assertEqual(str(db_slot.vsl_appointment_id), response.data['apt_id'])

    def test_desk_booking_notifies_owner_as_confirmed(self):
        slot = self._get_slots()[0]

        response = self._receptionist_create(slot['vsl_id'])

        self.assertEqual(response.status_code, 201, response.data)
        self.assertTrue(
            self._notifications(
                self.owner_user, NotificationType.APPOINTMENT_CONFIRMED,
            ).exists(),
        )
        self.assertFalse(
            self._notifications(
                self.owner_user, NotificationType.APPOINTMENT_CREATED,
            ).exists(),
        )

    def test_owner_booking_still_starts_pending(self):
        slot = self._get_slots()[0]

        response = self._book(slot_id=slot['vsl_id'])

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['apt_status'], AppointmentStatus.PENDING)

    def test_receptionist_check_in_records_timestamp(self):
        created = self._book()
        apt_id = created.data['apt_id']

        confirmed = self._patch_status(apt_id, 'CONFIRMED')
        self.assertEqual(confirmed.status_code, 200, confirmed.data)

        checked_in = self._patch_status(apt_id, 'CHECKED_IN')
        self.assertEqual(checked_in.status_code, 200, checked_in.data)
        self.assertEqual(checked_in.data['apt_status'], 'CHECKED_IN')
        self.assertIsNotNone(checked_in.data['apt_checked_in_at'])

        appointment = Appointment.objects.get(apt_id=apt_id)
        self.assertEqual(appointment.apt_status, AppointmentStatus.CHECKED_IN)
        self.assertIsNotNone(appointment.apt_checked_in_at)

    def test_same_clinic_receptionist_can_read_detail(self):
        created = self._book()

        response = self.client.get(
            f"/api/appointments/{created.data['apt_id']}/",
            **self._auth(RECEPTIONIST_EMAIL),
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['apt_id'], created.data['apt_id'])

    def test_other_clinic_receptionist_cannot_read_detail(self):
        created = self._book()
        self._other_clinic_receptionist()

        response = self.client.get(
            f"/api/appointments/{created.data['apt_id']}/",
            **self._auth(OTHER_DESK_EMAIL),
        )

        self.assertEqual(response.status_code, 404)

    def test_other_clinic_receptionist_cannot_change_status(self):
        created = self._book()
        apt_id = created.data['apt_id']
        self._other_clinic_receptionist()

        response = self._patch_status(apt_id, 'CANCELLED', email=OTHER_DESK_EMAIL)

        self.assertEqual(response.status_code, 404)
        appointment = Appointment.objects.get(apt_id=apt_id)
        self.assertEqual(appointment.apt_status, AppointmentStatus.PENDING)

import json
import uuid
from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

from django.test import TestCase
from django.utils import timezone

from appointments.models import Appointment, AppointmentStatus, SlotStatus, VetSlot
from clinics.models import Clinic, ClinicOperatingHours, ClinicSettings
from notifications.models import Notification, NotificationType
from owners.models import OwnerProfile
from pets.models import Breed, Pet, Sex
from users.models import StaffPosition, StaffProfile, User, UserRole

DAY_CODES = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
PASSWORD = 'TestPass123!'
OWNER_EMAIL = 'owner@example.com'
OTHER_OWNER_EMAIL = 'other@example.com'
VET_EMAIL = 'vet@example.com'
RECEPTIONIST_EMAIL = 'desk@example.com'


class OwnerBookingBase(TestCase):

    def setUp(self):
        self.date = timezone.localdate() + timedelta(days=1)
        day_code = DAY_CODES[self.date.weekday()]

        self.clinic = Clinic.objects.create(cln_name='Happy Paws Clinic')
        ClinicOperatingHours.objects.create(
            cln_id=self.clinic,
            day_of_week=day_code,
            day_index=self.date.weekday() + 1,
            opening_time=time(9, 0),
            closing_time=time(17, 0),
            is_closed=False,
        )
        ClinicSettings.objects.create(
            cln_id=self.clinic,
            cls_appointment_duration=30,
        )

        self.vet_user = self._create_user(
            VET_EMAIL, UserRole.VETERINARIAN, 'Vera', 'Vet',
        )
        self.vet = StaffProfile.objects.create(
            usr_id=self.vet_user,
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

        self.owner_user = self._create_user(
            OWNER_EMAIL, UserRole.OWNER, 'Olivia', 'Owner',
        )
        self.owner = OwnerProfile.objects.create(usr_id=self.owner_user)
        self.breed = Breed.objects.create(brd_name='Labrador')
        self.pet = Pet.objects.create(
            own_id=self.owner,
            brd_id=self.breed,
            pet_name='Rex',
            pet_sex=Sex.MALE,
        )

        self.other_user = self._create_user(
            OTHER_OWNER_EMAIL, UserRole.OWNER, 'Otto', 'Other',
        )
        self.other_owner = OwnerProfile.objects.create(usr_id=self.other_user)
        self.other_pet = Pet.objects.create(
            own_id=self.other_owner,
            pet_name='Milo',
            pet_sex=Sex.MALE,
        )

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

    def _get_slots(self, email=OWNER_EMAIL):
        response = self.client.get(
            '/api/owner/slots/',
            {'vet_id': str(self.vet.stf_id), 'date': self.date.isoformat()},
            **self._auth(email),
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertTrue(response.data)
        return response.data

    def _create_screening(self, pet=None, email=OWNER_EMAIL):
        response = self.client.post(
            '/api/owner/screenings/',
            {
                'pet_id': str((pet or self.pet).pet_id),
                'source': 'DEVICE',
                'prediction': 'MANGE',
                'confidence': 88.5,
                'model_version': 'test-1.0.0',
            },
            format='json',
            **self._auth(email),
        )
        self.assertEqual(response.status_code, 201, response.data)
        return response.data

    def _book(self, pet=None, slot_id=None, email=OWNER_EMAIL, screening_id=None):
        pet = pet or self.pet
        slot_id = slot_id or self._get_slots(email)[0]['vsl_id']
        if screening_id is None:
            screening_id = self._create_screening(pet=pet, email=email)['ais_id']
        return self.client.post(
            '/api/owner/appointments/',
            {
                'pet_id': str(pet.pet_id),
                'slot_id': str(slot_id),
                'apt_type': 'CONSULTATION',
                'reason': 'Checkup',
                'screening_id': str(screening_id),
            },
            format='json',
            **self._auth(email),
        )

    def _notifications(self, user, ntf_type):
        return Notification.objects.filter(
            usr_id_id=user.usr_id, ntf_type=ntf_type,
        )


class OwnerDiscoveryTests(OwnerBookingBase):

    def test_clinic_list_includes_booking_enabled_clinic(self):
        response = self.client.get('/api/owner/clinics/', **self._auth(OWNER_EMAIL))
        self.assertEqual(response.status_code, 200)
        names = [c['cln_name'] for c in response.data]
        self.assertIn('Happy Paws Clinic', names)

    def test_clinic_list_excludes_booking_disabled_clinic(self):
        disabled = Clinic.objects.create(cln_name='No Booking Clinic')
        ClinicSettings.objects.create(
            cln_id=disabled, cls_allow_owner_booking=False,
        )

        response = self.client.get('/api/owner/clinics/', **self._auth(OWNER_EMAIL))
        self.assertEqual(response.status_code, 200)
        names = [c['cln_name'] for c in response.data]
        self.assertNotIn('No Booking Clinic', names)

    def test_clinic_list_includes_clinic_without_settings(self):
        Clinic.objects.create(cln_name='Fresh Clinic')

        response = self.client.get('/api/owner/clinics/', **self._auth(OWNER_EMAIL))
        self.assertEqual(response.status_code, 200)
        names = [c['cln_name'] for c in response.data]
        self.assertIn('Fresh Clinic', names)

    def test_vet_list_returns_vet_with_free_slots(self):
        response = self.client.get(
            '/api/owner/vets/',
            {'clinic_id': str(self.clinic.cln_id), 'date': self.date.isoformat()},
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['stf_id'], str(self.vet.stf_id))
        self.assertGreater(response.data[0]['available_count'], 0)

    def test_vet_list_forbidden_when_owner_booking_disabled(self):
        ClinicSettings.objects.filter(cln_id=self.clinic).update(
            cls_allow_owner_booking=False,
        )

        response = self.client.get(
            '/api/owner/vets/',
            {'clinic_id': str(self.clinic.cln_id), 'date': self.date.isoformat()},
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 403)

    def test_slots_list_returns_available_slots(self):
        slots = self._get_slots()
        self.assertTrue(all(s['vsl_appointment'] is None for s in slots))

    def test_receptionist_cannot_use_owner_endpoints(self):
        response = self.client.get('/api/owner/appointments/', **self._auth(RECEPTIONIST_EMAIL))
        self.assertEqual(response.status_code, 403)


class OwnerBookingTests(OwnerBookingBase):

    def test_book_creates_pending_appointment_and_holds_slot(self):
        slot = self._get_slots()[0]

        response = self._book(slot_id=slot['vsl_id'])
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['apt_status'], AppointmentStatus.PENDING)

        db_slot = VetSlot.objects.get(vsl_id=slot['vsl_id'])
        self.assertEqual(db_slot.vsl_status, SlotStatus.BOOKED)
        self.assertEqual(str(db_slot.vsl_appointment_id), response.data['apt_id'])

    def test_booked_appointment_scheduled_at_is_manila_aware(self):
        slot = self._get_slots()[0]

        response = self._book(slot_id=slot['vsl_id'])
        self.assertEqual(response.status_code, 201, response.data)

        appointment = Appointment.objects.get(apt_id=response.data['apt_id'])
        db_slot = VetSlot.objects.get(vsl_id=slot['vsl_id'])
        expected = timezone.make_aware(
            datetime.combine(db_slot.vsl_date, db_slot.vsl_start_time),
            ZoneInfo('Asia/Manila'),
        )
        self.assertEqual(appointment.apt_scheduled_at, expected)

    def test_book_creates_appointment_created_notification(self):
        response = self._book()
        self.assertEqual(response.status_code, 201, response.data)
        self.assertTrue(
            self._notifications(
                self.owner_user, NotificationType.APPOINTMENT_CREATED,
            ).exists(),
        )

    def test_double_booking_same_slot_conflicts(self):
        slot = self._get_slots()[0]

        first = self._book(slot_id=slot['vsl_id'])
        self.assertEqual(first.status_code, 201, first.data)

        second = self._book(
            slot_id=slot['vsl_id'], pet=self.other_pet, email=OTHER_OWNER_EMAIL,
        )
        self.assertEqual(second.status_code, 409)

    def test_booking_with_other_owners_pet_returns_404(self):
        slot = self._get_slots()[0]
        response = self._book(
            slot_id=slot['vsl_id'],
            pet=self.other_pet,
            screening_id=uuid.uuid4(),
        )
        self.assertEqual(response.status_code, 404)

    def test_booking_without_screening_returns_403(self):
        slot = self._get_slots()[0]
        self._create_screening()

        response = self.client.post(
            '/api/owner/appointments/',
            {
                'pet_id': str(self.pet.pet_id),
                'slot_id': str(slot['vsl_id']),
                'apt_type': 'CONSULTATION',
                'reason': 'Checkup',
            },
            format='json',
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 403)
        self.assertIn('skin scan result', response.data['detail'])

    def test_booking_with_screening_of_other_pet_returns_403(self):
        slot = self._get_slots()[0]
        foreign_screening = self._create_screening(
            pet=self.other_pet, email=OTHER_OWNER_EMAIL,
        )

        response = self.client.post(
            '/api/owner/appointments/',
            {
                'pet_id': str(self.pet.pet_id),
                'slot_id': str(slot['vsl_id']),
                'apt_type': 'CONSULTATION',
                'reason': 'Checkup',
                'screening_id': str(foreign_screening['ais_id']),
            },
            format='json',
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 403)

    def test_booked_appointment_contains_screening(self):
        screening = self._create_screening()

        created = self._book(screening_id=screening['ais_id'])
        self.assertEqual(created.status_code, 201, created.data)
        self.assertEqual(created.data['screening']['ais_id'], screening['ais_id'])

        detail = self.client.get(
            f"/api/owner/appointments/{created.data['apt_id']}/",
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.data['screening']['ais_id'], screening['ais_id'])
        self.assertTrue(detail.data['screening']['disease'])

    def test_appointment_list_scoped_to_own_pets(self):
        self._book()
        self._book(pet=self.other_pet, email=OTHER_OWNER_EMAIL)

        response = self.client.get('/api/owner/appointments/', **self._auth(OWNER_EMAIL))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['total'], 1)
        pet_names = [r['pet_name'] for r in response.data['results']]
        self.assertEqual(pet_names, ['Rex'])

    def test_detail_of_other_owners_appointment_returns_404(self):
        created = self._book()
        apt_id = created.data['apt_id']

        response = self.client.get(
            f'/api/owner/appointments/{apt_id}/',
            **self._auth(OTHER_OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 404)


class OwnerCancelTests(OwnerBookingBase):

    def test_cancel_pending_releases_slot_and_notifies(self):
        created = self._book()
        apt_id = created.data['apt_id']
        slot = VetSlot.objects.get(vsl_appointment_id=apt_id)

        response = self.client.post(
            f'/api/owner/appointments/{apt_id}/cancel/',
            {'reason': 'Plans changed'},
            format='json',
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['apt_status'], AppointmentStatus.CANCELLED)

        slot.refresh_from_db()
        self.assertEqual(slot.vsl_status, SlotStatus.AVAILABLE)
        self.assertIsNone(slot.vsl_appointment_id)

        self.assertTrue(
            self._notifications(
                self.owner_user, NotificationType.APPOINTMENT_CANCELLED,
            ).exists(),
        )

    def test_owner_cannot_cancel_after_check_in(self):
        created = self._book()
        Appointment.objects.filter(apt_id=created.data['apt_id']).update(
            apt_status=AppointmentStatus.CHECKED_IN,
        )

        response = self.client.post(
            f'/api/owner/appointments/{created.data["apt_id"]}/cancel/',
            {},
            format='json',
            **self._auth(OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 400)

    def test_cancel_other_owners_appointment_returns_404(self):
        created = self._book()
        response = self.client.post(
            f'/api/owner/appointments/{created.data["apt_id"]}/cancel/',
            {},
            format='json',
            **self._auth(OTHER_OWNER_EMAIL),
        )
        self.assertEqual(response.status_code, 404)


class ReceptionistTransitionTests(OwnerBookingBase):

    def test_confirm_pending_sends_notification(self):
        created = self._book()
        apt_id = created.data['apt_id']

        response = self.client.patch(
            f'/api/appointments/{apt_id}/',
            data=json.dumps({'apt_status': 'CONFIRMED'}),
            content_type='application/json',
            **self._auth(RECEPTIONIST_EMAIL),
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['apt_status'], 'CONFIRMED')
        self.assertTrue(
            self._notifications(
                self.owner_user, NotificationType.APPOINTMENT_CONFIRMED,
            ).exists(),
        )

    def test_invalid_transition_rejected(self):
        created = self._book()

        response = self.client.patch(
            f'/api/appointments/{created.data["apt_id"]}/',
            data=json.dumps({'apt_status': 'CHECKED_IN'}),
            content_type='application/json',
            **self._auth(RECEPTIONIST_EMAIL),
        )
        self.assertEqual(response.status_code, 400)

    def test_receptionist_cancel_releases_slot(self):
        created = self._book()
        apt_id = created.data['apt_id']
        slot = VetSlot.objects.get(vsl_appointment_id=apt_id)

        response = self.client.patch(
            f'/api/appointments/{apt_id}/',
            data=json.dumps({
                'apt_status': 'CANCELLED',
                'cancellation_reason': 'Clinic closed',
            }),
            content_type='application/json',
            **self._auth(RECEPTIONIST_EMAIL),
        )
        self.assertEqual(response.status_code, 200, response.data)

        slot.refresh_from_db()
        self.assertEqual(slot.vsl_status, SlotStatus.AVAILABLE)
        self.assertIsNone(slot.vsl_appointment_id)

    def test_owner_cannot_use_receptionist_endpoints(self):
        response = self.client.get('/api/appointments/', **self._auth(OWNER_EMAIL))
        self.assertEqual(response.status_code, 403)

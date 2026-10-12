import json
from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

from appointments.models import (
    Appointment, AppointmentStatus, AppointmentType, SlotStatus, VetSlot,
)
from appointments.services import AppointmentService, DashboardService
from appointments.tasks import close_past_due_appointments
from appointments.tests.test_owner_booking import OwnerBookingBase, OWNER_EMAIL, RECEPTIONIST_EMAIL
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
        self.assertEqual(response.data['owner_email'], OWNER_EMAIL)

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

    def test_dashboard_today_uses_manila_day_range(self):
        mnl = ZoneInfo('Asia/Manila')
        today = datetime.now(mnl).date()

        evening = Appointment.objects.create(
            pet_id=self.pet,
            cln_id=self.clinic,
            stf_id=self.vet,
            apt_type=AppointmentType.CONSULTATION,
            apt_status=AppointmentStatus.CONFIRMED,
            apt_scheduled_at=datetime.combine(today, time(16, 30), tzinfo=mnl),
        )
        Appointment.objects.create(
            pet_id=self.pet,
            cln_id=self.clinic,
            stf_id=self.vet,
            apt_type=AppointmentType.CONSULTATION,
            apt_status=AppointmentStatus.PENDING,
            apt_scheduled_at=datetime.combine(
                today - timedelta(days=1), time(10, 0), tzinfo=mnl,
            ),
        )

        stats = DashboardService.get_stats(clinic_id=self.clinic.cln_id)
        self.assertEqual(stats['today']['total'], 1)
        self.assertEqual(stats['today']['confirmed'], 1)

        today_ids = set(
            AppointmentService.get_today_appointments(
                self.clinic.cln_id,
            ).values_list('apt_id', flat=True),
        )
        self.assertEqual(today_ids, {evening.apt_id})


class PastDueAppointmentTests(OwnerBookingBase):

    def _apt(self, status, scheduled_at):
        return Appointment.objects.create(
            pet_id=self.pet,
            cln_id=self.clinic,
            stf_id=self.vet,
            apt_type=AppointmentType.CONSULTATION,
            apt_status=status,
            apt_scheduled_at=scheduled_at,
        )

    def _patch(self, apt_id, status):
        return self.client.patch(
            f'/api/appointments/{apt_id}/',
            data=json.dumps({'apt_status': status}),
            content_type='application/json',
            **self._auth(RECEPTIONIST_EMAIL),
        )

    def test_confirm_past_appointment_returns_400(self):
        mnl = ZoneInfo('Asia/Manila')
        apt = self._apt(
            AppointmentStatus.PENDING, datetime.now(mnl) - timedelta(hours=2),
        )

        response = self._patch(apt.apt_id, 'CONFIRMED')

        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn('already passed', response.data['detail'])
        apt.refresh_from_db()
        self.assertEqual(apt.apt_status, AppointmentStatus.PENDING)

    def test_confirm_future_appointment_returns_200(self):
        mnl = ZoneInfo('Asia/Manila')
        apt = self._apt(
            AppointmentStatus.PENDING, datetime.now(mnl) + timedelta(days=1),
        )

        response = self._patch(apt.apt_id, 'CONFIRMED')

        self.assertEqual(response.status_code, 200, response.data)
        apt.refresh_from_db()
        self.assertEqual(apt.apt_status, AppointmentStatus.CONFIRMED)

    def test_no_show_past_returns_200(self):
        mnl = ZoneInfo('Asia/Manila')
        apt = self._apt(
            AppointmentStatus.CONFIRMED,
            datetime.now(mnl) - timedelta(hours=2),
        )

        response = self._patch(apt.apt_id, 'NO_SHOW')

        self.assertEqual(response.status_code, 200, response.data)
        apt.refresh_from_db()
        self.assertEqual(apt.apt_status, AppointmentStatus.NO_SHOW)

    def test_no_show_future_returns_400(self):
        mnl = ZoneInfo('Asia/Manila')
        apt = self._apt(
            AppointmentStatus.CONFIRMED,
            datetime.now(mnl) + timedelta(days=1),
        )

        response = self._patch(apt.apt_id, 'NO_SHOW')

        self.assertEqual(response.status_code, 400, response.data)
        self.assertIn('before its scheduled time', response.data['detail'])
        apt.refresh_from_db()
        self.assertEqual(apt.apt_status, AppointmentStatus.CONFIRMED)

    def test_auto_close_job_handles_past_due_appointments(self):
        mnl = ZoneInfo('Asia/Manila')
        now = datetime.now(mnl)
        # 06:00 PHT is 22:00 UTC the previous day — early-morning boundary.
        yesterday_six_am = datetime.combine(
            (now - timedelta(days=1)).date(), time(6, 0), tzinfo=mnl,
        )

        past_pending = self._apt(AppointmentStatus.PENDING, yesterday_six_am)
        past_confirmed = self._apt(AppointmentStatus.CONFIRMED, yesterday_six_am)
        within_grace = self._apt(
            AppointmentStatus.CONFIRMED, now - timedelta(minutes=30),
        )
        past_checked_in = self._apt(
            AppointmentStatus.CHECKED_IN, yesterday_six_am,
        )
        past_completed = self._apt(
            AppointmentStatus.COMPLETED, yesterday_six_am,
        )
        past_cancelled = self._apt(
            AppointmentStatus.CANCELLED, yesterday_six_am,
        )
        past_no_show = self._apt(AppointmentStatus.NO_SHOW, yesterday_six_am)

        summary = close_past_due_appointments()

        self.assertEqual(summary, {'cancelled': 1, 'no_show': 1})
        past_pending.refresh_from_db()
        self.assertEqual(past_pending.apt_status, AppointmentStatus.CANCELLED)
        self.assertEqual(
            past_pending.apt_cancellation_reason, 'Not confirmed in time',
        )
        self.assertIsNotNone(past_pending.apt_cancelled_at)
        past_confirmed.refresh_from_db()
        self.assertEqual(past_confirmed.apt_status, AppointmentStatus.NO_SHOW)
        within_grace.refresh_from_db()
        self.assertEqual(within_grace.apt_status, AppointmentStatus.CONFIRMED)
        past_checked_in.refresh_from_db()
        self.assertEqual(past_checked_in.apt_status, AppointmentStatus.CHECKED_IN)
        past_completed.refresh_from_db()
        self.assertEqual(past_completed.apt_status, AppointmentStatus.COMPLETED)
        past_cancelled.refresh_from_db()
        self.assertEqual(past_cancelled.apt_status, AppointmentStatus.CANCELLED)
        past_no_show.refresh_from_db()
        self.assertEqual(past_no_show.apt_status, AppointmentStatus.NO_SHOW)

    def test_auto_close_job_is_idempotent(self):
        mnl = ZoneInfo('Asia/Manila')
        now = datetime.now(mnl)
        self._apt(AppointmentStatus.PENDING, now - timedelta(hours=3))
        self._apt(AppointmentStatus.CONFIRMED, now - timedelta(hours=3))

        close_past_due_appointments()

        first_run = {
            apt.apt_id: (apt.apt_status, apt.apt_updated_at)
            for apt in Appointment.objects.all()
        }

        second_summary = close_past_due_appointments()

        self.assertEqual(second_summary, {'cancelled': 0, 'no_show': 0})
        second_run = {
            apt.apt_id: (apt.apt_status, apt.apt_updated_at)
            for apt in Appointment.objects.all()
        }
        self.assertEqual(first_run, second_run)

    def test_dashboard_stats_exclude_past_due_pending(self):
        mnl = ZoneInfo('Asia/Manila')
        self._apt(
            AppointmentStatus.PENDING, datetime.now(mnl) - timedelta(minutes=15),
        )

        stats = DashboardService.get_stats(clinic_id=self.clinic.cln_id)

        self.assertEqual(stats['today']['pending'], 0)
        self.assertEqual(stats['needs_attention'], 1)

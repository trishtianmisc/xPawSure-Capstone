import json
from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

from appointments.models import (
    Appointment, AppointmentStatus, AppointmentType, SlotStatus, VetSlot,
)
from appointments.services import (
    AppointmentService, DashboardService, VetSlotService,
)
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

        # The fixture books tomorrow; move the appointment onto today so
        # the appointment-date check-in gate allows the transition.
        mnl = ZoneInfo('Asia/Manila')
        today_nine = datetime.combine(
            datetime.now(mnl).date(), time(9, 0), tzinfo=mnl,
        )
        Appointment.objects.filter(apt_id=apt_id).update(
            apt_scheduled_at=today_nine,
        )

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
        now = datetime.now(mnl)
        today = now.date()

        # Stay eligible under the read-time past-due reconcile: schedule in
        # the future while the Manila day has room, otherwise inside the
        # 60-minute no-show grace window, so CONFIRMED stays CONFIRMED
        # whenever this test runs.
        scheduled = now + timedelta(minutes=75)
        if scheduled.date() != today:
            scheduled = now - timedelta(minutes=30)

        today_appointment = Appointment.objects.create(
            pet_id=self.pet,
            cln_id=self.clinic,
            stf_id=self.vet,
            apt_type=AppointmentType.CONSULTATION,
            apt_status=AppointmentStatus.CONFIRMED,
            apt_scheduled_at=scheduled,
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
        self.assertEqual(today_ids, {today_appointment.apt_id})


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

    def test_check_in_before_appointment_date_returns_400(self):
        mnl = ZoneInfo('Asia/Manila')
        apt = self._apt(
            AppointmentStatus.CONFIRMED,
            datetime.now(mnl) + timedelta(days=1),
        )

        response = self._patch(apt.apt_id, 'CHECKED_IN')

        self.assertEqual(response.status_code, 400, response.data)
        self.assertEqual(
            response.data['detail'],
            'Cannot check in before the appointment date.',
        )
        apt.refresh_from_db()
        self.assertEqual(apt.apt_status, AppointmentStatus.CONFIRMED)
        self.assertIsNone(apt.apt_checked_in_at)

    def test_check_in_on_appointment_date_returns_200(self):
        mnl = ZoneInfo('Asia/Manila')
        # Same clinic day, later than the current time: the gate is the
        # date, not the time of day.
        apt = self._apt(
            AppointmentStatus.CONFIRMED,
            datetime.now(mnl).replace(hour=23, minute=59, second=0, microsecond=0),
        )

        response = self._patch(apt.apt_id, 'CHECKED_IN')

        self.assertEqual(response.status_code, 200, response.data)
        apt.refresh_from_db()
        self.assertEqual(apt.apt_status, AppointmentStatus.CHECKED_IN)
        self.assertIsNotNone(apt.apt_checked_in_at)

    def test_close_past_due_handles_past_due_appointments(self):
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

        summary = AppointmentService.close_past_due()

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

    def test_close_past_due_is_idempotent(self):
        mnl = ZoneInfo('Asia/Manila')
        now = datetime.now(mnl)
        self._apt(AppointmentStatus.PENDING, now - timedelta(hours=3))
        self._apt(AppointmentStatus.CONFIRMED, now - timedelta(hours=3))

        AppointmentService.close_past_due()

        first_run = {
            apt.apt_id: (apt.apt_status, apt.apt_updated_at)
            for apt in Appointment.objects.all()
        }

        second_summary = AppointmentService.close_past_due()

        self.assertEqual(second_summary, {'cancelled': 0, 'no_show': 0})
        second_run = {
            apt.apt_id: (apt.apt_status, apt.apt_updated_at)
            for apt in Appointment.objects.all()
        }
        self.assertEqual(first_run, second_run)

    def test_dashboard_stats_refresh_past_due_statuses_on_read(self):
        # Overdue statuses are refreshed on reads: the past-due PENDING is
        # closed by the reconcile that runs at the start of get_stats().
        mnl = ZoneInfo('Asia/Manila')
        past_pending = self._apt(
            AppointmentStatus.PENDING, datetime.now(mnl) - timedelta(minutes=15),
        )

        stats = DashboardService.get_stats(clinic_id=self.clinic.cln_id)

        self.assertEqual(stats['today']['pending'], 0)
        self.assertEqual(stats['needs_attention'], 0)
        past_pending.refresh_from_db()
        self.assertEqual(past_pending.apt_status, AppointmentStatus.CANCELLED)
        self.assertEqual(
            past_pending.apt_cancellation_reason, 'Not confirmed in time',
        )

    def test_dashboard_needs_attention_keeps_late_confirmed_within_grace(self):
        # A confirmed appointment that is late but still inside the grace
        # window stays actionable and must surface in needs_attention.
        mnl = ZoneInfo('Asia/Manila')
        late_confirmed = self._apt(
            AppointmentStatus.CONFIRMED, datetime.now(mnl) - timedelta(minutes=10),
        )

        stats = DashboardService.get_stats(clinic_id=self.clinic.cln_id)

        self.assertEqual(stats['needs_attention'], 1)
        late_confirmed.refresh_from_db()
        self.assertEqual(late_confirmed.apt_status, AppointmentStatus.CONFIRMED)


class VetScheduleRegressionTests(OwnerBookingBase):

    def test_vet_list_without_date_returns_200(self):
        response = self.client.get(
            '/api/schedule/vet-list/', **self._auth(RECEPTIONIST_EMAIL),
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(len(response.data['vets']), 1)
        self.assertEqual(response.data['vets'][0]['stf_id'], str(self.vet.stf_id))

    def test_get_vet_list_summary_defaults_to_today(self):
        summary = VetSlotService.get_vet_list_summary(
            clinic_id=self.clinic.cln_id,
        )

        vet_ids = [vet['stf_id'] for vet in summary['vets']]
        self.assertIn(str(self.vet.stf_id), vet_ids)


class ScheduleGridApiTests(OwnerBookingBase):
    """Stage-1 schedule grid contract: honest generate results, block-remaining
    that never touches passed slots, and the clinic-clock is_past flag."""

    def _slot(self, date, start_time):
        return VetSlot.objects.create(
            cln_id=self.clinic,
            stf_id=self.vet,
            vsl_date=date,
            vsl_start_time=start_time,
            vsl_end_time=(
                datetime.combine(date, start_time) + timedelta(minutes=30)
            ).time(),
        )

    def _schedule(self, day):
        response = self.client.get(
            '/api/schedule/',
            {
                'start_date': day.isoformat(),
                'end_date': day.isoformat(),
                'vet_id': str(self.vet.stf_id),
            },
            **self._auth(RECEPTIONIST_EMAIL),
        )
        self.assertEqual(response.status_code, 200, response.data)
        return response.data

    def _generate(self, start, end):
        response = self.client.post(
            '/api/generate-slots/',
            {
                'start_date': start.isoformat(),
                'end_date': end.isoformat(),
                'vet_id': str(self.vet.stf_id),
            },
            format='json',
            **self._auth(RECEPTIONIST_EMAIL),
        )
        self.assertEqual(response.status_code, 200, response.data)
        return response.data

    def _block_remaining(self, day):
        response = self.client.post(
            f'/api/schedule/vets/{self.vet.stf_id}/block-remaining/'
            f'?date={day.isoformat()}',
            **self._auth(RECEPTIONIST_EMAIL),
        )
        self.assertEqual(response.status_code, 200, response.data)
        return response.data

    def test_generate_reports_created_existing_and_closed_days(self):
        start = self.date                      # has the seeded operating hours
        closed_1 = start + timedelta(days=1)   # other weekdays, no hours rows
        closed_2 = start + timedelta(days=2)

        first = self._generate(start, closed_2)

        # 9:00-17:00 at a 30-minute duration is 16 slots on the open day; the
        # closed days are named instead of being reported as a silent zero.
        self.assertEqual(first['slots_created'], 16)
        self.assertEqual(first['already_existed'], 0)
        self.assertEqual(first['skipped_dates'], [
            {'date': closed_1.isoformat(), 'reason': 'clinic_closed'},
            {'date': closed_2.isoformat(), 'reason': 'clinic_closed'},
        ])

        second = self._generate(start, closed_2)

        self.assertEqual(second['slots_created'], 0)
        self.assertEqual(second['already_existed'], 16)
        self.assertEqual(second['skipped_dates'], first['skipped_dates'])

    def test_block_remaining_skips_booked_and_passed_slots(self):
        manila_today = datetime.now(ZoneInfo('Asia/Manila')).date()
        future_day = manila_today + timedelta(days=1)
        past_day = manila_today - timedelta(days=1)

        open_slot = self._slot(date=future_day, start_time=time(9, 0))
        later_slot = self._slot(date=future_day, start_time=time(14, 0))
        booked_slot = self._slot(date=future_day, start_time=time(15, 0))
        booked_slot.vsl_status = SlotStatus.BOOKED
        booked_slot.save(update_fields=['vsl_status'])
        stale_1 = self._slot(date=past_day, start_time=time(9, 0))
        stale_2 = self._slot(date=past_day, start_time=time(9, 30))

        result = self._block_remaining(future_day)

        self.assertEqual(result, {
            'blocked': 2,
            'skipped_booked': 1,
            'skipped_passed': 0,
        })
        open_slot.refresh_from_db()
        later_slot.refresh_from_db()
        booked_slot.refresh_from_db()
        self.assertEqual(open_slot.vsl_status, SlotStatus.BLOCKED)
        self.assertEqual(later_slot.vsl_status, SlotStatus.BLOCKED)
        self.assertEqual(booked_slot.vsl_status, SlotStatus.BOOKED)

        stale_result = self._block_remaining(past_day)

        self.assertEqual(stale_result, {
            'blocked': 0,
            'skipped_booked': 0,
            'skipped_passed': 2,
        })
        stale_1.refresh_from_db()
        stale_2.refresh_from_db()
        self.assertEqual(stale_1.vsl_status, SlotStatus.AVAILABLE)
        self.assertEqual(stale_2.vsl_status, SlotStatus.AVAILABLE)

    def test_schedule_flags_past_slots_and_exposes_appointment_status(self):
        # Same weekday as the seeded operating-hours row, one week ago: days
        # without hours report an empty slot list, so a past slot only shows
        # up on an open weekday.
        past_day = self.date - timedelta(days=7)
        self._slot(date=past_day, start_time=time(9, 0))
        self._slot(date=self.date, start_time=time(16, 0))

        past_slots = self._schedule(past_day)['vets'][0]['days'][0]['slots']
        self.assertEqual(len(past_slots), 1)
        self.assertTrue(past_slots[0]['is_past'])

        future_slots = self._schedule(self.date)['vets'][0]['days'][0]['slots']
        self.assertEqual(len(future_slots), 1)
        self.assertFalse(future_slots[0]['is_past'])

        # The owner books that remaining slot; the grid badge reads apt_status.
        booking = self._book()
        self.assertIn(booking.status_code, (200, 201), booking.data)
        appointment = Appointment.objects.get()

        booked_slot = self._schedule(self.date)['vets'][0]['days'][0]['slots'][0]
        self.assertEqual(booked_slot['status'], SlotStatus.BOOKED)
        self.assertFalse(booked_slot['is_past'])
        self.assertEqual(
            booked_slot['appointment']['apt_status'],
            appointment.apt_status,
        )

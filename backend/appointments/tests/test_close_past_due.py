"""Past-due reconciliation: clinic isolation and read-path triggers.

There is no scheduler — overdue statuses are refreshed when the dashboard or
the appointment list is read, and the work must stay inside the clinic that
triggered it.
"""

from datetime import datetime, time, timedelta
from unittest.mock import patch
from zoneinfo import ZoneInfo

from appointments.models import Appointment, AppointmentStatus, AppointmentType
from appointments.services import AppointmentService, DashboardService
from appointments.tests.test_owner_booking import OwnerBookingBase
from clinics.models import Clinic

MNL = ZoneInfo('Asia/Manila')


class ClosePastDueClinicIsolationTests(OwnerBookingBase):

    def _apt(self, clinic, status, scheduled_at):
        return Appointment.objects.create(
            pet_id=self.pet,
            cln_id=clinic,
            stf_id=self.vet,
            apt_type=AppointmentType.CONSULTATION,
            apt_status=status,
            apt_scheduled_at=scheduled_at,
        )

    def _other_clinic(self):
        return Clinic.objects.create(cln_name='Other Clinic')

    def test_close_past_due_only_touches_requested_clinic(self):
        past = datetime.now(MNL) - timedelta(hours=3)
        mine = self._apt(self.clinic, AppointmentStatus.PENDING, past)
        theirs = self._apt(self._other_clinic(), AppointmentStatus.PENDING, past)

        summary = AppointmentService.close_past_due(clinic_id=self.clinic.cln_id)

        self.assertEqual(summary, {'cancelled': 1, 'no_show': 0})
        mine.refresh_from_db()
        self.assertEqual(mine.apt_status, AppointmentStatus.CANCELLED)
        theirs.refresh_from_db()
        self.assertEqual(theirs.apt_status, AppointmentStatus.PENDING)

    def test_racing_transition_is_skipped_and_remaining_rows_still_close(self):
        past = datetime.now(MNL) - timedelta(hours=3)
        first = self._apt(self.clinic, AppointmentStatus.PENDING, past)
        second = self._apt(
            self.clinic, AppointmentStatus.PENDING, past - timedelta(minutes=5),
        )

        real_update = AppointmentService.update_status
        calls = {'count': 0}

        def racing_update(apt_id, new_status, user_id, cancellation_reason=None):
            calls['count'] += 1
            if calls['count'] == 1:
                # Simulate a competing reader committing the same transition
                # between the candidate query and this update.
                Appointment.objects.filter(apt_id=apt_id).update(
                    apt_status=AppointmentStatus.CANCELLED,
                    apt_cancellation_reason='Closed by a concurrent reader',
                )
            return real_update(
                apt_id=apt_id,
                new_status=new_status,
                user_id=user_id,
                cancellation_reason=cancellation_reason,
            )

        with patch.object(
            AppointmentService, 'update_status', side_effect=racing_update,
        ):
            summary = AppointmentService.close_past_due(
                clinic_id=self.clinic.cln_id,
            )

        # The conflicting row is skipped (not double-processed) and the run
        # continues with the remaining candidates instead of aborting.
        self.assertEqual(summary, {'cancelled': 1, 'no_show': 0})
        for apt in (first, second):
            apt.refresh_from_db()
            self.assertEqual(apt.apt_status, AppointmentStatus.CANCELLED)

    def test_dashboard_read_reconciles_only_its_clinic(self):
        past = datetime.now(MNL) - timedelta(minutes=15)
        mine = self._apt(self.clinic, AppointmentStatus.PENDING, past)
        theirs = self._apt(self._other_clinic(), AppointmentStatus.PENDING, past)

        stats = DashboardService.get_stats(clinic_id=self.clinic.cln_id)

        mine.refresh_from_db()
        self.assertEqual(mine.apt_status, AppointmentStatus.CANCELLED)
        # The clinic that triggered the read never sees the other clinic's
        # overdue rows, and none remain awaiting action here.
        self.assertEqual(stats['needs_attention'], 0)
        theirs.refresh_from_db()
        self.assertEqual(theirs.apt_status, AppointmentStatus.PENDING)

    def test_list_read_reconciles_only_its_clinic(self):
        past = datetime.now(MNL) - timedelta(hours=3)
        mine = self._apt(self.clinic, AppointmentStatus.CONFIRMED, past)
        theirs = self._apt(self._other_clinic(), AppointmentStatus.CONFIRMED, past)

        data = AppointmentService.list_appointments(
            clinic_id=self.clinic.cln_id, overdue=True,
        )

        mine.refresh_from_db()
        self.assertEqual(mine.apt_status, AppointmentStatus.NO_SHOW)
        # Refreshed on read: the overdue appointment is no longer overdue.
        self.assertEqual(data['total'], 0)
        theirs.refresh_from_db()
        self.assertEqual(theirs.apt_status, AppointmentStatus.CONFIRMED)

    def test_reconcile_failure_never_breaks_the_read(self):
        past = datetime.now(MNL) - timedelta(hours=3)
        self._apt(self.clinic, AppointmentStatus.PENDING, past)

        with patch.object(
            AppointmentService,
            'close_past_due',
            side_effect=RuntimeError('db unavailable'),
        ):
            with self.assertLogs('appointments.services', level='ERROR') as logs:
                stats = DashboardService.get_stats(clinic_id=self.clinic.cln_id)

        self.assertIn('needs_attention', stats)
        self.assertTrue(
            any('reconcile failed' in line for line in logs.output),
            logs.output,
        )

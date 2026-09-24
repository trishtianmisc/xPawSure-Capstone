from django.test import SimpleTestCase
from django.urls import resolve

import appointments.views as appointments_views


class AppointmentViewsImportTests(SimpleTestCase):
    def test_required_views_exist(self):
        self.assertTrue(hasattr(appointments_views, 'AvailableSlotsView'))
        self.assertTrue(hasattr(appointments_views, 'VetListView'))
        self.assertTrue(hasattr(appointments_views, 'ScheduleView'))
        self.assertTrue(hasattr(appointments_views, 'GenerateSlotsView'))

    def test_available_slots_url_resolves(self):
        match = resolve('/api/available-slots/')
        self.assertEqual(match.view_name, 'available-slots')

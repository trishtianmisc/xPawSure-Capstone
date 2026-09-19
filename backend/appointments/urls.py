from django.urls import path

from appointments.views import (
    AppointmentDetailView,
    AppointmentListCreateView,
    AvailableSlotsView,
    BulkBlockSlotsView,
    GenerateSlotsView,
    ScheduleView,
    SlotStatusView,
    VetListView,
    VetScheduleListView,
)
from appointments.views_dashboard import DashboardStatsView
from owners.views import OwnerDetailView, OwnerListView
from pets.views_receptionist import ReceptionistPetDetailView, ReceptionistPetListCreateView

urlpatterns = [
    path('available-slots/', AvailableSlotsView.as_view(), name='available-slots'),
    path('vets/', VetListView.as_view(), name='vet-list'),
    path('appointments/', AppointmentListCreateView.as_view(), name='appointment-list-create'),
    path('appointments/<uuid:apt_id>/', AppointmentDetailView.as_view(), name='appointment-detail'),
    path('dashboard/stats/', DashboardStatsView.as_view(), name='receptionist-dashboard-stats'),
    path('schedule/', ScheduleView.as_view(), name='schedule'),
    path('schedule/vet-list/', VetScheduleListView.as_view(), name='schedule-vet-list'),
    path('schedule/slots/<uuid:slot_id>/status/', SlotStatusView.as_view(), name='slot-status'),
    path('schedule/vets/<uuid:vet_id>/block-remaining/', BulkBlockSlotsView.as_view(), name='bulk-block-slots'),
    path('generate-slots/', GenerateSlotsView.as_view(), name='generate-slots'),
    path('owners/', OwnerListView.as_view(), name='owner-list'),
    path('owners/<uuid:own_id>/', OwnerDetailView.as_view(), name='owner-detail'),
    path('receptionist/pets/', ReceptionistPetListCreateView.as_view(), name='receptionist-pet-list-create'),
    path('receptionist/pets/<uuid:pet_id>/', ReceptionistPetDetailView.as_view(), name='receptionist-pet-detail'),
]

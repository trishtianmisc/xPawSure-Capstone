from django.urls import path

from appointments.views import (
    AppointmentDetailView,
    AppointmentListCreateView,
    AppointmentVolumeView,
    AvailableSlotsView,
    BulkBlockSlotsView,
    GenerateSlotsView,
    ScheduleView,
    SlotStatusView,
    VetListView,
    VetScheduleListView,
)
from appointments.views_dashboard import DashboardStatsView
from appointments.views_owner import (
    OwnerAppointmentCancelView,
    OwnerAppointmentDetailView,
    OwnerAppointmentListCreateView,
    OwnerAvailableSlotsView,
    OwnerClinicListView,
    OwnerVetListView,
)
from owners.views import OwnerDetailView, OwnerListView
from pets.views_receptionist import (
    ReceptionistPetDetailView,
    ReceptionistPetHistoryView,
    ReceptionistPetListCreateView,
)

urlpatterns = [
    path('available-slots/', AvailableSlotsView.as_view(), name='available-slots'),
    path('vets/', VetListView.as_view(), name='vet-list'),
    path('appointments/', AppointmentListCreateView.as_view(), name='appointment-list-create'),
    path('appointments/volume/', AppointmentVolumeView.as_view(), name='appointment-volume'),
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
    path('receptionist/pets/<uuid:pet_id>/history/', ReceptionistPetHistoryView.as_view(), name='receptionist-pet-history'),
    path('owner/clinics/', OwnerClinicListView.as_view(), name='owner-clinic-list'),
    path('owner/vets/', OwnerVetListView.as_view(), name='owner-vet-list'),
    path('owner/slots/', OwnerAvailableSlotsView.as_view(), name='owner-available-slots'),
    path('owner/appointments/', OwnerAppointmentListCreateView.as_view(), name='owner-appointment-list-create'),
    path('owner/appointments/<uuid:apt_id>/', OwnerAppointmentDetailView.as_view(), name='owner-appointment-detail'),
    path('owner/appointments/<uuid:apt_id>/cancel/', OwnerAppointmentCancelView.as_view(), name='owner-appointment-cancel'),
]

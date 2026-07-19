from django.urls import path

from clinics.views import (
    ClinicDetailView,
    ClinicListCreateView,
    ClinicStatsView,
    ClinicStatusView,
)

urlpatterns = [
    path('clinics/', ClinicListCreateView.as_view(), name='clinic-list'),
    path('clinics/stats/', ClinicStatsView.as_view(), name='clinic-stats'),
    path('clinics/<uuid:clinic_id>/', ClinicDetailView.as_view(), name='clinic-detail'),
    path('clinics/<uuid:clinic_id>/status/', ClinicStatusView.as_view(), name='clinic-status'),
]

from django.urls import path

from clinics.views import (
    ClinicDetailView,
    ClinicListCreateView,
    ClinicLogoView,
    ClinicOperatingHoursView,
    ClinicProfileView,
    ClinicSettingsView,
    ClinicStatsView,
    ClinicStatusView,
)

urlpatterns = [
    path('clinics/', ClinicListCreateView.as_view(), name='clinic-list'),
    path('clinics/stats/', ClinicStatsView.as_view(), name='clinic-stats'),
    path('clinics/<uuid:clinic_id>/', ClinicDetailView.as_view(), name='clinic-detail'),
    path('clinics/<uuid:clinic_id>/status/', ClinicStatusView.as_view(), name='clinic-status'),
    path('clinic/profile/', ClinicProfileView.as_view(), name='clinic-profile'),
    path('clinic/settings/', ClinicSettingsView.as_view(), name='clinic-settings'),
    path('clinic/logo/', ClinicLogoView.as_view(), name='clinic-logo'),
    path('clinic/operating-hours/', ClinicOperatingHoursView.as_view(), name='clinic-operating-hours'),
]

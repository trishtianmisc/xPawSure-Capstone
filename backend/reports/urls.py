from django.urls import path

from reports.views import (
    ReportAppointmentsView,
    ReportPatientsView,
    ReportRevenueView,
    ReportScreeningsView,
    ReportSummaryView,
    ReportVetWorkloadView,
)

urlpatterns = [
    path('reports/summary/', ReportSummaryView.as_view(), name='report-summary'),
    path(
        'reports/appointments/',
        ReportAppointmentsView.as_view(),
        name='report-appointments',
    ),
    path(
        'reports/vet-workload/',
        ReportVetWorkloadView.as_view(),
        name='report-vet-workload',
    ),
    path(
        'reports/screenings/',
        ReportScreeningsView.as_view(),
        name='report-screenings',
    ),
    path(
        'reports/patients/',
        ReportPatientsView.as_view(),
        name='report-patients',
    ),
    path(
        'reports/revenue/',
        ReportRevenueView.as_view(),
        name='report-revenue',
    ),
]

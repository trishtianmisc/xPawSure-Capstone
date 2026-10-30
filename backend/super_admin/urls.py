from django.urls import path

from super_admin.views import (
    AllClinicAdminsView,
    AuditLogListView as SuperAdminAuditLogListView,
    ClinicAdminActionView,
    ClinicAdminListCreateView,
    ClinicAppointmentsListView,
    ClinicOverviewView,
    ClinicOwnersListView,
    ClinicPetsListView,
    ClinicStaffListView,
    PlatformAnalyticsView,
)

urlpatterns = [
    path(
        'super-admin/analytics/overview/',
        PlatformAnalyticsView.as_view(),
        name='super-admin-analytics-overview',
    ),
    path(
        'super-admin/clinics/<uuid:clinic_id>/overview/',
        ClinicOverviewView.as_view(),
        name='super-admin-clinic-overview',
    ),
    path(
        'super-admin/clinics/<uuid:clinic_id>/admins/',
        ClinicAdminListCreateView.as_view(),
        name='super-admin-clinic-admins',
    ),
    path(
        'super-admin/admins/',
        AllClinicAdminsView.as_view(),
        name='super-admin-admins',
    ),
    path(
        'super-admin/admins/<uuid:admin_user_id>/<str:action>/',
        ClinicAdminActionView.as_view(),
        name='super-admin-admin-action',
    ),
    path(
        'super-admin/clinics/<uuid:clinic_id>/staff/',
        ClinicStaffListView.as_view(),
        name='super-admin-clinic-staff',
    ),
    path(
        'super-admin/clinics/<uuid:clinic_id>/owners/',
        ClinicOwnersListView.as_view(),
        name='super-admin-clinic-owners',
    ),
    path(
        'super-admin/clinics/<uuid:clinic_id>/pets/',
        ClinicPetsListView.as_view(),
        name='super-admin-clinic-pets',
    ),
    path(
        'super-admin/clinics/<uuid:clinic_id>/appointments/',
        ClinicAppointmentsListView.as_view(),
        name='super-admin-clinic-appointments',
    ),
    path(
        'super-admin/audit-logs/',
        SuperAdminAuditLogListView.as_view(),
        name='super-admin-audit-logs',
    ),
]

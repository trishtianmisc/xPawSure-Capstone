from django.urls import path

from staff.views import StaffActionView, StaffBulkUploadView, StaffDetailView, StaffListCreateView, StaffStatsView

urlpatterns = [
    path('staff/stats/', StaffStatsView.as_view(), name='staff-stats'),
    path('staff/', StaffListCreateView.as_view(), name='staff-list'),
    path('staff/bulk-upload/', StaffBulkUploadView.as_view(), name='staff-bulk-upload'),
    path('staff/<uuid:staff_id>/', StaffDetailView.as_view(), name='staff-detail'),
    path('staff/<uuid:staff_id>/<str:action>/', StaffActionView.as_view(), name='staff-action'),
]

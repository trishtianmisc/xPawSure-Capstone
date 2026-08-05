from django.urls import path

from staff.views import StaffBulkUploadView, StaffDetailView, StaffListCreateView

urlpatterns = [
    path('staff/', StaffListCreateView.as_view(), name='staff-list'),
    path('staff/bulk-upload/', StaffBulkUploadView.as_view(), name='staff-bulk-upload'),
    path('staff/<uuid:staff_id>/', StaffDetailView.as_view(), name='staff-detail'),
]

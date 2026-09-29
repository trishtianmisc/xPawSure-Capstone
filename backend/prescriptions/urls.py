from django.urls import path

from prescriptions.views import PrescriptionDetailView, PrescriptionListView

urlpatterns = [
    path('prescriptions/', PrescriptionListView.as_view(), name='prescription-list'),
    path('prescriptions/<uuid:prs_id>/', PrescriptionDetailView.as_view(), name='prescription-detail'),
]

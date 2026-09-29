from django.urls import path

from consultations.views import ConsultationDetailView, ConsultationListView

urlpatterns = [
    path('consultations/', ConsultationListView.as_view(), name='consultation-list'),
    path('consultations/<uuid:con_id>/', ConsultationDetailView.as_view(), name='consultation-detail'),
]

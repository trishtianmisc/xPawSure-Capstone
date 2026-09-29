from django.urls import path

from vaccinations.views import VaccinationDetailView, VaccinationListView

urlpatterns = [
    path('vaccinations/', VaccinationListView.as_view(), name='vaccination-list'),
    path('vaccinations/<uuid:vac_id>/', VaccinationDetailView.as_view(), name='vaccination-detail'),
]

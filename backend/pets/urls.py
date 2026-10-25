from django.urls import path

from pets.views import BreedListView, PetDetailView, PetListCreateView, PublicPetDetailView
from pets.views_clinic_admin import ClinicPatientDetailView, ClinicPatientListView

urlpatterns = [
    path('breeds/', BreedListView.as_view(), name='breed-list'),
    path('pets/public/<str:qr_code>/', PublicPetDetailView.as_view(), name='public-pet-detail'),
    path('pets/', PetListCreateView.as_view(), name='pet-list-create'),
    path('pets/<uuid:pet_id>/', PetDetailView.as_view(), name='pet-detail'),
    path('clinic/patients/', ClinicPatientListView.as_view(), name='clinic-patient-list'),
    path('clinic/patients/<uuid:pet_id>/', ClinicPatientDetailView.as_view(), name='clinic-patient-detail'),
]

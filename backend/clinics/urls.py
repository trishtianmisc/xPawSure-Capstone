from django.urls import path

from clinics.views import ClinicCreateView

urlpatterns = [
    path('clinics/', ClinicCreateView.as_view(), name='clinic-create'),
]

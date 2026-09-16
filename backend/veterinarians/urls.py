from django.urls import path

from veterinarians.views import VeterinarianDetailView, VeterinarianListCreateView

urlpatterns = [
    path('veterinarians/', VeterinarianListCreateView.as_view(), name='veterinarian-list-create'),
    path('veterinarians/<uuid:veterinarian_id>/', VeterinarianDetailView.as_view(), name='veterinarian-detail'),
]

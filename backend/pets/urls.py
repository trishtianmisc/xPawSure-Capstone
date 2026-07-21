from django.urls import path

from pets.views import BreedListView, PetListCreateView

urlpatterns = [
    path('breeds/', BreedListView.as_view(), name='breed-list'),
    path('pets/', PetListCreateView.as_view(), name='pet-list-create'),
]

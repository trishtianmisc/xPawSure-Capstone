from django.urls import path

from pets.views import BreedListView, PetCreateView

urlpatterns = [
    path('breeds/', BreedListView.as_view(), name='breed-list'),
    path('pets/', PetCreateView.as_view(), name='pet-create'),
]

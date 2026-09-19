from django.urls import path

from owners.views import OwnerDetailView, OwnerListView

urlpatterns = [
    path('owners/', OwnerListView.as_view(), name='owner-list'),
    path('owners/<uuid:own_id>/', OwnerDetailView.as_view(), name='owner-detail'),
]

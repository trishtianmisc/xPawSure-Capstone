from django.urls import path

from owners.views import OwnerDetailView, OwnerListView, OwnerProfileView

urlpatterns = [
    path('owner/profile/', OwnerProfileView.as_view(), name='owner-profile'),
    path('owners/', OwnerListView.as_view(), name='owner-list'),
    path('owners/<uuid:own_id>/', OwnerDetailView.as_view(), name='owner-detail'),
]

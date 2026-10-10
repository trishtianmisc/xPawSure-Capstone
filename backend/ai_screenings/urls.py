from django.urls import path

from ai_screenings.views import ScreeningStatsView
from ai_screenings.views_owner import OwnerScreeningListCreateView

urlpatterns = [
    path('owner/screenings/', OwnerScreeningListCreateView.as_view(), name='owner-screening-list-create'),
    path('screenings/stats/', ScreeningStatsView.as_view(), name='screening-stats'),
]

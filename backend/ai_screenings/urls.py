from django.urls import path

from ai_screenings.views import ScreeningStatsView
from ai_screenings.views_owner import OwnerScreeningListCreateView, OwnerVisionAnalysisView

urlpatterns = [
    path('owner/screenings/', OwnerScreeningListCreateView.as_view(), name='owner-screening-list-create'),
    path(
        'owner/screenings/vision-analysis/',
        OwnerVisionAnalysisView.as_view(),
        name='owner-screening-vision-analysis',
    ),
    path('screenings/stats/', ScreeningStatsView.as_view(), name='screening-stats'),
]

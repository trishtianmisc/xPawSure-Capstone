from django.urls import path

from ai_screenings.views import ScreeningStatsView
from ai_screenings.views_owner import (
    OwnerScreeningDetailView, OwnerScreeningListCreateView, OwnerVisionAnalysisView,
)

urlpatterns = [
    path('owner/screenings/', OwnerScreeningListCreateView.as_view(), name='owner-screening-list-create'),
    path('owner/screenings/<uuid:screening_id>/', OwnerScreeningDetailView.as_view(), name='owner-screening-detail'),
    path(
        'owner/screenings/vision-analysis/',
        OwnerVisionAnalysisView.as_view(),
        name='owner-screening-vision-analysis',
    ),
    path('screenings/stats/', ScreeningStatsView.as_view(), name='screening-stats'),
]

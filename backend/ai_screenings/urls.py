from django.urls import path

from ai_screenings.views_owner import (
    OwnerScreeningListCreateView,
    OwnerScreeningQuizQuestionsView,
    OwnerScreeningQuizValidateView,
)

urlpatterns = [
    path('owner/screenings/', OwnerScreeningListCreateView.as_view(), name='owner-screening-list-create'),
    path('owner/screenings/quiz-questions/', OwnerScreeningQuizQuestionsView.as_view(), name='owner-screening-quiz-questions'),
    path('owner/screenings/quiz-validate/', OwnerScreeningQuizValidateView.as_view(), name='owner-screening-quiz-validate'),
]

from django.urls import path

from users.views import LoginView

urlpatterns = [
    path('auth/login/', LoginView.as_view(), name='auth-login'),
]

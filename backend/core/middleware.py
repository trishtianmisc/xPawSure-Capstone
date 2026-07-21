from django.http import HttpRequest, HttpResponse
from django.urls import resolve


class MustChangePasswordMiddleware:
    ALLOWED_PATHS = ['auth-change-password', 'auth-logout']

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        if request.user.is_authenticated and getattr(request.user, 'usr_must_change_password', False):
            match = resolve(request.path_info)
            if match.url_name not in self.ALLOWED_PATHS:
                from django.http import JsonResponse
                return JsonResponse(
                    {'detail': 'You must change your password before accessing this resource.'},
                    status=403,
                )
        return self.get_response(request)

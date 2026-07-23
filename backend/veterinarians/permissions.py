from rest_framework.permissions import BasePermission

from users.models import UserRole


class IsClinicAdmin(BasePermission):
    def has_permission(self, request, view):
        return getattr(request.user, 'usr_role', None) == UserRole.CLINIC_ADMIN

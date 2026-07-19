from rest_framework.permissions import BasePermission

from users.models import UserRole


class IsSuperAdmin(BasePermission):
    def has_permission(self, request, view):
        return getattr(request.user, 'usr_role', None) == UserRole.SUPER_ADMIN


class IsClinicAdmin(BasePermission):
    def has_permission(self, request, view):
        return getattr(request.user, 'usr_role', None) == UserRole.CLINIC_ADMIN


class IsVeterinarian(BasePermission):
    def has_permission(self, request, view):
        return getattr(request.user, 'usr_role', None) == UserRole.VETERINARIAN


class IsReceptionist(BasePermission):
    def has_permission(self, request, view):
        return getattr(request.user, 'usr_role', None) == UserRole.RECEPTIONIST


class IsOwner(BasePermission):
    def has_permission(self, request, view):
        return getattr(request.user, 'usr_role', None) == UserRole.OWNER


class IsStaff(BasePermission):
    def has_permission(self, request, view):
        return getattr(request.user, 'usr_role', None) in (
            UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN,
            UserRole.VETERINARIAN, UserRole.RECEPTIONIST,
        )


def HasRole(*roles):
    class _HasRole(BasePermission):
        def has_permission(self, request, view):
            return getattr(request.user, 'usr_role', None) in roles

    return _HasRole

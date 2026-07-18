from rest_framework.permissions import BasePermission


class IsValidated(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.is_active and user.is_validated)

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    ordering = ("email",)
    list_display = ("email", "is_validated", "is_staff", "is_superuser")
    search_fields = ("email",)
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        (
            "Permissions",
            {
                "fields": (
                    "is_active",
                    "is_validated",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "password1", "password2"),
            },
        ),
    )

    # Only a superuser may hand out staff/superuser status, permissions, or groups.
    # For anyone else these are read-only, which also drops them from the saved
    # form data — so a crafted POST cannot self-escalate.
    _privileged_fields = (
        "is_validated",
        "is_superuser",
        "is_staff",
        "user_permissions",
        "groups",
    )

    @staticmethod
    def _can_manage_object(request, obj):
        return obj is None or request.user.is_superuser or not (obj.is_staff or obj.is_superuser)

    def has_view_permission(self, request, obj=None):
        return self._can_manage_object(request, obj) and super().has_view_permission(
            request,
            obj,
        )

    def has_change_permission(self, request, obj=None):
        return self._can_manage_object(request, obj) and super().has_change_permission(
            request,
            obj,
        )

    def has_delete_permission(self, request, obj=None):
        return self._can_manage_object(request, obj) and super().has_delete_permission(
            request,
            obj,
        )

    def get_readonly_fields(self, request, obj=None):
        readonly = super().get_readonly_fields(request, obj)
        if not request.user.is_superuser:
            readonly = (*readonly, *self._privileged_fields)
        return readonly

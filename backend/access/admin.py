from django.contrib import admin

from .models import Grant, GroupMembership, OrganizationalGroup, Role, RoleAssignment


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ("name", "slug")
    search_fields = ("name", "slug")


@admin.register(OrganizationalGroup)
class OrganizationalGroupAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "parent")
    search_fields = ("name", "slug")
    autocomplete_fields = ("parent",)


@admin.register(GroupMembership)
class GroupMembershipAdmin(admin.ModelAdmin):
    list_display = ("user", "group")
    list_filter = ("group",)
    search_fields = ("user__email", "group__name")
    autocomplete_fields = ("user", "group")


@admin.register(RoleAssignment)
class RoleAssignmentAdmin(admin.ModelAdmin):
    list_display = ("user", "role", "scope")
    list_filter = ("role", "scope")
    search_fields = ("user__email", "role__name", "scope__name")
    autocomplete_fields = ("user", "role", "scope")


@admin.register(Grant)
class GrantAdmin(admin.ModelAdmin):
    list_display = ("permission", "recipient", "scope", "target")
    list_filter = ("permission", "role", "group", "scope")
    search_fields = (
        "permission__codename",
        "user__email",
        "role__name",
        "group__name",
    )
    autocomplete_fields = (
        "user",
        "role",
        "group",
        "scope",
    )

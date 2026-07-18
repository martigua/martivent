"""Presentation-oriented reads for the meaning-driven admin pages.

Built on the decisions engine and the capability catalog. Every page (person,
capability lens, role lens) pivots the same data through one of these.
"""

from collections import defaultdict
from dataclasses import dataclass

from django.contrib.auth.models import Permission

from . import capabilities
from .decisions import _scope_intersection, effective_capabilities
from .models import Grant, GroupMembership, OrganizationalGroup, RoleAssignment

CLUB_WIDE = "Club-wide"


def scope_label(group):
    return group.name if group is not None else CLUB_WIDE


def _permission_name(permission):
    return f"{permission.content_type.app_label}.{permission.codename}"


def _permission(permission_name):
    app_label, _, codename = permission_name.partition(".")
    return (
        Permission.objects.select_related("content_type")
        .filter(content_type__app_label=app_label, codename=codename)
        .first()
    )


def scope_choices():
    """Tree-ordered (pk, indented label) for the scope picker, roots first."""
    groups = list(OrganizationalGroup.objects.all())
    children = defaultdict(list)
    for group in groups:
        children[group.parent_id].append(group)

    ordered = []

    def walk(parent_id, depth):
        for group in sorted(children[parent_id], key=lambda item: item.name):
            ordered.append((group.pk, ("  " * depth) + group.name))
            walk(group.pk, depth + 1)

    walk(None, 0)
    return ordered


@dataclass(frozen=True)
class RoleRow:
    assignment_pk: int
    role_name: str
    scope: str


@dataclass(frozen=True)
class GroupRow:
    group_pk: int
    group_name: str


@dataclass(frozen=True)
class GrantRow:
    grant_pk: int
    capability: str
    scope: str


@dataclass(frozen=True)
class EffectiveRow:
    capability: str
    scope: str
    source_kind: str
    source_name: str


@dataclass(frozen=True)
class PersonAccess:
    roles: list[RoleRow]
    groups: list[GroupRow]
    direct_grants: list[GrantRow]
    effective: list[EffectiveRow]


def person_access(user):
    roles = [
        RoleRow(assignment.pk, assignment.role.name, scope_label(assignment.scope))
        for assignment in (
            RoleAssignment.objects.filter(user=user)
            .select_related("role", "scope")
            .order_by("role__name")
        )
    ]
    groups = [
        GroupRow(membership.group.pk, membership.group.name)
        for membership in (
            GroupMembership.objects.filter(user=user)
            .select_related("group")
            .order_by("group__name")
        )
    ]
    direct_grants = [
        GrantRow(
            grant.pk,
            capabilities.label_for(_permission_name(grant.permission)),
            scope_label(grant.scope),
        )
        for grant in (
            Grant.objects.filter(user=user, target_content_type__isnull=True)
            .select_related("permission__content_type", "scope")
            .order_by("pk")
        )
    ]
    effective = [
        EffectiveRow(
            capability=capabilities.label_for(permission_name),
            scope=source["scope"] or CLUB_WIDE,
            source_kind=source["kind"],
            source_name=source["name"],
        )
        for permission_name, sources in effective_capabilities(user).items()
        for source in sources
    ]
    effective.sort(key=lambda row: (row.capability, row.scope))
    return PersonAccess(roles, groups, direct_grants, effective)


@dataclass(frozen=True)
class HolderRow:
    who: str
    scope: str
    via: str


def capability_holders(permission_name):
    """Everyone who holds a capability, resolved to people, with source + scope."""
    permission = _permission(permission_name)
    if permission is None:
        return []

    holders = []
    grants = (
        Grant.objects.filter(permission=permission, target_content_type__isnull=True)
        .select_related("user", "role", "group", "scope")
        .order_by("pk")
    )
    for grant in grants:
        if grant.user_id:
            holders.append(HolderRow(grant.user.email, scope_label(grant.scope), "direct"))
        elif grant.role_id:
            for assignment in RoleAssignment.objects.filter(role=grant.role).select_related(
                "user", "scope"
            ):
                compatible, effective_scope = _scope_intersection(assignment.scope, grant.scope)
                if compatible:
                    holders.append(
                        HolderRow(
                            assignment.user.email,
                            scope_label(effective_scope),
                            f"role {grant.role.name}",
                        )
                    )
        elif grant.group_id:
            for membership in GroupMembership.objects.filter(group=grant.group).select_related(
                "user"
            ):
                holders.append(
                    HolderRow(
                        membership.user.email,
                        scope_label(grant.scope),
                        f"group {grant.group.name}",
                    )
                )
    holders.sort(key=lambda row: (row.who, row.scope))
    return holders


@dataclass(frozen=True)
class RoleCapabilityRow:
    grant_pk: int
    capability: str
    scope: str


@dataclass(frozen=True)
class RoleAssigneeRow:
    assignment_pk: int
    who: str
    scope: str


@dataclass(frozen=True)
class RoleSummary:
    capabilities: list[RoleCapabilityRow]
    assignees: list[RoleAssigneeRow]


def role_summary(role):
    role_capabilities = [
        RoleCapabilityRow(
            grant.pk,
            capabilities.label_for(_permission_name(grant.permission)),
            scope_label(grant.scope),
        )
        for grant in (
            Grant.objects.filter(role=role, target_content_type__isnull=True)
            .select_related("permission__content_type", "scope")
            .order_by("pk")
        )
    ]
    assignees = [
        RoleAssigneeRow(assignment.pk, assignment.user.email, scope_label(assignment.scope))
        for assignment in (
            RoleAssignment.objects.filter(role=role)
            .select_related("user", "scope")
            .order_by("user__email")
        )
    ]
    return RoleSummary(role_capabilities, assignees)

from collections import defaultdict
from dataclasses import asdict, dataclass
from typing import Literal

from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType

from .models import Grant, GroupMembership, OrganizationalGroup, RoleAssignment


@dataclass(frozen=True)
class GrantSource:
    kind: Literal["direct", "role", "group", "superuser"]
    name: str
    scope: str | None


@dataclass(frozen=True)
class Decision:
    allowed: bool
    sources: tuple[GrantSource, ...] = ()


@dataclass(frozen=True)
class _Candidate:
    grant: Grant
    kind: Literal["direct", "role", "group"]
    name: str
    assignment_scope: OrganizationalGroup | None = None


def _permission_name(permission):
    return f"{permission.content_type.app_label}.{permission.codename}"


def _permission(permission_name):
    app_label, separator, codename = permission_name.partition(".")
    if not separator:
        return None
    return (
        Permission.objects.select_related("content_type")
        .filter(content_type__app_label=app_label, codename=codename)
        .first()
    )


def _scope_covers(granted, requested):
    if granted is None:
        return True
    if requested is None:
        return False
    return any(ancestor.pk == granted.pk for ancestor in requested.ancestors(include_self=True))


def _scope_intersection(first, second):
    if first is None:
        return True, second
    if second is None:
        return True, first
    if _scope_covers(first, second):
        return True, second
    if _scope_covers(second, first):
        return True, first
    return False, None


def _target_matches(grant, target):
    if grant.target_content_type_id is None:
        return True
    if target is None:
        return False
    content_type = ContentType.objects.get_for_model(target, for_concrete_model=False)
    return grant.target_content_type_id == content_type.pk and grant.target_object_id == target.pk


def _grant_query(permission=None):
    grants = Grant.objects.select_related(
        "permission__content_type",
        "user",
        "role",
        "group",
        "scope",
        "target_content_type",
    )
    if permission is not None:
        grants = grants.filter(permission=permission)
    return grants.order_by("pk")


def _candidates(user, permission=None):
    grants = _grant_query(permission)

    for grant in grants.filter(user=user):
        yield _Candidate(grant=grant, kind="direct", name=user.email)

    assignments = list(
        RoleAssignment.objects.filter(user=user).select_related("role", "scope").order_by("pk")
    )
    role_grants = defaultdict(list)
    for grant in grants.filter(role_id__in=[item.role_id for item in assignments]):
        role_grants[grant.role_id].append(grant)
    for assignment in assignments:
        for grant in role_grants[assignment.role_id]:
            yield _Candidate(
                grant=grant,
                kind="role",
                name=assignment.role.slug,
                assignment_scope=assignment.scope,
            )

    memberships = list(
        GroupMembership.objects.filter(user=user).select_related("group").order_by("pk")
    )
    group_grants = defaultdict(list)
    for grant in grants.filter(group_id__in=[item.group_id for item in memberships]):
        group_grants[grant.group_id].append(grant)
    for membership in memberships:
        for grant in group_grants[membership.group_id]:
            yield _Candidate(
                grant=grant,
                kind="group",
                name=membership.group.slug,
            )


def _source(candidate):
    compatible, effective_scope = _scope_intersection(
        candidate.assignment_scope,
        candidate.grant.scope,
    )
    if not compatible:
        return None
    return GrantSource(
        kind=candidate.kind,
        name=candidate.name,
        scope=effective_scope.slug if effective_scope else None,
    )


def decide(user, permission_name, *, scope=None, target=None):
    if not getattr(user, "is_authenticated", False) or not user.is_active:
        return Decision(allowed=False)
    if user.is_superuser:
        return Decision(
            allowed=True,
            sources=(GrantSource("superuser", user.email, None),),
        )

    permission = _permission(permission_name)
    if permission is None:
        return Decision(allowed=False)

    sources = []
    for candidate in _candidates(user, permission):
        if not _scope_covers(candidate.grant.scope, scope):
            continue
        if not _scope_covers(candidate.assignment_scope, scope):
            continue
        if not _target_matches(candidate.grant, target):
            continue
        source = _source(candidate)
        if source is not None:
            sources.append(source)

    return Decision(allowed=bool(sources), sources=tuple(sources))


def effective_capabilities(user):
    if not getattr(user, "is_authenticated", False) or not user.is_active:
        return {}

    if user.is_superuser:
        source = asdict(GrantSource("superuser", user.email, None))
        return {
            _permission_name(permission): [source]
            for permission in Permission.objects.select_related("content_type").order_by(
                "content_type__app_label",
                "codename",
            )
        }

    capabilities = defaultdict(list)
    for candidate in _candidates(user):
        if candidate.grant.target_content_type_id is not None:
            continue
        source = _source(candidate)
        if source is None:
            continue
        capabilities[_permission_name(candidate.grant.permission)].append(asdict(source))

    return dict(sorted(capabilities.items()))

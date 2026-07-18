import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission

from . import summaries
from .models import Grant, GroupMembership, OrganizationalGroup, Role, RoleAssignment

PERM = "accounts.change_user"


@pytest.fixture
def permission():
    return Permission.objects.get(content_type__app_label="accounts", codename="change_user")


@pytest.fixture
def user():
    return get_user_model().objects.create_user(email="marie@example.com", password="pw")


@pytest.fixture
def groups():
    club = OrganizationalGroup.objects.create(name="Club", slug="club")
    u13 = OrganizationalGroup.objects.create(name="U13", slug="u13", parent=club)
    u15 = OrganizationalGroup.objects.create(name="U15", slug="u15", parent=club)
    return club, u13, u15


@pytest.mark.django_db
def test_scope_choices_are_tree_ordered(groups):
    labels = [label.strip() for _, label in summaries.scope_choices()]
    assert labels == ["Club", "U13", "U15"]
    indented = dict(summaries.scope_choices())
    club_pk = groups[0].pk
    assert not indented[club_pk].startswith(" ")
    assert indented[groups[1].pk].startswith(" ")


@pytest.mark.django_db
def test_person_access_collects_sources_and_effective(user, permission, groups):
    _club, u13, _u15 = groups
    role = Role.objects.create(name="Coach", slug="coach")
    Grant.objects.create(permission=permission, role=role)
    RoleAssignment.objects.create(user=user, role=role, scope=u13)
    GroupMembership.objects.create(user=user, group=u13)
    Grant.objects.create(permission=permission, user=user)

    access = summaries.person_access(user)

    assert [row.role_name for row in access.roles] == ["Coach"]
    assert access.roles[0].scope == "U13"
    assert [row.group_name for row in access.groups] == ["U13"]
    assert [row.capability for row in access.direct_grants] == ["Manage users"]
    assert any(row.source_kind == "role" for row in access.effective)
    assert any(row.source_kind == "direct" for row in access.effective)


@pytest.mark.django_db
def test_capability_holders_respects_scope_intersection(user, permission, groups):
    _club, u13, u15 = groups
    role = Role.objects.create(name="Coach", slug="coach")
    Grant.objects.create(permission=permission, role=role, scope=u13)
    RoleAssignment.objects.create(user=user, role=role, scope=u15)

    holders = summaries.capability_holders(PERM)

    assert holders == []


@pytest.mark.django_db
def test_capability_holders_lists_compatible_assignee(user, permission, groups):
    _club, u13, _u15 = groups
    role = Role.objects.create(name="Coach", slug="coach")
    Grant.objects.create(permission=permission, role=role, scope=u13)
    RoleAssignment.objects.create(user=user, role=role, scope=u13)

    holders = summaries.capability_holders(PERM)

    assert len(holders) == 1
    assert holders[0].who == "marie@example.com"
    assert holders[0].scope == "U13"
    assert holders[0].via == "role Coach"


@pytest.mark.django_db
def test_role_summary_lists_capabilities_and_assignees(user, permission, groups):
    _club, u13, _u15 = groups
    role = Role.objects.create(name="Coach", slug="coach")
    Grant.objects.create(permission=permission, role=role)
    RoleAssignment.objects.create(user=user, role=role, scope=u13)

    summary = summaries.role_summary(role)

    assert [row.capability for row in summary.capabilities] == ["Manage users"]
    assert [row.who for row in summary.assignees] == ["marie@example.com"]
    assert summary.assignees[0].scope == "U13"

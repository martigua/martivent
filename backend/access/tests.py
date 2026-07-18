import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser, Permission
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import ValidationError
from django.test import RequestFactory

from .decisions import decide
from .models import Grant, GroupMembership, OrganizationalGroup, Role, RoleAssignment
from .permissions import has_capability


@pytest.fixture
def user():
    return get_user_model().objects.create_user(email="alice@example.com", password="pw")


@pytest.fixture
def permission():
    return Permission.objects.get(
        content_type__app_label="accounts",
        codename="change_user",
    )


@pytest.fixture
def groups():
    club = OrganizationalGroup.objects.create(name="Club", slug="club")
    u18 = OrganizationalGroup.objects.create(name="U18", slug="u18", parent=club)
    u16 = OrganizationalGroup.objects.create(name="U16", slug="u16", parent=club)
    return club, u18, u16


@pytest.mark.django_db
def test_organizational_group_ancestors(groups):
    club, u18, _u16 = groups

    assert list(u18.ancestors(include_self=True)) == [u18, club]


@pytest.mark.django_db
def test_grant_requires_exactly_one_recipient(user, permission):
    with pytest.raises(ValidationError, match="exactly one recipient"):
        Grant(permission=permission).full_clean()

    role = Role.objects.create(name="Coach", slug="coach")
    with pytest.raises(ValidationError, match="exactly one recipient"):
        Grant(permission=permission, user=user, role=role).full_clean()


@pytest.mark.django_db
def test_grant_requires_both_target_fields(user, permission):
    with pytest.raises(ValidationError, match="set together"):
        Grant(
            permission=permission,
            user=user,
            target_object_id=user.pk,
        ).full_clean()


@pytest.mark.django_db
def test_role_assignment_can_be_global_or_scoped(user, groups):
    _club, u18, _u16 = groups
    global_role = Role.objects.create(name="Admin", slug="admin")
    scoped_role = Role.objects.create(name="Coach", slug="coach")

    global_assignment = RoleAssignment.objects.create(user=user, role=global_role)
    scoped_assignment = RoleAssignment.objects.create(user=user, role=scoped_role, scope=u18)

    assert global_assignment.scope is None
    assert scoped_assignment.scope == u18


@pytest.mark.django_db
def test_direct_grant_allows_capability(user, permission, groups):
    _club, u18, _u16 = groups
    Grant.objects.create(permission=permission, user=user, scope=u18)

    decision = decide(user, "accounts.change_user", scope=u18)

    assert decision.allowed
    assert [(source.kind, source.name, source.scope) for source in decision.sources] == [
        ("direct", "alice@example.com", "u18"),
    ]


@pytest.mark.django_db
def test_role_and_direct_grants_keep_independent_sources(user, permission, groups):
    _club, u18, _u16 = groups
    coach = Role.objects.create(name="Coach", slug="coach")
    assignment = RoleAssignment.objects.create(user=user, role=coach, scope=u18)
    Grant.objects.create(permission=permission, role=coach)
    Grant.objects.create(permission=permission, user=user, scope=u18)

    decision = decide(user, "accounts.change_user", scope=u18)
    assert {source.kind for source in decision.sources} == {"direct", "role"}

    assignment.delete()

    decision = decide(user, "accounts.change_user", scope=u18)
    assert [source.kind for source in decision.sources] == ["direct"]


@pytest.mark.django_db
def test_group_grant_allows_members(user, permission, groups):
    _club, u18, _u16 = groups
    GroupMembership.objects.create(user=user, group=u18)
    Grant.objects.create(permission=permission, group=u18, scope=u18)

    decision = decide(user, "accounts.change_user", scope=u18)

    assert decision.allowed
    assert decision.sources[0].kind == "group"
    assert decision.sources[0].name == "u18"


@pytest.mark.django_db
def test_parent_scope_covers_descendant_but_not_sibling(user, permission, groups):
    club, u18, u16 = groups
    Grant.objects.create(permission=permission, user=user, scope=club)

    assert decide(user, "accounts.change_user", scope=u18).allowed

    Grant.objects.filter(user=user).update(scope=u18)

    assert not decide(user, "accounts.change_user", scope=club).allowed
    assert not decide(user, "accounts.change_user", scope=u16).allowed


@pytest.mark.django_db
def test_role_assignment_scope_restricts_role_grant(user, permission, groups):
    _club, u18, u16 = groups
    coach = Role.objects.create(name="Coach", slug="coach")
    RoleAssignment.objects.create(user=user, role=coach, scope=u18)
    Grant.objects.create(permission=permission, role=coach)

    assert decide(user, "accounts.change_user", scope=u18).allowed
    assert not decide(user, "accounts.change_user", scope=u16).allowed


@pytest.mark.django_db
def test_exact_target_grant_rejects_other_targets(user, permission):
    user_model = get_user_model()
    bob = user_model.objects.create_user(email="bob@example.com")
    charlie = user_model.objects.create_user(email="charlie@example.com")
    user_type = ContentType.objects.get_for_model(user_model)
    Grant.objects.create(
        permission=permission,
        user=user,
        target_content_type=user_type,
        target_object_id=bob.pk,
    )

    assert decide(user, "accounts.change_user", target=bob).allowed
    assert not decide(user, "accounts.change_user", target=charlie).allowed
    assert not decide(user, "accounts.change_user").allowed


@pytest.mark.django_db
def test_superuser_bypasses_grants(permission):
    superuser = get_user_model().objects.create_superuser(
        email="admin@example.com",
        password="pw",
    )

    decision = decide(superuser, "accounts.change_user")

    assert decision.allowed
    assert decision.sources[0].kind == "superuser"


@pytest.mark.django_db
def test_anonymous_and_inactive_users_are_denied(user, permission):
    user.is_active = False
    user.save(update_fields=["is_active"])

    assert not decide(user, "accounts.change_user").allowed
    assert not decide(AnonymousUser(), "accounts.change_user").allowed


@pytest.mark.django_db
def test_missing_capability_is_denied(user):
    assert not decide(user, "accounts.does_not_exist").allowed


@pytest.mark.django_db
def test_drf_permission_uses_capability_decision(user, permission):
    Grant.objects.create(permission=permission, user=user)
    request = RequestFactory().get("/")
    request.user = user

    allowed = has_capability("accounts.change_user")().has_permission(request, view=None)
    denied = has_capability("accounts.delete_user")().has_permission(request, view=None)

    assert allowed
    assert not denied
    assert request.capability_decisions["accounts.change_user"].allowed

import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser, Permission
from django.core.exceptions import ValidationError
from django.http import Http404
from django.test import RequestFactory

from access.models import Grant, GroupMembership, OrganizationalGroup, Role, RoleAssignment
from access.permissions import has_capability

from .flags import all_variants, variant_for
from .models import Feature, FeatureRule
from .permissions import feature_variant


@pytest.fixture
def user():
    return get_user_model().objects.create_user(email="alice@example.com")


@pytest.fixture
def dashboard():
    return Feature.objects.create(
        key="dashboard",
        description="Dashboard implementation",
        variants=["legacy", "v2", "experimental"],
        default_variant="legacy",
    )


@pytest.fixture
def groups():
    club = OrganizationalGroup.objects.create(name="Club", slug="club")
    u18 = OrganizationalGroup.objects.create(name="U18", slug="u18", parent=club)
    u16 = OrganizationalGroup.objects.create(name="U16", slug="u16", parent=club)
    return club, u18, u16


@pytest.mark.django_db
@pytest.mark.parametrize(
    "variants",
    [
        [],
        ["legacy", "legacy"],
        ["legacy", ""],
        ["legacy", " v2"],
        ["legacy", "v2 "],
        ["legacy", "x" * 81],
        ["legacy", 2],
        "legacy",
    ],
)
def test_feature_requires_unique_non_empty_string_variants(variants):
    feature = Feature(key="dashboard", variants=variants, default_variant="legacy")

    with pytest.raises(ValidationError):
        feature.full_clean()


@pytest.mark.django_db
def test_feature_default_must_be_an_allowed_variant():
    feature = Feature(
        key="dashboard",
        variants=["legacy", "v2"],
        default_variant="experimental",
    )

    with pytest.raises(ValidationError, match="allowed variant"):
        feature.full_clean()


@pytest.mark.django_db
def test_rule_variant_must_be_allowed(dashboard):
    rule = FeatureRule(
        feature=dashboard,
        priority=1,
        variant="missing",
        audience=FeatureRule.Audience.EVERYONE,
    )

    with pytest.raises(ValidationError, match="allowed variant"):
        rule.full_clean()


@pytest.mark.django_db
@pytest.mark.parametrize("variant", [" v2", "v2 ", "x" * 81])
def test_rule_variant_must_be_canonical(dashboard, variant):
    rule = FeatureRule(
        feature=dashboard,
        priority=1,
        variant=variant,
        audience=FeatureRule.Audience.EVERYONE,
    )

    with pytest.raises(ValidationError, match="Variant"):
        rule.full_clean()


@pytest.mark.django_db
def test_feature_cannot_remove_variant_used_by_rule(dashboard):
    FeatureRule.objects.create(
        feature=dashboard,
        priority=1,
        variant="v2",
        audience=FeatureRule.Audience.EVERYONE,
    )
    dashboard.variants = ["legacy", "experimental"]

    with pytest.raises(ValidationError, match="used by a rule"):
        dashboard.full_clean()


@pytest.mark.django_db
def test_rule_requires_exactly_its_selected_audience(dashboard, user):
    missing_user = FeatureRule(
        feature=dashboard,
        priority=1,
        variant="v2",
        audience=FeatureRule.Audience.USER,
    )
    with pytest.raises(ValidationError, match="selected audience"):
        missing_user.full_clean()

    extra_user = FeatureRule(
        feature=dashboard,
        priority=1,
        variant="v2",
        audience=FeatureRule.Audience.EVERYONE,
        user=user,
    )
    with pytest.raises(ValidationError, match="selected audience"):
        extra_user.full_clean()


@pytest.mark.django_db
def test_rule_priority_is_unique_per_feature(dashboard):
    FeatureRule.objects.create(
        feature=dashboard,
        priority=1,
        variant="v2",
        audience=FeatureRule.Audience.EVERYONE,
    )

    with pytest.raises(ValidationError):
        FeatureRule.objects.create(
            feature=dashboard,
            priority=1,
            variant="experimental",
            audience=FeatureRule.Audience.EVERYONE,
        )


@pytest.mark.django_db
def test_default_variant_is_used_without_a_matching_rule(dashboard, user):
    assert variant_for("dashboard", user=user) == "legacy"


@pytest.mark.django_db
def test_lowest_matching_priority_wins(dashboard, user):
    FeatureRule.objects.create(
        feature=dashboard,
        priority=20,
        variant="experimental",
        audience=FeatureRule.Audience.EVERYONE,
    )
    FeatureRule.objects.create(
        feature=dashboard,
        priority=10,
        variant="v2",
        audience=FeatureRule.Audience.USER,
        user=user,
    )

    assert variant_for("dashboard", user=user) == "v2"


@pytest.mark.django_db
def test_role_and_group_audiences_match_user_membership(dashboard, user, groups):
    _club, u18, _u16 = groups
    coach = Role.objects.create(name="Coach", slug="coach")
    RoleAssignment.objects.create(user=user, role=coach, scope=u18)
    GroupMembership.objects.create(user=user, group=u18)
    role_rule = FeatureRule.objects.create(
        feature=dashboard,
        priority=10,
        variant="v2",
        audience=FeatureRule.Audience.ROLE,
        role=coach,
    )
    group_rule = FeatureRule.objects.create(
        feature=dashboard,
        priority=20,
        variant="experimental",
        audience=FeatureRule.Audience.GROUP,
        group=u18,
    )

    assert role_rule.matches(user=user)
    assert group_rule.matches(user=user)
    assert variant_for("dashboard", user=user) == "v2"


@pytest.mark.django_db
def test_scoped_rule_matches_descendant_but_not_sibling(dashboard, user, groups):
    _club, u18, u16 = groups
    u18_players = OrganizationalGroup.objects.create(
        name="U18 Players",
        slug="u18-players",
        parent=u18,
    )
    FeatureRule.objects.create(
        feature=dashboard,
        priority=10,
        variant="v2",
        audience=FeatureRule.Audience.USER,
        user=user,
        scope=u18,
    )

    assert variant_for("dashboard", user=user, scope=u18_players) == "v2"
    assert variant_for("dashboard", user=user, scope=u16) == "legacy"
    assert variant_for("dashboard", user=user) == "legacy"


@pytest.mark.django_db
def test_scoped_role_assignment_must_cover_requested_scope(dashboard, user, groups):
    _club, u18, u16 = groups
    coach = Role.objects.create(name="Coach", slug="coach")
    RoleAssignment.objects.create(user=user, role=coach, scope=u18)
    FeatureRule.objects.create(
        feature=dashboard,
        priority=10,
        variant="v2",
        audience=FeatureRule.Audience.ROLE,
        role=coach,
        scope=u18,
    )

    assert variant_for("dashboard", user=user, scope=u18) == "v2"
    assert variant_for("dashboard", user=user, scope=u16) == "legacy"


@pytest.mark.django_db
def test_unscoped_role_rule_respects_requested_scope(dashboard, user, groups):
    _club, u18, u16 = groups
    coach = Role.objects.create(name="Coach", slug="coach")
    RoleAssignment.objects.create(user=user, role=coach, scope=u18)
    FeatureRule.objects.create(
        feature=dashboard,
        priority=10,
        variant="v2",
        audience=FeatureRule.Audience.ROLE,
        role=coach,
    )

    assert variant_for("dashboard", user=user) == "v2"
    assert variant_for("dashboard", user=user, scope=u18) == "v2"
    assert variant_for("dashboard", user=user, scope=u16) == "legacy"


@pytest.mark.django_db
def test_anonymous_user_only_matches_everyone(dashboard, user):
    FeatureRule.objects.create(
        feature=dashboard,
        priority=10,
        variant="v2",
        audience=FeatureRule.Audience.USER,
        user=user,
    )
    FeatureRule.objects.create(
        feature=dashboard,
        priority=20,
        variant="experimental",
        audience=FeatureRule.Audience.EVERYONE,
    )

    assert variant_for("dashboard", user=AnonymousUser()) == "experimental"


@pytest.mark.django_db
def test_all_variants_returns_only_evaluated_names(dashboard, user):
    FeatureRule.objects.create(
        feature=dashboard,
        priority=10,
        variant="v2",
        audience=FeatureRule.Audience.USER,
        user=user,
    )

    assert all_variants(user=user) == {"dashboard": "v2"}


@pytest.mark.django_db
def test_feature_permission_requires_expected_variant(dashboard, user):
    request = RequestFactory().get("/")
    request.user = user

    assert feature_variant("dashboard", "legacy")().has_permission(request, view=None)

    with pytest.raises(Http404):
        feature_variant("dashboard", "v2")().has_permission(request, view=None)


@pytest.mark.django_db
def test_capability_and_feature_permissions_compose(dashboard, user):
    permission = Permission.objects.get(
        content_type__app_label="accounts",
        codename="change_user",
    )
    Grant.objects.create(permission=permission, user=user)
    request = RequestFactory().get("/")
    request.user = user
    combined = (has_capability("accounts.change_user") & feature_variant("dashboard", "legacy"))()

    assert combined.has_permission(request, view=None)

    Grant.objects.all().delete()
    assert not combined.has_permission(request, view=None)

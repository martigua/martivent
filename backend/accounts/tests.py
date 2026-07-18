import pytest
from django.conf import settings
from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser, Permission
from django.db import IntegrityError, transaction
from django.test import RequestFactory
from django.urls import NoReverseMatch, reverse

from access.models import Grant, OrganizationalGroup, Role, RoleAssignment
from config.env import env
from features.models import Feature, FeatureRule


@pytest.mark.django_db
def test_user_uses_email_as_identifier():
    user_model = get_user_model()
    user = user_model.objects.create_user(
        email="Coach@Martigua.fr",
        password="pw12345!",
    )

    assert user.email == "coach@martigua.fr"
    assert user.get_username() == "coach@martigua.fr"
    assert user.check_password("pw12345!")
    assert user.is_validated is False


@pytest.mark.django_db
def test_saving_user_canonicalizes_complete_email():
    user = get_user_model().objects.create_user(email="member@example.com")
    user.email = "Updated.Member@EXAMPLE.COM"

    user.save()

    user.refresh_from_db()
    assert user.email == "updated.member@example.com"


@pytest.mark.django_db(transaction=True)
def test_database_rejects_case_insensitive_duplicate_email():
    user_model = get_user_model()
    user_model.objects.create_user(email="member@example.com")

    with pytest.raises(IntegrityError), transaction.atomic():
        user_model.objects.bulk_create([user_model(email="MEMBER@example.com")])


@pytest.mark.django_db
def test_superuser_flags_are_enforced():
    user_model = get_user_model()
    superuser = user_model.objects.create_superuser(
        email="admin@martigua.fr",
        password="pw12345!",
    )

    assert superuser.is_staff
    assert superuser.is_superuser
    assert superuser.is_validated

    with pytest.raises(ValueError, match="is_staff=True"):
        user_model.objects.create_superuser(
            email="invalid@martigua.fr",
            password="pw12345!",
            is_staff=False,
        )

    with pytest.raises(ValueError, match="is_validated=True"):
        user_model.objects.create_superuser(
            email="unvalidated@martigua.fr",
            password="pw12345!",
            is_validated=False,
        )


@pytest.mark.django_db
def test_password_login_creates_session(client):
    user = get_user_model().objects.create_user(
        email="member@martigua.fr",
        password="pw12345!",
    )

    response = client.post(
        "/accounts/login/",
        {"login": "MEMBER@MARTIGUA.FR", "password": "pw12345!"},
    )

    assert response.status_code == 302
    assert response.headers["Location"] == "/"
    assert client.get("/api/me/").json()["email"] == user.email


def test_public_signup_is_available(client):
    response = client.get("/accounts/signup/")

    assert response.status_code == 200


@pytest.mark.django_db
def test_password_login_rejects_invalid_password(client):
    get_user_model().objects.create_user(
        email="member@martigua.fr",
        password="pw12345!",
    )

    response = client.post(
        "/accounts/login/",
        {"login": "member@martigua.fr", "password": "wrong"},
    )

    assert response.status_code == 200
    assert client.get("/api/me/").status_code == 403


@pytest.mark.django_db
def test_logout_ends_session(client):
    user = get_user_model().objects.create_user(
        email="member@martigua.fr",
        password="pw12345!",
    )
    client.force_login(user)

    response = client.post("/accounts/logout/")

    assert response.status_code == 302
    assert response.headers["Location"] == "/"
    assert client.get("/api/me/").status_code == 403


def test_google_login_matches_environment_configuration():
    if not env.google_enabled:
        with pytest.raises(NoReverseMatch):
            reverse("google_login")
        return

    assert reverse("google_login") == "/accounts/google/login/"
    google = settings.SOCIALACCOUNT_PROVIDERS["google"]
    assert google["APPS"] == [
        {
            "client_id": env.google_client_id,
            "secret": env.google_client_secret,
            "key": "",
        }
    ]
    assert google["OAUTH_PKCE_ENABLED"] is True
    assert google["EMAIL_AUTHENTICATION"] is True
    assert google["EMAIL_AUTHENTICATION_AUTO_CONNECT"] is True


def test_openapi_describes_current_user_response(client):
    schema = client.get("/api/schema/?format=json").json()
    response_schema = schema["paths"]["/api/me/"]["get"]["responses"]["200"]["content"][
        "application/json"
    ]["schema"]

    assert response_schema == {"$ref": "#/components/schemas/CurrentUser"}


@pytest.mark.django_db
def test_validated_permission_requires_active_validated_account():
    from .permissions import IsValidated

    request = RequestFactory().get("/")
    permission = IsValidated()

    request.user = AnonymousUser()
    assert not permission.has_permission(request, view=None)

    user = get_user_model().objects.create_user(email="member@example.com")
    request.user = user
    assert not permission.has_permission(request, view=None)

    user.is_validated = True
    user.is_active = False
    assert not permission.has_permission(request, view=None)

    user.is_active = True
    assert permission.has_permission(request, view=None)


@pytest.mark.django_db
def test_me_requires_authentication(client):
    response = client.get("/api/me/")

    assert response.status_code == 403


@pytest.mark.django_db
def test_me_returns_capabilities_with_independent_sources(client):
    user = get_user_model().objects.create_user(email="alice@example.com")
    permission = Permission.objects.get(
        content_type__app_label="accounts",
        codename="change_user",
    )
    u18 = OrganizationalGroup.objects.create(name="U18", slug="u18")
    coach = Role.objects.create(name="Coach", slug="coach")
    RoleAssignment.objects.create(user=user, role=coach, scope=u18)
    Grant.objects.create(permission=permission, role=coach)
    Grant.objects.create(permission=permission, user=user, scope=u18)
    client.force_login(user)

    response = client.get("/api/me/")

    assert response.status_code == 200
    assert response.json() == {
        "id": user.pk,
        "email": "alice@example.com",
        "is_validated": False,
        "capabilities": {
            "accounts.change_user": [
                {"kind": "direct", "name": "alice@example.com", "scope": "u18"},
                {"kind": "role", "name": "coach", "scope": "u18"},
            ],
        },
        "features": {},
    }


@pytest.mark.django_db
def test_me_returns_evaluated_variants_without_rule_configuration(client):
    alice = get_user_model().objects.create_user(email="alice@example.com")
    bob = get_user_model().objects.create_user(email="bob@example.com")
    feature = Feature.objects.create(
        key="dashboard",
        variants=["legacy", "v2"],
        default_variant="legacy",
    )
    FeatureRule.objects.create(
        feature=feature,
        priority=10,
        variant="v2",
        audience=FeatureRule.Audience.USER,
        user=alice,
    )

    client.force_login(alice)
    alice_response = client.get("/api/me/")
    client.force_login(bob)
    bob_response = client.get("/api/me/")

    assert alice_response.json()["features"] == {"dashboard": "v2"}
    assert bob_response.json()["features"] == {"dashboard": "legacy"}
    assert "rules" not in alice_response.json()


@pytest.mark.django_db
@pytest.mark.parametrize(
    "target_kind",
    ["staff", "superuser"],
)
def test_delegated_admin_cannot_open_or_delete_privileged_accounts(client, target_kind):
    user_model = get_user_model()
    delegated_admin = user_model.objects.create_user(
        email=f"delegated-{target_kind}@example.com",
        password="pw12345!",
        is_staff=True,
    )
    delegated_admin.user_permissions.add(
        Permission.objects.get(
            content_type__app_label="accounts",
            codename="change_user",
        ),
        Permission.objects.get(
            content_type__app_label="accounts",
            codename="delete_user",
        ),
    )
    if target_kind == "staff":
        target = user_model.objects.create_user(
            email="staff-target@example.com",
            is_staff=True,
        )
    else:
        target = user_model.objects.create_superuser(
            email="superuser-target@example.com",
            password="pw12345!",
        )
    client.force_login(delegated_admin)

    urls = [
        reverse("admin:accounts_user_change", args=[target.pk]),
        reverse("admin:auth_user_password_change", args=[target.pk]),
        reverse("admin:accounts_user_delete", args=[target.pk]),
    ]

    assert [client.get(url).status_code for url in urls] == [403, 403, 403]


@pytest.mark.django_db
def test_delegated_admin_can_change_ordinary_account(client):
    user_model = get_user_model()
    delegated_admin = user_model.objects.create_user(
        email="delegated@example.com",
        password="pw12345!",
        is_staff=True,
    )
    delegated_admin.user_permissions.add(
        Permission.objects.get(
            content_type__app_label="accounts",
            codename="change_user",
        )
    )
    target = user_model.objects.create_user(email="ordinary@example.com")
    client.force_login(delegated_admin)

    response = client.get(reverse("admin:accounts_user_change", args=[target.pk]))

    assert response.status_code == 200
    user_admin = admin.site._registry[user_model]
    request = RequestFactory().get("/")
    request.user = delegated_admin
    assert "is_validated" in user_admin.get_readonly_fields(request, target)


@pytest.mark.django_db
def test_superuser_can_administer_privileged_account(client):
    user_model = get_user_model()
    superuser = user_model.objects.create_superuser(
        email="root@example.com",
        password="pw12345!",
    )
    target = user_model.objects.create_superuser(
        email="other-root@example.com",
        password="pw12345!",
    )
    client.force_login(superuser)

    assert client.get(reverse("admin:accounts_user_change", args=[target.pk])).status_code == 200

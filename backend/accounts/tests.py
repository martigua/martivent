import pytest
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
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

    assert user.email == "Coach@martigua.fr"
    assert user.get_username() == "Coach@martigua.fr"
    assert user.check_password("pw12345!")


@pytest.mark.django_db
def test_superuser_flags_are_enforced():
    user_model = get_user_model()
    superuser = user_model.objects.create_superuser(
        email="admin@martigua.fr",
        password="pw12345!",
    )

    assert superuser.is_staff
    assert superuser.is_superuser

    with pytest.raises(ValueError, match="is_staff=True"):
        user_model.objects.create_superuser(
            email="invalid@martigua.fr",
            password="pw12345!",
            is_staff=False,
        )


@pytest.mark.django_db
def test_password_login_creates_session(client):
    user = get_user_model().objects.create_user(
        email="member@martigua.fr",
        password="pw12345!",
    )

    response = client.post(
        "/accounts/login/",
        {"login": user.email, "password": "pw12345!"},
    )

    assert response.status_code == 302
    assert response.headers["Location"] == "/"
    assert client.get("/api/me/").json()["email"] == user.email


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

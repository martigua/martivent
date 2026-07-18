import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission

from access.models import Grant, OrganizationalGroup, Role, RoleAssignment


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
    }

import pytest
from pydantic import ValidationError

from config.env import Env, env


def make_env(**overrides):
    values = {
        "secret_key": "test-secret",
        "debug": False,
        "allowed_hosts": "localhost",
        "database_url": "postgresql://user:password@localhost:5432/database",
        "google_client_id": None,
        "google_client_secret": None,
    }
    return Env(**(values | overrides))


def test_google_authentication_is_optional():
    env = make_env()

    assert env.google_enabled is False


def test_blank_google_credentials_are_treated_as_absent():
    env = make_env(
        google_client_id="",
        google_client_secret="  ",
    )

    assert env.google_enabled is False


def test_google_authentication_requires_both_credentials():
    env = make_env(
        google_client_id="client-id",
        google_client_secret="client-secret",
    )

    assert env.google_enabled is True


@pytest.mark.parametrize(
    ("google_client_id", "google_client_secret"),
    [
        ("client-id", None),
        (None, "client-secret"),
    ],
)
def test_google_authentication_rejects_partial_configuration(
    google_client_id,
    google_client_secret,
):
    with pytest.raises(ValidationError, match="Google OAuth credentials"):
        make_env(
            google_client_id=google_client_id,
            google_client_secret=google_client_secret,
        )


def test_healthz_ok(client):
    response = client.get("/healthz")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_application_context_is_public_and_backend_owned(client):
    response = client.get("/api/context/")

    assert response.status_code == 200
    assert response.json() == {
        "club": {
            "name": "Martigua Sports Culture Loisirs",
            "sport": "Handball",
            "location": "Paris 19e",
            "founded_year": 1978,
            "team_count": 7,
            "licensed_member_count": 230,
            "stats": [
                {"label": "Fondé en", "value": "1978"},
                {"label": "Équipes", "value": "7"},
                {"label": "Licencié·es", "value": "230"},
            ],
        },
        "authentication": {
            "google": env.google_enabled,
        },
    }


def test_openapi_schema_available(client):
    response = client.get("/api/schema/")

    assert response.status_code == 200

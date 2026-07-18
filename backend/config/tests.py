import json
import os
import subprocess
import sys

import pytest
from django.conf import settings
from django.test import RequestFactory, override_settings
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


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("secret_key", "   "),
        ("allowed_hosts", " , "),
    ],
)
def test_required_string_configuration_rejects_blank_values(field, value):
    with pytest.raises(ValidationError):
        make_env(**{field: value})


def test_database_url_query_parameters_are_preserved():
    configured = make_env(
        database_url=(
            "postgresql://user:password@localhost:5432/database?sslmode=require&connect_timeout=10"
        )
    )

    assert configured.database["OPTIONS"] == {
        "sslmode": "require",
        "connect_timeout": "10",
    }


@override_settings(
    ALLOWED_HOSTS=["martivent.example"],
    SECURE_PROXY_SSL_HEADER=("HTTP_X_FORWARDED_PROTO", "https"),
    USE_X_FORWARDED_HOST=True,
)
def test_railway_forwarded_headers_mark_request_secure_and_preserve_host():
    request = RequestFactory().get(
        "/accounts/google/login/",
        HTTP_X_FORWARDED_PROTO="https",
        HTTP_X_FORWARDED_HOST="martivent.example",
    )

    assert request.is_secure()
    assert request.get_host() == "martivent.example"


def test_proxy_security_settings_are_enabled():
    assert settings.SECURE_PROXY_SSL_HEADER == (
        "HTTP_X_FORWARDED_PROTO",
        "https",
    )
    assert settings.USE_X_FORWARDED_HOST is True


@pytest.mark.parametrize(
    ("debug", "expected_secure"),
    [
        ("true", False),
        ("false", True),
    ],
)
def test_cookie_security_follows_debug_mode(debug, expected_secure):
    process_environment = os.environ | {
        "SECRET_KEY": "test-secret",
        "DEBUG": debug,
        "ALLOWED_HOSTS": "localhost",
        "DATABASE_URL": "postgresql://user:password@localhost:5432/database",
        "GOOGLE_CLIENT_ID": "",
        "GOOGLE_CLIENT_SECRET": "",
    }
    result = subprocess.run(
        [
            sys.executable,
            "-c",
            (
                "import json; "
                "from django.conf import settings; "
                "print(json.dumps({"
                "'csrf': settings.CSRF_COOKIE_SECURE, "
                "'session': settings.SESSION_COOKIE_SECURE"
                "}))"
            ),
        ],
        check=True,
        capture_output=True,
        env=process_environment,
        text=True,
    )

    assert json.loads(result.stdout) == {
        "csrf": expected_secure,
        "session": expected_secure,
    }


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

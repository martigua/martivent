# Martivent backend

Django REST API for Martivent. It runs on Python 3.13, Django 5.2, Django REST
Framework, and PostgreSQL 16. Dependencies and development tools are managed by
`uv`.

All commands below run inside the development container from
`/workspace/backend`.

## Setup and commands

```bash
uv sync
uv run python manage.py migrate
uv run python manage.py runserver 0.0.0.0:8000
```

Useful development commands:

```bash
uv run python manage.py check
uv run python manage.py makemigrations
uv run python manage.py createsuperuser
uv run pytest -v
uv run ruff check .
uv run ruff format --check .
uv run pre-commit run --all-files
```

Generate Django boilerplate with Django itself:

```bash
uv run python manage.py startapp <app_name>
```

Then register the app in `config/settings.py`, add its tests and administration,
and generate migrations with `makemigrations`. Add the app to the table below
when its responsibility becomes part of the backend architecture.

## Applications

| Application | Responsibility |
| --- | --- |
| `config` | Environment-backed settings, root URLs, health check, ASGI, and WSGI |
| `accounts` | Email-based `User` model and the authenticated current-user API |
| `access` | Roles, organizational groups, scoped grants, and authorization decisions |
| `features` | Named feature variants and ordered audience rules |

## HTTP surface

| Path | Purpose |
| --- | --- |
| `GET /healthz` | Liveness check |
| `/admin/` | Django administration |
| `POST /accounts/login/` | Password login and session creation |
| `POST /accounts/logout/` | Session logout |
| `POST /accounts/google/login/` | Start Google OAuth login when configured |
| `GET /api/context/` | Public club, display-stat, and authentication context |
| `GET /api/schema/` | Generated OpenAPI schema |
| `GET /api/me/` | Authenticated user, effective capabilities, and feature variants |

The API currently uses Django session authentication. The backend is the
authority for every protected action. Client-side capability and feature checks
control presentation only.

`GET /api/context/` is the frontend's single source for general application
data. Its ordered `club.stats` entries include both labels and values so the
frontend only renders them. The current club values are backend constants;
the serializer-backed response is also represented in the OpenAPI schema.

The Django admin uses a small backend-owned subset of the design-system tokens.
It intentionally does not depend on Angular assets.

## Environment

`config/env.py` reads these process environment variables. The first four are
required. Docker Compose supplies local values; the deployment platform
supplies production values.

| Variable | Meaning |
| --- | --- |
| `SECRET_KEY` | Django cryptographic signing secret |
| `DEBUG` | Django debug mode |
| `ALLOWED_HOSTS` | Comma-separated accepted host names |
| `DATABASE_URL` | PostgreSQL connection URL |
| `GOOGLE_CLIENT_ID` | Optional Google OAuth web client ID |
| `GOOGLE_CLIENT_SECRET` | Optional Google OAuth web client secret |

There are intentionally no application defaults for the core values. Google
login is disabled when both Google variables are absent or blank. Defining only
one Google variable stops startup because the configuration is incomplete.

## Google login

Google login is configured from environment variables and uses PKCE. A verified
Google email matching a password account authenticates and connects that
existing user. To enable it in an environment:

1. In Google Cloud Console, create an OAuth client with application type
   **Web application**.
2. Add `http://localhost:8001/accounts/google/login/callback/` as a local
   redirect URI. Add `https://<railway-host>/accounts/google/login/callback/`
   for Railway.
3. Export both variables before recreating the development service when testing
   Google locally. Set both variables in Railway and redeploy to enable Google
   login there.

Credentials are configured only through settings; do not also create a Google
`SocialApp` in Django admin, because duplicate provider configuration is
ambiguous.

## Authorization

Authorization uses Django `Permission` objects as capabilities, identified as
`<app_label>.<codename>`, for example `accounts.change_user`.

A grant has:

- exactly one recipient: a user, role, or organizational group;
- one capability;
- an optional organizational scope;
- an optional exact model-object target.

Grants are additive: there are no deny rules. A role assignment may further
restrict a role grant's scope. Parent scopes cover descendants, and removing
one source does not remove the same capability received from another source.
Superusers bypass grant evaluation.

Use the decision function outside DRF:

```python
from access.decisions import decide

decision = decide(
    user,
    "accounts.change_user",
    scope=team,
    target=member,
)
```

Use the permission factory on a DRF view:

```python
from access.permissions import has_capability

permission_classes = [
    has_capability(
        "accounts.change_user",
        scope_getter=lambda request, view: view.team,
        target_getter=lambda request, view: view.member,
    )
]
```

`GET /api/me/` returns effective non-targeted capabilities with their
independent direct, role, group, or superuser sources. This provenance lets an
administration interface explain why a user has a capability.

## Feature variants

A feature declares named variants and a default variant. Its ordered rules may
target everyone, one user, one role, or one organizational group, optionally
within an organizational scope. The matching rule with the lowest priority
number wins; otherwise the default is returned.

Features control rollout and presentation, never authorization. A protected
backend variant must therefore compose both checks:

```python
from access.permissions import has_capability
from features.permissions import feature_variant

permission_classes = [
    has_capability("accounts.view_user"),
    feature_variant("dashboard", "v2"),
]
```

DRF combines the list with AND semantics. An unavailable backend feature
variant returns `404` so disabled implementations are not exposed.

## Documentation rule

Documentation describes working code only. Update this README when a backend
command, required environment variable, application boundary, public endpoint,
or cross-application invariant changes.

Do not add a README to every Django app by default. Add scoped documentation
only when an app develops a non-obvious workflow or contract that cannot be
summarized clearly here.

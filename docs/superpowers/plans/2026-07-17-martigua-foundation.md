# Martigua Foundation Implementation Plan

> **Superseded for execution:** This Claude-generated plan is retained as a
> detailed design reference. Day-to-day work now follows the
> [guided execution plan](2026-07-17-martigua-foundation-guided.md), which
> separates framework-generated boilerplate from project-specific changes and
> adds a user review gate after every small step.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a deployable Django + Angular skeleton — custom user, feature-flag mechanism, design system, one rendered page, CI, and Railway deploy — with no club features, so every later sub-project is just add-a-model-view-component to a working pipeline.

**Architecture:** One origin. Django (gunicorn) serves the DRF API under `/api/`, the admin under `/admin/`, allauth under `/accounts/`, and the compiled Angular SPA everywhere else via WhiteNoise. Postgres 16 behind the ORM. A Docker multi-stage build compiles Angular in a Node stage and copies the output into the Python image; the same Dockerfile runs locally (compose) and on Railway.

**Tech Stack:** Angular (standalone, signals, plain CSS, no UI kit), Django 5.2 LTS + DRF + drf-spectacular, django-allauth, pydantic-settings, WhiteNoise, psycopg 3, gunicorn, pytest + pytest-django, ruff, Docker, GitHub Actions, Railway. **Runtimes: Python 3.13, Node 24 (active LTS).** Pin the exact Angular major at the frontend step (Task 6) to the then-current release; it must support Node 24.

## Global Constraints

Copied verbatim from the approved spec. Every task's requirements implicitly include this section.

- **Runtime dependencies, complete and closed list:** `django`, `djangorestframework`, `drf-spectacular`, `django-allauth`, `pydantic-settings`, `whitenoise`, `psycopg`, `gunicorn`. Dev-only: `pytest`, `pytest-django`, `ruff`. Adding any other runtime library requires an explicit decision; do not add one silently.
- **Frontend:** Angular with signals, plain CSS. No UI kit, no state library, no CSS framework (no Angular Material, PrimeNG, Tailwind, Bootstrap, NgRx).
- **Mobile-first, responsive.** The site must be fully usable on phone and desktop. Author CSS mobile-first: base styles target the small screen, and `min-width` media queries layer on larger layouts (never `max-width` walk-backs). Every design-system component and page ships responsive; a viewport meta tag is present. Touch targets at least ~44px.
- **Tooling:** dependencies and lockfile via `uv` (`uv sync`, `uv run`); `uv.lock` is committed. No pip/requirements.txt.
- **Design tokens are two-tier.** Tier 1 = primitives (raw hex). Tier 2 = semantic (`var(--...)` of tier 1). **Components reference tier 2 only, never tier 1.**
- **Fonts self-hosted** via `@font-face` (Bebas Neue display, Inter body). Never the Google Fonts CDN (French GDPR exposure).
- **Disabled feature returns HTTP 404, never 403.** Applies to both the DRF permission and the view decorator.
- **Single origin.** No CORS library, no JWT, no localStorage tokens. Session cookie, `HttpOnly`, `SameSite=Lax`.
- **Custom user model set before the first migration.** `AUTH_USER_MODEL = "accounts.User"`, email is the login identifier. This is Task 1 and cannot be reordered after any migration runs.
- **Postgres major version pinned to 16** locally and in prod.
- **Error handling:** no bare `except:`, no catch-all log-and-continue. `pydantic-settings` must fail at boot on bad config, not read a silent default.
- **Palette (tier 1 values):** `--yellow-500:#f5c800; --yellow-600:#d4a900; --white:#ffffff; --neutral-950:#0d0d0d; --neutral-900:#1a1a1a; --neutral-800:#2e2e2e; --neutral-400:#888888; --green-500:#22c55e; --red-500:#ef4444; --blue-500:#3b82f6`.

---

## File Structure

```
martivent/
├── Dockerfile.dev                 dev container image (python 3.13 + node 24 + uv + fish)
├── docker-compose.dev.yml         dev + db services for local work
├── docker/dev/fish/config.fish    dev shell config
├── Dockerfile                     multi-stage prod: node build -> python runtime
├── docker-compose.yml             web + postgres:16 (prod parity, local)
├── railway.json                   Railway deploy config
├── .gitignore
├── .github/workflows/ci.yml       ruff, pytest, ng build, ng test
├── backend/
│   ├── pyproject.toml             Python deps (uv) + ruff/pytest config
│   ├── uv.lock                    committed lockfile
│   ├── manage.py
│   ├── entrypoint.sh              migrate then gunicorn
│   ├── config/
│   │   ├── __init__.py
│   │   ├── env.py                 pydantic-settings Env + FeatureFlags
│   │   ├── settings.py
│   │   ├── urls.py
│   │   ├── wsgi.py
│   │   ├── health.py              /healthz
│   │   └── spa.py                 SPA index catch-all view
│   ├── accounts/
│   │   ├── __init__.py
│   │   ├── models.py              User (email identifier) + UserManager
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── migrations/
│   │   └── tests.py
│   └── features/
│       ├── __init__.py
│       ├── models.py              SectionVisibility
│       ├── flags.py               is_enabled, all_flags, cache
│       ├── permissions.py         feature_required, requires_feature
│       ├── signals.py             cache invalidation on save
│       ├── views.py               GET /api/flags/
│       ├── urls.py
│       ├── admin.py
│       ├── apps.py
│       ├── migrations/
│       └── tests.py
└── frontend/                      Angular workspace (ng new output)
    ├── proxy.conf.json            dev: /api -> :8000
    ├── karma.conf.js              ChromeHeadlessCI launcher for CI
    └── src/
        ├── styles/
        │   ├── tokens.primitives.css
        │   ├── tokens.semantic.css
        │   └── fonts.css
        ├── assets/fonts/          self-hosted .woff2
        └── app/
            ├── ui/
            │   ├── button/
            │   ├── card/
            │   ├── tag/
            │   ├── section-header/
            │   └── stat-band/
            ├── core/
            │   └── flags.service.ts
            ├── nav/
            ├── home/
            ├── app.component.*
            ├── app.config.ts
            └── app.routes.ts
```

---

### Task 1: Backend skeleton, custom User, first migration

Locks `AUTH_USER_MODEL` into the first migration. Nothing that touches the database may run before this task.

**Progress:** Steps 1–7 complete. Continue at Step 8 (create and inspect the
custom-user migration before applying any migrations).

**Files:**
- Create: `backend/pyproject.toml`
- Create: `backend/uv.lock`
- Create: `backend/manage.py`
- Create: `backend/config/__init__.py`, `backend/config/env.py`, `backend/config/settings.py`, `backend/config/urls.py`, `backend/config/wsgi.py`
- Create: `backend/accounts/__init__.py`, `backend/accounts/apps.py`, `backend/accounts/models.py`, `backend/accounts/admin.py`
- Test: `backend/accounts/tests.py`

**Interfaces:**
- Produces: `accounts.models.User` (subclass of `AbstractUser`, `USERNAME_FIELD="email"`, `REQUIRED_FIELDS=[]`, manager method `create_user(email, password=None, **extra)` and `create_superuser(...)`). `config.env.Env` and `config.env.FeatureFlags` (nested pydantic model with field `selection: bool = False`), module-level `config.env.env` instance, `env.database` property returning a Django `DATABASES["default"]` dict.

- [x] **Step 1: Create `backend/pyproject.toml`**

Declare the closed runtime dependency list under `[project].dependencies`, the
three development dependencies under `[dependency-groups].dev`, and the Ruff
and pytest configuration. Set `[tool.uv] package = false` because the Django
application runs from source and is not a distributable Python package.

- [x] **Step 2: Generate and commit `backend/uv.lock`**

From `backend/`, run `uv sync` and commit the resulting lockfile. Do not create
`requirements.txt` or `requirements-dev.txt`.

- [x] **Step 3: Create `backend/config/env.py`**

```python
from urllib.parse import urlparse

from pydantic import BaseModel
from pydantic_settings import BaseSettings, SettingsConfigDict


class FeatureFlags(BaseModel):
    """Developer-owned env flags. Add one field per unfinished feature; delete on ship."""

    selection: bool = False


class Env(BaseSettings):
    model_config = SettingsConfigDict(env_nested_delimiter="__", extra="ignore")

    secret_key: str = "dev-insecure-do-not-use-in-prod"
    debug: bool = False
    allowed_hosts: str = "localhost,127.0.0.1"
    database_url: str = "postgres://martivent:martivent@db:5432/martivent"
    google_client_id: str = ""
    google_secret: str = ""
    features: FeatureFlags = FeatureFlags()

    @property
    def database(self) -> dict:
        u = urlparse(self.database_url)
        return {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": u.path.lstrip("/"),
            "USER": u.username,
            "PASSWORD": u.password,
            "HOST": u.hostname,
            "PORT": str(u.port or 5432),
        }

    @property
    def hosts(self) -> list[str]:
        return [h.strip() for h in self.allowed_hosts.split(",") if h.strip()]


env = Env()  # built at import: a malformed env crashes boot instead of reading a silent default
```

- [x] **Step 4: Create `backend/config/settings.py`**

```python
from pathlib import Path

from config.env import env

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = env.secret_key
DEBUG = env.debug
ALLOWED_HOSTS = env.hosts

FEATURES = env.features

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.sites",
    "rest_framework",
    "drf_spectacular",
    "allauth",
    "allauth.account",
    "allauth.socialaccount",
    "accounts",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "allauth.account.middleware.AccountMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
SITE_ID = 1

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

DATABASES = {"default": env.database}

AUTH_USER_MODEL = "accounts.User"

AUTHENTICATION_BACKENDS = [
    "django.contrib.auth.backends.ModelBackend",
    "allauth.account.auth_backends.AuthenticationBackend",
]

REST_FRAMEWORK = {
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.SessionAuthentication",
    ],
}

SPECTACULAR_SETTINGS = {"TITLE": "Martigua API", "VERSION": "0.1.0"}

# allauth password authentication. Google provider registration ships in Task 5.
ACCOUNT_LOGIN_METHODS = {"email"}
ACCOUNT_SIGNUP_FIELDS = ["email*", "password1*", "password2*"]
LOGIN_REDIRECT_URL = "/"
ACCOUNT_LOGOUT_REDIRECT_URL = "/"

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}
# Compiled Angular SPA, copied here by the Dockerfile; served at the root by WhiteNoise.
WHITENOISE_ROOT = BASE_DIR / "spa"
WHITENOISE_INDEX_FILE = True

SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SAMESITE = "Lax"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
USE_TZ = True
TIME_ZONE = "Europe/Paris"
LANGUAGE_CODE = "fr-fr"
```

- [x] **Step 5: Create `backend/config/urls.py`, `wsgi.py`, `manage.py`**

`backend/config/urls.py`:
```python
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("accounts/", include("allauth.urls")),
]
```

`backend/config/wsgi.py`:
```python
import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
application = get_wsgi_application()
```

`backend/manage.py`:
```python
#!/usr/bin/env python
import os
import sys


def main():
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
    from django.core.management import execute_from_command_line

    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
```

- [x] **Step 6: Create the `accounts` app**

`backend/accounts/__init__.py`: empty.

`backend/accounts/apps.py`:
```python
from django.apps import AppConfig


class AccountsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "accounts"
```

`backend/accounts/models.py`:
```python
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models


class UserManager(BaseUserManager):
    use_in_migrations = True

    def create_user(self, email, password=None, **extra):
        if not email:
            raise ValueError("Email is required")
        user = self.model(email=self.normalize_email(email), **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra):
        extra.setdefault("is_staff", True)
        extra.setdefault("is_superuser", True)
        if extra.get("is_staff") is not True or extra.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_staff and is_superuser True")
        return self.create_user(email, password, **extra)


class User(AbstractUser):
    username = None
    email = models.EmailField(unique=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    def __str__(self):
        return self.email
```

`backend/accounts/admin.py`:
```python
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    ordering = ("email",)
    list_display = ("email", "is_staff", "is_superuser")
    search_fields = ("email",)
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
    )
    add_fieldsets = (
        (None, {"classes": ("wide",), "fields": ("email", "password1", "password2")}),
    )
```

- [x] **Step 7: Write the failing test**

`backend/accounts/tests.py`:
```python
import pytest
from django.contrib.auth import get_user_model


@pytest.mark.django_db
def test_user_uses_email_as_identifier():
    User = get_user_model()
    user = User.objects.create_user(email="Coach@Martigua.fr", password="pw12345!")
    assert user.email == "Coach@martigua.fr"  # normalize_email lowercases the domain
    assert user.get_username() == "Coach@martigua.fr"
    assert user.check_password("pw12345!")


@pytest.mark.django_db
def test_superuser_flags():
    User = get_user_model()
    superuser = User.objects.create_superuser(
        email="admin@martigua.fr",
        password="pw12345!",
    )
    assert superuser.is_staff
    assert superuser.is_superuser
```

- [ ] **Step 8: Create the first migration and verify the test fails first**

The test cannot pass before the migration exists. Create it, then run:
```bash
pip install -r requirements-dev.txt
python backend/manage.py makemigrations accounts
```
Expected: creates `backend/accounts/migrations/0001_initial.py` containing the custom `User`. Confirm this migration exists and references `accounts.User` before running any other migration anywhere.

- [ ] **Step 9: Run the test to verify it passes**

Requires a running Postgres 16 (see Task 8 for compose; until then use any local Postgres 16 with the default credentials in `env.py`).
```bash
pytest backend/accounts/tests.py -v
```
Expected: 2 passed.

- [ ] **Step 10: Verify project checks clean**

```bash
python backend/manage.py check
ruff check .
```
Expected: `System check identified no issues`; ruff reports no errors.

- [ ] **Step 11: Commit**

```bash
git add pyproject.toml requirements*.txt backend/
git commit -m "feat(foundation): django skeleton, custom email user, pydantic-settings env"
```

---

### Task 2: DRF wiring, health check, OpenAPI schema

**Files:**
- Create: `backend/config/health.py`
- Modify: `backend/config/urls.py`
- Test: `backend/config/tests.py`

**Interfaces:**
- Consumes: `config.urls.urlpatterns` from Task 1.
- Produces: `GET /healthz` -> 200 `{"status": "ok"}`; `GET /api/schema/` -> 200 (OpenAPI); routes under `/api/` reserved for later tasks.

- [ ] **Step 1: Write the failing test**

`backend/config/tests.py`:
```python
import pytest


def test_healthz_ok(client):
    r = client.get("/healthz")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


@pytest.mark.django_db
def test_openapi_schema_available(client):
    r = client.get("/api/schema/")
    assert r.status_code == 200
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pytest backend/config/tests.py -v
```
Expected: FAIL (404 on `/healthz`).

- [ ] **Step 3: Create the health view**

`backend/config/health.py`:
```python
from django.http import JsonResponse


def healthz(request):
    return JsonResponse({"status": "ok"})
```

- [ ] **Step 4: Wire routes**

`backend/config/urls.py`:
```python
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView

from .health import healthz

urlpatterns = [
    path("healthz", healthz),
    path("admin/", admin.site.urls),
    path("accounts/", include("allauth.urls")),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
]
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
pytest backend/config/tests.py -v
```
Expected: 2 passed.

- [ ] **Step 6: Commit**

```bash
git add backend/config/
git commit -m "feat(foundation): healthz endpoint and OpenAPI schema route"
```

---

### Task 3: Feature-flag model, evaluator, cache invalidation

**Files:**
- Create: `backend/features/__init__.py`, `apps.py`, `models.py`, `flags.py`, `signals.py`, `admin.py`
- Modify: `backend/config/settings.py`
- Test: `backend/features/tests.py`

**Interfaces:**
- Consumes: `settings.FEATURES` (a `FeatureFlags` pydantic instance) from Task 1.
- Produces:
  - `features.models.SectionVisibility` (fields: `key` SlugField unique, `enabled` Boolean default False, `label` CharField, `help_text` TextField blank).
  - `features.flags.is_enabled(key: str) -> bool`
  - `features.flags.all_flags() -> dict[str, bool]`
  - Cache auto-invalidated on `SectionVisibility` save/delete.

- [ ] **Step 1: Create the app**

Add `"features"` to `INSTALLED_APPS` in `backend/config/settings.py` as part of
this step. It must not be registered before the package exists.

`backend/features/__init__.py`: empty.

`backend/features/apps.py`:
```python
from django.apps import AppConfig


class FeaturesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "features"

    def ready(self):
        from . import signals  # noqa: F401  (registers cache-invalidation receivers)
```

`backend/features/models.py`:
```python
from django.db import models


class SectionVisibility(models.Model):
    """Bureau-owned, permanent flags controlling which sections of the site are live."""

    key = models.SlugField(unique=True)
    enabled = models.BooleanField(default=False)
    label = models.CharField(max_length=120)
    help_text = models.TextField(blank=True)

    class Meta:
        verbose_name = "section visibility"
        verbose_name_plural = "section visibilities"

    def __str__(self):
        return f"{self.label} ({'on' if self.enabled else 'off'})"
```

- [ ] **Step 2: Write the evaluator**

`backend/features/flags.py`:
```python
from django.conf import settings
from django.core.cache import cache

from .models import SectionVisibility

_CACHE_KEY = "features:section_visibility"
_CACHE_TTL = 300


def _db_flags() -> dict[str, bool]:
    flags = cache.get(_CACHE_KEY)
    if flags is None:
        flags = dict(SectionVisibility.objects.values_list("key", "enabled"))
        cache.set(_CACHE_KEY, flags, _CACHE_TTL)
    return flags


def invalidate() -> None:
    cache.delete(_CACHE_KEY)


def is_enabled(key: str) -> bool:
    env = settings.FEATURES.model_dump()
    if key in env and env[key] is False:
        return False  # env off is a hard off; the database cannot override it
    return _db_flags().get(key, False)


def all_flags() -> dict[str, bool]:
    keys = set(settings.FEATURES.model_dump()) | set(_db_flags())
    return {k: is_enabled(k) for k in keys}
```

`backend/features/signals.py`:
```python
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from .flags import invalidate
from .models import SectionVisibility


@receiver(post_save, sender=SectionVisibility)
@receiver(post_delete, sender=SectionVisibility)
def _clear_flag_cache(sender, **kwargs):
    invalidate()
```

`backend/features/admin.py`:
```python
from django.contrib import admin

from .models import SectionVisibility


@admin.register(SectionVisibility)
class SectionVisibilityAdmin(admin.ModelAdmin):
    list_display = ("label", "key", "enabled")
    list_editable = ("enabled",)
    search_fields = ("key", "label")
```

- [ ] **Step 3: Write the failing tests**

`backend/features/tests.py`:
```python
import pytest
from django.core.cache import cache

from config.env import FeatureFlags
from features.flags import all_flags, is_enabled
from features.models import SectionVisibility


@pytest.fixture(autouse=True)
def _clear_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.mark.django_db
def test_env_off_masks_db_on(settings):
    settings.FEATURES = FeatureFlags(selection=False)
    SectionVisibility.objects.create(key="selection", enabled=True, label="Sel")
    assert is_enabled("selection") is False


@pytest.mark.django_db
def test_db_flag_when_absent_from_env():
    SectionVisibility.objects.create(key="adhesion", enabled=True, label="Adhésion")
    assert is_enabled("adhesion") is True


@pytest.mark.django_db
def test_cache_invalidated_on_save():
    sv = SectionVisibility.objects.create(key="adhesion", enabled=False, label="Adhésion")
    assert is_enabled("adhesion") is False
    sv.enabled = True
    sv.save()
    assert is_enabled("adhesion") is True


@pytest.mark.django_db
def test_all_flags_merges_env_and_db(settings):
    settings.FEATURES = FeatureFlags(selection=False)
    SectionVisibility.objects.create(key="adhesion", enabled=True, label="Adhésion")
    assert all_flags() == {"selection": False, "adhesion": True}
```

- [ ] **Step 4: Make the migration and run the tests**

```bash
python backend/manage.py makemigrations features
pytest backend/features/tests.py -v
```
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add backend/features/
git commit -m "feat(foundation): SectionVisibility flag model, evaluator, cache invalidation"
```

---

### Task 4: Flag adapters and `/api/flags/`

Refines the spec's evaluator snippet: the DRF permission **raises `Http404`** rather than returning `False`, because the spec's error-handling rule requires disabled features to 404, not 403.

**Files:**
- Create: `backend/features/permissions.py`, `backend/features/views.py`, `backend/features/urls.py`
- Modify: `backend/config/urls.py`
- Test: append to `backend/features/tests.py`

**Interfaces:**
- Consumes: `features.flags.is_enabled`, `features.flags.all_flags` from Task 3.
- Produces:
  - `features.permissions.feature_required(key) -> type[BasePermission]` (raises `Http404` when the flag is off) — for DRF viewsets.
  - `features.permissions.requires_feature(key)` decorator (raises `Http404` when off) — for plain function views.
  - `GET /api/flags/` -> 200, JSON object mapping flag key to bool (`AllowAny`).

- [ ] **Step 1: Write the adapters**

`backend/features/permissions.py`:
```python
from functools import wraps

from django.http import Http404
from rest_framework.permissions import BasePermission

from .flags import is_enabled


def feature_required(key: str) -> type[BasePermission]:
    """DRF permission: 404 (not 403) when the feature is off, so disabled endpoints stay invisible."""

    class _FeatureEnabled(BasePermission):
        def has_permission(self, request, view):
            if not is_enabled(key):
                raise Http404
            return True

    return _FeatureEnabled


def requires_feature(key: str):
    """Decorator for plain function views: 404 when the feature is off."""

    def deco(fn):
        @wraps(fn)
        def wrapper(request, *args, **kwargs):
            if not is_enabled(key):
                raise Http404
            return fn(request, *args, **kwargs)

        return wrapper

    return deco
```

- [ ] **Step 2: Write the endpoint**

`backend/features/views.py`:
```python
from drf_spectacular.utils import OpenApiTypes, extend_schema
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .flags import all_flags


@extend_schema(responses=OpenApiTypes.OBJECT)
@api_view(["GET"])
@permission_classes([AllowAny])
def flags_view(request):
    return Response(all_flags())
```

`backend/features/urls.py`:
```python
from django.urls import path

from .views import flags_view

urlpatterns = [path("flags/", flags_view, name="flags")]
```

- [ ] **Step 3: Wire into the API root**

`backend/config/urls.py` — add the include (final file):
```python
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView

from .health import healthz

urlpatterns = [
    path("healthz", healthz),
    path("admin/", admin.site.urls),
    path("accounts/", include("allauth.urls")),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/", include("features.urls")),
]
```

- [ ] **Step 4: Write the failing tests (append to `backend/features/tests.py`)**

```python
from django.http import Http404
from django.test import RequestFactory


@pytest.mark.django_db
def test_permission_raises_404_when_off(settings):
    settings.FEATURES = FeatureFlags(selection=False)
    from features.permissions import feature_required

    perm = feature_required("selection")()
    with pytest.raises(Http404):
        perm.has_permission(RequestFactory().get("/"), view=None)


@pytest.mark.django_db
def test_decorator_raises_404_when_off(settings):
    settings.FEATURES = FeatureFlags(selection=False)
    from features.permissions import requires_feature

    @requires_feature("selection")
    def view(request):
        return "ok"

    with pytest.raises(Http404):
        view(RequestFactory().get("/"))


@pytest.mark.django_db
def test_flags_endpoint_returns_merged_map(client, settings):
    settings.FEATURES = FeatureFlags(selection=False)
    SectionVisibility.objects.create(key="adhesion", enabled=True, label="Adhésion")
    r = client.get("/api/flags/")
    assert r.status_code == 200
    assert r.json() == {"selection": False, "adhesion": True}
```

- [ ] **Step 5: Run the whole features suite**

```bash
pytest backend/features/tests.py -v
```
Expected: 7 passed.

- [ ] **Step 6: Commit**

```bash
git add backend/features/ backend/config/urls.py
git commit -m "feat(foundation): flag permission/decorator (404-not-403) and /api/flags/"
```

---

### Task 5: Auth — allauth password login + Google provider config

Google requires a Google Cloud Console OAuth client (consent screen, client ID/secret, redirect URIs) — this is unavoidable and is operator setup, documented in the step below, not code. Foundation wires the provider and verifies the password path with a test.

**Files:**
- Test: `backend/accounts/tests.py` (append)
- Modify: `backend/config/settings.py`

**Interfaces:**
- Consumes: `accounts.User`, allauth URLs at `/accounts/`.
- Produces: working `POST /accounts/login/` (field name `login`) and `POST /accounts/logout/`; Google provider registered after explicitly resolving its optional dependency set (activation is operator-time via a `SocialApp` or `SOCIALACCOUNT_PROVIDERS["google"]["APP"]` credentials).

- [ ] **Step 1: Write the failing tests (append to `backend/accounts/tests.py`)**

```python
@pytest.mark.django_db
def test_password_login_succeeds(client):
    User = get_user_model()
    User.objects.create_user(email="a@martigua.fr", password="pw12345!")
    r = client.post("/accounts/login/", {"login": "a@martigua.fr", "password": "pw12345!"})
    assert r.status_code == 302  # redirect to LOGIN_REDIRECT_URL on success


@pytest.mark.django_db
def test_password_login_rejects_bad_password(client):
    User = get_user_model()
    User.objects.create_user(email="a@martigua.fr", password="pw12345!")
    r = client.post("/accounts/login/", {"login": "a@martigua.fr", "password": "wrong"})
    assert r.status_code == 200  # re-renders the form with errors, no redirect


@pytest.mark.django_db
def test_logout(client):
    User = get_user_model()
    User.objects.create_user(email="a@martigua.fr", password="pw12345!")
    client.post("/accounts/login/", {"login": "a@martigua.fr", "password": "pw12345!"})
    r = client.post("/accounts/logout/")
    assert r.status_code == 302
```

- [ ] **Step 2: Run the tests**

```bash
pytest backend/accounts/tests.py -v
```
Expected: 5 passed (2 from Task 1 + 3 here). If login returns 200 instead of 302, confirm `ACCOUNT_LOGIN_METHODS = {"email"}` and that the POST uses the field name `login`.

- [ ] **Step 3: Document Google activation (operator runbook, not code)**

Append to `docs/superpowers/specs/2026-07-17-martigua-foundation-design.md` under Auth, or a new `docs/runbooks/google-oauth.md`:
```markdown
## Enabling Google login (operator steps, once per environment)
1. Google Cloud Console -> APIs & Services -> Credentials -> Create OAuth client ID (Web application).
2. Authorized redirect URI: https://<host>/accounts/google/login/callback/
3. Set env vars GOOGLE_CLIENT_ID and GOOGLE_SECRET on the environment.
4. Django admin -> Social applications: confirm one Google app exists for the current Site,
   OR rely on SOCIALACCOUNT_PROVIDERS["google"]["APP"] populated from env (already wired).
```

- [ ] **Step 4: Commit**

```bash
git add backend/accounts/tests.py docs/
git commit -m "feat(foundation): verify allauth password login/logout, document Google setup"
```

---

### Task 6: Angular workspace, design tokens, fonts

`ng new` output is large; commit it as generated, then layer the tokens on top.

**Files:**
- Create: `frontend/` (via `ng new`)
- Create: `frontend/src/styles/tokens.primitives.css`, `tokens.semantic.css`, `fonts.css`
- Create: `frontend/src/assets/fonts/` (.woff2 files, operator-fetched)
- Modify: `frontend/src/styles.css`, `frontend/proxy.conf.json`, `frontend/angular.json`

**Interfaces:**
- Produces: a buildable Angular app; global CSS exposing tier-1 primitives and tier-2 semantic tokens; dev proxy sending `/api` to Django on `:8000`.

- [ ] **Step 1: Generate the workspace**

```bash
cd frontend 2>/dev/null || true
# from repo root:
npx -p @angular/cli@19 ng new martivent-frontend --directory frontend \
  --style=css --routing --ssr=false --skip-git --defaults
```
Expected: `frontend/` created with `src/app`, `angular.json`, `package.json`.

- [ ] **Step 2: Create tier-1 primitives**

`frontend/src/styles/tokens.primitives.css`:
```css
:root {
  --yellow-500: #f5c800;
  --yellow-600: #d4a900;
  --white: #ffffff;
  --neutral-950: #0d0d0d;
  --neutral-900: #1a1a1a;
  --neutral-800: #2e2e2e;
  --neutral-400: #888888;
  --green-500: #22c55e;
  --red-500: #ef4444;
  --blue-500: #3b82f6;
}
```

- [ ] **Step 3: Create tier-2 semantic tokens**

`frontend/src/styles/tokens.semantic.css`:
```css
:root {
  --surface-base: var(--neutral-950);
  --surface-raised: var(--neutral-900);
  --surface-card: var(--neutral-800);
  --text-primary: var(--white);
  --text-muted: var(--neutral-400);
  --action-primary-bg: var(--yellow-500);
  --action-primary-fg: var(--neutral-950);
  --action-primary-hover: var(--yellow-600);
  --border-default: #333333;
  --border-focus: var(--yellow-500);
  --status-ok: var(--green-500);
  --status-danger: var(--red-500);
  --status-info: var(--blue-500);
  --font-display: "Bebas Neue", system-ui, sans-serif;
  --font-body: "Inter", system-ui, sans-serif;
}
```

- [ ] **Step 4: Self-host the fonts**

Fetch the .woff2 files (do not hotlink Google Fonts). Use `google-webfonts-helper` (gwfh.mranftl.com) to download Bebas Neue 400 and Inter 400/600, and place them in `frontend/src/assets/fonts/`.

`frontend/src/styles/fonts.css`:
```css
@font-face {
  font-family: "Bebas Neue";
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url("/assets/fonts/bebas-neue-v14-latin-regular.woff2") format("woff2");
}
@font-face {
  font-family: "Inter";
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url("/assets/fonts/inter-v18-latin-regular.woff2") format("woff2");
}
@font-face {
  font-family: "Inter";
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url("/assets/fonts/inter-v18-latin-600.woff2") format("woff2");
}
```
(Adjust filenames to match what gwfh emits.)

- [ ] **Step 5: Wire globals**

`frontend/src/styles.css` (replace contents):
```css
@import "./styles/tokens.primitives.css";
@import "./styles/tokens.semantic.css";
@import "./styles/fonts.css";

* {
  box-sizing: border-box;
}
html,
body {
  margin: 0;
  background: var(--surface-base);
  color: var(--text-primary);
  font-family: var(--font-body);
}
```

- [ ] **Step 6: Dev proxy**

`frontend/proxy.conf.json`:
```json
{
  "/api": { "target": "http://localhost:8000", "secure": false },
  "/accounts": { "target": "http://localhost:8000", "secure": false }
}
```

In `frontend/angular.json`, under `projects.<name>.architect.serve.options`, add:
```json
"proxyConfig": "proxy.conf.json"
```

- [ ] **Step 7: Verify the build**

```bash
cd frontend && npm run build
```
Expected: build succeeds; output under `frontend/dist/<project-name>/browser/`. Note the exact `<project-name>` — Task 8's Dockerfile copy path depends on it.

- [ ] **Step 8: Commit**

```bash
git add frontend/
git commit -m "feat(foundation): angular workspace, two-tier design tokens, self-hosted fonts"
```

---

### Task 7: Design-system components, flags service, nav, home page

Builds the minimum component set to render one page composed only of design-system components, with a nav item gated by a live feature flag.

**Files:**
- Create: `frontend/src/app/ui/button/button.component.ts`
- Create: `frontend/src/app/ui/card/card.component.ts`
- Create: `frontend/src/app/ui/tag/tag.component.ts`
- Create: `frontend/src/app/ui/section-header/section-header.component.ts`
- Create: `frontend/src/app/ui/stat-band/stat-band.component.ts`
- Create: `frontend/src/app/core/flags.service.ts`
- Create: `frontend/src/app/nav/nav.component.ts`
- Create: `frontend/src/app/home/home.component.ts`
- Modify: `frontend/src/app/app.component.ts` / `.html`, `app.config.ts`, `app.routes.ts`
- Test: `frontend/src/app/core/flags.service.spec.ts`

**Interfaces:**
- Consumes: `GET /api/flags/` from Task 4; semantic tokens from Task 6.
- Produces: `FlagsService` with `flags: Signal<Record<string, boolean>>`, `load(): void`, `isEnabled(key): Signal<boolean>`; standalone components `ButtonComponent` (selector `mg-button`, input `variant: 'primary'|'secondary'`), `CardComponent` (`mg-card`), `TagComponent` (`mg-tag`, input `tone`), `SectionHeaderComponent` (`mg-section-header`, inputs `eyebrow`, `title`, `lead`), `StatBandComponent` (`mg-stat-band`, input `stats: {label:string; value:string}[]`); `NavComponent` (`mg-nav`); `HomeComponent` route at `/`.

- [ ] **Step 1: Button**

`frontend/src/app/ui/button/button.component.ts`:
```ts
import { Component, input } from '@angular/core';

@Component({
  selector: 'mg-button',
  standalone: true,
  template: `<button [class]="variant()"><ng-content /></button>`,
  styles: [`
    button { font: inherit; font-weight: 600; border: 0; border-radius: 8px;
      padding: 0.6rem 1.2rem; cursor: pointer; }
    .primary { background: var(--action-primary-bg); color: var(--action-primary-fg); }
    .primary:hover { background: var(--action-primary-hover); }
    .secondary { background: transparent; color: var(--text-primary);
      border: 1px solid var(--border-default); }
    button:focus-visible { outline: 2px solid var(--border-focus); outline-offset: 2px; }
  `],
})
export class ButtonComponent {
  variant = input<'primary' | 'secondary'>('primary');
}
```

- [ ] **Step 2: Card, Tag**

`frontend/src/app/ui/card/card.component.ts`:
```ts
import { Component } from '@angular/core';

@Component({
  selector: 'mg-card',
  standalone: true,
  template: `<div class="card"><ng-content /></div>`,
  styles: [`
    .card { background: var(--surface-card); border: 1px solid var(--border-default);
      border-radius: 12px; padding: 1.5rem; }
  `],
})
export class CardComponent {}
```

`frontend/src/app/ui/tag/tag.component.ts`:
```ts
import { Component, input } from '@angular/core';

@Component({
  selector: 'mg-tag',
  standalone: true,
  template: `<span [class]="tone()"><ng-content /></span>`,
  styles: [`
    span { display: inline-block; padding: 0.15rem 0.6rem; border-radius: 999px;
      font-size: 0.8rem; font-weight: 600; }
    .neutral { background: var(--surface-raised); color: var(--text-muted); }
    .ok { background: var(--status-ok); color: var(--neutral-950); }
    .info { background: var(--status-info); color: var(--white); }
  `],
})
export class TagComponent {
  tone = input<'neutral' | 'ok' | 'info'>('neutral');
}
```

- [ ] **Step 3: SectionHeader, StatBand**

`frontend/src/app/ui/section-header/section-header.component.ts`:
```ts
import { Component, input } from '@angular/core';

@Component({
  selector: 'mg-section-header',
  standalone: true,
  template: `
    @if (eyebrow()) { <p class="eyebrow">{{ eyebrow() }}</p> }
    <h1>{{ title() }}</h1>
    @if (lead()) { <p class="lead">{{ lead() }}</p> }
  `,
  styles: [`
    .eyebrow { color: var(--action-primary-bg); font-weight: 600;
      letter-spacing: 0.1em; text-transform: uppercase; margin: 0 0 0.5rem; }
    h1 { font-family: var(--font-display); font-size: clamp(2.5rem, 6vw, 4rem);
      margin: 0; letter-spacing: 0.02em; }
    .lead { color: var(--text-muted); max-width: 60ch; margin: 0.75rem 0 0; }
  `],
})
export class SectionHeaderComponent {
  eyebrow = input<string>('');
  title = input.required<string>();
  lead = input<string>('');
}
```

`frontend/src/app/ui/stat-band/stat-band.component.ts`:
```ts
import { Component, input } from '@angular/core';

@Component({
  selector: 'mg-stat-band',
  standalone: true,
  template: `
    <div class="band">
      @for (s of stats(); track s.label) {
        <div class="stat">
          <span class="value">{{ s.value }}</span>
          <span class="label">{{ s.label }}</span>
        </div>
      }
    </div>
  `,
  styles: [`
    .band { display: flex; gap: 2rem; flex-wrap: wrap; }
    .stat { display: flex; flex-direction: column; }
    .value { font-family: var(--font-display); font-size: 2.5rem;
      color: var(--action-primary-bg); }
    .label { color: var(--text-muted); text-transform: uppercase;
      letter-spacing: 0.08em; font-size: 0.8rem; }
  `],
})
export class StatBandComponent {
  stats = input.required<{ label: string; value: string }[]>();
}
```

- [ ] **Step 4: FlagsService**

`frontend/src/app/core/flags.service.ts`:
```ts
import { HttpClient } from '@angular/common/http';
import { Injectable, Signal, computed, inject, signal } from '@angular/core';

type FlagMap = Record<string, boolean>;

@Injectable({ providedIn: 'root' })
export class FlagsService {
  private http = inject(HttpClient);
  private _flags = signal<FlagMap>({});
  readonly flags = this._flags.asReadonly();

  load(): void {
    this.http.get<FlagMap>('/api/flags/').subscribe((f) => this._flags.set(f));
  }

  isEnabled(key: string): Signal<boolean> {
    return computed(() => this._flags()[key] ?? false);
  }
}
```

- [ ] **Step 5: App config, nav, routes**

`frontend/src/app/app.config.ts`:
```ts
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withFetch()),
  ],
};
```

`frontend/src/app/nav/nav.component.ts`:
```ts
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FlagsService } from '../core/flags.service';

@Component({
  selector: 'mg-nav',
  standalone: true,
  imports: [RouterLink],
  template: `
    <nav>
      <a routerLink="/" class="brand">MARTIGUA</a>
      <div class="links">
        <a routerLink="/">Accueil</a>
        @if (adhesion()) { <a routerLink="/">Adhésion</a> }
      </div>
    </nav>
  `,
  styles: [`
    nav { display: flex; justify-content: space-between; align-items: center;
      padding: 1rem 2rem; background: var(--surface-raised);
      border-bottom: 1px solid var(--border-default); }
    .brand { font-family: var(--font-display); font-size: 1.5rem;
      color: var(--action-primary-bg); text-decoration: none; letter-spacing: 0.05em; }
    .links { display: flex; gap: 1.5rem; }
    .links a { color: var(--text-primary); text-decoration: none; }
  `],
})
export class NavComponent {
  private flags = inject(FlagsService);
  adhesion = this.flags.isEnabled('adhesion');
}
```

`frontend/src/app/app.routes.ts`:
```ts
import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';

export const routes: Routes = [{ path: '', component: HomeComponent }];
```

`frontend/src/app/app.component.ts`:
```ts
import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavComponent } from './nav/nav.component';
import { FlagsService } from './core/flags.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavComponent],
  template: `<mg-nav /><main><router-outlet /></main>`,
  styles: [`main { max-width: 1100px; margin: 0 auto; padding: 3rem 2rem; }`],
})
export class AppComponent {
  private flags = inject(FlagsService);
  constructor() {
    this.flags.load();
  }
}
```
(If `ng new` generated `app.component.html`/`.css`, delete them and inline as above, or keep the files and move the template/style there — either is fine; keep it consistent.)

- [ ] **Step 6: Home page (design-system components only)**

`frontend/src/app/home/home.component.ts`:
```ts
import { Component } from '@angular/core';
import { SectionHeaderComponent } from '../ui/section-header/section-header.component';
import { StatBandComponent } from '../ui/stat-band/stat-band.component';
import { CardComponent } from '../ui/card/card.component';
import { ButtonComponent } from '../ui/button/button.component';
import { TagComponent } from '../ui/tag/tag.component';

@Component({
  selector: 'mg-home',
  standalone: true,
  imports: [SectionHeaderComponent, StatBandComponent, CardComponent, ButtonComponent, TagComponent],
  template: `
    <mg-section-header
      eyebrow="Handball Paris 19e"
      title="Martigua Sports Culture Loisirs"
      lead="Club fondé en 1978. Sept équipes, environ 230 licencié·es." />
    <div class="cta">
      <mg-button variant="primary">Nous rejoindre</mg-button>
      <mg-button variant="secondary">Voir les équipes</mg-button>
    </div>
    <mg-stat-band [stats]="stats" />
    <mg-card>
      <mg-tag tone="ok">Fondation</mg-tag>
      <p>Cette page est composée uniquement de composants du design system.</p>
    </mg-card>
  `,
  styles: [`
    .cta { display: flex; gap: 1rem; margin: 2rem 0; }
    mg-card { display: block; margin-top: 2rem; }
  `],
})
export class HomeComponent {
  stats = [
    { label: 'Fondé en', value: '1978' },
    { label: 'Équipes', value: '7' },
    { label: 'Licencié·es', value: '230' },
  ];
}
```

- [ ] **Step 7: Write the flags service test**

`frontend/src/app/core/flags.service.spec.ts`:
```ts
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { FlagsService } from './flags.service';

describe('FlagsService', () => {
  let service: FlagsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(FlagsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('exposes loaded flags and gates by key', () => {
    service.load();
    httpMock.expectOne('/api/flags/').flush({ adhesion: true, selection: false });
    expect(service.isEnabled('adhesion')()).toBe(true);
    expect(service.isEnabled('selection')()).toBe(false);
    expect(service.isEnabled('missing')()).toBe(false);
  });
});
```

- [ ] **Step 8: Run frontend build and test**

```bash
cd frontend
npm run build
npm test -- --watch=false --browsers=ChromeHeadless
```
Expected: build succeeds; the FlagsService spec passes. (Karma CI launcher is configured in Task 9.)

- [ ] **Step 9: Commit**

```bash
git add frontend/src/
git commit -m "feat(foundation): design-system components, flags service, flag-gated nav, home page"
```

---

### Task 8: Single-origin serving + multi-stage Dockerfile + compose

Wires WhiteNoise to serve the compiled SPA at the root, adds the SPA deep-link fallback, and packages everything in one image that runs identically under compose and Railway.

**Files:**
- Create: `backend/config/spa.py`
- Modify: `backend/config/urls.py`
- Create: `Dockerfile`, `.dockerignore`, `docker-compose.yml`, `backend/entrypoint.sh`
- Test: `backend/config/tests.py` (append)

**Interfaces:**
- Consumes: `WHITENOISE_ROOT`/`WHITENOISE_INDEX_FILE` from Task 1; the Angular build output from Task 7.
- Produces: `spa_index` view returning `spa/index.html` for any non-API, non-admin, non-file route; a Docker image serving API + admin + SPA on one port.

- [ ] **Step 1: SPA fallback view**

`backend/config/spa.py`:
```python
from pathlib import Path

from django.conf import settings
from django.http import FileResponse, Http404


def spa_index(request):
    index = Path(settings.WHITENOISE_ROOT) / "index.html"
    if not index.exists():
        raise Http404  # SPA not built into the image
    return FileResponse(open(index, "rb"), content_type="text/html")
```

- [ ] **Step 2: Add the catch-all route (must be last)**

`backend/config/urls.py` (final form):
```python
from django.contrib import admin
from django.urls import include, path, re_path
from drf_spectacular.views import SpectacularAPIView

from .health import healthz
from .spa import spa_index

urlpatterns = [
    path("healthz", healthz),
    path("admin/", admin.site.urls),
    path("accounts/", include("allauth.urls")),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/", include("features.urls")),
    re_path(r"^(?!api/|admin/|accounts/|static/|healthz).*$", spa_index),
]
```

- [ ] **Step 3: Test the fallback (append to `backend/config/tests.py`)**

```python
import pytest
from django.conf import settings


@pytest.fixture
def spa_index_file(tmp_path, settings):
    (tmp_path / "index.html").write_text("<!doctype html><title>SPA</title>")
    settings.WHITENOISE_ROOT = tmp_path
    return tmp_path


def test_deep_link_serves_spa_index(client, spa_index_file):
    r = client.get("/adhesion")
    assert r.status_code == 200
    assert b"SPA" in b"".join(r.streaming_content)


def test_api_route_not_swallowed_by_spa(client):
    r = client.get("/api/schema/")
    assert r.status_code == 200
```

Run:
```bash
pytest backend/config/tests.py -v
```
Expected: 4 passed (2 from Task 2 + 2 here).

- [ ] **Step 4: Entrypoint**

`backend/entrypoint.sh`:
```bash
#!/usr/bin/env sh
set -e
python manage.py migrate --noinput
exec gunicorn config.wsgi:application --bind "0.0.0.0:${PORT:-8000}" --workers 3
```

- [ ] **Step 5: Dockerfile (multi-stage)**

Replace `<project-name>` with the actual Angular project name from Task 6 Step 7.

`Dockerfile`:
```dockerfile
# --- Angular build stage ---
FROM node:24-slim AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# --- Python runtime stage ---
FROM python:3.13-slim AS backend
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./backend/
COPY --from=frontend /app/frontend/dist/<project-name>/browser/ ./backend/spa/
WORKDIR /app/backend
RUN python manage.py collectstatic --noinput
RUN chmod +x entrypoint.sh
CMD ["./entrypoint.sh"]
```

`.dockerignore`:
```
**/node_modules
**/__pycache__
frontend/dist
backend/staticfiles
backend/spa
.git
```

- [ ] **Step 6: docker-compose (prod parity)**

`docker-compose.yml`:
```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: martivent
      POSTGRES_USER: martivent
      POSTGRES_PASSWORD: martivent
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
  web:
    build: .
    environment:
      SECRET_KEY: dev-insecure-do-not-use-in-prod
      DEBUG: "false"
      ALLOWED_HOSTS: localhost,127.0.0.1
      DATABASE_URL: postgres://martivent:martivent@db:5432/martivent
    ports:
      - "8000:8000"
    depends_on:
      - db

volumes:
  pgdata:
```

- [ ] **Step 7: Verify the full image locally**

```bash
docker compose build
docker compose up
```
Expected: migrations run, gunicorn serves. Then in a browser: `http://localhost:8000/` renders the home page, `http://localhost:8000/api/flags/` returns JSON, `http://localhost:8000/admin/` shows the Django admin login. (Per house rule: the plan author does not run this; the operator runs it and confirms.)

- [ ] **Step 8: Commit**

```bash
git add backend/config/ backend/entrypoint.sh Dockerfile .dockerignore docker-compose.yml
git commit -m "feat(foundation): single-origin SPA serving, multi-stage Dockerfile, compose"
```

---

### Task 9: GitHub Actions CI

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `frontend/karma.conf.js` (ChromeHeadlessCI launcher)

**Interfaces:**
- Consumes: `requirements-dev.txt`, `pyproject.toml` (pytest config), the Angular app.
- Produces: a PR-triggered workflow running ruff, pytest (against Postgres 16), `ng build`, and `ng test` headless.

- [ ] **Step 1: Karma CI launcher**

`frontend/karma.conf.js` (create if `ng new` did not emit one; Angular defaults to Karma/Jasmine):
```js
module.exports = function (config) {
  config.set({
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('@angular-devkit/build-angular/plugins/karma'),
    ],
    browsers: ['ChromeHeadlessCI'],
    customLaunchers: {
      ChromeHeadlessCI: { base: 'ChromeHeadless', flags: ['--no-sandbox', '--disable-gpu'] },
    },
    singleRun: true,
    restartOnFileChange: false,
  });
};
```

- [ ] **Step 2: Workflow**

`.github/workflows/ci.yml`:
```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: martivent
          POSTGRES_USER: martivent
          POSTGRES_PASSWORD: martivent
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    env:
      DATABASE_URL: postgres://martivent:martivent@localhost:5432/martivent
      SECRET_KEY: ci-insecure
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.13"
      - run: pip install -r requirements-dev.txt
      - run: ruff check .
      - run: pytest -v

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "24"
      - run: npm ci
        working-directory: frontend
      - run: npm run build
        working-directory: frontend
      - run: npm test -- --watch=false --karma-config karma.conf.js
        working-directory: frontend
```

- [ ] **Step 3: Commit and open a PR to verify CI runs**

```bash
git add .github/workflows/ci.yml frontend/karma.conf.js
git commit -m "ci(foundation): ruff, pytest on postgres 16, ng build, ng test headless"
git push -u origin <feature-branch>
```
Expected: both `backend` and `frontend` jobs run and pass on the PR. (Operator confirms in the GitHub Actions tab.)

---

### Task 10: Railway deploy

**Files:**
- Create: `railway.json`
- Modify: none

**Interfaces:**
- Consumes: the Dockerfile from Task 8 (`entrypoint.sh` runs `migrate` then gunicorn).
- Produces: a Railway service that builds from the Dockerfile and deploys on merge to `main`.

- [ ] **Step 1: Railway config**

`railway.json`:
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": { "builder": "DOCKERFILE", "dockerfilePath": "Dockerfile" },
  "deploy": { "healthcheckPath": "/healthz", "restartPolicyType": "ON_FAILURE" }
}
```

- [ ] **Step 2: Operator setup (Railway dashboard, one-time)**

Documented in `docs/runbooks/railway.md`:
```markdown
## Railway setup (once)
1. New Project -> Deploy from GitHub repo (martigua/martivent), branch main.
2. Add plugin: PostgreSQL 16. Railway injects DATABASE_URL.
3. Service variables:
   - SECRET_KEY = <generated 50+ char secret>
   - DEBUG = false
   - ALLOWED_HOSTS = <your-service>.up.railway.app
   - GOOGLE_CLIENT_ID / GOOGLE_SECRET (when Google login is enabled)
4. Railway auto-deploys on push to main. entrypoint.sh runs migrations on each deploy.
```

- [ ] **Step 3: Verify deploy (operator)**

Merge the Foundation PR to `main`. Expected: Railway builds the Dockerfile, runs migrations, `/healthz` returns 200, and the home page renders at the Railway URL. This is the Foundation exit criterion "merging to main deploys without human action."

- [ ] **Step 4: Commit**

```bash
git add railway.json docs/runbooks/railway.md
git commit -m "chore(foundation): railway dockerfile deploy config and runbook"
```

---

## Self-Review

**1. Spec coverage.**

|Spec requirement|Task|
|----------------|----|
|Docker, ISO local/prod parity|8 (one Dockerfile, compose pins postgres:16)|
|Django skeleton|1|
|Custom User before first migration|1|
|Design system, two-tier tokens, self-hosted fonts|6, 7|
|Feature-flag mechanism (env + DB layers)|3|
|Flag adapters, /api/flags/, 404-not-403|4|
|Password + Google auth in V1|5|
|DRF + drf-spectacular|2, 4|
|pydantic-settings env config, fail-at-boot|1|
|WhiteNoise single-origin serving|8|
|One page from design-system components|7|
|Flag toggleable in admin, hides Angular nav item|3 (admin) + 7 (nav gate) + 4 (API)|
|CI: pytest, ruff, ng build, ng test|9|
|Railway deploy on merge|10|
|Exit criterion "deploy is the real test"|10 Step 3|

All Foundation spec sections map to a task. Items the spec marks out-of-scope (16 other models, object storage, GDPR, drf-pydantic, error tracking, realtime) are correctly absent.

**2. Placeholder scan.** No TBD/TODO/"add error handling"/"similar to Task N". Two operator-time gaps are explicit and legitimate, not code placeholders: the `.woff2` font files (Task 6 Step 4, fetched via gwfh) and `<project-name>` in the Dockerfile copy path (Task 8 Step 5, resolved from Task 6 Step 7's build output). Both are called out with how to resolve them.

**3. Type consistency.** `is_enabled`/`all_flags`/`invalidate` names match across Tasks 3, 4, 8. `FeatureFlags`/`Env`/`env.database` match Tasks 1, 3, 4. `FlagsService.load`/`isEnabled`/`flags` match Tasks 7's service, nav, and spec test. `WHITENOISE_ROOT` is defined in Task 1 settings and read in Task 8's `spa.py`. The `feature_required`/`requires_feature` 404 behavior is stated once (Task 4) and noted as a deliberate refinement of the spec's `return is_enabled(key)` snippet, which would have produced 403.

**One refinement flagged for you:** the spec's evaluator snippet has the DRF permission `return is_enabled(key)` (which yields 403 when off), but the spec's error-handling section mandates 404. Task 4 implements the 404 by raising `Http404` in the permission and decorator. That's the only place the plan intentionally diverges from a spec code sample, and it does so to satisfy a stronger spec rule.

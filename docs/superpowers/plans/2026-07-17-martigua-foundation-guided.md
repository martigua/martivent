# Martigua Foundation Guided Execution Plan

**Goal:** Build the Foundation while making the origin and purpose of every
line understandable.

**Design source:** The approved
[Foundation design](../specs/2026-07-17-martigua-foundation-design.md).

**Historical reference:** The original
[implementation plan](2026-07-17-martigua-foundation.md) contains useful design
detail and example code, but it is not the execution checklist.

## Working agreement

This section governs every phase and overrides conflicting instructions in the
historical plan.

1. The user runs commands that produce output or side effects: generators,
   dependency installation, tests, linters, migrations, builds, servers, and
   deployments.
2. The agent may inspect files and Git state without asking.
3. Before changing code, the agent states one small intended change and why.
4. Framework-generated boilerplate is generated with the framework CLI. It is
   reviewed before any project-specific edit is mixed into it.
5. After each generated or edited file, the agent shows the exact diff and
   explains every added or changed line.
6. The agent stops for user approval after each review gate. It does not
   interpret `next` as approval for more than the next unchecked gate.
7. Tests are proposed with their value and scope. They are only written after
   the user approves writing them.
8. No migration runs before the custom user model and its initial migration
   have been reviewed.
9. No commit, push, deployment, or destructive cleanup happens without explicit
   approval.
10. If a command fails, the user pastes its output. The next step diagnoses
    that failure before adding more code.

## Accepted baseline

These parts have already been reviewed and exercised by the user:

- [x] Development image: Python 3.13, Node 24, PostgreSQL client, uv, zsh.
- [x] Development Compose services: `dev` and PostgreSQL 16.
- [x] Host ports: Django 8001, Angular 4201, PostgreSQL 5433.
- [x] Repository bind-mounted at `/workspace`.
- [x] `backend/pyproject.toml` owns Python dependencies and tool configuration.
- [x] `backend/uv.lock` records the resolved Python environment.
- [x] `uv sync` completed successfully inside the development container.

The design specification remains accepted. The backend implementation after
the dependency baseline is being restarted.

---

## Phase 1: Return to a clean backend scaffold boundary

### Gate 1.1: Review what will be kept and replaced

- [x] Agent shows the current backend tree, Git status, and relevant diffs.
- [x] Keep `backend/pyproject.toml` and `backend/uv.lock`.
- [x] Replace the hand-written/generated mixture under `backend/config/`,
      `backend/accounts/`, and `backend/manage.py`.
- [x] User approves the exact cleanup list.

No file is removed at this gate.

### Gate 1.2: Apply the approved cleanup

- [x] Agent removes only the files approved in Gate 1.1.
- [x] Agent shows the resulting diff and backend tree.
- [x] User approves the clean scaffold boundary.

### Gate 1.3: Generate the Django project

The user runs from `/workspace/backend`:

```bash
uv run django-admin startproject config .
```

- [x] User pastes the command output.
- [x] Agent inventories every generated file.
- [x] Agent explains every generated line, including Django defaults that will
      later change.
- [x] User approves the untouched Django scaffold.

Expected generated structure:

```text
backend/
├── manage.py
└── config/
    ├── __init__.py
    ├── asgi.py
    ├── settings.py
    ├── urls.py
    └── wsgi.py
```

ASGI stays initially because Django generated it. Removing it, if desired, is a
separate reviewed decision.

### Gate 1.4: Check the untouched scaffold

If the user wants a baseline check, the user runs:

```bash
uv run python manage.py check
```

- [x] User pastes the result.
- [x] No migration is run.
- [x] User decides whether the pristine scaffold is worth its own commit.

---

## Phase 2: Configure Django in small, independent changes

Each gate modifies one concern only. After every gate, the agent shows and
explains the exact diff, then stops.

### Gate 2.1: Add typed environment configuration

- [ ] Create `backend/config/env.py`.
- [ ] Read Railway and Docker Compose process environment variables with
      `pydantic-settings`; do not load a `.env` file.
- [ ] Add only the application settings needed immediately: `SECRET_KEY`,
      `DEBUG`, `ALLOWED_HOSTS`, and `DATABASE_URL`.
- [ ] Use explicit development defaults. Injected values override them, and
      malformed injected values fail validation at startup.
- [ ] Keep `DATABASE_URL` unparsed until Gate 2.3.
- [ ] Do not add feature flags or Google credentials yet; they belong to their
      own phases.
- [ ] User reviews every line.

Exact proposed file:

```python
from pydantic_settings import BaseSettings, SettingsConfigDict


class Env(BaseSettings):
    model_config = SettingsConfigDict(case_sensitive=False)

    secret_key: str = "dev-insecure-do-not-use-in-production"
    debug: bool = False
    allowed_hosts: str = "localhost,127.0.0.1"
    database_url: str = "postgresql://martivent:martivent@localhost:5432/martivent"

    @property
    def hosts(self) -> list[str]:
        return [host.strip() for host in self.allowed_hosts.split(",") if host.strip()]


env = Env()
```

### Gate 2.2: Read core Django settings from the environment

- [ ] Change only `SECRET_KEY`, `DEBUG`, and `ALLOWED_HOSTS`.
- [ ] Preserve generated settings unrelated to this concern.
- [ ] User reviews every changed line.

### Gate 2.3: Switch the generated SQLite database to PostgreSQL

- [ ] Replace only the generated `DATABASES` setting.
- [ ] Explain every parsed database URL field.
- [ ] User reviews the diff.
- [ ] No migration is run.

### Gate 2.4: Set locale and time zone

- [ ] Set French language and `Europe/Paris`.
- [ ] Keep timezone-aware datetimes enabled.
- [ ] User reviews the diff.

### Gate 2.5: Add WhiteNoise

- [ ] Add WhiteNoise to installed middleware and static-file settings.
- [ ] Do not add SPA fallback behavior yet.
- [ ] User reviews why middleware ordering matters.

### Gate 2.6: Add DRF and schema dependencies to Django settings

- [ ] Register DRF and drf-spectacular.
- [ ] Add only the minimal DRF/schema configuration.
- [ ] User reviews the diff.

After the user approves the phase, the user may run:

```bash
uv run python manage.py check
```

---

## Phase 3: Generate and customize the user application

The custom user must be complete before the first migration.

### Gate 3.1: Generate the app

The user runs:

```bash
uv run python manage.py startapp accounts
```

- [ ] User pastes the output.
- [ ] Agent inventories and explains the untouched generated app.
- [ ] User approves the generated boilerplate.

### Gate 3.2: Register the app

- [ ] Add only `accounts` to `INSTALLED_APPS`.
- [ ] Prefer the generated `AccountsConfig` entry explicitly.
- [ ] User reviews the one-concern diff.

### Gate 3.3: Introduce the custom user model

- [ ] Add the smallest `AbstractUser` subclass needed to establish the stable
      model boundary.
- [ ] Decide with the user whether email-only login belongs in this same gate or
      a following gate.
- [ ] Set `AUTH_USER_MODEL` before any migration.
- [ ] User reviews every line.

### Gate 3.4: Add the user manager

- [ ] Add email normalization and user/superuser creation behavior.
- [ ] Explain Django manager conventions and migration serialization.
- [ ] User reviews every line.

### Gate 3.5: Configure the Django admin

- [ ] Register the custom user.
- [ ] Modify only fields affected by removing the username identifier.
- [ ] User reviews every line.

### Gate 3.6: Decide and write user tests

Before creating tests, the agent proposes the behaviors worth protecting:

- email is the login identifier;
- email normalization behavior is understood correctly;
- password hashing works;
- superuser flags are enforced.

- [ ] User approves or changes the proposed test scope.
- [ ] Agent writes one test at a time, with a review gate after each.

### Gate 3.7: Generate the first migration

Only after the model, manager, settings, admin, and approved tests are reviewed,
the user runs:

```bash
uv run python manage.py makemigrations accounts
```

- [ ] User pastes the output.
- [ ] Agent explains every operation in `accounts/migrations/0001_initial.py`.
- [ ] User confirms that the migration creates the custom user.

### Gate 3.8: Apply migrations

After migration review, the user runs:

```bash
uv run python manage.py migrate
```

- [ ] User pastes the output.
- [ ] The agent diagnoses any failure before continuing.

### Gate 3.9: Create a local operator account

The user runs:

```bash
uv run python manage.py createsuperuser
```

This is a real local development account, not an application fixture. A
deterministic mock user is added only if a later development or test workflow
earns it.

---

## Phase 4: Add observable backend behavior

### Gate 4.1: Add a health endpoint

- [ ] Propose its behavior.
- [ ] Ask whether to write its test first.
- [ ] Add the minimal view.
- [ ] Add its route separately.
- [ ] User runs the approved check/test.

### Gate 4.2: Add the OpenAPI endpoint

- [ ] Add the schema view and route.
- [ ] Explain how DRF metadata becomes Angular types later.
- [ ] User runs the approved check/test.

---

## Phase 5: Add feature flags as their own generated app

### Gate 5.1: Generate `features`

The user runs:

```bash
uv run python manage.py startapp features
```

- [ ] Review untouched generated boilerplate before customization.
- [ ] Register the app only after it exists.

### Gate 5.2: Add developer-owned environment flags

- [ ] Extend `config/env.py` in a separate review gate.
- [ ] Keep unfinished-code flags separate from bureau-controlled visibility.

### Gate 5.3: Add `SectionVisibility`

- [ ] Add and review the model.
- [ ] Propose model tests before writing them.
- [ ] User generates and reviews the migration before applying it.

### Gate 5.4: Add evaluation and cache behavior

- [ ] Add one behavior at a time: database lookup, environment hard-off,
      caching, invalidation.
- [ ] Propose a focused test before each behavior.

### Gate 5.5: Add backend adapters and `/api/flags/`

- [ ] Add the DRF permission, plain-view decorator, and endpoint as separate
      review gates.
- [ ] Disabled features return 404.

---

## Phase 6: Add authentication deliberately

### Gate 6.1: Password authentication

- [ ] Register the minimum allauth apps and middleware needed for passwords.
- [ ] Add URLs separately.
- [ ] Propose login/logout tests before writing them.

### Gate 6.2: Google authentication dependency decision

Do not register the Google provider until its optional dependency set is
reviewed. The base `django-allauth` dependency alone does not provide every
Google-provider import.

- [ ] Inspect the current allauth installation guidance.
- [ ] Present the exact additional packages/extras and why each is required.
- [ ] User approves or rejects the dependency change.
- [ ] Update `pyproject.toml` only after approval.
- [ ] User runs `uv sync` and pastes the result.

### Gate 6.3: Google provider configuration

- [ ] Register the provider after dependencies exist.
- [ ] Add credentials to typed environment settings.
- [ ] Add PKCE configuration.
- [ ] Write the operator runbook.

---

## Phase 7: Generate the Angular workspace

- [ ] Determine the current Angular release compatible with Node 24 at execution
      time.
- [ ] User runs the selected Angular CLI generator.
- [ ] Review the generated workspace before project-specific changes.
- [ ] Add design tokens, fonts, components, flags service, navigation, and the
      home page through separate review gates.
- [ ] The user runs builds/tests when requested.

---

## Phase 8: Production packaging

- [ ] Build the Angular production bundle in a Docker stage.
- [ ] Install the locked Python environment with uv, not pip or requirements
      files.
- [ ] Serve static assets and SPA routes from Django on one origin.
- [ ] Add the production entrypoint.
- [ ] Add production-parity Compose without overwriting established development
      port conventions.
- [ ] User builds and runs the image.

---

## Phase 9: CI and Railway

- [ ] CI installs Python dependencies using `uv sync --frozen`.
- [ ] CI runs only checks/tests the user has reviewed locally.
- [ ] CI builds and tests Angular using its committed lockfile.
- [ ] Railway builds the same production Dockerfile.
- [ ] Deployment variables and Google OAuth setup are documented.
- [ ] The user performs and confirms deployment operations.

---

## Deferred decisions

These are intentionally decided when their phase begins:

- exact Google allauth optional dependencies;
- exact Angular major compatible with Node 24;
- whether ASGI remains alongside WSGI;
- whether development fixtures/mock users provide value;
- exact test coverage for each behavior;
- commit boundaries after each approved checkpoint.

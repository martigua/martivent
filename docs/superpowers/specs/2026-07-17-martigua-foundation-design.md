# Martigua Handball — Sub-project 1: Foundation

**Date:** 2026-07-17
**Status:** Design approved, pending spec review
**Repo:** `github.com/martigua/martivent`

## Context

Martigua Sports Culture Loisirs is a handball club in Paris 19e, founded 1978,
roughly 230 licenciés across 7 teams (Seniors A, Seniors B, Féminines,
Juniors/Cadet·tes, Minimes/Benjamin·es, École de Handball, Loisirs Mixte). Club
colours are yellow and black.

An HTML proof-of-concept exists (`martigua-handball-supabase.html`, ~6500 lines,
single file, Supabase-backed). It is a sketch, not a specification. It
demonstrates the intended feature set and visual identity. It has no real users
and no real data.

The club will use the finished product, but there is no deadline. Quality is
preferred over speed.

## The product, in four audiences

The POC serves four distinct users whose needs differ in kind, not just degree:

1. **Visitor / prospective member** — recruitment and legitimacy. Someone
   searches "handball Paris 19e", lands here, and decides whether to show up to
   a training session. Public pages: hero, stats, actualités, équipes, agenda,
   histoire, bureau, tarifs, infos pratiques, contact.
2. **Member / parent** — club paperwork without WhatsApp chaos. Fiche
   adhérent·e, mon équipe, mes enfants, documents, fiche de présence,
   notifications.
3. **Coach** — match logistics. Players declare availability per match
   (dispos); the coach selects a squad from those available (sélection). This
   is the only genuine workflow in the product: two roles, shared state, a
   deadline. Each match also needs its **table de marque** staffed
   (secrétaire, chronométreur) — planning who is assigned to the official
   table per match ships with this sub-project.
4. **Bureau / admin** — publish content and govern. Content CRUD, member
   management, granting admin/coach rights, reading contact messages, club
   logo, site parameters.

The public pages are table stakes. The dispos-to-sélection loop is the part
that would actually change how the club operates.

## Decomposition

This project is too large for one spec. It is split into four sub-projects,
built in order. Each gets its own spec, plan, and implementation cycle.

|#|Sub-project|Delivers|
|-|-----------|--------|
|1|**Foundation** (this spec)|Docker, Django skeleton, custom User model, design system, feature flags, CI, Railway deploy|
|2|Public site|Hero, actualités, équipes, agenda, histoire, bureau, tarifs, infos pratiques, contact|
|3|Member portal|Auth flows, profil, enfants, documents, présences, mon équipe, notifications, messages|
|4|Coach workflow|Dispos, sélection, match import, table de marque planning|

Feature-flag *mechanism* ships in Foundation. Individual flags ship with the
features they gate.

## Goal of this sub-project

**Make deployment boring.** Foundation contains no club features. It exists so
that every later sub-project is a matter of adding a model, a view, and a
component to a pipeline that already works.

### Exit criteria

Foundation is done when all of the following are true:

- Opening a pull request runs tests and lint in GitHub Actions.
- Merging to `main` deploys to Railway without human action.
- `docker compose up` produces an environment matching production.
- One page renders, composed only of design-system components.
- One feature flag is toggleable in the Django admin and observably hides a
  nav item in Angular.
- `pytest` passes locally and in CI.

## Stack

|Layer|Choice|
|-----|------|
|Frontend|Angular, signals, plain CSS, no UI kit|
|API|Django + Django REST Framework|
|API schema|`drf-spectacular`, generating TypeScript types for Angular|
|Validation|DRF serializers at the HTTP boundary; Pydantic for custom endpoints; `pydantic-settings` for env config|
|Auth|`django.contrib.auth` + `django-allauth` (password and Google, both in V1)|
|Feature flags|`Features` (pydantic-settings, env-driven) plus `SectionVisibility` (database, admin-driven)|
|Database|Postgres 16, Django ORM and migrations|
|Admin|Django admin|
|Static serving|Whitenoise|
|Host|Railway, single service, Dockerfile deploy|
|CI|GitHub Actions: pytest, ruff, ng build, ng test|

**Dependencies (complete list):** `django`, `djangorestframework`,
`drf-spectacular`, `django-allauth`, `pydantic-settings`, `whitenoise`,
`psycopg`, `gunicorn`, `pytest`, `pytest-django`, `ruff`.

### Rationale for the decisions that were contested

**Supabase was dropped.** The POC uses Supabase as Postgres, Auth, Storage, and
auto-REST, with zero realtime. Three stated goals conflicted with it: an ORM
(Supabase has none), an admin panel for content publishing (Supabase has none),
and an environment reproducible locally (Supabase Cloud cannot be reproduced —
`supabase start` boots roughly ten containers whose versions the cloud upgrades
independently). Testing RLS policies in CI would additionally require pgTAP, a
second test language.

**Django over NestJS.** NestJS was the stated preference and has real
advantages: one language across the stack, shared types with Angular, and a
design lineage shared with Angular. It lost on the admin. The bureau publishing
its own content is a core requirement, and Django admin delivers it with
`admin.site.register()`. AdminJS is the closest Node equivalent and is real, but
less mature and carries a known ESM/CommonJS integration seam with NestJS.
Django also better fits the "as few libraries as possible" constraint: Django is
batteries-included where Nest is assembly-required (Nest + Prisma + Passport +
AdminJS, four independent release cycles).

**Django over FastAPI/Flask.** Both are API-first micro-frameworks with no ORM,
no admin, no migrations, and no auth. Each would need roughly six dependencies
to reach where Django starts. FastAPI's async throughput is irrelevant at this
scale.

**DRF over Django Ninja.** Ninja is the coherent way to have Pydantic at the
HTTP boundary, and auto-generates OpenAPI. It was rejected on maintenance
grounds: DRF dates from 2011 with broad adoption and many maintainers, Ninja is
younger and more thinly maintained. Note that neither is an official Django
Software Foundation library — the DSF ships `django` and little else. DRF's
`ModelViewSet` plus router is also the shortest path for a CRUD-dominant,
admin-heavy codebase, which this is.

**`django.contrib.auth` over Auth0.** Auth0 does not remove the Google Cloud
Console work: its developer keys are test-only, and using them breaks SSO
(callbacks route to `login.auth0.com`), breaks MFA, and shows Auth0's branding
to club members instead of Martigua's. Production requires your own Google
client ID and secret either way, so Auth0 adds tenant configuration, an Angular
SDK, a Django JWT verification backend, and a second dev tenant on top of
identical Google setup. It also cannot run locally, which contradicts the
reproducibility goal. Cost is zero with Django, permanently.

**`drf-pydantic` deferred, not rejected.** Pydantic works standalone for custom
endpoints without it. Its only real value is keeping custom endpoints inside the
`drf-spectacular` type-generation chain; with roughly four to six custom
endpoints, `@extend_schema` annotations are cheaper. It translates at class
creation with zero runtime cost and slots into existing DRF, so adopting it
later costs nothing that must be undone.

**Pandas rejected.** Postgres aggregates better and closer to the data. Pandas
would add numpy plus pandas (roughly 50MB) to pull rows into memory for work SQL
already does. The Django ORM's escape ladder — queryset, then
`annotate`/`aggregate`/`Q`/`F`/`Subquery`/`Window`, then `.raw()`, then
`connection.cursor()` — covers every query shape in this project.

## Architecture

```
                    ┌──────────────────────────────────────────────┐
                    │           Railway (one service)              │
   browser ────────►│                                              │
   same origin      │  gunicorn                                    │
   session cookie   │    └─ Django                                 │
                    │        ├─ whitenoise ──► Angular build       │
                    │        ├─ /api/*     ──► DRF                 │
                    │        ├─ /admin/    ──► Django admin        │
                    │        └─ /accounts/ ──► allauth             │
                    │                                              │
                    └───────────────────────┬──────────────────────┘
                                            │
                             Railway managed Postgres 16
```

**One origin is the load-bearing decision.** Angular is built during the Docker
image build and served by whitenoise from the same Django process. This means
the session cookie works with no CORS configuration, no `SameSite=None`, no
token refresh logic, and no localStorage XSS surface. It costs one dependency
(whitenoise) and means Angular rebuilds on backend deploys — acceptable at this
scale.

## Repository layout

```
martivent/
├── backend/
│   ├── config/              settings, urls, wsgi
│   ├── accounts/            User model, allauth config
│   ├── features/            flags: model, evaluator, adapters, API
│   └── manage.py
├── frontend/                Angular workspace
│   ├── src/styles/          design tokens
│   └── src/app/ui/          design-system components
├── docs/superpowers/specs/
├── docker-compose.yml       local
├── Dockerfile               builds both, deploys to Railway
├── pyproject.toml
└── .github/workflows/ci.yml
```

## Data model

Foundation defines exactly two models. Everything else ships with the
sub-project that needs it — designing `dispos` before designing the dispos
workflow would be guessing at fields.

### `accounts.User`

The one model that **must** exist in Foundation. Django bakes `AUTH_USER_MODEL`
into the first migration; changing it later requires surgery. It is defined now
even though profile fields (licence, équipe, type de compte) arrive with
sub-project 3.

Subclasses `AbstractUser`. Email is the login identifier. No profile fields yet.

### `features.SectionVisibility`

```
key          SlugField, unique     e.g. "adhesion"
enabled      BooleanField          default False
label        CharField             human name shown in admin
help_text    TextField, blank      what this controls, for the bureau
```

Registered in Django admin. This is the bureau's control surface.

## Feature flags

Two layers, deliberately separate mechanisms.

|Layer|Audience|Storage|Lifetime|Purpose|
|-----|--------|-------|--------|-------|
|`Features`|Developer|Railway env vars|Deleted when the feature ships|Ship unfinished work to prod, switched off|
|`SectionVisibility`|Bureau|Database, via admin|Permanent|Club controls which sections of the site are live|

They are separate because a half-built feature must not be toggleable by a club
treasurer. If unfinished work shared a table with "show the Adhésion section",
someone flips it on a Tuesday and members hit broken pages. Different audiences,
different blast radius, different lifetimes.

### Evaluation

One evaluator, three adapters:

```python
# features/flags.py
def is_enabled(key: str) -> bool:
    env = settings.FEATURES.model_dump()
    if key in env and env[key] is False:
        return False                        # env off is a hard off; DB cannot override
    return _db_flags().get(key, False)

def _db_flags() -> dict[str, bool]:
    flags = cache.get(_CACHE_KEY)
    if flags is None:
        flags = dict(SectionVisibility.objects.values_list("key", "enabled"))
        cache.set(_CACHE_KEY, flags, 300)
    return flags
```

Cache is invalidated by a `post_save` signal on `SectionVisibility`, so the
bureau's toggle feels instant without querying flags on every request.

Adapters:

```python
def feature_required(key):                  # DRF viewsets
    class _FeatureEnabled(BasePermission):
        def has_permission(self, request, view):
            return is_enabled(key)
    return _FeatureEnabled

def requires_feature(key):                  # custom function views
    def deco(fn):
        @wraps(fn)
        def wrapper(request, *args, **kwargs):
            if not is_enabled(key):
                raise Http404
            return fn(request, *args, **kwargs)
        return wrapper
    return deco
```

`GET /api/flags/` returns the merged map for Angular's route guards, using the
same evaluator, so frontend and backend cannot disagree about what is on.

**Disabled features return 404, not 403.** A 403 announces that an endpoint
exists and is forbidden, which for half-built code in production is an
invitation. A 404 says nothing.

Foundation ships the mechanism plus one throwaway flag proving both layers work.

## Design system

Two-tier tokens, plain CSS, no Tailwind. Extracted from the POC.

### Tier 1: primitives

```css
--yellow-500: #f5c800;   --neutral-950: #0d0d0d;   --green-500: #22c55e;
--yellow-600: #d4a900;   --neutral-900: #1a1a1a;   --red-500:   #ef4444;
--white:      #ffffff;   --neutral-800: #2e2e2e;   --blue-500:  #3b82f6;
                         --neutral-400: #888888;
```

### Tier 2: semantic

```css
--surface-base:         var(--neutral-950);
--surface-raised:       var(--neutral-900);
--surface-card:         var(--neutral-800);
--text-primary:         var(--white);
--text-muted:           var(--neutral-400);
--action-primary-bg:    var(--yellow-500);
--action-primary-fg:    var(--neutral-950);
--action-primary-hover: var(--yellow-600);
--border-default:       #333333;
--border-focus:         var(--yellow-500);
--status-ok:            var(--green-500);
--status-danger:        var(--red-500);
--status-info:          var(--blue-500);
```

**Components never reference tier 1.** That discipline is what allows restyling
without grepping every usage. It costs about 40 lines of CSS and zero libraries.

### Components

Standalone Angular components with signals and scoped styles: `Button`
(primary/secondary), `Card`, `Tag`, `SectionHeader` (eyebrow, title, lead),
`StatBand`, `Modal`, `Toast`, `Avatar`, `FormField`.

### Typography

Bebas Neue (display) and Inter (body), **self-hosted via `@font-face`, not the
Google Fonts CDN.** The POC hotlinks them; the Google Fonts CDN transmits
visitor IP addresses to Google, which is a GDPR exposure in France, and German
courts have ruled against it. Self-hosting also removes a runtime dependency.

### Accessibility

The inherited palette appears to pass WCAG AA for body text — `#888` on `#1a1a1a`
lands near 4.8:1 and `#aaa` on `#1a1a1a` near 7:1, against a 4.5:1 requirement.
Yellow on black is very high contrast. **These figures are estimates and must be
verified with a contrast tool during implementation.** No redesign is
anticipated.

## API layer

|Shape|Tool|
|-----|----|
|Model CRUD|DRF `ModelViewSet` and `ModelSerializer`|
|Custom endpoints, aggregates|Plain Pydantic models, validated from ORM output|
|Env and settings|`pydantic-settings`|

These do not overlap: each owns a shape the others handle badly. DRF's
`ModelSerializer` needs a model to introspect; for aggregates and merged data it
degrades to declaring every field by hand with `SerializerMethodField`
gymnastics and no usable types. Pydantic covers those cleanly and is already a
dependency via `pydantic-settings`.

Pydantic does not query. The ORM queries; Pydantic types the result.

Custom endpoints get `@extend_schema` annotations so `drf-spectacular` includes
them in the OpenAPI document, which generates Angular's TypeScript interfaces.

## Auth

`django.contrib.auth` with `django-allauth`, providing password login and Google
login, both in V1, from one user model.

Google requires a Google Cloud Console OAuth client (consent screen, client ID
and secret, redirect URIs) — unavoidable under any provider. In Django this is
then: add the provider to `INSTALLED_APPS`, create a `SocialApp` record in the
admin with the credentials. Enable `OAUTH_PKCE_ENABLED`.

Session cookies, `HttpOnly`, `SameSite=Lax`, made possible by the single-origin
deployment. No JWT.

Expect allauth to take an afternoon rather than ten minutes: it is a large
library with dense documentation, though the password-plus-Google path is
well-trodden.

## Local environment

```yaml
# docker-compose.yml
services:
  web:    build: .            # same Dockerfile as prod
  db:     image: postgres:16  # major version pinned to Railway's
```

No MinIO in Foundation. Object storage exists only if the documents feature
survives sub-project 3's scoping, so it is not Foundation's concern. When
needed: MinIO locally and Cloudflare R2 in production, both via the S3 API
through `django-storages`, so the code path is identical. A Railway volume is
explicitly rejected — it cannot be reproduced locally, reintroducing the drift
this design exists to avoid.

**Pin the local Postgres major version to Railway's.** That is the one drift
Railway can still introduce.

## Error handling

- **Disabled feature:** 404, per the reasoning above.
- **Unauthenticated API request:** 403 from DRF. Angular's interceptor redirects
  to login.
- **Validation failure:** DRF's standard 400 error shape. Custom endpoints using
  Pydantic catch `ValidationError` and return the same shape, so Angular has one
  error contract.
- **Bad env config:** `pydantic-settings` fails at boot rather than silently
  reading a default. A typo in `FEATURE_SELECTION` crashes the deploy instead of
  quietly disabling the feature.
- **Unhandled exception:** Django returns 500. No error tracker in Foundation;
  `sentry-sdk` is a candidate later if it earns the dependency.

No bare `except:` and no catch-all log-and-continue anywhere.

## Testing

`pytest` with `pytest-django`. No `factory_boy` yet — Django fixtures cover a
skeleton; it can be added when the model graph justifies it.

Foundation's own tests are thin by design, since Foundation has no features:

- `GET /api/flags/` returns the merged env-plus-database map.
- Env `False` masks database `True`.
- A disabled feature returns 404 through both the permission and the decorator.
- The `SectionVisibility` cache is invalidated on save.
- Password login and logout work.
- Health check responds.

CI runs `pytest`, `ruff`, `ng build`, `ng test` on every pull request.

**The deploy is the real test.** Foundation is not done until a green pull
request reaches Railway without human action.

## Explicitly out of scope

|Item|Where it belongs|
|----|----------------|
|The 16 remaining models|The sub-project that needs each|
|Object storage (MinIO, R2)|Sub-project 3, and only if the documents feature survives scoping|
|GDPR and minors' data handling|Sub-project 3. The product stores children's names and birthdates; this needs real thought, but not here.|
|Content migration from the POC|Nothing to migrate; no real data exists.|
|`drf-pydantic`|Later, if `@extend_schema` friction proves real|
|Error tracking|Later, if it earns the dependency|
|Realtime|The POC uses none. Not planned.|

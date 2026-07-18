# Access Control and Feature Variants Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add scoped, additive authorization and audience-targeted feature
variants to the Django backend.

**Architecture:** Django's native `Permission` model remains the capability
registry. A small `access` app adds roles, organizational groups, scoped
assignments, grants, evaluation, and the current-user API. The existing
`features` app is rewritten around named variants and ordered audience rules;
authorization and feature delivery stay separate and compose at the view.

**Tech Stack:** Django 5.2, Django REST Framework, drf-spectacular, pytest,
PostgreSQL 16. No new dependency.

## Global Constraints

- KISS first. Repeat a small pattern twice; abstract only when a third real use
  proves the boundary.
- Prefer readable code to speculative optimization. Do not add caching.
- Capabilities originate in backend code and use Django `Permission`.
- Grants are additive. There are no deny rules.
- A grant recipient is exactly one user, role, or organizational group.
- Backend authorization is authoritative; frontend gates are UX only.
- Feature variants never grant access to protected data or actions.
- Inaccessible records and unavailable backend features return 404;
  authenticated action denial returns 403.
- Unauthorized submitted fields reject the entire request.
- The user reviews Phase 5A and Phase 5B, not each task inside them.
- The user runs generators, migrations, tests, linters, and commits.

---

## File structure

```text
backend/
├── access/
│   ├── admin.py          Admin assignment interface
│   ├── apps.py
│   ├── decisions.py      Pure authorization evaluation
│   ├── models.py         Roles, groups, assignments, grants
│   ├── permissions.py    DRF policy adapters
│   ├── tests.py
│   └── migrations/0001_initial.py
├── features/
│   ├── admin.py          Variant and ordered-rule administration
│   ├── flags.py          Variant evaluation
│   ├── models.py         Feature and FeatureRule
│   ├── permissions.py    DRF variant adapter
│   ├── tests.py
│   └── migrations/0001_initial.py
└── accounts/
    ├── urls.py           Current-user route
    ├── views.py          GET /api/me/
    └── tests.py
```

`access` owns authorization only. `features` consumes role/group membership
from `access` but never grants a permission. `accounts` owns the current-user
HTTP representation and consumes both evaluators.

---

## Phase 5A — Authorization

### Task 1: Generate and register the access app

**Files:**
- Generate: `backend/access/`
- Modify: `backend/config/settings.py`

**Interfaces:**
- Produces: Django application `access.apps.AccessConfig`.

- [ ] **Step 1: Generate the app**

Run from `/workspace/backend`:

```bash
uv run python manage.py startapp access
```

Expected: `backend/access/` contains Django's standard app scaffold.

- [ ] **Step 2: Register the generated app**

Add this entry after `accounts.apps.AccountsConfig`:

```python
'access.apps.AccessConfig',
```

- [ ] **Step 3: Verify Django loads**

```bash
uv run python manage.py check
```

Expected: `System check identified no issues`.

### Task 2: Add roles, organizational groups, and grants

**Files:**
- Modify: `backend/access/models.py`
- Modify: `backend/access/admin.py`
- Test: `backend/access/tests.py`
- Generate: `backend/access/migrations/0001_initial.py`

**Interfaces:**
- Produces: `Role`, `RoleAssignment`, `OrganizationalGroup`,
  `GroupMembership`, and `Grant`.
- An optional scope is an `OrganizationalGroup`.
- An optional exact target is a Django generic foreign key.

- [ ] **Step 1: Write model tests**

Cover these concrete behaviors:

```python
@pytest.mark.django_db
def test_organizational_group_ancestors():
    club = OrganizationalGroup.objects.create(name="Club", slug="club")
    u18 = OrganizationalGroup.objects.create(name="U18", slug="u18", parent=club)

    assert list(u18.ancestors(include_self=True)) == [u18, club]


@pytest.mark.django_db
def test_grant_requires_exactly_one_recipient(user, permission):
    grant = Grant(permission=permission)

    with pytest.raises(ValidationError):
        grant.full_clean()
```

Also test that two recipients fail validation and that a role assignment may
be global or scoped.

- [ ] **Step 2: Run tests and observe the missing models**

```bash
uv run pytest access/tests.py -v
```

Expected: collection fails because the models do not exist.

- [ ] **Step 3: Implement the models**

Use these fields and responsibilities:

```python
class Role(models.Model):
    name = models.CharField(max_length=120)
    slug = models.SlugField(unique=True)


class OrganizationalGroup(models.Model):
    name = models.CharField(max_length=120)
    slug = models.SlugField(unique=True)
    parent = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="children",
    )
    members = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        through="GroupMembership",
        related_name="organizational_groups",
    )

    def ancestors(self, *, include_self: bool = False):
        current = self if include_self else self.parent
        while current is not None:
            yield current
            current = current.parent


class GroupMembership(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    group = models.ForeignKey(OrganizationalGroup, on_delete=models.CASCADE)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=("user", "group"),
                name="access_unique_group_membership",
            ),
        ]


class RoleAssignment(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    role = models.ForeignKey(Role, on_delete=models.CASCADE)
    scope = models.ForeignKey(
        OrganizationalGroup,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=("user", "role", "scope"),
                nulls_distinct=False,
                name="access_unique_role_assignment",
            ),
        ]


class Grant(models.Model):
    permission = models.ForeignKey(Permission, on_delete=models.CASCADE)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
    )
    role = models.ForeignKey(Role, null=True, blank=True, on_delete=models.CASCADE)
    group = models.ForeignKey(
        OrganizationalGroup,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
    )
    scope = models.ForeignKey(
        OrganizationalGroup,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="scoped_grants",
    )
    target_content_type = models.ForeignKey(
        ContentType,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
    )
    target_object_id = models.PositiveBigIntegerField(null=True, blank=True)
    target = GenericForeignKey("target_content_type", "target_object_id")

    def clean(self):
        super().clean()
        recipients = (self.user_id, self.role_id, self.group_id)
        if sum(value is not None for value in recipients) != 1:
            raise ValidationError("A grant must have exactly one recipient.")
        target_fields = (self.target_content_type_id, self.target_object_id)
        if (target_fields[0] is None) != (target_fields[1] is None):
            raise ValidationError("Target type and object ID must be set together.")

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)
```

Add `__str__` methods using names and permission natural names. Add database
check constraints for exactly one recipient and paired target fields so direct
ORM writes cannot bypass these invariants.

- [ ] **Step 4: Register all models in Django admin**

Use `list_display`, `list_filter`, `search_fields`, and `autocomplete_fields`
for assignment work. Do not build a custom admin UI.

- [ ] **Step 5: Run model tests**

```bash
uv run pytest access/tests.py -v
uv run ruff check access
```

Expected: all access model tests pass and Ruff reports no errors.

- [ ] **Step 6: Generate and inspect the migration**

```bash
uv run python manage.py makemigrations access
```

Expected: one initial migration creating the five models and their constraints.
Do not apply it until the Phase 5A review.

### Task 3: Evaluate additive, scoped grants

**Files:**
- Create: `backend/access/decisions.py`
- Test: `backend/access/tests.py`

**Interfaces:**
- Produces:

```python
@dataclass(frozen=True)
class GrantSource:
    kind: Literal["direct", "role", "group", "superuser"]
    name: str
    scope: str | None


@dataclass(frozen=True)
class Decision:
    allowed: bool
    sources: tuple[GrantSource, ...] = ()


def decide(
    user: User,
    permission_name: str,
    *,
    scope: OrganizationalGroup | None = None,
    target: models.Model | None = None,
) -> Decision: ...
```

`permission_name` uses Django's native `app_label.codename` form.

- [ ] **Step 1: Write evaluator tests**

Test:

- direct, role, and group grants independently allow access;
- identical permissions from direct and role grants return two sources;
- removing the role assignment leaves the direct source;
- a club scope covers U18;
- U18 does not cover the club or U16;
- an U18-scoped role assignment does not grant U16 access;
- an exact-target grant allows Bob but not Charlie;
- superuser returns one `superuser` source;
- inactive and anonymous users are denied.

- [ ] **Step 2: Run tests and observe the missing evaluator**

```bash
uv run pytest access/tests.py -v
```

Expected: evaluator imports fail.

- [ ] **Step 3: Implement readable evaluation**

`decide` performs these steps directly:

1. Reject anonymous or inactive users.
2. Return the superuser decision.
3. Resolve the requested `Permission`.
4. Load direct grants, grants for assigned roles, and grants for membership
   groups with `select_related`.
5. For role grants, retain the matching `RoleAssignment`.
6. Check that both assignment scope and grant scope are `None` or ancestors of
   the requested scope.
7. Check that an exact grant target is absent or equals the requested target.
8. Return every matching source.

Keep `_scope_covers(granted, requested)` and `_target_matches(grant, target)` as
the only helpers. Do not introduce a policy registry or caching.

- [ ] **Step 4: Run evaluator tests**

```bash
uv run pytest access/tests.py -v
uv run ruff check access
```

Expected: all tests pass.

### Task 4: Add DRF authorization adapters and current-user capabilities

**Files:**
- Create: `backend/access/permissions.py`
- Modify: `backend/accounts/views.py`
- Create: `backend/accounts/urls.py`
- Modify: `backend/config/urls.py`
- Test: `backend/accounts/tests.py`

**Interfaces:**
- Produces:

```python
def has_capability(
    permission_name: str,
    *,
    scope_getter: Callable | None = None,
    target_getter: Callable | None = None,
) -> type[BasePermission]: ...
```

- Produces authenticated `GET /api/me/`.

- [ ] **Step 1: Write API and adapter tests**

Test that:

- unauthenticated `/api/me/` is rejected;
- authenticated response includes email and capabilities;
- one effective capability includes direct and role provenance separately;
- a generated permission class returns true for an allowed request;
- it returns false for an authenticated action denial.

The capability response shape is:

```json
{
  "members.change_player": [
    {"kind": "direct", "name": "alice@example.com", "scope": "u18"},
    {"kind": "role", "name": "coach", "scope": "u18"}
  ]
}
```

- [ ] **Step 2: Run the focused tests**

```bash
uv run pytest accounts/tests.py access/tests.py -v
```

Expected: new tests fail because the adapter and route are absent.

- [ ] **Step 3: Implement the permission factory**

The generated `BasePermission` calls `decide`. It obtains optional scope and
target through the supplied callables, stores the `Decision` on the request for
reuse, and returns `decision.allowed`. It does not check role or group names.

- [ ] **Step 4: Implement `/api/me/`**

Require `IsAuthenticated`. Return:

```python
{
    "id": request.user.pk,
    "email": request.user.email,
    "capabilities": effective_capabilities(request.user),
}
```

`effective_capabilities` groups grant sources by native permission name. It
includes scoped grants with their scope slug, so Angular can display provenance;
contextual resource endpoints remain responsible for returning their precise
allowed actions.

- [ ] **Step 5: Add the route**

Mount `accounts.urls` under `api/` and expose `path("me/", me_view, name="me")`.

- [ ] **Step 6: Verify Phase 5A**

```bash
uv run python manage.py check
uv run pytest accounts/tests.py access/tests.py -v
uv run ruff check access accounts config
```

Expected: all checks pass. Stop for the Phase 5A review before applying the
migration.

---

## Phase 5B — Feature variants

### Task 5: Replace the obsolete feature model

**Files:**
- Modify: `backend/features/models.py`
- Modify: `backend/features/admin.py`
- Modify: `backend/features/apps.py`
- Delete: `backend/features/signals.py`
- Replace: `backend/features/migrations/0001_initial.py`
- Test: `backend/features/tests.py`

**Interfaces:**
- Produces: `Feature` and `FeatureRule`.

- [ ] **Step 1: Replace old model tests**

Test:

- variants are non-empty, unique strings;
- the default variant belongs to `variants`;
- a rule variant belongs to its feature;
- a rule has exactly one audience: everyone, user, role, or group;
- priorities are unique within a feature;
- an optional rule scope is an organizational group.

- [ ] **Step 2: Run tests and observe failures**

```bash
uv run pytest features/tests.py -v
```

Expected: failures reference the obsolete `SectionVisibility` implementation.

- [ ] **Step 3: Implement feature models**

```python
class Feature(models.Model):
    key = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    variants = models.JSONField(default=list)
    default_variant = models.CharField(max_length=80)

    def clean(self):
        super().clean()
        valid = (
            isinstance(self.variants, list)
            and bool(self.variants)
            and all(isinstance(item, str) and item for item in self.variants)
            and len(self.variants) == len(set(self.variants))
        )
        if not valid:
            raise ValidationError({"variants": "Variants must be unique non-empty strings."})
        if self.default_variant not in self.variants:
            raise ValidationError({"default_variant": "Default must be an allowed variant."})


class FeatureRule(models.Model):
    class Audience(models.TextChoices):
        EVERYONE = "everyone", "Everyone"
        USER = "user", "User"
        ROLE = "role", "Role"
        GROUP = "group", "Organizational group"

    feature = models.ForeignKey(Feature, on_delete=models.CASCADE, related_name="rules")
    priority = models.PositiveIntegerField()
    variant = models.CharField(max_length=80)
    audience = models.CharField(max_length=20, choices=Audience)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.CASCADE
    )
    role = models.ForeignKey(Role, null=True, blank=True, on_delete=models.CASCADE)
    group = models.ForeignKey(
        OrganizationalGroup, null=True, blank=True, on_delete=models.CASCADE
    )
    scope = models.ForeignKey(
        OrganizationalGroup,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="feature_rules",
    )
```

`clean()` enforces the audience fields and allowed variant. `save()` calls
`full_clean()`. Database constraints enforce unique `(feature, priority)` and
the audience-field combinations.

- [ ] **Step 4: Simplify admin and app startup**

Use a `FeatureRuleInline` ordered by priority inside `FeatureAdmin`. Remove the
signal import from `FeaturesConfig.ready()` and delete `signals.py`. There is no
cache to invalidate.

- [ ] **Step 5: Replace the unapplied initial migration**

The existing `features.0001_initial` is confirmed unapplied. Generate a fresh
initial migration:

```bash
rm features/migrations/0001_initial.py
uv run python manage.py makemigrations features
```

Expected: `0001_initial.py` creates `Feature` and `FeatureRule`, with no
`SectionVisibility`.

### Task 6: Evaluate ordered feature variants

**Files:**
- Replace: `backend/features/flags.py`
- Replace: `backend/features/permissions.py`
- Test: `backend/features/tests.py`

**Interfaces:**
- Produces:

```python
def variant_for(
    key: str,
    *,
    user: User | AnonymousUser | None = None,
    scope: OrganizationalGroup | None = None,
) -> str: ...


def all_variants(
    *,
    user: User | AnonymousUser | None = None,
    scope: OrganizationalGroup | None = None,
) -> dict[str, str]: ...


def feature_variant(
    key: str,
    expected: str,
    *,
    scope_getter: Callable | None = None,
) -> type[BasePermission]: ...
```

- [ ] **Step 1: Write evaluator tests**

Test:

- no matching rule returns the default;
- the lowest numeric priority is evaluated first;
- everyone, direct user, role, and group audiences match;
- a scoped rule matches its scope and descendants but not siblings;
- anonymous evaluation matches only everyone rules;
- `all_variants` returns evaluated names only;
- the permission adapter returns true for the expected variant;
- it raises `Http404` when another variant is selected.

- [ ] **Step 2: Run tests and observe old boolean behavior fail**

```bash
uv run pytest features/tests.py -v
```

- [ ] **Step 3: Implement direct ordered evaluation**

Load the feature and its rules ordered by `priority`. Return the first rule for
which audience and optional scope match; otherwise return `default_variant`.
Reuse `OrganizationalGroup.ancestors()` for scope containment. Do not cache or
build a generic condition engine.

- [ ] **Step 4: Implement the DRF adapter**

The generated permission compares `variant_for(...)` with `expected`. Raise
`Http404` for a mismatch because the unavailable implementation should not be
discoverable.

- [ ] **Step 5: Run tests**

```bash
uv run pytest features/tests.py -v
uv run ruff check features
```

Expected: all checks pass.

### Task 7: Compose variants into the current-user API

**Files:**
- Modify: `backend/accounts/views.py`
- Modify: `backend/accounts/tests.py`
- Delete: `backend/features/views.py`
- Delete: `backend/features/urls.py`
- Modify: `backend/config/urls.py`
- Modify: `backend/config/env.py`
- Modify: `backend/config/settings.py`

**Interfaces:**
- Extends `GET /api/me/` with `"features": {"dashboard": "v2"}`.

- [ ] **Step 1: Write integration tests**

Test:

- `/api/me/` returns the authenticated user's evaluated variants;
- it does not expose priorities, audiences, or rule configuration;
- changing the user changes the returned variant;
- a composed DRF policy requires both `has_capability(...)` and
  `feature_variant(...)`.

- [ ] **Step 2: Run tests and observe failures**

```bash
uv run pytest accounts/tests.py features/tests.py access/tests.py -v
```

- [ ] **Step 3: Extend `/api/me/`**

Add:

```python
"features": all_variants(user=request.user),
```

Remove the public `/api/flags/` route and its view. Evaluated user-specific
delivery belongs to the authenticated current-user response.

- [ ] **Step 4: Remove obsolete environment flags**

Delete `FeatureFlags`, its Pydantic imports, and `Env.features` from
`config/env.py`. Delete `FEATURES = env.features` from `config/settings.py`.
Feature configuration is database-backed.

- [ ] **Step 5: Verify Phase 5B**

```bash
uv run python manage.py check
uv run pytest -v
uv run ruff check .
```

Expected: Django check passes, the complete test suite passes, and Ruff reports
no errors. Stop for the Phase 5B review before applying migrations.

### Task 8: Apply reviewed migrations and smoke-test administration

**Files:** No source changes expected.

**Interfaces:** Produces database tables for the approved access and feature
models.

- [ ] **Step 1: Apply migrations**

```bash
uv run python manage.py migrate
```

Expected: `access.0001_initial` and the replaced `features.0001_initial` apply.

- [ ] **Step 2: Run the server**

```bash
uv run python manage.py runserver 0.0.0.0:8000
```

Verify:

- `/admin/` can create a role, organizational group, grant, feature, and ordered
  feature rule;
- authenticated `/api/me/` returns capabilities with provenance and evaluated
  feature variants;
- no `/api/flags/` endpoint remains.

- [ ] **Step 3: Commit after user approval**

Stage only the reviewed backend, migration, specification, and plan files. Do
not include unrelated worktree changes.


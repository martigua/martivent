# Meaning-driven Django admin for access

## Summary

The Django admin currently mirrors the database schema. Granting a right means
opening `Grant`, picking a permission from a several-hundred-row dropdown,
setting exactly one of user/role/group, choosing a scope, and dodging three
check constraints. This pass replaces that table-driven experience for
**authorization** with a meaning-driven one built around the question a human
actually asks — "what can this person do, and how do I give them more?" — and
skins the whole admin in the club's design system.

Feature variants (`FeatureRule`) are explicitly **out of scope** for this pass
and keep their standard admin; they get the same treatment later, reusing these
patterns.

## Goals

- Grant, revoke, and role-assign for a person through sentences, not table rows.
- Make the *consequence* of authorization legible: show effective capabilities
  (the computed truth) next to their editable sources.
- Provide capability- and role-centric audit lenses that pivot the same data.
- Skin the admin (theme, login, index) with the existing design-system tokens.
- Keep the raw admin as an untouched escape hatch for edge cases.

## Non-goals

- No feature-variant redesign this pass.
- No new club-domain models (members, teams, events, finance). The catalog
  covers only permissions that exist today.
- No object-level (`GenericForeignKey` target) or group-recipient granting in
  the friendly surfaces; those remain in the raw admin.
- No theme package (django-unfold, jazzmin). The design system is deliberately
  "plain CSS, no framework"; adopting one would contradict it.

## Context: the backend today

Three domain apps plus accounts:

- `accounts` — custom email-only `User` (no username).
- `access` — **authoritative** authorization, additive and scoped:
  - `Role` (slug), `OrganizationalGroup` (a tree via `parent`, `ancestors()`),
    `GroupMembership`, `RoleAssignment` (user + role @ optional scope),
    `Grant` (a `Permission` → exactly one of user/role/group @ optional scope,
    with an optional object target via `GenericForeignKey`).
  - `decisions.py` is the engine: `decide()` and
    `effective_capabilities(user)` compute what a user can do and via which
    source, honouring scope coverage.
- `features` — audience-based variants; out of scope here.

Invariant (AGENTS.md): **access is truth, features are presentation. Feature
variants never grant a capability.**

Confirmed constraint: **no model defines `Meta.permissions`.** The only
permissions that exist are auto-generated CRUD on the eight scaffolding models.
The club's real domain does not exist yet, so the v1 catalog can only name
*governance* capabilities.

## Design decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Primary lens | Person-centric page is where you edit | Matches the stated pain ("give Marie X") |
| Other lenses | Capability + role pages, read-first, same actions | Cheap pivots of one query layer; audit value |
| Editing paths | One conceptual path (create Grant / RoleAssignment) | Three views, no divergent state |
| Catalog | Curated registry in code | Human labels over a small, versioned subset |
| v1 catalog contents | Governance perms that exist now | Real and demo-able today; grows with the domain |
| Grant verb | Role-first, direct one-off secondary | Role is the schema's intended, reusable path |
| Revoke | Acts on the source, never edits a role in place | Editing a role hits everyone who holds it |
| Aesthetic | Vanilla admin skinned with design-system tokens | Consistent with "plain CSS, no framework" |
| Features | Deferred | Keep this pass essential and shippable |

## Architecture

```
Edit here (friendly)        See / audit (pivots)         Escape hatch (unchanged)
────────────────────        ────────────────────         ────────────────────────
Person page                 Capability lens              Raw GrantAdmin
 └ grant / assign / revoke  Role lens                     (object targets,
   (the meat)                (read + same actions)          group grants, bulk)
```

Nothing is removed from the DB-level admin. The friendly surfaces are additive.

### Shared query layer — `access/summaries.py`

Presentation-oriented reads, built on `decisions.py` primitives, reused by all
three views:

- `person_access(user)` → roles held (with scope), group memberships, direct
  grants, and effective capabilities (labeled via the catalog).
- `capability_holders(permission_name)` → the people/roles/groups that hold a
  capability, with scope and source kind.
- `role_summary(role)` → capabilities the role bundles + its assignees.

### Capability catalog — `access/capabilities.py`

A curated registry mapping raw permissions to human labels, grouped:

```python
CATALOG = [
    ("People & access", [
        ("accounts.change_user", "Manage users"),
        ("access.change_role", "Manage roles"),
        ("access.change_roleassignment", "Assign roles"),
        ("access.change_organizationalgroup", "Manage groups"),
    ]),
    ("Features", [
        ("features.change_feature", "Manage feature flags"),
        ("features.change_featurerule", "Manage feature rules"),
    ]),
]
```

Exact permission set is finalized during implementation (the friendly labels may
collapse several codenames into one capability, or expose view/change
separately). Helpers: `catalog()` (structured for templates), `label_for(name)`
(fallback to the raw name when uncatalogued), `choices()` (grouped, for the
granter select).

A test asserts every catalog entry resolves to a real `Permission`, so the
catalog cannot silently drift from the schema.

### Person page — the meat

A custom admin view hung off the User admin via `ModelAdmin.get_urls`, at
`/admin/accounts/user/<id>/access/`, linked from the user changelist and change
page. Two-column meaning model: edit the sources on the left, see the
consequence on the right.

```
MARIE DUPONT — access                                      [accounts.User #42]
┌─ SOURCES (editable) ──────────────┐  ┌─ EFFECTIVE (computed, read-only) ──────┐
│ Roles held                        │  │ What Marie can actually do:            │
│  • Coach        @ U13  [Unassign] │  │  ✓ Manage roles     @U13  via Coach    │
│  • Treasurer    @club  [Unassign] │  │  ✓ Manage features  @club via Treasurer│
│ Direct grants                     │  │  ✓ Manage users     @club direct       │
│  • Manage users @club   [Revoke]  │  │                                        │
│ Groups (read-only)                │  │                                        │
│  • U13 team  → [open group]       │  │                                        │
├─ GIVE MARIE… ────────────────────────────────────────────────────────────────┐
│ (●) A role         [ Coach ▾ ]            in [ scope ▾ tree · Club-wide ]      │
│ ( ) A one-off cap  [ Manage roles ▾ ]     in [ scope ▾ tree · Club-wide ]      │
│                                                                     [ Apply ]  │
└───────────────────────────────────────────────────────────────────────────────┘
```

Actions (POST endpoints under the same `get_urls`):

- **Assign role** → create `RoleAssignment(user, role, scope)`.
- **Grant one-off** → create `Grant(permission, user, scope)`.
- **Revoke**, dispatched by source kind:
  - direct grant → delete that `Grant` (affects only this user);
  - role → delete that `RoleAssignment` (affects only this user; never edits
    the role);
  - group-sourced → **no inline action**, only a link to the group. Removing a
    membership is a broader decision and stays out of the person page.

Every write goes through the models' existing `save()` → `full_clean()`, so all
check constraints keep guarding. Standard admin CSRF applies. Access to the page
requires the same staff/model permissions Django admin already enforces for the
User/Grant/RoleAssignment models.

### Scope picker

A reusable select of `OrganizationalGroup`, ordered as a tree (indented by
depth), with an explicit **"Club-wide (no scope)"** empty option representing a
null scope. Shared by the role-assign and one-off-grant forms.

### Capability lens

Hung off `GrantAdmin.get_urls`. An index of catalog capabilities; selecting one
shows `capability_holders(permission)` — who holds it, at what scope, via what
source. Offers the same grant action (grant to a person/role/group @ scope),
writing the same `Grant` primitive.

### Role lens

The Role change page, augmented via a custom `change_form` template, shows
`role_summary(role)`: the capabilities the role bundles (Grants with
`role=this`) and its assignees (RoleAssignments with `role=this`). Actions: add
a capability to the role (create `Grant(role=…)`), assign the role to a person
(create `RoleAssignment`).

### Skin

```
backend/templates/admin/
    base_site.html   branding, fonts, stylesheet link
    login.html       skinned login (inherits base_site)
    index.html       skinned dashboard (light touch: skinned app list)
backend/static/admin/martivent/
    tokens.css       tier-1 primitives + tier-2 semantic vars on :root
    admin.css        map admin surfaces (header, sidebar, buttons, rows,
                     forms, links) to the semantic tokens
config/settings.py   TEMPLATES["DIRS"] += [BASE_DIR / "templates"]
                     STATICFILES_DIRS = [BASE_DIR / "static"]
```

`admin.site.site_header`, `site_title`, and `index_title` set to Martivent
branding. Design-system tokens from the foundation spec: near-black surfaces
(`--neutral-950/900/800`), white text, muted gray, yellow primary
(`#f5c800`), green/red/blue status. Fonts Bebas Neue (display) + Inter (body),
**with a system-font fallback until the self-hosted font files land** (the
Angular frontend and its fonts do not exist in-repo yet). Plain CSS, zero
libraries.

## Data flow

```
person page GET  ─► summaries.person_access(user) ─► decisions.effective_capabilities
                                                   └► RoleAssignment / GroupMembership / Grant queries
                                                   └► capabilities.label_for for display

grant/assign     ─► create Grant | RoleAssignment ─► model.save() → full_clean() (constraints)
revoke           ─► delete the identified source object (grant | assignment)

capability lens  ─► summaries.capability_holders(permission)
role lens        ─► summaries.role_summary(role)
```

## Error handling

- Model-level validation stays authoritative: constraint violations surface as
  `ValidationError` and are shown on the form (no silent swallowing).
- Revoke targets are looked up scoped to the subject; a missing/foreign source
  id is a 404, not a silent no-op.
- Uncatalogued permissions render by raw name rather than breaking the page.
- The catalog-drift test fails the build if a catalog entry names a
  non-existent permission.

## Testing

Flagged for the plan (written when the phase lands):

- **Catalog drift** — every catalog entry resolves to a real `Permission`.
- **Summaries** — `person_access` / `capability_holders` / `role_summary`
  return the expected sources and scopes for representative fixtures.
- **Actions** — assign creates the assignment; grant creates the grant; revoke
  deletes the correct source and, for a role-sourced capability, removes only
  the assignment and never mutates the role.

Run `uv run pytest` and `uv run pre-commit run --all-files` before declaring any
phase complete (AGENTS.md).

## Phasing

| # | Phase | Risk | Visible |
|---|-------|------|---------|
| 1 | Skin: tokens, base_site, login, index | low | immediate |
| 2 | Capability catalog + drift test | low | — |
| 3 | Summaries query layer + tests | low | — |
| 4 | Person page + grant/assign/revoke + tests | med | the meat |
| 5 | Capability lens + role lens | low | audit |

## File-level plan

```
backend/
  access/
    capabilities.py     NEW  curated catalog + helpers
    summaries.py        NEW  person_access / capability_holders / role_summary
    admin.py            EDIT capability lens on GrantAdmin; role lens on RoleAdmin
    tests.py            EDIT catalog, summaries, action tests
  accounts/
    admin.py            EDIT person access view + actions via get_urls
  templates/admin/      NEW  base_site.html, login.html, index.html
    access/             NEW  person.html, capability.html, role_access.html
  static/admin/martivent/ NEW tokens.css, admin.css
  config/
    settings.py         EDIT TEMPLATES DIRS, STATICFILES_DIRS
    urls.py or apps     EDIT admin.site header/title/index_title
```

# Martivent frontend

Angular 22 standalone, zoneless frontend. It uses signals, `httpResource`,
Vitest, and SCSS.

Run commands from `/workspace/frontend` inside the development container:

```bash
npm ci
npm start
npm run lint
npm test -- --watch=false
npm run build
npm run format
```

The dev server is available at `http://localhost:4201/` and proxies `/api`,
`/_allauth`, and `/accounts` to Django in the same container.

## Architecture

```
src/app/
  core/     singleton stores (ApplicationContext, CurrentUser)
  feature/  business-facing components and their route definitions
  layout/   application shell (nav)
  ui/       reusable presentational components without business logic (mg-*)
src/styles/ global design tokens, element defaults, typography, motion, breakpoints
```

- `core/ApplicationContext` is the global read-only store for public
  backend-owned data from `GET /api/context/`.
- `core/CurrentUser` is the global session store for the user,
  administrator-validation state, capability sources, and evaluated feature
  variants from `GET /api/me/`. An authentication failure represents the
  normal signed-out state and does not prevent public pages from rendering.
- `core/HeadlessAuthentication` is the typed integration with Allauth's
  browser endpoints. It performs authentication lifecycle mutations and then
  reloads `CurrentUser`; it does not own application identity or authorization.
- Backend checks are authoritative. Frontend gates improve navigation and UX
  but never replace backend authorization.
- Every routed business area lives under `feature/<name>/`, owns its local
  route definition, and is lazy-loaded by `app.routes.ts`. Keep the root router
  limited to feature entry points and application-wide fallbacks.
- The lazy `/auth` feature owns Angular login, signup, password-reset, email
  verification, and social-return presentation. The lazy `/account` feature
  presents app identity, administrator-validation state, email management, and
  password changes.
- Allauth Headless owns authentication rules and state under
  `/_allauth/browser/v1/`. Angular sends Django's `csrftoken` cookie as
  `X-CSRFToken`. Same-origin deployment is part of this session-cookie design.
- Use `routerLink` for routes owned by Angular. Social login is the exception:
  it submits a full-page POST to Allauth, then the provider returns to the
  Angular callback route.
- The router uses the browser View Transitions API as progressive enhancement.
  Only page content transitions; navigation geometry remains stable. Global
  route and interaction motion honors `prefers-reduced-motion`.
- `angular.json` enforces the initial-size budget. Use `:id`, a nested
  `<router-outlet>`, and component input binding when a feature has entity
  subpages.
- New forms use Angular Signal Forms.

## Dependencies

Runtime dependencies are Angular, its required peers (`rxjs`, `tslib`), and
self-hosted fonts. Before adding a library, prefer the platform or a small
local implementation; a new runtime dependency needs a reason it cannot be
either.

## Design system

Global primitive and semantic tokens live in `src/styles/`. Element defaults
and resets live in `_elements.scss`; shared element and utility typography
lives in `_typography.scss`. `styles.scss` only composes those global layers.
Reusable components live in `src/app/ui/`.

Features compose design-system controls and layout primitives rather than
styling native controls themselves. `mg-text-field` integrates with Signal
Forms, `mg-button` owns button variants and interaction states, and
`mg-form-page` owns the responsive form-page layout.

Heading and text elements receive global typography. Matching low-specificity
classes such as `.h2`, `.text-label`, and `.display-md` provide the same styles
when the semantic element differs.

Component SCSS consumes design tokens and exposes a small `--mg-*` custom
property API. Override those properties from the host without `::ng-deep`:

```scss
mg-button {
  --mg-button-background: var(--status-success-background);
}
```

Responsive styles are mobile-first. Primitive defaults target small screens,
then tablet and desktop `min-width` breakpoints adjust the shared tokens.
Vertical type and spacing use breakpoint steps rather than viewport-width
units, so widening a browser does not unexpectedly create page overflow.

Update this README only when working architecture, commands, or conventions
change. Component code and tests remain the source of truth for component APIs.

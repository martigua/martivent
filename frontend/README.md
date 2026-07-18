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

The dev server is available at `http://localhost:4201/` and proxies `/api` and
`/accounts` to Django in the same container.

## Architecture

```
src/app/
  core/     singleton stores (ApplicationContext, CurrentUser)
  layout/   application shell (nav)
  pages/    routed pages (home)
  ui/       reusable presentational components (mg-*)
src/styles/ global design tokens, element defaults, typography, breakpoints
```

- `core/ApplicationContext` is the global read-only store for public
  backend-owned data from `GET /api/context/`.
- `core/CurrentUser` is the global session store for the user,
  administrator-validation state, capability sources, and evaluated feature
  variants from `GET /api/me/`.
- Backend checks are authoritative. Frontend gates improve navigation and UX
  but never replace backend authorization.
- The landing page is the only route and stays eager. Lazy-load a meaningful
  route area when separation improves initial bundle size or route ownership;
  keep small routes direct. `angular.json` enforces the initial-size budget.
  Use `:id`, a nested `<router-outlet>`, and component input binding when a
  feature has entity subpages.
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

Update this README only when working architecture, commands, or conventions
change. Component code and tests remain the source of truth for component APIs.

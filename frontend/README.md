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

- `core/ApplicationContext` is the global read-only store for public
  backend-owned data from `GET /api/context/`.
- `core/CurrentUser` is the global session store for the user, capability
  sources, and evaluated feature variants from `GET /api/me/`.
- Backend checks are authoritative. Frontend gates improve navigation and UX
  but never replace backend authorization.
- The landing page is eager. Add a lazy `loadChildren` route when a feature
  becomes its own route area. Use `:id`, a nested `<router-outlet>`, and
  component input binding when that feature has entity subpages.
- New forms use Angular Signal Forms.

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

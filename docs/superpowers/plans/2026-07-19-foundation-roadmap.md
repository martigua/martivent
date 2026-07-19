# Martivent Foundation Roadmap

**Goal:** Deliver a production-ready Django and Angular foundation before club
business features are added.

This is the active delivery checkpoint. READMEs describe working behavior; this
file records approved phase status and remaining delivery work.

The original detailed plans and specifications remain available in Git before
commit `38133f0`. They are historical references, not current execution
checklists.

## Working agreement

1. Work phase by phase.
2. The agent presents the phase, its caveats, and open decisions.
3. User approval authorizes implementation of the whole presented phase.
4. The user reviews the completed phase in the IDE.
5. Keep implementation human-readable and follow KISS.
6. Run relevant tests and pre-commit before marking a phase complete.

## Checkpoint

| Phase | Scope                                                        | Status                                      |
| ----- | ------------------------------------------------------------ | ------------------------------------------- |
| 1     | Django scaffold                                              | Complete                                    |
| 2     | Environment-driven Django configuration                      | Complete                                    |
| 3     | Custom account model and migrations                          | Complete                                    |
| 4     | Health endpoint and OpenAPI                                  | Complete                                    |
| 5A    | Scoped additive authorization                                | Complete                                    |
| 5B    | Feature variants                                             | Complete                                    |
| 6     | Password, Google, and Headless authentication                | Implemented; review pending                 |
| 7     | Angular workspace, design system, routing, and responsive UI | Implemented; review pending                 |
| 8     | Production packaging and one-origin serving                  | Complete                                    |
| 9     | CI and Railway deployment                                    | Implemented; live Railway verification open |

## Phase 8: Production packaging

- Serve the compiled Angular application and deep links from Django without
  swallowing backend routes.
- Build Angular and Django into one production image with frozen lockfiles.
- Run migrations and Gunicorn through a production entrypoint.
- Provide production-parity Compose with PostgreSQL 16.
- Build and smoke-test the image locally.

## Phase 9: CI and Railway

- Run backend and frontend checks from committed lockfiles in GitHub Actions.
- Build the same production image used locally and on Railway.
- Configure Railway health checks and restart behavior.
- Document one-time Railway and Google OAuth operator setup.
- Confirm the live deployment when project access is available.

The repository and local production image are complete. Live Railway
verification remains an operator step because it requires access to the target
project, domain, database, and secrets.

## Deferred

The deleted meaning-driven Django admin specification is not part of the
Foundation exit path. It remains deferred until explicitly selected as a
product phase.

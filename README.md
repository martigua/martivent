# Martivent

Website for **Martigua Sports Culture Loisirs**, a handball club in Paris 19e.

Django + DRF backend, Angular frontend, one origin, deployed to Railway. Full
design and rationale live in [`docs/superpowers/specs/`](docs/superpowers/specs/);
the build plan is in [`docs/superpowers/plans/`](docs/superpowers/plans/).

> **Status:** Foundation Task 1 is in progress. The development container and
> backend dependencies, environment configuration, and Django settings are in
> place. The custom user model, frontend, CI, and deployment follow.

## Prerequisites

You only need these on your host machine:

- **Docker** and the **Docker Compose** plugin (`docker compose version` should work).

Everything else — Python 3.13, Node 24, `psql`, git — lives *inside* the dev
container. You never install them on your host.

## Local development

We develop inside a Linux container so your environment matches CI and
production. You edit files with any editor on your host; the container sees them
live through a bind mount.

### 1. Start the environment

```bash
docker compose -f docker-compose.dev.yml up -d --build
```

First run builds the image (a few minutes) and starts two containers:

- `dev` — the Linux box you work in (Python 3.13, Node 24).
- `db`  — Postgres 16, reachable from `dev` at host `db`, port `5432`.

### 2. Open a shell inside the container

```bash
docker compose -f docker-compose.dev.yml exec dev zsh
```

You land in `/workspace`, which *is* your repo. Confirm the toolchain:

```bash
python --version   # Python 3.13.x
node --version     # v24.x
psql --version     # psql (PostgreSQL) 16.x
```

Run all project commands (Django, npm, migrations, tests) from this shell.

> **Servers must bind to `0.0.0.0`, not `localhost`, inside the container**, or
> the port mapping can't reach them from your host browser:
> `manage.py runserver 0.0.0.0:8000`, `ng serve --host 0.0.0.0`.
> Then open `http://localhost:8001` (Django) / `http://localhost:4201` (Angular)
> on your host. The servers still listen on 8000 / 4200 *inside* the container;
> compose maps them to host ports 8001 / 4201 to avoid conflicts. Postgres is
> likewise on host port 5433.

### 3. Stop

```bash
docker compose -f docker-compose.dev.yml down          # stop; keeps the database
docker compose -f docker-compose.dev.yml down -v       # stop AND wipe the database volume
```

## Deployment

Railway, from a Dockerfile. The deploy pipeline and its runbook land later
(plan Task 10); this section fills in then.

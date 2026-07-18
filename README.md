# Martivent

Web application for Martigua Sports Culture Loisirs, a handball club in
Paris 19e.

- `backend/`: Django 5.2 REST API, PostgreSQL, session authentication,
  additive scoped authorization, and feature variants.
- `frontend/`: Angular 22 standalone, zoneless application and SCSS design
  system.

The backend is authoritative for data and access decisions. The frontend uses
the same capabilities and feature variants to adapt navigation. See the README
in each application for its architecture and commands.

## Run locally

Requirements: Git, Docker, and Docker Compose.

```bash
git clone --recurse-submodules git@github.com:martigua/martivent.git
cd martivent
docker compose -f docker-compose.dev.yml up -d --build --wait
docker compose -f docker-compose.dev.yml exec dev fish
```

The container bootstrap installs backend and frontend dependencies when needed
and installs the Git pre-commit hook. Compose reports the development service
healthy only after that bootstrap succeeds; the container remains available
for inspection when setup fails.

In one container shell, start Django:

```bash
cd /workspace/backend
uv run python manage.py migrate
uv run python manage.py runserver 0.0.0.0:8000
```

In a second container shell, start Angular:

```bash
cd /workspace/frontend
npm start
```

Open `http://localhost:4201/`. Django is exposed at
`http://localhost:8001/`; Angular proxies `/api` and `/accounts` to it inside
the development container.

Run all checks:

```bash
cd /workspace/backend
uv run pytest
uv run pre-commit run --all-files

cd /workspace/frontend
npm run lint
npm test -- --watch=false
npm run build
```

Stop with `docker compose -f docker-compose.dev.yml down`. Add `-v` only when
you also want to delete every named development volume: PostgreSQL data and
the Neovim plugin, state, and cache volumes.

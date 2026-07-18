# Martivent

Web application for **Martigua Sports Culture Loisirs**, a handball club in
Paris 19e.

The repository currently contains a Django REST backend with:

- email-based user accounts;
- additive, scoped authorization for users, roles, and organizational groups;
- audience-based feature variants;
- Django administration, PostgreSQL persistence, and an OpenAPI schema.

See [backend/README.md](backend/README.md) for the backend architecture and
development reference.

## Local setup

The only host requirements are Git, Docker, and the Docker Compose plugin.
Python, PostgreSQL, and the development tools run inside containers.

```bash
git clone --recurse-submodules git@github.com:martigua/martivent.git
cd martivent
docker compose -f docker-compose.dev.yml up -d --build
docker compose -f docker-compose.dev.yml exec dev fish
```

Inside the container:

```bash
cd /workspace/backend
uv sync
uv run python manage.py migrate
uv run pre-commit install
uv run python manage.py createsuperuser  # optional: access /admin/
uv run python manage.py runserver 0.0.0.0:8000
```

The backend is available from the host at:

- `http://localhost:8001/healthz`
- `http://localhost:8001/admin/`
- `http://localhost:8001/api/schema/`

Run the backend checks from `/workspace/backend`:

```bash
uv run pytest
uv run pre-commit run --all-files
```

Stop the environment with:

```bash
docker compose -f docker-compose.dev.yml down
```

Add `-v` to also delete the local database volume.

## Repository layout

```text
backend/                 Django REST backend
docker/dev/              Development shell and editor configuration
docker-compose.dev.yml   Development services and environment variables
Dockerfile.dev           Reproducible development image
```

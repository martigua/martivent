# syntax=docker/dockerfile:1

FROM node:24-slim AS frontend

WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build


FROM python:3.13-slim AS application

COPY --from=ghcr.io/astral-sh/uv:0.11.29 /uv /uvx /usr/local/bin/

ENV PATH="/app/backend/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_NO_DEV=1

WORKDIR /app/backend

COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --locked --no-dev --no-install-project

COPY backend/ ./
COPY --from=frontend /app/frontend/dist/martivent/browser/ ./spa/

RUN export SECRET_KEY=collectstatic-only \
    DEBUG=false \
    ALLOWED_HOSTS=localhost \
    DATABASE_URL=postgresql://unused:unused@localhost:5432/unused \
    SECURE_SSL_REDIRECT=false; \
    python -m whitenoise.compress --no-brotli --quiet spa \
    && python manage.py collectstatic --noinput \
    && chmod +x entrypoint.sh \
    && addgroup --system martivent \
    && adduser --system --ingroup martivent martivent

USER martivent

EXPOSE 8000

CMD ["./entrypoint.sh"]

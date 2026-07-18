#!/usr/bin/env bash
# Container-side dev bootstrap — makes the bind-mounted workspace usable on start.
#
# The Python venv and node_modules live on the bind mount (host fs), so they only
# exist at runtime, not at image-build time — this must run as an entrypoint, not a
# Dockerfile RUN. Runs as `dev` on every `up`; each step is idempotent and cheap
# when already in sync. Setup failures leave the container available for
# debugging, but its healthcheck stays unhealthy.
set -u
cd /workspace || exit 1

# Compose uses this marker to distinguish a running container from a prepared
# development environment.
ready_marker=/tmp/martivent-bootstrap-ready
rm -f "$ready_marker"
bootstrap_status=0

# Backend venv: provides ruff + pre-commit, both required by the git hooks.
uv sync --project backend \
  || {
    echo "bootstrap: 'uv sync --project backend' failed — backend + git hooks may not work" >&2
    bootstrap_status=1
  }

# Frontend deps: provide eslint/prettier/angular-eslint for the lint hooks.
# Install when node_modules is missing or the lockfile changed since the last
# install (npm records the resolved lock at node_modules/.package-lock.json).
if [ ! -d frontend/node_modules ] \
   || [ frontend/package-lock.json -nt frontend/node_modules/.package-lock.json ]; then
  ( cd frontend && npm ci ) \
    || {
      echo "bootstrap: 'npm ci' failed — frontend lint hooks may not work" >&2
      bootstrap_status=1
    }
fi

# Git hook: the generated hook bakes an ABSOLUTE interpreter path. Inside this
# container that must resolve to /workspace/backend/.venv — regenerate every start
# so a hook left over from another environment (e.g. the host) can't break commits.
if [ -f .pre-commit-config.yaml ]; then
  uv run --project backend pre-commit install \
    || {
      echo "bootstrap: 'pre-commit install' failed — commits will skip hooks" >&2
      bootstrap_status=1
    }
fi

if (( bootstrap_status == 0 )); then
  touch "$ready_marker"
else
  echo "bootstrap: setup incomplete; inspect the errors above and restart the dev service" >&2
fi

exec "$@"

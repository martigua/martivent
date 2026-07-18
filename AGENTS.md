# Repository guidance

Read [README.md](README.md), then the README nearest to the code being changed.
For backend work, [backend/README.md](backend/README.md) is the architecture and
command reference.

- Document current, working behavior only—never planned or removed behavior.
- Prefer simple, readable code. Two similar implementations are acceptable;
  abstract on the third only when it improves readability.
- Generate Django projects, apps, and migrations with Django commands; do not
  recreate generated boilerplate by hand.
- Keep backend configuration environment-driven. Local values belong in Docker
  Compose and production values belong in the deployment environment.
- Treat backend authorization as authoritative. Feature variants never grant a
  capability.
- Work and review phase by phase rather than file by file.
- Run the relevant tests and `pre-commit` before declaring a phase complete.
- Update the nearest README only when commands, boundaries, public interfaces,
  or stable cross-module rules change.
- Do not create per-module guidance files unless the module has a non-obvious
  workflow or contract that the nearest README cannot explain concisely.

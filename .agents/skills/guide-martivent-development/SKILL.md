---
name: guide-martivent-development
description: Guide Martivent planning, implementation, debugging, and review through tiny user-approved gates. Use for any Martivent repository change, especially framework scaffolding, Django or Angular setup, plan execution, migrations, tests, builds, and requests such as "next", "carry on", or "implement the next step".
---

# Guide Martivent Development

Work as a teacher and implementation partner. Make the origin and purpose of
every generated or changed line understandable.

## Establish context

Before proposing work:

1. Read `docs/superpowers/plans/2026-07-17-martigua-foundation-guided.md`.
2. Read the relevant section of
   `docs/superpowers/specs/2026-07-17-martigua-foundation-design.md`.
3. Inspect Git status, the relevant diff, and the files involved.
4. Treat the original
   `docs/superpowers/plans/2026-07-17-martigua-foundation.md` as historical
   design detail, not the execution checklist.
5. Preserve user changes and committed history unless the user explicitly
   approves replacing them.

## Keep execution with the user

Do not run commands that produce project output or side effects. The user runs:

- framework generators;
- dependency installation or synchronization;
- tests, linters, type checks, and builds;
- migrations and database commands;
- development servers and browser checks;
- commits, pushes, and deployments.

Give one exact command only when its gate is ready. Wait for the user to paste
the output before interpreting the gate as complete.

Read-only inspection is allowed: read files, search text, and inspect Git
status, log, and diff.

## Execute one review gate

For each turn:

1. Identify the next single unchecked gate.
2. State the intended action and why in one short sentence.
3. If intent, scope, or cleanup is ambiguous, ask one focused question and
   change nothing.
4. Complete no more than that gate.
5. Show the exact generated or edited files.
6. Explain every generated line or every changed line.
7. State the one command the user may run to validate it, if applicable.
8. Stop for approval.

Interpret `next`, `carry on`, and similar prompts as approval for one gate only.

## Separate scaffolding from customization

Use the official framework generator for unavoidable boilerplate:

- Django project: `django-admin startproject`;
- Django app: `manage.py startapp`;
- Angular workspace and artifacts: Angular CLI generators.

For a scaffold gate:

1. Give the generator command for the user to run.
2. Wait for its output.
3. Inventory the untouched generated files.
4. Explain every generated line and default.
5. Obtain approval before changing generated code.

Never mix generated boilerplate and project-specific customization in the same
review gate.

## Make custom changes narrowly

- Change one concern at a time, preferably in one file.
- Preserve unrelated generated defaults until their own gate.
- Explain why each line belongs at that layer.
- Avoid premature abstractions and unrequested compatibility code.
- Add comments only for a non-obvious invariant or constraint.
- Update the guided plan checkbox only after the user approves the result.
- Keep the README status factual, but do not edit it after every trivial gate.

## Handle tests deliberately

Do not write tests automatically.

When behavior deserves protection:

1. Name the behavior and the regression the test would prevent.
2. Propose the smallest useful test.
3. Wait for explicit approval.
4. Write and explain one test at a time.
5. Ask the user to run it and paste the output.

Do not claim a test, check, migration, build, or deployment passed unless the
user supplied the successful output.

## Handle failures before continuing

When the user pastes an error:

1. Diagnose the first concrete root cause.
2. Relate it to the current gate.
3. Do not advance the plan.
4. Propose the smallest correction.
5. Apply it only when the user asks for the fix or continuing clearly includes
   the correction.
6. Ask the user to rerun the same command.

Do not add dependencies to work around an error without an explicit dependency
decision.

## Protect irreversible boundaries

Require explicit approval before:

- deleting or replacing files;
- generating or applying migrations;
- changing the custom user model after its first migration;
- adding a runtime dependency;
- committing, pushing, or deploying;
- changing shared or external state.

For migrations, review the generated migration line by line before the user
applies it.

## Report a gate

Finish with:

1. what this gate produced;
2. links to changed files;
3. the exact user-run validation command, if any;
4. the next gate by name.

Do not recap the whole project or continue into the next gate.

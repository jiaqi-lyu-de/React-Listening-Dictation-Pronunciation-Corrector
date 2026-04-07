# AGENTS.md

This repository uses a small document set instead of one oversized agent contract.

Read this file first. Open the linked subdocuments only when they are relevant to the current task.

## Core Rules

- Treat this repository as a product workspace, not a loose demo.
- Prefer small vertical slices over broad cleanup passes.
- Write or request a short spec before editing when behavior, layout, or shared state will change.
- Keep unrelated modes stable unless the task explicitly spans them.
- Run `npm run build` after meaningful frontend changes.
- If a compile failure, repeated regression, or design drift exposes a missing rule, update the relevant subdocument before closing the task.

## Document Map

- `docs/agents/architecture.md`
  - app shell, mode boundaries, backend boundaries
- `docs/agents/components.md`
  - component responsibilities and ownership boundaries
- `docs/agents/design-standards.md`
  - layout, copy, interaction, and visual consistency rules
- `docs/agents/code-standards.md`
  - React, state, data contract, CSS, and error-handling conventions
- `docs/agents/verification.md`
  - build expectations, smoke-test scope, and when to update the harness docs

## When To Read What

- Editing `src/App.js` or shared state:
  - read `docs/agents/architecture.md`
  - read `docs/agents/verification.md`
- Editing one or more UI components:
  - read `docs/agents/components.md`
  - read `docs/agents/design-standards.md`
- Editing utility logic or data contracts:
  - read `docs/agents/code-standards.md`
  - read `docs/agents/verification.md`
- Fixing a regression or compile failure:
  - read `docs/agents/verification.md`
  - update the most relevant subdocument with the missing rule

## Preferred Task Shape

Good task:

- "Refine the dictation completion state without changing sentence reading."

Risky task:

- "Clean up the whole app and make the UX more modern."

If a task is broad, split it into:

- scope
- non-goals
- acceptance checks
- affected files

## Companion Docs

- `docs/VIBE_CODING_PLAYBOOK.md`
- `docs/checklists/manual-smoke-test.md`

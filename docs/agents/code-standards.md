# Code Standards

## React

- Prefer function components and hooks.
- Keep state near the smallest component that truly owns it.
- Lift state only when multiple siblings or modes depend on it.
- Use `useCallback`, `useMemo`, and effects intentionally, not automatically.
- Do not add effects that duplicate derived state unless required for side effects.
- In agile delivery for this repo, shipping the feature is not enough if the implementation introduces obvious performance loss, interaction lag, excessive rerendering, or visible instability.
- Do not chase abstract browser metrics too early, but do treat clear performance regressions as real defects that must be considered during implementation.

## State Management

- Distinguish clearly between transient UI state, mode-level state, and cross-mode persisted state.
- Do not mix display-only state into persistence layers.
- When changing localStorage shape or history entry structure, document the contract in code comments or the agent docs if it affects multiple components.
- Do not add excessive fallback branches that hide real failures, block progress, or make frontend errors impossible to see.
- Fallback behavior must help recovery, not mask broken logic.

## Data Contracts

- Avoid casual renaming of fields flowing between backend, `App.js`, and feature components.
- If a contract changes, update every dependent mode and verify it manually.
- Keep weak-word objects structurally stable unless a migration plan exists.
- If code is generated in multiple rounds, normalize naming, data shape, and control flow before closing the task.

## CSS

- Follow the existing component-scoped CSS structure.
- Prefer extending the current token and card system in `App.css` over introducing one-off visual values everywhere.
- Keep selectors readable and bounded to the component.
- Do not add brittle layout hacks without documenting why they are needed.
- Prefer reusing existing blocks and shared patterns over creating a new feature block for every request.
- Reuse shared utility functions and cross-page style patterns when the behavior is already conceptually the same.

## Error Handling

- User-facing failure states should be actionable and short.
- Do not swallow async errors silently.
- If upload, transcription, or assessment fails, preserve enough state for the user to recover or retry.
- When fixing errors, inspect both page-level code and build/tooling/configuration layers if relevant. Do not assume the page component is the only failure source.
- Frontend-visible failures should remain visible during debugging unless there is a deliberate product reason to suppress them.

## Comments

- Add comments only where the reasoning is not obvious.
- Prefer documenting constraints and contracts over narrating simple code.
- Do not delete existing comments unless they are clearly wrong, stale, or harmful.
- Existing comments may describe unfinished, gated, or not-yet-released behavior, so preserve them unless the change proves they are invalid.
- When adding important functions, feature boundaries, temporary constraints, or non-obvious logic, add or update comments in time instead of leaving the reasoning implicit.
- Do not add noisy generated comments that simply restate obvious code.
- Keep code comments and inline product copy in English. Do not mix Chinese and English within the same component or code path.

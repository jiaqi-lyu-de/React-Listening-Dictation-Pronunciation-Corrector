# Code Standards

## React

- Prefer function components and hooks.
- Keep state near the smallest component that truly owns it.
- Lift state only when multiple siblings or modes depend on it.
- Use `useCallback`, `useMemo`, and effects intentionally, not automatically.
- Do not add effects that duplicate derived state unless required for side effects.

## State Management

- Distinguish clearly between transient UI state, mode-level state, and cross-mode persisted state.
- Do not mix display-only state into persistence layers.
- When changing localStorage shape or history entry structure, document the contract in code comments or the agent docs if it affects multiple components.

## Data Contracts

- Avoid casual renaming of fields flowing between backend, `App.js`, and feature components.
- If a contract changes, update every dependent mode and verify it manually.
- Keep weak-word objects structurally stable unless a migration plan exists.

## CSS

- Follow the existing component-scoped CSS structure.
- Prefer extending the current token and card system in `App.css` over introducing one-off visual values everywhere.
- Keep selectors readable and bounded to the component.
- Do not add brittle layout hacks without documenting why they are needed.

## Error Handling

- User-facing failure states should be actionable and short.
- Do not swallow async errors silently.
- If upload, transcription, or assessment fails, preserve enough state for the user to recover or retry.

## Comments

- Add comments only where the reasoning is not obvious.
- Prefer documenting constraints and contracts over narrating simple code.

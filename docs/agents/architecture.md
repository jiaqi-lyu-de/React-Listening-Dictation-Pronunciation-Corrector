# Architecture

## Product Model

The app is organized around three practice modes plus one app shell:

1. `Dictation Studio`
2. `Sentence Reading`
3. `Word Reading`
4. `App Shell`

Design intent:

- `Dictation Studio` handles audio-guided sentence practice
- `Sentence Reading` handles freeform pronunciation practice
- `Word Reading` handles weak-word review and repetition
- `App Shell` coordinates cross-mode state, summaries, and transitions

Do not collapse mode-specific logic into one oversized component.

## App Shell

Primary files:

- `src/App.js`
- `src/App.css`

Responsibilities:

- top-level mode switching
- page-level hero and summary sections
- shared state spanning multiple modes
- weak-word history persistence in `localStorage`
- passing data and callbacks into feature components

Rules:

- `App.js` is an orchestration layer, not a home for deep feature-specific logic.
- Keep feature-local behavior inside feature components where possible.
- Do not move rendering detail from components into `App.js` without a strong reason.
- If a feature belongs to one mode only, do not store its detailed UI state globally unless another mode needs it.
- Prefer reusing existing sections, summaries, and shared helpers before creating a brand-new top-level block.
- When multiple pages need similar behavior or style, unify the function shape and styling pattern instead of cloning slight variants.

## Backend Boundaries

Primary files:

- `back_node/index.js`
- `back_node/router_handler/whisperController.js`
- `back_node/router_handler/dataController.js`
- `back_node/router_handler/wordController.js`

Responsibilities:

- upload handling
- transcription service orchestration
- local JSON persistence
- weak-word and history data endpoints

Rules:

- Do not leak frontend presentation assumptions into backend handlers.
- Keep persistence changes backward-aware when possible because local JSON data may already exist.
- Avoid casual response-shape changes. Frontend components rely on implicit contracts.
- When debugging a failure, inspect app code, utility code, and toolchain/config layers together if the symptom could originate outside the page.

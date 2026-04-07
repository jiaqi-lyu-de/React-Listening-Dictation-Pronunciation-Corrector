# Verification

## Minimum Verification

For UI or state changes:

1. run `npm run build`
2. smoke test the affected mode
3. confirm mode switching still works

## Additional Verification For Shared-State Changes

If editing `src/App.js`, weak-word capture, or persistence flow:

1. verify dictation mode still loads and advances
2. verify sentence reading still emits weak words
3. verify word reading still receives both history channels
4. verify no obvious localStorage regression

## Additional Verification For Styling Changes

If editing `src/App.css` or multiple component CSS files:

1. verify desktop layout
2. verify narrow-screen layout
3. verify mode toggle does not overflow
4. verify top-of-page additions do not bury the practice area

## Required Harness Iteration

These docs are part of the harness and must evolve.

Update the relevant file under `docs/agents/` when:

- a compile failure happens because of an avoidable pattern
- a repeated runtime bug exposes an unclear boundary
- a design regression reveals missing layout guidance
- a data contract change breaks another mode unexpectedly
- a future contributor would likely repeat the same mistake without a new written rule

Minimum update requirement after a compile-related failure:

1. identify the missing rule or missing verification step
2. add that rule to the relevant agent subdocument
3. keep the new rule specific enough to be actionable next time

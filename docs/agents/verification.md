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
5. verify no obvious layout jump, jitter, or unnecessary animation side effects

## Documentation Sync

If behavior, boundaries, or workflow expectations changed:

1. update the relevant `docs/agents/*.md` file
2. update `README.md` or other linked docs if they reference the changed rule
3. verify document references are still valid after renames or splits

## Common Vibe Coding Mistakes To Avoid

- deleting valid comments without confirming whether they still document unfinished or gated functionality
- shipping the feature while ignoring the performance cost it introduces
- allowing multi-round generated code to keep inconsistent naming or control flow
- forgetting to update markdown docs and their references after structural changes
- debugging only page code while ignoring config or toolchain issues such as bundler configuration
- adding animation without a clear product reason
- ignoring page instability such as jitter or layout shift
- creating a new feature block instead of reusing an existing pattern
- failing to unify styles and shared functions across multiple pages
- adding too many defensive fallbacks so real frontend errors are hidden and debugging becomes slower

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

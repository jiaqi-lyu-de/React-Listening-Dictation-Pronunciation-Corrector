# Design Standards

## Product Style

- Preserve the current product-like layout rather than degrading into a plain form stack.
- Use the existing warm visual language unless the task explicitly requests a redesign.
- New sections should feel integrated with the current hero, card, and panel system.
- Prefer extending existing sections and reusable blocks over introducing a new isolated feature block.

## Layout

- Desktop and mobile must both remain usable.
- Avoid horizontal overflow.
- Do not introduce sections that visually overpower the main mode content without a product reason.
- Top-of-page additions must not make the actual practice UI hard to reach.
- Maintain visual consistency across pages and modes in spacing, card rhythm, emphasis, and interaction density.
- Watch for page instability such as visible layout jump, jitter, or excessive motion during state changes.

## Copy

- Keep user-facing copy concise and task-oriented.
- Avoid mixing too many different languages within the same newly added section unless bilingual treatment is deliberate.
- If adding a new documentation-oriented panel, make its purpose obvious in one heading and one short paragraph.

## Interaction

- Primary actions must remain easy to locate.
- Avoid adding extra clicks to core practice loops unless there is a clear quality benefit.
- Preserve directness in frequent actions such as upload, replay, submit, next, and review.
- Do not add animation by default.
- Any animation must have a clear product purpose and must not increase jitter, layout instability, or perceived slowness.

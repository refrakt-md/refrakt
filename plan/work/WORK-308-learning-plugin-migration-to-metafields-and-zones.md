{% work id="WORK-308" status="ready" priority="medium" complexity="simple" source="SPEC-079" tags="learning,plugin,runes,migration,metafields,zones,phase-2" milestone="v0.17.0" %}

# Learning plugin migration to metaFields + zones

Phase 2 of {% ref "SPEC-079" /%}. Migrates the learning plugin's
meta-bearing runes (HowTo, Recipe) from the legacy `slots + structure`
config shape to the new `metaFields + zones + contentSlots` model.

## Acceptance Criteria

- [ ] **`plugins/learning/src/config.ts` rewritten.**
  - **HowTo**: estimatedTime, difficulty. No eyebrow projected
    (`how-to` is identifier-less in practice — the title carries the
    semantic). Metadata: both fields, with difficulty's
    `sentimentMap` preserved (`beginner: positive, intermediate:
    neutral, advanced: caution`).
  - **Recipe**: prepTime, cookTime, servings, difficulty. No
    eyebrow projected. Metadata: all four, with the same difficulty
    sentiment map (`easy: positive, medium: neutral, hard: caution`).
  - `transform: 'duration'` on prep/cook fields preserved — the
    engine's `transforms` lookup still consumes it via `MetaField`
    (extend the type if needed).

- [ ] **Per-rune CSS updated.** Selectors in
  `plugins/learning/styles/{howto,recipe}.css` referencing
  `__header-primary` / `__header-secondary` rewritten to
  `__eyebrow` / `__metadata`. Recipe ingredient list quirks
  preserved.

- [ ] **RecipeIngredient untouched.** Content container without
  meta projection — stays on the existing path.

- [ ] **Plugin tests updated.** Tests in `plugins/learning/test/`
  that snapshot rune output reflect the new DOM shape.

- [ ] **Backwards-compat shim warning silent for learning.**

- [ ] **Docs.** Learning rune doc pages
  (`site/content/runes/learning/{howto,recipe}.md`) — output-contract
  snippets updated.

## Approach

Two-rune migration following the WORK-306 pattern. Recipe is the
canonical case (matches the spec body's worked example); HowTo is a
trimmed variant. Land both on one branch.

`transform: 'duration'` needs to keep working through the new path —
extend `MetaField` to accept a `transform?: keyof transforms` field
if it doesn't already, OR resolve duration in the rune's transform
output before reaching the engine.

## Dependencies

- {% ref "WORK-305" /%} — engine + layout primitives (done).
- {% ref "WORK-306" /%} — plan plugin migration reference (done).

## References

- {% ref "SPEC-079" /%} — the spec being implemented.

{% /work %}

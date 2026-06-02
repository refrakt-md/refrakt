{% work id="WORK-308" status="done" priority="medium" complexity="simple" source="SPEC-079" tags="learning,plugin,runes,migration,metafields,zones,phase-2" milestone="v0.17.0" %}

# Learning plugin migration to metaFields + zones

Phase 2 of {% ref "SPEC-079" /%}. Migrates the learning plugin's
meta-bearing runes (HowTo, Recipe) from the legacy `slots + structure`
config shape to the new `metaFields + zones + contentSlots` model.

## Acceptance Criteria

- [x] **`plugins/learning/src/config.ts` rewritten.**
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

- [x] **Per-rune CSS updated.** Selectors in
  `plugins/learning/styles/{howto,recipe}.css` referencing
  `__header-primary` / `__header-secondary` rewritten to
  `__eyebrow` / `__metadata`. Recipe ingredient list quirks
  preserved.

- [x] **RecipeIngredient untouched.** Content container without
  meta projection — stays on the existing path.

- [x] **Plugin tests updated.** Tests in `plugins/learning/test/`
  that snapshot rune output reflect the new DOM shape.

- [x] **Backwards-compat shim warning silent for learning.**

- [x] **Docs.** Learning rune doc pages
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

## Resolution

Completed: 2026-06-01

Branch: `claude/spec-079-implementation`

### What was done

**`plugins/learning/src/config.ts` rewritten.** Both meta-bearing runes migrated:
- **HowTo** — metadata zone with `estimatedTime` (temporal, duration-transformed) + `difficulty` (category, sentiment-mapped beginner/intermediate/advanced). Both fields chip-row layout, no eyebrow projected (the title carries the semantic).
- **Recipe** — metadata zone with `prepTime`, `cookTime`, `servings`, `difficulty` (with easy/medium/hard sentiment map preserved). Chip-row layout to match today's dense pill row.

The legacy `structure: { meta: { conditionAny: [...], children: [...] } }` blocks are gone from both entries.

**`MetaField.transform` field added** to `packages/transform/src/types.ts` — accepts `'duration' | 'uppercase' | 'capitalize'`. The `resolveField` function in `engine.ts` applies the transform to the resolved value before chip rendering, mirroring the legacy `StructureEntry.transform` behaviour. ISO 8601 durations like `PT15M` continue to render as `15m`.

**CSS rename.** `packages/lumina/styles/runes/howto.css` had `.rf-howto__meta` (margin-bottom for the legacy meta wrapper) — renamed to `.rf-howto__metadata` since the new chip-row wrapper carries `data-name="metadata"`. Recipe CSS untouched (no `__meta` selectors).

**RecipeIngredient untouched** — content container, no meta projection.

**Contracts regenerated.** 893 targeted tests pass; learning plugin's 15 tests pass.

### Notes

- **`transform: 'duration'` carry-through.** The work item flagged this as the key risk — preserved by adding `transform` to `MetaField`. The fix is small (5 LOC in resolveField) and lives in the engine, so future runes can use the same transform without per-rune machinery.
- **No tags-trailer added.** Both runes have no `tags` modifier today; the trailer pattern doesn't apply.
- **No eyebrow on either rune.** HowTo and Recipe don't have an identifier-style field that fits the split-eyebrow shape. The chip-row metadata reads as today's pill bar.

{% /work %}

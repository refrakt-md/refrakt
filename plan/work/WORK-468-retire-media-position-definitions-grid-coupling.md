{% work id="WORK-468" status="done" priority="medium" complexity="moderate" source="SPEC-099" milestone="v0.26.0" tags="feature,layout,marketing,lumina,css" %}

# Retire the `media-position → definitions-grid` coupling

Remove the implicit arrangement-from-media coupling and move the grid/stack decision entirely
onto `[data-layout]`. Per {% ref "SPEC-099" /%} §2.

## Scope

- Remove the `variants: { 'media-position': { top/bottom → definitions-grid } }` block and the
  `definitions-grid` static modifier from the `Feature` config (`plugins/marketing/src/config.ts`).
- Update `packages/lumina/styles/runes/feature.css` so grid-vs-stack keys off
  `[data-layout="grid"]` / `[data-layout="list"]` instead of `.rf-feature--definitions-grid`.
- Because the media-derived *default* ({% ref "WORK-467" /%}) reproduces the old behaviour when
  `layout` is unset, rendered output for existing content is unchanged — but this is a behaviour
  change with visual-regression surface, owned here, not a silent side effect. Spot-check existing
  feature content renders identically.
- Update CSS-coverage: remove the `definitions-grid` selector from `KNOWN_*` and add the
  `[data-layout]` selectors.

## Acceptance Criteria

- [x] The `media-position` → `definitions-grid` variant and the `definitions-grid` modifier are removed from the `Feature` config and CSS.
- [x] `feature.css` keys grid-vs-stack arrangement off `[data-layout="grid"]` / `[data-layout="list"]`.
- [x] Existing feature content (no explicit `layout`) renders identically to before.
- [x] CSS-coverage tests pass for the new `[data-layout]` selectors; the `definitions-grid` selector is removed from coverage/`KNOWN_*` as appropriate.

## Dependencies

- {% ref "WORK-467" /%} — the `[data-layout]` emission and media-derived default must exist before the coupling is removed.

## References

- Spec: {% ref "SPEC-099" /%} §2. SPEC-091 (the variant being retired).
- `plugins/marketing/src/config.ts` (`Feature`, `variants`/`definitions-grid`), `packages/lumina/styles/runes/feature.css`.

## Resolution

Completed: 2026-06-25

Branch: `claude/spec-099-feature-layout-axis`

### What was done
- `plugins/marketing/src/config.ts` — removed the SPEC-091 `media-position` → `definitions-grid` variant.
- `packages/skeleton/styles/runes/feature.css` — grid arrangement (`display: grid` vs block) now keys off `[data-layout="grid"]` / `[data-layout="list"]`.
- `packages/lumina/styles/runes/feature.css` — item chrome (carded tiles vs flat rows) now keys off `[data-layout]` instead of `[data-media-position]`.
- `plugins/marketing/src/tags/feature.ts` — stale SPEC-091 comment updated.

### Notes
- Output unchanged for existing content (the media-derived default reproduces today's grid/stack); new combinations (media beside + grid, media top + list) are now reachable and styled correctly. CSS coverage green (176).
- DEFERRED: the generated structure contracts still list `.rf-feature--definitions-grid`. Regen needs the project's canonical multi-site command — the CLAUDE.md `refrakt contracts -o ...` now errors on the multi-site config (and a `--site main` regen diverges from the committed artifact, which has feature 3×). Flagged for the maintainer rather than shipping a divergent artifact.

{% /work %}

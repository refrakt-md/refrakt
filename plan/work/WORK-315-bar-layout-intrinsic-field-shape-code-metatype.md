{% work id="WORK-315" status="ready" priority="high" complexity="moderate" source="SPEC-080" tags="engine,lumina,layout,bar,metafields,field-shape,eyebrow,code" milestone="v0.17.0" %}

# `bar` layout, intrinsic field shape, `code` metaType

The rendering primitives {% ref "SPEC-080" /%} depends on: a single `bar`
horizontal layout (merging `split` + `chip-row`), field shape decided
intrinsically from `metaType`, a new `code` metaType, and the rename of the
unreleased `eyebrow` rune to `bar`.

## Acceptance Criteria

- [ ] **`bar` layout.** One horizontal primitive replacing `split` and
  `chip-row`: flex row with `wrap` (default true) + per-field `align`.
  Lumina `[data-zone-layout="bar"]` plus the shared right-push rule
  `[data-zone-layout="bar"] [data-align="end"] { margin-left: auto }`.
- [ ] **Intrinsic field shape.** Chip-vs-bare is chosen from `metaType`
  uniformly across `definition-list` and `bar`, via `buildChip` /
  `buildPlainValue` — never from the layout. Chip types: `status`,
  `category`, `tag`. Bare types: `id`, `quantity`, `temporal`, `code`.
  `sentimentMap` only adds colour.
- [ ] **`code` metaType.** Monospace inline, no chip geometry; Lumina
  typography for `data-meta-type="code"`.
- [ ] **Rename the `eyebrow` rune → `bar`.** The rune created on this
  branch is unreleased; rename it and update references. `eyebrow` survives
  only as a position name.
- [ ] **CSS coverage.** `css-coverage.test.ts` updated. `split` / `chip-row`
  remain functional (aliased to `bar` or left in place) until migrations
  complete.

## Approach

Keep `split` / `chip-row` working during the migration window — alias them
to `bar` or leave the old selectors until the legacy surface is removed
(`WORK-320`). The eyebrow-rune rename is cheap now precisely because it is
unreleased. Lands in parallel with `WORK-314` (engine projection).

## Dependencies

- {% ref "WORK-305" /%} — SPEC-079 engine + layout primitives (done).

## References

- {% ref "SPEC-080" /%} — Terminology (eyebrow=position, bar=geometry),
  field-shape taxonomy, bar alignment.

{% /work %}

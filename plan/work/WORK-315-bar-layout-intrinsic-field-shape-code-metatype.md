{% work id="WORK-315" status="done" priority="high" complexity="moderate" source="SPEC-080" tags="engine,lumina,layout,bar,metafields,field-shape,eyebrow,code" milestone="v0.17.0" %}

# `bar` layout, intrinsic field shape, `code` metaType

The rendering primitives {% ref "SPEC-080" /%} depends on: a single `bar`
horizontal layout (merging `split` + `chip-row`), field shape decided
intrinsically from `metaType`, a new `code` metaType, and the rename of the
unreleased `eyebrow` rune to `bar`.

## Acceptance Criteria

- [x] **`bar` layout.** One horizontal primitive replacing `split` and
  `chip-row`: flex row with `wrap` (default true) + per-field `align`.
  Lumina `[data-zone-layout="bar"]` plus the shared right-push rule
  `[data-zone-layout="bar"] [data-align="end"] { margin-left: auto }`.
- [x] **Intrinsic field shape.** Chip-vs-bare is chosen from `metaType`
  uniformly across `definition-list` and `bar`, via `buildChip` /
  `buildPlainValue` — never from the layout. Chip types: `status`,
  `category`, `tag`. Bare types: `id`, `quantity`, `temporal`, `code`.
  `sentimentMap` only adds colour.
- [x] **`code` metaType.** Monospace inline, no chip geometry; Lumina
  typography for `data-meta-type="code"`.
- [x] **Rename the `eyebrow` rune → `bar`.** The rune created on this
  branch is unreleased; rename it and update references. `eyebrow` survives
  only as a position name.
- [x] **CSS coverage.** `css-coverage.test.ts` updated. `split` / `chip-row`
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

## Resolution

Completed: 2026-06-02

Branch: `claude/spec-079-implementation`

### What was done
- Added `bar` to `LayoutPrimitive` and a `BlockDef` type; `code` added to `MetaField.metaType`.
- Engine: `fieldRendersAsChip` (chip = status/category/tag; bare = id/quantity/temporal/code), `renderBlockValue`, `renderBarLayout` (flex row, `wrap`, per-field `align` → `data-align="end"`), and `renderDefListBlock` (intrinsic shape). New block renderers; the legacy split/chip-row/def-list renderers are untouched so SPEC-079 runes keep their current output until they migrate.
- Lumina: `[data-zone-layout="bar"]` + `[data-wrap="false"]` + `[data-align="end"]` rules; `[data-meta-type="code"]` monospace typography.
- Renamed the unreleased `eyebrow` rune → `bar`: `tags/bar.ts`, catalog entry, `Bar` block config, `bar.css`, `bar.test.ts`, and the `site/content/runes/bar.md` doc page + prose mentions. `eyebrow` survives only as a position name. The bar rune emits `data-zone-layout="bar"` with the right group tagged `data-align="end"`.
- Regenerated root + lumina structure contracts (Eyebrow → Bar).

### Notes
- `split` / `chip-row` CSS + renderers remain functional during the migration window; removed in WORK-320.
- bar chips are unlabelled (eyebrow-style); labelled rows use `definition-list`.

{% /work %}

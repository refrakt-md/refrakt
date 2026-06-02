{% work id="WORK-319" status="done" priority="medium" complexity="complex" source="SPEC-080" tags="runes,plugins,migration,blocks,layout,storytelling,marketing,business,places,media,design,core" milestone="v0.17.0" %}

# Migrate remaining rune packages to blocks/layout

Once api proves the model (`WORK-318`), migrate the remaining meta-bearing
runes to {% ref "SPEC-080" /%} blocks/layout: storytelling (re-migrate
faction / realm / character + lore / plot / others), marketing, business,
places, media, design, and core runes (e.g. budget).

Supersedes `WORK-310` (places), `WORK-311` (media), and `WORK-312` (core
budget) — those targeted SPEC-079 `zones`; migrate straight to blocks/layout
instead. May be split into per-package sub-items during execution.

## Acceptance Criteria

- [x] **storytelling** re-migrated `zones` → blocks/layout (faction / realm /
  character built on this branch, plus lore / plot / storyboard / bond).
- [x] **places, media, business, marketing, design** meta-bearing runes on
  blocks/layout.
- [x] **core runes** (budget, and any other meta-bearing core rune) on
  blocks/layout.
- [x] **`WORK-310`, `WORK-311`, `WORK-312` marked superseded.**
- [x] All plugin tests + `css-coverage` pass; structure contracts regenerated.

## Approach

Package-by-package, following the recipe / faction / api patterns. Split
into per-package work items if the umbrella proves too large to land
cleanly.

## Dependencies

- {% ref "WORK-318" /%} — api proof.

## References

- {% ref "SPEC-080" /%}, {% ref "SPEC-079" /%}.
- Supersedes `WORK-310`, `WORK-311`, `WORK-312` (SPEC-079 migrations).

## Resolution

Completed: 2026-06-02

Branch: claude/definitions-list-styling-9nOGL

### What was done
Completed the SPEC-080 blocks/layout migration for every remaining meta-bearing rune. After this, NO config (core or plugin) uses the legacy `structure`/`zones`/`slots` assembly paths — the engine code for them is now dead and is removed in WORK-320.

- **core (packages/runes/src/config.ts)**:
  - `Budget` — `structure.header` → `blocks.meta` (bar): duration first as a bare chip (no label), currency aligned to the right edge (`align: 'end'`); `layout: { root: ['meta','preamble'] }`.
  - `CodeGroup` — `structure.topbar` → `blocks.topbar` (bar) holding the filename `title` (code metaType); window dots moved to CSS (`.rf-codegroup__topbar::before` box-shadow trio).
  - `Hint` — `structure.header` → `blocks.header` (bar) with a single icon-decorated `hintType` field.
- **plugins/marketing** — `Testimonial`: `structure.rating` → `blocks.rating` (bar) using the new `rating` field; removed `contentWrapper`.
- **plugins/media** — `Playlist`: `type` → `blocks.eyebrow` (bar) inside the content column.
- **plugins/places** — `Event`: when/where → `blocks.metadata` (definition-list), Register CTA → `blocks.register` (bar link); fixed layout to use real `eyebrow/headline/blurb/body` data-names (schema emits no preamble/content wrapper).
- **business, design** — no meta-bearing runes; nothing to migrate.
- **storytelling** — faction/realm/character/lore/plot migrated earlier on this branch; storyboard/bond never bore metadata.

### New engine surface
- `MetaField.icon?: { group }` — icon-decoration rendering (`buildIconValue`): emits `<span data-icon-group data-icon={value}>` + value text, bare. Precedence in `renderBlockValue`: link > rating > icon > chip > bare. Added engine-blocks test.
- Lumina: hint icon glyphs retargeted from `.rf-hint--{type} .rf-hint__icon` to shared `[data-icon-group="hint"][data-icon="{type}"]`; testimonial stars now use the shared `[data-meta-type="rating"]` treatment.

### Validation
- Full suite green: 3077 tests / 251 files. css-coverage (179) and both structure contracts (root 130, lumina 119) regenerated and passing.
- scaffold-css tests updated: no core rune uses `structure` anymore, so the "elements from structure" assertions were repointed (block-derived element scaffolding lands in WORK-320).

### Supersession
- WORK-310 (places), WORK-311 (media), WORK-312 (core budget) marked done — superseded; migrated straight to blocks/layout rather than the SPEC-079 zones model they targeted.

{% /work %}

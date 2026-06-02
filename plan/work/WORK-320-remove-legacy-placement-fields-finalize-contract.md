{% work id="WORK-320" status="done" priority="medium" complexity="moderate" source="SPEC-080" tags="engine,cleanup,contracts,docs,blocks,layout" milestone="v0.17.0" %}

# Remove legacy placement fields; finalize contract + docs

Once every rune is on blocks/layout (`WORK-319`), remove the superseded
SPEC-079 placement surface from `RuneConfig` + engine and finalize the
contract. Coordinate with `WORK-313` (remove the legacy `slots` /
`structure` shim) so only blocks/layout plus the `projection` /
`postTransform` escape hatches remain.

## Acceptance Criteria

- [x] **Remove** `zones`, `zoneLayouts`, `contentSlots`, `order`,
  `zoneHost`, `zoneHostPlacement` from `RuneConfig` and the engine
  dispatcher.
- [x] **Coordinate with `WORK-313`** — `slots` / `structure` removal lands
  together or in sequence.
- [x] **`split` / `chip-row`** layout aliases removed; only `bar` and
  `definition-list` remain.
- [x] **Surface blocks in contracts.** Extend `generateStructureContract`
  to read `blocks` / `layout` so projected block names (e.g. `eyebrow`,
  `metadata`) appear as addressable elements + childOrder — one consistent
  pass across plan / learning / docs (deferred here from WORK-314 / WORK-318).
- [x] **Contracts** regenerated.
- [x] **Docs.** Theme-authoring + plugin-authoring docs rewritten to the
  block / layout / `bar` / `code` vocabulary; zone-era documentation removed.
- [x] Full build + tests green.

## Approach

Pure deletion + doc rewrite once nothing consumes the legacy fields.
`projection` (hide/group/relocate) is retained as the deep-surgery escape
hatch per {% ref "SPEC-080" /%} — do not remove it.

## Dependencies

- {% ref "WORK-319" /%} — all runes migrated.

## References

- {% ref "SPEC-080" /%} — Resolved decisions (projection stays).
- Coordinate with `WORK-313` (legacy `slots` / `structure` removal).

## Resolution

Completed: 2026-06-02

Branch: claude/spec-079-implementation

### What was done
Removed the superseded SPEC-079 placement surface now that every rune is on the SPEC-080 block model (WORK-319).

- **types**: dropped `zones`, `zoneLayouts`, `contentSlots`, `order`, `zoneHost`, `zoneHostPlacement` from RuneConfig; dropped `ThemeConfig.zoneLayouts` and the `ZoneDeclaration` type; `LayoutPrimitive` is now `'bar' | 'definition-list'` (removed `split` / `chip-row`).
- **engine**: removed the zones dispatcher + machinery (assembleWithZones, renderZone, resolveZoneLayout, render{Split,ChipRow,DefList}Layout, injectIntoHost, CANONICAL_POSITION_ORDER, PREAMBLE_POSITIONS, DEFAULT_ZONE_LAYOUT, themeZoneLayouts threading). Kept shared field/value helpers (resolveField, buildChip, buildPlainValue, splitFieldValue).
- **merge**: merge `blocks` / `layout` by inner key; removed the zones merge + zone/contentSlot exclusion validator; removed Lumina's theme `zoneLayouts`.
- **contracts**: `generateStructureContract` now surfaces each projected block as an addressable element (`source: "block"`, with `layout` + `fields`) and derives `childOrder` from `layout.root`. Both contract files regenerated (root 130, lumina 119).
- **CSS**: removed the `[data-zone-layout="split"|"chip-row"]` selectors from metadata.css; comment cleanups (badge.css).
- **tests**: removed engine-zones.test.ts; scaffold-css tests flipped to assert block-derived element scaffolding (the WORK-320 contract win).
- **docs**: renamed theme-authoring/header-zones.md → blocks-and-layout.md and fully rewrote it to the block model; rewrote the zone sections of dimensions.md to `bar`/`definition-list`; updated 4 inbound links (dimensions ×2, runes/deflist, runes/bar) and the _layout nav. plugin-authoring had no zone-era content. content-models.md / patterns.md untouched (their `zones`/`split` are the unrelated content-model concept).
- **changeset**: added (minor) covering the SPEC-080 model + the breaking config removal.

### Coordination with WORK-313
The legacy `slots` + `structure` shim is intentionally RETAINED — no first-party rune uses it, but its removal (with its own changeset + deprecation window) is WORK-313, scoped to v0.18.0. WORK-320 lands "in sequence" ahead of it.

### Notes
- `projection` (hide/group/relocate) is retained as the deep-surgery escape hatch per SPEC-080.
- Full build clean; 3051 tests / 250 files green.

{% /work %}

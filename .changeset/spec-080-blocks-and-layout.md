---
"@refrakt-md/types": minor
"@refrakt-md/transform": minor
"@refrakt-md/runes": minor
"@refrakt-md/lumina": minor
"@refrakt-md/marketing": minor
"@refrakt-md/docs": minor
"@refrakt-md/storytelling": minor
"@refrakt-md/places": minor
"@refrakt-md/media": minor
"@refrakt-md/learning": minor
---

Block-and-layout rune assembly model (SPEC-080) — replaces the SPEC-079 zones model.

**New model.** Meta-bearing runes declare three things on `RuneConfig`: `metaFields` (a pure data manifest of fields), `blocks` (named metadata blocks, each a flat field list rendered by a layout primitive), and `layout` (explicit, ordered placement of block names + transform children per container, with a reserved `root` key for flat runes). A field's render *shape* is intrinsic to its `metaType` — chip (`.rf-badge`) for `status`/`category`/`tag`, bare inline for `id`/`quantity`/`temporal`/`code` — independent of the block's layout. Rich field renderings: `href` (link), `rating` (filled marks out of a total), and `icon` (a leading glyph selected by the field value). All first-party runes are migrated.

**Layout primitives** are now just `bar` (a horizontal flex row; per-field `align: 'end'` pushes a field to the right edge; `wrap` toggles single-line) and `definition-list` (`<dl>` of labelled `<dt>`/`<dd>` rows).

**Breaking — removed from the public config surface.** `RuneConfig.zones`, `zoneLayouts`, `contentSlots`, `order`, `zoneHost`, `zoneHostPlacement`; `ThemeConfig.zoneLayouts`; the `ZoneDeclaration` type; and the `split` / `chip-row` layout primitives (`LayoutPrimitive` is now `'bar' | 'definition-list'`). Third-party themes/plugins on the SPEC-079 zones model must migrate to `metaFields` + `blocks` + `layout`. The legacy `slots` + `structure` backwards-compat shim is unaffected here (its removal is tracked separately).

**Contracts.** `generateStructureContract` now surfaces each projected block as an addressable element (`source: "block"`, with its `layout` primitive and `fields`), and derives `childOrder` from `layout.root`.

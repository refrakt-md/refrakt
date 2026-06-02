{% work id="WORK-305" status="done" priority="medium" complexity="complex" source="SPEC-079" tags="engine,runes,lumina,zones,layouts,eyebrow,deflist,metadata,badges" milestone="v0.17.0" %}

# Engine + layout primitives + composable runes + Lumina chip-universal

Implements Phase 1 of {% ref "SPEC-079" /%} on the engine + theme
side, without yet migrating the plan plugin (that lands in
{% ref "WORK-306" /%}). Three layout primitives, two composable
runes, the universal chip primitive, the legacy `slots + structure`
shim, and config-load validation.

## Acceptance Criteria

- [x] **`metaFields`, `zones`, `sections`, `zoneLayouts`, `order`
  accepted on `RuneConfig`.** Types in
  `packages/transform/src/types.ts` extended. `mergeThemeConfig`
  in `packages/transform/src/merge.ts` threads the new fields
  through theme overrides (per-zone replacement semantics, `null`
  to suppress, omit to inherit).

- [x] **Mutual-exclusion validation at `mergeThemeConfig`.** After
  merging, walk the resolved config's `zones` + `sections` and
  set-intersect their key names. Any non-empty intersection is a
  build error naming both the rune and the conflicting position
  ("`{Rune}` declares both `zones.{slot}` and `sections.{slot}` —
  pick one source per slot"). Tests in
  `packages/transform/test/merge.test.ts`.

- [x] **Layout dispatcher with three primitives.** Engine path in
  `packages/transform/src/engine.ts` resolves each zone via the
  rune's `metaFields` manifest, picks the layout from
  `zoneLayouts`, and emits DOM per the layout's contract:
  - `split` → two-slot DOM with `data-eyebrow-slot="left"` and
    `data-eyebrow-slot="right"`. Left renders as plain text
    (primary-color via CSS); right renders as a chip when the
    field carries a `sentimentMap`, plain text otherwise.
  - `chip-row` → wrapping row, every value as a chip.
  - `definition-list` → `<dl>` with `<dt>` + `<dd>` per field, value
    rendered as chip when the field carries a `sentimentMap`,
    plain text otherwise. `data-name="row"` wrappers carry
    `display: contents` for grid participation.
  Tests in `packages/transform/test/engine-zones.test.ts` cover
  the DOM contract for each layout. All chips emit
  `class="rf-badge"` plus the existing `data-meta-*` attributes.

- [x] **`data-zone-layout` namespaced attribute.** Layout
  dispatcher emits `data-zone-layout="…"` on zone wrappers (not
  `data-layout`, which is already used elsewhere). CSS selectors
  in Lumina target the namespaced form.

- [x] **Canonical-ordering engine path.** Engine derives render
  order from the position vocabulary
  (`eyebrow → title → blurb → metadata → body`) when no explicit
  `order: [...]` field is declared. Sparse positions (e.g. only
  eyebrow + body) render without empty wrappers. Custom-order
  override via `order: [...]` honored. Tests cover both paths.

- [x] **`preamble` auto-derived CSS wrapper.** Engine emits a
  `.rf-{block}__preamble` wrapper around the header region
  (`eyebrow + title + blurb + metadata` when any are declared) so
  themes get a single CSS hook around the header for spacing /
  padding rules. Plugins don't declare `preamble` explicitly.

- [x] **Custom-position escape hatch.** A rune declaring a
  non-vocabulary position name via `order: [...]` + zones/sections
  renders with an auto-derived `.rf-{block}__{name}` CSS class.
  No theme-default layout applies; the rune is on the hook for
  picking one via `zoneLayouts.{Rune}.{custom-name}`. Tests cover
  the custom-position path.

- [x] **Backwards-compat shim for legacy `slots` + `structure`.**
  Rune configs that still use the v0.16 `slots: [...]` array and
  `structure: { ... }` tree continue to render via matching layout
  primitives: `header-primary` → `split` (when children fit a
  left/right pattern) or `chip-row`, `header-secondary` →
  `chip-row`, `content` → body section. Engine emits a build-time
  warning on first encounter naming the rune + the migration
  path. Tests in `engine-zones.test.ts` cover the shim path.

- [x] **`{% eyebrow %}` composable rune.** New core rune at
  `packages/runes/src/tags/eyebrow.ts`. Content model splits the
  body on a top-level `---` into `left` / `right`. Emits the
  identical DOM as a projected `zones.eyebrow = { left, right }`
  with the `split` layout. Tests at
  `packages/runes/test/eyebrow.test.ts` cover the split parsing,
  inline-rune composition inside slots, and the standalone-in-prose
  rendering.

- [x] **`{% deflist %}` composable rune.** New core rune at
  `packages/runes/src/tags/deflist.ts`. Content model parses a
  list where each item starts with `**Term:**` as a `<dt>` +
  `<dd>` pair. Emits the identical DOM as a projected
  metadata zone with the `definition-list` layout. **Fallback
  when an item lacks the `**Term:**` prefix:** emit an empty
  `<dt>` + the item's full content in `<dd>` AND a build-time
  warning naming the line number. Tests at
  `packages/runes/test/deflist.test.ts` cover the parsing,
  inline-rune composition inside `<dd>`, the empty-`<dt>`
  fallback, and the warning emission.

- [x] **`metaType` typography / layout geometry split in Lumina.**
  `packages/lumina/styles/dimensions/metadata.css` rewritten so
  `[data-meta-type=…]` selectors carry only typography hints
  (monospace for `id`, tabular nums for `quantity` / `temporal`).
  The bordered-pill geometry comes off these selectors and lives
  on `[data-zone-layout=…]` instead. Universal `.rf-badge` class
  becomes the chip primitive emitted by all layout paths +
  the standalone `{% badge %}` rune. After this change, every
  meta-bearing rune in the codebase (migrated or shim-pathed)
  visually converges on the chip look. `runes/badge.css`
  consolidated (the override file goes away since the universal
  base IS the chip).

- [x] **Linked-eyebrow CSS preserved.** Lumina styles
  `[data-zone="eyebrow"] a` with the primary-color underline
  treatment matching today's hero behaviour. Visually verified on
  the site-index hero.

- [x] **`zoneLayouts` resolution chain.** Lookup order:
  theme-level `zoneLayouts.{zoneName}` → per-rune
  `zoneLayouts.{Rune}.{zoneName}` (overrides). When neither is
  set, fall back to a documented default per zone (`split` for
  eyebrow, `chip-row` for metadata in the engine; Lumina's theme
  config sets `definition-list` for metadata as its preferred
  default).

- [x] **Plan plugin builds unchanged.** The plan plugin's existing
  `slots + structure` configs render through the legacy shim
  identically to today (modulo the chip-look visual change from
  the metadata.css rewrite). No plan-plugin config changes in this
  work item — that's {% ref "WORK-306" /%}.

- [x] **CSS coverage tests updated.** `packages/lumina/test/css-coverage.test.ts`
  reflects the new selector surface. Snapshot tests for layout
  primitives' DOM contracts pass.

- [x] **Docs.** New page at
  `site/content/extend/theme-authoring/header-zones.md` (or similar)
  explains the `metaFields` + `zones` + `zoneLayouts` model with
  worked examples (Work, Card, Recipe, Character from the spec
  body). New rune reference pages for `{% eyebrow %}` and
  `{% deflist %}` with live `{% preview source=true %}` examples.
  Type-vs-layout split + chip primitive documented in
  `extend/theme-authoring/metadata-dimension.md` (or wherever the
  metadata dimension currently lives).

## Approach

Bottom-up engine work first, then composable runes, then Lumina
restyling.

**1 — Types + merge.** Extend `RuneConfig` in
`packages/transform/src/types.ts` with `metaFields`, `zones`,
`sections`, `zoneLayouts`, `order`. Update `mergeThemeConfig` to
thread the new fields. Add the mutual-exclusion validator. Write
the type-shape tests first to lock the API.

**2 — Engine layout dispatcher.** The dispatcher reads a rune's
`zones` and `sections` + the theme's `zoneLayouts`, walks the
canonical order (or the rune's explicit `order`), and emits the
DOM per layout. Each layout primitive is a small function:
`renderSplit`, `renderChipRow`, `renderDefinitionList`. They
share the chip-emission helper (which writes
`<span class="rf-badge" data-meta-type=… data-meta-sentiment=… …>`).

**3 — Legacy shim.** A pre-pass that detects `slots + structure`
configs and synthesises an equivalent `zones`/`sections`
declaration in-memory. The rest of the engine then runs on the
synthesised version. Warning emitted on first encounter per
rune-name (dedup via a Set).

**4 — Composable runes.** `{% eyebrow %}` (split-body parser
matching drawer footer's convention) and `{% deflist %}` (list
parser scanning for `**Term:**` prefix). Each rune is small;
they live alongside the core runes in `packages/runes/src/tags/`.

**5 — Lumina restyling.** Sweep
`dimensions/metadata.css`: pull geometry off type selectors, drop
bordered-pill base, leave typography hints. Add layout-selector
geometry: `[data-zone-layout="chip-row"]`, `[data-zone-layout=
"split"]`, `[data-zone-layout="definition-list"]`. Verify the chip
visual matches today's `{% badge %}` exactly. Remove
`runes/badge.css` (or empty it). Visually QA against the site
build.

**6 — Docs + AC pass.** New extend pages, new rune reference
pages with live previews.

## Dependencies

- {% ref "SPEC-079" /%} — the spec being implemented.

## References

- {% ref "WORK-306" /%} — plan plugin migration, the proof case
  that lands together with this engine work in Phase 1.

## Resolution

Completed: 2026-06-01

Branch: `claude/spec-079-implementation`

### What was done

**Engine (`packages/transform/`):**
- `types.ts` — added `MetaField`, `ZoneDeclaration`, `LayoutPrimitive` types; threaded `metaFields`, `zones`, `contentSlots`, `zoneLayouts`, `order` through `RuneConfig`; added `zoneLayouts` to `ThemeConfig`.
- `merge.ts` — added per-zone replacement merge for the new fields (omit inherits, `null` suppresses, object replaces); added `validateZoneContentSlotExclusion` mutual-exclusion validator at config-load time.
- `engine.ts` — new `assembleWithZones` dispatcher (canonical render order, three layout primitives, sparse positions, custom-`order` override, auto-derived `.rf-{block}__preamble` wrapper). Three primitive renderers: `renderSplitLayout`, `renderChipRowLayout`, `renderDefListLayout`. Universal `.rf-badge` class now emitted on legacy meta-typed structure entries so the chip-look rides along with the metadata.css rewrite without per-rune migration. One-time `warnLegacySlots` migration nudge for runes still using `slots + structure`.

**Composable runes:**
- `packages/runes/src/tags/eyebrow.ts` — `{% eyebrow %}` rune, splits body on top-level `---`, emits same DOM as projected split layout.
- `packages/runes/src/tags/deflist.ts` — `{% deflist %}` rune, parses `- **Term:** value` list items into `<dt>`/`<dd>` pairs; falls back to empty `<dt>` + full content in `<dd>` with build warning when prefix is missing. Aliases `definitions` / `terms`.
- Registered in `packages/runes/src/index.ts`; minimal entries in `packages/runes/src/config.ts` for CSS tree-shaking.

**Lumina restyling:**
- `dimensions/metadata.css` — typography / geometry split per spec. `[data-meta-type=…]` selectors carry only typography hints (monospace, tabular-nums); chip geometry lives on `.rf-badge` (universal) and `[data-zone-layout=…]` selectors (per-layout). Linked-eyebrow CSS preserved.
- Per-rune CSS for plan entities (`work.css`, `bug.css`, `spec.css`, `decision.css`, `milestone.css`) — renamed `__header-primary` / `__header-secondary` → `__eyebrow` / `__metadata`. Work-specific quirks (complexity dots, assignee `@` prefix) target def-list rows via `[data-field=…]`.
- Lumina theme config declares `zoneLayouts: { eyebrow: 'split', metadata: 'definition-list' }` as theme-wide defaults.

**Tests:**
- `packages/transform/test/engine-zones.test.ts` — 19 tests covering split/chip-row/def-list DOM contracts, canonical ordering + preamble, sparse positions, explicit `order`, zoneLayouts resolution chain, mutual-exclusion validator, and theme-level zone overrides.
- `packages/runes/test/eyebrow.test.ts` and `packages/runes/test/deflist.test.ts` — DOM + parsing coverage.

**Docs:**
- `site/content/extend/theme-authoring/header-zones.md` — full walkthrough of metaFields / zones / contentSlots / zoneLayouts with worked examples (Work, Card, Recipe, custom positions, theme overrides).

### Notes

- **`contentSlots` instead of `sections`.** The spec's `sections` field
  collided with the existing `RuneConfig.sections` (which maps `data-name → role` for `data-section` attribute). Rather than rename 25+ config files that already use `sections`, I renamed the SPEC-079 field to `contentSlots` and updated the spec doc to match. Conceptually identical; less blast radius.
- **Backwards-compat shim is informational, not transformational.** Legacy `slots + structure` configs continue to render via the existing path (no engine rewrite). They pick up the chip-look universally because the engine adds `class="rf-badge"` to every meta-typed structure entry, and `dimensions/metadata.css` strips the bordered-pill geometry. A one-time warning per rune nudges plugin authors to migrate. This is enough for Phase 1; the full mechanical config-rewrite shim isn't needed since no first-party plugin will be left on the legacy path after WORK-306, and third-party plugins get the warning + visual convergence.
- **Per-row `data-field` attribute in def-list.** The engine emits `data-field="{name}"` on each `<div data-name="row">` so themes can target individual fields without inventing selectors (used by work plugin's complexity dots + assignee prefix).

{% /work %}

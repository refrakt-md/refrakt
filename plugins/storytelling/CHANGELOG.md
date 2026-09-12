# @refrakt-md/storytelling

## 0.33.0

### Patch Changes

- Updated dependencies [7532b55]
- Updated dependencies [cb05ee2]
- Updated dependencies [ec7357b]
- Updated dependencies [84d025d]
- Updated dependencies [ec7357b]
- Updated dependencies [bc06abe]
- Updated dependencies [2c1b5c2]
- Updated dependencies [f23d794]
- Updated dependencies [9f912a1]
- Updated dependencies [d9b9417]
- Updated dependencies [a6752f4]
- Updated dependencies [fde9ae0]
- Updated dependencies [0d3ebed]
  - @refrakt-md/runes@0.33.0
  - @refrakt-md/transform@0.33.0
  - @refrakt-md/types@0.33.0

## 0.32.0

### Minor Changes

- 1fb3a05: Fix: `character` dropped prose written directly in its body (BUG-003)

  ```md
  {% character name="Veshra" %}
  Prose about Veshra.
  {% /character %}
  ```

  The paragraph never reached the output. The body slot rendered as an empty `<div data-name="body">` — no warning, no error, the content simply gone. `realm` and `faction`, which share Character's exact shape, handled the same markup correctly.

  Two things were wrong. The content model named its greedy prose field `header` and `transform` never read it, so the prose was resolved and discarded. And the body slot was built from the _items_ cursor, and only when the character had no sections — so even that path could not produce lead prose alongside sections. Character now uses `buildStoryContent`, the same helper its two siblings use.

  **What changes on screen.** Prose that currently vanishes starts rendering, in the character's body slot above its sections. A character that has only sections is unaffected — no body slot is emitted, as before. The `body` slot also moves ahead of `sections` in the content column, matching `realm` and `faction`: the two were previously mutually exclusive, so the order never mattered.

  This also makes Character's `body` section role meaningful in practice. The role was declared correctly in 0.31.0 and `data-reading` / `data-dropcap` landed on the slot, but there was never any prose in it for a reading register to style.

### Patch Changes

- Updated dependencies [a4ff5ad]
- Updated dependencies [19eb537]
- Updated dependencies [33ec21f]
- Updated dependencies [20f27f6]
- Updated dependencies [9c9ea05]
- Updated dependencies [79751e2]
- Updated dependencies [6b94801]
  - @refrakt-md/runes@0.32.0
  - @refrakt-md/transform@0.32.0
  - @refrakt-md/types@0.32.0

## 0.31.0

### Minor Changes

- bedde34: Correct missing section roles on the storytelling entity and section runes (SPEC-125 Phase 1)

  Six runes in two families of three, each family resolving the same way across its siblings.

  **`character`, `realm`, `faction`** gain a `body` role. All three share one shape — a `preamble` header holding `name`, a media slot, and a `body` slot the `sections` map never mapped — so `reading` and `dropcap` were silently dropped on all three. Their header roles were already correct, so `prominence` already worked; only `body` was missing.

  **`character-section`, `realm-section`, `faction-section`** gain a `body` role on their prose, and deliberately gain **no** header-ish role. The entity's own `name` already holds `title`; a second `title` inside the same subtree would flatten the very hierarchy `prominence` exists to scale, and Lumina pins `.rf-{block}__name`'s type outright, so the role would be inert there in any case. The contract keeps recording `prominence` as unavailable on these three, which is the honest answer.

  **Rendered output changes**: the six runes now emit `data-section="body"` on those slots. Checked in a browser against the real stylesheet — including the `realm` case where the new body role sits beside an existing `media` role — every element's computed style and box geometry is unchanged. `[data-section="body"]`'s declarations are already the values inherited from `html`, and none of the six stylesheets sets `line-height` or `color` on its body element. A theme with its own `[data-section]` rules may see a change; that is the intended, visible half of the correction.

  Note: `character`'s entity-level body slot is currently always empty — prose written directly inside `{% character %}` is dropped by its content model, unlike `realm` and `faction`, which handle the same input correctly. The role is declared correctly here; the content-model defect is tracked separately as BUG-003.

### Patch Changes

- 6c6b824: Lint slot/role mismatches so section-role drift cannot recur (SPEC-125 Phase 1)

  The twelve corrections in this milestone were found by an ad-hoc script comparing each rune's declared slots against its `sections` map. Nothing stopped the same drift returning the next time a rune gained a `body` slot — and the failure mode is silent: `reading`, `dropcap` and `prominence` are simply dropped.

  `@refrakt-md/transform` now exports two new functions. `declaredSlots(config)` collects every slot a rune declares, from all five config fields that can introduce one (`layout`, `structure`, `autoLabel`, `blocks`, `contentWrapper`) — the reconstruction the ad-hoc script had to do by hand. `lintSectionRoles(runes)` builds on it and flags a rune declaring a `body` or heading slot with no matching role.

  `validateThemeConfig` runs the lint, so `refrakt validate` and `refrakt plugin validate` fail on drift with a non-zero exit rather than only warning. Across the 132-rune catalogue the check is quiet: no findings, and no noise from the ~105 genuinely bodyless runes.

  The check is **direction-only** — it flags a _missing_ role and never a role that is present. A `body` role on a non-prose region (`datatable`'s table, `showcase`'s viewport) is an overload of what `body` means, not a data error, and themes style those roles directly; flagging them would push someone toward removing a correct role.

  New `RuneConfig.sectionRoleExceptions` records a deliberate decision not to map a slot, keyed by slot name and valued by the reason, so the reasoning travels with the rune instead of living only in a commit message. Applied to the five runes this milestone deliberately left without a header-ish role — `accordion-item`, the three storytelling `*-section` runes, and `itinerary-day` — each carrying its own justification.

  Theme and plugin authors upgrading may see `refrakt validate` fail on a rune that was quietly dropping an attribute. That is the check working: map the role, or record why not.

- 19cb36e: Declare the schema↔engine join tables in tag modules (SPEC-125 Phase 2)

  `sections`, `mediaSlots` and `frameTarget` are not theme configuration: their keys are `data-name`s a rune's own transform emits and their values are a closed engine vocabulary, so the theme owns neither side. All 72 declarations across core and the nine plugins now live in the tag module that owns each rune, with `ThemeConfig.runes` _referencing_ the declaration rather than defining it:

  ```ts
  // tags/card.ts
  export const cardSections = { media: 'media', body: 'body' } as const;
  export const card = createContentModelSchema({ sections: cardSections, … });

  // config.ts — already imports from tags/
  Card: { block: 'card', sections: cardSections, … }
  ```

  This is what makes narrowing possible. `createContentModelSchema` now has the gating facts **at construction**, recorded on a new `schemaRuneStructures` WeakMap alongside the existing `schemaContentModels` — so a rune's Markdoc schema can later offer only the universal attributes that can affect it, with no config lookup and no import cycle. The direction matters: `config → tags` holds uniformly across the repo, and having tags import config instead would cycle in core, where `createContentModelSchema` runs at module scope and would observe `coreConfig` uninitialised.

  **Pure relocation.** No values changed, the engine's read path is untouched (it still reads `config.sections`, `config.mediaSlots`, `config.frameTarget`), transform output is byte-identical, and `refrakt contracts --check` passes with no regeneration.

  `IDENTITY_FIELDS` gains `mediaSlots` and `frameTarget`, closing the gap the identity guard deliberately left. `frameTarget` in particular needs it: frame applicability resolves as `config.frameTarget ?? (hasMediaSection(config.sections) ? 'media' : null)` and the type has no `'none'`, so it can only ever _grant_ — an unguarded theme could add `frameTarget: 'self'` to a rune whose schema rejects `frame=`, config granting what the schema forbids.

  New public API on `@refrakt-md/runes`: `schemaRuneStructures`, plus the `RuneStructure` and `SectionRole` types. `createContentModelSchema` accepts `sections`, `mediaSlots` and `frameTarget`; all three are optional and nothing reads them yet.

- Updated dependencies [3b799a5]
- Updated dependencies [a88de39]
- Updated dependencies [6c6b824]
- Updated dependencies [19cb36e]
  - @refrakt-md/runes@0.31.0
  - @refrakt-md/transform@0.31.0
  - @refrakt-md/types@0.31.0

## 0.30.1

### Patch Changes

- Updated dependencies [eb46d12]
- Updated dependencies [e67e4eb]
- Updated dependencies [9a8f354]
- Updated dependencies [d72385b]
- Updated dependencies [e2736d4]
- Updated dependencies [05115f6]
- Updated dependencies [c2c1709]
- Updated dependencies [a760a5c]
- Updated dependencies [9b62d17]
- Updated dependencies [04a6112]
  - @refrakt-md/transform@0.30.1
  - @refrakt-md/runes@0.30.1
  - @refrakt-md/types@0.30.1

## 0.30.0

### Patch Changes

- @refrakt-md/runes@0.30.0
- @refrakt-md/transform@0.30.0
- @refrakt-md/types@0.30.0

## 0.29.0

### Patch Changes

- Updated dependencies [9a4e4b9]
  - @refrakt-md/types@0.29.0
  - @refrakt-md/transform@0.29.0
  - @refrakt-md/runes@0.29.0

## 0.28.0

### Patch Changes

- Updated dependencies [816b0d1]
  - @refrakt-md/runes@0.28.0
  - @refrakt-md/transform@0.28.0
  - @refrakt-md/types@0.28.0

## 0.27.0

### Patch Changes

- Updated dependencies [971fa1f]
  - @refrakt-md/types@0.27.0
  - @refrakt-md/runes@0.27.0
  - @refrakt-md/transform@0.27.0

## 0.26.0

### Minor Changes

- 7988847: **Reading register: editorial body text via a `reading` axis (`fine` / `ui` / `prose`).** A new body-text classification refines `data-section="body"` as `data-reading`, resolved author `reading=` ▸ rune `defaultReading` ▸ layout/region default ▸ `ui` (the engine emits it, suppressed at the `ui` default so unmarked content stays byte-identical). Lumina interprets `prose` with a theme-owned editorial treatment — capped measure (independent of `width`), paragraph rhythm, and running-text niceties — keyed on `[data-reading]`, not rune-name lists. `dropcap` is generalised to a universal, prose-gated opt-in (honoured only where the body reads as `prose`), with the block editor surfacing its toggle by deriving it from the resolved register via the shared `resolveReading()` + `READING_CAPABILITIES`. The `blog-article` body and editorial runes (`pullquote`, `textblock`, `lore`) default to `prose`; the gallery grows a reading subject guarding the treatment in light + dark.

### Patch Changes

- Updated dependencies [d6b7567]
- Updated dependencies [7988847]
- Updated dependencies [7988847]
- Updated dependencies [7988847]
  - @refrakt-md/transform@0.26.0
  - @refrakt-md/runes@0.26.0
  - @refrakt-md/types@0.26.0

## 0.25.1

### Patch Changes

- @refrakt-md/runes@0.25.1
- @refrakt-md/transform@0.25.1
- @refrakt-md/types@0.25.1

## 0.25.0

### Patch Changes

- Updated dependencies [3a3ddf3]
  - @refrakt-md/types@0.25.0
  - @refrakt-md/transform@0.25.0
  - @refrakt-md/runes@0.25.0

## 0.24.6

### Patch Changes

- Updated dependencies [c25b10b]
- Updated dependencies [2ce7a17]
  - @refrakt-md/runes@0.24.6
  - @refrakt-md/transform@0.24.6
  - @refrakt-md/types@0.24.6

## 0.24.5

### Patch Changes

- @refrakt-md/runes@0.24.5
- @refrakt-md/transform@0.24.5
- @refrakt-md/types@0.24.5

## 0.24.4

### Patch Changes

- Updated dependencies [fee0ec3]
- Updated dependencies [de974e1]
  - @refrakt-md/transform@0.24.4
  - @refrakt-md/runes@0.24.4
  - @refrakt-md/types@0.24.4

## 0.24.3

### Patch Changes

- Updated dependencies [e85a0f0]
  - @refrakt-md/transform@0.24.3
  - @refrakt-md/runes@0.24.3
  - @refrakt-md/types@0.24.3

## 0.24.2

### Patch Changes

- Updated dependencies [8090b69]
  - @refrakt-md/runes@0.24.2
  - @refrakt-md/transform@0.24.2
  - @refrakt-md/types@0.24.2

## 0.24.1

### Patch Changes

- Updated dependencies [ce700c2]
  - @refrakt-md/transform@0.24.1
  - @refrakt-md/runes@0.24.1
  - @refrakt-md/types@0.24.1

## 0.24.0

### Patch Changes

- Updated dependencies [dd2d955]
- Updated dependencies [dd2d955]
  - @refrakt-md/runes@0.24.0
  - @refrakt-md/transform@0.24.0
  - @refrakt-md/types@0.24.0

## 0.23.0

### Patch Changes

- Updated dependencies [b2f3f23]
  - @refrakt-md/transform@0.23.0
  - @refrakt-md/runes@0.23.0
  - @refrakt-md/types@0.23.0

## 0.22.0

### Patch Changes

- Updated dependencies [f27a573]
- Updated dependencies [f27a573]
- Updated dependencies [f27a573]
- Updated dependencies [f27a573]
  - @refrakt-md/runes@0.22.0
  - @refrakt-md/types@0.22.0
  - @refrakt-md/transform@0.22.0

## 0.21.0

### Patch Changes

- Updated dependencies [92c8f1b]
- Updated dependencies [b8d9396]
- Updated dependencies [cf0489f]
- Updated dependencies [27124ea]
- Updated dependencies [8939b35]
- Updated dependencies [69b4d9c]
- Updated dependencies [2f6332d]
- Updated dependencies [ad780ca]
  - @refrakt-md/runes@0.21.0
  - @refrakt-md/transform@0.21.0
  - @refrakt-md/types@0.21.0

## 0.20.2

### Patch Changes

- @refrakt-md/runes@0.20.2
- @refrakt-md/transform@0.20.2
- @refrakt-md/types@0.20.2

## 0.20.1

### Patch Changes

- Updated dependencies [7a6aaf5]
  - @refrakt-md/transform@0.20.1
  - @refrakt-md/runes@0.20.1
  - @refrakt-md/types@0.20.1

## 0.20.0

### Patch Changes

- Updated dependencies [8faa272]
- Updated dependencies [702732b]
- Updated dependencies [3952770]
- Updated dependencies [32a3b52]
- Updated dependencies [2d6dad9]
  - @refrakt-md/runes@0.20.0
  - @refrakt-md/transform@0.20.0
  - @refrakt-md/types@0.20.0

## 0.19.0

### Patch Changes

- Updated dependencies [97522a0]
- Updated dependencies [9cb55f3]
- Updated dependencies [6f30052]
- Updated dependencies [fd484bc]
- Updated dependencies [e4e5f5c]
- Updated dependencies [2f2b04f]
- Updated dependencies [5c92e0b]
- Updated dependencies [61e15c9]
- Updated dependencies [0375d22]
  - @refrakt-md/runes@0.19.0
  - @refrakt-md/transform@0.19.0
  - @refrakt-md/types@0.19.0

## 0.18.0

### Patch Changes

- Updated dependencies [cd30659]
- Updated dependencies [b05fc8d]
  - @refrakt-md/transform@0.18.0
  - @refrakt-md/runes@0.18.0
  - @refrakt-md/types@0.18.0

## 0.17.0

### Minor Changes

- 2d85b5f: **v0.17.0 — Declarative metadata & layout.**

  A new, fully declarative model for how metadata-bearing and media-bearing runes are assembled — replacing per-rune imperative structure code with a small, orthogonal config vocabulary, and giving every rune a consistent metadata treatment. Additive: existing content keeps rendering; meta-bearing runes simply gain a cleaner, theme-overridable structure.

  ### The block-and-layout model (SPEC-080)

  Three orthogonal fields on a rune's config describe its whole structure:

  - **`metaFields`** — a pure data manifest of a rune's meta-bearing fields (each declares its `metaType`, `label`, `condition`, sentiment, and any rich rendering). No layout, no placement.
  - **`blocks`** — named metadata blocks projected from `metaFields`, each a flat field list rendered by one layout primitive.
  - **`layout`** — explicit, ordered placement of block names and content children per container (reserved `root` key for flat runes); unlisted content always appends, never drops.

  A field's render **shape** is intrinsic to its `metaType` — a chip (`.rf-badge`) for `status` / `category` / `tag`, bare inline text for `id` / `quantity` / `temporal` / `code` — independent of the block's layout. Themes override a rune's `metaFields` / `blocks` / `layout` by inner key.

  ### New layout primitives & authoring runes

  - **`bar`** — a horizontal flex row of fields; per-field `align: 'end'` pushes a field (and everything after) to the right edge, `wrap` toggles single-line.
  - **`definition-list`** — labelled `<dt>` / `<dd>` rows in a responsive multi-column grid.
  - **`{% bar %}`** and **`{% deflist %}`** — prose authoring handles that emit the same DOM as the projected primitives, for hand-authored rows and definition lists.

  ### Universal metadata chip system

  A single chip primitive — `.rf-badge` plus `[data-meta-type]` / `[data-meta-sentiment]` — is shared by the standalone `{% badge %}` rune and every chip-rendered field. `data-meta-type` carries typography only (monospace for `id` / `code`, tabular-nums for `quantity` / `temporal`, primary color for `id`); geometry comes from the layout primitive and the badge class; sentiment drives color.

  ### Rich field renderings

  Beyond chip / bare, a field can declare:

  - **`href`** — render as a link (`<a>`), the named modifier holds the URL.
  - **`rating`** — a filled-marks-out-of-total widget (stars, dots).
  - **`icon`** — a leading glyph selected by the field's value (e.g. the hint header's note / warning / caution / check).
  - **`renderWhenEmpty`** — gate on _presence_ rather than truthiness, so a present-but-empty value still projects its block (e.g. `{% codegroup title="" %}` renders the window chrome without a filename).

  ### Coverage & tooling

  - Every meta-bearing first-party rune is migrated to the model: docs `api` / `symbol`; learning `recipe` / `howto`; storytelling `character` / `realm` / `faction` / `lore` / `plot`; places `event`; media `playlist`; marketing `testimonial`; core `budget` / `codegroup` / `hint`; and the plan entities.
  - **Structure contracts** (`refrakt contracts`) now surface each projected block as an addressable element with its layout primitive and fields, and derive child order from `layout`.

  ### Deprecated (not yet removed)

  The legacy `slots` + `structure` config path still renders, but is superseded by `metaFields` + `blocks` + `layout` and emits a one-time migration warning. Its removal — and the removal of `RuneConfig.slots` — is a breaking change planned for a later release; third-party plugins on the legacy path should migrate. `projection` (hide / group / relocate) and `postTransform` remain as escape hatches.

### Patch Changes

- Updated dependencies [2d85b5f]
  - @refrakt-md/types@0.17.0
  - @refrakt-md/transform@0.17.0
  - @refrakt-md/runes@0.17.0

## 0.16.1

### Patch Changes

- Updated dependencies [ae5c904]
- Updated dependencies [8a84210]
  - @refrakt-md/runes@0.16.1
  - @refrakt-md/types@0.16.1
  - @refrakt-md/transform@0.16.1

## 0.16.0

### Minor Changes

- e5b9dc6: **v0.16.0 — Registry-driven sites.**

  Turns the entity registry into pages and listings declaratively, ships the three sibling registry-query runes (`collection` / `relationships` / `aggregate` — items / edges / numbers), and proves the system by scaffolding refrakt's own plan site from the `plan/` content tree.

  ### Registry-query runes

  - **`{% collection %}`** (SPEC-070) — the plural counterpart to `ref` / `expand`. Queries the registry with `type` + `filter`, applies `sort` / `group` / `limit`, and projects entities into `list` / `grid` / `table` layouts. Per-item body templates with `$item` bound; heading-delimited table columns; shared field-match grammar; shared formatter functions (`humanize`, `date`, `number`, `currency`, `join`); 3-zone body (preamble / template / fallback) with `$count` / `$shown` bindings; `group-display="accordion"` for collapsible groups.
  - **`{% relationships %}`** (SPEC-072) — graph-edge counterpart to `collection`. Renders an entity's edges grouped by kind (or type), generic over any domain's relationship vocabulary. Shares `$item` semantics with `collection` so card partials are reusable across both. Domain-aware ordering, accordion group display, body zones for empty state.
  - **`{% aggregate %}`** (SPEC-076) — number-projecting sibling. No-body form (`{% aggregate type="work" filter="status:done" /%}`) renders a single inline integer; body-zoned form iterates groups with `$item` bound to `{ key, count, value, percent, total, shown }`. Optional `value` sub-filter (e.g. `value="status:done"`) drives `$item.percent` for progress-bar ratios without a second query.

  ### Site machinery

  - **Plugin-contributed routes** (SPEC-069) — new `contributePages` pipeline phase plus declarative `entityRoutes` in `refrakt.config.json` that generate one page per registered entity matching `type` + optional `filter`. `embed()` embeddability contract for cross-page composition.
  - **Plan site scaffolding** (SPEC-071) — refrakt's own plan site rebuilt from `plan/` via `entityRoutes` + the registry-query runes. The bespoke `plan build` / `plan serve` commands are retired. Dashboard composition (aggregate header summary + per-status `collection` panels + empty-state `hint` runes) shipped as the canonical scaffold template.

  ### Chrome and polish

  - **Theme toggle** (SPEC-073) — light / dark / auto toggle as both a chrome slot and a `{% theme-toggle /%}` rune, with shared behavior and prod-build CSS parity for the Cloudflare-style no-runes-bundle.
  - Accordion polish — leading rotating chevron via SVG mask, native `<details>` slide animation via `::details-content` + `interpolate-size`, dividers-only outer treatment.
  - Badge restyle to a compact sentiment-tinted chip; sentiment via `color-mix(in srgb, var(--meta-color) X%, transparent)`.
  - New "Registry" category in the rune catalog for the cross-page-query runes (`xref` / `expand` / `collection` / `relationships` / `aggregate`); seven previously-missing runes added to the catalog (`xref`, `badge`, `gallery`, `showcase`, `bg`, `tint`, `blog`).

  ### Schema and docs corrections

  - `refrakt.config.json` schema — `theme` is now `string | SiteThemeConfig` (was just `string`); new `SiteThemeConfig` definition with `package`, `presets`, `tokens`, `modes`, and `code.colorScheme`. `highlight` flagged as legacy in favour of `theme.presets` (Lumina syntax presets contributing `--rf-syntax-*` overrides) + `theme.code.colorScheme` (forced light/dark code).
  - `site/content/runes/aggregate.md` — full reference page with live previews; sites.md updated for the theme object form.

  ### Bug fixes

  - Nav items containing an inline `{% badge %}` now sit as a flex row so the badge rides alongside the link instead of wrapping under it (link's `display: block` was claiming the full row).
  - Mobile docs toolbar long page titles now ellipsise instead of forcing horizontal page scroll (`flex: 1 1 0` + `max-width: 100%; overflow: hidden;` on the toolbar).
  - Conversation rune's `speakers="A,B"` attribute now renders names as bold-inline prefix inside the bubble, matching the explicit `> **Name**:` form. Two related issues fixed: the extractor was missing the Markdoc `inline` wrapper around paragraph content, and the fallback path didn't inject a strong-prefix. The speaker-carrier span is now hidden via the correct `data-field="speaker"` selector.

### Patch Changes

- Updated dependencies [e5b9dc6]
  - @refrakt-md/types@0.16.0
  - @refrakt-md/transform@0.16.0
  - @refrakt-md/runes@0.16.0

## 0.15.0

### Patch Changes

- Updated dependencies
- Updated dependencies
- Updated dependencies [55de91d]
- Updated dependencies [f5fa9d5]
- Updated dependencies [8a0a6fa]
- Updated dependencies [ce36eac]
- Updated dependencies [8f8daec]
  - @refrakt-md/types@0.15.0
  - @refrakt-md/runes@0.15.0
  - @refrakt-md/transform@0.15.0

## 0.14.4

### Patch Changes

- Updated dependencies
  - @refrakt-md/transform@0.14.4
  - @refrakt-md/runes@0.14.4
  - @refrakt-md/types@0.14.4

## 0.14.3

### Patch Changes

- Updated dependencies
  - @refrakt-md/runes@0.14.3
  - @refrakt-md/transform@0.14.3
  - @refrakt-md/types@0.14.3

## 0.14.2

### Patch Changes

- Updated dependencies
  - @refrakt-md/transform@0.14.2
  - @refrakt-md/runes@0.14.2
  - @refrakt-md/types@0.14.2

## 0.14.1

### Patch Changes

- Updated dependencies
  - @refrakt-md/types@0.14.1
  - @refrakt-md/transform@0.14.1
  - @refrakt-md/runes@0.14.1

## 0.14.0

### Patch Changes

- @refrakt-md/runes@0.14.0
- @refrakt-md/transform@0.14.0
- @refrakt-md/types@0.14.0

## 0.12.0

### Minor Changes

- 7471ad8: Rename "rune packages" to "plugins" and unify with CLI plugins. Plugins now contribute runes, layouts, theme config, pipeline hooks, behaviors, **and** CLI commands through a single npm package.

  **Breaking changes:**

  - `RunePackage` interface → `Plugin`
  - `RunePackageEntry` → `PluginRune`
  - `RunePackageAttribute` → `PluginAttribute`
  - `RunePackageThemeConfig` → `PluginThemeConfig`
  - `PackagePipelineHooks` → `PluginPipelineHooks`
  - `loadRunePackage()` → `loadPlugin()`
  - `mergePackages()` → `mergePlugins()`
  - `discoverPackageFixtures()` → `discoverPluginFixtures()`
  - `LoadedPackage` → `LoadedPlugin`, `MergedPackageResult` → `MergedPluginResult`
  - `RuneProvenance.packageName` → `pluginName`; `source: 'package'` → `source: 'plugin'`
  - `RuneInfo.package` → `RuneInfo.plugin`; `SerializedRune.package` → `plugin`
  - Config field `site.packages[]` → `site.plugins[]`. The deprecated top-level shorthand `config.packages[]` is removed; use the existing `config.plugins[]` (which now covers both rune contributions and CLI commands).
  - `assembleThemeConfig` inputs renamed: `packageRunes` → `pluginRunes`, `packageIcons` → `pluginIcons`, `packageBackgrounds` → `pluginBackgrounds`.
  - `MergedPluginResult.packages` → `MergedPluginResult.plugins`
  - CLI: `refrakt package validate` removed; use `refrakt plugins validate` instead.
  - CLI: `refrakt reference list --package` flag is now `--plugin` (the old name still works as an alias).
  - Repo layout: `runes/{marketing,docs,…,plan}/` workspace globs moved to `plugins/{…}/`. npm package names (`@refrakt-md/marketing` etc.) are unchanged.

  **Migration:**

  - Rename `RunePackage` to `Plugin` and `loadRunePackage`/`mergePackages` to `loadPlugin`/`mergePlugins` in your code.
  - In `refrakt.config.json`, rename per-site `"packages": [...]` to `"plugins": [...]`. If you had a top-level `"packages"` shorthand under flat shape, move it to `"plugins"`.
  - Replace any calls to `refrakt package validate` with `refrakt plugins validate`.

### Patch Changes

- Updated dependencies [799583f]
- Updated dependencies [7471ad8]
- Updated dependencies [7537459]
- Updated dependencies [a733ec6]
  - @refrakt-md/transform@0.12.0
  - @refrakt-md/types@0.12.0
  - @refrakt-md/runes@0.12.0

## 0.11.3

### Patch Changes

- Updated dependencies [8cf7caf]
  - @refrakt-md/types@0.11.3
  - @refrakt-md/runes@0.11.3
  - @refrakt-md/transform@0.11.3

## 0.11.2

### Patch Changes

- @refrakt-md/runes@0.11.2
- @refrakt-md/transform@0.11.2
- @refrakt-md/types@0.11.2

## 0.11.1

### Patch Changes

- @refrakt-md/runes@0.11.1
- @refrakt-md/transform@0.11.1
- @refrakt-md/types@0.11.1

## 0.11.0

### Patch Changes

- Updated dependencies [6a89ebe]
  - @refrakt-md/transform@0.11.0
  - @refrakt-md/runes@0.11.0
  - @refrakt-md/types@0.11.0

## 0.10.1

### Patch Changes

- Updated dependencies [b04d001]
  - @refrakt-md/runes@0.10.1
  - @refrakt-md/transform@0.10.1
  - @refrakt-md/types@0.10.1

## 0.10.0

### Patch Changes

- Version bump for coordinated release

## 0.9.9

### Patch Changes

- @refrakt-md/runes@0.9.9
- @refrakt-md/transform@0.9.9
- @refrakt-md/types@0.9.9

## 0.9.8

### Patch Changes

- @refrakt-md/runes@0.9.8
- @refrakt-md/transform@0.9.8
- @refrakt-md/types@0.9.8

## 0.9.7

### Patch Changes

- @refrakt-md/runes@0.9.7
- @refrakt-md/transform@0.9.7
- @refrakt-md/types@0.9.7

## 0.9.6

### Patch Changes

- Updated dependencies
  - @refrakt-md/types@0.9.6
  - @refrakt-md/runes@0.9.6
  - @refrakt-md/transform@0.9.6

## 0.9.5

### Patch Changes

- Updated dependencies
  - @refrakt-md/runes@0.9.5
  - @refrakt-md/transform@0.9.5
  - @refrakt-md/types@0.9.5

## 0.9.4

### Patch Changes

- Updated dependencies
  - @refrakt-md/runes@0.9.4
  - @refrakt-md/transform@0.9.4
  - @refrakt-md/types@0.9.4

## 0.9.3

### Patch Changes

- Updated dependencies
  - @refrakt-md/types@0.9.3
  - @refrakt-md/runes@0.9.3
  - @refrakt-md/transform@0.9.3

## 0.9.2

### Patch Changes

- Add multi-framework adapter packages (Astro, Eleventy, Next.js, Nuxt, React, Vue) with ADR-008 framework-native component interfaces. Implement ADR-009 framework-agnostic theme architecture. Add vue, astro, and jinja to Shiki default languages.
- Updated dependencies
  - @refrakt-md/types@0.9.2
  - @refrakt-md/transform@0.9.2
  - @refrakt-md/runes@0.9.2

## 0.9.1

### Patch Changes

- ### Transform engine enhancements (SPEC-033)

  - Named slots with ordering for structured element placement
  - Repeated element generation for multi-instance structures
  - Element projection (hide, group, relocate) for layout control
  - Value mapping and configurable density contexts
  - Migrate postTransform uses to declarative config

  ### Rune schema modernization

  - Replace legacy Model class with `createContentModelSchema` across all runes (WORK-099–102)
  - Replace `useSchema`/`Type` system with inline rune identifiers (ADR-005)
  - Remove legacy Model class, decorators, `createSchema`, and `NodeStream`

  ### Other improvements

  - File-derived timestamps for runes (SPEC-029)
  - Move extract command from CLI to `@refrakt-md/docs` package
  - Fix accordion item schema metadata duplication
  - Fix paragraph-wrapped images in juxtapose panels
  - Auto-assign IDs and detect duplicates in plan CLI
  - Inspect and contracts updated for structure slots

- Updated dependencies
  - @refrakt-md/runes@0.9.1
  - @refrakt-md/transform@0.9.1
  - @refrakt-md/types@0.9.1

## 0.9.0

## 0.8.5

### Patch Changes

- Add blog rune for listing posts with filtering and sorting. Expose frontmatter and page data as content-level Markdoc variables. Redesign juxtapose rune with --- delimiter and overlay labels. Auto-discover runes in VS Code extension and editor. Fix map rune collapsed border and add spacing support. Fix juxtapose tint mode.
- Updated dependencies
  - @refrakt-md/runes@0.8.5
  - @refrakt-md/transform@0.8.5
  - @refrakt-md/types@0.8.5

## 0.8.4

### Patch Changes

- Updated dependencies
  - @refrakt-md/runes@0.8.4
  - @refrakt-md/transform@0.8.4
  - @refrakt-md/types@0.8.4

## 0.8.3

### Patch Changes

- Updated dependencies
  - @refrakt-md/runes@0.8.3
  - @refrakt-md/transform@0.8.3
  - @refrakt-md/types@0.8.3

## 0.8.2

### Patch Changes

- Bug fixes and editor improvements including CodeMirror code editing, mobile search fix, structure tab enhancements, and block editor UI refinements.
- Updated dependencies
  - @refrakt-md/types@0.8.2
  - @refrakt-md/transform@0.8.2
  - @refrakt-md/runes@0.8.2

## 0.8.1

### Patch Changes

- Updated dependencies
  - @refrakt-md/runes@0.8.1
  - @refrakt-md/transform@0.8.1
  - @refrakt-md/types@0.8.1

## 0.8.0

### Patch Changes

- Updated dependencies
  - @refrakt-md/types@0.8.0
  - @refrakt-md/runes@0.8.0
  - @refrakt-md/transform@0.8.0

## 0.7.2

### Patch Changes

- Updated dependencies
  - @refrakt-md/types@0.7.2
  - @refrakt-md/runes@0.7.2
  - @refrakt-md/transform@0.7.2

## 0.7.1

### Patch Changes

- @refrakt-md/runes@0.7.1
- @refrakt-md/transform@0.7.1
- @refrakt-md/types@0.7.1

## 0.7.0

### Patch Changes

- Updated dependencies
  - @refrakt-md/runes@0.7.0
  - @refrakt-md/transform@0.7.0
  - @refrakt-md/types@0.7.0

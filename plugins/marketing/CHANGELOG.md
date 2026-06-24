# @refrakt-md/marketing

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

- fee0ec3: Add a `contentMeasure` axis so page sections keep their content readable when bled to the `wide` track. Previously `width="wide"` widened both a section's background _and_ its content, while `width="full"` widened only the background (content stayed anchored to the text measure) — an inconsistency for runes like `hero` and `feature`.

  `RuneConfig.contentMeasure: 'anchored' | 'fill'` (default `fill`) is emitted as `data-content-measure`. `anchored` runes (hero, cta, feature) keep their content at the text measure at `width="wide"` so only the surface/gradient bleeds, matching `width="full"`. `fill` runes (card, table, bento) keep the "break gently out of the text column" behavior. `width="full"` still anchors content into a band for every rune, so composing any rune into a hero (`elevation="flush" width="full"`) is unchanged.

- Updated dependencies [fee0ec3]
- Updated dependencies [de974e1]
  - @refrakt-md/transform@0.24.4
  - @refrakt-md/runes@0.24.4
  - @refrakt-md/types@0.24.4

## 0.24.3

### Patch Changes

- e85a0f0: Add a `guestFit` media-host axis so a theme declares whether a rune frames its media-zone guests or leaves them alone. `RuneConfig.guestFit: 'clip' | 'bleed'` (default `clip`) is emitted by the engine as `data-guest-fit` on the media zone, a sibling to `data-guest-posture`.

  This fixes rich guests (`sandbox`, `codegroup`, `juxtapose`) being given rounded corners in bare section hosts like `hero` and `feature`: those now declare `guestFit: 'bleed'`, so a rune guest keeps its own chrome (its natural radius/border) instead of being masked by the slot — while leaf images still frame to the slot. Framed wells (`card`, `bento-cell`, …) keep `clip` and are unchanged, still merging a guest into the well as one surface. The shared rule replaces the per-host CSS so any rune can opt into either behavior from config.

  `guestFit` also drives the displace containment default: a displaced guest now defaults to `peek` (cropped) in a clip host and `bleed` (spills) in a bleed host, so a hero no longer needs `frame-displace-mode="bleed"` spelled out (an explicit mode still overrides). The hero-specific media-zone unclip is retired in favour of the shared `data-guest-fit="bleed"` rule; the guest-intrinsic opt-outs (`preview`, `juxtapose`, displaced `showcase`) are unchanged.

  A bleed host no longer clips its rune guest at all (not just on displace), so a guest's own drop-shadow is no longer cropped into the corner gaps left by its rounding — which showed as darker corners behind, e.g., a codegroup in a hero.

- Updated dependencies [e85a0f0]
  - @refrakt-md/transform@0.24.3
  - @refrakt-md/runes@0.24.3
  - @refrakt-md/types@0.24.3

## 0.24.2

### Patch Changes

- 8090b69: Fix paragraph-wrapped media in media+content runes. Markdoc wraps inline media (a bare image, or a single block rune like `{% sandbox %}`) in a `<p>`; several runes passed their media/header zone through raw, so the media well held a stray paragraph instead of the element. `hero`, `feature`, `step`, `event`, `organization`, `symbol`, and `howto` now unwrap it, matching `card`/`bento`. Additionally, content-model fields matching `image` now capture standalone images (parsed by Markdoc as a paragraph), fixing the `character` portrait being silently dropped.
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

### Minor Changes

- dd2d955: **Scroll-reveal motion — a token-driven entrance dimension (SPEC-105).** Sections can now animate in as they scroll into view. The author declares _intent_ with two universal attributes; the theme owns the choreography; a behaviour owns the timing — JS = when, CSS = how.

  - **`reveal`** — a closed entrance vocabulary on every block rune: `none` (default), `fade`, `slide`, `scale`, `blur`. An unknown value is a build error.
  - **`stagger`** — cascades a multi-child block's items in (feature/bento/steps/pricing/playlist); a silent no-op on single-child runes. The engine stamps `--rf-reveal-index` on the cascade items.
  - **The motion dimension** (`dimensions/motion.css` + `--rf-reveal-*` physics tokens) renders each character keyed on `data-reveal` × `data-in-view`, from one stylesheet covering all section runes. It animates the individual `translate`/`scale` properties (never the `transform` shorthand) so it composes with existing rune transforms. The physics are a first-class token group, retunable site-wide via `refrakt.config.json` `theme.tokens.reveal.*`.
  - **An IntersectionObserver behaviour** flips `data-in-view` on first intersection. Opt-in and enhancement-gated: SSR/no-JS/crawler and `prefers-reduced-motion` render the fully-visible final state — nothing is hidden behind JS.

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

### Minor Changes

- 27124ea: **Hero cover layout + animated sandbox backgrounds** (SPEC-101). `hero` is now a first-class `media-position="cover"` host: the media well fills the section interior and the headline/blurb/actions overlay it, with the cover knobs (`content-place`, `height`, `aspect`), a band-appropriate height authority (a viewport-relative floor instead of the 3/4 tile default), root padding rerouted to the overlay, and a centred-band overlay default with an even scrim. Any non-`img`/`video` media guest now fills a cover well; `sandbox` gains `height="fill"` (iframe pinned to 100%, auto-resize negotiation disabled), applied automatically when a sandbox is a cover backdrop — so a live three.js scene drops into a hero as a full-bleed, inert animated background. A non-eager (`activation="visible"|"click"`) sandbox under cover warns at build time (the Run affordance is unreachable on an inert backdrop). Ships with the wireframe-waves showcase (`site/examples/wireframe-waves/`) — a displaced wireframe terrain whose crests pick up the niwaki palette. Also fixes nested-density title sizing: `[data-section="title"]` now sizes via `--rf-title-size` (set per density root), so a full-density rune inside a compact host (a hero in a `preview`) keeps its real title size. And fixes inverted stacked media labels (BUG-001): hero/feature/step have content-first DOM, so the shared media-first stacked CSS rendered `top` at the bottom and vice versa — their default is now a truthful `bottom` (zero visual change for existing content) and explicit `top`/`bottom` render where they say.

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

### Minor Changes

- fd82b91: Bento: a grid-level `elevation` now cascades to cells (joining the `frame`
  cascade) so `{% bento elevation="md" %}` lifts each cell rather than the grid
  box; a cell's own `elevation` still wins. Fixes the bento reference page's
  frame/elevation example (the images needed an `---` to land in the media zone).

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

### Minor Changes

- 8f21415: Add a pair of opt-in text-zone knobs to `bento`, settable as a grid-level default
  or a per-cell override (cell wins; the grid default is the only lever for
  heading-sugar grids):

  - **`content-height`** (`sm` | `md` | `lg` → 3 / 5 / 7rem) — pins the text area on
    **column cells** (top/bottom media) so they line up vertically; the media zone
    absorbs the remaining row-track height.
  - **`media-ratio`** (`1/3` | `2/5` | `1/2` | `3/5` | `2/3`) — pins the media zone's
    share of the width on **beside cells** (start/end media); the content absorbs
    the rest.

  The two act on perpendicular axes (a cell is either a column cell or a beside
  cell), so they never collide. Both default to the existing behavior (natural text
  height / 42% media split) and revert to natural height on the mobile stack.

- ea36b9b: Add a `levels` attribute to the `bento` rune's heading-sugar path: an author-defined
  footprint ladder, indexed by relative heading depth, where each rung is a column
  count `W` (× 1 row) or a footprint `WxH` — e.g. `levels="6,5,4,3,2,1"` (uniform-height,
  width-by-depth; the former `span` mode) or `levels="4x2,3x1,2x1"`. Depth is measured
  from the auto-detected base (shallowest heading), so the shallowest is always rung 0;
  ladders shorter than the heading depth clamp to the last rung. Omitting `levels` keeps
  the default tiered sizing unchanged, and explicit `{% bento-cell %}` grids ignore it.
- e36d7e1: Add a `row-height` attribute to the `bento` rune (`sm` | `md` | `lg` | `xl`) for
  control over the uniform grid row-track height in grid mode (8 / 12 / 16 / 20rem;
  `md` matches the previous default). Falls back to the theme's
  `--rf-bento-row-height` when unset, and is overridden by the stack's auto rows on
  mobile.
- e1398da: Bento substrate (SPEC-085) — v0.19.0 batch C.

  - **Bento is a grid primitive, not a page-section.** Dropped the eyebrow/title/blurb preamble; every heading is now a cell. A titled bento is a composition (wrap it in `feature`/section). Content before the first heading renders as loose content above the grid.
  - **Cell adopts card's zone contract.** A `bento-cell`'s content splits on a top-level `---` into `media` / body / footer zones (`data-section`), mirroring `card`. The media zone is clipped/sized by the name-agnostic WORK-339 selector (no bento-specific per-guest CSS) so a `showcase` bleed peeks. The cell background is tint-deferrable, and the leading heading becomes a uniform-level `<h3>` title contributing to the outline.
  - **Proportional sizing model.** A 6-column default for both authoring modes; `size` presets resolve as fractions of the column count (small ⅓, medium ½, large ⅔ × 2 rows, full = all), and `cols` / `rows` give precise per-axis spans that override the preset. Uniform fixed row tracks (`grid-auto-rows: var(--rf-bento-row-height)`, never column-tied). Author-controlled `collapse="sm|md|lg|never"` plus automatic progressive column reduction with `min(span, current-columns)` auto-capping.
  - **Size-derived media placement + link tiles.** `media-position` (`top|bottom|start|end`) is author-controllable per cell with a size-derived default (large/full → beside, smaller → on top); an optional `href` makes a whole cell a link.
  - **Explicit `{% bento-cell %}` authoring.** A bento whose children include `bento-cell` tags uses them directly — full per-tile control (the dashboard case) — short-circuiting heading conversion (explicit wins, no mixing). The legacy `span` attribute is removed (subsumed by `cols`). `cols` / `rows` author as unquoted numbers (`cols=4 rows=2`), matching `columns`.
  - Rewrote the bento rune reference docs for the new substrate.
  - **Even column ladder + landscape 2-up.** Reduction now steps 6 → 4 → 2 → 1, skipping the odd 3-col step where a `small` cell can't pair. On tablets (`≤1024`) `medium` cells drop to a half so two pair per row. At `≤768` the grid is a 2-up auto-row stack: `small` cells take half a row (two pair up), medium/large/full span full width, and media reflows to an aspect-ratio banner so wide cells no longer crop their image to a thin strip.
  - **Collapse is a stack, not a shrunken grid.** At a single column the fixed row track is dropped (`grid-auto-rows: auto`) so cells size to their content and text is never clipped; media reflows to an aspect-ratio banner (`--bento-media-aspect`, default 16/9) on top. Cells are text-first in grid mode too — the body keeps its height and the media zone absorbs the leftover track and crops.

### Patch Changes

- e351aed: Bento media/responsive fixes:

  - **Container-query responsiveness** — the bento grid is now a query container
    (`container-type: inline-size`) and its progressive-reduction/collapse rules use
    `@container` instead of `@media`, so it reduces columns and stacks based on its
    own width. Grids in doc previews, sidebars, or narrow tracks now break correctly
    instead of only at viewport breakpoints.
  - **Unwrap paragraph-wrapped images** — images in a bento cell's media (and body)
    zone are unwrapped from their `<p>`, so the media zone holds a bare `<img>` and
    layouts size it directly.
  - **Neutralize the global media-zone block margin** — `[data-section="media"]` no
    longer applies a `var(--rf-spacing-sm)` top/bottom margin that misaligned media
    in flex/beside layouts; media spacing now comes from each layout. Affects all
    media zones (card, recipe, realm, faction, split, bento).

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

- Fix scaffolded sites not loading community packages or applying identity transform. Fix preview rune code toggle broken by data-field/data-name mismatch. Add smarter heading-level detection in sections content model for preamble support. Restore ordered-list-based steps authoring pattern.
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

- Add cross-page pipeline infrastructure with `EntityRegistry`, `runPipeline()`,
  and `PackagePipelineHooks`. Includes nav auto mode, pipeline build output, design
  token context propagation, and editor preview/autocomplete support for community
  runes.

  Fix duplicate BEM classes on runes nested inside `data-name` elements. Make
  `autoLabel` recursive in the identity transform engine so eyebrow, headline, and
  blurb children inside `<header>` wrappers receive BEM classes. Add
  `pageSectionAutoLabel` to all marketing and core page-section runes.

  Add pill-badge eyebrow variant: an eyebrow paragraph containing a link renders as
  a rounded pill with a border, muted prose text, and primary-colored link. The
  entire pill is clickable via a CSS `::before` overlay.

  Add `mockup` rune to `@refrakt-md/design` for wrapping content in device frames.

  Fix multiple preview runtime issues: `structuredClone` errors, `DataCloneError`
  when sending `routeRules` via `postMessage`, and cache not invalidating on source
  changes. Remove `ComponentType` and `PropertyNodes` from the schema system.

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

# @refrakt-md/lumina

## 0.20.2

### Patch Changes

- @refrakt-md/runes@0.20.2
- @refrakt-md/transform@0.20.2
- @refrakt-md/types@0.20.2

## 0.20.1

### Patch Changes

- 7a6aaf5: Surface model fixes, found and fixed while building the surface documentation:

  - **Cover scrims** now clip to the media zone's rounded corners; a centred `content-place` emits a radial scrim (`farthest-side`) that reaches the box edges instead of leaving the sides of a wide aspect uncovered; dark-tint scrim support.
  - **Frame** — displaced / oversized peeks clip correctly at the media zone and carry across the mobile breakpoint; `frame-shadow` rides the guest's silhouette on a `figure`.
  - **Substrate** — the `cross` pattern redraws crisply at any device-pixel-ratio; `substrate-target="media"` routing.
  - **Media-zone guests** (chart, diagram, map) drop their own double chrome and inherit the slot surface; a `map` card gains a slot aspect.
  - **`bg`** stacks content above the background layer and clips to the rounded surface.

- Updated dependencies [7a6aaf5]
  - @refrakt-md/transform@0.20.1
  - @refrakt-md/runes@0.20.1
  - @refrakt-md/types@0.20.1

## 0.20.0

### Minor Changes

- 8faa272: SPEC-086 surface chrome. Adds a universal `elevation` attribute (self-surface
  `box-shadow` on the `--rf-shadow-*` scale), a `frames` preset registry with the
  `frame` attribute and inline `frame-*` facets (modelled on `bg`), `RuneConfig.frameTarget`
  routing (media zone vs self) with a build warning when unresolved, and a shared
  frame CSS layer (silhouette drop-shadow, displacement/peek, oversize, place,
  anchor). `showcase` collapses into the frame model as `frameTarget: 'self'`; its
  `shadow`/`bleed`/`offset`/`aspect`/`place` attributes are deprecated aliases for
  `frame-*` facets (warn for one minor, then removed), with breakout retained. The
  `offset` named scale is completed (`none|sm|md|lg|xl`) and its raw-length
  fallthrough closed.
- 702732b: SPEC-087 surface fills. Adds a tint-tracking inset surface (the
  `--rf-surface-inset-shift` mix amount + a use-site `color-mix` recipe applied to
  media wells and `chart`/`diagram`), and `substrate` — a generated surface
  pattern with a fixed engine enum (`dots|grid|lines|cross|checker|none`), inline
  `substrate-size`/`opacity`/`fill` facets, a shared always-included gradient
  recipe stylesheet, and `RuneConfig.substrateTarget` routing (default `self`,
  per-instance `substrate-target` override, build warning when targeting a missing
  media section).
- 3952770: SPEC-088 bg gradients & scrim. Adds a token-driven `bg` gradient fill (inline
  `bg-gradient`/`bg-from`/`bg-to`/`bg-via`/`bg-gradient-type` facets with semantic
  token stops, and a structured `BgPresetDefinition.gradient` preset), a structured
  `scrim` legibility facet (`gradient`/`frost`, strength/blur/tone — tone also flips
  the overlaid foreground), and a constrained flat `overlay` vocabulary
  (`dark`/`light`/token + opacity). The raw-string `overlay` passthrough is
  deprecated (warns) now that `scrim` ships, the `style` escape hatch is documented
  with a stated contract (valid in theme & project config; project merges over
  theme), and a build-time soft-lint flags raw gradients that the structured facet
  covers. `bg.css` is force-included since `bg` is now a universal-attribute feature.
- 32a3b52: SPEC-089 cover layout. Adds `media-position="cover"` as a `media-position`
  engine variant (SPEC-091): the media well fills the rune interior and content
  overlays it, with a one-attribute switch from `top|bottom|start|end`. Two
  rune-declared scopes — `full` (card: the whole box overlays) and `header`
  (recipe: only the title band overlays, body flows below) — bound the overlay
  region; there is no overlay primitive in the layout config. Adds `content-place`,
  a 2-axis logical overlay anchor (`<block> <inline>`, mapping to `align`/`justify`)
  active only in cover mode (warns otherwise), whose `auto` default — also the
  behaviour when unset — adapts to the cover region's container-query orientation.
  Cover turns on a default scrim on the media surface (consuming the SPEC-088
  scrim facet), weighted toward the content edge and following `content-place`
  unless an explicit `scrim="top|bottom|left|right"` pins it; `scrim="none"` opts
  out. `scrim-type="frost"` swaps the gradient for a frosted-glass blur (`scrim-blur`
  scale) — in cover mode the scrim renders on the media well, never the
  self-surface bg layer, masked to the content edge so it never covers the whole
  image. The overlay foreground follows `scrim-tone` (a dark scrim yields light
  text) and is scoped to the overlay (`[data-name="content"]` in full scope, the
  cover-band in header scope), so the card's own surface keeps the page palette
  (light in light mode) while only the text on the media flips. Adds a card intrinsic-height knob
  (`height` named scale + `aspect`) for cover / `bg`-only cards, and documents
  cover mode in the card reference.
- 2d6dad9: SPEC-090 media-guest interaction posture. A rune in another rune's media slot is
  a presentational guest by default; interactivity is now an explicit capability —
  `RuneConfig.interactive`, set on the behaviour-driven runes (`codegroup`, `tabs`,
  `datatable`, `form`, `map`, `sandbox`, `juxtapose`). When the container is itself
  an interaction target — a `card`/`bento-cell` with a stretched whole-tile `href`
  — or the guest is a `cover` backdrop (SPEC-089), the engine marks the media zone
  `data-guest-posture="presentational"`: it goes `pointer-events: none` (so clicks
  fall through to the link / the overlay owns interaction) and the behaviours layer
  skips enhancement, so the guest renders its static fallback (the demoted
  `codegroup`/`tabs` tab strip is hidden so panels read as plain stacked content).
  The demotion is scoped to the media zone only — content-overlay controls
  (body/footer links & buttons) stay interactive. An interactive guest in a linked
  tile emits an informative (non-fatal) build warning. A container without `href`
  (and not `cover`) hosts interactive guests normally.

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

- e4e5f5c: Chart theming contract (SPEC-083 / WORK-353): the `rf-chart` SVG renderer no
  longer hardcodes its palette or geometry. Every paint + geometry value is now an
  `--rf-chart-*` custom property Lumina ships on `.rf-chart` — a dedicated
  categorical series palette (distinct from the semantic status tokens), bar/point/
  line geometry, and typography/grid. The renderer emits only tagged elements
  (`.rf-chart__bar[data-series]`, `__point`, `__line`, `__axis`, `__label`) that
  `chart.css` paints from the props, and reads layout geometry via `getComputedStyle`
  — so a theme retones a chart by setting `--rf-chart-*` alone, and a future canvas/
  d3 provider reads the same vocabulary. Adds a **sentiment colouring** mode: data
  cells carrying `data-meta-sentiment` colour by the semantic token
  (positive→success, negative→danger, caution→warning, neutral→muted).

  Also fixes `aggregate layout="chart"` to emit the chart rune's field channel, so a
  non-bar `chart-type` survives the identity transform and the `.rf-chart` class
  isn't doubled.

- 5c92e0b: Composability foundation (SPEC-084) — v0.19.0 batch B.

  - **Media-zone guest adaptation.** Replaced Lumina's name-enumerated media allow-list with one **name-agnostic** rule: any visual rune dropped into a `[data-section="media"]` slot is sized, clipped, rounded, and given a container-query context (so intrinsically responsive guests like `mockup` auto-scale). Guests that manage their own bleed (`preview`, `juxtapose`, a bleeding `showcase`) self-declare an opt-out. Covers `card`/`feature`/`hero`/`recipe` with one rule.
  - **`requiresParent` nesting validation.** New self-declared `RuneConfig.requiresParent` (distinct from the advisory `parent`). The identity transform validates it at build time — a rune that opts in must have the named parent as its nearest ancestor rune, else it's reported: an **error** for structurally-meaningless children (accordion-item, tab, step, tier, map-pin, …), a **warning** otherwise. Opt-in, so standalone-capable runes (`track`) are never flagged. No container-side allow-list.
  - **Context-modifier audit.** Removed the one nonsensical pairing (Hero `→ in-feature`); every remaining context modifier has CSS coverage. `refrakt inspect --audit` reports context-modifier coverage, and `inspect` now surfaces a rune's `requiresParent`.
  - **Docs.** A new composability authoring guide documents the open-world contract.

- 0375d22: Lumina polish: token hygiene, dark parity, theme-aware chrome, and a11y (v0.19.0 batch A).

  - **Token hygiene.** Reconciled seven phantom colour tokens that were painting stale literal fallbacks (the out-of-place blue and cold-gray muted text): `text-muted`→`muted`, `heading`→`text`, `accent`→`primary`, `background`→`bg`, `border-light`→`border`, `warning-fg`→`warning`. Added a derived `--rf-color-primary-bg` (tracks `primary` in both modes) and a mode-flipped `--rf-color-on-primary` (fixes invisible white text on the light dark-mode primary).
  - **Breaking (theme authors):** the misnamed `--rf-color-primary-50…950` ramp and the `PrimaryScale` type are **removed** — it was a warm-neutral scale mislabelled "primary" with almost no consumers. Set `--rf-color-primary` directly; `primary-bg` derives from it.
  - **Dark parity.** Verified every absolute token has a dark override; the remaining four are intentionally shared (derived from mode-aware tokens), now annotated.
  - **Theme-aware chrome.** Branded `::selection`, token-driven scrollbars, and `color-scheme` per mode so native chrome (including the main scrollbar) follows the theme.
  - **Accessibility.** A uniform `:focus-visible` ring across all interactive elements and a global `prefers-reduced-motion` reset.

- 5ab3f74: Two-tier surface rounding + inset media on mobile.

  - New semantic radius tokens: `--rf-radius-container` (→ `lg`, 16px) for outer
    surfaces and `--rf-radius-media` (→ `md`, 10px) for media guests nested inside
    them. Cards, the card/inset surface groups, feature items and bento cells move
    to the container tier; the shared `[data-section="media"]` zone and figure /
    recipe images move to the media tier, so a guest never reads as more rounded
    than its container. SPEC-086's `frame` will override these per-instance.
  - Media in a `data-media-position="top"` container no longer becomes a full-bleed
    square banner when the layout collapses on mobile — it stays inset within the
    card padding and fully rounded, matching its desktop framed look.
  - Top media now bleeds out past the body padding to a small, consistent margin
    on its top/left/right edges (new `--rf-media-margin`, defaulting to
    `--rf-spacing-sm`), figure-style, so the image isn't over-inset in containers
    with generous padding (e.g. bento cells). The `figure` image drops its
    box-shadow to match the unshadowed media elsewhere.

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

- 42df9b2: Surface/media polish:

  - More generous vertical spacing (`--rf-spacing-md`) between a top media banner
    and the content below it, in card/recipe/bento and on mobile stacks.
  - A `code-group` nested in a media zone now rounds at the media radius tier so
    its border lines up with the zone's clip instead of the larger container
    radius.
  - Dark-mode code background was a near-neutral grey that clashed with the warm
    `surface`; it's been warmed to the surface hue (`#1e1c19`, also applied to the
    derived `--rf-syntax-background`).
  - A `card` with no `href` no longer shows a hover background — the hover is now
    gated on the presence of the stretched card link.
  - The semantic `--rf-radius-container` / `--rf-radius-media` / `--rf-media-margin`
    aliases moved from the generated token contract into the styles layer (they
    reference the scale rather than holding raw values).

- 941ded8: Unify the media-zone corner radius with the card radius. Media slots
  (`[data-section="media"]`, shared by card, recipe, bento cell, feature, hero,
  realm, faction) rounded at `--rf-radius-lg` while their containers round at
  `--rf-radius-md`, so images looked more rounded than the card holding them.
  The media zone now uses `--rf-radius-md`, and recipe's redundant `lg` image
  override is removed (figure was already `md`).
- 2e56ab6: Decompose `plan-progress` into sugar over the `aggregate` rune (SPEC-076). It now
  composes **one aggregate per entity type** — a type heading ("Work", "Specs", …)
  above a progress bar labelled with that type's achieved status ("Done",
  "Accepted", …) plus a per-status badge row — resolved by the shared
  `resolveAggregates`. Mixing types under a single ratio was misleading (work `done`
  and bug `fixed` measure different things). Plan defaults are baked in
  (`type="work,bug"`, achieved-status per type, `group="status"`, `milestone=`
  scoping); the bespoke plan-side render path is removed. A bare `{% plan-progress /%}`
  scopes to `work,bug`; widen with `type=`/`show=`. (Per-status badge colour is
  deferred — see WORK-357.)
- db53138: Surface containers (card, the card/inset surface groups, feature items, bento
  cells) now carry a subtle 1px border in addition to their surface fill, pairing
  with the inset media framing.

  The dark neutral surface family was browner than the rest of the palette: the
  page background and inline-code background are warm-grays (R=G) but `surface`,
  its hover/active/raised steps, `border`, and `code-bg` carried a red lift
  (R>G ≈ 36° hue). That red lift is removed so the whole dark neutral ladder shares
  one warm-gray character (kept warm via a blue deficit, just no longer brown), and
  `code-bg` / `--rf-syntax-background` follow it.

- c04c4f1: Fix dark surface staying brown in a scoped scheme override (e.g. a preview rune
  toggled to dark, or a sandbox). `tint.css` re-declares the palette under
  `[data-color-scheme="dark"]` — a hand-kept third copy that the token coverage
  test didn't reach — and it still held the pre-de-brown surface/border/code
  values. Synced it to the neutralized palette, and added a coverage test that
  checks every `--rf-*` key tint.css's `[data-color-scheme]` overrides share with
  the canonical token CSS, so this copy can't silently drift again.
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

- ae5c904: `file-ref` rune + shared `preview="drawer"` attribute on reference runes (SPEC-078, WORK-298..303).

  **New rune — `file-ref`.** Path-based inline reference to a project file — third member of the Registry family beside `xref` (one entity) and `expand` (one entity inlined). Renders as an inline `<a>` to the file's canonical GitHub URL; optional `preview="drawer"` hoists a drawer containing the file's snippet plus a "View source on GitHub →" footer link. Sandbox shared with `snippet` (rejects absolute paths / traversal escapes / out-of-root symlinks).

  **`xref preview="drawer"` extension.** The existing `xref` rune gains an optional `preview="drawer"` attribute that hoists a drawer containing the entity's `expand`-equivalent body. Same hoist mechanism as `file-ref` — one preview vocabulary across both reference runes. The drawer's chrome footer links to the entity's `sourceUrl` (or hides silently for URL-less entities). Inline link still resolves via the registry; clicking opens the drawer rather than navigating away.

  **Drawer footer slot + always-visible chrome.** The drawer body splits on a top-level `---` into two zones — body and footer — same shape `{% card %}` uses. In dialog mode, the drawer becomes a flex column: header and footer pin via `flex: 0 0 auto`, body scrolls via `flex: 1 1 auto; overflow-y: auto`, so a long entity body or file snippet scrolls inside the drawer with the footer staying one tap away.

  **Site config — `repoUrl` + `repoBranch`.** Two new optional fields on `SiteConfig` for the canonical repo URL + git ref. `file-ref` uses them to build `{repoUrl}/blob/{repoBranch}/{path}#L{N}-L{M}` URLs; falls back to a no-href link with a build warning when `repoUrl` is absent.

  **Internal mechanism — drawer hoist pipeline.** New `hoistPreviewDrawers` postProcess step collects `hoist-drawer` sentinels (emitted by `file-ref preview="drawer"` and `xref preview="drawer"`) and materializes drawers at the page root. Source-specific `HoistBuilder` registrations keep the drawer pipeline ignorant of file paths / entity ids — reference runes register their own builders. Per-page dedup: multiple references to the same target collapse to one hoisted drawer.

  **SvelteKit plugin** — `configure` lifecycle hook now runs on all plugins in the CSS-analysis pipeline pass (it was only running for the page-rendering virtual modules), so the plan plugin's unconditional scan registers entities for the CSS analyzer too. Also threads `repoUrl`/`repoBranch` from `SiteConfig` through the content loader chain.

- 8a84210: Fence-level annotations: `source`, `lines`, `linenumbers`, `highlight`, `label` (SPEC-062, WORK-304).

  The Markdoc fence node schema gains five optional attributes that work uniformly on hand-authored fences and snippet-derived ones:

  - `source` / `lines` — provenance metadata. Snippet's preprocess now writes these unprefixed names instead of the internal `data-snippet-source` / `data-snippet-lines`. The fence transform renders them as `data-source` / `data-lines` on the output `<pre>` and `<code>`.
  - `linenumbers` (boolean) — opt into a numbered gutter rendered in pure CSS via `counter()`. The start number is seeded from `data-lines` so the gutter reflects the file's real offsets.
  - `highlight` (range string) — emphasize specific lines without cropping. Shiki-style format (`"74-78"`, `"74-78,82,90-92"`); file coordinates so it composes naturally with `lines=`. The highlight transform stamps `data-line-status="highlight"` on matching `span.line` rows post-Shiki.
  - `label` — per-fence tab label hint consumed by `codegroup`.

  Consumer runes:

  - **codegroup**: tab labels now fall back through a precedence chain — `labels=` → per-fence `label` annotation → derived from `source` (basename + `:lines`) → prettified language name. The composition story propagates through fence attributes so codegroup doesn't care whether a panel came from `{% snippet %}` or a hand-authored fence.
  - **diff**: the header derives from each panel's `source` (matching paths collapse to one label; differing paths render as `before → after`). Each panel's gutter honors its own `lines=` start, so a diff between two slices of the same file shows real file line numbers per side. The `highlight` annotation is silently ignored inside diff — the add/remove channel is the primary line-level signal.

  CSS: diff's `[data-line-status]` row template grows a third `highlight` value with a neutral tint (`--rf-color-line-highlight`) and primary-accent left rail. Snippet and codegroup share the same row primitive for the new highlight state. New tokens: `--rf-color-line-highlight`, `--rf-color-line-highlight-rail`, `--rf-color-line-number`.

  **Internal protocol changes** (no user-facing API broken; only CSS targeting the previous internal `data-*` names needs updating):

  - The internal `data-snippet-source` / `data-snippet-lines` attributes emitted by the snippet rune are renamed to `data-source` / `data-lines`. These were documented as internal protocol when snippet shipped in v0.16 (SPEC-062).
  - Diff's per-line `data-type` attribute is renamed to `data-line-status` to share one CSS row primitive across snippet / codegroup / diff with the three states `add | remove | highlight`.
  - Diff's `<pre>` output now wraps its line spans in an inner `<div data-name="rows">` (`.rf-diff__rows`) — mirrors the codeblock's `<pre><code>` shape so the row tint extends across horizontal scroll. Themes targeting `.rf-diff__code > .rf-diff__line` directly need to update the selector.

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

### Minor Changes

- Drawer rune: a body-only rune that opens its content as a slide-in panel from an xref-as-trigger in prose (SPEC-060). A cross-reference to the drawer's id anywhere on the page opens the drawer; the body is registered as a page-scoped entity rather than rendered inline.

  - Ships in two states: a no-JS `<details>`-style fallback that works without scripts, and a progressively-enhanced `<dialog>` with slide-in animation, scroll-lock, a keyboard shortcut, URL-hash sync, and back-button integration.
  - New `EntityRegistration.scope: 'page' | 'site'` field distinguishes page-local entities (drawer bodies) from site-wide ones, so a drawer registered on one page doesn't leak into another page's xref namespace.
  - `@refrakt-md/types`: `EntityRegistration.scope`.
  - `@refrakt-md/runes`: `{% drawer %}` schema + transform + drawer pipeline; engine config for both rendered states.
  - `@refrakt-md/behaviors`: `drawer` behavior (`<dialog>` enhancement, shortcut, hash sync, back-button).
  - `@refrakt-md/lumina`: drawer CSS for the no-JS and JS states.

- Expand rune: inline a registered entity's body into the current page (SPEC-066). `{% expand "SPEC-023" /%}` pulls the target entity's content into the host page at an author-chosen heading `level=`, so a single `.md` source can render as its own canonical page and also embed inline elsewhere.

  - New generic `data-outline-scope` walkers isolate the embedded content's table-of-contents and namespace its heading IDs, so the embedded outline doesn't collide with the host page's headings or TOC.
  - Includes a canonical-link affordance back to the entity's own page.
  - Works for plan content that isn't published to the site, via the plan plugin's unconditional entity registration (SPEC-064).
  - `@refrakt-md/runes`: `{% expand %}` schema + resolver + expand pipeline; `outline-scope` walkers.
  - `@refrakt-md/lumina`: expand CSS (embedded-entity framing + canonical-link affordance).

- ce36eac: Snippet rune: embed a project file as a syntax-highlighted code block (SPEC-062). Core rune; composes transparently inside `{% codegroup %}`, `{% diff %}`, and any future fence-consuming container via pre-resolve.

  ```markdoc
  {% snippet path="src/lib/foo.ts" /%}
  {% snippet path="src/lib/foo.ts" lines="10-25" /%}
  {% snippet path=$file.path lang="md" title="This page" /%}

  {% codegroup %}
  {% snippet path="examples/button.svelte" /%}
  {% snippet path="examples/button.vue" /%}
  {% /codegroup %}
  ```

  **Implementation as AST preprocessor.** Snippet is not a transform-time rune — every `{% snippet %}` tag is replaced with a Markdoc `fence` node before the schema-driven transform runs. The fence carries the file's resolved content, the inferred (or explicit) language, and `data-snippet-source` / `data-snippet-title` / `data-snippet-lines` attributes for downstream tooling.

  By transform time, no snippet tags remain — only fences. Container runes that match `fence` (codegroup, diff, future runes) consume them transparently with no per-rune awareness of snippet. The standalone form's `<figure class="rf-snippet">` chrome is applied by a post-transform wrap step that only fires for `<pre data-snippet-source>` elements _not_ descended from a fence-consuming container output.

  **New `preprocess` pipeline phase.** `PluginPipelineHooks` gains a `preprocess` hook that runs per page on the parsed Markdoc AST before the transform. The `PreprocessContext` extends `PipelineContext` with `projectRoot` and `sandbox` so file-reading preprocessors (snippet, future macros, future build-time include resolvers) have what they need; variables from the transform config aren't available pre-transform. Hook signature:

  ```ts
  preprocess?: (
    ast: Markdoc.Node,
    page: { url: string; relativePath: string; filePath: string },
    ctx: PreprocessContext,
  ) => Markdoc.Node | void | Promise<...>;
  ```

  Core's `corePipelineHooks` registers the snippet preprocess hook through the existing `createCorePipelineHooks` factory — exercises the hook contract from within core, validating it as a general extension point.

  **Sandbox enforcement** (in `packages/runes/src/lib/read-file.ts`): absolute paths rejected, traversal escapes rejected, symlinks escaping the project root rejected, missing files / directories rejected. All errors produce build errors that name the resolved path and the referencing page; line-range clamps produce warnings.

  **`<pre>` data-attribute pass-through.** The fence node transform (`packages/runes/src/nodes.ts`) now forwards `data-*` attributes from the fence node to the rendered `<pre>`. This is how snippet markers (`data-snippet-source`, etc.) survive the transform so the wrap step can find them.

  **Docs site dogfood.** New page at `site/content/runes/snippet.md` linked from the "Code & Data" sidebar section. The page renders live snippets of actual files in this repository, demonstrates composition with codegroup and diff using real source files, and ends with a recursive view-source-of-itself example via `{% snippet path=$file.path lang="markdoc" /%}` — the snippet docs page literally embeds its own source markdown.

  **Lumina** ships baseline `.rf-snippet` and `.rf-snippet__title` styling.

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

- Framework adapter parity with the SvelteKit reference (SPEC-058) — six capabilities that previously lived only in `@refrakt-md/sveltekit` now ship in working form across `@refrakt-md/astro`, `@refrakt-md/nuxt`, `@refrakt-md/next`, `@refrakt-md/eleventy`, and `@refrakt-md/html`. Application work — no new contracts, no breaking changes.

  **Site-level token-overrides CSS now works in every adapter.** `composeSiteTokensCss` (the generator that turns `theme.presets`, `theme.tokens`, `theme.modes`, and `site.tints` into a stylesheet — SPEC-048 + SPEC-056) moved out of the SvelteKit plugin and into `@refrakt-md/transform/node` as a shared module. The Astro and Nuxt adapters expose it as a Vite virtual module (`virtual:refrakt/site-tokens.css`); Eleventy ships it as a passthrough-managed file; Next.js exposes it through a Server Component helper; the HTML renderer inlines it via a `page-shell` helper. Sites authored on any adapter can now drop tokens into `refrakt.config.json` and skip writing CSS for the common case, just like SvelteKit.

  **SEO meta enrichment from site config in every adapter.** `siteName`, `baseUrl`, `defaultImage`, and `logo` from `refrakt.config.json` now bake into `og:site_name`, absolute `og:url`, image fallback, and WebSite + Organization JSON-LD on every adapter, not just SvelteKit. `SeoToHtmlOptions` threads through the SEO helpers in Astro, Nuxt, Next, Eleventy, and HTML.

  **CSS tree-shaking by used-rune analysis everywhere.** The SvelteKit-only optimisation that emits only the per-rune CSS files for runes actually present in the corpus is now shared via `@refrakt-md/transform/node`'s `used-css` helper. Vite adapters (Astro, Nuxt) get it via a sibling `virtual:refrakt/runes.css` virtual module; non-Vite adapters (Eleventy, Next, HTML) get a `getUsedCssImports` companion. Sites stop shipping the full theme barrel on every framework.

  **Shared pipeline-stats build summary.** The Phase 1/2/3/4 + warnings table that the SvelteKit plugin printed at the end of every build moved into `@refrakt-md/content` and is adopted across every adapter's build path. Eleventy, Astro, Nuxt, and Next now surface the same build summary instead of going silent or inheriting the host framework's default output.

  **`security` and `variables` plugin options surfaced on every non-SvelteKit adapter.** `SecurityPolicy` and Markdoc `$name` variables were SvelteKit-only surfaces even though `loadContent` already accepted them. The Astro `createRefraktLoader`, Nuxt module, Next data helper, Eleventy plugin, and HTML renderer now all forward both options to the loader.

  **Content HMR for non-SvelteKit Vite adapters and Eleventy.** Content HMR (watching the content directory + sandbox examples, invalidating the loader cache on `.md` edits) extends to Astro + Nuxt via Vite `configureServer` and to Eleventy via `addWatchTarget`. The HMR machinery moved from `@refrakt-md/sveltekit` to `@refrakt-md/transform`'s `content-hmr` module so every adapter can reuse it. Next.js intentionally not covered — its dev server already invalidates the loader's import graph when watched files change. The HTML adapter is a static-build helper with no dev server.

  **`template-astro/src/setup.ts` replaced with `createRefraktLoader`.** The Astro starter template's bespoke setup boilerplate folds into a thin `createRefraktLoader` wrapper — the single entry point now handles loader construction, security/variables options, and the new HMR + tokens wiring. Same for the Next.js template's adapter glue.

  **Footer nav two-column mobile rule.** Cosmetic: footer nav drops to two columns on mobile instead of stacking to one, applies to both the auto-columns rendering and the explicit-column variant. Keeps the footer scannable on phone width where one-column footers turn into long scrolls.

- Updated dependencies
  - @refrakt-md/transform@0.14.4
  - @refrakt-md/runes@0.14.4
  - @refrakt-md/types@0.14.4

## 0.14.3

### Patch Changes

- Navigation enrichment: build-time slug resolution + richer dropdowns (SPEC-054 + SPEC-055), `{% badge %}` core inline rune, and a docs IA split into separate author and developer handbooks.

  **SPEC-055: build-time slug resolution + active state.** `{% nav %}` slug references now resolve at build time rather than runtime, so the SSR HTML carries fully-resolved `href` attributes and the "multiple items active at once" symptom is gone. Multi-segment slugs (`docs/configuration/plugins`) are the first-class disambiguator when a leaf slug appears in multiple subtrees — ambiguous bare slugs raise a build error pointing at the offending nav with the candidates listed, instead of silently picking the wrong one. Active state is also computed at build time using exact + longest-prefix matching, with the active class stamped into the SSR HTML so there's no client-side flash. Lumina ships dedicated active-state styles; existing site navs migrated in-place to multi-segment slugs where bare slugs collided.

  **SPEC-054: richer dropdowns, column flow, and the strip layout.** `{% nav layout="menubar" %}` now accepts arbitrary block content inside `## groups`, with a position-based intro/footer slot rule: prose or runes appearing _before_ the first list become the panel intro, content appearing _after_ the list becomes the footer. `{% nav layout="columns" %}` gains a `---`-between-sections column-flow rule (each section becomes a column) plus a headingless mode where a flat list renders as a single-column card. A new `{% nav layout="strip" %}` lands for compact secondary link rows — flat by design; warns on `##` headings since grouped strip-like content should use `columns` or `vertical`. `layout="mega"` was explicitly _not_ added — menubar composition covers it via nested `columns` navs in panel slots.

  **`{% badge %}` core inline rune.** New core inline rune for compact metadata pills — sentiment variants (`success`, `warning`, `danger`, `info`, `neutral`), optional `icon` and `count` attributes. Styled with a sentiment-tinted border and background; standalone usage gets a punchier treatment than inline-in-prose. Lives in `packages/runes/src/tags/badge.ts` and `packages/lumina/styles/runes/badge.css`.

  **Auto-enrichment generalised across `auto=true` layouts.** Description and icon resolution (previously only on a subset of layouts) now applies to every `{% nav auto=true %}` invocation — the cross-page pipeline reads `description` and `icon` from each target page's frontmatter and injects them into the rendered nav item. Menubar panels, column navs, and the new strip layout all benefit. Backwards-compatible: omitting frontmatter just renders the title.

  **Mobile nav fix.** The mobile nav panel now docks below the header and is toggled by a single trigger that flips between open and close — the previous separate open/close buttons led to inconsistent state on rotation. The docs sidebar-nav panel offset was restored after it regressed during the menubar work, and the docs toolbar is now sticky on mobile so the breadcrumb stays visible while scrolling.

  **Docs toolbar breadcrumb.** Surfaces the category and current page title — gives the toolbar useful navigation context on deep pages where the URL alone isn't enough.

  **Docs IA split (WORK-238).** The site's docs tree now splits into two handbooks aimed at different audiences. **Docs** (`/docs/*`) is the author handbook — getting started, authoring, configuration, CLI, adapters, MCP. **Extend** (`/extend/*`) is the new developer handbook — rune authoring, plugin authoring, theme authoring, pipeline, security, contributing. Header restructured to five panels (Docs · Runes · Themes · Extend · Project); footer columns updated to match (Learn · Reference · Extend · Project). Old URLs (`/docs/authoring/*`, `/docs/themes/*`, `/docs/plugins/authoring*`, `/docs/security/*`) redirect to their new homes under `/extend/*`. A new author-facing plugin catalog landed at `/docs/configuration/plugins`. Internal cross-doc links, `CLAUDE.md`, and root READMEs swept to the new paths.

  **Hint rune visual cleanup.** Dropped the border on `{% hint %}` — the tinted surface alone separates it from surrounding prose, the extra border was visual noise.

- Updated dependencies
  - @refrakt-md/runes@0.14.3
  - @refrakt-md/transform@0.14.3
  - @refrakt-md/types@0.14.3

## 0.14.2

### Patch Changes

- Curated syntax preset lineup phase 1 (SPEC-057) + tint-mode override fix on preset-extending tints + jsonc highlighter language.

  **Six imported syntax palettes.** New `@refrakt-md/lumina/presets/{dracula,solarized,catppuccin,tokyo-night,one-dark,gruvbox}` ship the six most widely-recognised community palettes as first-party presets, following the pattern established by Nord in v0.14.1. Dracula and One Dark are dark-only; Solarized, Catppuccin, Tokyo Night, and Gruvbox carry both light and dark canvases. Each preset uses the SPEC-056 mechanism unchanged — a `ThemeTokensConfig` module with extended `SyntaxTokens` roles, opt-in `color.code.*` for canvas-claiming palettes, and live doc pages at `/themes/<name>` rendered through the scoped-tint mechanism. Application work only; no architectural changes.

  **Tint-mode override fix on preset-extending tints.** When a tint extended a preset module path (e.g. `tint="nord"` → `extends: '@refrakt-md/lumina/presets/nord'`), only the build-time scoped tint stylesheet knew about the preset and emitted `--rf-color-*` directly under `[data-tint="nord"]`. The runtime engine never saw the projected chrome accents because `presetMap` wasn't plumbed through `mergeThemeConfig` → `resolveTintExtends`, so no inline `--tint-*` styles were emitted on tinted elements — `tint.css`'s `[data-color-scheme][data-tint]` selectors collapsed to the colour scheme's neutral defaults regardless of the preset. `presetMap` now threads from the SvelteKit loader path through `assembleThemeConfig` and `mergeThemeConfig` into `resolveTintExtends`, so preset chrome accents land in `TintTokens` shape and the engine emits them as inline `--tint-*` styles. The static scoped tint stylesheet keeps emitting `--rf-color-*`; inline styles override on the same element exactly as `token-stylesheet.ts` already anticipated.

  **`jsonc` added to pre-loaded highlighter languages.** Config snippets across the preset doc pages (and other refrakt docs) use ` ```jsonc ` to fence JSON-with-comments. `jsonc` was intentional but not in Shiki's `DEFAULT_LANGS`, so the highlighter silently fell back to plain text. One-line add — Shiki ships `jsonc` as a bundled language.

- Updated dependencies
  - @refrakt-md/transform@0.14.2
  - @refrakt-md/runes@0.14.2
  - @refrakt-md/types@0.14.2

## 0.14.1

### Patch Changes

- Syntax token contract extension (SPEC-056) + diff/compare restyle + mobile and nav polish.

  **SPEC-056: tiered `SyntaxTokens` contract.** `SyntaxTokens` widens from 7 required + 2 optional roles to 7 required + 9 optional. The new optional roles (`type`, `property`, `parameter`, `tag`, `attribute`, `operator`, `number`, `regex`, `decorator`) let preset authors faithfully carry palettes that split distinctions the core collapses (Nord's Frost variants, Tokyo Night, Catppuccin, etc.) while the core stays minimal. Each optional role emits a `var()` fallback chain in the generated CSS, so a preset that doesn't set an optional role still renders correctly — it just shares colour with its documented fallback (`type` → `function`, `property` → `variable`, `tag` → `keyword`, and so on).

  **Extended Shiki css-variables theme.** `@refrakt-md/highlight` now ships an extended css-variables theme that emits the new optional `--rf-syntax-token-*` variables alongside the existing seven. The alias derivation walks the TextMate scope tree to find the right hue for each optional role; presets that don't override a role get the fallback colour through the var() chain.

  **Nord preset module + canonical canvas.** New `@refrakt-md/lumina/presets/nord` ships Arctic Ice Studio's Nord as the first imported palette and the validation case for SPEC-056. The preset also claims the code surface — `theme.code.colorScheme` is `dark` and `color.code.*` projects Nord's canonical bg + fg — so canvas-claiming palettes can ship their full intended look together. Documented at `/themes/nord` with live `{% palette %}` blocks and a code showcase rendered through the scoped-tint mechanism.

  **Scoped tint projection from preset modules.** `theme.tints[].extends` now accepts preset module paths in addition to inline token shapes. When a tint extends a preset, the CSS generator projects the preset's scope-eligible namespaces (`syntax.*`, `color.code.*`, surface tints) into scoped CSS classes — `.rf-tint-nord` and friends — so a documentation page can render a live preset preview inside a page whose active preset is something else entirely. Powers the Nord doc page's live syntax showcase on a niwaki-themed site.

  **Diff + compare restyle.** `{% diff %}` drops the redundant "Before"/"After" labels above each split column (the red/green tints already carry the direction) in favour of an optional full-width header sourced from a new `title` attribute; when `title` is omitted, no header renders. Diff line markers are now a 3px coloured left border (`var(--rf-color-danger)` / `var(--rf-color-success)`) flush with the panel edge instead of an inset, with a slightly stronger background tint via `color-mix`. Equal and empty placeholder lines are both transparent — the previous gray wash on empty placeholders made split columns look like they had different background shades. The `+`/`-` glyph prefix is gone; coloured line numbers carry the directional cue. `{% compare %}` gains a matching `title` attribute that sits above the panels alongside the existing per-panel `labels` (those stay — they identify alternatives, not direction).

  **`theme.code.colorScheme` now cascades through code-bearing wrappers.** The highlight walk previously stamped `data-color-scheme` only on `<pre data-language>`, so the diff's outer `<pre data-name="code">` (which has no `data-language` — only its inner line-content spans do) never received the attribute and the override silently no-op'd on diffs. The walk now stamps the attribute on any `data-rune` wrapper that hosts a highlighted descendant, which generically covers diff, compare, codegroup, and any future code-bearing rune without per-rune knowledge in the transform.

  **Sidebar nav polish.** Collapsible nav groups now animate height transitions from JS (cross-browser consistent across mobile Safari and Firefox) instead of relying on `grid-template-rows` interpolation, which bounced on Firefox. Active items pick up a primary-tinted background instead of the neutral hover style. URL-aware auto-open is unchanged.

  **Mobile layout fixes.** Hero and CTA action rows now stack full-width below 640px instead of trying to fit side-by-side and overflowing. Table cells use a single mobile font-size so adjacent columns don't render at visibly different sizes on iOS. Mobile Safari's automatic text-size adjustment is disabled on `html` so the user's set font-size is respected.

- Updated dependencies
  - @refrakt-md/types@0.14.1
  - @refrakt-md/transform@0.14.1
  - @refrakt-md/runes@0.14.1

## 0.14.0

### Minor Changes

- # v0.14.0 — Design tokens contract, navigation, and brand identity

  Combines two milestones' worth of work — v0.13.0 (Navigation) and v0.14.0 (Design tokens contract + brand identity) — into a single release. v0.13.0 was developed in parallel with v0.14.0 and never shipped as an independent version, so its changes are folded in here.

  ## Highlights

  - **Typed design tokens contract.** `ThemeTokensConfig` is now the canonical authoring surface for theme values. Site authors can drop tokens directly into `refrakt.config.json` under `theme.tokens` / `theme.modes` and skip writing CSS for the common case. Validated at build time against the contract; presets and modes deep-merge in declared order.
  - **Two opt-in Lumina presets.** `tideline` preserves the previous cream-and-navy chrome (now with IBM Plex Sans/Mono typography); `niwaki` is a syntax-only preset with a Japanese-garden palette. Both demonstrate that scoped presets (syntax-only, chrome-only, font-only) are first-class.
  - **Per-page tint cascade.** Frontmatter `tint`, `tint-mode`, and `tint-lock` cascade through the layout tree; the refrakt site uses this to lock its marketing pages to dark while letting docs / runes / plan-docs honour the user's preference. New `ThemeToggle` component for unlocked subtrees; pre-paint script eliminates FOIT on locked routes.
  - **`theme.code.colorScheme`** lets sites force fenced code blocks to a fixed light/dark scheme regardless of page mode (Stripe/Vercel-style always-dark code on light pages). Replaces the hand-mirrored `pre, pre[data-language]` override pattern that previously drifted from the active preset.
  - **Faster SvelteKit dev server.** The virtual content module now caches the loaded Site across navigations and invalidates only on `.md` edits — pages load near-instantly after the first navigation instead of re-running the cross-page pipeline per click.
  - **Nav primitives shipped.** Four contextual `nav` layouts (sidebar, header menubar, footer columns, section-landing cards), collapsible sidebar groups with URL-aware auto-open, and a new `pagination` rune for sequential reading flows.
  - **Prism logo + favicon set.** Monochrome prism mark replaces the previous cube; 18-PNG favicon set generated from the canonical SVG via `packages/lumina/scripts/generate-favicons.mjs`.

  ## Breaking changes

  - **Syntax contract simplified.** `SyntaxTokens.number` and `SyntaxTokens.type` removed; `constant` promoted to a direct slot covering numeric literals plus boolean/null/Symbol (matches Shiki's `token-constant` vocabulary). Migrate `syntax.number` → `syntax.constant`; drop `syntax.type` (no Shiki path existed for it).
  - **Shiki CSS variables renamed.** `--shiki-*` is now `--rf-syntax-*` (e.g. `--shiki-token-keyword` → `--rf-syntax-token-keyword`). Custom CSS reading the highlighter's variables directly needs to update; themes that consume only the contract surface are unaffected.
  - **Lumina's default appearance changed.** The previous cream-and-navy palette moved into the `tideline` preset; the new neutral default is a quiet warm-neutral (#f6f4ef / #1c1a17) designed to disappear behind content. Sites that want the old appearance opt in with `"presets": ["@refrakt-md/lumina/presets/tideline"]`.
  - **Tint shape aligned with token vocabulary.** `TintTokens` / `TintDefinition` field names and CSS custom property names (`--tint-*`) updated for consistency with the rest of the contract; lumina + plugin tint configs migrated.
  - **Default typography changed.** Outfit → Inter (body) and JetBrains Mono (code). Sites that prefer the old typography pin `font.sans` / `font.mono` back via `theme.tokens.font`, or opt into the tideline preset (which uses IBM Plex Sans/Mono).
  - **`RefraktConfig.packages[]` removed.** The deprecated top-level shorthand for `config.plugins[]` is gone (deprecation warning shipped in v0.12.0). Use `plugins[]` directly.

  ## Migration

  See `/docs/migration/v0.14.0` on the refrakt site for the full migration recipe, including:

  - the tint-vocabulary rename mapping
  - the Shiki → `--rf-syntax-*` variable rename
  - the syntax-token contract change (`number`/`type` → `constant`)
  - restoring the previous appearance via the tideline preset
  - the per-page tint cascade frontmatter fields

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

- a733ec6: Add an opt-in `SecurityPolicy` for the transform pipeline so hosted products can render untrusted author content with layered defences (WORK-177).

  The policy ships with three tiers, each adding a layer on top of the previous one:

  - **Tier 1 — `'strict'`**: in-package, no JS. The schema transform runs the new `sanitizeSandboxContent` helper which strips `<script>` blocks, `on*` event handlers, `javascript:` URLs, and `<iframe>`/`<object>`/`<embed>` tags. The client iframe is built with `sandbox="allow-scripts"` only (drops `allow-same-origin`), and a non-removable visual banner is rendered above the iframe. Only tier with a hard guarantee from the package alone.
  - **Tier 2 — `{ trust: 'untrusted', allowJs: true }`**: srcdoc + meta-CSP. Author scripts run, but the iframe gets a unique opaque origin and the srcdoc head is prefixed with a meta-CSP that closes `connect-src`, `form-action`, `img-src` (data + permitted CDN origins only), and gates `script-src`/`style-src` to `'unsafe-inline'` plus the framework preset and declared dependency origins. Closes data exfiltration, off-site form posts, tracking pixels, and external script loads. Does not close fingerprinting, cryptojacking, or browser-exploit chains.
  - **Tier 3 — `{ ..., sandboxOrigin: 'https://sandbox.example.com' }`**: separate-origin escape hatch. The iframe loads from the host endpoint instead of `srcdoc`, content is delivered via `postMessage` after a `rf-sandbox-ready` handshake, and the host serves real CSP response headers. Required if you need `frame-ancestors` / `report-uri`. Endpoint contract documented in `site/content/docs/security/`.

  The default remains `'trusted'` — no behaviour change for self-hosted users. The policy flows through `config.variables.__securityPolicy` so plugins authoring risky runes can honour it from their own schema transforms; see the new "Honouring the security policy" section in `site/content/docs/plugins/authoring.md` for the contract.

  API:

  ```ts
  import type { SecurityPolicy } from "@refrakt-md/types";

  // SvelteKit Vite plugin
  refrakt({ security: "strict" });

  // loadContent() positional arg
  loadContent(dir, "/", icons, tags, plugins, sandboxDir, vars, "strict");
  ```

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

- b04d001: Add nav top-level links support. Items before the first heading in a `{% nav %}` rune now render as prominent top-level links above the grouped navigation, styled with `.rf-nav__top-level`. Explicit markdown links (`[Label](/path)`) in nav items pass through as-is rather than being treated as slugs for web component resolution.
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

- - Fix annotate rune: margin notes invisible, inline notes not inline
  - Fix sidenote rune rendering empty due to minimal density hiding body
  - Fix juxtapose label rendering and restyle toggle buttons
  - Unwrap runes from paragraph wrappers in juxtapose panels
  - Fix diagram surface and style mermaid diagrams with Lumina tokens
  - Fix mediatext wrap mode ignoring ratio attribute
  - Fix budget estimate indicator and improve examples
  - Fix sandbox dark mode on mobile browsers
  - Improve SEO and AI discoverability
- Updated dependencies
  - @refrakt-md/runes@0.9.5
  - @refrakt-md/transform@0.9.5
  - @refrakt-md/types@0.9.5

## 0.9.4

### Patch Changes

- Fix Vite dev server warnings: deprecated svelte:component, dynamic imports, void elements
- Fix gallery responsive behavior: reset margin, columns, and gap at breakpoints
- Fix pipeline hooks: unwrap LoadedPackage to RunePackage for community packages
- Fix Astro adapter: manifest JSON import, layouts compilation, sandbox rendering
- Add syntax highlighting to Astro template
- Derive Astro theme from config instead of hardcoding lumina
- Remove table/pre element overrides in favor of Markdoc node schemas
- Fix runes broken by table/codeblock wrapper divs
- Improve form rune styling: surface background, full width, inline alignment
- Fix figure rune image extraction
- Align mark.svg dark mode color with Lumina palette
- Add SVG favicon using existing mark.svg logo
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
  - @refrakt-md/html@0.9.1
  - @refrakt-md/runes@0.9.1
  - @refrakt-md/svelte@0.9.1
  - @refrakt-md/transform@0.9.1
  - @refrakt-md/types@0.9.1

## 0.9.0

## 0.8.5

### Patch Changes

- Add blog rune for listing posts with filtering and sorting. Expose frontmatter and page data as content-level Markdoc variables. Redesign juxtapose rune with --- delimiter and overlay labels. Auto-discover runes in VS Code extension and editor. Fix map rune collapsed border and add spacing support. Fix juxtapose tint mode.
- Updated dependencies
  - @refrakt-md/html@0.8.5
  - @refrakt-md/runes@0.8.5
  - @refrakt-md/svelte@0.8.5
  - @refrakt-md/transform@0.8.5
  - @refrakt-md/types@0.8.5

## 0.8.4

### Patch Changes

- Updated dependencies
  - @refrakt-md/runes@0.8.4
  - @refrakt-md/html@0.8.4
  - @refrakt-md/svelte@0.8.4
  - @refrakt-md/transform@0.8.4
  - @refrakt-md/types@0.8.4

## 0.8.3

### Patch Changes

- Updated dependencies
  - @refrakt-md/runes@0.8.3
  - @refrakt-md/html@0.8.3
  - @refrakt-md/svelte@0.8.3
  - @refrakt-md/transform@0.8.3
  - @refrakt-md/types@0.8.3

## 0.8.2

### Patch Changes

- Bug fixes and editor improvements including CodeMirror code editing, mobile search fix, structure tab enhancements, and block editor UI refinements.
- Updated dependencies
  - @refrakt-md/types@0.8.2
  - @refrakt-md/transform@0.8.2
  - @refrakt-md/runes@0.8.2
  - @refrakt-md/svelte@0.8.2
  - @refrakt-md/html@0.8.2

## 0.8.1

### Patch Changes

- Updated dependencies
  - @refrakt-md/runes@0.8.1
  - @refrakt-md/html@0.8.1
  - @refrakt-md/svelte@0.8.1
  - @refrakt-md/transform@0.8.1
  - @refrakt-md/types@0.8.1

## 0.8.0

### Patch Changes

- Updated dependencies
  - @refrakt-md/types@0.8.0
  - @refrakt-md/runes@0.8.0
  - @refrakt-md/svelte@0.8.0
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
  - @refrakt-md/svelte@0.7.2

## 0.7.1

### Patch Changes

- @refrakt-md/runes@0.7.1
- @refrakt-md/svelte@0.7.1
- @refrakt-md/transform@0.7.1
- @refrakt-md/types@0.7.1

## 0.7.0

### Patch Changes

- Updated dependencies
  - @refrakt-md/runes@0.7.0
  - @refrakt-md/svelte@0.7.0
  - @refrakt-md/transform@0.7.0
  - @refrakt-md/types@0.7.0

## 0.6.0

### Minor Changes

- ### Editor

  - WYSIWYG block editor with stacked previews, Shadow DOM isolation, and rail navigation
  - Three-mode editor toggle: Visual, Code, and Preview with unified header bar
  - Category-based sidenav that groups content by route rules from refrakt.config.json
  - Positioned popovers for page/folder/category creation near trigger buttons
  - Rune palette with attribute autocomplete and Markdoc tag highlighting
  - Layout editor with visual navigation editing
  - Frontmatter editor with raw YAML mode
  - Live Svelte preview runtime with full-fidelity layout rendering
  - File watching via SSE for external editor coexistence
  - Responsive viewport selector (desktop/tablet/mobile)
  - Preview link navigation — clicking links in preview navigates the editor
  - Client-side syntax highlighting via Shiki
  - File operations: create, rename, duplicate, delete, toggle draft

  ### Framework neutrality

  - Migrated Diagram, Sandbox, Map, and Comparison runes from Svelte components to framework-neutral web components
  - Added postTransform hooks to identity transform engine for component-free interactive runes

  ### Tooling

  - Python symbol extraction pipeline (`refrakt extract`)
  - Theme distribution: complete export package with CLI install command
  - Icon rune system with Lucide icon set and per-project custom icons via refrakt.config.json

  ### Theme Studio

  - AI-powered theme generation with design expression prompts
  - Per-rune CSS override editor with CodeMirror
  - Undo/redo history with keyboard shortcuts
  - Fixture picker with configurable rune previews and coverage indicator
  - Visual design token editors
  - Export panel with CSS preview, copy, and ZIP download
  - localStorage persistence

  ### Content & site

  - Layout transform engine for computed content in layouts
  - Semantic rune usage throughout documentation
  - Dedicated CLI documentation section

### Patch Changes

- Updated dependencies
  - @refrakt-md/transform@0.6.0
  - @refrakt-md/theme-base@0.6.0
  - @refrakt-md/types@0.6.0
  - @refrakt-md/svelte@0.6.0

## 0.5.1

### Patch Changes

- @refrakt-md/svelte@0.5.1
- @refrakt-md/theme-base@0.5.1
- @refrakt-md/transform@0.5.1
- @refrakt-md/types@0.5.1

## 0.5.0

### Minor Changes

- ### Theme Development Toolkit

  - **`refrakt scaffold --theme`** generates a complete custom theme with layout, CSS tokens, manifest, test infrastructure, and kitchen sink content
  - **`refrakt inspect`** command for theme developers — rune coverage audit, CSS audit, structure contracts
  - **`refrakt inspect --contracts`** generates HTML structure contracts (`structures.json`) for all 74 runes
  - Theme scaffold produces full `SvelteTheme` runtime integration (manifest, layouts, components, elements)
  - CSS entry points: `base.css` (tokens-only), `svelte/tokens.css` (dev bridge), `styles/runes/*.css` (tree-shakable)

  ### Behaviors Library

  - **`@refrakt-md/behaviors`** — vanilla JS progressive enhancement via `data-rune` attributes
  - Tabs, accordion/reveal, datatable, form, copy-to-clipboard, and preview behaviors
  - Framework-agnostic: works with any renderer, no Svelte dependency

  ### Theme Base Package

  - **`@refrakt-md/theme-base`** — extracted universal rune config, interactive components, and structural CSS
  - 74 rune configurations in identity transform engine
  - Enables multi-theme support with shared component registry

  ### Identity Transform Expansion

  - Moved 8+ Svelte components to pure CSS/identity transform + behaviors
  - `styles`, `staticModifiers`, `postTransform` engine capabilities
  - Context-aware BEM modifiers
  - Design runes (palette, typography, spacing) moved to identity layer
  - Blockquote as CSS-only implementation
  - Migrated all components to `--rf-*` prefixed tokens (removed `aliases.css`)

  ### New Runes

  - **`symbol`** — code construct documentation (functions, classes, interfaces)
  - **`preview`** — component showcase with theme toggle, code/preview tabs, responsive viewports
  - **`sandbox`** — live HTML playground with iframe isolation
  - **`map`** — interactive location visualizations
  - **`design-context`** — token extraction and sandbox injection
  - Standalone design runes: swatch, palette, typography, spacing

  ### Preview Rune Enhancements

  - Three-tab source panel (Markdoc, Rune, HTML)
  - Auto-inferred source mode
  - Responsive bleed with container queries
  - Theme toggle with dark mode support

  ### VS Code Extension

  - Language server with completion, hover, and diagnostics
  - Rune Inspector tree view
  - Sandbox and preview snippets
  - Bundled for distribution

  ### Build & Performance

  - Build-time CSS tree-shaking via content analysis
  - Configurable Shiki syntax highlight themes
  - Form field HTML generation moved into rune schemas

  ### CLI Enhancements

  - Multi-file generation in `refrakt write`
  - Gemini Flash provider as free cloud AI option
  - Improved CLI feedback and scaffolding versions

  ### Mobile & Layout

  - Mobile navigation for Lumina theme (hamburger toggle, scroll lock, breadcrumbs)
  - Blog layout with post listing and index page
  - Layout CSS extracted from Svelte components into standalone files

  ### Bug Fixes

  - Fix preview content leaking between pages on navigation
  - Fix codegroup title placement and pre border
  - Fix tab list decoration dots and duplicate copy button
  - Fix form fields rendering empty
  - Fix map rune streaming init and geocoding fallback
  - Fix timeline dots, lines, and title display
  - Fix duplicate step numbers in Steps rune
  - Fix feature rune dt/dd bug and split/mirror API
  - Fix mobile nav hidden links and panel positioning
  - Fix TS2307 on Cloudflare with dynamic import

### Patch Changes

- Updated dependencies
  - @refrakt-md/types@0.5.0
  - @refrakt-md/transform@0.5.0
  - @refrakt-md/theme-base@0.5.0
  - @refrakt-md/svelte@0.5.0

## 0.4.0

### Patch Changes

- @refrakt-md/svelte@0.4.0
- @refrakt-md/transform@0.4.0
- @refrakt-md/types@0.4.0

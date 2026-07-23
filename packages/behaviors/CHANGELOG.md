# @refrakt-md/behaviors

## 0.29.0

### Minor Changes

- 9a4e4b9: Multi-language support (i18n foundation) — SPEC-035

  Framework-generated text (labels, navigation chrome, accessibility strings,
  structural headings, and client-side behavior strings) is now localizable.
  Zero-config English is unchanged — adding a language means providing a strings
  dictionary, no structural changes.

  - **Locale config**: `locale` + `strings` on `ThemeConfig` and `SiteConfig`; a
    render-scoped `LocaleContext` with `resolveLocaleString` / `resolvePluralString`
    (CLDR plurals via `Intl.PluralRules`) and per-key first-match fallback with
    BCP-47 region stripping (`de-AT`→`de`).
  - **Auto-derived keys**: labels resolve through `{scope}.{block}.{ref}` keys
    (optional `i18nKey` override); covers structure/meta-field labels, layout chrome,
    computed navigation, programmatic text (`data-i18n`), and enum-as-text values.
  - **`refrakt i18n extract`** (CLI + `refrakt.i18n_extract` MCP tool): emits the full
    key→English dictionary as JSON; `--check` reports per-locale coverage and fails on
    drift.
  - **Behavior strings**: delivered inline (`<meta name="rf-locale">` +
    `<script id="rf-strings">`), resolved element→block→English synchronously with no
    fetch and no flash-of-English.
  - **Plugin translation bundles**: `Plugin.translations`, merged by `mergePlugins`
    under site overrides (site wins).
  - **knownSections**: `canonicalSlug` + `i18nAliases` for language-stable section slugs.
  - **Cross-adapter `<html lang>`** + locale-aware `Intl` duration/number/currency.
  - **First-party bundles**: in-package per-locale JSON (`i18n/<locale>.json`) with a
    seeded German translation; partial bundles degrade per key to English.

## 0.28.0

### Minor Changes

- 816b0d1: Add the `data` rune (SPEC-103) — ingest an external tabular source and render it as a table, chart, or datatable.

  A preprocess-time `{% data %}` rune reads an external file through the SPEC-113 `ProjectFiles` sandbox and emits a Markdoc `table` node that `chart` and `datatable` consume with **no structural changes** — the emitted table is also the honest no-JS fallback.

  - **Formats** — CSV/TSV (RFC-4180 quoting, `delimiter`/`header` knobs) and JSON/NDJSON (`root` locator, `orient` records/values/index, `key-column`, nested objects flattened to dotted headers). `format` is extension-inferred and overridable.
  - **Shaping** — build-time `where` (the SPEC-070 `field:value` grammar), `sort`, `columns` (select/order/rename), `limit`/`offset`, all format-agnostic.
  - **Typing** — `numeric`/`text` with auto-inference; typed-numeric cells emit a normalized `data-value` (`"$1,200"` → `1200`) that `chart` reads and `datatable` now sorts on.
  - **datatable** — its sort comparator now prefers a cell's `data-value` over its text, so human-formatted numbers sort correctly. Purely additive: tables without `data-value` are unchanged, and hand-authored tables can opt in.
  - Failures (sandbox escape, missing file, parse error, empty result) render a visible error callout and warn — the build continues.

## 0.27.0

## 0.26.0

### Minor Changes

- 7988847: **Carousel is now a shared layout mode any rune can adopt, not a one-off.** `layout="carousel"` is a canonical layout token backed by a shared DOM contract (a `data-name="items"` track whose direct children are the slides) and an attribute-triggered behavior dispatch path: the carousel behavior enhances any block carrying `[data-layout="carousel"]`, lifted out of the gallery to be block-agnostic. A CSS-only `collapse-to` dial lets a grid/list collapse into a carousel at a breakpoint. `feature` (marketing) and `cast` (business) are the first adopters; the shared track + `collapse-to` contract is documented for further runes.

### Patch Changes

- decb8d5: **Fix the `feature` carousel layout: gap between slides and working prev/next buttons.** The shared carousel behavior computed its per-item scroll distance from `getComputedStyle(track).gap`, but an unset flex `gap` computes to the string `"normal"` in real browsers — `parseFloat("normal")` is `NaN`, so `scrollBy({ left: NaN })` was a silent no-op and the nav buttons did nothing. It now reads `columnGap` and falls back to `0` on any non-finite value. Lumina's `feature` styles also gained the missing `gap` on the `[data-layout="carousel"]` track (matching the existing `grid` gap), so carousel slides no longer butt together. Separately, the `preview` rune's `responsive` attribute description is corrected: it accepts viewport **presets** (`mobile`, `tablet`, `desktop`), not pixel widths.
- 693cf13: **Preview toolbar: surface the view toggle separately and hide preview-only controls in code view.** The view-mode toggle (preview ⇄ code) now sits in its own group on the left of the toolbar, visually distinct from the controls that _tune_ the rendered preview. Those preview-only controls — the responsive viewport selector and the theme toggle — are hidden while the code view is active, since they act on a canvas that isn't shown. Their state is retained and reapplied when you switch back to the preview. Toolbar chrome is also tidied: the toolbar sits flush to the canvas edges (no horizontal inset), the left group has no inter-item gap, and the source/code panel is clipped to its rounded corners so the bottom corners round correctly (matching the canvas).

## 0.25.1

### Patch Changes

- 35d7658: Fix diagram rune silently failing when theme colors are non-hex. Mermaid only accepts hex colors, but `--rf-color-*` tokens defined as `oklch(...)`, `color-mix(...)`, named colors, or nested `var()` reached it unconverted. The `<rf-diagram>` element now resolves each token to hex at render time via the browser's own color engine before initializing mermaid.

## 0.25.0

## 0.24.6

### Patch Changes

- c25b10b: Add the `frame-overflow: clip | bleed` media-frame facet (SPEC-116, WORK-444). A guest whose content is wider than its frame — a fixed-width or naturally wide component — is clipped at the rounded inset edge by default; `frame-overflow="bleed"` instead runs an overflowing guest's inline-end out to the layout edge on a narrow viewport and squares those corners, so it reads as cropped by the screen.

  It's a universal frame facet (host/slot-set), resolved onto the media zone as `data-frame-overflow`, and gated by a runtime per-guest `data-overflowing` signal — the guest reports the fact (the `sandbox` measures its iframe with hysteresis), the host decides the policy. It's meaningful only on a bleed host (hero/feature); on a clip host (card/bento-cell) the media well crops the over-width, so it's a no-op and emits a build warning. The bleed reaches a layout-owned boundary (`--rf-bleed-room-end`, default the page gutter), never the raw viewport, so a chrome'd layout can cap it at the content row. v1 is collapsed-viewport, inline-end only; direction (via `frame-anchor`) and side-by-side are deferred.

## 0.24.5

## 0.24.4

## 0.24.3

## 0.24.2

## 0.24.1

## 0.24.0

### Minor Changes

- dd2d955: **Live sandbox guests in the `bg` backdrop layer (SPEC-104).** A surface can now carry **both** an animated backdrop **and** a positioned subject media — the visualiser is the `bg`, the image/code/embed stays an in-flow media guest, so they stop competing for the single media zone.

  - `bg` gains an optional body holding one bare `sandbox`: it's transformed normally (the real rune runs, with file resolution + sanitisation), tagged `data-bg-guest`, and the engine relocates it into the bg layer (a sibling of `bg-video`, above the boot frame, below overlay/scrim). A chromed guest (`video`/`audio`/`figure`) is rejected with a build warning.
  - A new **backdrop posture** (`data-guest-posture="backdrop"`): the guest is mounted and running but pointer-inert; the sandbox is forced to `height="fill"` + eager activation, **not** mounted under `prefers-reduced-motion` (the boot frame stands in), and suspended off-screen / on a hidden tab.
  - A **named `sandbox` bg preset** (`BgPresetDefinition.sandbox`, project-level `backgrounds` config) applies a reusable scene by name (`bg="midnight-waves"`) like any other preset, resolved at transform time and memoised per scene.

- dd2d955: **Scroll-reveal motion — a token-driven entrance dimension (SPEC-105).** Sections can now animate in as they scroll into view. The author declares _intent_ with two universal attributes; the theme owns the choreography; a behaviour owns the timing — JS = when, CSS = how.

  - **`reveal`** — a closed entrance vocabulary on every block rune: `none` (default), `fade`, `slide`, `scale`, `blur`. An unknown value is a build error.
  - **`stagger`** — cascades a multi-child block's items in (feature/bento/steps/pricing/playlist); a silent no-op on single-child runes. The engine stamps `--rf-reveal-index` on the cascade items.
  - **The motion dimension** (`dimensions/motion.css` + `--rf-reveal-*` physics tokens) renders each character keyed on `data-reveal` × `data-in-view`, from one stylesheet covering all section runes. It animates the individual `translate`/`scale` properties (never the `transform` shorthand) so it composes with existing rune transforms. The physics are a first-class token group, retunable site-wide via `refrakt.config.json` `theme.tokens.reveal.*`.
  - **An IntersectionObserver behaviour** flips `data-in-view` on first intersection. Opt-in and enhancement-gated: SSR/no-JS/crawler and `prefers-reduced-motion` render the fully-visible final state — nothing is hidden behind JS.

### Patch Changes

- dd2d955: **Fix: `mockup` as a media guest renders correctly (incl. iOS Safari).** A mockup placed in a rune's media zone (cards, bento) now fills its slot instead of capping at its native size, and is inset from the media-zone sides. The upscale is gated to fine-pointer / wide slots, scaled with `transform` rather than `zoom`, and its fill factor is measured in JS (a new `mockup` behaviour) rather than `cqi` — fixing the sizing on iOS Safari.

## 0.23.0

## 0.22.0

## 0.21.0

### Minor Changes

- 92c8f1b: **Data-bound sandboxes** (SPEC-093 core) — the registry's third render target, after `collection` (HTML) and `aggregate` (SVG): bring your own renderer. A `{% sandbox data="type:page" %}` binds a registry query (SPEC-070 field-match grammar); the build resolves it, projects (`data-fields`) and shapes it (`data-shape="flat"` | `"tree"`), caps the payload, and injects the JSON so the iframe code can read it as a frozen `window.RF_DATA`. The payload rides the same data-attribute rail as design tokens, so it works across every adapter. Over-cap payloads warn and truncate; a sandbox with no static fallback warns (progressive-enhancement reminder). Enables registry-fed visualizations like a 3D sitemap or relationship graph.
- 27124ea: **Hero cover layout + animated sandbox backgrounds** (SPEC-101). `hero` is now a first-class `media-position="cover"` host: the media well fills the section interior and the headline/blurb/actions overlay it, with the cover knobs (`content-place`, `height`, `aspect`), a band-appropriate height authority (a viewport-relative floor instead of the 3/4 tile default), root padding rerouted to the overlay, and a centred-band overlay default with an even scrim. Any non-`img`/`video` media guest now fills a cover well; `sandbox` gains `height="fill"` (iframe pinned to 100%, auto-resize negotiation disabled), applied automatically when a sandbox is a cover backdrop — so a live three.js scene drops into a hero as a full-bleed, inert animated background. A non-eager (`activation="visible"|"click"`) sandbox under cover warns at build time (the Run affordance is unreachable on an inert backdrop). Ships with the wireframe-waves showcase (`site/examples/wireframe-waves/`) — a displaced wireframe terrain whose crests pick up the niwaki palette. Also fixes nested-density title sizing: `[data-section="title"]` now sizes via `--rf-title-size` (set per density root), so a full-density rune inside a compact host (a hero in a `preview`) keeps its real title size. And fixes inverted stacked media labels (BUG-001): hero/feature/step have content-first DOM, so the shared media-first stacked CSS rendered `top` at the bottom and vice versa — their default is now a truthful `bottom` (zero visual change for existing content) and explicit `top`/`bottom` render where they say.
- 2f6332d: **Deferred sandbox activation** (WORK-381) — keep heavy sandboxes off the critical path. `{% sandbox %}` gains `activation` (`eager` default | `visible` | `click`) and a `poster` image URL. A non-eager sandbox shows the poster and an explicit **Run** control in the iframe's place and defers iframe creation _and_ every dependency download until activated — `visible` mounts on scroll-in (`IntersectionObserver`), `click` mounts on user action. Under `prefers-reduced-motion` a non-eager sandbox never auto-activates: the poster and control stay so motion-sensitive visitors opt in. Eager sandboxes are unchanged (no markup or behaviour regression). The site's 3D star-map sitemap now loads only when scrolled into view.

## 0.20.2

## 0.20.1

### Patch Changes

- 7a6aaf5: `diagram` now renders after SPA navigation and re-renders when the colour scheme changes, so diagrams stay correct across client-side route changes and theme toggles.

## 0.20.0

### Minor Changes

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

## 0.19.0

### Minor Changes

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

## 0.18.0

## 0.17.0

## 0.16.1

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

## 0.15.0

### Minor Changes

- Drawer rune: a body-only rune that opens its content as a slide-in panel from an xref-as-trigger in prose (SPEC-060). A cross-reference to the drawer's id anywhere on the page opens the drawer; the body is registered as a page-scoped entity rather than rendered inline.

  - Ships in two states: a no-JS `<details>`-style fallback that works without scripts, and a progressively-enhanced `<dialog>` with slide-in animation, scroll-lock, a keyboard shortcut, URL-hash sync, and back-button integration.
  - New `EntityRegistration.scope: 'page' | 'site'` field distinguishes page-local entities (drawer bodies) from site-wide ones, so a drawer registered on one page doesn't leak into another page's xref namespace.
  - `@refrakt-md/types`: `EntityRegistration.scope`.
  - `@refrakt-md/runes`: `{% drawer %}` schema + transform + drawer pipeline; engine config for both rendered states.
  - `@refrakt-md/behaviors`: `drawer` behavior (`<dialog>` enhancement, shortcut, hash sync, back-button).
  - `@refrakt-md/lumina`: drawer CSS for the no-JS and JS states.

## 0.14.4

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

## 0.14.2

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

## 0.14.0

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

## 0.11.3

## 0.11.2

## 0.11.1

## 0.11.0

## 0.10.1

## 0.10.0

### Patch Changes

- Version bump for coordinated release

## 0.9.9

## 0.9.8

## 0.9.7

## 0.9.6

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

## 0.9.3

## 0.9.2

### Patch Changes

- Add multi-framework adapter packages (Astro, Eleventy, Next.js, Nuxt, React, Vue) with ADR-008 framework-native component interfaces. Implement ADR-009 framework-agnostic theme architecture. Add vue, astro, and jinja to Shiki default languages.

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

## 0.9.0

## 0.8.5

### Patch Changes

- Add blog rune for listing posts with filtering and sorting. Expose frontmatter and page data as content-level Markdoc variables. Redesign juxtapose rune with --- delimiter and overlay labels. Auto-discover runes in VS Code extension and editor. Fix map rune collapsed border and add spacing support. Fix juxtapose tint mode.

## 0.8.4

### Patch Changes

- Fix scaffolded sites not loading community packages or applying identity transform. Fix preview rune code toggle broken by data-field/data-name mismatch. Add smarter heading-level detection in sections content model for preamble support. Restore ordered-list-based steps authoring pattern.

## 0.8.3

## 0.8.2

### Patch Changes

- Bug fixes and editor improvements including CodeMirror code editing, mobile search fix, structure tab enhancements, and block editor UI refinements.

## 0.8.1

## 0.8.0

## 0.7.2

## 0.7.1

## 0.7.0

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

## 0.5.1

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

# @refrakt-md/highlight

## 0.18.0

### Patch Changes

- Updated dependencies [cd30659]
- Updated dependencies [b05fc8d]
  - @refrakt-md/transform@0.18.0
  - @refrakt-md/types@0.18.0

## 0.17.0

### Patch Changes

- Updated dependencies [2d85b5f]
  - @refrakt-md/types@0.17.0
  - @refrakt-md/transform@0.17.0

## 0.16.1

### Patch Changes

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

## 0.15.0

### Patch Changes

- Updated dependencies
- Updated dependencies [55de91d]
- Updated dependencies [8a0a6fa]
- Updated dependencies [ce36eac]
- Updated dependencies [8f8daec]
  - @refrakt-md/types@0.15.0
  - @refrakt-md/transform@0.15.0

## 0.14.4

### Patch Changes

- Updated dependencies
  - @refrakt-md/transform@0.14.4
  - @refrakt-md/types@0.14.4

## 0.14.3

### Patch Changes

- Updated dependencies
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

## 0.14.0

### Patch Changes

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

## 0.11.3

### Patch Changes

- Updated dependencies [8cf7caf]
  - @refrakt-md/types@0.11.3
  - @refrakt-md/transform@0.11.3

## 0.11.2

### Patch Changes

- @refrakt-md/transform@0.11.2
- @refrakt-md/types@0.11.2

## 0.11.1

### Patch Changes

- @refrakt-md/transform@0.11.1
- @refrakt-md/types@0.11.1

## 0.11.0

### Patch Changes

- Updated dependencies [6a89ebe]
  - @refrakt-md/transform@0.11.0
  - @refrakt-md/types@0.11.0

## 0.10.1

### Patch Changes

- @refrakt-md/transform@0.10.1
- @refrakt-md/types@0.10.1

## 0.10.0

### Patch Changes

- Version bump for coordinated release

## 0.9.9

### Patch Changes

- @refrakt-md/transform@0.9.9
- @refrakt-md/types@0.9.9

## 0.9.8

### Patch Changes

- @refrakt-md/transform@0.9.8
- @refrakt-md/types@0.9.8

## 0.9.7

### Patch Changes

- @refrakt-md/transform@0.9.7
- @refrakt-md/types@0.9.7

## 0.9.6

### Patch Changes

- Updated dependencies
  - @refrakt-md/types@0.9.6
  - @refrakt-md/transform@0.9.6

## 0.9.5

### Patch Changes

- Updated dependencies
  - @refrakt-md/transform@0.9.5
  - @refrakt-md/types@0.9.5

## 0.9.4

### Patch Changes

- @refrakt-md/transform@0.9.4
- @refrakt-md/types@0.9.4

## 0.9.3

### Patch Changes

- Updated dependencies
  - @refrakt-md/types@0.9.3
  - @refrakt-md/transform@0.9.3

## 0.9.2

### Patch Changes

- Add multi-framework adapter packages (Astro, Eleventy, Next.js, Nuxt, React, Vue) with ADR-008 framework-native component interfaces. Implement ADR-009 framework-agnostic theme architecture. Add vue, astro, and jinja to Shiki default languages.
- Updated dependencies
  - @refrakt-md/types@0.9.2
  - @refrakt-md/transform@0.9.2

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
  - @refrakt-md/transform@0.9.1
  - @refrakt-md/types@0.9.1

## 0.9.0

## 0.8.5

### Patch Changes

- Add blog rune for listing posts with filtering and sorting. Expose frontmatter and page data as content-level Markdoc variables. Redesign juxtapose rune with --- delimiter and overlay labels. Auto-discover runes in VS Code extension and editor. Fix map rune collapsed border and add spacing support. Fix juxtapose tint mode.
- Updated dependencies
  - @refrakt-md/transform@0.8.5
  - @refrakt-md/types@0.8.5

## 0.8.4

### Patch Changes

- @refrakt-md/transform@0.8.4
- @refrakt-md/types@0.8.4

## 0.8.3

### Patch Changes

- @refrakt-md/transform@0.8.3
- @refrakt-md/types@0.8.3

## 0.8.2

### Patch Changes

- Bug fixes and editor improvements including CodeMirror code editing, mobile search fix, structure tab enhancements, and block editor UI refinements.
- Updated dependencies
  - @refrakt-md/types@0.8.2
  - @refrakt-md/transform@0.8.2

## 0.8.1

### Patch Changes

- @refrakt-md/transform@0.8.1
- @refrakt-md/types@0.8.1

## 0.8.0

### Patch Changes

- Updated dependencies
  - @refrakt-md/types@0.8.0
  - @refrakt-md/transform@0.8.0

## 0.7.2

### Patch Changes

- Updated dependencies
  - @refrakt-md/types@0.7.2
  - @refrakt-md/transform@0.7.2

## 0.7.1

### Patch Changes

- @refrakt-md/transform@0.7.1
- @refrakt-md/types@0.7.1

## 0.7.0

### Patch Changes

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
  - @refrakt-md/types@0.6.0

## 0.5.1

### Patch Changes

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

## 0.4.0

### Patch Changes

- @refrakt-md/transform@0.4.0
- @refrakt-md/types@0.4.0

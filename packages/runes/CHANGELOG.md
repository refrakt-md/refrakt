# @refrakt-md/runes

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

- b04d001: Add nav top-level links support. Items before the first heading in a `{% nav %}` rune now render as prominent top-level links above the grouped navigation, styled with `.rf-nav__top-level`. Explicit markdown links (`[Label](/path)`) in nav items pass through as-is rather than being treated as slugs for web component resolution.
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

- Fix scaffolded sites not loading community packages or applying identity transform. Fix preview rune code toggle broken by data-field/data-name mismatch. Add smarter heading-level detection in sections content model for preamble support. Restore ordered-list-based steps authoring pattern.
  - @refrakt-md/transform@0.8.4
  - @refrakt-md/types@0.8.4

## 0.8.3

### Patch Changes

- ### Block Editor

  - Add draggable popover and clickable prose blocks
  - Redesign prose editor with popover tabs and hover inline editing
  - Group consecutive prose elements into editable prose blocks
  - Fix Content tab cursor reset on Enter/Backspace in prose editor
  - Fix prose sections not rendering in block editor

  ### Editor Compatibility

  - Add editor compatibility to all rune packages: core, marketing, docs, learning, business, places, storytelling, design, and media runes

  ### Lumina Theme Polish

  - Redesign recipe, steps, howto, tabs, preview, pullquote, event, organization, and plot runes
  - Polish playlist, track, audio, and storytelling runes
  - Add scene images and split layouts to storytelling runes (realm, faction)
  - Fix cast rune layout, budget rune currency, dark mode text in preview
  - Add TabPanel engine config entry with BEM class

  ### Other

  - Sync language server and VS Code extension with current runes
  - Polish datatable rune and unify table wrapper class
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

- Add @refrakt-md/html pure HTML renderer, content-model-driven Structure tab in editor, inline editing popovers, accessible tab structure for tabs/codegroup, feature rune redesign with granular field editing, and editor hover tooltips with edit hint controls.
  - @refrakt-md/transform@0.8.1
  - @refrakt-md/types@0.8.1

## 0.8.0

### Patch Changes

- Updated dependencies
  - @refrakt-md/types@0.8.0
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
  - @refrakt-md/transform@0.7.2

## 0.7.1

### Patch Changes

- @refrakt-md/transform@0.7.1
- @refrakt-md/types@0.7.1

## 0.7.0

### Minor Changes

- Introduce 8 official @refrakt-md/\* rune packages: marketing, docs, storytelling, places, business, design, learning, and media. 33 runes migrated from core @refrakt-md/runes into domain-specific installable packages. Rune schema interfaces moved from @refrakt-md/types to owning packages. Added package tooling (validate command, fixture discovery, AI prompt extensions). Site docs reorganized to reflect official rune packages.

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
  - @refrakt-md/types@0.6.0

## 0.5.1

### Patch Changes

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

## 0.4.0

### Minor Changes

- ### New packages

  - `@refrakt-md/highlight` — Shiki-based syntax highlighting with Markdoc grammar support, CSS variables integration, and copy-to-clipboard
  - `@refrakt-md/transform` — Identity transform engine extracted into its own package (BEM classes, structural injection, meta consumption)

  ### New runes

  - `form` — Form component with field validation
  - `comparison` — Comparison matrices and tables
  - `storyboard` — Story visualization
  - `reveal` — Progressive disclosure
  - `conversation` — Chat-style content
  - `bento` — Grid layout component
  - `annotate` — Annotated content

  ### Theme restructuring

  - Merged `@refrakt-md/theme-lumina` into `@refrakt-md/lumina/svelte` as a subpath export
  - SvelteKit plugin now derives theme adapter dynamically from `config.theme` + `config.target`
  - Theme packages now serve framework adapters via subpath exports — no separate packages per framework

  ### CodeGroup redesign

  - Replaced Editor rune with dedicated CodeGroup component for multi-file code blocks

  ### SEO extractors

  - Added Recipe, HowTo, Event, Person, Organization, and Dataset schema.org extractors

  ### Other improvements

  - Unified actions pattern across Hero and CTA runes
  - Blog layout added to Lumina theme
  - Copy-to-clipboard for code blocks
  - Test coverage expanded from ~299 to 370 tests

### Patch Changes

- @refrakt-md/types@0.4.0

## 0.3.0

### Minor Changes

- 4588cf7: New runes and bug fixes

  SEO-Rich Content:

  recipe — Ingredients, steps, chef's tips with prep/cook time metadata
  howto — Step-by-step instructions with tools/materials list
  event — Event info with date, location, registration URL
  cast (alias: team) — People directory with name/role parsing
  organization (alias: business) — Structured business information

  Data Visualization & Developer Tools:

  datatable (alias: data-table) — Interactive table with sortable/searchable attributes
  api (alias: endpoint) — API endpoint documentation with method badges
  diff — Side-by-side or unified diff between two code blocks
  0chart — Bar/line/pie/area charts from Markdown tables
  diagram — Mermaid.js diagram rendering

  Other:
  sidenote (aliases: footnote, marginnote) — Margin notes, footnotes, and tooltips

### Patch Changes

- Updated dependencies [4588cf7]
  - @refrakt-md/types@0.3.0

## 0.2.0

### Minor Changes

- c0b3cb5: Added SEO layer

### Patch Changes

- @refrakt-md/types@0.2.0

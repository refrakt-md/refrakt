# @refrakt-md/types

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

- 7537459: v0.11.0 config follow-ups (WORK-176):

  - **Schema URL versioning.** The JSON Schema is now published at a versioned URL (`https://refrakt.md/schemas/v0.11/refrakt.config.schema.json`) with the unversioned URL kept as a "latest" alias. `create-refrakt` scaffolds derive the versioned URL from the package version at scaffold time so old projects don't get false validation errors when later releases add fields. Versioning policy documented in `site/content/docs/configuration/schema.md`.
  - **Optional mirrored fields.** `RefraktConfig.contentDir`, `theme`, and `target` are now typed as optional (`?:`) — they were strictly required strings before, which papered over the multi-site case where they're undefined. Adapter code that read these directly (`refrakt theme install`/`info`, `refrakt edit`, the Astro/HTML/SvelteKit scaffold templates) now goes through `resolveSite(config).site.contentDir` and friends.
  - **Flat-shape deprecation.** Loading a flat-shape `refrakt.config.json` (top-level `contentDir`/`theme`/`target` without a `site` wrapper) now emits a one-time deprecation warning per process. `refrakt config migrate` mentions the v1.0 removal target in its output. Docs (`overview.md`, `migration.md`, `sites.md`, `plugins.md`) replace flat-shape examples with the nested form and add `v0.12 → v1.0` deprecation callouts.
  - **`target` field downgraded to documentation-only.** No adapter actually validates or consumes `site.target`, so `SiteConfig.target` is now optional and the SvelteKit validator no longer requires it on flat-shape configs. The schema marks `target` `deprecated: true` with a note that it's slated for removal in v1.0.

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

### Patch Changes

- 8cf7caf: Fix plan tools failing with `ENOENT: ... 'plan'` when the MCP server is launched from outside the project directory (e.g. via `scripts/start-mcp.sh`, which `cd`s to `/tmp` before exec).

  The MCP server already accepted `--cwd` and forwarded it to its core tools, but plugin-contributed tools dropped it: `buildPluginTool` called `command.mcpHandler(input)` without the cwd context, so `@refrakt-md/plan`'s handlers fell back to `process.cwd()` when resolving `refrakt.config.json` and the default `'plan'` directory.

  Changes:

  - `@refrakt-md/types`: `CliPluginCommand.mcpHandler` now takes an optional second `ctx?: McpHandlerContext` argument carrying the server's resolved cwd. New `McpHandlerContext` type is re-exported from the package entry. The change is non-breaking — existing handlers that ignore the second argument keep compiling.
  - `@refrakt-md/mcp`: `buildPluginTool` forwards the server's `ctx` to the plugin's `mcpHandler`. The argv-shimming fallback path is unchanged (it still uses `process.cwd()`); plugins that need project-cwd awareness should provide an explicit `mcpHandler`.
  - `@refrakt-md/plan`: every `*McpHandler` accepts the new `ctx`, threads it into `resolvePlanDir`, and absolutizes the resolved `dir` against `ctx.cwd` so relative paths from any source (flag, env, config, default) consistently resolve against the project root.

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

### Patch Changes

- Bug Fixes:

  - Fix ThemeShell build failure ({@const} inside {#if} block)
  - Fix lumina tsconfig to flatten dist output, restoring editor icons
  - Fix tab partition and post-processing for split header/preamble slots
  - Fix breadcrumb separator and preview rendering
  - Fix codegroup title invisible due to generic section color override
  - Fix embed rune inheriting browser default figure margin
  - Fix visual block preview ignoring theme background color
  - Fix sandbox dark mode on mobile browsers
  - Fix missing functionality in Nuxt, Next.js, and Eleventy adapters
  - Fix SEO meta tags not rendering
  - Fix gallery responsive behavior
  - Fix duplicate docs nav entry (themes/configuration renamed to config-api)
  - Fix CI crash on undefined xref id and missing scopedRefs

  Features:

  - Add configurable defaultImage fallback for og:image meta tag
  - Add WebSite/Organization JSON-LD for SEO
  - Add baseUrl and siteName config fields
  - Add filesystem-agnostic plan scanner API (parseFileContent, scanPlanSources)
  - Add preamble slot with title and blurb extraction for plan entities
  - Split plan entity header into primary and secondary badge groups
  - Implement tab layout for plan entity pages
  - Implement git-native entity history (plan-history rune)
  - Implement mobile section nav and desktop TOC filtering
  - Implement plan package hardening (knownSections, validation, cross-references)
  - Add source attribute to work/bug/decision runes for spec traceability
  - Simplify codegroup chrome: skip tabs for single fence without labels
  - Move event register button from header to bottom of component

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

## 0.9.3

### Patch Changes

- Bug fixes, rune restyling, and new features since v0.9.2.

  ### New Features

  - Add `createRefraktLoader` and `virtual:refrakt/content` to eliminate content loading boilerplate
  - Add `--css` flag to plan build/serve for custom style overrides

  ### Bug Fixes

  - Fix content HMR with dev-mode cache bypass (`createSiteLoader`)
  - Fix create-refrakt: interactive mode, CSS imports, community package loading
  - Fix density CSS leaking into nested runes with different density
  - Fix empty aggregation rune showcases on site
  - Fix missing bottom margin on code fences in prose
  - Fix preview source panel horizontal scroll on mobile
  - Fix hint header margin and vertical spacing
  - Fix testimonial star rating and author name/role styling
  - Fix details and diff rune styling issues
  - Fix blockquote quote mark overlap
  - Fix chart rune default figure margin
  - Fix diff split mode on mobile with horizontal scroll
  - Fix codegroup title font size and tab readability
  - Fix compact density title size
  - Fix build order and implicit any types in nuxt module
  - Add missing exports fields for NodeNext module resolution

  ### Styling

  - Restyle API, bond, budget, details, event runes with metadata dimension system
  - Unify design rune styling with consistent titles and surfaces
  - Update Lumina default palette: cerulean, frosted blue, warm parchment
  - Thin table header border, cleaner table look with better mobile column sizing
  - Use logo apricot for syntax keywords

  ### Documentation

  - Document Svelte component override props and snippet pattern
  - Update Astro adapter docs for component override support
  - Audit and fix site documentation gaps
  - Redesign milestone progress indicator as two-row layout

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

### Minor Changes

- Metadata dimensions system: density, section anatomy, media slots, checklist, sequential items, and interactive state dimensions added to rune configs and identity transform engine
- Universal dimension CSS in Lumina theme with generic metadata styling
- Shared split layout CSS with two-mode mobile collapse for marketing and storytelling runes
- Rune output standardization: recipe, howto, playlist, character, realm, and faction runes refactored to consistent 3-section structure
- @refrakt-md/plan community rune package for project planning with spec, work, bug, decision, and milestone runes
- Markdoc partials support with LSP and VS Code integration
- xref rune for inline cross-referencing via entity registry
- Sandbox directory source support for multi-file sandboxes
- labelHidden option to hide self-explanatory metadata labels
- Rename intro header to preamble to disambiguate from chrome header
- Lumina design refresh: soft gray page background, borderless surfaces, bordered pill badges, transparent banners
- `--audit-dimensions` and `--audit-meta` flags for refrakt inspect CLI

### Patch Changes

- Fix tint-mode CSS stripped in production builds
- Fix preview rune light mode toggle when OS is in dark mode
- Fix sandbox ignoring tint-mode by reading data-color-scheme attribute
- Fix overflow:hidden on media zones clipping preview bleed
- Fix Feature config: sections/mediaSlots key should be 'media' not 'image'
- Fix docs layout 3-track grid leaking into rune articles
- Fix media/scene positioning in storytelling runes
- Fix missing dimensions CSS in production build
- Fix storytelling pipeline TypeScript narrowing errors
- Fix theme CSS resolution to load full theme instead of tokens only
- Many Lumina CSS refinements: recipe cover ratio, CTA alignment, hero centering, testimonial borders, blog post hover shadows

## 0.8.5

### Patch Changes

- Add blog rune for listing posts with filtering and sorting. Expose frontmatter and page data as content-level Markdoc variables. Redesign juxtapose rune with --- delimiter and overlay labels. Auto-discover runes in VS Code extension and editor. Fix map rune collapsed border and add spacing support. Fix juxtapose tint mode.

## 0.8.4

## 0.8.3

## 0.8.2

### Patch Changes

- Bug fixes and editor improvements including CodeMirror code editing, mobile search fix, structure tab enhancements, and block editor UI refinements.

## 0.8.1

## 0.8.0

### Minor Changes

- ### Features

  - Declarative content model: migrated 50+ runes from imperative Model classes to `createContentModelSchema`
  - Cross-page pipeline: EntityRegistry, breadcrumb auto-resolution, aggregated data
  - New media runes: `playlist`, `track`, `audio` with full schema.org RDFa annotations
  - Section header BEM classes with pill-badge eyebrow styling
  - Automatic RunePackage version sync on release

  ### Fixes

  - Production CSS tree-shaking: kebab→PascalCase key mismatch
  - Audio player: idempotency guard, playlist interaction, autoplay race condition
  - Editor serializing numerical attributes as strings
  - Metadata hiding in rune CSS breaking nested runes
  - Showcase centering and place attribute in split layout
  - Type safety: replace string booleans with proper boolean types

  ### Breaking

  - `style` attribute renamed to `variant` across all runes
  - `typeof`/`property` renamed to `data-rune`/`data-field` across the pipeline

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

## 0.4.0

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

## 0.2.0

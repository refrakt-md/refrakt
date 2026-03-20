---
title: Changelog
description: Release history for refrakt.md
---

# Changelog

{% changelog %}
## v0.8.5 - March 20, 2026

- Add blog rune for listing posts with filtering and sorting
- Expose frontmatter and page data as content-level Markdoc variables
- Redesign juxtapose rune with `---` delimiter and overlay labels
- Auto-discover runes in VS Code extension and editor
- Fix map rune collapsed border and add spacing support
- Fix juxtapose tint mode

## v0.8.4 - March 19, 2026

- Fix scaffolded sites not loading community packages or applying identity transform. Fix preview rune code toggle broken by data-field/data-name mismatch. Add smarter heading-level detection in sections content model for preamble support. Restore ordered-list-based steps authoring pattern.

## v0.8.3 - March 19, 2026

- Add draggable popover and clickable prose blocks
- Redesign prose editor with popover tabs and hover inline editing
- Group consecutive prose elements into editable prose blocks
- Fix Content tab cursor reset on Enter/Backspace in prose editor
- Fix prose sections not rendering in block editor
- Add editor compatibility to all rune packages: core, marketing, docs, learning, business, places, storytelling, design, and media runes
- Redesign recipe, steps, howto, tabs, preview, pullquote, event, organization, and plot runes
- Polish playlist, track, audio, and storytelling runes
- Add scene images and split layouts to storytelling runes (realm, faction)
- Fix cast rune layout, budget rune currency, dark mode text in preview
- Add TabPanel engine config entry with BEM class
- Sync language server and VS Code extension with current runes
- Polish datatable rune and unify table wrapper class

## v0.8.2 - March 17, 2026

- Bug fixes and editor improvements including CodeMirror code editing, mobile search fix, structure tab enhancements, and block editor UI refinements.

## v0.8.1 - March 16, 2026

- Add @refrakt-md/html pure HTML renderer, content-model-driven Structure tab in editor, inline editing popovers, accessible tab structure for tabs/codegroup, feature rune redesign with granular field editing, and editor hover tooltips with edit hint controls.

## v0.8.0 - March 10, 2026

- Declarative content model: migrated 50+ runes from imperative Model classes to `createContentModelSchema`
- Cross-page pipeline: EntityRegistry, breadcrumb auto-resolution, aggregated data
- New media runes: `playlist`, `track`, `audio` with full schema.org RDFa annotations
- Section header BEM classes with pill-badge eyebrow styling
- Automatic RunePackage version sync on release
- Production CSS tree-shaking: kebab→PascalCase key mismatch
- Audio player: idempotency guard, playlist interaction, autoplay race condition
- Editor serializing numerical attributes as strings
- Metadata hiding in rune CSS breaking nested runes
- Showcase centering and place attribute in split layout
- Type safety: replace string booleans with proper boolean types
- `style` attribute renamed to `variant` across all runes
- `typeof`/`property` renamed to `data-rune`/`data-field` across the pipeline

## v0.7.2 - March 4, 2026

- Add cross-page pipeline infrastructure with `EntityRegistry`, `runPipeline()`, and `PackagePipelineHooks`. Includes nav auto mode, pipeline build output, design token context propagation, and editor preview/autocomplete support for community runes.
- Fix duplicate BEM classes on runes nested inside `data-name` elements. Make `autoLabel` recursive in the identity transform engine so eyebrow, headline, and blurb children inside `<header>` wrappers receive BEM classes. Add `pageSectionAutoLabel` to all marketing and core page-section runes.
- Add pill-badge eyebrow variant: an eyebrow paragraph containing a link renders as a rounded pill with a border, muted prose text, and primary-colored link. The entire pill is clickable via a CSS `::before` overlay.
- Add `mockup` rune to `@refrakt-md/design` for wrapping content in device frames.
- Fix multiple preview runtime issues: `structuredClone` errors, `DataCloneError` when sending `routeRules` via `postMessage`, and cache not invalidating on source changes. Remove `ComponentType` and `PropertyNodes` from the schema system.

## v0.7.1 - March 3, 2026

- Fix production builds excluding CSS for runes from @refrakt-md/\* rune packages. The CSS tree-shaker now uses the assembled config (core + package runes) instead of only the core theme config when determining which rune CSS files to include.

## v0.7.0 - March 3, 2026

- Introduce 8 official @refrakt-md/\* rune packages: marketing, docs, storytelling, places, business, design, learning, and media. 33 runes migrated from core @refrakt-md/runes into domain-specific installable packages. Rune schema interfaces moved from @refrakt-md/types to owning packages. Added package tooling (validate command, fixture discovery, AI prompt extensions). Site docs reorganized to reflect official rune packages.

## v0.6.0 - March 2, 2026

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
- Migrated Diagram, Sandbox, Map, and Comparison runes from Svelte components to framework-neutral web components
- Added postTransform hooks to identity transform engine for component-free interactive runes
- Python symbol extraction pipeline (`refrakt extract`)
- Theme distribution: complete export package with CLI install command
- Icon rune system with Lucide icon set and per-project custom icons via refrakt.config.json
- AI-powered theme generation with design expression prompts
- Per-rune CSS override editor with CodeMirror
- Undo/redo history with keyboard shortcuts
- Fixture picker with configurable rune previews and coverage indicator
- Visual design token editors
- Export panel with CSS preview, copy, and ZIP download
- localStorage persistence
- Layout transform engine for computed content in layouts
- Semantic rune usage throughout documentation
- Dedicated CLI documentation section

## v0.5.1

- Fix scaffolded dependency versions to derive from package version at runtime instead of hardcoding. Previously, the template hardcoded `^0.4.0` which with 0.x semver resolved to `<0.5.0`, causing newly scaffolded sites to install incompatible older packages. Also fixes invalid rune attribute usage in the kitchen sink template.

## v0.5.0 - February 23, 2026

- **`refrakt scaffold --theme`** generates a complete custom theme with layout, CSS tokens, manifest, test infrastructure, and kitchen sink content
- **`refrakt inspect`** command for theme developers — rune coverage audit, CSS audit, structure contracts
- **`refrakt inspect --contracts`** generates HTML structure contracts (`structures.json`) for all 74 runes
- Theme scaffold produces full `SvelteTheme` runtime integration (manifest, layouts, components, elements)
- CSS entry points: `base.css` (tokens-only), `svelte/tokens.css` (dev bridge), `styles/runes/*.css` (tree-shakable)
- **`@refrakt-md/behaviors`** — vanilla JS progressive enhancement via `data-rune` attributes
- Tabs, accordion/reveal, datatable, form, copy-to-clipboard, and preview behaviors
- Framework-agnostic: works with any renderer, no Svelte dependency
- **`@refrakt-md/theme-base`** — extracted universal rune config, interactive components, and structural CSS
- 74 rune configurations in identity transform engine
- Enables multi-theme support with shared component registry
- Moved 8+ Svelte components to pure CSS/identity transform + behaviors
- `styles`, `staticModifiers`, `postTransform` engine capabilities
- Context-aware BEM modifiers
- Design runes (palette, typography, spacing) moved to identity layer
- Blockquote as CSS-only implementation
- Migrated all components to `--rf-*` prefixed tokens (removed `aliases.css`)
- **`symbol`** — code construct documentation (functions, classes, interfaces)
- **`preview`** — component showcase with theme toggle, code/preview tabs, responsive viewports
- **`sandbox`** — live HTML playground with iframe isolation
- **`map`** — interactive location visualizations
- **`design-context`** — token extraction and sandbox injection
- Standalone design runes: swatch, palette, typography, spacing
- Three-tab source panel (Markdoc, Rune, HTML)
- Auto-inferred source mode
- Responsive bleed with container queries
- Theme toggle with dark mode support
- Language server with completion, hover, and diagnostics
- Rune Inspector tree view
- Sandbox and preview snippets
- Bundled for distribution
- Build-time CSS tree-shaking via content analysis
- Configurable Shiki syntax highlight themes
- Form field HTML generation moved into rune schemas
- Multi-file generation in `refrakt write`
- Gemini Flash provider as free cloud AI option
- Improved CLI feedback and scaffolding versions
- Mobile navigation for Lumina theme (hamburger toggle, scroll lock, breadcrumbs)
- Blog layout with post listing and index page
- Layout CSS extracted from Svelte components into standalone files
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

## v0.4.0 - February 16, 2026

- `@refrakt-md/highlight` — Shiki-based syntax highlighting with Markdoc grammar support, CSS variables integration, and copy-to-clipboard
- `@refrakt-md/transform` — Identity transform engine extracted into its own package (BEM classes, structural injection, meta consumption)
- `form` — Form component with field validation
- `comparison` — Comparison matrices and tables
- `storyboard` — Story visualization
- `reveal` — Progressive disclosure
- `conversation` — Chat-style content
- `bento` — Grid layout component
- `annotate` — Annotated content
- Merged `@refrakt-md/theme-lumina` into `@refrakt-md/lumina/svelte` as a subpath export
- SvelteKit plugin now derives theme adapter dynamically from `config.theme` + `config.target`
- Theme packages now serve framework adapters via subpath exports — no separate packages per framework
- Replaced Editor rune with dedicated CodeGroup component for multi-file code blocks
- Added Recipe, HowTo, Event, Person, Organization, and Dataset schema.org extractors
- Unified actions pattern across Hero and CTA runes
- Blog layout added to Lumina theme
- Copy-to-clipboard for code blocks
- Test coverage expanded from ~299 to 370 tests

## v0.3.0 - February 13, 2026

- New runes and bug fixes
- recipe — Ingredients, steps, chef's tips with prep/cook time metadata howto — Step-by-step instructions with tools/materials list event — Event info with date, location, registration URL cast (alias: team) — People directory with name/role parsing organization (alias: business) — Structured business information
- datatable (alias: data-table) — Interactive table with sortable/searchable attributes api (alias: endpoint) — API endpoint documentation with method badges diff — Side-by-side or unified diff between two code blocks 0chart — Bar/line/pie/area charts from Markdown tables diagram — Mermaid.js diagram rendering
- Other: sidenote (aliases: footnote, marginnote) — Margin notes, footnotes, and tooltips

## v0.2.0 - February 12, 2026

- Added SEO layer
{% /changelog %}

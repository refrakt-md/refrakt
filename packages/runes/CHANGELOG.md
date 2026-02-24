# @refrakt-md/runes

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

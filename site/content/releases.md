---
title: Changelog
description: Release history for refrakt.md
---

# Changelog

{% changelog %}
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

## v0.2.0 - February 12, 2026

- Added SEO layer
{% /changelog %}

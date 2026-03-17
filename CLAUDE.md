# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Test

```bash
# Build all packages (dependency order matters)
npm run build

# Build specific packages (always build types first if changed)
npm run build -w packages/types -w packages/runes -w packages/lumina

# Run all tests
npm test

# Watch mode
npm run test:watch

# Run a single test file
npx vitest run packages/runes/test/diff.test.ts

# Run site dev server
cd site && npm run dev
```

Build order: types → create-refrakt + transform + behaviors → runes → lumina + highlight + sveltekit → content + ai → editor → cli. Getting this wrong causes missing type errors.

### CSS Coverage Tests

```bash
# Run CSS coverage tests for Lumina
npx vitest run packages/lumina/test/css-coverage.test.ts
```

These tests derive expected BEM selectors from `baseConfig` and verify they exist in the CSS files. Run after modifying rune configs or CSS. Known gaps are documented in `UNSTYLED_BLOCKS` and `KNOWN_MISSING_SELECTORS` in the test file — update those sets when adding or removing CSS.

### Inspect Tool

```bash
# See the identity transform output for a rune
refrakt inspect hint --type=warning

# Expand all variants of an attribute
refrakt inspect hint --type=all

# Set multiple attributes
refrakt inspect api --method=POST --path="/users"

# JSON output for programmatic use
refrakt inspect hint --json

# List all available runes
refrakt inspect --list

# CSS coverage audit for a single rune
refrakt inspect hint --audit

# Full-theme CSS audit
refrakt inspect --all --audit

# Audit with explicit CSS directory
refrakt inspect hint --audit --css packages/lumina/styles/runes
```

Use `refrakt inspect` to see exactly what HTML the identity transform produces for any rune — BEM classes, data attributes, structural elements, and consumed meta tags. The `--audit` flag checks which generated selectors have CSS coverage.

### Contracts

```bash
# Generate structure contracts (all BEM selectors, data attrs, element structure)
refrakt contracts -o contracts/structures.json

# Validate existing contracts file is up to date (for CI)
refrakt contracts --check -o contracts/structures.json
```

Structure contracts describe the complete HTML structure the identity transform produces for every rune — derived purely from config. Use `--check` in CI to catch config-contract drift.

## Architecture

### Transformation Pipeline

```
Markdown → Markdoc.parse() → AST → Markdoc.transform(ast, {tags, nodes}) → Renderable
    → serialize() → Identity Transform → Svelte Renderer → HTML
```

Five per-page stages from content to output:
1. **Parse**: Markdoc turns `.md` files into AST nodes
2. **Schema Transform**: Rune models (`packages/runes/src/tags/*.ts` + community packages) interpret children, emit `typeof` markers and meta tags
3. **Serialize**: Markdoc Tag class instances → plain `{$$mdtype:'Tag'}` objects (required for SvelteKit server→client boundary)
4. **Identity Transform**: Engine (`packages/transform/src/engine.ts`) reads meta tags, adds BEM classes, injects structural elements, strips consumed metadata
5. **Render**: Svelte Renderer dispatches on `typeof` attribute — registered component or generic HTML element

### Cross-Page Pipeline

After all pages are parsed, three additional build-time phases run (`packages/content/src/pipeline.ts`):
- **Phase 2 — Register**: Each package's `register()` hook scans all `TransformedPage`s and indexes named entities into the site-wide `EntityRegistry` (`packages/content/src/registry.ts`)
- **Phase 3 — Aggregate**: Each package's `aggregate()` hook builds cross-page indexes from the full registry. Core produces `pageTree`, `breadcrumbPaths`, `pagesByUrl`, `headingIndex`
- **Phase 4 — Post-process**: Each page passes through all packages' `postProcess()` hooks to resolve deferred sentinels (e.g., `breadcrumb auto`) using aggregated data

Packages opt in via `PackagePipelineHooks` on their `RunePackage`. Core hooks (`corePipelineHooks` from `@refrakt-md/runes`) always run first.

### Rune System

Runes are Markdoc tags that **reinterpret** standard Markdown. A heading inside `{% nav %}` becomes a group title; a list inside `{% recipe %}` becomes ingredients. Same primitives, different meaning based on context.

**Core runes** (~26 author-facing) live in `packages/runes/src/tags/`. Each has: a schema file, a type definition (`packages/types/src/schema/`), an engine config entry (`packages/runes/src/config.ts`), and optionally a Svelte component override registered via `@refrakt-md/svelte`.

**Community package runes** (~65 more across 8 packages) live in `runes/{marketing,docs,design,learning,storytelling,business,places,media}/`. Each package exports a `RunePackage` object (defined in `packages/types/src/package.ts`) containing rune schemas, theme config, and optional pipeline hooks. Users configure packages in `refrakt.config.json` → `packages[]`. The `loadRunePackage()` and `mergePackages()` utilities in `packages/runes/src/packages.ts` handle loading and name-collision resolution.

### Two-Layer Theme System

**Layer 1 — Identity Transform** (framework-agnostic): The engine in `packages/transform/src/engine.ts` walks the serialized tree and applies BEM classes, reads modifiers from meta tags, injects structural elements (headers, icons, badges), and wraps content. Configured declaratively in `packages/runes/src/config.ts`. Most runes (~75%) need only this layer.

**Layer 2 — Svelte Components** (`packages/svelte/src/elements/`): Element overrides for HTML elements (Table, Pre) plus a component registry for custom rune renderers. Registered in `packages/svelte/src/registry.ts`. The Renderer looks up `typeof` → component in the registry. Behavior-driven runes (Tabs, Accordion, DataTable, Form) use Layer 1 + `@refrakt-md/behaviors` for progressive enhancement instead.

### Package Relationships

- `types` — foundational, no deps on other packages; includes `RunePackage`, `PackagePipelineHooks`, `EntityRegistry` and related pipeline types
- `transform` — depends on types; identity transform engine + config interfaces + merge utilities + layout configs
- `runes` — depends on types + transform; ~37 core rune schemas + SEO extraction + `coreConfig`/`baseConfig` + `corePipelineHooks` + `loadRunePackage`/`mergePackages` utilities
- `lumina` — depends on runes + transform; design tokens, CSS, icon overrides
- `behaviors` — no deps; progressive enhancement JS for interactive runes
- `content` — depends on runes + types; content loading, routing, layout cascade + `runPipeline()` orchestrator + `EntityRegistryImpl`
- `svelte` — depends on types + behaviors; Renderer + ThemeShell + element overrides + component registry
- `sveltekit` — depends on types; Vite plugin with virtual modules + content HMR; loads packages from config, passes to `loadContent()`
- `ai` + `cli` — content generation + inspect tooling
- `runes/{marketing,docs,design,learning,storytelling,business,places,media}/` — 8 official community packages implementing `RunePackage`

## Conventions

### BEM Naming

All identity-transformed runes use: `.rf-{block}`, `.rf-{block}--{modifier}`, `.rf-{block}__{element}`. Element classes come from `data-name` attributes on children — the engine's `applyBemClasses` function reads `data-name` and adds the corresponding BEM class.

### Variant Styling

Use `[data-*]` attribute selectors for variant styling, not BEM modifier classes on children. Examples: `[data-method="GET"]`, `[data-difficulty="easy"]`, `[data-type="add"]`. The engine sets data attributes from modifier values automatically.

### Rune Schema Patterns

- `createContentModelSchema({ contentModel, transform })` — declarative alternative to Model class for new runes; define a `contentModel` (sequence/delimited/sections/custom), receive resolved fields in `transform(resolved, attrs, config)`
- `createComponentRenderable(schema.TypeName, { tag, properties, children })` — wraps output with `typeof` marker
- `properties` values are meta Tags — `createComponentRenderable` sets `property` attribute on them
- `refs` values are Tags that get `data-name` attribute set on them
- Rune schemas should produce structurally complete renderables, not raw data blobs that components re-parse

### Rune Authoring Guide

Comprehensive rune authoring documentation lives at `site/content/docs/authoring/` (6 pages: overview, model-api, content-models, output-contract, patterns, page-sections). Refer to these when writing or modifying runes — they cover the Model lifecycle, decorators (`@attribute`, `@group`, `@id`), declarative content models (`createContentModelSchema`, sequence/delimited/sections/custom patterns), the output contract (`createComponentRenderable`, properties vs refs, meta tags, editHints), and canonical patterns (headingLevel auto-detect, header+body group split, child item runes, modifier naming, content boundaries).

New runes almost always belong in a community package under `runes/`, not in `packages/runes/src/tags/`. Community package authoring docs: `site/content/docs/packages/authoring.md`.

### Engine Config Pattern

Non-interactive runes are configured declaratively in `packages/runes/src/config.ts`:
- `block`: BEM block name
- `modifiers`: `{ name: { source: 'meta', default?: string } }` — reads meta tag, adds modifier class + data attribute
- `contextModifiers`: `{ 'ParentType': 'suffix' }` — adds BEM modifier when nested inside a parent rune
- `staticModifiers`: `['name']` — always-applied BEM modifier classes
- `structure`: injects structural elements (headers, icons, meta displays) via `StructureEntry`
- `contentWrapper`: wraps content children in a container element
- `autoLabel`: maps child tag names to `data-name` values
- `styles`: maps modifier values to CSS custom properties or inline style declarations
- `postTransform`: programmatic escape hatch (prefer declarative config)
- `editHints`: `{ dataName: 'inline' | 'link' | 'code' | 'image' | 'none' }` — declares how named sections are edited in the block editor

Full interface definitions: `packages/transform/src/types.ts` (`ThemeConfig`, `RuneConfig`, `StructureEntry`).

### Theme Development

Theme developer documentation lives at `site/content/docs/themes/` (6 pages: overview, configuration, css, creating-a-theme, components, tooling). Refer to these when working on themes.

**Key files for theme work:**
- `packages/runes/src/config.ts` — core rune configs (exported as `coreConfig`/`baseConfig`) + `corePipelineHooks`
- `packages/runes/src/packages.ts` — `loadRunePackage()`, `mergePackages()` — community package loading and collision resolution
- `packages/transform/src/merge.ts` — `mergeThemeConfig()` for extending base with theme overrides
- `packages/transform/src/engine.ts` — identity transform implementation
- `packages/transform/src/types.ts` — `ThemeConfig`, `RuneConfig`, `StructureEntry` interfaces
- `packages/transform/src/layouts.ts` — layout configs (`defaultLayout`, `docsLayout`, `blogArticleLayout`)
- `packages/content/src/pipeline.ts` — `runPipeline()` cross-page pipeline orchestrator
- `packages/content/src/registry.ts` — `EntityRegistryImpl` (site-wide entity index)
- `packages/lumina/styles/runes/` — per-rune CSS files (reference implementation)
- `packages/lumina/tokens/base.css` — design token definitions
- `packages/svelte/src/registry.ts` — component registry for interactive runes

**When writing CSS for a rune:**
1. Check the rune's config in `packages/runes/src/config.ts` to understand what selectors the engine produces
2. Use `refrakt inspect <rune>` to see the actual HTML output with BEM classes and data attributes
3. Style the block (`.rf-{block}`), element (`.rf-{block}__{name}`), and modifier (`.rf-{block}--{value}`) selectors
4. Use `[data-*]` attribute selectors for variant styling on children, not BEM modifiers
5. Reference design tokens (`var(--rf-color-*)`, `var(--rf-radius-*)`, etc.) — never hard-code values
6. Run `npx vitest run packages/lumina/test/css-coverage.test.ts` to verify coverage

**When adding a new rune config (core rune):**
1. Add the `RuneConfig` entry to `packages/runes/src/config.ts`
2. Write CSS in `packages/lumina/styles/runes/{block}.css`
3. Import the CSS file in `packages/lumina/index.css`
4. Run CSS coverage tests to verify all selectors are styled

**When adding a rune to a community package:**
- The `theme.runes` field of the `RunePackage` carries the `RuneConfig` for that package's runes
- CSS lives inside the package under `runes/{package}/styles/`
- See `site/content/docs/packages/authoring.md` for full guide

### Content Authoring

Site content lives in `site/content/` as `.md` files with YAML frontmatter. Layouts use `_layout.md` files with `{% layout %}` + `{% region %}` tags that cascade down directory trees.

## Release Process

See [RELEASING.md](RELEASING.md) for the full process. Key commands:

```bash
npx changeset            # Create a changeset for your changes
npm run version-packages # Bump versions + generate changelog
npm run release          # Build + publish (usually handled by CI)
```

All `@refrakt-md/*` packages and `create-refrakt` are versioned together (Changesets fixed mode). The `create-refrakt` scaffold template derives dependency versions from its own `package.json` at runtime, so they stay in sync automatically.

## Monorepo Structure

```
packages/types/       — Shared TypeScript interfaces (including RunePackage, pipeline types)
packages/runes/       — ~37 core rune schemas + SEO extraction + coreConfig + corePipelineHooks + package loading utilities
packages/transform/   — Identity transform engine + types + merge utilities + layout configs
packages/lumina/      — Lumina theme (tokens, CSS, icon overrides)
packages/behaviors/   — Progressive enhancement JS (tabs, accordion, datatable, form)
packages/content/     — Content loading, routing, layout cascade + runPipeline() + EntityRegistryImpl
packages/svelte/      — Renderer.svelte + ThemeShell + element overrides + component registry
packages/sveltekit/   — Vite plugin + virtual modules + HMR; loads community packages from config
packages/ai/          — AI prompt building + providers
packages/cli/         — refrakt CLI (write + inspect + contracts)
packages/create-refrakt/ — Project scaffolding
runes/marketing/      — @refrakt-md/marketing (hero, cta, bento, feature, steps, pricing, testimonial, comparison, storyboard)
runes/docs/           — @refrakt-md/docs (api, symbol, changelog)
runes/design/         — @refrakt-md/design (swatch, palette, typography, spacing, preview, mockup, design-context)
runes/learning/       — @refrakt-md/learning (howto, recipe)
runes/storytelling/   — @refrakt-md/storytelling (character, realm, faction, lore, plot, bond, storyboard)
runes/business/       — @refrakt-md/business (cast, organization, timeline)
runes/places/         — @refrakt-md/places (event, map, itinerary)
runes/media/          — @refrakt-md/media (music-playlist, music-recording)
site/                 — Documentation site (SvelteKit)
```

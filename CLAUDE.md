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

Build order: types → create-refrakt + lumina → runes + sveltekit → content + ai → cli. Getting this wrong causes missing type errors.

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

Five stages from content to output:
1. **Parse**: Markdoc turns `.md` files into AST nodes
2. **Schema Transform**: Rune models (`packages/runes/src/tags/*.ts`) interpret children, emit `typeof` markers and meta tags
3. **Serialize**: Markdoc Tag class instances → plain `{$$mdtype:'Tag'}` objects (required for SvelteKit server→client boundary)
4. **Identity Transform**: Engine (`packages/transform/src/engine.ts`) reads meta tags, adds BEM classes, injects structural elements, strips consumed metadata
5. **Render**: Svelte Renderer dispatches on `typeof` attribute — registered component or generic HTML element

### Rune System

Runes are Markdoc tags that **reinterpret** standard Markdown. A heading inside `{% nav %}` becomes a group title; a list inside `{% recipe %}` becomes ingredients. Same primitives, different meaning based on context.

Each rune has: a schema (`packages/runes/src/tags/`), a type definition (`packages/types/src/schema/`), an engine config entry (`packages/theme-base/src/config.ts`), and optionally a Svelte component (`packages/theme-base/sveltekit/components/`).

### Two-Layer Theme System

**Layer 1 — Identity Transform** (framework-agnostic): The engine in `packages/transform/src/engine.ts` walks the serialized tree and applies BEM classes, reads modifiers from meta tags, injects structural elements (headers, icons, badges), and wraps content. Configured declaratively in `packages/theme-base/src/config.ts`. Most runes (~75%) need only this layer.

**Layer 2 — Svelte Components** (`packages/theme-base/sveltekit/components/`): Only for interactive runes requiring external libraries or complex rendering (Chart, Map, Diagram, Comparison, etc.). Registered in `packages/theme-base/sveltekit/registry.ts`. The Renderer looks up `typeof` → component in the registry. Behavior-driven runes (Tabs, Accordion, DataTable, Form) use Layer 1 + `@refrakt-md/behaviors` for progressive enhancement instead.

### Package Relationships

- `types` — foundational, no deps on other packages
- `transform` — depends on types; identity transform engine + config interfaces
- `runes` — depends on types; defines all 45+ rune schemas
- `theme-base` — depends on transform + types; base config + shared interactive components
- `lumina` — depends on theme-base + transform; design tokens, CSS, icon overrides
- `behaviors` — no deps; progressive enhancement JS for interactive runes
- `content` — depends on runes + types; content loading, routing, layout cascade
- `svelte` — depends on types; Renderer + ThemeShell components
- `sveltekit` — depends on types; Vite plugin with virtual modules + content HMR
- `ai` + `cli` — content generation + inspect tooling

## Conventions

### BEM Naming

All identity-transformed runes use: `.rf-{block}`, `.rf-{block}--{modifier}`, `.rf-{block}__{element}`. Element classes come from `data-name` attributes on children — the engine's `applyBemClasses` function reads `data-name` and adds the corresponding BEM class.

### Variant Styling

Use `[data-*]` attribute selectors for variant styling, not BEM modifier classes on children. Examples: `[data-method="GET"]`, `[data-difficulty="easy"]`, `[data-type="add"]`. The engine sets data attributes from modifier values automatically.

### Rune Schema Patterns

- `createComponentRenderable(schema.TypeName, { tag, properties, children })` — wraps output with `typeof` marker
- `properties` values are meta Tags — `createComponentRenderable` sets `property` attribute on them
- `refs` values are Tags that get `data-name` attribute set on them
- Rune schemas should produce structurally complete renderables, not raw data blobs that components re-parse

### Engine Config Pattern

Non-interactive runes are configured declaratively in `packages/theme-base/src/config.ts`:
- `block`: BEM block name
- `modifiers`: `{ name: { source: 'meta', default?: string } }` — reads meta tag, adds modifier class + data attribute
- `contextModifiers`: `{ 'ParentType': 'suffix' }` — adds BEM modifier when nested inside a parent rune
- `staticModifiers`: `['name']` — always-applied BEM modifier classes
- `structure`: injects structural elements (headers, icons, meta displays) via `StructureEntry`
- `contentWrapper`: wraps content children in a container element
- `autoLabel`: maps child tag names to `data-name` values
- `styles`: maps modifier values to CSS custom properties or inline style declarations
- `postTransform`: programmatic escape hatch (prefer declarative config)

Full interface definitions: `packages/transform/src/types.ts` (`ThemeConfig`, `RuneConfig`, `StructureEntry`).

### Theme Development

Theme developer documentation lives at `site/content/docs/themes/` (6 pages: overview, configuration, css, creating-a-theme, components, tooling). Refer to these when working on themes.

**Key files for theme work:**
- `packages/theme-base/src/config.ts` — base config with all 45+ rune configurations (source of truth)
- `packages/theme-base/src/merge.ts` — `mergeThemeConfig()` for extending base with theme overrides
- `packages/transform/src/engine.ts` — identity transform implementation
- `packages/transform/src/types.ts` — `ThemeConfig`, `RuneConfig`, `StructureEntry` interfaces
- `packages/lumina/styles/runes/` — 48 per-rune CSS files (reference implementation)
- `packages/lumina/tokens/base.css` — design token definitions
- `packages/theme-base/sveltekit/registry.ts` — component registry for interactive runes

**When writing CSS for a rune:**
1. Check the rune's config in `packages/theme-base/src/config.ts` to understand what selectors the engine produces
2. Use `refrakt inspect <rune>` to see the actual HTML output with BEM classes and data attributes
3. Style the block (`.rf-{block}`), element (`.rf-{block}__{name}`), and modifier (`.rf-{block}--{value}`) selectors
4. Use `[data-*]` attribute selectors for variant styling on children, not BEM modifiers
5. Reference design tokens (`var(--rf-color-*)`, `var(--rf-radius-*)`, etc.) — never hard-code values
6. Run `npx vitest run packages/lumina/test/css-coverage.test.ts` to verify coverage

**When adding a new rune config:**
1. Add the `RuneConfig` entry to `packages/theme-base/src/config.ts`
2. Write CSS in `packages/lumina/styles/runes/{block}.css`
3. Import the CSS file in `packages/lumina/index.css`
4. Run CSS coverage tests to verify all selectors are styled

### Content Authoring

Site content lives in `site/content/` as `.md` files with YAML frontmatter. Layouts use `_layout.md` files with `{% layout %}` + `{% region %}` tags that cascade down directory trees.

## Monorepo Structure

```
packages/types/       — Shared TypeScript interfaces
packages/runes/       — 45+ rune schemas + SEO extraction
packages/transform/   — Identity transform engine + types (ThemeConfig, RuneConfig)
packages/theme-base/  — Base theme config (all rune mappings) + shared interactive components
packages/lumina/      — Lumina theme (tokens, CSS, icon overrides)
packages/behaviors/   — Progressive enhancement JS (tabs, accordion, datatable, form)
packages/content/     — Content loading, routing, layout cascade
packages/svelte/      — Renderer.svelte + ThemeShell.svelte
packages/sveltekit/   — Vite plugin + virtual modules + HMR
packages/ai/          — AI prompt building + providers
packages/cli/         — refrakt CLI (write + inspect + contracts)
packages/create-refrakt/ — Project scaffolding
site/                 — Documentation site (SvelteKit)
```

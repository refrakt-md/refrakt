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
4. **Identity Transform**: Engine (`packages/lumina/src/lib/engine.ts`) reads meta tags, adds BEM classes, injects structural elements, strips consumed metadata
5. **Render**: Svelte Renderer dispatches on `typeof` attribute — registered component or generic HTML element

### Rune System

Runes are Markdoc tags that **reinterpret** standard Markdown. A heading inside `{% nav %}` becomes a group title; a list inside `{% recipe %}` becomes ingredients. Same primitives, different meaning based on context.

Each rune has: a schema (`packages/runes/src/tags/`), a type definition (`packages/types/src/schema/`), an engine config entry (`packages/lumina/src/config.ts`), and optionally a Svelte component (`packages/lumina/sveltekit/components/`).

### Two-Layer Theme System

**Layer 1 — Identity Transform** (framework-agnostic): The engine in `packages/lumina/src/lib/engine.ts` walks the serialized tree and applies BEM classes, reads modifiers from meta tags, injects structural elements (headers, icons, badges), and wraps content. Configured declaratively in `packages/lumina/src/config.ts`. Most runes (~75%) need only this layer.

**Layer 2 — Svelte Components** (`packages/lumina/sveltekit/components/`): Only for interactive runes (Tabs, Accordion, DataTable, Form, etc.). Registered in `packages/lumina/sveltekit/registry.ts`. The Renderer looks up `typeof` → component in the registry.

### Package Relationships

- `types` — foundational, no deps on other packages
- `runes` — depends on types; defines all 43+ rune schemas
- `lumina` — depends on types; identity transform engine + config
- `content` — depends on runes + types; content loading, routing, layout cascade
- `svelte` — depends on types; Renderer + ThemeShell components
- `sveltekit` — depends on types; Vite plugin with virtual modules + content HMR
- `ai` + `cli` — content generation tooling

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

Non-interactive runes are configured declaratively in `packages/lumina/src/config.ts`:
- `block`: BEM block name
- `modifiers`: `{ name: { source: 'meta', default?: string } }` — reads meta tag, adds modifier class + data attribute
- `structure`: injects structural elements (headers, icons, meta displays)
- `contentWrapper`: wraps content children in a container element
- `autoLabel`: maps child tag names to `data-name` values

### Content Authoring

Site content lives in `site/content/` as `.md` files with YAML frontmatter. Layouts use `_layout.md` files with `{% layout %}` + `{% region %}` tags that cascade down directory trees.

## Monorepo Structure

```
packages/types/       — Shared TypeScript interfaces
packages/runes/       — 43+ rune schemas + SEO extraction
packages/lumina/      — Identity transform engine + BEM config
packages/content/     — Content loading, routing, layout cascade
packages/svelte/      — Renderer.svelte + ThemeShell.svelte
packages/sveltekit/   — Vite plugin + virtual modules + HMR
packages/ai/          — AI prompt building + providers
packages/cli/         — refrakt write CLI
packages/create-refrakt/ — Project scaffolding
packages/lumina/sveltekit/ — SvelteKit adapter (Svelte components + tokens + manifest)
site/                 — Documentation site (SvelteKit)
```

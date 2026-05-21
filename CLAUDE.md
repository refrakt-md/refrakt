# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## MCP Server

This project ships `@refrakt-md/mcp`, a Model Context Protocol server that wraps the refrakt CLI. It's registered automatically via `.mcp.json` at the repo root, so any Claude Code session opened here gets the server pre-configured.

**Prefer MCP tools over the CLI when both are available.** The MCP surface gives you typed inputs, structured outputs, and addressable resources without parsing CLI text. Common substitutions:

| Instead of shell | Use MCP tool |
|------------------|--------------|
| `npx refrakt plan next` | `mcp__refrakt__plan.next` |
| `npx refrakt plan update <id> --status in-progress` | `mcp__refrakt__plan.update` |
| `npx refrakt plan update <id> --check "..."` | `mcp__refrakt__plan.update` (with `check` arg) |
| `npx refrakt plan status` | `mcp__refrakt__plan.status` |
| `npx refrakt plan validate` | `mcp__refrakt__plan.validate` |
| `npx refrakt plan create ...` | `mcp__refrakt__plan.create` |
| `npx refrakt plan next-id <type>` | `mcp__refrakt__plan.next-id` |
| `npx refrakt inspect <rune>` | `mcp__refrakt__refrakt.inspect` |
| `npx refrakt contracts ...` | `mcp__refrakt__refrakt.contracts` |
| `npx refrakt plugins list` | `mcp__refrakt__refrakt.plugins_list` |

**Read project state via MCP resources** when you need to inspect plan content without invoking a tool:

- `refrakt://detect` — project context (plan dir, sites, plugins).
- `refrakt://plan/index` — list of all plan entities.
- `refrakt://plan/<type>/<id>` — Markdoc source for a single entity (e.g., `refrakt://plan/work/WORK-159`).
- `refrakt://plan/status` — plan health summary.

**Fall back to the CLI** for things MCP intentionally doesn't expose: long-running commands (`refrakt plan serve`, `refrakt plan build`), `refrakt write`, `refrakt edit`. The shell examples below remain canonical for those, and the CLI keeps working when MCP isn't registered (e.g., outside Claude Code).

If MCP appears unavailable in your session, run `mcp__refrakt__refrakt.detect` first to confirm the server is connected and surfaces the expected tools.

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

Build order (see the `build` script in the root `package.json` for the canonical sequence): types + transform + behaviors → runes → 8 plugins (marketing, docs, storytelling, places, business, design, learning, media) → lumina + highlight → content → sveltekit + html + astro + nuxt + next + react + vue → ai → eleventy + plan plugin → create-refrakt + editor → cli → mcp. Getting this wrong causes missing type errors.

### CSS Coverage Tests

```bash
# Run CSS coverage tests for Lumina
npx vitest run packages/lumina/test/css-coverage.test.ts
```

These tests derive expected BEM selectors from `baseConfig` and verify they exist in the CSS files. Run after modifying rune configs or CSS. Known gaps are documented in `UNSTYLED_BLOCKS` and `KNOWN_MISSING_SELECTORS` in the test file — update those sets when adding or removing CSS.

### Inspect Tool

```bash
# See the identity transform output for a rune
npx refrakt inspect hint --type=warning

# Expand all variants of an attribute
npx refrakt inspect hint --type=all

# Set multiple attributes
npx refrakt inspect api --method=POST --path="/users"

# JSON output for programmatic use
npx refrakt inspect hint --json

# List all available runes
npx refrakt inspect --list

# CSS coverage audit for a single rune
npx refrakt inspect hint --audit

# Full-theme CSS audit
npx refrakt inspect --all --audit

# Audit with explicit CSS directory
npx refrakt inspect hint --audit --css packages/lumina/styles/runes
```

Use `refrakt inspect` to see exactly what HTML the identity transform produces for any rune — BEM classes, data attributes, structural elements, and consumed meta tags. The `--audit` flag checks which generated selectors have CSS coverage.

### Contracts

```bash
# Generate structure contracts (all BEM selectors, data attrs, element structure)
# refrakt.config.json lives at the repo root since v0.11.0; the default
# resolution (cwd) picks it up so --config is no longer needed in this repo.
npx refrakt contracts -o contracts/structures.json

# Validate existing contracts file is up to date (for CI)
npx refrakt contracts --check -o contracts/structures.json
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
2. **Schema Transform**: Rune models (`packages/runes/src/tags/*.ts` + plugins) interpret children, emit `typeof` markers and meta tags
3. **Serialize**: Markdoc Tag class instances → plain `{$$mdtype:'Tag'}` objects (required for SvelteKit server→client boundary)
4. **Identity Transform**: Engine (`packages/transform/src/engine.ts`) reads meta tags, adds BEM classes, injects structural elements, strips consumed metadata
5. **Render**: Svelte Renderer dispatches on `typeof` attribute — registered component or generic HTML element

### Cross-Page Pipeline

After all pages are parsed, three additional build-time phases run (`packages/content/src/pipeline.ts`):
- **Phase 2 — Register**: Each plugin's `register()` hook scans all `TransformedPage`s and indexes named entities into the site-wide `EntityRegistry` (`packages/content/src/registry.ts`)
- **Phase 3 — Aggregate**: Each plugin's `aggregate()` hook builds cross-page indexes from the full registry. Core produces `pageTree`, `breadcrumbPaths`, `pagesByUrl`, `headingIndex`
- **Phase 4 — Post-process**: Each page passes through all plugins' `postProcess()` hooks to resolve deferred sentinels (e.g., `breadcrumb auto`) using aggregated data

Plugins opt in via `PluginPipelineHooks` on their `Plugin` export. Core hooks (`corePipelineHooks` from `@refrakt-md/runes`) always run first.

### Rune System

Runes are Markdoc tags that **reinterpret** standard Markdown. A heading inside `{% nav %}` becomes a group title; a list inside `{% recipe %}` becomes ingredients. Same primitives, different meaning based on context.

**Core runes** (~47 catalog entries) live in `packages/runes/src/tags/`. Each has: a schema file (`createContentModelSchema`), an engine config entry in `packages/runes/src/config.ts` (keyed by PascalCase `typeName`), a catalog entry in `packages/runes/src/index.ts` (`defineRune`), and optionally a Svelte component override registered via `@refrakt-md/svelte`. There is no separate type-definition file — rune identity is declared inline via the `rune` field on `createComponentRenderable` (kebab-case) and matched against the kebab-cased config key.

**Plugin runes** (~67 more across 9 plugins) live in `plugins/{marketing,docs,design,learning,storytelling,business,places,media,plan}/`. Each plugin exports a `Plugin` object (defined in `packages/types/src/package.ts`) containing rune schemas (`Plugin.runes`, a `Record<string, PluginRune>`), theme config (`Plugin.theme.runes`, keyed by PascalCase `typeName`), and optional pipeline hooks. A plugin may also contribute layouts and CLI commands (via a `cli-plugin` entry point). Users configure plugins in `refrakt.config.json` → `plugins[]`. The `loadPlugin()` and `mergePlugins()` utilities in `packages/runes/src/plugins.ts` handle loading and name-collision resolution.

### Two-Layer Theme System

**Layer 1 — Identity Transform** (framework-agnostic): The engine in `packages/transform/src/engine.ts` walks the serialized tree and applies BEM classes, reads modifiers from meta tags, injects structural elements (headers, icons, badges), and wraps content. Configured declaratively in `packages/runes/src/config.ts`. Most runes (~75%) need only this layer.

**Layer 2 — Svelte Components** (`packages/svelte/src/elements/`): Element overrides for HTML elements (Table, Pre) plus a component registry for custom rune renderers. Registered in `packages/svelte/src/registry.ts`. The Renderer looks up `data-rune` → component in the registry. Behavior-driven runes (Tabs, Accordion, DataTable, Form) use Layer 1 + `@refrakt-md/behaviors` for progressive enhancement instead.

### Package Relationships

- `types` — foundational, no deps on other packages; includes `Plugin`, `PluginPipelineHooks`, `EntityRegistry` and related pipeline types
- `transform` — depends on types; identity transform engine + config interfaces + merge utilities + layout configs
- `runes` — depends on types + transform; ~47 core rune schemas + SEO extraction + `coreConfig`/`baseConfig` + `corePipelineHooks` + `loadPlugin`/`mergePlugins` utilities
- `lumina` — depends on runes + transform; design tokens, CSS, icon overrides
- `behaviors` — no deps; progressive enhancement JS for interactive runes
- `content` — depends on runes + types; content loading, routing, layout cascade + `runPipeline()` orchestrator + `EntityRegistryImpl`
- `svelte` — depends on types + behaviors; Renderer + ThemeShell + element overrides + component registry
- `sveltekit` — depends on types; Vite plugin with virtual modules + content HMR; loads plugins from config, passes to `loadContent()`
- `ai` + `cli` — content generation + inspect tooling
- `plugins/{marketing,docs,design,learning,storytelling,business,places,media,plan}/` — 9 official plugins implementing `Plugin`

## Conventions

### BEM Naming

All identity-transformed runes use: `.rf-{block}`, `.rf-{block}--{modifier}`, `.rf-{block}__{element}`. Element classes come from `data-name` attributes on children — the engine's `applyBemClasses` function reads `data-name` and adds the corresponding BEM class.

### Variant Styling

Use `[data-*]` attribute selectors for variant styling, not BEM modifier classes on children. Examples: `[data-method="GET"]`, `[data-difficulty="easy"]`, `[data-type="add"]`. The engine sets data attributes from modifier values automatically.

### Rune Schema Patterns

- `createContentModelSchema({ attributes, contentModel, transform })` — defines a rune with declarative attributes and content model (sequence/delimited/sections/custom). Receives resolved fields in `transform(resolved, attrs, config)`
- `createComponentRenderable({ rune, tag, property, properties, refs, children })` — wraps output with a `data-rune` marker. The `rune` field is the kebab-case rune name and matches the kebab-cased key in `coreConfig`/`Plugin.theme.runes`
- `properties` values are meta Tags — `createComponentRenderable` sets `data-field` (kebab-cased) on them; the engine reads these for modifier values and consumes the tags
- `refs` values are Tags that get `data-name` attribute set on them — the engine adds `rf-{block}__{key}` BEM element classes
- Rune schemas should produce structurally complete renderables, not raw data blobs that components re-parse

### Rune Authoring Guide

Comprehensive rune authoring documentation lives at `site/content/extend/rune-authoring/` (8 pages: authoring-overview, content-models, nav-slug-resolution, output-contract, page-sections, partials, patterns, rich-menubar-panels). Refer to these when writing or modifying runes — they cover declarative content models (`createContentModelSchema`, sequence/delimited/sections/custom patterns), the output contract (`createComponentRenderable`, properties vs refs, meta tags, editHints), and canonical patterns (headingLevel auto-detect, header+body group split, child item runes, modifier naming, content boundaries).

New runes almost always belong in a plugin under `plugins/`, not in `packages/runes/src/tags/`. Plugin authoring docs: `site/content/extend/plugin-authoring/authoring.md`.

### Engine Config Pattern

Non-interactive runes are configured declaratively in `packages/runes/src/config.ts`:
- `block`: BEM block name
- `modifiers`: `{ name: { source: 'meta', default?: string } }` — reads meta tag, adds modifier class + data attribute
- `contextModifiers`: `{ 'parent-rune': 'suffix' }` — adds BEM modifier when nested inside a parent rune (key matches the parent's kebab-case `data-rune`)
- `staticModifiers`: `['name']` — always-applied BEM modifier classes
- `structure`: injects structural elements (headers, icons, meta displays) via `StructureEntry`
- `contentWrapper`: wraps content children in a container element
- `autoLabel`: maps child tag names to `data-name` values
- `styles`: maps modifier values to CSS custom properties or inline style declarations
- `postTransform`: programmatic escape hatch (prefer declarative config)
- `editHints`: `{ dataName: 'inline' | 'link' | 'code' | 'image' | 'icon' | 'none' }` — declares how named sections are edited in the block editor

Full interface definitions: `packages/transform/src/types.ts` (`ThemeConfig`, `RuneConfig`, `StructureEntry`).

### Theme Development

Theme developer documentation lives at `site/content/extend/theme-authoring/` (9 pages: overview, config-api, creating-a-theme, css, dimensions, layouts, components, tint-cascade, tooling). Refer to these when working on themes.

**Key files for theme work:**
- `packages/runes/src/config.ts` — core rune configs (exported as `coreConfig`/`baseConfig`) + `corePipelineHooks`
- `packages/runes/src/plugins.ts` — `loadPlugin()`, `mergePlugins()` — plugin loading and collision resolution
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

**When adding a rune to a plugin:**
- The `theme.runes` field of the `Plugin` carries the `RuneConfig` for that plugin's runes
- CSS lives inside the plugin under `plugins/{plugin}/styles/`
- See `site/content/extend/plugin-authoring/authoring.md` for full guide

### Content Authoring

Site content lives in `site/content/` as `.md` files with YAML frontmatter. Layouts use `_layout.md` files with `{% layout %}` + `{% region %}` tags that cascade down directory trees.

## Plan

Project planning content lives in `plan/` as Markdoc files using the `@refrakt-md/plan` runes package.

### Structure

```
plan/
  specs/      — Specifications (source of truth for what to build)
  work/       — Work items (what to implement)
  decisions/  — Architecture decision records (why it's built this way)
  milestones/ — Named release targets
```

### Filename Convention

Plan files use `{ID}-{slug}.md` (e.g. `WORK-051-plan-validate-command.md`, `SPEC-023-auth-system.md`) for auto-ID types. Milestones keep their semver names (`v1.0.0.md`). `refrakt plan create` emits this format automatically; `refrakt plan migrate filenames --apply --git` upgrades legacy unprefixed files.

### Rune syntax

- `{% spec id="SPEC-001" status="accepted" %}` — specification document
- `{% work id="WORK-001" status="ready" priority="high" source="SPEC-001" %}` — work item (`source` links to parent spec/decision)
- `{% bug id="BUG-001" status="confirmed" severity="major" source="SPEC-001" %}` — bug report
- `{% decision id="ADR-001" status="accepted" source="SPEC-001" %}` — architecture decision record (`source` links to spec it informs)
- `{% milestone name="v0.5.0" status="active" %}` — release target

### Workflow

```bash
# 1. Find the next work item
npx refrakt plan next

# 2. Start working on it
npx refrakt plan update <id> --status in-progress
```

3. Before implementing, read:
   - The work item's referenced specs in `plan/specs/` (follow ID references)
   - Related decision records in `plan/decisions/` (check tags)
   - Any dependency work items (ensure they're done)

```bash
# 4. Check off acceptance criteria as you complete them
npx refrakt plan update <id> --check "criterion text"

# 5. When all criteria are met, mark it done with a resolution summary
npx refrakt plan update <id> --status done --resolve "$(cat <<'EOF'
Branch: `claude/feature-name`
PR: refrakt-md/refrakt#123

### What was done
- List of concrete changes

### Notes
- Implementation decisions and tradeoffs
EOF
)"
```

When marking a work item done, always provide a `--resolve` summary unless the change is trivial. This captures implementation context (files changed, decisions made, branch/PR) for future reference.

### MANDATORY: Work Item Completion Checklist

**When you finish implementing a work item, you MUST do ALL of the following before considering the task complete. Do NOT skip any step. Do NOT manually edit work item files — always use the CLI.**

1. **Check off each acceptance criterion** individually using the CLI:
   ```bash
   npx refrakt plan update <id> --check "exact criterion text"
   ```
   Run this for EVERY criterion that was satisfied. Copy the criterion text exactly from the work item.

2. **Mark the item as done with a `--resolve` summary**:
   ```bash
   npx refrakt plan update <id> --status done --resolve "$(cat <<'EOF'
   Branch: `claude/branch-name`

   ### What was done
   - Concrete list of files changed and what was done in each

   ### Notes
   - Any implementation decisions or tradeoffs worth recording
   EOF
   )"
   ```

3. **Commit the updated work item file** along with your implementation changes.

Never mark a work item done without checking off criteria first. Never skip the `--resolve` summary. These are the project's historical record of what was built and why.

Use `--format json` on any command for machine-readable output.

### Creating plan content

```bash
# Scaffold new items (IDs auto-assigned by scanning existing files)
npx refrakt plan create work --title "Description"
npx refrakt plan create bug --title "Description"
npx refrakt plan create decision --title "Description"
npx refrakt plan create spec --title "Description"
npx refrakt plan create milestone --id v1.0 --title "Description"  # milestones require explicit ID

# See the next available ID without creating anything
npx refrakt plan next-id work

# Initialize plan structure in a new project
npx refrakt plan init
```

- IDs are auto-assigned when `--id` is omitted; duplicate IDs are rejected at create time
- Use H2 sections for structure (Acceptance Criteria, Approach, Context, etc.)

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
packages/types/       — Shared TypeScript interfaces (including Plugin, pipeline types)
packages/runes/       — ~47 core rune schemas + SEO extraction + coreConfig + corePipelineHooks + plugin loading utilities
packages/transform/   — Identity transform engine + types + merge utilities + layout configs
packages/lumina/      — Lumina theme (tokens, CSS, icon overrides)
packages/behaviors/   — Progressive enhancement JS (tabs, accordion, datatable, form)
packages/content/     — Content loading, routing, layout cascade + runPipeline() + EntityRegistryImpl
packages/svelte/      — Renderer.svelte + ThemeShell + element overrides + component registry
packages/sveltekit/   — Vite plugin + virtual modules + HMR; loads plugins from config
packages/ai/          — AI prompt building + providers
packages/cli/         — refrakt CLI (write + inspect + contracts)
packages/create-refrakt/ — Project scaffolding
plugins/marketing/    — @refrakt-md/marketing (hero, cta, bento, feature, definition, steps, pricing, testimonial, comparison)
plugins/docs/         — @refrakt-md/docs (api, symbol, changelog)
plugins/design/       — @refrakt-md/design (swatch, palette, typography, spacing, preview, mockup, design-context)
plugins/learning/     — @refrakt-md/learning (howto, recipe)
plugins/storytelling/ — @refrakt-md/storytelling (character, realm, faction, lore, plot, bond, storyboard)
plugins/business/     — @refrakt-md/business (cast, organization, timeline)
plugins/places/       — @refrakt-md/places (event, map, itinerary)
plugins/media/        — @refrakt-md/media (playlist, track, audio)
plugins/plan/         — @refrakt-md/plan (spec, work, bug, decision, milestone)
plan/                 — Project planning content (specs, work items, decisions)
site/                 — Documentation site (SvelteKit)
```

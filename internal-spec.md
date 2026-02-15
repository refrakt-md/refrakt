# refrakt.md -- Internal Engineering Spec

> **Status:** Working document -- evolving
> **Audience:** The developer and Claude Code
> **Last updated:** 2026-02-14

---

## 1. How to Use This Document

This is the private working engineering document for refrakt.md development. It tracks what is built, what is not, what to build next, and the reasoning behind technical decisions.

- For **stable architecture concepts** (rune philosophy, theme system design, content/theme separation), reference `refrakt-md-architecture.md`.
- For **business strategy** (monetization, marketplace, positioning), reference `refrakt-md-strategy.md`.
- This document is where the messy "here's what we're building next" thinking lives. Update it as work progresses. Sections will become stale -- that is expected. When something here conflicts with the architecture doc, the architecture doc wins for principles, but this doc wins for current implementation reality.

---

## 2. Guidance for Claude Code

### Read Order

1. Read `refrakt-md-architecture.md` first for the full picture of what we are building and why.
2. Read this document for what is actually built, what is missing, and what comes next.
3. Explore the codebase starting from `packages/runes/src/index.ts` (the rune library entry point) outward.

### Principles

- **The rune library is the foundation.** Get it right before building anything else. Every rune must produce a clean, well-structured renderable tree. If a rune's output is wrong, everything downstream (identity transform, component dispatch, SEO extraction) breaks.
- **Content and themes must be strictly separated.** Content lives in Markdoc files. Themes live in theme packages. A content file must never reference a framework, a component name, or a CSS class. A theme must never assume specific content structure beyond what runes guarantee.
- **Runes are interpretation contexts, not just visual components.** A list inside `{% recipe %}` is an ingredient list. A list inside `{% pricing %}` is a feature list. The rune changes the *meaning* of the Markdown AST beneath it. This semantic reinterpretation is the core idea.
- **The manifest is the contract between content and presentation.** The theme manifest (`manifest.json`) declares layouts, route rules, component mappings, and supported runes. It is the single source of truth for what a theme can do.
- **Dev experience matters.** HMR and fast feedback loops are non-negotiable. If a content change takes more than a second to appear in the browser, something is broken.
- **Production output should be optimized as if hand-written.** No unnecessary JavaScript. No unused CSS. No runtime overhead from dynamic dispatch when static dispatch will do.
- **SEO is a by-product of semantic richness, not a separate concern.** Because runes understand the meaning of content, structured data (JSON-LD, Open Graph) falls out naturally. Authors should never have to think about SEO markup.

### Key Questions to Keep in Mind

These are unresolved or partially resolved design questions. When working on features that touch these areas, consider the tradeoffs:

1. **Can runes describe themselves programmatically?**
   Partially. `RuneDescriptor` (in `packages/runes/src/rune.ts`) provides `name`, `aliases`, `description`, `reinterprets`, `seoType`, and a reference to the type registry entry. However, *attribute definitions* are locked inside TypeScript decorators on the Markdoc schema objects and are not exposed for runtime introspection. This means AI and themes cannot currently ask "what attributes does `{% recipe %}` accept?" at runtime.

2. **How does context-aware rendering work?**
   Two levels. **CSS-level:** The identity transform threads parent rune context through recursion. When a rune's `RuneConfig` has a `contextModifiers` entry matching its parent's `typeof`, an extra BEM modifier class is added (e.g., `rf-hint--in-hero`). This is implemented and configured for Hint, CallToAction, and Feature in Lumina. **Component-level:** Not yet built. `contextOverrides` in the manifest schema is dead -- nothing reads or applies it. The Svelte Renderer does not pass parent typeof down for component switching.

3. **Where does the identity transform end and the component begin?**
   The identity transform (`packages/transform/src/engine.ts`, extracted into `@refrakt-md/transform`) adds BEM classes, context-aware modifiers, and injects structural elements. It operates on the serialized tag tree *before* the Svelte Renderer sees it and threads parent rune context through the recursion, allowing nested runes to receive additional BEM modifiers based on their parent (e.g., `rf-hint--in-hero`). Components registered in the theme registry (`themes/lumina/registry.ts`) take over rendering entirely for their typeof. The line is: static runes get BEM-classed HTML via the identity transform (with context-aware modifiers when nested); interactive runes get a Svelte component. Currently ~17 component types are registered in Lumina; everything else falls through to `svelte:element` rendering.

---

## 3. Gap Analysis

### Fully Built (stable)

| What | Where | Notes |
|---|---|---|
| 43 primary runes (61+ with aliases) across 7 categories | `packages/runes/src/tags/*.ts` | All defined in `packages/runes/src/index.ts` with `defineRune()`. Each has name, description, reinterprets map, and type registry binding. |
| Rune class with RuneDescriptor | `packages/runes/src/rune.ts` | `Rune` class, `defineRune()` factory, `runeTagMap()` for Markdoc integration. |
| Type schema system | `packages/types/src/schema/*.ts` | ~47 schema files defining component types with `useSchema().defineType()`. |
| Rune registry with schema.org mappings | `packages/runes/src/registry.ts` | Maps every rune type to its schema + SEO bindings via RDFa `typeof` attributes. |
| Identity transform engine | `packages/transform/src/engine.ts` | `createTransform()` in `@refrakt-md/transform` -- BEM class generation, modifier resolution, structural element injection, meta tag consumption. Extracted from lumina so any theme can reuse it with its own `ThemeConfig`. |
| Identity config (per-rune BEM mappings) | `packages/lumina/src/config.ts` | Per-rune configuration for the identity transform. Imports `ThemeConfig` from `@refrakt-md/transform`. |
| Per-rune CSS (44 files) | `packages/lumina/styles/runes/*.css` | One CSS file per rune for targeted styling. Enables future tree-shaking by rune usage. |
| Design tokens incl. dark mode | `packages/lumina/tokens/base.css`, `tokens/dark.css` | CSS custom properties for colors, spacing, typography. Dark mode via `prefers-color-scheme` and `.dark` class. |
| SEO extraction layer | `packages/runes/src/seo.ts` | 8 extractors: FAQPage, Product/Offer, Review, BreadcrumbList, ItemList, VideoObject, ImageObject, MusicPlaylist. Open Graph derivation from hero/frontmatter/first-content. |
| Three-layer routing | `packages/content/src/router.ts`, `packages/svelte/src/route-rules.ts` | Filesystem default, frontmatter overrides, manifest route rules with pattern matching. |
| Layout system | `packages/content/src/layout.ts` | `{% layout %}`, `{% region %}`, `{% nav %}` with inheritance via `_layout.md` cascade. Region modes: replace, prepend, append. |
| Content tree loading | `packages/content/src/site.ts` | Reads content directory, builds page tree, applies transforms. |
| Navigation resolution | `packages/content/src/navigation.ts` | Resolves `{% nav %}` slugs to actual page data. |
| Sitemap generation | `packages/content/src/sitemap.ts` | XML sitemap from content tree. |
| Svelte Renderer | `packages/svelte/src/Renderer.svelte` | Recursive tree-to-DOM rendering with component dispatch via `typeof` attribute lookup. |
| ThemeShell | `packages/svelte/src/ThemeShell.svelte` | Layout selection via route rules, SEO `<head>` injection (JSON-LD, OG, Twitter Card). |
| Serialization layer | `packages/svelte/src/serialize.ts` | Converts Markdoc Tag class instances to plain serializable objects for SvelteKit load boundary. |
| SvelteKit Vite plugin | `packages/sveltekit/src/plugin.ts` | Virtual modules, content HMR, dev/build mode switching. |
| Content HMR | `packages/sveltekit/src/content-hmr.ts` | Watches content directory, triggers Vite HMR on file changes. |
| Theme manifest | `themes/lumina/manifest.json` | Lumina theme config: 2 layouts (default, docs), route rules, component mappings. |
| Theme component registry | `themes/lumina/registry.ts` | Maps 17 typeof values to 16 Svelte components (interactive + complex rendering). |
| `refrakt write` CLI | `packages/cli/src/bin.ts`, `packages/cli/src/commands/write.ts` | AI content generation command. |
| AI prompt generation | `packages/ai/src/prompt.ts` | System prompt for AI content writing with rune context. |
| AI provider abstraction | `packages/ai/src/provider.ts`, `packages/ai/src/providers/` | Anthropic and Ollama providers. |

### Partially Built

| What | Current State | What Is Missing |
|---|---|---|
| **Production rendering** | Uses SvelteKit prerender via catch-all `[...slug]` route. Works, produces static HTML. | No explicit page file generation. No pre-processed route tree. Context is resolved at runtime via Svelte context, not at build time. Code splitting is framework-default, not rune-aware. |
| **Rune self-description** | `RuneDescriptor` provides name, aliases, description, reinterprets map, seoType. | Attribute definitions (what attributes a rune accepts, their types, defaults) are embedded in Markdoc `Schema` objects and not exposed in a way that AI or themes can introspect at runtime. |
| **Component registry** | Works: `typeof` attribute -> component lookup via Svelte context. | Flat lookup only. No `contextOverrides` for parent-based component switching. The manifest schema supports the field but nothing reads it. |
| **Lumina theme** | Hand-crafted Svelte components for interactive runes. Identity transform handles static runes. Per-rune CSS files (44) and dark mode tokens are in place. | No blog layout. No CSS tree-shaking (per-rune files exist but all are bundled regardless of usage). |

### Not Built

| What | Notes |
|---|---|
| **Multi-framework adapters** (Astro, Next.js, static HTML) | Currently SvelteKit-only. |
| **React component set** | Only Svelte components exist. |
| **Shared interactive behavior** (vanilla JS core modules) | Interactive logic is embedded in Svelte components, not factored out. |
| **Rune tree-shaking / content analysis manifest** | No build step that scans content and produces a rune usage report. |
| **Generated routes** (blog indexes, tag pages, RSS feeds) | Manifest `routeRules` can declare `generated` but nothing processes it. |
| **TypeDoc pipeline** (`refrakt typedoc` command) | Not started. |
| **Quiz / poll / survey runes** | Specified in the original spec but not implemented as rune definitions. |
| **Reference rune** (`{% reference %}` for code documentation) | Not implemented. |
| **Context-aware component switching** | `contextOverrides` in manifest is dead schema -- nothing reads or applies it. CSS-level context modifiers are done (see Q2 above); component-level switching remains unbuilt. |
| **Critical CSS inlining** | No CSS analysis or inlining pipeline. |
| **AI theme generation** | `refrakt write` exists for content. No equivalent for themes. |
| **Blog layout** | Lumina has `default` and `docs` layouts only. |
| **CSS tree-shaking** | Per-rune CSS files exist but all are bundled unconditionally. No content analysis to determine which rune CSS is needed per page. |
| **VS Code extension** (Phase 1: static) | TextMate grammar, snippets, bracket matching, folding. Declarative config only, no runtime code. See Section 12. |
| **Language server** (Phase 2: LSP) | Autocompletion, hover docs, diagnostics, validation, cross-file intelligence. Powered by rune registry metadata. See Section 12. |

---

## 4. Implementation Phases (Updated)

### Phase 1: Rune Library & Parser -- COMPLETE

All 43+ runes implemented with proper reinterpretation logic, attribute system, and renderable output. The `Rune` class provides `defineRune()` with descriptor metadata. Markdoc schema integration via `runeTagMap()`.

### Phase 2: Layout & Routing -- COMPLETE

`{% layout %}`, `{% region %}`, `{% nav %}` all working. Three-layer routing implemented (filesystem, frontmatter, manifest route rules). Layout inheritance with replace/prepend/append modes. Sequential pagination derived from `{% nav ordered="true" %}`.

### Phase 3: SvelteKit Renderer -- COMPLETE

Lumina theme hand-crafted. Manifest format defined and validated. Component registry working via Svelte context. Dual-mode dev/build pipeline via Vite plugin with content HMR. Region-to-layout mapping working. ThemeShell handles layout selection and SEO head injection.

### Phase 4: SEO Layer -- COMPLETE

8 schema.org extractors (FAQPage, Product, Review, BreadcrumbList, ItemList, VideoObject, ImageObject, MusicPlaylist). JSON-LD generation. Open Graph derivation with fallback chain (frontmatter -> hero rune -> first content elements). Built as a separate pass over the renderable tree in `packages/runes/src/seo.ts`.

### Phase 5: AI Theme Generation -- PARTIAL

`refrakt write` for content generation exists with Anthropic and Ollama providers. AI theme generation (describe a theme in natural language, get a working theme package) is not built.

### Phase 6 (next): Production Optimization & Missing Runes

This phase covers the work needed to make production output competitive with hand-built sites:

- ~~Split Lumina CSS into per-rune files~~ -- DONE (44 files in `packages/lumina/styles/runes/`)
- ~~Extract identity transform into `@refrakt-md/transform`~~ -- DONE
- Content analysis step that produces a rune usage manifest per page
- Rune-level CSS tree-shaking based on the usage manifest
- Per-page code splitting via pre-processed route generation (generate actual `+page.svelte` files)
- ~~Context-aware styling via identity transform BEM modifiers~~ -- DONE (Hint, Feature, CallToAction in Lumina; 7 tests)
- Context-aware component binding at build time (for cases needing different components, not just CSS)
- Add missing runes: quiz, poll/survey, reference
- Add blog layout to Lumina

### Phase 7: Multi-Framework Support

- Factor interactive behavior out of Svelte components into vanilla JS core modules
- Create React component wrappers for the ~10 interactive runes
- Build Astro adapter (Svelte or React islands with `client:` directives)
- Build Next.js adapter
- Build static HTML adapter with vanilla JS progressive enhancement

### Phase 8: TypeDoc Pipeline

- TypeScript Compiler API for symbol extraction
- Generate `{% reference %}` Markdoc files from TypeScript source
- CLI command `refrakt typedoc`
- Staleness detection for CI (`--validate` mode)
- Auto-generated `_layout.md` with `{% nav %}` for API reference navigation

### Phase 9: Generated Routes & Content Features

- Blog index generation from manifest `routeRules[].generated`
- Tag/category archive pages
- RSS feed generation
- Search index generation
- Client-side search component

### Phase 10: Editor Support (VS Code Extension & Language Server)

Two-phase delivery. See Section 12 for full detail.

**Phase 10a: Static Intelligence** (small effort, declarative only)
- TextMate grammar for rune syntax highlighting (opening, closing, self-closing tags)
- Attribute name/value highlighting within rune tags
- Bracket matching for `{% rune %}` / `{% /rune %}` pairs
- Folding regions for rune blocks
- Snippets for every rune with tabstop and choice syntax
- Published to VS Code Marketplace and Open VSX as `@refrakt-md/vscode`

**Phase 10b: Language Server** (medium-large effort, LSP-based)
- `@refrakt-md/language-server` — editor-agnostic LSP server
- Autocompletion: rune names, attributes, attribute values, closing tags (context-aware)
- Hover documentation generated from `RuneDefinition` metadata
- Diagnostics: unknown runes, unclosed tags, invalid attributes, missing required attrs, nesting errors
- Fuzzy matching for typo suggestions
- Document symbols for Outline panel and breadcrumbs
- Quick fix code actions
- Cross-file intelligence: nav references, snippet refs, duplicate slug detection
- Rename support for pages and snippets
- Incremental parsing for performance

---

## 5. Technical Decisions & Rationale

### Why Markdoc over MDX?

Markdoc's AST is inspectable and transformable. Runes can manipulate the tree before rendering -- reinterpret children, inject structural elements, extract SEO data. MDX compiles to JSX which is opaque to tooling. Markdoc also avoids tying content to a specific framework: the same `.md` file works whether the theme targets SvelteKit, Astro, or static HTML.

### Why identity transform + BEM?

Most runes do not need interactivity. The identity transform (`packages/transform/src/engine.ts`, in `@refrakt-md/transform`) produces fully structured HTML with BEM classes that CSS alone can style. The transform also supports context-aware styling: when a rune is nested inside a parent rune, the engine applies additional BEM modifiers (e.g., `rf-hint--in-hero`) based on the `contextModifiers` configuration, allowing CSS to target runes in specific contexts without framework components. This means ~75-80% of runes need zero framework components. Only interactive runes (tabs, accordion, form, datatable, reveal, chart, diagram) need Svelte/React wrappers.

The engine was extracted into `@refrakt-md/transform` so any theme can reuse `createTransform()` with its own `ThemeConfig`. Lumina's config lives in `packages/lumina/src/config.ts` and produces the pre-built `identityTransform` via `packages/lumina/src/transform.ts`.

This is the key insight for multi-framework support: the component surface area is ~10-15 interactive components, not 43+. The identity layer handles everything else.

### Why RDFa-style typeof attributes?

The `typeof` attribute on rendered tags serves dual purpose:
1. **Component dispatch** -- the Svelte Renderer checks `typeof` to look up a component in the registry.
2. **Machine readability** -- schema.org compatibility for SEO crawlers.

One attribute, two uses. No separate dispatch mechanism needed.

### Why serialize the tree?

Markdoc `Tag` objects are class instances with methods. They cannot cross the SvelteKit server-to-client boundary in `load` functions (which require JSON-serializable data). The serialize step (`packages/svelte/src/serialize.ts`) converts them to plain objects with a `$$mdtype: 'Tag'` marker.

### Why context-based component dispatch (not import-based)?

In development mode, the catch-all `[...slug]` route does not know at build time which runes a page will use. Component dispatch happens at runtime via Svelte context (`setRegistry()` / `getComponent()`). This enables instant HMR -- change content, see the result, no rebuild.

In a future production mode with pre-processed routes, this would be replaced by explicit imports for each page's runes.

### Why separate content, transform, and lumina packages?

The theme system is now a three-package split:

1. **`@refrakt-md/transform`** (`packages/transform/`) -- the generic identity transform engine. Provides `createTransform()` and helper utilities. Framework-agnostic, theme-agnostic. Any theme can import this and supply its own `ThemeConfig`.
2. **`@refrakt-md/lumina`** (`packages/lumina/`) -- Lumina's specific config + CSS. Contains the `ThemeConfig` for Lumina's BEM mappings, per-rune CSS files (44), and design tokens (light + dark). No framework code.
3. **`@refrakt-md/theme-lumina`** (`themes/lumina/`) -- Svelte implementation layer. Interactive components, manifest, registry. This is the only framework-specific package.

`packages/content` handles filesystem concerns: reading files, resolving layouts, building the content tree, routing. `packages/runes` is the shared vocabulary everything depends on. This separation means a different theme can replace lumina entirely without touching content loading, and a React implementation layer could reuse `@refrakt-md/transform` + `@refrakt-md/lumina` CSS with its own component set.

---

## 6. Open Questions

### 1. Rune attribute introspection

**Problem:** Runes define their accepted attributes in Markdoc `Schema` objects (via the `attributes` field). This information is available at parse time but not exposed through `RuneDescriptor` or the `Rune` class. AI theme generators and content validators cannot ask "what attributes does `{% recipe %}` accept?" without parsing the schema objects.

**Options:**
- (a) Add an `attributes` field to `RuneDescriptor` that mirrors the Markdoc schema's attribute definitions in a simpler format.
- (b) Expose the Markdoc `Schema.attributes` directly through the `Rune` class.
- (c) Generate a static attributes manifest at build time from the schema definitions.

**Leaning toward:** (a) -- explicit is better than wrapping Markdoc internals.

### 2. Context-aware rendering

**Status:** Partially resolved.

**What's built:** Option (c) -- identity-transform-level BEM modifiers. The identity transform (`packages/transform/src/engine.ts`) now threads parent rune context through recursion. When a rune's `RuneConfig` has a `contextModifiers` entry matching the parent rune's `typeof`, an extra BEM modifier class is added (e.g., `rf-hint--in-hero`). Implemented for Hint (Hero, Feature), Feature (Hero, Grid), and CallToAction (Hero, Pricing) in Lumina. Context-aware CSS rules in `packages/lumina/styles/runes/*.css`. 7 tests in `packages/transform/test/context-modifiers.test.ts`.

**What's not built:** Component switching via `contextOverrides` in the manifest. Options (a) runtime dispatch and (b) build-time resolution remain unimplemented. If a rune needs a completely different component when nested (not just different CSS), that still requires future work.

**Conclusion:** Most context-sensitive styling is CSS-only. BEM modifiers handle the 80% case. Component switching is rarely needed but remains possible via future manifest support.

### 3. Generated routes

**Problem:** Blog indexes, tag pages, RSS feeds. Should these be a content-layer feature (generated by `packages/content`) or a theme-layer feature (generated by the adapter)?

The manifest `routeRules` has a `generated` field for this, suggesting theme-layer. But the data (post listings, tag groupings) comes from content analysis.

**Leaning toward:** Content layer produces the data (list of posts, tags, dates). Theme layer decides how to render it (what component, what layout). The adapter wires the two together.

### 4. Theme marketplace package format

**Problem:** When themes support multiple frameworks, what is the npm package structure? One package with subpath exports? Separate packages per framework?

**Leaning toward:** Single package with subpath exports:
```
@refrakt-md/lumina          -> identity layer (config + CSS)
@refrakt-md/lumina/sveltekit -> SvelteKit adapter + Svelte components
@refrakt-md/lumina/astro     -> Astro adapter
@refrakt-md/lumina/nextjs    -> Next.js adapter + React components
```

**Current reality:** The three-package split (`@refrakt-md/transform` → `@refrakt-md/lumina` → `@refrakt-md/theme-lumina`) already provides the separation needed. A future React theme would import `@refrakt-md/transform` + the `@refrakt-md/lumina` CSS and provide its own React components, without touching the identity layer or config.

### 5. How far to take pre-processed production builds?

**Problem:** The current approach (catch-all route + SvelteKit prerender) works and produces good output. Full pre-processing (generating `+page.svelte` files per content page) adds complexity but enables framework-native code splitting and eliminates runtime component dispatch.

**Question:** Is the complexity worth it now, or should we wait until multi-framework support forces the issue?

**Current answer:** Wait. The catch-all approach works for SvelteKit. Pre-processing becomes necessary when we build the Astro and Next.js adapters, since those frameworks expect real page files.

---

## 7. Key File Paths

### Rune System

| File | Purpose |
|---|---|
| `packages/runes/src/index.ts` | All rune exports, tags map, nodes map |
| `packages/runes/src/rune.ts` | `Rune` class, `RuneDescriptor` interface, `defineRune()`, `runeTagMap()` |
| `packages/runes/src/tags/*.ts` | Individual rune implementations (43 files) |
| `packages/runes/src/registry.ts` | Schema + SEO type mappings via `useSchema().defineType()` |
| `packages/runes/src/seo.ts` | SEO extraction: JSON-LD extractors + OG derivation |
| `packages/runes/src/nodes.ts` | Custom Markdoc node overrides (heading, paragraph, fence, etc.) |
| `packages/runes/src/lib/renderable.ts` | `RenderableNodeCursor` for tree traversal |
| `packages/runes/src/lib/model.ts` | `Model` class for schema building |
| `packages/runes/src/lib/annotations/*.ts` | Decorator system: `@attribute`, `@group`, `@decoration`, `@id` |
| `packages/runes/src/documents/page.ts` | `Page` document type |
| `packages/runes/src/documents/doc.ts` | `DocPage` document type (docs-specific) |

### Type System

| File | Purpose |
|---|---|
| `packages/types/src/index.ts` | All type exports |
| `packages/types/src/schema/*.ts` | ~47 TypeScript component type definitions |
| `packages/types/src/types.ts` | Core type primitives (`Type`, `ComponentType`, `useSchema`) |
| `packages/types/src/serialized.ts` | Canonical `SerializedTag`, `RendererNode` types (used by transform, svelte, lumina) |
| `packages/types/src/interfaces.ts` | Shared interfaces |
| `packages/types/src/theme.ts` | Theme-related types |

### Content Layer

| File | Purpose |
|---|---|
| `packages/content/src/site.ts` | Content tree loading + transform pipeline |
| `packages/content/src/layout.ts` | Layout chain resolution + region merging |
| `packages/content/src/router.ts` | File-to-URL conversion |
| `packages/content/src/navigation.ts` | Nav slug resolution to page data |
| `packages/content/src/content-tree.ts` | Content directory tree structure |
| `packages/content/src/frontmatter.ts` | Frontmatter extraction |
| `packages/content/src/sitemap.ts` | XML sitemap generation |

### Svelte Rendering

| File | Purpose |
|---|---|
| `packages/svelte/src/Renderer.svelte` | Recursive tree-to-DOM rendering with component dispatch |
| `packages/svelte/src/ThemeShell.svelte` | Layout selection + SEO `<head>` injection |
| `packages/svelte/src/context.ts` | `setRegistry()`, `getComponent()`, `setElementOverrides()`, `getElementOverrides()` |
| `packages/svelte/src/theme.ts` | `SvelteTheme` type definition |
| `packages/svelte/src/serialize.ts` | Tag class instances -> plain serializable objects |
| `packages/svelte/src/route-rules.ts` | Route pattern matching for layout selection |
| `packages/svelte/src/types.ts` | Re-exports `SerializedTag`, `RendererNode` from `@refrakt-md/types` |
| `packages/svelte/src/index.ts` | Package exports |

### SvelteKit Integration

| File | Purpose |
|---|---|
| `packages/sveltekit/src/plugin.ts` | Vite plugin: virtual modules + dev/build mode |
| `packages/sveltekit/src/content-hmr.ts` | Content directory watcher for HMR |
| `packages/sveltekit/src/virtual-modules.ts` | Virtual module definitions |
| `packages/sveltekit/src/config.ts` | Plugin configuration types |

### Lumina Theme

| File | Purpose |
|---|---|
| `themes/lumina/manifest.json` | Theme config: layouts, route rules, component mappings |
| `themes/lumina/registry.ts` | Component dispatch map (17 typeof values -> 16 Svelte components) |
| `themes/lumina/index.ts` | Theme entry point |
| `themes/lumina/elements.ts` | Element-level overrides |
| `themes/lumina/tokens.css` | Design tokens (CSS custom properties) |

### Identity Transform (`@refrakt-md/transform`)

| File | Purpose |
|---|---|
| `packages/transform/src/index.ts` | Barrel export for the transform package |
| `packages/transform/src/engine.ts` | `createTransform()` -- BEM class application, modifier resolution, structural injection |
| `packages/transform/src/helpers.ts` | Tag detection + construction helpers (`isTag`, `makeTag`, `findMeta`, etc.) |
| `packages/transform/src/types.ts` | `ThemeConfig`, `RuneConfig`, `StructureEntry` types |
| `packages/lumina/src/config.ts` | Per-rune BEM configuration (Lumina's `ThemeConfig`) |
| `packages/lumina/src/transform.ts` | Re-exports from `@refrakt-md/transform` + pre-built Lumina `identityTransform` |

### CLI & AI

| File | Purpose |
|---|---|
| `packages/cli/src/bin.ts` | CLI entry point |
| `packages/cli/src/commands/write.ts` | `refrakt write` command |
| `packages/cli/src/config.ts` | CLI configuration |
| `packages/ai/src/prompt.ts` | System prompt generation for AI |
| `packages/ai/src/provider.ts` | AI provider interface |
| `packages/ai/src/providers/anthropic.ts` | Anthropic Claude provider |
| `packages/ai/src/providers/ollama.ts` | Ollama local provider |

---

## 8. Component Registry Detail

The Lumina theme registers these components in `themes/lumina/registry.ts`:

| typeof Value(s) | Component File | Why It Needs a Component |
|---|---|---|
| `TabGroup`, `Tab` | `Tabs.svelte` | Click-to-switch panel state |
| `DataTable` | `DataTable.svelte` | Sort, filter, paginate |
| `Diagram` | `Diagram.svelte` | Mermaid/PlantUML rendering |
| `Reveal`, `RevealStep` | `Reveal.svelte` | Progressive disclosure state |
| `Form`, `FormField` | `Form.svelte` | Validation, dynamic fields |
| `Nav`, `NavGroup`, `NavItem` | `Nav.svelte` | Active state, expand/collapse |
| `Accordion`, `AccordionItem` | `Accordion.svelte` | Expand/collapse state |
| `Details` | `Details.svelte` | Open/close toggle |
| `Chart` | `Chart.svelte` | Chart.js rendering |
| `Comparison`, `ComparisonColumn`, `ComparisonRow` | `Comparison.svelte` | Complex table layout |
| `Grid` | `Grid.svelte` | Dynamic column calculation |
| `Storyboard`, `StoryboardPanel` | `Storyboard.svelte` | Panel layout logic |
| `Bento`, `BentoCell` | `Bento.svelte` | Grid sizing from heading levels |
| `Embed` | `Embed.svelte` | oEmbed resolution, iframe handling |
| `Pricing`, `Tier`, `FeaturedTier` | `Pricing.svelte` | Highlight/toggle logic |
| `Testimonial` | `Testimonial.svelte` | Avatar + quote layout |

Everything *not* in this list is rendered by the generic `Renderer.svelte` path: `svelte:element` with the BEM classes applied by the identity transform. This includes: Hero, Hint/Callout, CTA, Feature, Steps, Figure, Timeline, Changelog, Breadcrumb, Compare, Recipe, HowTo, Event, Cast, Organization, Api, Diff, Sidenote, Conversation, Annotate, Codegroup, TOC.

---

## 9. SEO Extractor Coverage

The SEO layer (`packages/runes/src/seo.ts`) has extractors for these schema.org types:

| Extractor | Triggered By | Schema.org Type |
|---|---|---|
| `extractFAQPage` | `{% accordion %}` / `{% faq %}` with `seoType: 'FAQPage'` | `FAQPage` with `Question` + `Answer` |
| `extractProduct` | `{% pricing %}` with `seoType: 'Product'` | `Product` with nested `Offer` per tier |
| `extractOffer` | Child of Product (not top-level) | `Offer` with price + currency |
| `extractReview` | `{% testimonial %}` / `{% review %}` with `seoType: 'Review'` | `Review` with author + rating |
| `extractBreadcrumbList` | `{% breadcrumb %}` with `seoType: 'BreadcrumbList'` | `BreadcrumbList` with `ListItem` |
| `extractItemList` | `{% timeline %}` with `seoType: 'ItemList'` | `ItemList` with date + label |
| `extractVideoObject` | `{% embed %}` with `seoType: 'VideoObject'` | `VideoObject` |
| `extractImageObject` | `{% figure %}` with `seoType: 'ImageObject'` | `ImageObject` with caption |
| `extractMusicPlaylist` | `{% music-playlist %}` with `seoType: 'MusicPlaylist'` | `MusicPlaylist` with `MusicRecording` tracks |

**Runes with seoType but no extractor yet:**
- `{% howto %}` -- `seoType: 'HowTo'` (no `extractHowTo`)
- `{% recipe %}` -- `seoType: 'Recipe'` (no `extractRecipe`)
- `{% event %}` -- `seoType: 'Event'` (no `extractEvent`)
- `{% cast %}` -- `seoType: 'Person'` (no `extractPerson`)
- `{% organization %}` -- `seoType: 'Organization'` (no `extractOrganization`)
- `{% datatable %}` -- `seoType: 'Dataset'` (no `extractDataset`)

These runes have the `seoType` field set on their `RuneDescriptor` and will be picked up by `buildSeoTypeMap()`, but `extractSeo()` will silently skip them because there is no matching extractor function in the `extractors` record.

---

## 10. Rendering Pipeline (How a Page Goes from .md to DOM)

For reference, the full pipeline for a page in dev mode:

```
1. Content file (.md)
   |
   v
2. Markdoc parse -> AST
   (using custom nodes from packages/runes/src/nodes.ts)
   |
   v
3. Markdoc transform -> Renderable tree (Tag instances)
   (using tags map from packages/runes/src/index.ts)
   (rune schemas reinterpret children: lists -> ingredients, headings -> tabs, etc.)
   |
   v
4. SEO extraction (packages/runes/src/seo.ts)
   (walks tree looking for typeof attributes, runs extractors, builds JSON-LD + OG)
   |
   v
5. Serialize (packages/svelte/src/serialize.ts)
   (Tag class instances -> plain {$$mdtype:'Tag', name, attributes, children} objects)
   |
   v
6. Identity transform (packages/transform/src/engine.ts)
   (walks serialized tree, adds BEM classes, injects structural elements, resolves modifiers)
   |
   v
7. SvelteKit load function returns: { renderable, regions, seo, title, ... }
   |
   v
8. ThemeShell.svelte
   (selects layout via route rules, injects SEO head tags)
   |
   v
9. Layout component (e.g. DocsLayout.svelte)
   (receives regions + renderable, places them in slots)
   |
   v
10. Renderer.svelte (recursive)
    (for each tag: check typeof -> look up component in registry ->
     if found: render component, else: render svelte:element with BEM classes)
    |
    v
11. DOM
```

---

## 11. What to Work on Next

This section captures the current priority order. Update it as things change.

**Immediate (before any new features):**
- Write missing SEO extractors for HowTo, Recipe, Event, Person, Organization, Dataset
- These runes already declare their `seoType` but get silently skipped

**Short term:**
- ~~Split Lumina CSS into per-rune files~~ -- DONE (tree-shaking itself is still pending)
- Add a blog layout to Lumina
- ~~Context-aware BEM modifiers at the identity transform level~~ -- DONE
- Extend `contextModifiers` to more runes as styling needs emerge
- CSS tree-shaking: use content analysis manifest to include only the per-rune CSS files needed per page
- VS Code extension Phase 1 (TextMate grammar, snippets, bracket matching) — low effort, high DX impact

**Medium term:**
- Content analysis step (scan all content, produce rune usage manifest)
- Pre-processed route generation for production builds
- Quiz, poll/survey, reference rune implementations
- Language server (Phase 10b) — requires rune attribute introspection (Open Question #1)

**Long term:**
- Multi-framework support (React components, Astro adapter, Next.js adapter)
- AI theme generation
- TypeDoc pipeline
- Generated routes (blog indexes, tag pages, RSS)

---

## 12. Editor Support — VS Code Extension & Language Server

> **Packages:** `@refrakt-md/vscode` (VS Code extension), `@refrakt-md/language-server` (LSP server, editor-agnostic)
> **Status:** Not started
> **Full plan:** `vscode-extension-plan.md`

### Phase 1: Static Intelligence (declarative, no runtime code)

**TextMate Grammar** (`syntaxes/refrakt.tmLanguage.json`)

Injection grammar extending Markdown to recognize rune constructs:

| Content | Scope | Visual Effect |
|---|---|---|
| `{%` and `%}` | `punctuation.definition.tag.rune.refrakt` | Bracket color |
| `{% /` (closing) | `punctuation.definition.tag.rune.closing.refrakt` | Bracket color |
| Rune name (`recipe`, `hero`) | `entity.name.tag.rune.refrakt` | Tag name color |
| Rune attributes (`type="info"`) | `entity.other.attribute-name.rune.refrakt` | Attribute color |
| Attribute values (`"info"`) | `string.quoted.double.rune.refrakt` | String color |
| Self-closing `/%}` | `punctuation.definition.tag.rune.self-closing.refrakt` | Bracket color |

Scope name: `text.html.markdown.refrakt`, injected into `L:text.html.markdown`.

**Bracket Matching & Folding**

Folding markers match `{% rune %}` opening tags to `{% /rune %}` closing tags. Enables gutter fold icons and minimap structure. Bracket pair colorization enabled for `[markdown]`.

**Snippets**

Every rune gets a `rune:<name>` snippet with tabstops and VS Code choice syntax (`${1|option1,option2|}`) for enum attributes. Examples: `rune:hero`, `rune:recipe`, `rune:callout`, `rune:tabs`, `rune:comparison`, `rune:form`, `rune:reference`, `rune:codegroup`, `rune:grid`, etc.

**File Association**

`.md` files within a refrakt.md project (detected by `refrakt.config.json` or `content/` directory) get the enhanced grammar. Outside refrakt projects, standard Markdown highlighting applies.

**Extension Package Structure**

```
vscode-refrakt/
├── package.json            ← extension manifest
├── syntaxes/
│   └── refrakt.tmLanguage.json
├── snippets/
│   └── runes.json
├── language-configuration.json
├── icon.png
└── README.md
```

### Phase 2: Language Server (LSP-based)

**Architecture**

```
VS Code Extension  ◄═══ LSP/JSON-RPC ═══►  Language Server (@refrakt-md/language-server)
(thin client)                                ├── Markdoc Parser (content → AST)
                                             ├── Rune Registry (self-describing metadata)
Neovim / Zed /     ◄═══ LSP/JSON-RPC ═══►  └── Feature Providers
any LSP client                                   ├── Completion
                                                 ├── Hover
                                                 ├── Diagnostics
                                                 ├── Symbols
                                                 ├── Code Actions
                                                 ├── Definition
                                                 └── Rename
```

The language server is a standalone Node.js process. Any LSP-capable editor can connect.

**Rune Registry as Data Source**

All intelligence comes from the rune library's self-describing metadata. Each rune provides name, description, category, attributes (with types, defaults, enums), reinterpretation map, SEO mappings, and nesting rules. Adding a new rune to `@refrakt-md/runes` automatically teaches the language server about it — no extension update required.

> **Dependency on Open Question #1:** The language server needs attribute introspection from `RuneDescriptor`. Currently attributes are locked inside Markdoc `Schema` objects. Phase 2 requires resolving this (leaning toward option (a): add an `attributes` field to `RuneDescriptor`).

**Autocompletion**

- Rune name completion on `{% ` — sorted by category with descriptions
- Attribute completion after rune name — shows available attributes, excludes already-specified ones
- Attribute value completion on `="` — enum values for enum attributes
- Closing tag completion on `{% /` — suggests nearest unclosed rune
- Markdown primitive hints inside rune blocks (inlay hints showing expected content types)
- Context-aware filtering: prioritize valid children of the parent rune

**Hover Documentation**

Generated from `RuneDefinition` metadata:
- Rune name hover: description, category, reinterpretation map, SEO type, available attributes
- Attribute hover: type, description, default value, schema.org mapping

**Diagnostics & Validation**

| Level | Examples |
|---|---|
| Error | Unknown rune (with fuzzy "did you mean?"), unclosed rune, unknown attribute, invalid attribute value, missing required attribute, invalid nesting |
| Warning | Missing expected content (e.g., recipe without ingredients), SEO opportunity (e.g., recipe without prepTime), empty rune, deprecated attribute |
| Info | Reinterpretation hints, composition suggestions |

**Document Symbols & Outline**

Rune structure appears in VS Code's Outline panel and breadcrumbs, showing the nesting hierarchy of runes and headings.

**Code Actions & Quick Fixes**

Auto-correct typos, insert closing tags, add missing required attributes, insert template content for empty runes.

**Cross-File Intelligence**

When the language server has access to the workspace:
- `{% nav %}` slug references: Ctrl+click jumps to content file
- `{% snippet ref="..." %}`: Ctrl+click jumps to snippet definition
- Project-wide diagnostics: dead nav references, duplicate slugs, non-existent snippet refs
- Workspace symbol search (Cmd+T)
- Rename support: renaming a page file updates nav references across the project

**Incremental Parsing**

On document change, only the affected rune block(s) are re-parsed and re-validated. Cached diagnostics for unchanged sections are preserved.

**Language Server Package Structure**

```
language-server/
├── src/
│   ├── server.ts               ← LSP entry point
│   ├── parser/
│   │   ├── document.ts         ← document model with incremental updates
│   │   └── markdoc.ts          ← Markdoc parser wrapper
│   ├── providers/
│   │   ├── completion.ts       ← rune, attribute, and value completion
│   │   ├── hover.ts            ← rune and attribute hover docs
│   │   ├── diagnostics.ts      ← validation and error reporting
│   │   ├── symbols.ts          ← document outline and workspace symbols
│   │   ├── codeActions.ts      ← quick fixes
│   │   ├── definition.ts       ← go-to-definition for cross-references
│   │   └── rename.ts           ← rename support
│   ├── registry/
│   │   └── loader.ts           ← loads RuneDefinitions from @refrakt-md/runes
│   └── workspace/
│       ├── indexer.ts           ← cross-file index (pages, slugs, snippets)
│       └── config.ts           ← project configuration reader
└── tests/
```

### Future Considerations

- **Live preview panel:** WebView sidebar rendering the current rune block with the active theme
- **AI-assisted authoring:** Inline suggestions ("This looks like a recipe — wrap it in `{% recipe %}`?")
- **Theme-aware completion:** Prioritize runes the current theme supports via manifest detection
- **Performance profiling:** Show estimated bundle impact of runes on the current page
- **Color decoration:** Inline color swatches for design token references in theme CSS

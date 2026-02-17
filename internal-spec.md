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
   Two levels. **CSS-level:** The identity transform threads parent rune context through recursion. When a rune's `RuneConfig` has a `contextModifiers` entry matching its parent's `typeof`, an extra BEM modifier class is added (e.g., `rf-hint--in-hero`). This is implemented and configured for Hint, Hero, CallToAction, and Feature in Lumina. **Component-level:** Not yet built. `contextOverrides` in the manifest schema is dead -- nothing reads or applies it. The Svelte Renderer does not pass parent typeof down for component switching.

3. **Where does the identity transform end and the component begin?**
   The identity transform (`packages/transform/src/engine.ts`, extracted into `@refrakt-md/transform`) adds BEM classes, context-aware modifiers, and injects structural elements. It operates on the serialized tag tree *before* the Svelte Renderer sees it and threads parent rune context through the recursion, allowing nested runes to receive additional BEM modifiers based on their parent (e.g., `rf-hint--in-hero`, `rf-hero--in-feature`). Components registered in the theme registry (`packages/lumina/sveltekit/registry.ts`) take over rendering entirely for their typeof. The line is: static runes get BEM-classed HTML via the identity transform (with context-aware modifiers when nested); interactive runes get a Svelte component. Currently ~17 component types are registered in Lumina; everything else falls through to `svelte:element` rendering.

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
| Content analysis | `packages/content/src/analyze.ts` | `collectRuneTypes()` tree walker + `analyzeRuneUsage()` for site-wide rune usage reports. Walks page renderables and layout regions. |
| CSS tree-shaking | `packages/sveltekit/src/plugin.ts` | Build-time content analysis in `buildStart` hook. Resolves rune types to BEM blocks via theme config, checks CSS file existence, generates selective imports. Dev mode serves all CSS. |
| SvelteKit Vite plugin | `packages/sveltekit/src/plugin.ts` | Virtual modules, content HMR, dev/build mode switching. |
| Content HMR | `packages/sveltekit/src/content-hmr.ts` | Watches content directory, triggers Vite HMR on file changes. |
| Theme manifest | `packages/lumina/sveltekit/manifest.json` | Lumina SvelteKit adapter: 3 layouts (default, docs, blog), route rules, component mappings. |
| Theme component registry | `packages/lumina/sveltekit/registry.ts` | Maps 17 typeof values to 16 Svelte components (interactive + complex rendering). |
| Syntax highlight transform | `packages/highlight/src/highlight.ts` | `@refrakt-md/highlight` — Shiki-based tree walker. Finds `data-language` elements, highlights with CSS variables theme, sets `data-codeblock`. Pluggable via custom `highlight` function. |
| `refrakt write` CLI | `packages/cli/src/bin.ts`, `packages/cli/src/commands/write.ts` | AI content generation command. |
| AI prompt generation | `packages/ai/src/prompt.ts` | System prompt for AI content writing with rune context. |
| AI provider abstraction | `packages/ai/src/provider.ts`, `packages/ai/src/providers/` | Anthropic, Gemini, and Ollama providers. |

### Partially Built

| What | Current State | What Is Missing |
|---|---|---|
| **Production rendering** | Uses SvelteKit prerender via catch-all `[...slug]` route. Works, produces static HTML. | No explicit page file generation. No pre-processed route tree. Context is resolved at runtime via Svelte context, not at build time. Code splitting is framework-default, not rune-aware. |
| **Rune self-description** | `RuneDescriptor` provides name, aliases, description, reinterprets map, seoType. | Attribute definitions (what attributes a rune accepts, their types, defaults) are embedded in Markdoc `Schema` objects and not exposed in a way that AI or themes can introspect at runtime. |
| **Component registry** | Works: `typeof` attribute -> component lookup via Svelte context. | Flat lookup only. No `contextOverrides` for parent-based component switching. The manifest schema supports the field but nothing reads it. |
| **Lumina theme** | Hand-crafted Svelte components for interactive runes. Identity transform handles static runes. Per-rune CSS files (44) and dark mode tokens are in place. Blog layout with index page and article view. CSS tree-shaking via build-time content analysis. | No critical CSS inlining. |

### Not Built

| What | Notes |
|---|---|
| **Multi-framework adapters** (Astro, Next.js, static HTML) | Currently SvelteKit-only. |
| **React component set** | Only Svelte components exist. |
| **Shared interactive behavior** (vanilla JS core modules) | Interactive logic is embedded in Svelte components, not factored out. |
| ~~**Rune tree-shaking / content analysis manifest**~~ | ~~No build step that scans content and produces a rune usage report.~~ DONE — `packages/content/src/analyze.ts` with `collectRuneTypes()` tree walker and `analyzeRuneUsage()`. Vite plugin runs analysis at `buildStart` and passes `usedCssBlocks` to virtual module for selective CSS imports. |
| **Generated routes** (blog indexes, tag pages, RSS feeds) | Manifest `routeRules` can declare `generated` but nothing processes it. |
| **TypeDoc pipeline** (`refrakt typedoc` command) | Not started. |
| **Quiz / poll / survey runes** | Specified in the original spec but not implemented as rune definitions. |
| **Reference rune** (`{% reference %}` for code documentation) | Not implemented. |
| **Context-aware component switching** | `contextOverrides` in manifest is dead schema -- nothing reads or applies it. CSS-level context modifiers are done (see Q2 above); component-level switching remains unbuilt. |
| **Critical CSS inlining** | No CSS analysis or inlining pipeline. |
| **AI authoring modes** (draft, review, enhance, transform) | Write mode exists with single-file and multi-file (`-d`) support. `modes/` architecture established. Four additional modes designed but not implemented. See Section 13. |
| ~~**Gemini provider**~~ | ~~Anthropic and Ollama exist. Gemini Flash planned as free cloud option.~~ DONE — `packages/ai/src/providers/gemini.ts` with `formatGeminiRequest()` + `parseGeminiSSE()`. Auto-detection: Anthropic > Gemini (`GOOGLE_API_KEY`) > Ollama. |
| **AI theme generation** | `refrakt write` exists for content. No equivalent for themes. See also Section 13 for the broader AI authoring roadmap. |
| ~~**Blog layout**~~ | ~~Lumina has `default` and `docs` layouts only.~~ DONE — BlogLayout with index (post listing sorted by date) and article view, frontmatter metadata display, route rule for `blog` and `blog/**`. |
| ~~**CSS tree-shaking**~~ | ~~Per-rune CSS files exist but all are bundled unconditionally. No content analysis to determine which rune CSS is needed per page.~~ DONE — Build-time content analysis in `packages/sveltekit/src/plugin.ts` (`buildStart` hook). Virtual module generates selective CSS imports for only the rune blocks used in the site. Dev mode unchanged (all CSS for instant feedback). |
| ~~**VS Code extension** (Phase 1: static)~~ | ~~TextMate grammar, snippets, bracket matching, folding. Declarative config only, no runtime code. See Section 12.~~ DONE — `packages/vscode/` with injection grammar for rune syntax highlighting, 46 snippets (66 prefixes with aliases), language configuration for bracket matching and folding. |
| ~~**Language server** (Phase 2: LSP)~~ | ~~Autocompletion, hover docs, diagnostics, validation, cross-file intelligence. Powered by rune registry metadata. See Section 12.~~ DONE — `packages/language-server/` with completion (tag names, attributes, enum values, closing tags), hover docs, and Markdoc-based diagnostics with "did you mean?" suggestions. 58 tests. |

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

### Phase 5 (next): Production Optimization & Missing Runes

This phase covers the work needed to make production output competitive with hand-built sites:

- ~~Split Lumina CSS into per-rune files~~ -- DONE (44 files in `packages/lumina/styles/runes/`)
- ~~Extract identity transform into `@refrakt-md/transform`~~ -- DONE
- ~~Content analysis step that produces a rune usage manifest per page~~ -- DONE (`packages/content/src/analyze.ts`)
- ~~Rune-level CSS tree-shaking based on the usage manifest~~ -- DONE (Vite plugin `buildStart` hook + virtual module conditional CSS generation)
- Per-page code splitting via pre-processed route generation (generate actual `+page.svelte` files)
- ~~Context-aware styling via identity transform BEM modifiers~~ -- DONE (Hint, Feature, CallToAction in Lumina; 7 tests)
- Context-aware component binding at build time (for cases needing different components, not just CSS)
- Add missing runes: quiz, poll/survey, reference
- ~~Add blog layout to Lumina~~ -- DONE (BlogLayout with index page and article view, extended frontmatter pipeline)

### Phase 6: Multi-Framework Support

- Factor interactive behavior out of Svelte components into vanilla JS core modules
- Create React component wrappers for the ~10 interactive runes
- Build Astro adapter (Svelte or React islands with `client:` directives)
- Build Next.js adapter
- Build static HTML adapter with vanilla JS progressive enhancement

### Phase 7: TypeDoc Pipeline

- TypeScript Compiler API for symbol extraction
- Generate `{% reference %}` Markdoc files from TypeScript source
- CLI command `refrakt typedoc`
- Staleness detection for CI (`--validate` mode)
- Auto-generated `_layout.md` with `{% nav %}` for API reference navigation

### Phase 8: Generated Routes & Content Features

- Blog index generation from manifest `routeRules[].generated`
- Tag/category archive pages
- RSS feed generation
- Search index generation
- Client-side search component

### Phase 9: Editor Support (VS Code Extension & Language Server)

Two-phase delivery. See Section 12 for full detail.

**Phase 9a: Static Intelligence** (small effort, declarative only)
- TextMate grammar for rune syntax highlighting (opening, closing, self-closing tags)
- Attribute name/value highlighting within rune tags
- Bracket matching for `{% rune %}` / `{% /rune %}` pairs
- Folding regions for rune blocks
- Snippets for every rune with tabstop and choice syntax
- Publish to VS Code Marketplace and Open VSX once extension icon is created (VSIX packaging ready, `npm run package` in `packages/vscode/`)

**Phase 9b: Language Server** -- DONE
- `@refrakt-md/language-server` — editor-agnostic LSP server (`packages/language-server/`)
- ~~Autocompletion: rune names, attributes, attribute values, closing tags (context-aware)~~ DONE
- ~~Hover documentation generated from rune registry metadata~~ DONE
- ~~Diagnostics: unknown runes, invalid attributes, missing required attrs, with "did you mean?" suggestions~~ DONE
- ~~Fuzzy matching for typo suggestions~~ DONE (Levenshtein distance)
- Document symbols for Outline panel and breadcrumbs (future)
- Quick fix code actions (future)
- Cross-file intelligence: nav references, snippet refs, duplicate slug detection (future)
- Rename support for pages and snippets (future)
- Incremental parsing for performance

### Phase 10: AI Theme Generation

`refrakt write` for content generation exists with Anthropic, Gemini, and Ollama providers. AI theme generation (describe a theme in natural language, get a working theme package) is not built. Depends on a stable theme package format and well-documented `ThemeConfig` API — both prerequisites are addressed by earlier phases.

### Future Rune: `editor`

The `codegroup` rune handles the common case: multiple code fences in a tabbed view. The `editor` rune would handle the power-user case: a grid layout of multiple codegroups arranged like an IDE.

- **Concept:** A layout rune that arranges multiple `codegroup` blocks in a configurable grid
- **Visual:** IDE/editor window metaphor — topbar chrome wrapping a multi-panel workspace
- **Attributes:** `columns`, `rows`, `flow`, `layout` (same grid attributes from `layouts/` module)
- **Authoring (explicit):** Nested `{% codegroup %}` children inside `{% editor %}`
- **Authoring (shorthand):** HR delimiters where each section auto-wraps in a codegroup
- **Example use cases:** Source code + terminal output side-by-side; frontend tabs (React/Vue/Svelte) + API response below; multi-file project view
- **Relationship:** `codegroup` is the leaf (single tabbed code block), `editor` is the container (grid of codegroups) — same pattern as `tab`/`tabs` and `step`/`steps`
- **Type:** New `Editor` type (or reuse `Grid` with code-specific config)
- **Dependencies:** Requires `codegroup` rune (implemented), grid layout infrastructure (exists in `layouts/` module)

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

The theme system uses subpath exports within a single theme package:

1. **`@refrakt-md/transform`** (`packages/transform/`) -- the generic identity transform engine. Provides `createTransform()` and helper utilities. Framework-agnostic, theme-agnostic. Any theme can import this and supply its own `ThemeConfig`.
2. **`@refrakt-md/lumina`** (`packages/lumina/`) -- Lumina's identity layer (config, CSS, design tokens, BEM mappings) plus framework-specific adapters as subpath exports:
   - `@refrakt-md/lumina` -- identity CSS + design tokens (no framework code)
   - `@refrakt-md/lumina/transform` -- identity transform config
   - `@refrakt-md/lumina/sveltekit` -- Svelte components, layouts, registry, manifest

The SvelteKit plugin auto-resolves the adapter from `config.theme + "/" + config.target` (e.g., `@refrakt-md/lumina` + `sveltekit` → `@refrakt-md/lumina/sveltekit`). This means adding a new framework adapter only requires adding a new subpath export — no new packages needed.

`packages/content` handles filesystem concerns: reading files, resolving layouts, building the content tree, routing. `packages/runes` is the shared vocabulary everything depends on. This separation means a different theme can replace lumina entirely without touching content loading, and a React adapter would live at `@refrakt-md/lumina/react` reusing the same identity CSS.

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

**What's built:** Option (c) -- identity-transform-level BEM modifiers. The identity transform (`packages/transform/src/engine.ts`) now threads parent rune context through recursion. When a rune's `RuneConfig` has a `contextModifiers` entry matching the parent rune's `typeof`, an extra BEM modifier class is added (e.g., `rf-hint--in-hero`). Implemented for Hint (Hero, Feature), Hero (Feature), Feature (Hero, Grid), and CallToAction (Hero, Pricing) in Lumina. Context-aware CSS rules in `packages/lumina/styles/runes/*.css`. 7 tests in `packages/transform/test/context-modifiers.test.ts`.

**What's not built:** Component switching via `contextOverrides` in the manifest. Options (a) runtime dispatch and (b) build-time resolution remain unimplemented. If a rune needs a completely different component when nested (not just different CSS), that still requires future work.

**Conclusion:** Most context-sensitive styling is CSS-only. BEM modifiers handle the 80% case. Component switching is rarely needed but remains possible via future manifest support.

### 3. Generated routes

**Problem:** Blog indexes, tag pages, RSS feeds. Should these be a content-layer feature (generated by `packages/content`) or a theme-layer feature (generated by the adapter)?

The manifest `routeRules` has a `generated` field for this, suggesting theme-layer. But the data (post listings, tag groupings) comes from content analysis.

**Leaning toward:** Content layer produces the data (list of posts, tags, dates). Theme layer decides how to render it (what component, what layout). The adapter wires the two together.

### 4. Theme marketplace package format — RESOLVED

Single package with subpath exports. Implemented for Lumina:
```
@refrakt-md/lumina              -> identity layer (CSS + tokens + transform)
@refrakt-md/lumina/sveltekit    -> SvelteKit adapter (Svelte components, layouts, registry)
@refrakt-md/lumina/astro        -> (future) Astro adapter
@refrakt-md/lumina/nextjs       -> (future) Next.js adapter + React components
```

The SvelteKit plugin resolves the adapter automatically: `config.theme` + `"/"` + `config.target`. Framework-specific dependencies (svelte, @sveltejs/kit) are optional peer deps, only needed when importing the corresponding subpath.

### 5. How far to take pre-processed production builds?

**Problem:** The current approach (catch-all route + SvelteKit prerender) works and produces good output. Full pre-processing (generating `+page.svelte` files per content page) adds complexity but enables framework-native code splitting and eliminates runtime component dispatch.

**Question:** Is the complexity worth it now, or should we wait until multi-framework support forces the issue?

**Current answer:** Wait. The catch-all approach works for SvelteKit. Pre-processing becomes necessary when we build the Astro and Next.js adapters, since those frameworks expect real page files.

### 6. Syntax highlighting pipeline position — RESOLVED

**Status:** Implemented. Syntax highlighting has been extracted from the rune level into a dedicated pipeline step via `@refrakt-md/highlight`.

**What was built:**
- **`@refrakt-md/highlight` package** (`packages/highlight/`) — A tree-walking transform that finds elements with `data-language` + text children, highlights them with Shiki, and sets `data-codeblock: true` for raw HTML injection by the Renderer.
- **`data-language` marker convention** — Any element with a `data-language` attribute signals "highlight me." The fence node emits `<pre data-language><code data-language>` with raw text. The diff rune emits per-line `<span data-name="line-content" data-language>` with raw text. The highlight transform finds them generically.
- **Shiki with CSS variables theme** — `createCssVariablesTheme()` produces `style="color: var(--shiki-token-keyword)"` on spans. Token variables (`--shiki-token-keyword`, `--shiki-token-string`, etc.) are mapped in Lumina's `tokens/base.css` and `tokens/dark.css`, fully integrated with the design token system.
- **Pluggable highlighter** — `createHighlightTransform({ highlight: (code, lang) => html })` accepts any custom highlight function. Shiki is the default but not a hard dependency for consumers.
- **Unknown language fallback** — When Shiki doesn't recognize a language, the `catch` block leaves the node unchanged (no `data-codeblock`, Renderer escapes text normally).

**Pipeline position:**
```
Markdoc transform → Serialize → Identity transform → Highlight transform → Renderer
```

**What was removed:**
- `highlight.js` dependency from `@refrakt-md/runes`
- `packages/runes/src/hljs-markdoc.ts` (custom Markdoc hljs language)
- hljs CSS selectors from `packages/lumina/styles/global.css`
- All hljs-specific code from `fence` (`nodes.ts`) and `diff` (`diff.ts`)

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

### Lumina Theme — SvelteKit Adapter (`@refrakt-md/lumina/sveltekit`)

| File | Purpose |
|---|---|
| `packages/lumina/sveltekit/manifest.json` | Theme config: layouts, route rules, component mappings |
| `packages/lumina/sveltekit/registry.ts` | Component dispatch map (17 typeof values -> 16 Svelte components) |
| `packages/lumina/sveltekit/index.ts` | Theme entry point (exports `SvelteTheme` object) |
| `packages/lumina/sveltekit/elements.ts` | Element-level overrides |
| `packages/lumina/sveltekit/tokens.css` | Token bridge (imports identity CSS, aliases legacy variable names) |

### Syntax Highlight Transform (`@refrakt-md/highlight`)

| File | Purpose |
|---|---|
| `packages/highlight/src/highlight.ts` | `createHighlightTransform()` — Shiki-based tree walker, `extractInnerHtml()`, pluggable `highlight` option |
| `packages/highlight/src/index.ts` | Package exports (`createHighlightTransform`, `HighlightOptions`) |

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
| `packages/ai/src/providers/gemini.ts` | Google Gemini Flash provider — free tier cloud option |
| `packages/ai/src/modes/` | (Planned) Mode-specific prompt extensions: write, draft, review, enhance, transform |
| `packages/ai/src/conversation.ts` | (Planned) Multi-turn conversation handler for review/enhance modes |
| `packages/cli/src/commands/draft.ts` | (Planned) `refrakt draft` command |
| `packages/cli/src/commands/review.ts` | (Planned) `refrakt review` command |
| `packages/cli/src/commands/enhance.ts` | (Planned) `refrakt enhance` command |
| `packages/cli/src/commands/transform.ts` | (Planned) `refrakt transform` command |

---

## 8. Component Registry Detail

The Lumina theme registers these components in `packages/lumina/sveltekit/registry.ts`:

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
| `extractRecipe` | `{% recipe %}` with `seoType: 'Recipe'` | `Recipe` with ingredients, steps (`HowToStep`), prep/cook time, yield |
| `extractHowTo` | `{% howto %}` with `seoType: 'HowTo'` | `HowTo` with tools (`HowToTool`), steps (`HowToStep`), totalTime |
| `extractEvent` | `{% event %}` with `seoType: 'Event'` | `Event` with start/end date, location (`Place`), url |
| `extractPerson` | `{% cast %}` with `seoType: 'Person'` | `Person` per cast member (name + jobTitle); returns array for multiple members |
| `extractOrganization` | `{% organization %}` with `seoType: 'Organization'` | `Organization` (or sub-type via `type` attribute: LocalBusiness, Corporation, etc.) |
| `extractDataset` | `{% datatable %}` with `seoType: 'Dataset'` | `Dataset` with name + description |

All runes with `seoType` now have matching extractors. The `Extractor` type supports returning `object | object[]` to handle runes like `{% cast %}` that produce multiple JSON-LD entries.

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
7. Syntax highlight transform (packages/highlight/src/highlight.ts)
   (walks tree, finds elements with data-language + text children, applies Shiki, sets data-codeblock)
   |
   v
8. SvelteKit load function returns: { renderable, regions, seo, title, ... }
   |
   v
9. ThemeShell.svelte
   (selects layout via route rules, injects SEO head tags)
   |
   v
10. Layout component (e.g. DocsLayout.svelte)
    (receives regions + renderable, places them in slots)
    |
    v
11. Renderer.svelte (recursive)
    (for each tag: check typeof -> look up component in registry ->
     if found: render component, else: render svelte:element with BEM classes)
    |
    v
12. DOM
```

---

## 11. What to Work on Next

This section captures the current priority order. Update it as things change.

**Immediate (before any new features):**
- ~~Write missing SEO extractors for HowTo, Recipe, Event, Person, Organization, Dataset~~ -- DONE (all 6 extractors added to `seo.ts`, see Section 9)

**Short term:**
- ~~Split Lumina CSS into per-rune files~~ -- DONE (tree-shaking itself is still pending)
- ~~Add a blog layout to Lumina~~ -- DONE
- ~~Context-aware BEM modifiers at the identity transform level~~ -- DONE
- ~~Align Hero and CTA runes~~ -- DONE (Hero gains fence/Command + LinkItem support; CTA simplified to focused action block, split/showcase removed; unified action pattern across both)
- Extend `contextModifiers` to more runes as styling needs emerge
- ~~CSS tree-shaking: use content analysis manifest to include only the per-rune CSS files needed per page~~ -- DONE
- ~~Extract syntax highlighting from rune level into a dedicated pipeline step~~ -- DONE (`@refrakt-md/highlight` package, see Open Question #6)
- ~~VS Code extension Phase 1 (TextMate grammar, snippets, bracket matching)~~ -- DONE (`packages/vscode/`, injection grammar + 46 snippets + language config)

**Medium term:**
- ~~Content analysis step (scan all content, produce rune usage manifest)~~ -- DONE (`analyzeRuneUsage()` in `@refrakt-md/content`)
- AI authoring modes: enhance + review (Section 13) — requires multi-turn conversation handler + rune attribute introspection (Open Question #1)
- Pre-processed route generation for production builds
- Quiz, poll/survey, reference rune implementations
- ~~Language server (Phase 9b)~~ -- DONE (`packages/language-server/`, completion + hover + diagnostics, 58 tests)

**Long term:**
- Multi-framework support (React components, Astro adapter, Next.js adapter)
- AI theme generation
- TypeDoc pipeline
- Generated routes (blog indexes, tag pages, RSS)

---

## 12. Editor Support — VS Code Extension & Language Server

> **Packages:** `@refrakt-md/vscode` (VS Code extension), `@refrakt-md/language-server` (LSP server, editor-agnostic)
> **Status:** Phase 1 (static) and Phase 2 (language server core) complete
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

> **Resolved:** Attribute introspection uses `rune.schema.attributes` directly from Markdoc `Schema` objects — no changes to `RuneDescriptor` needed.

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

---

## 13. AI Authoring Modes

> **Packages:** `@refrakt-md/ai` (prompts + conversation handler), `@refrakt-md/cli` (commands)
> **Status:** Write mode implemented; four additional modes designed but not built

### Overview

The current `refrakt write` command operates in a single mode: generate complete content from a description. This covers one use case (documentation, technical content) but misses how most authors actually want to work with AI. The AI layer should support five distinct modes, each with its own system prompt, interaction pattern, and output expectations.

| Mode | Command | Interaction | Who It's For |
|---|---|---|---|
| **Write** | `refrakt write` | One-shot | Developers documenting software, generating reference content, product pages |
| **Draft** | `refrakt draft` | Brief Q&A → one-shot | Bloggers, content marketers wanting a structured starting point |
| **Review** | `refrakt review` | Conversational | Authors with a strong voice who want editorial feedback |
| **Enhance** | `refrakt enhance` | Conversational | Authors with plain Markdown who want rune upgrade suggestions |
| **Transform** | `refrakt transform` | One-shot | Migration from external formats (HTML, Confluence, Google Docs) |

---

### Write Mode (exists)

**Command:** `refrakt write "API reference for the auth module" --source ./src/auth`

**Interaction:** One-shot. User describes what they want, AI generates complete content with appropriate runes.

**System prompt emphasis:** Completeness, accuracy, correct rune selection, proper attribute usage. The AI should produce content that is ready to publish with minimal editing.

**Output:** A single `.md` file (`-o`) or multiple files to a directory (`-d`).

**Multi-file mode:** `refrakt write -d content/ "Set up a docs site with index, guides, and blog"` generates multiple files using `--- FILE: path ---` markers in the AI output. The mode-specific prompt additions live in `packages/ai/src/modes/write.ts`, establishing the `modes/` architecture for future authoring modes.

**Current state:** Implemented in `packages/cli/src/commands/write.ts` with base system prompt in `packages/ai/src/prompt.ts` and write mode additions in `packages/ai/src/modes/write.ts`.

---

### Draft Mode (not built)

**Command:** `refrakt draft "blog post about why we chose Markdoc over MDX"`

**Interaction:** Brief upfront Q&A (3-5 questions) followed by one-shot generation.

Before generating, the AI asks targeted questions to understand the author's intent:

```
refrakt draft "blog post about our migration to refrakt.md"

AI: Before I draft this, a few questions:

1. What's the main takeaway you want readers to leave with?
2. What was the biggest challenge in the migration?
3. Any specific metrics or results to highlight?
4. Casual/personal tone or more professional?

> 1. That content-first development is faster than component-first
> 2. Getting the team to think in runes instead of components
> 3. 40% reduction in build time, 3x faster content updates
> 4. Casual, first-person

AI: Writing draft...
```

**System prompt emphasis:** Structure and flow over completeness. The AI generates a well-organized draft with `TODO` markers where the author should add personal details, specific examples, opinions, or data they haven't shared. The draft provides the skeleton — the author provides the soul.

**Design note:** The Q&A questions should be dynamic based on content type detection. A recipe draft needs "What cuisine? How many servings?" while a blog post needs "What's your main takeaway?" The mode prompt should include content-type detection logic to tailor the questions.

**Output markers:**

```markdoc
{% section %}

We started evaluating refrakt.md in <!-- TODO: when did you start? --> after
hitting a wall with our previous setup.

<!-- TODO: Describe the specific pain point that triggered the evaluation.
     What broke or frustrated the team? Personal anecdote works well here. -->

The migration took about <!-- TODO: timeline --> and involved
<!-- TODO: team size --> engineers working part-time on the transition.

{% /section %}
```

**Output:** A `.md` file with content structure, rune selections, and clearly marked TODO placeholders. The file is valid Markdoc — it renders as-is but is visibly incomplete.

---

### Review Mode (not built)

**Command:** `refrakt review content/blog/my-post.md`

**Interaction:** Conversational. The AI reads the file, presents findings, and the author can discuss, accept, or reject suggestions interactively.

```
refrakt review content/blog/my-post.md

AI: I've reviewed your post. Here are my observations:

STRUCTURE
1. The opening is strong but the transition between the problem
   statement (lines 12-18) and your solution (line 19) is abrupt.
   Consider adding a bridging paragraph.

RUNE OPPORTUNITIES
2. Lines 34-52: This feature comparison as a plain table would be
   more effective as {% comparison highlighted="refrakt.md" %} —
   it would generate Product schema and enable visual highlighting
   of the recommended option.

3. Lines 67-78: The FAQ section at the bottom should use {% faq %}
   instead of plain headings. This generates FAQPage schema which
   can surface as rich results in Google.

SEO
4. No explicit excerpt in frontmatter. The first paragraph will be
   used for og:description — currently that's "In this post we'll
   explore..." which is generic. Consider a more specific excerpt.

READING FLOW
5. The post is 2,400 words. The middle section (lines 40-65) is
   dense with no visual breaks. A {% callout %} or pull quote
   would help pacing.

Apply suggestion 2? [y/n/skip/all/quit]
> y

AI: Restructured lines 34-52 as {% comparison %}. The content is
preserved but now uses the comparison rune with aligned feature rows.

Apply suggestion 3? [y/n/skip/all/quit]
> y

...
```

**System prompt emphasis:** Act as an experienced editor, not a rewriter. Critique structure, pacing, rune usage, SEO opportunities, and readability. Never rewrite the author's voice — suggest structural changes. Deep knowledge of every rune's capabilities is essential so the AI can spot opportunities the author missed.

**Key capabilities the prompt must cover:**
- Identify content patterns that match specific runes (lists that should be comparisons, Q&A pairs that should be FAQs, step sequences that should be howtos)
- Evaluate reading flow and pacing
- Check frontmatter completeness (date, tags, excerpt, image)
- Assess SEO opportunities based on rune-to-schema mappings
- Flag accessibility concerns (image alt text, heading hierarchy)

**Implementation note:** Suggestions are applied sequentially, not batched. Each application triggers a follow-up message to the AI with the updated file content so subsequent suggestions account for line-number shifts from earlier changes.

**Flags:** `--dry-run` dumps all suggestions to stdout without applying any — useful for CI pipelines or pre-commit hooks ("lint my content for rune opportunities").

**Output:** Modifications applied to the original file in place (with git-friendly diffs). The author's voice and content are preserved — only structure and rune usage change.

---

### Enhance Mode (not built)

**Command:** `refrakt enhance content/docs/getting-started.md`

**Interaction:** Conversational. Similar to review mode but focused specifically on upgrading plain Markdown to rune-powered content.

```
refrakt enhance content/docs/getting-started.md

AI: This file is mostly plain Markdown. I found 6 opportunities
to enhance it with runes:

1. Lines 5-8: The intro paragraph + heading would work well as
   {% hero align="left" %} — gives it visual weight and
   generates og:title automatically.

2. Lines 15-30: This code example with explanation could be
   wrapped in {% codegroup %} if you add the equivalent in
   another language, or left as-is if single-language is fine.

3. Lines 35-50: The "Prerequisites" section is a plain list.
   Wrapping it in {% callout type="info" %} would visually
   distinguish it as a requirement block.

4. Lines 55-80: These numbered steps are a natural fit for
   {% howto %} — this would generate HowTo schema for Google
   and structure the steps with proper semantics.

5. Lines 82-95: The warning paragraph should be
   {% callout type="warning" %} to ensure it stands out visually.

6. Lines 100-120: The closing "Next Steps" section with links
   could be a {% nav %} block for consistent site navigation.

Apply all? [y/n/pick/quit]
> pick
Which suggestions? (comma-separated): 1,3,4,5
```

**System prompt emphasis:** Deep knowledge of every rune in the library — what it does, what Markdown patterns it matches, what SEO schema it produces, how it composes with other runes. The AI's job is to be a rune expert that sees opportunities the author doesn't know exist.

The prompt should include the full `RuneDescriptor` metadata for every rune, including the `reinterprets` map. This lets the AI match content patterns to runes: "you have a heading followed by an unordered list followed by an ordered list followed by a blockquote — that's exactly the pattern `{% recipe %}` reinterprets."

**Flags:** `--dry-run` (same as review mode) for CI/linting use.

**Output:** The original file with rune wrappers applied around existing content. The prose is untouched — only rune tags and attributes are added.

---

### Transform Mode (not built)

**Command:** `refrakt transform --from html ./exported-page.html`

**Interaction:** One-shot. Input format specified via `--from` flag.

**Supported source formats:**
- `html` — Raw HTML (from CMS exports, web scraping)
- `confluence` — Confluence export format
- `notion` — Notion export (Markdown with Notion-specific syntax)
- `docx` — Word document (extract text + structure). **Note:** Requires a parsing dependency such as `mammoth.js` for document-to-HTML conversion.
- `markdown` — Plain Markdown without runes (upgrade to Markdoc with runes)

**System prompt emphasis:** Structural analysis of the source content. Map the source's structure to the most appropriate runes. Preserve all content — nothing should be lost in transformation. Handle messy input gracefully (inconsistent formatting, inline styles, broken nesting).

**Output:** A `.md` file with Markdoc content using appropriate runes. For large sources, may produce multiple files with a suggested directory structure.

---

### Implementation Architecture

All modes share the same AI provider layer (`packages/ai/src/provider.ts`) and base system prompt (`packages/ai/src/prompt.ts`). Each mode extends the base with mode-specific instructions.

```
packages/ai/
├── src/
│   ├── prompt.ts              ← base system prompt (rune vocabulary, project context)
│   ├── modes/
│   │   ├── write.ts           ← write mode prompt additions (exists — multi-file instructions)
│   │   ├── draft.ts           ← draft mode prompt + Q&A flow
│   │   ├── review.ts          ← review mode prompt + suggestion format
│   │   ├── enhance.ts         ← enhance mode prompt + pattern matching instructions
│   │   └── transform.ts       ← transform mode prompt + source format handling
│   ├── conversation.ts        ← multi-turn conversation handler (for review/enhance)
│   ├── provider.ts            ← AI provider interface (exists)
│   └── providers/
│       ├── anthropic.ts       ← (exists)
│       └── ollama.ts          ← (exists)

packages/cli/
├── src/
│   └── commands/
│       ├── write.ts           ← (exists)
│       ├── draft.ts
│       ├── review.ts
│       ├── enhance.ts
│       └── transform.ts
```

### Conversation Handler

Review and enhance modes require multi-turn conversations. The conversation handler manages:

- Maintaining message history across turns
- Parsing AI suggestions into structured objects (suggestion ID, affected lines, proposed change)
- Applying accepted suggestions to the file sequentially (each application re-indexes line numbers via a follow-up AI message with the updated file)
- Presenting the interactive prompt (y/n/skip/all/quit/pick)
- Generating diffs for each applied suggestion

```typescript
interface Suggestion {
  id: number;
  category: 'structure' | 'rune' | 'seo' | 'readability' | 'accessibility';
  lines: [number, number];       // affected line range
  description: string;
  proposedChange?: string;       // the actual modification (if applicable)
}
```

The AI returns suggestions in a structured format (prompted to use a specific schema). The CLI parses these, presents them interactively, and applies the accepted ones. Each application triggers a follow-up message to the AI with the updated file content so subsequent suggestions account for earlier changes.

### Rune Metadata in Prompts

All modes benefit from rune self-description. The base system prompt should include, for every rune:

- Name and aliases
- Description
- Category
- Accepted attributes (types, defaults, required/optional) — **requires solving Open Question #1 (rune attribute introspection)**
- Reinterpretation map (what each Markdown primitive means inside this rune)
- SEO type and schema.org mapping
- Composition hints (what runes work well inside or around this one)

This metadata comes from `RuneDescriptor` and the rune registry. Solving the attribute introspection gap (exposing attribute definitions through `RuneDescriptor`) directly improves the quality of every AI mode — especially enhance and review, where the AI needs to suggest correct attribute usage.

### Priority

| Mode | Priority | Depends On |
|---|---|---|
| Write | Done | — |
| Enhance | High | Rune attribute introspection (Open Question #1) |
| Review | High | Multi-turn conversation handler |
| Draft | Medium | Multi-turn conversation handler (for Q&A) |
| Transform | Low | Nothing — but lower value until adoption grows |

Enhance and review are highest priority because they're the most differentiated. Any AI can generate content (write mode). No other tool can review content and suggest rune-specific improvements — that requires deep knowledge of the rune vocabulary that only refrakt.md's AI layer has.

---

### Provider Roadmap

The provider system supports three providers:

| Provider | Env Var | Cost | Default Model | Streaming Format |
|---|---|---|---|---|
| **Anthropic** | `ANTHROPIC_API_KEY` | Paid | `claude-sonnet-4-5-20250929` | SSE (`content_block_delta` events) |
| **Google Gemini** | `GOOGLE_API_KEY` | Free tier (15 RPM, 1M TPM, 1500 RPD) | `gemini-2.0-flash` | SSE (`candidates[0].content.parts[0].text`) |
| **Ollama** | `OLLAMA_HOST` | Free (local) | `llama3.2` | NDJSON (`message.content`) |

**Auto-detection priority:**

```
1. ANTHROPIC_API_KEY → Anthropic (paid, highest quality)
2. GOOGLE_API_KEY    → Gemini Flash (free tier, good quality)
3. OLLAMA_HOST       → Ollama (local, any model)
4. Default           → Ollama at localhost:11434
```

**Gemini implementation** (`packages/ai/src/providers/gemini.ts`):
- Factory + `formatGeminiRequest()` + `parseGeminiSSE()`
- API endpoint: `https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent?alt=sse&key={apiKey}`
- System messages handled via Gemini's `systemInstruction` field (similar to Anthropic's separate system field)
- Role mapping: `assistant` → `model` (Gemini uses `user` and `model` roles)

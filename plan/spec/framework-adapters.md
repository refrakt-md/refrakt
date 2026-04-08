{% spec id="SPEC-030" status="accepted" tags="frameworks, astro, architecture" %}

# Framework Adapter System

> Extend refrakt beyond SvelteKit to support Astro, Next.js, Eleventy, and Nuxt — four framework adapters built on the existing framework-agnostic core. This spec defines the shared prerequisites, per-adapter scope, and phased delivery plan derived from ADR-001 (Astro readiness) and ADR-002 (Next.js, Eleventy, Nuxt readiness).

## Background

The architecture investigations in ADR-001 and ADR-002 confirmed that refrakt's core is already framework-agnostic. Over 15,000 lines across `types`, `transform`, `runes`, `content`, `behaviors`, `highlight`, and lumina CSS are reusable as-is. Each adapter requires only 145–220 lines of new code. No core architectural changes are needed.

SPEC-013 delivered the layout transform that eliminated framework-specific layout components — the single biggest prerequisite for multi-framework support. With `layoutTransform()`, `renderToHtml()`, and an empty component registry, every framework can render the full rune and layout pipeline from pure functions.

## Scope

This spec covers:

1. **Shared utility extraction** — moving framework-agnostic code out of `@refrakt-md/svelte`
2. **Four framework adapter packages** — `@refrakt-md/astro`, `@refrakt-md/next`, `@refrakt-md/nuxt`, `@refrakt-md/eleventy`
3. **Per-adapter Lumina theme wiring** — CSS injection and theme config for each framework
4. **Validation** — example sites proving each adapter works end-to-end

Out of scope: new rune features, new computed content types, CSS tree-shaking optimizations (Phase 2 per ADR-002), content HMR for non-Vite frameworks.

---

## Phase 0: Shared Utility Extraction

Two modules in `@refrakt-md/svelte` are framework-agnostic and needed by all adapters.

### serialize.ts

`packages/svelte/src/serialize.ts` (~24 lines) converts Markdoc `Tag` class instances to plain `SerializedTag` objects. Zero Svelte imports — depends only on `@markdoc/markdoc`.

**Move to:** `packages/transform/src/serialize.ts`
**Re-export from:** `@refrakt-md/svelte` (backward compatibility, no breaking change)

### matchRouteRule()

`packages/svelte/src/route-rules.ts` (~31 lines) does pure pattern matching against `RouteRule[]`. Zero Svelte imports.

**Move to:** `packages/transform/src/route-rules.ts`
**Re-export from:** `@refrakt-md/svelte` (backward compatibility, no breaking change)

### Acceptance criteria

- Both modules live in `@refrakt-md/transform` and are exported from its public API
- `@refrakt-md/svelte` re-exports them — existing consumers see no change
- All existing tests pass without modification

---

## Phase 1: Astro Adapter (`@refrakt-md/astro`)

Astro is the highest-priority target. It's SSR/SSG-first, MPA by default, and structurally the simplest adapter — no SPA cleanup, no hydration concerns, no reactive lifecycle.

### Rendering strategy

Use `renderToHtml()` directly. Since the component registry is empty, there's no need for a recursive `Renderer.astro` component. Content is injected via Astro's `set:html` directive.

If the component registry gains entries in the future, a recursive `Renderer.astro` using `Astro.self` can be added as an upgrade path.

### Package structure

```
packages/astro/
├── src/
│   ├── integration.ts       # Astro integration (CSS injection, config reading, HMR)
│   ├── BaseLayout.astro     # Page wrapper (layout selection + SEO + behavior init)
│   ├── types.ts             # AstroTheme interface
│   └── index.ts             # Public exports
├── package.json             # peer dep: astro@^5.0.0
└── tsconfig.json
```

### Integration (`integration.ts`)

An Astro integration registered via `astro:config:setup` that:

- Reads `refrakt.config.json` for package configuration
- Injects Lumina CSS (tokens + rune styles) via `injectScript` or Vite config extension
- Sets up content HMR using Vite's `server.watcher` API (Astro runs on Vite)
- Configures SSR noExternal for refrakt packages (same `CORE_NO_EXTERNAL` list as SvelteKit plugin)

### BaseLayout.astro

A page wrapper component that:

- Calls `matchRouteRule()` to select the appropriate `LayoutConfig`
- Calls `layoutTransform()` to produce the full page tree
- Renders `<head>` with SEO meta tags (native HTML — simpler than `<svelte:head>`)
- Calls `renderToHtml()` and injects via `set:html`
- Adds a `<script>` block that imports and calls `initRuneBehaviors()`, `initLayoutBehaviors()`, and `registerElements()` from `@refrakt-md/behaviors`
- Sets `RfContext` properties (pages, currentUrl) for web components

### Content loading

`getStaticPaths()` is the natural fit — `loadContent()` already produces all page data at build time. Each page becomes a static path entry.

### Lumina adapter

`packages/lumina/astro/index.ts` — exports theme config reusing `defaultLayout`, `docsLayout`, `blogArticleLayout` from the transform package's layout configs, plus a reference to the CSS entry point.

### Behavior initialization

MPA model — each page load is a fresh DOM. Call `initRuneBehaviors()` and `initLayoutBehaviors()` in a `<script type="module">`. No cleanup functions needed. For View Transitions, listen to the `astro:page-load` event.

### Compatibility notes

**`@astrojs/markdoc` coexistence:** The adapter replaces `@astrojs/markdoc`, it does not supplement it. Refrakt needs the full schema transform pipeline (rune models, content models, meta tag injection) which cannot be expressed as simple Markdoc tag registrations. Users who want a lighter integration — rune transforms within Astro's existing `@astrojs/markdoc` pipeline and content collections — should use `@refrakt-md/vite` (SPEC-031) instead, which operates at the per-file transform level and leaves Astro's content system intact.

**Astro content collections:** This adapter uses `loadContent()` + `getStaticPaths()`, bypassing Astro's native content collections. This is intentional — the refrakt content pipeline (entity registry, cross-page aggregation, layout cascade) provides richer cross-page features than content collections alone. Users who prefer to keep Astro content collections as their content system can use the `@refrakt-md/vite` plugin (SPEC-031) at Level 1 or 2 within their existing Astro project.

**View Transitions:** When Astro View Transitions are enabled, behavior initialization must re-run after each navigation. The behavior init script should listen to the `astro:page-load` event rather than relying solely on initial page load.

**Islands-aware behavior loading:** Since Astro ships zero JS by default, the behavior script should only be included on pages that use interactive runes (tabs, accordion, datatable). The integration can check the page's rune metadata to conditionally include the behavior `<script>` tag, avoiding unnecessary JS on static-only pages.

### Estimated size: ~205 lines

---

## Phase 2: Nuxt Adapter (`@refrakt-md/nuxt`)

Nuxt is closest to SvelteKit — Vite-based, file-system routing, SSR with Nitro. The existing SvelteKit Vite plugin logic can be substantially reused.

### Rendering strategy

`renderToHtml()` + Vue's `v-html` directive in a `RefraktContent.vue` component. Same rationale as Astro: empty component registry means no recursive renderer needed.

The Vue compiler must be configured to treat `rf-*` as custom elements: `nuxt.options.vue.compilerOptions.isCustomElement = (tag) => tag.startsWith('rf-')`.

### Package structure

```
packages/nuxt/
├── src/
│   ├── module.ts              # Nuxt module (Vite plugin, CSS, auto-imports, transpile list)
│   ├── vite-plugin.ts         # Adapted Vite plugin (reuses virtual module + HMR logic)
│   ├── RefraktContent.vue     # v-html rendering component
│   ├── composables/
│   │   └── useRefraktMeta.ts  # SEO composable wrapping useHead()
│   └── index.ts               # Public exports
├── package.json               # peer dep: nuxt@^3.0.0
└── tsconfig.json
```

### Nuxt module

Registered via `defineNuxtModule`. Responsibilities:

- Registers the adapted Vite plugin (virtual modules, content HMR — same watcher pattern)
- Injects Lumina CSS via `nuxt.options.css`
- Adds refrakt packages to `nuxt.options.build.transpile` for Nitro compatibility
- Auto-imports `useRefraktMeta` composable via `addImports`
- Configures Vue custom element handling for `rf-*` tags

### SEO: `useRefraktMeta()` composable

Wraps Nuxt's `useHead()` with the SEO data already produced by the content system. Maps `page.seo.og.*` to Open Graph meta tags and `page.seo.jsonLd` to structured data scripts.

### Content loading

Catch-all route `pages/[...slug].vue` using `useAsyncData()` to call `loadContent()` + `layoutTransform()` on the server.

### Behavior initialization

Vue lifecycle: `onMounted()` to initialize, `onBeforeUnmount()` to clean up. Watch `route.path` to re-initialize on client-side navigation via `nextTick`.

### Vite plugin reuse

The SvelteKit Vite plugin hooks are mostly framework-agnostic:

| Hook | Reusable? |
|------|-----------|
| `config()` — SSR noExternal | Yes, same package list |
| `buildStart()` — CSS tree-shaking analysis | Yes, same logic |
| `resolveId()`/`load()` — virtual modules | Adapt import paths from `lumina/svelte` → `lumina/nuxt` |
| `configureServer()` — content HMR | Yes, same Vite watcher API |

### Estimated size: ~220 lines

---

## Phase 3: Next.js Adapter (`@refrakt-md/next`)

Next.js has the largest potential audience. React Server Components + `renderToHtml()` is a clean fit — zero hydration cost for content.

### Rendering strategy

`renderToHtml()` + `dangerouslySetInnerHTML` in a React Server Component (`RefraktContent`). This completely sidesteps React's custom element issues since the HTML is a raw string that React never processes as components.

No `'use client'` directive on the content component — it's server-only.

### Package structure

```
packages/next/
├── src/
│   ├── RefraktContent.tsx     # Server Component — renderToHtml wrapper
│   ├── BehaviorInit.tsx       # Client Component — behavior + web component init
│   ├── metadata.ts            # generateMetadata() helper
│   ├── loader.ts              # loadContent wrapper for Next.js patterns
│   └── index.ts               # Public exports
├── package.json               # peer dep: next@^14.0.0 || ^15.0.0
└── tsconfig.json
```

### RefraktContent (Server Component)

~15 lines. Calls `renderToHtml(tree)` and renders via `<div dangerouslySetInnerHTML={{ __html: html }} />`. No hydration, no client JS for content.

### BehaviorInit (Client Component)

~25 lines. Marked `'use client'`. Uses `useEffect` to call `initRuneBehaviors()`, `initLayoutBehaviors()`, `registerElements()`, and set `RfContext`. Returns cleanup functions from `useEffect`.

### SEO: `generateMetadata()`

Maps to Next.js App Router's `generateMetadata()` export. Helper function transforms the content system's SEO data into Next.js `Metadata` objects.

### Content loading

`generateStaticParams()` for static paths from `loadContent()`. Content loaded directly in the async Server Component — no API route needed.

### CSS injection

Import `@refrakt-md/lumina` in `app/layout.tsx`. Next.js handles global CSS imports natively. No virtual modules needed.

### Content HMR

Phase 1: No custom HMR — rely on Next.js dev server's default behavior. Content changes trigger re-rendering on next request.

Phase 2 (future): Custom Webpack/Turbopack plugin watching the content directory.

### Estimated size: ~170 lines

---

## Phase 4: Eleventy Adapter (`@refrakt-md/eleventy`)

Eleventy is the simplest integration. No Vite, no bundler, no framework — just template-driven static site generation. `renderToHtml()` was practically designed for template engines.

### Rendering strategy

Global data file calls the entire refrakt pipeline at build time. Each page gets pre-rendered HTML that's injected into a Nunjucks template via `| safe` filter. No component, no renderer — just functions and templates.

### Package structure

```
packages/eleventy/
├── src/
│   ├── plugin.js              # Eleventy plugin (passthrough copy, config)
│   ├── data.js                # Global data file factory (loadContent + transform)
│   └── index.js               # Public exports
├── templates/
│   └── base.njk               # Example base template
├── package.json               # peer dep: @11ty/eleventy@^3.0.0
└── tsconfig.json
```

### Integration model: Global data + Pagination

A global data file (`_data/refrakt.js`) calls `loadContent()`, runs `createTransform()` + `layoutTransform()` + `renderToHtml()` for each page, and returns an array of page objects with pre-rendered HTML.

Eleventy pagination creates one output page per content item. The template receives complete HTML — no rendering logic needed in the template layer.

### Layout system interaction

Eleventy's layout chaining and refrakt's `layoutTransform()` operate at different levels:

- **Refrakt layouts** produce the inner page structure (sidebar, content, TOC, breadcrumbs)
- **Eleventy layouts** provide the outer HTML shell (`<html>`, `<head>`, `<body>`, scripts)

No conflict — Eleventy wraps refrakt's output.

### CSS injection

No bundler means no CSS imports. Use Eleventy's passthrough file copy to serve Lumina's CSS from `node_modules`. Referenced via `<link>` in the base template.

### Behavior initialization

Static MPA model. `<script type="module">` in the base template imports and calls behavior init functions. The `@refrakt-md/behaviors` package needs to be either bundled (via a simple esbuild step) or served from `node_modules` via passthrough copy.

### Content separation

Content lives in a directory that Eleventy does **not** discover as templates. The data file approach means Eleventy treats content as pure data — refrakt handles all Markdoc parsing. No collision with Eleventy's own Markdown-it pipeline.

### Eleventy 3.0 compatibility

Eleventy 3.0 is ESM-native. All refrakt packages use `"type": "module"`. No CJS compatibility issues.

### Estimated size: ~145 lines

---

## Cross-Adapter Comparison

| Concern | Astro | Next.js | Nuxt | Eleventy |
|---------|-------|---------|------|----------|
| **Rendering** | `renderToHtml()` + `set:html` | `renderToHtml()` + RSC | `renderToHtml()` + `v-html` | `renderToHtml()` + template |
| **SEO** | Native `<head>` | `generateMetadata()` | `useHead()` composable | Template `<head>` |
| **Behavior init** | `<script>` | `useEffect` (client) | `onMounted()` | `<script>` |
| **Behavior cleanup** | N/A (MPA) | `useEffect` return | `onBeforeUnmount()` | N/A (MPA) |
| **CSS injection** | Integration API | `import` in layout | `nuxt.options.css` | Passthrough copy |
| **Content HMR** | Vite watcher | Dev server default | Vite watcher | `--serve` live reload |
| **Build tool** | Vite | Webpack/Turbopack | Vite (Nitro) | None |
| **Integration type** | Astro integration | npm package | Nuxt module | Eleventy plugin |
| **Content loading** | `getStaticPaths()` | `generateStaticParams()` | `useAsyncData()` | Global data file |
| **Estimated lines** | ~205 | ~170 | ~220 | ~145 |

---

## Risks and Mitigations

| Risk | Frameworks | Mitigation |
|------|-----------|------------|
| React hydration mismatch warnings | Next.js | `renderToHtml()` + `dangerouslySetInnerHTML` bypasses hydration entirely |
| Nuxt Content module confusion | Nuxt | Document that `@refrakt-md/nuxt` replaces Nuxt Content, not supplements it |
| Eleventy Markdown-it collision | Eleventy | Data file approach means Eleventy never processes `.md` through its own pipeline |
| `Astro.self` recursion depth | Astro | Using `renderToHtml()` avoids recursive component entirely |
| Bundling behaviors for Eleventy | Eleventy | Simple esbuild step or passthrough copy from node_modules |
| Content HMR latency in Next.js | Next.js | Full page reload on content change is acceptable initially |

No architectural blockers for any framework.

---

## Delivery Order and Rationale

**Phase 0 → Phase 1 (Astro) → Phase 2 (Nuxt) → Phase 3 (Next.js) → Phase 4 (Eleventy)**

- **Astro first**: Simplest adapter (MPA, no SPA concerns), confirms the multi-framework story works end-to-end, SSG-focused audience aligns with refrakt's content-first positioning
- **Nuxt second**: Closest to SvelteKit (Vite-based, same plugin patterns), highest code sharing from existing adapter, expands to Vue ecosystem
- **Next.js third**: Largest audience, different build tooling (Webpack/Turbopack) provides good architectural validation, RSC is a clean fit
- **Eleventy last**: Simplest integration but smallest audience, good final validation that the architecture works with a non-Vite, non-framework tool

Each phase is independently shippable. Phase 0 is a prerequisite for all others. Phases 1–4 have no dependencies on each other.

### Total estimated new code

| Phase | Lines |
|-------|-------|
| Phase 0: Shared extraction | ~20 |
| Phase 1: Astro | ~205 |
| Phase 2: Nuxt | ~220 |
| Phase 3: Next.js | ~170 |
| Phase 4: Eleventy | ~145 |
| **Total** | **~760** |

Compare to ~15,000+ lines of framework-agnostic code reused across all adapters.

---

## Validation Strategy

Each adapter needs an example site that proves end-to-end functionality:

1. **Rune rendering** — all core runes produce correct HTML with BEM classes and data attributes
2. **Layout transform** — docs layout with sidebar, breadcrumbs, TOC; default layout for simple pages
3. **Behaviors** — tabs, accordion, copy button, mobile menu all attach and function
4. **Web components** — `rf-diagram`, `rf-nav` render and connect to `RfContext`
5. **SEO** — Open Graph meta tags and JSON-LD structured data appear in page source
6. **Community packages** — at least one community rune package loads and renders correctly

Example sites should use the same `site/content/` directory (or a representative subset) to enable visual comparison across frameworks.

---

## References

- ADR-001 — Astro Readiness Investigation
- ADR-002 — Framework Readiness Investigation: Next.js, Eleventy, Nuxt
- SPEC-013 — Multi-Framework Support: Layout Transform Architecture

{% /spec %}

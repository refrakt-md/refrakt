# Framework Readiness Investigation: Next.js, Eleventy, Nuxt

## Context

Refrakt targets SvelteKit as its only framework. The [Astro readiness investigation](./astro-readiness-investigation.md) confirmed that the architecture is ready for a second framework. This document extends the analysis to three more: **Next.js** (React), **Eleventy** (vanilla SSG), and **Nuxt** (Vue) — covering the three largest remaining ecosystems for content-heavy sites.

## Verdicts

| Framework | Verdict | Difficulty | Estimated New Code |
|-----------|---------|------------|-------------------|
| Next.js (App Router + RSC) | **Ready** | Low | ~170 lines |
| Eleventy (11ty v3) | **Ready** | Low | ~145 lines |
| Nuxt (Vue 3 + Nitro) | **Ready** | Low-Medium | ~220 lines |

No blockers for any framework. No core architectural changes needed. Compare ~170-220 lines of new adapter code to ~15,000+ lines of framework-agnostic code being reused.

---

## What's Already Framework-Agnostic (reusable by all three)

Same table as the Astro investigation — nothing has changed:

| Package | Status | Key Exports |
|---------|--------|-------------|
| `@refrakt-md/types` | Fully agnostic | `SerializedTag`, `RendererNode`, `ThemeConfig`, `RefraktConfig` |
| `@refrakt-md/transform` | Fully agnostic | `createTransform()`, `layoutTransform()`, `renderToHtml()` |
| `@refrakt-md/runes` | Fully agnostic | 52 rune schemas, Markdoc tag specs |
| `@refrakt-md/content` | Fully agnostic | `loadContent()`, `ContentTree`, `Router`, layout cascade |
| `@refrakt-md/behaviors` | Fully agnostic | `initRuneBehaviors()`, `initLayoutBehaviors()`, `registerElements()`, 4 web components, `RfContext` |
| `@refrakt-md/highlight` | Fully agnostic | Shiki-based syntax highlighting transform |
| `@refrakt-md/theme-base` | Core agnostic | `baseConfig` (74 rune configs), `defaultLayout`, `docsLayout`, `blogArticleLayout` |
| `@refrakt-md/lumina` CSS | Fully agnostic | Design tokens (`base.css`), 48 per-rune CSS files, `index.css` bundle |

### Key architectural wins already in place

1. **Empty component registry** — All 74 runes render through identity transform. Interactive runes use web components or vanilla JS behaviors. Zero Svelte components needed for rendering.

2. **`renderToHtml()` exists** (`packages/transform/src/html.ts`) — A pure-JS function that renders `SerializedTag` → HTML string. Handles void elements, `data-codeblock` raw HTML, attribute escaping. This is the rendering strategy for all three frameworks.

3. **Layout transform implemented** (`packages/transform/src/layout.ts`) — Declarative `LayoutConfig` objects replace Svelte layout components. `layoutTransform()` produces a complete page tree — any framework can render it.

4. **Behaviors are vanilla JS** — `initRuneBehaviors()` discovers elements by `[data-rune]` attributes, wires DOM event listeners, returns cleanup functions. No framework lifecycle required.

5. **Web components are standard custom elements** — `rf-diagram`, `rf-nav`, `rf-map`, `rf-sandbox` use `connectedCallback`, read from `RfContext` static properties. Work in any HTML environment.

---

## Shared Prerequisites (all frameworks)

Before building any adapter, extract two utilities from `@refrakt-md/svelte` that are already framework-agnostic:

### 1. `serialize()` → `@refrakt-md/transform`

Currently at `packages/svelte/src/serialize.ts` (24 lines). Converts Markdoc `Tag` class instances to plain `SerializedTag` objects. Zero Svelte imports — depends only on `@markdoc/markdoc` (already a transform dependency).

Move to `packages/transform/src/serialize.ts`. Re-export from `@refrakt-md/svelte` for backward compatibility.

### 2. `matchRouteRule()` → `@refrakt-md/transform`

Currently at `packages/svelte/src/route-rules.ts` (31 lines). Pure pattern matching against `RouteRule[]`. Zero Svelte imports — depends only on `RouteRule` type from `@refrakt-md/types`.

Move to `packages/transform/src/route-rules.ts`. Re-export from `@refrakt-md/svelte` for backward compatibility.

### Estimated effort: ~20 lines of re-export glue

---

## Next.js (App Router + React Server Components)

### Verdict: Ready

The architecture maps naturally onto Next.js App Router. The key insight: since `renderToHtml()` exists and the component registry is empty, React Server Components can render all content as static HTML with zero hydration cost. No recursive React component tree needed.

### 1. Rendering: RSC + `renderToHtml()`

React Server Components run on the server only and can call any pure function. `renderToHtml()` is synchronous, pure, and produces complete HTML. The output is injected via `dangerouslySetInnerHTML` — no hydration, no client JS for content.

This completely sidesteps React's well-known issues with custom elements, since `renderToHtml()` outputs `<rf-diagram>`, `<rf-nav>`, etc. as raw HTML strings that React never processes as components.

```tsx
// packages/next/src/RefraktContent.tsx (Server Component — no 'use client')
import { renderToHtml } from '@refrakt-md/transform';
import type { RendererNode } from '@refrakt-md/types';

export function RefraktContent({ tree }: { tree: RendererNode }) {
  const html = renderToHtml(tree);
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
```

**Alternative**: A recursive `Renderer.tsx` using `React.createElement()` (~80 lines, equivalent to `Renderer.svelte`). Only needed if the component registry becomes non-empty in the future.

### 2. App Router Integration

Catch-all route at `app/[...slug]/page.tsx`. Content loading in the server component via `loadContent()`.

```tsx
// app/[...slug]/page.tsx
import { loadContent } from '@refrakt-md/content';
import { createTransform, layoutTransform, renderToHtml } from '@refrakt-md/transform';
import { serializeTree } from '@refrakt-md/transform';
import { baseConfig, defaultLayout } from '@refrakt-md/theme-base';
import { RefraktContent } from '@refrakt-md/next';
import { BehaviorInit } from '@refrakt-md/next/client';

export async function generateStaticParams() {
  const site = await loadContent('./content');
  return site.pages
    .filter(p => !p.draft)
    .map(p => ({ slug: p.url.split('/').filter(Boolean) }));
}

export default async function Page({ params }: { params: { slug: string[] } }) {
  const site = await loadContent('./content');
  const url = '/' + params.slug.join('/');
  const page = site.pages.find(p => p.url === url);

  const transform = createTransform(baseConfig);
  const tree = layoutTransform(defaultLayout, page, 'rf');

  return (
    <>
      <RefraktContent tree={tree} />
      <BehaviorInit pages={site.pages} currentUrl={url} />
    </>
  );
}
```

### 3. SEO: `generateMetadata()`

Maps directly to the SEO data already produced by the content system. Replaces `<svelte:head>` in `ThemeShell.svelte` (lines 94-122).

```tsx
// app/[...slug]/page.tsx (alongside the component)
import type { Metadata } from 'next';

export async function generateMetadata({ params }): Promise<Metadata> {
  const page = /* load page */;
  return {
    title: page.seo?.og.title ?? page.title,
    description: page.seo?.og.description ?? page.description,
    openGraph: {
      title: page.seo?.og.title,
      description: page.seo?.og.description,
      images: page.seo?.og.image ? [page.seo.og.image] : undefined,
      url: page.seo?.og.url,
      type: page.seo?.og.type,
    },
  };
}
```

### 4. Behavior Initialization

Behaviors and web components need client-side DOM access. A thin client component handles this:

```tsx
// packages/next/src/BehaviorInit.tsx
'use client';
import { useEffect } from 'react';
import { initRuneBehaviors, initLayoutBehaviors, registerElements, RfContext } from '@refrakt-md/behaviors';

export function BehaviorInit({ pages, currentUrl }: { pages: any[]; currentUrl: string }) {
  useEffect(() => {
    RfContext.pages = pages;
    RfContext.currentUrl = currentUrl;
    registerElements();
    const cleanupRunes = initRuneBehaviors();
    const cleanupLayout = initLayoutBehaviors();
    return () => { cleanupRunes(); cleanupLayout(); };
  }, [currentUrl]);

  return null;
}
```

### 5. CSS Injection

Import Lumina CSS in the root layout. No virtual modules needed — Next.js handles global CSS imports natively.

```tsx
// app/layout.tsx
import '@refrakt-md/lumina';  // index.css with tokens + all rune styles

export default function RootLayout({ children }) {
  return <html><body>{children}</body></html>;
}
```

CSS tree-shaking (importing only CSS for used runes) can be added in Phase 2 as a custom Webpack/Turbopack plugin, reusing the `analyzeRuneUsage()` logic from the SvelteKit plugin.

### 6. Content HMR

The SvelteKit plugin uses Vite's `server.watcher` API (`packages/sveltekit/src/content-hmr.ts`). Next.js doesn't expose Vite.

**Phase 1**: No custom HMR — rely on Next.js dev server. Changes to content files trigger re-rendering on next request. Acceptable for initial implementation.

**Phase 2**: Custom Webpack plugin watching the content directory, invalidating page modules on `.md` file changes. Same logic, different watcher API.

### 7. ISR / On-Demand Revalidation

For sites that update content without full rebuilds:

```tsx
export const revalidate = 3600; // re-render every hour
// or on-demand via API route:
// revalidatePath('/docs/getting-started');
```

`loadContent()` re-reads the content directory on each call, so ISR "just works".

### 8. Package Shape

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

### Estimated New Code

| Component | Lines | Complexity |
|-----------|-------|------------|
| `RefraktContent` (RSC) | ~15 | Trivial |
| `BehaviorInit` (client) | ~25 | Low |
| `metadata.ts` helper | ~30 | Low |
| `loader.ts` utility | ~40 | Low |
| Lumina/next adapter | ~25 | Trivial |
| Types | ~35 | Trivial |
| **Total** | **~170** | **Low** |

---

## Eleventy (11ty v3)

### Verdict: Ready

Eleventy is architecturally the most different — no Vite, no bundler, template-driven. But `renderToHtml()` was practically designed for template engines. This is the simplest integration of all three frameworks.

### 1. Integration Model: Global Data + Pagination

Eleventy's data cascade is the natural integration point. A global data file calls the entire refrakt pipeline at build time:

```js
// _data/refrakt.js
import { loadContent } from '@refrakt-md/content';
import { createTransform, layoutTransform, renderToHtml } from '@refrakt-md/transform';
import { matchRouteRule } from '@refrakt-md/transform';
import { baseConfig, defaultLayout, docsLayout } from '@refrakt-md/theme-base';

const layouts = { default: defaultLayout, docs: docsLayout };
const routeRules = [
  { pattern: 'docs/**', layout: 'docs' },
  { pattern: '**', layout: 'default' },
];

export default async function () {
  const site = await loadContent('./content');
  const transform = createTransform(baseConfig);

  return {
    pages: site.pages.filter(p => !p.draft).map(page => {
      const layoutName = matchRouteRule(page.url, routeRules);
      const tree = layoutTransform(layouts[layoutName], page, 'rf');
      return {
        url: page.url,
        title: page.title,
        description: page.description,
        seo: page.seo,
        html: renderToHtml(tree),
        pages: site.pages.map(p => ({ url: p.url, title: p.title })),
      };
    }),
  };
}
```

Eleventy pagination creates one page per content item:

```yaml
---
pagination:
  data: refrakt.pages
  size: 1
  alias: page
permalink: "{{ page.url }}/index.html"
layout: base.njk
---
```

### 2. Rendering: Template Injection

The template receives pre-rendered HTML from the data file. No recursive component, no framework renderer:

```html
{# _includes/base.njk #}
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>{{ page.seo.og.title or page.title }}</title>
  {% if page.description %}
  <meta name="description" content="{{ page.description }}" />
  {% endif %}
  <link rel="stylesheet" href="/css/refrakt.css" />
</head>
<body>
  {{ page.html | safe }}
  <script type="module">
    import { initRuneBehaviors, initLayoutBehaviors, registerElements, RfContext }
      from '/js/behaviors.js';
    RfContext.pages = {{ page.pages | dump | safe }};
    RfContext.currentUrl = '{{ page.url }}';
    registerElements();
    initRuneBehaviors();
    initLayoutBehaviors();
  </script>
</body>
</html>
```

### 3. Layout System: Complementary

Eleventy's layout chaining and refrakt's `layoutTransform()` operate at different levels:

- **Refrakt layouts** produce the inner page structure — sidebar, content area, TOC, breadcrumbs, mobile panels. This happens at build time in the data file.
- **Eleventy layouts** provide the outer HTML shell — `<html>`, `<head>`, `<body>`, global scripts, analytics.

No conflict. Eleventy wraps refrakt's output.

### 4. CSS Injection

No bundler means no CSS imports. Use Eleventy's passthrough file copy:

```js
// eleventy.config.js
export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({
    'node_modules/@refrakt-md/lumina/index.css': 'css/refrakt.css',
  });
}
```

Referenced via `<link rel="stylesheet" href="/css/refrakt.css">` in the base template.

CSS tree-shaking is a Phase 2 optimization — could use a post-build script that analyzes used rune types and generates a minimal CSS bundle.

### 5. Content Loading: Refrakt vs Eleventy's Markdown

Potential confusion: Eleventy normally processes `.md` files through its Markdown-it pipeline. Using refrakt's `loadContent()` bypasses this entirely.

**Resolution**: Content lives in a directory that Eleventy does **not** discover as templates. The data file approach means Eleventy treats content as pure data, not as templates to render. Refrakt handles all Markdoc parsing and transformation.

### 6. No HMR — Not Needed

Eleventy with `--serve` uses BrowserSync live reload. When content files change (if watched), Eleventy triggers a full rebuild. `loadContent()` re-reads the directory on each call.

For a site with ~100 pages, Eleventy v3 rebuilds in under 2 seconds. No custom HMR infrastructure needed.

### 7. Eleventy 3.0 Compatibility

Eleventy 3.0 is ESM-native. All refrakt packages use `"type": "module"`. No CJS compatibility issues. The `export default function` pattern in data files and config works natively.

### 8. Behavior Initialization

Static MPA model — each page load is a fresh DOM. No cleanup needed:

```html
<script type="module">
  import { initRuneBehaviors, initLayoutBehaviors, registerElements, RfContext }
    from '@refrakt-md/behaviors';
  // Set context for web components
  RfContext.pages = /* injected page data */;
  RfContext.currentUrl = window.location.pathname;
  registerElements();
  initRuneBehaviors();
  initLayoutBehaviors();
</script>
```

The `@refrakt-md/behaviors` package would need to be either bundled (via a separate build step) or served from `node_modules`. The passthrough copy approach works, or a simple esbuild step can bundle the behaviors for the browser.

### 9. Package Shape

```
packages/eleventy/
├── src/
│   ├── plugin.js              # Eleventy plugin (registers data, passthrough copy)
│   ├── data.js                # Global data file factory (loadContent + transform)
│   └── index.js               # Public exports
├── templates/
│   └── base.njk               # Example base template
├── package.json               # peer dep: @11ty/eleventy@^3.0.0
└── README.md
```

### Estimated New Code

| Component | Lines | Complexity |
|-----------|-------|------------|
| Global data file / factory | ~50 | Low |
| Eleventy plugin (config) | ~25 | Low |
| Base template (example) | ~40 | Low |
| Client script (behaviors) | ~15 | Trivial |
| Lumina/11ty adapter | ~15 | Trivial |
| **Total** | **~145** | **Low** |

---

## Nuxt (Vue 3 + Nitro)

### Verdict: Ready

Nuxt is the closest to SvelteKit — Vite-based, file-system routing, SSR with Nitro. The SvelteKit Vite plugin can be substantially reused. This has the most code to write but the highest code sharing.

### 1. Vite Plugin Reuse

The SvelteKit Vite plugin (`packages/sveltekit/src/plugin.ts`) is mostly framework-agnostic:

| Plugin hook | Framework-specific? | Nuxt reuse |
|-------------|---------------------|------------|
| `config()` — SSR noExternal list | No — same packages | Direct reuse |
| `buildStart()` — CSS tree-shaking | No — pure analysis | Direct reuse |
| `resolveId()` / `load()` — virtual modules | Partially — import paths reference `svelte` | Adapt imports for Vue |
| `configureServer()` — content HMR | No — Vite watcher API | Direct reuse |

The virtual module generation (`packages/sveltekit/src/virtual-modules.ts`) needs adaptation: the `virtual:refrakt/theme` module currently imports from `lumina/svelte` — for Nuxt it would import from `lumina/nuxt`. The `virtual:refrakt/tokens` and `virtual:refrakt/config` modules are already framework-agnostic.

Content HMR (`packages/sveltekit/src/content-hmr.ts`, 26 lines) can be used as-is — it's pure Vite `server.watcher` API.

### 2. Nuxt Module

Nuxt modules are the idiomatic integration point — more powerful than raw Vite plugins:

```ts
// packages/nuxt/src/module.ts
import { defineNuxtModule, addVitePlugin, addImports } from '@nuxt/kit';
import { refrakt as refraktVitePlugin } from './vite-plugin';

export default defineNuxtModule({
  meta: { name: '@refrakt-md/nuxt', configKey: 'refrakt' },
  defaults: { contentDir: './content' },

  setup(options, nuxt) {
    // Register adapted Vite plugin
    addVitePlugin(refraktVitePlugin(options));

    // Inject Lumina CSS
    nuxt.options.css.push('@refrakt-md/lumina');

    // Ensure refrakt packages are transpiled by Nitro
    nuxt.options.build.transpile.push(
      '@refrakt-md/transform', '@refrakt-md/content',
      '@refrakt-md/runes', '@refrakt-md/types',
      '@refrakt-md/theme-base', '@refrakt-md/behaviors',
    );

    // Auto-import composables
    addImports([
      { name: 'useRefraktMeta', from: '@refrakt-md/nuxt/composables' },
    ]);

    // Tell Vue compiler to treat rf-* as custom elements
    nuxt.options.vue.compilerOptions.isCustomElement =
      (tag) => tag.startsWith('rf-');
  },
});
```

Configuration in `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  modules: ['@refrakt-md/nuxt'],
  refrakt: { contentDir: './content' },
});
```

### 3. Rendering: `v-html` + `renderToHtml()`

Same strategy as Next.js and Astro — `renderToHtml()` produces complete HTML:

```vue
<!-- packages/nuxt/src/RefraktContent.vue -->
<script setup lang="ts">
import { renderToHtml } from '@refrakt-md/transform';
import type { RendererNode } from '@refrakt-md/types';

const props = defineProps<{ tree: RendererNode }>();
const html = computed(() => renderToHtml(props.tree));
</script>

<template>
  <div v-html="html" />
</template>
```

**Alternative**: Recursive `Renderer.vue` using `<component :is="tag.name">` (~80 lines). Only needed if the component registry becomes non-empty.

### 4. SEO: `useRefraktMeta()` Composable

```ts
// packages/nuxt/src/composables/useRefraktMeta.ts
import { useHead } from '#imports';

interface PageSeo {
  og: { title?: string; description?: string; image?: string; type?: string; url?: string };
  jsonLd: object[];
}

export function useRefraktMeta(page: { title: string; description?: string; seo?: PageSeo }) {
  useHead({
    title: page.seo?.og.title ?? page.title,
    meta: [
      { name: 'description', content: page.seo?.og.description ?? page.description },
      { property: 'og:title', content: page.seo?.og.title },
      { property: 'og:description', content: page.seo?.og.description },
      ...(page.seo?.og.image ? [
        { property: 'og:image', content: page.seo.og.image },
        { name: 'twitter:card', content: 'summary_large_image' },
      ] : []),
      ...(page.seo?.og.url ? [{ property: 'og:url', content: page.seo.og.url }] : []),
      ...(page.seo?.og.type ? [{ property: 'og:type', content: page.seo.og.type }] : []),
    ].filter(m => m.content),
    script: page.seo?.jsonLd.map(schema => ({
      type: 'application/ld+json',
      innerHTML: JSON.stringify(schema),
    })) ?? [],
  });
}
```

### 5. Content Loading

```vue
<!-- pages/[...slug].vue -->
<script setup lang="ts">
import { loadContent } from '@refrakt-md/content';
import { createTransform, layoutTransform } from '@refrakt-md/transform';
import { matchRouteRule } from '@refrakt-md/transform';
import { baseConfig, defaultLayout, docsLayout } from '@refrakt-md/theme-base';
import RefraktContent from '@refrakt-md/nuxt/RefraktContent.vue';
import { useRefraktMeta } from '#imports';

const route = useRoute();
const layouts = { default: defaultLayout, docs: docsLayout };
const routeRules = [
  { pattern: 'docs/**', layout: 'docs' },
  { pattern: '**', layout: 'default' },
];

const { data: page } = await useAsyncData('refrakt-page', async () => {
  const site = await loadContent('./content');
  const url = '/' + (route.params.slug as string[]).join('/');
  const pageData = site.pages.find(p => p.url === url);
  const layoutName = matchRouteRule(url, routeRules);
  const tree = layoutTransform(layouts[layoutName], pageData, 'rf');
  return { ...pageData, tree, allPages: site.pages };
});

useRefraktMeta(page.value);
</script>

<template>
  <RefraktContent v-if="page" :tree="page.tree" />
</template>
```

### 6. Behavior Initialization

```vue
<!-- In the page component or a wrapper -->
<script setup lang="ts">
import { onMounted, onBeforeUnmount, watch } from 'vue';
import { initRuneBehaviors, initLayoutBehaviors, registerElements, RfContext }
  from '@refrakt-md/behaviors';

const route = useRoute();

let cleanupRunes: (() => void) | undefined;
let cleanupLayout: (() => void) | undefined;

function initBehaviors() {
  RfContext.pages = page.value.allPages;
  RfContext.currentUrl = route.path;
  registerElements();
  cleanupRunes = initRuneBehaviors();
  cleanupLayout = initLayoutBehaviors();
}

onMounted(initBehaviors);
onBeforeUnmount(() => { cleanupRunes?.(); cleanupLayout?.(); });

// Re-initialize on client-side navigation
watch(() => route.path, () => {
  cleanupRunes?.(); cleanupLayout?.();
  nextTick(initBehaviors);
});
</script>
```

### 7. Web Components in Vue

Since `renderToHtml()` outputs custom elements as raw HTML injected via `v-html`, Vue's template compiler never sees them. The `isCustomElement` configuration in the module is a safety net — it prevents warnings if a recursive `Renderer.vue` is used instead.

```ts
// In the Nuxt module:
nuxt.options.vue.compilerOptions.isCustomElement = (tag) => tag.startsWith('rf-');
```

### 8. Nitro Compatibility

Nitro bundles server-side code. Refrakt packages must not be externalized:

```ts
// In the Nuxt module:
nuxt.options.build.transpile.push(
  '@markdoc/markdoc',
  '@refrakt-md/runes', '@refrakt-md/content',
  '@refrakt-md/types', '@refrakt-md/svelte',
  '@refrakt-md/transform', '@refrakt-md/theme-base',
);
```

This is the same `CORE_NO_EXTERNAL` list from the SvelteKit plugin (`packages/sveltekit/src/plugin.ts`, lines 11-19).

### 9. Package Shape

```
packages/nuxt/
├── src/
│   ├── module.ts              # Nuxt module (Vite plugin, CSS, auto-imports)
│   ├── vite-plugin.ts         # Adapted Vite plugin (reuses virtual module logic)
│   ├── RefraktContent.vue     # v-html rendering component
│   ├── composables/
│   │   └── useRefraktMeta.ts  # SEO composable wrapping useHead()
│   └── index.ts               # Public exports
├── package.json               # peer dep: nuxt@^3.0.0
└── tsconfig.json
```

### Estimated New Code

| Component | Lines | Complexity |
|-----------|-------|------------|
| Nuxt module | ~50 | Medium (Nuxt module API) |
| Vite plugin adapter | ~40 | Low (wraps shared logic) |
| `RefraktContent.vue` | ~15 | Trivial |
| `useRefraktMeta()` composable | ~30 | Low |
| Page template example | ~35 | Low |
| Behavior initialization | ~25 | Low |
| Lumina/nuxt adapter | ~25 | Trivial |
| **Total** | **~220** | **Low-Medium** |

---

## Cross-Framework Comparison

| Concern | SvelteKit (current) | Astro | Next.js | Eleventy | Nuxt |
|---------|--------------------|-----------|---------|---------|----|
| **Renderer** | `Renderer.svelte` (recursive) | `renderToHtml()` | `renderToHtml()` + RSC | `renderToHtml()` + template | `renderToHtml()` + `v-html` |
| **SEO / `<head>`** | `<svelte:head>` | Native `<head>` | `generateMetadata()` | Template `<head>` | `useHead()` |
| **Behavior init** | `$effect` → `initRuneBehaviors()` | `<script>` | `useEffect` (client component) | `<script>` | `onMounted()` |
| **Behavior cleanup** | `$effect` return | N/A (MPA) | `useEffect` return | N/A (MPA) | `onBeforeUnmount()` |
| **CSS injection** | Virtual module (`virtual:refrakt/tokens`) | `injectScript` or CSS import | `import` in root layout | `<link>` via passthrough copy | `nuxt.options.css` |
| **CSS tree-shaking** | Vite plugin `buildStart()` | Same | Webpack plugin (Phase 2) | Post-build script (Phase 2) | Same Vite plugin |
| **Content HMR** | Vite `server.watcher` | Same | Webpack plugin (Phase 2) | Built-in `--watch` | Same Vite `server.watcher` |
| **Integration** | Vite plugin | Astro integration | npm package | Eleventy plugin | Nuxt module + Vite plugin |
| **Content loading** | `+page.server.ts` | `getStaticPaths()` | `generateStaticParams()` + RSC | Global data file + pagination | `useAsyncData()` |
| **SPA navigation** | `{#key page.url}` | N/A (MPA) | App Router (automatic) | N/A (MPA) | Vue Router (automatic) |
| **Web components** | Native custom elements | Native custom elements | Raw HTML (bypasses React) | Native custom elements | `isCustomElement` config |
| **Build tool** | Vite | Vite | Webpack / Turbopack | None (or optional) | Vite (via Nitro) |
| **Estimated adapter** | ~510 lines (existing) | ~205 lines | ~170 lines | ~145 lines | ~220 lines |
| **Difficulty** | — | Low | Low | Low | Low-Medium |

---

## Risks

| Risk | Frameworks | Severity | Mitigation |
|------|-----------|----------|------------|
| React hydration mismatch warnings | Next.js | Low | `renderToHtml()` + `dangerouslySetInnerHTML` bypasses hydration entirely |
| Nuxt Content module confusion | Nuxt | Low | Document that `@refrakt-md/nuxt` replaces Nuxt Content, not supplements it |
| Eleventy Markdown-it collision | Eleventy | Low | Data file approach means Eleventy never processes `.md` files through its own pipeline |
| Content HMR latency in Next.js dev | Next.js | Low | Full page reload on content change is acceptable initially; custom plugin later |
| CSS bundle size without tree-shaking | All | Low | ~48 rune CSS files total; optimize later |
| Bundling `@refrakt-md/behaviors` for Eleventy | Eleventy | Low | Simple esbuild step or passthrough copy from node_modules |

No architectural blockers for any framework.

---

## Recommended Priority Order

### Why this order: Nuxt → Next.js → Eleventy

1. **Nuxt** — Closest to SvelteKit (Vite-based, same plugin patterns). Highest code sharing from the existing adapter. Expanding beyond Svelte to Vue proves the multi-framework story and captures a large ecosystem.

2. **Next.js** — Largest potential audience. RSC + `renderToHtml()` is a clean fit. Different build tooling (Webpack/Turbopack) means less code reuse from the Vite plugin, but a simpler integration model (no virtual modules needed).

3. **Eleventy** — Simplest integration (just functions + templates). More niche audience but ideal for documentation sites wanting minimal JS. Good validation that the architecture works with a non-Vite, non-framework tool.

### Phased Implementation

**Phase 0: Shared utility extraction** (prerequisite for all)
- Move `serialize()` and `matchRouteRule()` to `@refrakt-md/transform`
- Re-export from `@refrakt-md/svelte` for backward compatibility
- ~20 lines

**Phase 1: `@refrakt-md/nuxt`**
- Nuxt module + adapted Vite plugin
- `RefraktContent.vue` component
- `useRefraktMeta()` composable
- Lumina/nuxt adapter
- Example Nuxt site using `site/content/`
- ~220 lines

**Phase 2: `@refrakt-md/next`**
- `RefraktContent` RSC + `BehaviorInit` client component
- `generateMetadata()` helper + content loader
- Lumina/next adapter
- Example Next.js site
- ~170 lines

**Phase 3: `@refrakt-md/eleventy`**
- Eleventy plugin + global data factory
- Base template example
- Lumina/11ty adapter
- Example Eleventy site
- ~145 lines

### Total new code across all three: ~555 lines + ~20 lines shared extraction = ~575 lines

Compare to ~15,000+ lines of framework-agnostic code being reused across all adapters.

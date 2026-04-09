---
title: Nuxt Adapter
description: Using refrakt.md with Nuxt 3 for SSR, Vue components, and auto-imports
---

# Nuxt Adapter

The Nuxt adapter (`@refrakt-md/nuxt`) connects refrakt.md to [Nuxt 3](https://nuxt.com) via a Nuxt module. Content renders as HTML strings through `v-html`, with interactive runes enhanced by `@refrakt-md/behaviors` on the client.

## Installation

```shell
npm install @refrakt-md/nuxt @refrakt-md/content @refrakt-md/runes @refrakt-md/transform @refrakt-md/highlight @refrakt-md/types @markdoc/markdoc
```

Or scaffold a complete project:

```shell
npx create-refrakt my-site --target nuxt
```

## Configuration

Set `target` to `"nuxt"` in `refrakt.config.json`:

```json
{
  "contentDir": "./content",
  "theme": "@refrakt-md/lumina",
  "target": "nuxt",
  "routeRules": [
    { "pattern": "**", "layout": "default" }
  ]
}
```

## Nuxt Module Setup

Register the refrakt module in `nuxt.config.ts`:

```typescript
import { refrakt } from '@refrakt-md/nuxt';

export default defineNuxtConfig({
  modules: [refrakt],
});
```

The module reads `refrakt.config.json` from the project root (configurable via the `configPath` option) and:

- Adds core refrakt packages plus your theme and rune packages to `build.transpile`
- Configures the Vue compiler to treat `rf-*` tags as custom elements
- Watches the content directory for HMR during development

### Module Options

Pass options via the `refrakt` key in your Nuxt config:

```typescript
export default defineNuxtConfig({
  modules: [refrakt],
  refrakt: {
    configPath: './refrakt.config.json',
  },
});
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `configPath` | `string` | `"./refrakt.config.json"` | Path to the refrakt configuration file |

## NuxtTheme Interface

The Nuxt adapter uses the `NuxtTheme` interface for theme objects — similar to the HTML adapter's `HtmlTheme`:

```typescript
interface NuxtTheme {
  manifest: ThemeManifest;
  layouts: Record<string, LayoutConfig>;
}
```

All runes render through the identity transform + CSS. There is no component registry — the adapter produces HTML strings, not Vue component trees. Interactive runes get their behavior from `@refrakt-md/behaviors` via client-side initialization.

## Project Structure

A Nuxt refrakt.md site uses a catch-all route to handle content pages:

```
my-site/
├── content/                    # Markdoc content files
│   ├── index.md
│   └── docs/
│       └── getting-started.md
├── pages/
│   └── [...slug].vue          # Catch-all route for content
├── components/
│   └── RefraktContent.vue     # Reusable content renderer
├── server/
│   └── utils/
│       └── refrakt.ts         # Server-side content loading
├── nuxt.config.ts
└── refrakt.config.json
```

## Content Loading

### Server Utility

Create a server utility using `createRefraktLoader` — it handles config loading, community package merging, theme assembly, and caching automatically:

{% codegroup labels="server/utils/refrakt.ts" %}

```typescript
import { createRefraktLoader } from '@refrakt-md/content';
import manifest from '@refrakt-md/lumina/manifest';
import { layouts } from '@refrakt-md/lumina/layouts';

export const loader = createRefraktLoader();
export const theme = { manifest, layouts };
```

{% /codegroup %}

### Catch-All Route

Use `useAsyncData` in a catch-all page to load content on the server:

{% codegroup labels="pages/[...slug].vue" %}

```vue
<script setup lang="ts">
import { renderPage, buildRefraktHead, hasInteractiveRunes } from '@refrakt-md/nuxt';
import { initRuneBehaviors, initLayoutBehaviors } from '@refrakt-md/behaviors';

const route = useRoute();
const url = '/' + ((route.params.slug as string[])?.join('/') ?? '');

const { data: page } = await useAsyncData(
  `page-${url}`,
  () => $fetch(`/api/content${url === '/' ? '' : url}`)
);

if (!page.value) {
  throw createError({ statusCode: 404, statusMessage: 'Page not found' });
}

// SEO
const head = buildRefraktHead({
  title: page.value.title,
  frontmatter: page.value.frontmatter,
  seo: page.value.seo,
});
useHead(head);

// Behaviors
const contentRef = ref<HTMLElement | null>(null);
let cleanup: (() => void) | null = null;

function initBehaviors() {
  if (!contentRef.value) return;
  cleanup?.();
  const c1 = initRuneBehaviors(contentRef.value);
  const c2 = initLayoutBehaviors(contentRef.value);
  cleanup = () => { c1(); c2(); };
}

onMounted(initBehaviors);
onBeforeUnmount(() => cleanup?.());

// Re-init behaviors on client-side navigation
watch(() => route.fullPath, () => {
  nextTick(initBehaviors);
});
</script>

<template>
  <div ref="contentRef" v-html="page.html" />
</template>
```

{% /codegroup %}

### API Route

Create a server API route that loads content and renders it to HTML:

{% codegroup labels="server/api/content/[...slug].ts" %}

```typescript
import { renderPage } from '@refrakt-md/nuxt';
import { getContent, theme } from '~/server/utils/refrakt';

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug') ?? '';
  const url = '/' + slug;
  const site = await loader.getSite();

  const page = site.pages.find(p => p.route.url === url);
  if (!page) {
    throw createError({ statusCode: 404, statusMessage: 'Page not found' });
  }

  const html = renderPage({ theme, page: page as any });

  return {
    html,
    title: page.frontmatter?.title ?? '',
    frontmatter: page.frontmatter,
    seo: page.seo,
  };
});
```

{% /codegroup %}

## RefraktContent Component

For reusable content rendering, create a Vue component:

{% codegroup labels="components/RefraktContent.vue" %}

```vue
<script setup lang="ts">
import { initRuneBehaviors, initLayoutBehaviors } from '@refrakt-md/behaviors';

const props = defineProps<{
  html: string;
}>();

const contentRef = ref<HTMLElement | null>(null);
let cleanup: (() => void) | null = null;

function initBehaviors() {
  if (!contentRef.value) return;
  cleanup?.();
  const c1 = initRuneBehaviors(contentRef.value);
  const c2 = initLayoutBehaviors(contentRef.value);
  cleanup = () => { c1(); c2(); };
}

onMounted(initBehaviors);
onBeforeUnmount(() => cleanup?.());

watch(() => props.html, () => {
  nextTick(initBehaviors);
});
</script>

<template>
  <div ref="contentRef" v-html="html" />
</template>
```

{% /codegroup %}

## SEO with buildRefraktHead

The `buildRefraktHead` composable produces an object compatible with Nuxt's `useHead()`. It extracts title, description, Open Graph tags, and JSON-LD schemas from the page's SEO data:

```typescript
import { buildRefraktHead } from '@refrakt-md/nuxt';

const head = buildRefraktHead({
  title: page.title,
  frontmatter: page.frontmatter,
  seo: page.seo,
});

useHead(head);
```

### What it sets

| Tag | Source |
|-----|--------|
| `<title>` | `seo.og.title` or `title` |
| `<meta name="description">` | `seo.og.description` or `frontmatter.description` |
| `<meta property="og:title">` | `seo.og.title` or `title` |
| `<meta property="og:description">` | `seo.og.description` or `frontmatter.description` |
| `<meta property="og:image">` | `seo.og.image` |
| `<meta property="og:url">` | `seo.og.url` |
| `<meta property="og:type">` | `seo.og.type` |
| `<meta name="twitter:card">` | Set to `summary_large_image` when `og:image` is present |
| `<script type="application/ld+json">` | Each entry in `seo.jsonLd` |

## Behavior Lifecycle

Interactive runes (tabs, accordion, datatable, etc.) need client-side JavaScript. In the Nuxt adapter, behaviors are initialized after the DOM is ready and cleaned up on teardown:

```typescript
import { initRuneBehaviors, initLayoutBehaviors } from '@refrakt-md/behaviors';

// In setup:
const contentRef = ref<HTMLElement | null>(null);
let cleanup: (() => void) | null = null;

function initBehaviors() {
  if (!contentRef.value) return;
  cleanup?.();
  const c1 = initRuneBehaviors(contentRef.value);
  const c2 = initLayoutBehaviors(contentRef.value);
  cleanup = () => { c1(); c2(); };
}

onMounted(initBehaviors);
onBeforeUnmount(() => cleanup?.());
```

When using Nuxt's client-side navigation, behaviors must be re-initialized after each route change. Watch the route and call `initBehaviors` on `nextTick`:

```typescript
const route = useRoute();

watch(() => route.fullPath, () => {
  nextTick(initBehaviors);
});
```

{% hint type="note" %}
`@refrakt-md/behaviors` is an optional dependency. If not installed, the page renders correctly but interactive runes (tabs, accordion, etc.) will not have JavaScript enhancement.
{% /hint %}

## CSS Injection

The Nuxt module does not automatically inject theme CSS. Add the theme stylesheet to your `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  modules: [refrakt],
  css: ['@refrakt-md/lumina'],
});
```

This imports the full Lumina CSS bundle (design tokens + rune styles). For custom themes, replace `@refrakt-md/lumina` with your theme's CSS entry point.

## Vue Custom Elements

The Nuxt module automatically configures the Vue compiler to treat tags starting with `rf-` as custom elements. This prevents Vue from issuing warnings about unknown components when the identity transform produces custom element tags.

If you need to add additional custom element prefixes, extend the config manually:

```typescript
export default defineNuxtConfig({
  vue: {
    compilerOptions: {
      isCustomElement: (tag) => tag.startsWith('rf-') || tag.startsWith('my-'),
    },
  },
});
```

## hasInteractiveRunes

The `hasInteractiveRunes` utility checks whether a rendered tree contains runes that need client-side behavior initialization. Use it to conditionally load the behaviors script:

```typescript
import { hasInteractiveRunes } from '@refrakt-md/nuxt';

if (hasInteractiveRunes(page.renderable)) {
  // Load and initialize behaviors
}
```

## Differences from SvelteKit

| Feature | SvelteKit | Nuxt |
|---------|-----------|------|
| **Rendering** | Svelte Renderer component walks the tree, dispatching to registered components | HTML string via `renderToHtml()`, injected with `v-html` |
| **Component registry** | Maps rune `typeof` to Svelte components for custom rendering | No component registry — all runes render through identity transform |
| **Element overrides** | Table/code block wrapping handled by shared Markdoc node schemas (framework-agnostic); element override system available for user-defined overrides | Table/code block wrapping handled by shared Markdoc node schemas (framework-agnostic) |
| **Behaviors** | `use:behaviors` Svelte action handles lifecycle | `onMounted` / `onBeforeUnmount` + route watcher |
| **SEO** | `ThemeShell` injects into `<svelte:head>` | `buildRefraktHead` + `useHead()` |
| **HMR** | Vite plugin with virtual modules and content HMR | Nuxt module watches content directory |
| **Theme type** | `SvelteTheme` (includes components, elements) | `NuxtTheme` (manifest + layouts only) |

## Theme Integration

When creating a theme with Nuxt support, export a `NuxtTheme` object from the `./nuxt` subpath:

```typescript
// nuxt/index.ts
import type { NuxtTheme } from '@refrakt-md/nuxt';
import manifest from '../manifest.json';
import { defaultLayout, docsLayout } from '@refrakt-md/transform';

export const theme: NuxtTheme = {
  manifest,
  layouts: {
    default: defaultLayout,
    docs: docsLayout,
  },
};
```

See [Creating a Theme](/docs/themes/creating-a-theme) for the full guide.

## Dependencies

| Package | Required | Purpose |
|---------|----------|---------|
| `@refrakt-md/transform` | Yes | Identity transform engine, layout transform, `renderToHtml` |
| `@refrakt-md/types` | Yes | Shared TypeScript interfaces |
| `@refrakt-md/content` | Yes | Content loading, routing, layout cascade |
| `@refrakt-md/behaviors` | Yes | Client-side progressive enhancement for interactive runes |
| `nuxt` | Peer | Nuxt 3 framework |

## Compatibility

The Nuxt adapter requires:

- Nuxt 3.0 or later
- Vue 3.0 or later
- Node.js 18 or later

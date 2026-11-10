---
title: Nuxt Adapter
description: Using refrakt.md with Nuxt 3 for SSR and Vue rendering
---

# Nuxt Adapter

The Nuxt adapter (`@refrakt-md/nuxt`) connects refrakt.md to [Nuxt 3](https://nuxt.com) through a Nuxt module plus rendering, head, and behavior helpers. Content renders to an HTML string on the server and is injected with `v-html`; interactive runes are enhanced by `@refrakt-md/behaviors` on the client. Like SvelteKit it is Vite-based, so the module handles CSS, token overrides, and content reloading for you.

## Installation

```shell
npx create-refrakt my-site --target nuxt
```

Or add it to an existing Nuxt project, alongside the [core packages](/docs/adapters/adapters-overview#dependencies):

```shell
npm install @refrakt-md/nuxt
```

Peer dependency: `nuxt` 3 (Vue 3). Node.js 18+.

## Configuration

Register the module in `nuxt.config.ts`, by name or by import:

```typescript
export default defineNuxtConfig({
  modules: ['@refrakt-md/nuxt'],
  refrakt: {
    // all optional
    configPath: './refrakt.config.json',
    site: 'main',
  },
});
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `configPath` | `string` | `'./refrakt.config.json'` | Path to the refrakt config |
| `site` | `string` | — | Which site to use from a multi-site config |
| `security` | `SecurityPolicy` | `'trusted'` | Policy for untrusted author content |
| `variables` | `Record<string, unknown>` | — | Markdoc variables for `{% $name %}` |

`security` and `variables` reach only the module's own content pass (the one that works out which rune CSS to inject). Pages render through your own loader, so pass the same values to `createRefraktLoader()` there too.

The module:

- adds the core refrakt packages, your theme, and your plugins to `build.transpile`
- pushes the theme CSS (only the per-rune CSS the content uses) and `virtual:refrakt/site-tokens.css` onto `nuxt.options.css`, in that order; your own `css` entries layer on top
- tells the Vue compiler to treat `rf-*` tags as custom elements
- reloads the page when content or rune definitions change during `nuxt dev`

## Minimal setup

```
server/
├── utils/refrakt.ts            # Loader + theme
└── api/content/[...slug].ts    # Renders one page to HTML
pages/
└── [...slug].vue               # Catch-all route
nuxt.config.ts
refrakt.config.json
```

The server loads and renders content; the page fetches the result, sets the head, and initializes behaviors:

{% codegroup labels="server/utils/refrakt.ts, server/api/content/[...slug].ts, pages/[...slug].vue" %}

```typescript
import { createRefraktLoader } from '@refrakt-md/content';
import { loadRefraktConfig, resolveSite } from '@refrakt-md/transform/node';
import manifest from '@refrakt-md/lumina/manifest';
import { layouts } from '@refrakt-md/lumina/layouts';

export const loader = createRefraktLoader();
export const theme = { manifest, layouts };

const { site } = resolveSite(loadRefraktConfig('refrakt.config.json'));
export const seoSite = {
  siteName: site.siteName,
  baseUrl: site.baseUrl,
  defaultImage: site.defaultImage,
  logo: site.logo,
};
```

```typescript
import { renderPage, buildRefraktHead } from '@refrakt-md/nuxt';
import { loader, theme, seoSite } from '~/server/utils/refrakt';

export default defineEventHandler(async (event) => {
  const url = '/' + (getRouterParam(event, 'slug') ?? '');
  const [site, transform, hl] = await Promise.all([
    loader.getSite(),
    loader.getTransform(),
    loader.getHighlightTransform(),
  ]);
  const page = site.pages.find(p => p.route.url === url);
  if (!page || page.route.draft) {
    throw createError({ statusCode: 404, statusMessage: 'Page not found' });
  }

  const pages = site.pages
    .filter(p => !p.route.draft)
    .map(p => ({ url: p.route.url, title: p.frontmatter.title ?? '', draft: false }));
  const regions = Object.fromEntries(
    [...page.layout.regions.entries()].map(([name, r]) => [
      name,
      { name: r.name, mode: r.mode, content: r.content.map(c => hl(transform(c))) },
    ])
  );
  const title = page.frontmatter.title ?? '';

  return {
    html: renderPage({ theme, page: { renderable: hl(transform(page.renderable)), regions, title, url, pages } }),
    head: buildRefraktHead({ title, frontmatter: page.frontmatter, seo: page.seo, ...seoSite }),
    highlightCss: hl.css,
    pages,
  };
});
```

```vue
<script setup lang="ts">
import { useBehaviors } from '@refrakt-md/nuxt/client';

const route = useRoute();
const { data: page } = await useAsyncData(`page-${route.path}`, () =>
  $fetch(`/api/content${route.path === '/' ? '' : route.path}`)
);
if (!page.value) throw createError({ statusCode: 404, statusMessage: 'Page not found' });

useHead({
  ...page.value.head,
  style: page.value.highlightCss ? [{ innerHTML: page.value.highlightCss }] : [],
});

useBehaviors({
  pages: page.value.pages,
  currentUrl: computed(() => route.path),
});
</script>

<template>
  <div v-html="page.html" />
</template>
```

{% /codegroup %}

## buildRefraktHead

`buildRefraktHead()` returns `{ title, meta, link, script }`, ready for Nuxt's `useHead()`. It emits the same tags as the other adapters' SEO helpers — description, Open Graph, Twitter, `og:site_name`, a canonical `<link>` (absolutized against `baseUrl`), and one JSON-LD `script` per schema plus WebSite + Organization when `baseUrl` is supplied.

## useBehaviors

`useBehaviors({ pages, currentUrl })` is the recommended way to initialize behaviors. It is exported from `@refrakt-md/nuxt/client` (and re-exported from the main entry). On mount it dynamically imports `@refrakt-md/behaviors`, sets `RfContext.pages` and `RfContext.currentUrl`, registers the custom elements, and initializes rune and layout behaviors; on unmount it cleans up. When `currentUrl` is a `Ref`, it re-initializes whenever the URL changes, which covers client-side navigation.

If you need more control, call the behaviors library yourself on a container ref, and re-run after each route change once the DOM has updated:

```typescript
import { initRuneBehaviors, initLayoutBehaviors } from '@refrakt-md/behaviors';

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
watch(() => route.fullPath, () => nextTick(initBehaviors));
```

`hasInteractiveRunes(renderable)` tells you, on the server, whether a page needs behaviors at all.

## Vue and custom elements

There is no component registry: the adapter produces HTML strings, not Vue component trees. For component overrides, render `page.renderable` with the `Renderer` from `@refrakt-md/vue` instead of `renderPage()`.

Because the module marks `rf-*` tags as custom elements, Vue does not warn about the `<rf-*>` tags the identity transform emits. It composes with any existing `isCustomElement` function, so prefixes registered by you or another module are kept.

## Shared setup

These work the same way for every adapter; see the overview:

- [CSS](/docs/adapters/adapters-overview#css) — injected by the module, tree-shaken to used runes
- [Site-level token overrides](/docs/adapters/adapters-overview#site-level-token-overrides) — injected as `virtual:refrakt/site-tokens.css`
- [Behaviors](/docs/adapters/adapters-overview#behaviors) — `useBehaviors`
- [SEO and structured data](/docs/adapters/adapters-overview#seo-and-structured-data) — `buildRefraktHead()` + `useHead()`
- [Dependencies](/docs/adapters/adapters-overview#dependencies)

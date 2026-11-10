---
title: Next.js Adapter
description: Using refrakt.md with Next.js App Router and React Server Components
---

# Next.js Adapter

The Next.js adapter (`@refrakt-md/next`) connects refrakt.md to the [Next.js](https://nextjs.org) App Router. Content renders to static HTML in a React Server Component and is injected with `dangerouslySetInnerHTML`, so React never hydrates it; only pages with interactive runes load JavaScript, through a small client component.

## Installation

```shell
npx create-refrakt my-site --target next
```

Or add it to an existing Next.js project, alongside the [core packages](/docs/adapters/adapters-overview#dependencies):

```shell
npm install @refrakt-md/next
```

Peer dependencies: `next` 14 or 15 and `react` 18 or 19. Node.js 18+.

## Configuration

There is no Next.js plugin. Let Next transpile the refrakt packages, and set `output: 'export'` for a static site:

{% codegroup labels="next.config.mjs" %}

```javascript
/** @type {import('next').NextConfig} */
export default {
  output: 'export',
  transpilePackages: [
    '@markdoc/markdoc',
    '@refrakt-md/runes',
    '@refrakt-md/content',
    '@refrakt-md/types',
    '@refrakt-md/next',
    '@refrakt-md/transform',
  ],
};
```

{% /codegroup %}

Content is loaded with `createRefraktLoader()` from `@refrakt-md/content`, or its typed shorthand `createNextLoader()` from `@refrakt-md/next` (async). Both accept `configPath`, `site`, `variables` (real values for `{% $name %}`), and `security` (`'trusted'` by default, `'strict'` for untrusted content):

```typescript
import { createNextLoader } from '@refrakt-md/next';
const loader = await createNextLoader({ variables: { version: '1.0.0' } });
```

## Minimal setup

```
app/
├── layout.tsx          # Root layout — theme CSS + site token overrides
└── [[...slug]]/
    └── page.tsx        # Server Component — loads and renders content
refrakt.config.json
```

`[[...slug]]` is an optional catch-all, so one route handles both `/` and every nested path.

{% codegroup labels="app/[[...slug]]/page.tsx, app/layout.tsx" %}

```typescript
import { notFound } from 'next/navigation';
import { createRefraktLoader } from '@refrakt-md/content';
import { loadRefraktConfig, resolveSite } from '@refrakt-md/transform/node';
import manifest from '@refrakt-md/lumina/manifest';
import { layouts } from '@refrakt-md/lumina/layouts';
import { RefraktContent, buildUrlFromParams, buildMetadata, hasInteractiveRunes } from '@refrakt-md/next';
import { BehaviorInit } from '@refrakt-md/next/client';
import type { PageParams } from '@refrakt-md/next';

const theme = { manifest, layouts };
const loader = createRefraktLoader();
const { site: siteConfig } = resolveSite(loadRefraktConfig('refrakt.config.json'));
const seoSite = {
  siteName: siteConfig.siteName,
  baseUrl: siteConfig.baseUrl,
  defaultImage: siteConfig.defaultImage,
  logo: siteConfig.logo,
};

export async function generateStaticParams() {
  const site = await loader.getSite();
  return site.pages
    .filter(p => !p.route.draft)
    .map(p => ({ slug: p.route.url === '/' ? [] : p.route.url.slice(1).split('/') }));
}

export async function generateMetadata({ params }: { params: Promise<PageParams> }) {
  const url = buildUrlFromParams(await params);
  const site = await loader.getSite();
  const page = site.pages.find(p => p.route.url === url);
  if (!page) return {};
  return buildMetadata({ title: page.frontmatter.title as string, frontmatter: page.frontmatter, seo: page.seo, ...seoSite });
}

export default async function Page({ params }: { params: Promise<PageParams> }) {
  const url = buildUrlFromParams(await params);
  const [site, transform, hl] = await Promise.all([
    loader.getSite(),
    loader.getTransform(),
    loader.getHighlightTransform(),
  ]);
  const page = site.pages.find(p => p.route.url === url);
  if (!page) notFound();

  const renderable = hl(transform(page.renderable));
  const regions = Object.fromEntries(
    [...page.layout.regions.entries()].map(([name, r]) => [
      name,
      { name: r.name, mode: r.mode, content: r.content.map(c => hl(transform(c))) },
    ])
  );
  const pages = site.pages
    .filter(p => !p.route.draft)
    .map(p => ({ url: p.route.url, title: p.frontmatter.title ?? '', draft: false }));

  return (
    <>
      {hl.css && <style dangerouslySetInnerHTML={{ __html: hl.css }} />}
      <RefraktContent
        theme={theme}
        page={{ renderable, regions, title: page.frontmatter.title ?? '', url, pages }}
      />
      {hasInteractiveRunes(renderable) && <BehaviorInit pages={pages} currentUrl={url} />}
    </>
  );
}
```

```typescript
import '@refrakt-md/lumina';
import { getSiteTokensCss } from '@refrakt-md/next';
import type { ReactNode } from 'react';

// Composed once per server process, not once per request
const siteTokensCssPromise = getSiteTokensCss();

export default async function RootLayout({ children }: { children: ReactNode }) {
  const siteTokensCss = await siteTokensCssPromise;
  return (
    <html lang="en">
      <head>
        {siteTokensCss && <style dangerouslySetInnerHTML={{ __html: siteTokensCss }} />}
      </head>
      <body>{children}</body>
    </html>
  );
}
```

{% /codegroup %}

The root layout imports the theme barrel (`@refrakt-md/lumina`), which Next.js bundles like any CSS import. To import only the CSS your content uses, generate the import list at build time with `getUsedCssImports()` (it returns `base.css` plus one specifier per used rune block). The inline site-tokens `<style>` sits in `<head>` after the theme CSS so your overrides win.

If you prefer a linked stylesheet, write `await getSiteTokensCss()` to `public/site-tokens.css` from `next.config.mjs` at build time, and add `<link rel="stylesheet" href="/site-tokens.css">` after the theme CSS.

## RefraktContent

`RefraktContent` is a Server Component that calls `renderPage()` (layout selection, layout transform, `renderToHtml()`) and injects the resulting HTML string with `dangerouslySetInnerHTML`.

| Prop | Type | Description |
|------|------|-------------|
| `theme` | `NextTheme` | Theme manifest and layout configs (`{ manifest, layouts }`) |
| `page` | `LayoutPageData` | Renderable tree, regions, title, URL, pages list |
| `search` | `boolean?` | `false` strips the search chrome |
| `className` | `string?` | CSS class on the wrapper `<div>` |

**Why `dangerouslySetInnerHTML`?** The identity transform produces HTML with BEM classes and `rf-*` custom elements, not React components. Injecting it means React never reconciles or hydrates the content tree; the server's HTML reaches the browser as-is. There is therefore no component registry in this adapter. For component overrides, render `page.renderable` with the `Renderer` from `@refrakt-md/react` instead.

## BehaviorInit

`BehaviorInit` (from `@refrakt-md/next/client`) is a `'use client'` component that renders nothing. On mount it dynamically imports `@refrakt-md/behaviors`, sets the page context, registers the custom elements, and initializes rune and layout behaviors; on unmount it runs their cleanup. It re-runs the cycle on every App Router navigation (it watches `usePathname()`).

Render it only where `hasInteractiveRunes(renderable)` is true, so pages without interactive runes never load the behaviors bundle.

The `./client` entry is separate so the `'use client'` directive covers only `BehaviorInit`; the main `@refrakt-md/next` entry stays server-safe and never imports React client hooks or browser APIs.

## Metadata and JSON-LD

`buildMetadata()` turns the page's SEO data into a Next.js `Metadata` object. With the site-level fields it also sets `metadataBase` (so Next absolutizes relative URLs itself), `openGraph.siteName`, and the image fallback:

| Field | Source |
|-------|--------|
| `metadataBase` | `new URL(baseUrl)` |
| `title`, `openGraph.title`, `twitter.title` | `seo.og.title` or `title` |
| `description`, `openGraph.description`, `twitter.description` | `seo.og.description` or `frontmatter.description` |
| `openGraph.siteName` | `siteName` |
| `openGraph.images`, `twitter.images` | `seo.og.image` or `defaultImage` |
| `openGraph.url` / `openGraph.type` | `seo.og.url` / `seo.og.type` |
| `twitter.card` | `summary_large_image` when an image resolves, `summary` otherwise |

`Metadata` has no JSON-LD field, so render it separately with `buildJsonLd()`, which takes the same input and returns the schema objects (plus WebSite + Organization entries when `baseUrl` is set):

```typescript
import { buildJsonLd } from '@refrakt-md/next';

{buildJsonLd({ title, frontmatter: page.frontmatter, seo: page.seo, ...seoSite }).map((schema, i) => (
  <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
))}
```

## Custom elements

The identity transform emits custom elements such as `<rf-icon>` and `<rf-nav>`, registered at runtime by `@refrakt-md/behaviors`. Because the HTML is injected rather than rendered as JSX, React's custom-element handling (which differs between React 18 and 19) never applies — no configuration is needed.

## Pages Router

`RefraktContent` and `BehaviorInit` are designed for the App Router. With the Pages Router, call `renderPage()` in `getStaticProps` and initialize behaviors yourself.

## Shared setup

These work the same way for every adapter; see the overview:

- [CSS](/docs/adapters/adapters-overview#css) — imported in `app/layout.tsx`
- [Site-level token overrides](/docs/adapters/adapters-overview#site-level-token-overrides) — `getSiteTokensCss()`
- [Behaviors](/docs/adapters/adapters-overview#behaviors) — `BehaviorInit`
- [SEO and structured data](/docs/adapters/adapters-overview#seo-and-structured-data) — `buildMetadata()` + `buildJsonLd()`
- [Dependencies](/docs/adapters/adapters-overview#dependencies)

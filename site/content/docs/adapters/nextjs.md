---
title: Next.js Adapter
description: Using refrakt.md with Next.js App Router and React Server Components
---

# Next.js Adapter

The Next.js adapter (`@refrakt-md/next`) connects refrakt.md to [Next.js](https://nextjs.org) App Router. It renders content as static HTML via React Server Components with zero client-side hydration for content — only interactive rune behaviors load JavaScript.

## Installation

```shell
npm install @refrakt-md/next @refrakt-md/content @refrakt-md/runes @refrakt-md/transform @refrakt-md/highlight @refrakt-md/types @markdoc/markdoc
```

## Configuration

Set `target` to `"next"` in `refrakt.config.json`:

```json
{
  "contentDir": "./content",
  "theme": "@refrakt-md/lumina",
  "target": "next",
  "routeRules": [
    { "pattern": "**", "layout": "default" }
  ]
}
```

## NextTheme Interface

The Next.js adapter uses the `NextTheme` interface — structurally identical to `HtmlTheme`:

```typescript
interface NextTheme {
  manifest: ThemeManifest;
  layouts: Record<string, LayoutConfig>;
}
```

All runes render through the identity transform + CSS. Interactive runes get their behavior from `@refrakt-md/behaviors` via the `BehaviorInit` client component.

## Project Structure

A Next.js refrakt.md site uses a catch-all route in the App Router:

```
app/
├── layout.tsx              # Root layout — imports theme CSS
├── [[...slug]]/
│   └── page.tsx            # Server Component — loads + renders content
content/
├── index.md
├── docs/
│   ├── _layout.md
│   └── getting-started.md
refrakt.config.json
```

The `[[...slug]]/page.tsx` is an optional catch-all route that handles both the root `/` path and all nested paths like `/docs/getting-started`.

## Content Loading

Load content using `createRefraktLoader` from `@refrakt-md/content` in a Server Component. It handles config loading, community package merging, theme assembly, and caching automatically. Use `generateStaticParams` for static export:

{% codegroup labels="app/[[...slug]]/page.tsx" %}

```typescript
import { createRefraktLoader } from '@refrakt-md/content';
import manifest from '@refrakt-md/lumina/manifest';
import { layouts } from '@refrakt-md/lumina/layouts';
const theme = { manifest, layouts };
import { RefraktContent, buildUrlFromParams, buildMetadata, hasInteractiveRunes } from '@refrakt-md/next';
import { BehaviorInit } from '@refrakt-md/next/client';
import type { PageParams } from '@refrakt-md/next';

const loader = createRefraktLoader();

export async function generateStaticParams() {
  const site = await loader.getSite();
  return site.pages
    .filter(p => !p.route.draft)
    .map(p => ({
      slug: p.route.url === '/' ? [] : p.route.url.slice(1).split('/'),
    }));
}

export async function generateMetadata({ params }: { params: Promise<PageParams> }) {
  const resolvedParams = await params;
  const url = buildUrlFromParams(resolvedParams);
  const site = await loader.getSite();
  const page = site.pages.find(p => p.route.url === url);
  if (!page) return {};
  return buildMetadata({ title: page.frontmatter.title as string, seo: page.seo });
}

export default async function Page({ params }: { params: Promise<PageParams> }) {
  const resolvedParams = await params;
  const url = buildUrlFromParams(resolvedParams);
  const [site, transform, hl] = await Promise.all([
    loader.getSite(),
    loader.getTransform(),
    loader.getHighlightTransform(),
  ]);
  const page = site.pages.find(p => p.route.url === url);
  if (!page) return notFound();

  const renderable = hl(transform(page.renderable));
  const pages = site.pages
    .filter(p => !p.route.draft)
    .map(p => ({ url: p.route.url, title: p.frontmatter.title ?? '', draft: false }));

  const pageData = {
    renderable,
    title: page.frontmatter.title ?? '',
    url,
    pages,
    regions: {},
  };

  return (
    <>
      <RefraktContent theme={theme} page={pageData} />
      {hasInteractiveRunes(renderable) && (
        <BehaviorInit pages={pages} currentUrl={url} />
      )}
    </>
  );
}
```

{% /codegroup %}

## RefraktContent Server Component

`RefraktContent` is a React Server Component that renders refrakt content to HTML. It calls `renderPage()` to produce an HTML string, then injects it with `dangerouslySetInnerHTML`:

```typescript
import { RefraktContent } from '@refrakt-md/next';

// In a Server Component:
<RefraktContent theme={theme} page={pageData} className="rf-content" />
```

**Why `dangerouslySetInnerHTML`?** The identity transform produces HTML with BEM classes and `rf-*` custom elements. These are not React components — they are raw HTML that React should pass through untouched. Using `dangerouslySetInnerHTML` means React never tries to reconcile or hydrate the content tree. The HTML is rendered on the server and sent to the browser as-is.

This is the same approach as the HTML adapter, just wrapped in a React component for ergonomics.

### Props

| Prop | Type | Description |
|------|------|-------------|
| `theme` | `NextTheme` | Theme manifest and layout configs |
| `page` | `LayoutPageData` | Page content (renderable tree, regions, title, URL, pages list) |
| `className` | `string?` | Optional CSS class on the wrapper `<div>` |

## BehaviorInit Client Component

Interactive runes (tabs, accordion, datatable, etc.) need client-side JavaScript. `BehaviorInit` is a `'use client'` component that dynamically imports `@refrakt-md/behaviors` and initializes them:

```typescript
import { BehaviorInit } from '@refrakt-md/next/client';

<BehaviorInit pages={pages} currentUrl={url} />
```

**Lifecycle:**
1. On mount, dynamically imports `@refrakt-md/behaviors`
2. Sets page context (`RfContext.pages`, `RfContext.currentUrl`)
3. Registers custom elements (`registerElements()`)
4. Initializes rune behaviors (`initRuneBehaviors()`) and layout behaviors (`initLayoutBehaviors()`)
5. On unmount, runs cleanup functions returned by the init calls
6. On client-side navigation (route change via `usePathname()`), re-runs the full cycle

**The `./client` export** is a separate entry point so the `'use client'` directive only applies to `BehaviorInit`. The main `@refrakt-md/next` entry point stays server-safe — it never imports React client hooks or browser APIs.

### Conditional Loading

Use `hasInteractiveRunes()` to detect whether a page needs behaviors:

```typescript
import { hasInteractiveRunes } from '@refrakt-md/next';

// Only include BehaviorInit on pages that need it
{hasInteractiveRunes(renderable) && (
  <BehaviorInit pages={pages} currentUrl={url} />
)}
```

This avoids loading `@refrakt-md/behaviors` on pages that have no interactive runes.

## Metadata Helper

The `buildMetadata()` function transforms refrakt SEO data into a Next.js Metadata object for the App Router:

```typescript
import { buildMetadata, buildJsonLd } from '@refrakt-md/next';

export async function generateMetadata({ params }) {
  const page = await loadPage(params.slug);
  return buildMetadata({
    title: page.title,
    frontmatter: page.frontmatter,
    seo: page.seo,
  });
}
```

It extracts `title`, `description`, Open Graph tags, and Twitter card metadata from the page's SEO data.

## JSON-LD Structured Data

Use `buildJsonLd()` to extract JSON-LD schemas from page SEO data. Render them in the root layout or per-page:

```typescript
import { buildJsonLd } from '@refrakt-md/next';
import Script from 'next/script';

const jsonLd = buildJsonLd(page.seo);

{jsonLd.map((schema, i) => (
  <script
    key={i}
    type="application/ld+json"
    dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
  />
))}
```

## CSS Injection

Import the theme CSS in your root layout:

{% codegroup labels="app/layout.tsx" %}

```typescript
import '@refrakt-md/lumina';          // Full theme CSS (index.css)
import '@refrakt-md/lumina/base.css'; // Or just the base tokens

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

{% /codegroup %}

Next.js automatically processes CSS imports and includes them in the build output.

## Custom Elements

The identity transform produces custom elements like `<rf-icon>`, `<rf-diagram>`, and `<rf-nav>`. These are web components registered by `@refrakt-md/behaviors` at runtime. React passes them through as unknown HTML elements — no special configuration needed.

{% hint type="note" %}
React 19 has improved custom element support. For React 18 projects, custom element attributes are passed as properties on the DOM node rather than attributes, but this does not affect refrakt.md since the HTML is injected via `dangerouslySetInnerHTML`.
{% /hint %}

## Differences from SvelteKit

| Feature | SvelteKit | Next.js |
|---------|-----------|---------|
| **Rendering** | Svelte Renderer walks tree as components | `renderToHtml()` produces string, injected via `dangerouslySetInnerHTML` |
| **Component runes** | Svelte components via component registry | Not supported — all runes use identity transform |
| **Element overrides** | Table, Pre elements replaced with Svelte components | Table wrapping handled by CSS; code copy by behaviors |
| **Behaviors** | `use:behaviors` Svelte action | `BehaviorInit` client component with `useEffect` |
| **Build integration** | Vite plugin with virtual modules + HMR | Manual content loading in Server Components |
| **SEO** | `<svelte:head>` in ThemeShell | `generateMetadata()` + `buildMetadata()` |
| **Navigation** | SvelteKit client-side routing | Next.js App Router navigation |

The content output is identical — the same Markdoc runes produce the same BEM classes, data attributes, and structural HTML. The difference is how that HTML reaches the browser.

## Compatibility

| Dependency | Version |
|-----------|---------|
| Next.js | 14.x or 15.x |
| React | 18.x or 19.x |
| Node.js | 18+ |

The adapter works with both the Pages Router and App Router, but the `RefraktContent` Server Component and `BehaviorInit` client component are designed for the App Router pattern. For Pages Router usage, call `renderPage()` directly in `getStaticProps`.

## Dependencies

| Package | Required | Purpose |
|---------|----------|---------|
| `@refrakt-md/transform` | Yes | Identity transform engine, layout transform, `renderToHtml` |
| `@refrakt-md/types` | Yes | Shared TypeScript interfaces |
| `@refrakt-md/content` | Yes | Content loading, routing, layout cascade |
| `@refrakt-md/behaviors` | Yes | Client-side progressive enhancement for interactive runes |
| `next` | Peer | Next.js framework |
| `react` | Peer | React runtime |

## Theme Integration

Themes work with the Next.js adapter through their `./next` subpath export:

```typescript
import manifest from '@refrakt-md/lumina/manifest';
import { layouts } from '@refrakt-md/lumina/layouts';
const theme = { manifest, layouts };
```

This provides the `NextTheme` object with the manifest and layout configs. For CSS, import the theme's main export in your root layout.

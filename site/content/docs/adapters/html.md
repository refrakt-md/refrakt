---
title: HTML Adapter
description: Pure HTML rendering for refrakt.md — no framework required
---

# HTML Adapter

The HTML adapter (`@refrakt-md/html`) renders refrakt.md content to plain HTML strings. No framework runtime, no build tooling beyond TypeScript — just static HTML files.

## Installation

```shell
npm install @refrakt-md/html @refrakt-md/content @refrakt-md/runes @refrakt-md/transform @refrakt-md/highlight @refrakt-md/types @markdoc/markdoc
```

Or scaffold a complete project:

```shell
npx create-refrakt my-site --target html
```

## Configuration

Set `target` to `"html"` in `refrakt.config.json`:

```json
{
  "contentDir": "./content",
  "theme": "@refrakt-md/lumina",
  "target": "html",
  "routeRules": [
    { "pattern": "**", "layout": "default" }
  ]
}
```

## HtmlTheme Interface

The HTML adapter uses a simpler theme interface than SvelteKit — no component registry or element overrides:

```typescript
interface HtmlTheme {
  manifest: ThemeManifest;
  layouts: Record<string, LayoutConfig>;
}
```

All runes render through the identity transform + CSS. Interactive runes get their behavior from `@refrakt-md/behaviors` via client-side initialization.

## Core API

### `renderPage(input)`

Renders a page's content to an HTML fragment. Applies the layout transform and HTML-specific tree transforms (table wrapping), then produces an HTML string. Does not include `<!DOCTYPE>` or `<head>`.

```typescript
import { renderPage } from '@refrakt-md/html';

const html = renderPage({ theme, page });
```

### `renderFullPage(input, options?)`

Renders a complete HTML document with `<!DOCTYPE>`, `<head>` (title, meta, OG tags, JSON-LD, stylesheets), `<body>` (content + context data), and script tags.

```typescript
import { renderFullPage } from '@refrakt-md/html';

const html = renderFullPage(
  { theme, page },
  {
    stylesheets: ['/styles.css'],
    scripts: ['/behaviors.js'],
    headExtra: '<link rel="icon" href="/favicon.ico">',
    lang: 'en',
    seo: page.seo,
  }
);
```

### `PageShellOptions`

| Option | Type | Description |
|--------|------|-------------|
| `stylesheets` | `string[]` | CSS stylesheet URLs for `<link>` tags in `<head>` |
| `scripts` | `string[]` | JavaScript URLs for `<script>` tags before `</body>` |
| `headExtra` | `string` | Extra HTML to inject into `<head>` |
| `lang` | `string` | HTML `lang` attribute (default: `"en"`) |
| `baseUrl` | `string` | Base URL for Open Graph canonical URLs |
| `seo` | `PageSeo` | SEO metadata (JSON-LD schemas and Open Graph tags) |


## Client-Side Behaviors

Interactive runes (tabs, accordion, datatable, etc.) need client-side JavaScript. The HTML adapter provides an `initPage()` function that dynamically imports `@refrakt-md/behaviors`:

```typescript
import { initPage } from '@refrakt-md/html/client';

// Initialize behaviors — reads page context from embedded JSON
const cleanup = initPage(document);

// Call cleanup when navigating away (SPA) or tearing down
cleanup();
```

`initPage` reads page context from a `<script id="rf-context">` JSON block that `renderFullPage` embeds in the document. It registers web component elements, initializes rune behaviors, and initializes layout behaviors.

{% hint type="note" %}
`@refrakt-md/behaviors` is an optional peer dependency. If not installed, the page renders correctly but interactive runes (tabs, accordion, etc.) won't have JavaScript enhancement.
{% /hint %}

## Usage Example

A complete build script that loads content, applies transforms, and writes static HTML:

```typescript
import { createRefraktLoader } from '@refrakt-md/content';
import { renderFullPage } from '@refrakt-md/html';
import type { HtmlTheme } from '@refrakt-md/html';
import { defaultLayout } from '@refrakt-md/transform';
import { mkdirSync, writeFileSync } from 'node:fs';
import * as path from 'node:path';
import manifest from '@refrakt-md/lumina/manifest';
import { layouts } from '@refrakt-md/lumina/layouts';

const theme: HtmlTheme = { manifest, layouts: { default: defaultLayout } };
const loader = createRefraktLoader();

async function build() {
  const [site, transform, hl] = await Promise.all([
    loader.getSite(),
    loader.getTransform(),
    loader.getHighlightTransform(),
  ]);

  const pages = site.pages
    .filter(p => !p.route.draft)
    .map(p => ({ url: p.route.url, title: p.frontmatter.title ?? '', draft: false }));

  for (const page of site.pages) {
    if (page.route.draft) continue;

    // Serialize → identity transform → highlight
    const renderable = hl(transform(serialize(page.renderable)));
    const regions = Object.fromEntries(
      [...page.layout.regions.entries()].map(([name, r]) => [
        name,
        { name: r.name, mode: r.mode, content: r.content.map(c => hl(transform(serialize(c)))) },
      ])
    );

    const html = renderFullPage(
      { theme, page: { renderable, regions, title: page.frontmatter.title ?? '', url: page.route.url, pages } },
      { stylesheets: ['/styles.css'], seo: page.seo }
    );

    const filePath = page.route.url === '/'
      ? 'build/index.html'
      : path.join('build', page.route.url.slice(1), 'index.html');

    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, html);
  }
}

function serialize(node: any): any {
  if (node == null || typeof node !== 'object') return node;
  if (Array.isArray(node)) return node.map(serialize);
  if (node.$$mdtype === 'Tag') {
    return { $$mdtype: 'Tag', name: node.name, attributes: node.attributes, children: (node.children ?? []).map(serialize) };
  }
  return node;
}

build();
```

## Dependencies

The HTML adapter has minimal dependencies:

| Package | Required | Purpose |
|---------|----------|---------|
| `@refrakt-md/transform` | Yes | Identity transform engine, layout transform, `renderToHtml` |
| `@refrakt-md/types` | Yes | Shared TypeScript interfaces |
| `@refrakt-md/behaviors` | Optional | Client-side progressive enhancement for interactive runes |

## Theme Integration

Themes work with the HTML adapter through their config and CSS exports. No special `./html` export is needed — the `./transform` export (theme config) and `.` export (CSS) are sufficient:

```typescript
import { themeConfig } from 'my-theme/transform';
import { createTransform } from '@refrakt-md/transform';

const transform = createTransform(themeConfig);
```

For CSS, reference the theme's stylesheet in `renderFullPage`:

```typescript
renderFullPage(input, { stylesheets: ['/path/to/theme.css'] });
```

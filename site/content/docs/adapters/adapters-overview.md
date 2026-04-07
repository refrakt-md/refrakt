---
title: Adapters
description: How refrakt.md connects to different rendering targets
---

# Adapters

An adapter connects the framework-agnostic transform pipeline to a specific rendering target. The identity transform and layout transform produce a serialized tag tree with BEM classes, structural elements, and data attributes. The adapter turns that tree into output for a particular environment.

## Available Adapters

| Adapter | Packages | Use case |
|---------|----------|----------|
| **SvelteKit** | `@refrakt-md/svelte` + `@refrakt-md/sveltekit` | SvelteKit apps with SSR, SPA navigation, and the full Svelte component ecosystem |
| **Astro** | `@refrakt-md/astro` | MPA-first static site generation with zero JS by default |
| **Next.js** | `@refrakt-md/next` | React Server Components with zero-hydration content rendering |
| **Nuxt** | `@refrakt-md/nuxt` | Nuxt 3 apps with Vite, SSR, and Vue rendering |
| **Eleventy** | `@refrakt-md/eleventy` | Template-driven static sites with no bundler — just data files and Nunjucks |
| **HTML** | `@refrakt-md/html` | Static site generation with pure HTML output — no framework required |

## What all adapters share

Every adapter uses the same core pipeline:

- **Rune schemas** (`@refrakt-md/runes`) — Markdoc tags that reinterpret Markdown primitives
- **Identity transform** (`@refrakt-md/transform`) — BEM classes, structural injection, meta consumption
- **Layout transform** (`@refrakt-md/transform`) — declarative page layouts with slots, computed content, and chrome
- **Behaviors** (`@refrakt-md/behaviors`) — vanilla JS progressive enhancement for interactive runes (tabs, accordion, datatable, etc.)
- **Theme config and CSS** — the same theme config and CSS files work with any adapter
- **Content loading** (`@refrakt-md/content`) — filesystem routing, layout resolution, cross-page pipeline

The same content renders identically regardless of adapter. Switching adapters changes the runtime and deployment model, not the output.

## The `target` field

The `refrakt.config.json` file includes a `target` field that tells tooling which adapter the project uses:

```json
{
  "contentDir": "./content",
  "theme": "@refrakt-md/lumina",
  "target": "svelte"
}
```

Valid target values: `"svelte"`, `"astro"`, `"nuxt"`, `"next"`, `"eleventy"`, `"html"`.

```json
{
  "target": "astro"
}
```

## Scaffolding

The `create-refrakt` CLI scaffolds projects for either adapter:

```shell
# SvelteKit (default)
npx create-refrakt my-site

# HTML
npx create-refrakt my-site --target html
```

## Choosing an adapter

**Choose SvelteKit** when you want a full application framework with server-side rendering, client-side navigation, and the ability to use Svelte components for custom rune rendering.

**Choose Astro** when you want an MPA-first static site with zero client JS by default. Astro ships no JavaScript for static-only pages and progressively adds behavior scripts only where needed.

**Choose Next.js** when you want React Server Components. Content renders with zero hydration cost via `dangerouslySetInnerHTML`, with a thin client component for behavior initialization.

**Choose Nuxt** when you want a Vue-based framework with SSR. Closest to SvelteKit in architecture — Vite-based, file-system routing, same plugin patterns.

**Choose Eleventy** when you want the simplest integration. No Vite, no bundler, no framework — just template-driven static generation with global data files and Nunjucks templates.

**Choose HTML** when you want the simplest possible setup — a Node.js build script that produces static HTML files. No framework runtime, no build tooling beyond TypeScript.

All adapters support the behaviors library for interactive runes. All produce the same semantic HTML with BEM classes. The difference is in how that HTML gets to the browser.

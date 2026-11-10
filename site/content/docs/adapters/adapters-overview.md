---
title: Adapters
description: How refrakt.md connects to different rendering targets, and the setup every adapter shares
---

# Adapters

An adapter connects the framework-agnostic transform pipeline to a specific rendering target. The identity transform and layout transform produce a serialized tag tree with BEM classes, structural elements, and data attributes. The adapter turns that tree into output for a particular environment.

This page covers what every adapter has in common: scaffolding, CSS, site-level token overrides, behaviors, SEO, and dependencies. Each adapter page covers only its own installation, wiring, and APIs.

## Available adapters

| Adapter | `--target` | Packages | Use case |
|---------|------------|----------|----------|
| [SvelteKit](/docs/adapters/sveltekit) | `sveltekit` | `@refrakt-md/svelte` + `@refrakt-md/sveltekit` | SvelteKit apps with SSR, SPA navigation, and Svelte components for custom rune rendering |
| [Astro](/docs/adapters/astro) | `astro` | `@refrakt-md/astro` | MPA-first static site generation with zero JS by default |
| [Next.js](/docs/adapters/nextjs) | `next` | `@refrakt-md/next` | React Server Components with zero-hydration content rendering |
| [Nuxt](/docs/adapters/nuxt) | `nuxt` | `@refrakt-md/nuxt` | Nuxt 3 apps with Vite, SSR, and Vue rendering |
| [Eleventy](/docs/adapters/eleventy) | `eleventy` | `@refrakt-md/eleventy` | Template-driven static sites with no bundler — just data files and Nunjucks |
| [HTML](/docs/adapters/html) | `html` | `@refrakt-md/html` | A Node.js build script that writes plain HTML files — no framework required |

## What all adapters share

Every adapter uses the same core pipeline:

- **Rune schemas** (`@refrakt-md/runes`) — Markdoc tags that reinterpret Markdown primitives
- **Identity transform** (`@refrakt-md/transform`) — BEM classes, structural injection, meta consumption
- **Layout transform** (`@refrakt-md/transform`) — declarative page layouts with slots, computed content, and chrome
- **Behaviors** (`@refrakt-md/behaviors`) — vanilla JS progressive enhancement for interactive runes (tabs, accordion, datatable, etc.)
- **Theme config and CSS** — the same theme config and CSS files work with any adapter
- **Content loading** (`@refrakt-md/content`) — filesystem routing, layout resolution, cross-page pipeline. Most adapters load content through its `createRefraktLoader()`, which reads `refrakt.config.json`, loads plugins, assembles the theme config, and caches the result

The same content renders identically regardless of adapter. Switching adapters changes the runtime and deployment model, not the output.

The theme object an adapter renders with is the theme package's `manifest` plus its `layouts`. Only SvelteKit's `SvelteTheme` adds more (a component registry and element overrides); the Astro, Next.js, Nuxt, Eleventy, and HTML theme types are all `{ manifest, layouts }`.

## Scaffolding

`create-refrakt` scaffolds a working project for any adapter. Pass the adapter with `--target`:

```shell
npx create-refrakt my-site --target sveltekit
npx create-refrakt my-site --target astro
npx create-refrakt my-site --target next
npx create-refrakt my-site --target nuxt
npx create-refrakt my-site --target eleventy
npx create-refrakt my-site --target html
```

Without `--target`, the CLI asks which framework to use, and falls back to `sveltekit` when it cannot prompt. `--framework` is an alias for `--target`.

Scaffolded configs still carry a `target` field (`"svelte"` for SvelteKit, otherwise the `--target` value). It is deprecated and documentation-only — no adapter reads it — so you don't need to set it.

## Choosing an adapter

**Choose SvelteKit** when you want a full application framework with server-side rendering, client-side navigation, and the ability to use Svelte components for custom rune rendering.

**Choose Astro** when you want an MPA-first static site with zero client JS by default. Astro ships no JavaScript for static-only pages and progressively adds behavior scripts only where needed.

**Choose Next.js** when you want React Server Components. Content renders with zero hydration cost via `dangerouslySetInnerHTML`, with a thin client component for behavior initialization.

**Choose Nuxt** when you want a Vue-based framework with SSR. Closest to SvelteKit in architecture — Vite-based, file-system routing, same plugin patterns.

**Choose Eleventy** when you want template-driven static generation without a bundler — global data files, pagination, and Nunjucks templates.

**Choose HTML** when you want the smallest possible setup — a Node.js build script that produces static HTML files. No framework runtime, no build tooling beyond TypeScript.

All adapters produce the same semantic HTML with BEM classes and support the behaviors library. The difference is in how that HTML gets to the browser.

## CSS

A theme package ships its CSS in three forms:

- the **barrel** — the package root (`@refrakt-md/lumina`, i.e. `index.css`) imports everything
- **`base.css`** — tokens and global styles
- **per-rune files** — `styles/runes/<block>.css`, one per rune block

Every page needs the theme CSS loaded. Lumina styles the official plugins' runes too; a third-party plugin that ships its own stylesheet needs that loaded as well.

The Vite-based adapters (SvelteKit, Astro, Nuxt) inject the theme CSS for you, and in production builds include only `base.css` plus the per-rune files for runes your content actually uses. Next.js, Eleventy, and HTML load the CSS you point them at; each adapter page shows how. Those three also export the same used-rune analysis (`getUsedCssImports`, `computeUsedCssBlocks`) if you want the smaller set.

Syntax highlighting adds one more stylesheet. The loader's `getHighlightTransform()` returns a transform that runs **after** the identity transform, and its `css` property holds the theme's highlight CSS, which the page must inline in `<head>`:

```typescript
const hl = await loader.getHighlightTransform();
const renderable = hl(transform(page.renderable)); // identity first, then highlight
// …then emit `<style>${hl.css}</style>` in <head>
```

## Site-level token overrides

Any `theme.presets`, `theme.tokens`, `theme.modes`, or `tints` you declare on a site in `refrakt.config.json` are composed into one stylesheet of `--rf-*` custom properties — no CSS authoring required:

```json
{
  "sites": {
    "main": {
      "theme": {
        "package": "@refrakt-md/lumina",
        "presets": ["@refrakt-md/lumina/presets/nord"],
        "tokens": {
          "color": { "text": "#1a1a1a" }
        },
        "modes": {
          "dark": { "color": { "text": "#f5f5f5" } }
        }
      },
      "tints": {
        "nord-scoped": {
          "extends": "@refrakt-md/lumina/presets/nord"
        }
      }
    }
  }
}
```

This produces:

- `:root { --rf-color-text: #1a1a1a; ... }` (active preset + inline override)
- `[data-color-scheme="dark"] { --rf-color-text: #f5f5f5; ... }` (mode overlay)
- `[data-tint="nord-scoped"] { --rf-syntax-keyword: ...; ... }` (scoped tint projection)

The overrides stylesheet must load **after** the theme CSS so the `--rf-*` cascade resolves to your values last. With no overrides (or the plain string theme form) the stylesheet is empty, so it is always safe to include.

How it reaches the page depends on the adapter:

| Adapter | Mechanism |
|---------|-----------|
| SvelteKit | Included in `virtual:refrakt/tokens` automatically |
| Astro | Injected by the integration (`virtual:refrakt/site-tokens.css`) |
| Nuxt | Injected by the module (`virtual:refrakt/site-tokens.css`) |
| Next.js | `getSiteTokensCss()`, inlined in the root layout |
| Eleventy | `writeSiteTokensCss()` writes a file you passthrough-copy and link |
| HTML | `composeSiteTokensCss()`, inlined via `headExtra` |

See [Sites](/docs/configuration/sites#theme-object-form) for the theme object form, the [design tokens contract](/docs/themes/css) and the [scoped tint projection](/themes/nord) pages for the full token surface.

## Behaviors

Interactive runes (tabs, accordion, datatable, nav, search, and others) render as complete HTML on the server and are progressively enhanced in the browser by `@refrakt-md/behaviors`. Without behaviors the page still renders correctly; interactive runes just stay static.

Every adapter must initialize behaviors on the client. Initialization is the same four steps everywhere:

1. Set the page context — `RfContext.pages` (the page list used by nav, search, and the version switcher) and `RfContext.currentUrl`
2. Register the `rf-*` web components — `registerElements()`
3. Enhance runes — `initRuneBehaviors()`
4. Enhance layout chrome — `initLayoutBehaviors()`

Both `init*` calls return cleanup functions. With client-side navigation (SvelteKit, Next.js, Nuxt, Astro View Transitions) initialization must re-run after each navigation; the adapters' own helpers do this for you.

The static-output adapters pass the page context through a `<script type="application/json" id="rf-context">` block holding `{ pages, currentUrl }`, which the client script reads.

Behaviors are only needed on pages that contain interactive runes or layout behaviors. The Astro, Next.js, Nuxt, and Eleventy adapters export `hasInteractiveRunes(tree)` so you can skip the script on static pages and ship zero JavaScript there.

Each adapter page shows its own call: the `ThemeShell` / `behaviors` action (SvelteKit), an inline `<script>` (Astro, Eleventy), `BehaviorInit` (Next.js), `useBehaviors` (Nuxt), and `initPage` (HTML).

## SEO and structured data

Every loaded page carries a `seo` object built during the schema transform:

- `seo.jsonLd` — schema.org JSON-LD objects extracted from the page's runes
- `seo.og` — Open Graph fields (`title`, `description`, `image`, `url`, `type`)

From that, each adapter's SEO helper emits the page `<title>`, the description meta, Open Graph and Twitter Card tags, and one `<script type="application/ld+json">` per schema. The Twitter card is `summary_large_image` when an image resolves and `summary` otherwise.

Four optional site-level fields in `refrakt.config.json` enrich the output:

```json
{
  "sites": {
    "main": {
      "contentDir": "./content",
      "theme": "@refrakt-md/lumina",
      "siteName": "Refrakt",
      "baseUrl": "https://refrakt.md",
      "defaultImage": "/og-image.png",
      "logo": "/favicon-192.png"
    }
  }
}
```

| Field | Effect |
|-------|--------|
| `siteName` | `og:site_name`, and the name in the WebSite + Organization JSON-LD entries |
| `baseUrl` | Absolute `og:url` (and canonical `<link>`, where the helper writes head tags) and default image; appends WebSite + Organization JSON-LD entries |
| `defaultImage` | Fallback `og:image` / `twitter:image` for pages without their own |
| `logo` | The Organization entry's logo |

Without them the output stays minimal — only per-page tags. Outside SvelteKit (where `virtual:refrakt/theme` carries them for you), read them with `resolveSite()` and pass them to the adapter's helper:

```typescript
import { loadRefraktConfig, resolveSite } from '@refrakt-md/transform/node';

const { site } = resolveSite(loadRefraktConfig('refrakt.config.json'));
const seoSite = {
  siteName: site.siteName,
  baseUrl: site.baseUrl,
  defaultImage: site.defaultImage,
  logo: site.logo,
};
```

## Dependencies

Every refrakt site installs the adapter package plus the same core set:

```shell
npm install @refrakt-md/content @refrakt-md/runes @refrakt-md/transform @refrakt-md/types @refrakt-md/lumina @markdoc/markdoc
```

`@refrakt-md/content` loads content and provides `createRefraktLoader()`; `@refrakt-md/runes` holds the core rune schemas and plugin loading; `@refrakt-md/transform` holds the identity and layout transforms, `renderToHtml`, and the config helpers in `@refrakt-md/transform/node`; `@refrakt-md/types` holds the shared interfaces; `@refrakt-md/lumina` is the default theme (or use your own theme package).

Two more arrive transitively: `@refrakt-md/highlight` (a dependency of `@refrakt-md/content`, used by `getHighlightTransform()`) and `@refrakt-md/behaviors` (a dependency of every adapter package). Add them to your own `package.json` when your code imports them directly. Plugins such as `@refrakt-md/marketing` are installed and listed in `plugins` as usual.

Each adapter page lists only its own extras: the adapter package and the framework it runs on.

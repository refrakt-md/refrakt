---
title: Sites
description: Single-site vs multi-site configuration; the SiteConfig fields.
---

# Sites

Site-scoped settings live in either `site` (singular, one site) or `sites` (plural map, multiple sites). Each entry is a `SiteConfig` with the same set of fields.

## Single-site

Most projects have one site:

```json
{
  "$schema": "https://refrakt.md/refrakt.config.schema.json",
  "site": {
    "contentDir": "./content",
    "theme": "@refrakt-md/lumina",
    "target": "svelte"
  }
}
```

The legacy flat shape is equivalent — both produce `sites.default` after normalization, and adapters like the SvelteKit plugin pick the lone site automatically.

## Multi-site

Multi-site repos declare named entries under `sites`:

```json
{
  "$schema": "https://refrakt.md/refrakt.config.schema.json",
  "sites": {
    "main": {
      "contentDir": "./site/content",
      "theme": "@refrakt-md/lumina",
      "target": "svelte",
      "baseUrl": "https://example.com"
    },
    "blog": {
      "contentDir": "./blog/content",
      "theme": "@refrakt-md/lumina",
      "target": "svelte",
      "baseUrl": "https://blog.example.com"
    }
  }
}
```

Each adapter (SvelteKit, Astro, Nuxt, Next, Eleventy) accepts a `site` option that selects which entry to build:

```ts
// site/vite.config.ts (SvelteKit)
import { sveltekit } from '@sveltejs/kit/vite';
import { refrakt } from '@refrakt-md/sveltekit';

export default defineConfig({
  plugins: [
    sveltekit(),
    refrakt({ configPath: '../refrakt.config.json', site: 'main' }),
  ],
});
```

Single-site projects can omit the `site` option — the plugin picks the only entry automatically. Multi-site projects must pass it explicitly; the plugin throws at config-load time with the available names if it's missing.

## CLI `--site` flag

Site-scoped commands (`inspect`, `contracts`, `validate`, `scaffold-css`, `package validate`) accept `--site <name>`:

```bash
# Pick a specific site explicitly
npx refrakt inspect hint --type=warning --site main

# Single-site projects don't need it
npx refrakt inspect hint --type=warning
```

Unknown site names produce a "did you mean?" suggestion. Plan-only repos (no sites declared) error with a "no site configured" message when site-scoped commands are run.

## SiteConfig fields

A `SiteConfig` accepts these fields. Required fields are bold.

### Core (required)

| Field | Type | Description |
|-------|------|-------------|
| **`contentDir`** | `string` | Path to the content directory, relative to the project root. |
| **`theme`** | `string` | Active theme — npm package name (e.g., `@refrakt-md/lumina`) or relative path. |
| **`target`** | `string` | Target adapter identifier (`svelte`, `astro`, `next`, `nuxt`, `eleventy`, `html`). |

### SEO and branding

| Field | Type | Description |
|-------|------|-------------|
| `baseUrl` | `string` | Public base URL of the site. Used for canonical links, og:url, og:image. |
| `siteName` | `string` | Human-readable site name for `og:site_name` and Organization JSON-LD. |
| `logo` | `string` | Site logo path used in Organization JSON-LD (e.g., `/favicon-192.png`). |
| `defaultImage` | `string` | Default og:image for pages without their own (recommended 1200x630). |

### Content rendering

| Field | Type | Description |
|-------|------|-------------|
| `packages` | `string[]` | Community rune packages to merge into this site's `ThemeConfig`. |
| `routeRules` | `RouteRule[]` | Route-to-layout mapping rules (first match wins). |
| `overrides` | `Record<string, string>` | Component overrides — `typeof` name → relative component path. |
| `runes` | `RunesConfig` | Rune resolution: `prefer`, `aliases`, `local`. |
| `highlight` | `HighlightConfig` | Syntax highlight theme — single name or `{ light, dark }`. |
| `icons` | `Record<string, string>` | Custom icon SVGs merged into the theme's global icon group. |
| `tints` | `Record<string, object>` | Project-level tint presets. |
| `backgrounds` | `Record<string, object>` | Project-level background presets. |
| `sandbox` | `object` | `{ examplesDir }` — directory for `{% sandbox %}` examples. |

### Example: full site

```json
{
  "site": {
    "contentDir": "./content",
    "theme": "@refrakt-md/lumina",
    "target": "svelte",
    "baseUrl": "https://example.com",
    "siteName": "My Documentation",
    "logo": "/favicon-192.png",
    "packages": ["@refrakt-md/marketing", "@refrakt-md/docs"],
    "routeRules": [
      { "pattern": "blog/**", "layout": "blogArticleLayout" },
      { "pattern": "docs/**", "layout": "docsLayout" },
      { "pattern": "**", "layout": "defaultLayout" }
    ],
    "highlight": { "theme": { "light": "github-light", "dark": "github-dark" } },
    "runes": {
      "prefer": { "storyboard": "@refrakt-md/marketing" },
      "aliases": { "callout": "hint" }
    }
  }
}
```

## Path resolution

Inside a site entry, paths like `contentDir: "./content"` are interpreted relative to the **vite app's resolved root**, not the config file location. So a config at the repo root with `site.contentDir: "./content"` and a SvelteKit plugin running from `site/` resolves content from `site/content/`. This matters when you split your refrakt.config.json across multiple sites with different vite roots.

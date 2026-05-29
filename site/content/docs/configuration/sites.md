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
  "$schema": "https://refrakt.md/schemas/v0.11/refrakt.config.schema.json",
  "site": {
    "contentDir": "./content",
    "theme": "@refrakt-md/lumina",
    "target": "svelte"
  }
}
```

The SvelteKit plugin (and other adapters) picks the lone site automatically, so single-site projects don't need to pass a `site` option. The legacy flat shape (without the `site` wrapper) still loads but is **deprecated in v0.12.0** and slated for removal in v1.0 — see [Migration](/docs/configuration/migration).

## Multi-site

Multi-site repos declare named entries under `sites`:

```json
{
  "$schema": "https://refrakt.md/schemas/v0.11/refrakt.config.schema.json",
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
| **`theme`** | `string \| SiteThemeConfig` | Active theme. Accepts either a package name string (legacy shorthand — `"@refrakt-md/lumina"`) or a full `SiteThemeConfig` object with `package`, `presets`, `tokens`, `modes`, and `code.colorScheme`. See [Theme presets](#theme-object-form) for the object form. |
| **`target`** | `string` | Target adapter identifier (`svelte`, `astro`, `next`, `nuxt`, `eleventy`, `html`). |

### SEO and branding

| Field | Type | Description |
|-------|------|-------------|
| `baseUrl` | `string` | Public base URL of the site. Used for canonical links, og:url, og:image. |
| `siteName` | `string` | Human-readable site name for `og:site_name` and Organization JSON-LD. |
| `logo` | `string` | Site logo path used in Organization JSON-LD (e.g., `/favicon-192.png`). |
| `defaultImage` | `string` | Default og:image for pages without their own (recommended 1200x630). |
| `repoUrl` | `string` | Canonical GitHub (or compatible) repository URL — e.g. `"https://github.com/owner/repo"`. Used by the [`file-ref`](/runes/file-ref) rune to build deep-link `View source on GitHub →` URLs of the form `{repoUrl}/blob/{repoBranch}/{path}#L{start}-L{end}`. When absent, `file-ref` falls back to a no-href link / in-page anchor with a build warning. |
| `repoBranch` | `string` | Git ref appended to GitHub source URLs — accepts any branch name, tag, or commit SHA. Defaults to `"main"` when omitted. Use a commit SHA for archival URLs that won't drift when the file is edited later. |

### Content rendering

| Field | Type | Description |
|-------|------|-------------|
| `plugins` | `string[]` | Plugins to merge into this site's `ThemeConfig`. |
| `routeRules` | `RouteRule[]` | Route-to-layout mapping rules (first match wins). |
| `overrides` | `Record<string, string>` | Component overrides — `typeof` name → relative component path. |
| `runes` | `RunesConfig` | Rune resolution: `prefer`, `aliases`, `local`. |
| `highlight` | `HighlightConfig` | **Legacy.** Picks a Shiki built-in theme by name (or `{ light, dark }` pair) for fenced code blocks. The recommended modern approach is **`theme.presets`** with a Lumina syntax preset (`@refrakt-md/lumina/presets/nord`, `…/tideline`, etc.) plus **`theme.code.colorScheme`** to force light/dark code. Kept for back-compat; both mechanisms can coexist. |
| `icons` | `Record<string, string>` | Custom icon SVGs merged into the theme's global icon group. |
| `tints` | `Record<string, object>` | Project-level tint presets. |
| `backgrounds` | `Record<string, object>` | Project-level background presets. |
| `sandbox` | `object` | `{ examplesDir }` — directory for `{% sandbox %}` examples. |

### Theme object form

The string form (`"theme": "@refrakt-md/lumina"`) is shorthand for `{ "package": "@refrakt-md/lumina" }`. Use the object form when you need any of:

- **`presets`** — palette or syntax presets merged into the theme in declared order (last wins per token).
- **`tokens`** — site-level token overrides applied on top of the theme and any presets.
- **`modes`** — per-mode overlays (e.g. `dark`) layered on top of theme modes and preset modes.
- **`code.colorScheme`** — force fenced code blocks to a fixed scheme (`light` / `dark`) regardless of the page's mode.

| Field | Type | Description |
|-------|------|-------------|
| **`package`** | `string` | Theme package name (e.g. `@refrakt-md/lumina`) or relative path. |
| `presets` | `string[]` | Preset module identifiers merged into the theme (last wins per token). |
| `colorScheme` | `'auto' \| 'light' \| 'dark'` | Initial colour scheme — `auto` respects user preference, `light` / `dark` force the scheme. |
| `tokens` | `ThemeTokensConfig` | Token overrides applied on top of base + presets. |
| `modes` | `Record<string, PartialTokenContract>` | Per-mode overlays (typically just `dark`). |
| `code.colorScheme` | `'auto' \| 'light' \| 'dark'` | Force code blocks to a fixed scheme regardless of page mode. |

```json
{
  "site": {
    "theme": {
      "package": "@refrakt-md/lumina",
      "presets": ["@refrakt-md/lumina/presets/niwaki"],
      "tokens": {
        "color": { "primary": "#e15f80" }
      },
      "modes": {
        "dark": { "color": { "primary": "#e8788f" } }
      },
      "code": { "colorScheme": "dark" }
    }
  }
}
```

### Example: full site

```json
{
  "site": {
    "contentDir": "./content",
    "theme": {
      "package": "@refrakt-md/lumina",
      "presets": ["@refrakt-md/lumina/presets/niwaki"],
      "code": { "colorScheme": "dark" }
    },
    "target": "svelte",
    "baseUrl": "https://example.com",
    "siteName": "My Documentation",
    "logo": "/favicon-192.png",
    "plugins": ["@refrakt-md/marketing", "@refrakt-md/docs"],
    "routeRules": [
      { "pattern": "blog/**", "layout": "blogArticleLayout" },
      { "pattern": "docs/**", "layout": "docsLayout" },
      { "pattern": "**", "layout": "defaultLayout" }
    ],
    "runes": {
      "prefer": { "storyboard": "@refrakt-md/marketing" },
      "aliases": { "callout": "hint" }
    }
  }
}
```

## Path resolution

Inside a site entry, paths like `contentDir: "./content"` are interpreted relative to the **vite app's resolved root**, not the config file location. So a config at the repo root with `site.contentDir: "./content"` and a SvelteKit plugin running from `site/` resolves content from `site/content/`. This matters when you split your refrakt.config.json across multiple sites with different vite roots.

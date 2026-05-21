{% spec id="SPEC-058" status="draft" tags="frameworks, adapters, astro, nuxt, next, eleventy, html, tokens, seo" %}

# Framework adapter parity with the SvelteKit reference

`@refrakt-md/sveltekit` is the adapter the refrakt documentation site itself ships on, so it's the only adapter that gets exercised end-to-end on every release. Over the v0.14.x patch line the SvelteKit plugin grew two capabilities — site-level token-overrides CSS ({% ref "SPEC-048" /%} + {% ref "SPEC-056" /%}) and SEO meta enrichment from site-level config (`siteName`, `baseUrl`, `defaultImage`, `logo`) — that were never threaded through Astro, Nuxt, Next.js, Eleventy, or the pure-HTML renderer. The result is silent: those adapters happily read `refrakt.config.json`, ignore the new fields, and produce pages that look right but are missing the overrides + meta tags the same config produces under SvelteKit.

This spec closes the gap. It is *application* work — no new design, no new contracts. Every capability it brings to the other adapters already exists, working, in `@refrakt-md/sveltekit`. The job is extraction, sharing, and per-adapter wiring along the path each adapter natively uses.

## Problem

Two concrete capabilities sit only in the SvelteKit plugin:

### 1. Site-level token overrides CSS

`composeSiteTokensCss(site, configDir)` in `packages/sveltekit/src/plugin.ts:308` reads `theme.presets`, `theme.tokens`, `theme.modes`, and `site.tints` from the resolved per-site config and emits a single CSS string carrying:

- The active-theme `:root { --rf-* }` cascade (presets merged left-to-right, site overrides last) — {% ref "SPEC-048" /%}
- The dark-mode overlay (`modes.dark`) emitted on `[data-color-scheme="dark"]`
- Scoped tint stylesheets for any `tints[].extends` that references a preset module path — {% ref "SPEC-056" /%}

The SvelteKit plugin serves this stylesheet as the `virtual:refrakt/site-tokens.css` virtual module, imported alongside the theme package's barrel CSS in `virtual:refrakt/tokens`. Astro, Nuxt, Next.js, Eleventy, and the HTML adapter have no equivalent — they ship the theme package's CSS untouched, so `theme.tokens` / `theme.modes` / `theme.presets` / `site.tints` configured in `refrakt.config.json` is silently ignored on those adapters.

### 2. SEO HTML helpers not threaded with site-level options

`seoToHtml` (`packages/transform/src/adapter.ts:150`) accepts a second `SeoToHtmlOptions` argument:

```ts
interface SeoToHtmlOptions {
  siteName?: string;
  baseUrl?: string;
  defaultImage?: string;
  logo?: string;
}
```

When passed, it emits `og:site_name`, prefixes `og:url` / canonical with `baseUrl`, falls back missing OG images to `defaultImage`, and appends WebSite + Organization JSON-LD entries. The SvelteKit adapter wires these via the theme manifest — the `virtual:refrakt/theme` virtual module bakes `config.baseUrl`, `config.siteName`, `config.defaultImage`, `config.logo` into `theme.manifest` so `packages/svelte/src/ThemeShell.svelte` can read them at render time.

The other adapters' SEO surfaces miss this:

- `packages/astro/src/seo.ts:18` — calls `seoToHtml(extractSeoData(props))` with no options
- `packages/eleventy/src/data.ts:107` — same, no options
- `packages/nuxt/src/composables.ts` — `buildRefraktHead` builds meta tags manually, missing `og:site_name` and WebSite / Organization JSON-LD entirely, no `baseUrl` absolutization, no `defaultImage` fallback
- `packages/next/src/metadata.ts` — `buildMetadata` builds the Next.js metadata object manually with the same gaps
- `packages/html/src/page-shell.ts` — `renderFullPage` accepts a `baseUrl` option but does not surface `siteName` / `defaultImage` / `logo`, does not emit WebSite + Organization JSON-LD

A site that configures `siteName: "Refrakt"`, `baseUrl: "https://refrakt.md"`, `defaultImage: "/og.png"`, `logo: "/favicon.png"` in `refrakt.config.json` gets correct meta tags + JSON-LD on the SvelteKit site and incomplete meta on every other adapter.

## Out of scope

Capabilities the SvelteKit plugin has that are *intentionally* not in this spec — either by SPEC-030's deferral, or because they bind too tightly to Vite's plugin lifecycle:

- **CSS tree-shaking by used-rune analysis** — SPEC-030 deferred this for non-SvelteKit adapters ("Out of scope: ... CSS tree-shaking optimizations"). The other adapters ship the full theme CSS barrel.
- **Pipeline-stats build summary** — SvelteKit's `buildStart` prints a Phase 1/2/3/4 + warnings table. Non-Vite adapters have no equivalent natural hook; existing console output from `loadContent` is sufficient.
- **`security` option (SecurityPolicy)** — currently only consumed by `loadContent` in the SvelteKit virtual content module. Other adapters can adopt it later as a follow-up; not in this milestone.
- **`variables` (Markdoc `$name` variables)** — same shape: only wired through SvelteKit's virtual content module. Adopt later if a non-SvelteKit consumer asks.
- **Content HMR** — SPEC-030 deferred for non-Vite adapters.

## Solution

### 1. Extract `composeSiteTokensCss` into `@refrakt-md/transform/node`

Move the function out of `packages/sveltekit/src/plugin.ts` into `packages/transform/src/preset-loader.ts` (or a new sibling file in the same `node`-only entrypoint). Signature stays the same:

```ts
export async function composeSiteTokensCss(
  site: SiteConfig,
  configDir: string,
): Promise<string>;
```

The SvelteKit plugin updates to import from `@refrakt-md/transform/node` instead of having a local copy. Behaviour is byte-identical — the function is pure (config in, CSS string out, with one `loadPresets` side-effect that already lives in `transform/node`).

This extraction is the prerequisite for every adapter wiring item; it ships nothing user-visible by itself.

### 2. Wire site-tokens CSS through each non-SvelteKit adapter

Each adapter consumes the same `composeSiteTokensCss(site, configDir)` output, but the *delivery mechanism* matches the host framework's idioms:

| Adapter   | Delivery mechanism                                                                 |
|-----------|------------------------------------------------------------------------------------|
| Astro     | Vite virtual module (Astro runs on Vite), imported from `BaseLayout.astro`         |
| Nuxt      | Vite virtual module (Nuxt runs on Vite), imported via `nuxt.options.css` or layout |
| Eleventy  | Write the CSS to a build-time file in the data directory; passthrough copy to dist |
| Next.js   | Expose as an async helper consumers `import` in `app/layout.tsx` (Next handles CSS imports natively); for environments where dynamic CSS imports aren't an option, also expose the raw string for inline `<style>` use |
| HTML      | Expose as a helper that returns the CSS string; consumers inline it via the `headExtra` option of `renderFullPage`, or write it to a file and link from the shell |

The acceptance criterion per adapter is identical at the *output* level: a site that configures `theme.presets`, `theme.tokens`, `theme.modes`, or `site.tints` in `refrakt.config.json` must render with those overrides applied, matching the SvelteKit reference visually and selector-by-selector.

### 3. Thread `SeoToHtmlOptions` through every adapter's SEO surface

Every adapter that calls `seoToHtml` (Astro, Eleventy) or builds head metadata manually (Nuxt, Next.js, HTML) gains parity with the SvelteKit reference's site-config-driven SEO output. The pattern per adapter:

- **Astro `buildSeoHead`**: extends signature to accept `{ siteName, baseUrl, defaultImage, logo }` (or a single `site: SiteConfig` argument) and forwards to `seoToHtml`.
- **Eleventy `createDataFile`**: reads `siteName / baseUrl / defaultImage / logo` from the resolved `SiteConfig` (or accepts them as params) and forwards to `seoToHtml`.
- **Nuxt `buildRefraktHead`**: extends signature to accept the same shape, emits `og:site_name` meta, prefixes `og:url` with `baseUrl`, falls back missing image to `defaultImage`, appends WebSite + Organization JSON-LD script entries to its `script` output.
- **Next.js `buildMetadata`**: extends signature to accept the same shape, threads through `metadataBase` (Next's native `baseUrl` equivalent), populates `openGraph.siteName`, uses `defaultImage` as image fallback. Organization / WebSite JSON-LD continues to surface via `buildJsonLd` — extend `buildJsonLd` to emit the same WebSite + Organization entries `seoToHtml` does when `baseUrl + siteName` are supplied.
- **HTML `renderFullPage`**: `PageShellOptions` already has `baseUrl`; add `siteName`, `defaultImage`, `logo`. Emit `og:site_name` and the WebSite + Organization JSON-LD blocks when `baseUrl + siteName` are present. Fall back to `defaultImage` when no per-page image.

The source of the four fields is the per-site config (`SiteConfig.siteName`, `SiteConfig.baseUrl`, `SiteConfig.defaultImage`, `SiteConfig.logo`). Adapter integration code that already resolves the site (Astro integration, Nuxt module, Eleventy data file, Next loader) reads them once and forwards into every per-page SEO call.

### 4. Cleanup: `template-astro/src/setup.ts` uses `createRefraktLoader`

`packages/create-refrakt/template-astro/src/setup.ts` re-implements ~50 lines of the loader assembly (`loadRefraktConfig` → `resolveSite` → `loadPlugin` → `mergePlugins` → `assembleThemeConfig` → `createTransform`). `@refrakt-md/content`'s `createRefraktLoader` already does this and more — it loads tint presets ({% ref "SPEC-056" /%}), passes `themeOverrides` (`site.tints`, `site.backgrounds`), and exposes `getHighlightTransform` + `invalidateSite` for free. Replacing setup.ts with a thin wrapper around `createRefraktLoader` deletes ~40 lines from the template and fixes its current missing-presets bug.

This is a cleanup item, not a blocking gap — sites generated from the template before this change still work, they just don't pick up scoped tints / preset overrides. After WORK-239 + WORK-240 land, new sites get the corrected setup.ts; existing sites can adopt by running `npx create-refrakt` again or copying the new file.

## Validation

A site generated from each non-SvelteKit template, configured with the same `refrakt.config.json` snippet — `theme.presets: ["@refrakt-md/lumina/presets/nord"]`, `theme.tokens: { color: { text: "#ff0000" } }`, `site.tints.nord: { extends: "@refrakt-md/lumina/presets/nord" }`, `siteName: "Test"`, `baseUrl: "https://test.example"`, `defaultImage: "/og.png"`, `logo: "/favicon.png"` — must produce:

1. Body text rendered in red (from `theme.tokens.color.text`)
2. Nord syntax token CSS variables defined on `[data-tint="nord"]` selectors in the built bundle
3. `<meta property="og:site_name" content="Test">` in `<head>`
4. `<meta property="og:image" content="https://test.example/og.png">` on a page without its own image
5. WebSite + Organization JSON-LD `<script>` entries in `<head>`
6. Canonical `<link>` and `og:url` with absolute `https://test.example/...` URLs

The same site rendered via SvelteKit is the reference — diff-of-zero is the target.

## References

- {% ref "SPEC-030" /%} — Framework adapter system (defines per-adapter scope; this spec extends per-adapter wiring without revising scope)
- {% ref "SPEC-048" /%} — Design tokens contract (site-tokens CSS is its adapter integration)
- {% ref "SPEC-056" /%} — Syntax token contract extension (scoped tint projection)
- {% ref "WORK-187" /%} — Config-driven token stylesheet generation (deferred adapter-integration criterion this spec finally closes)
- {% ref "WORK-221" /%} — Nord preset documentation page (the SvelteKit integration this spec extends)
- `packages/sveltekit/src/plugin.ts:308` — `composeSiteTokensCss` (function to extract)
- `packages/transform/src/adapter.ts:150` — `seoToHtml` (function whose options need to be threaded through)
- `packages/content/src/refract-loader.ts:172` — `createRefraktLoader` (shared loader the Astro template should use)

{% /spec %}

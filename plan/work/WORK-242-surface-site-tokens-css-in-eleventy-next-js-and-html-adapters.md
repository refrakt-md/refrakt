{% work id="WORK-242" status="ready" priority="high" complexity="moderate" source="SPEC-058" tags="adapters, eleventy, next, html, tokens" milestone="v0.14.4" %}

# Surface site-tokens CSS in Eleventy, Next.js, and HTML adapters

The three non-Vite adapters (Eleventy, Next.js, HTML) have no virtual-module path. Each needs its own delivery surface for the CSS that {% ref "WORK-239" /%} extracts:

- **Eleventy**: passthrough copy a build-time CSS file
- **Next.js**: expose a helper consumers import in `app/layout.tsx`
- **HTML**: expose a helper that returns the CSS string for inlining or writing to disk

Same underlying source (`composeSiteTokensCss`), three thin per-adapter wrappers shaped to each framework's CSS-pickup story.

## Acceptance Criteria

### Eleventy

- [ ] `@refrakt-md/eleventy` exposes a build-time helper (e.g. `writeSiteTokensCss(site, configDir, outputPath)`) that calls `composeSiteTokensCss(site, configDir)` and writes the result to a path the consumer's eleventy.config.js can include in `addPassthroughCopy`
- [ ] `createDataFile` calls the helper during data load so the CSS file exists before Eleventy's build pass starts, *or* the helper is exported separately so users invoke it themselves in their `eleventy.config.js`
- [ ] `packages/create-refrakt/template-eleventy` is updated to wire the helper into `eleventy.config.js` and reference the generated file via `<link rel="stylesheet">` in the base template
- [ ] A test site under `examples/` configured with `theme.tokens.color.text = "#ff0000"` renders body text in red

### Next.js

- [ ] `@refrakt-md/next` exposes an async helper `getSiteTokensCss(configPath?: string, site?: string): Promise<string>` that resolves the site config and calls `composeSiteTokensCss`
- [ ] The template `packages/create-refrakt/template-next/app/layout.tsx` is updated to call the helper at module scope (Server Component) and emit a `<style dangerouslySetInnerHTML={{ __html: css }} />` block in `<head>`, or write the CSS to `public/site-tokens.css` at build time via a `next.config.mjs` hook + reference via `<link>`
- [ ] A test site under `examples/` configured with `theme.tokens.color.text = "#ff0000"` renders body text in red
- [ ] Documentation page `site/content/docs/adapters/next.md` covers the new helper with both inline-style and file-emit patterns

### HTML

- [ ] `@refrakt-md/html` exposes `composeSiteTokensCss` as a re-export (or a thin wrapper) from `@refrakt-md/transform/node`
- [ ] `PageShellOptions` documentation in `packages/html/src/page-shell.ts` is extended with an example showing how to inline the CSS via the existing `headExtra` field, e.g. `headExtra: '<style>' + siteTokensCss + '</style>'`
- [ ] `packages/create-refrakt/template-html/build.ts` is updated to call the helper and inline the result in every page's `headExtra`
- [ ] A test build with `theme.tokens.color.text = "#ff0000"` produces HTML files with the override CSS inlined and body text renders red in a browser

## Approach

### Eleventy

Add to `packages/eleventy/src/data.ts` or a new `packages/eleventy/src/tokens.ts`:

```ts
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { composeSiteTokensCss } from '@refrakt-md/transform/node';
import type { SiteConfig } from '@refrakt-md/types';

export async function writeSiteTokensCss(
  site: SiteConfig,
  configDir: string,
  outputPath: string,
): Promise<void> {
  const css = await composeSiteTokensCss(site, configDir);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, css);
}
```

`createDataFile` runs at build time and already has `site` + `configDir` in scope after WORK-243 adds them. The data factory can call `writeSiteTokensCss` once before returning the pages array, writing into a directory the consumer already has set up for `addPassthroughCopy`.

### Next.js

Next.js runs Server Components at module-import time, so a synchronous-looking helper is the natural API:

```ts
// packages/next/src/tokens.ts
import { composeSiteTokensCss } from '@refrakt-md/transform/node';
import { loadRefraktConfig, resolveSite } from '@refrakt-md/transform/node';
import { dirname, resolve } from 'node:path';

export async function getSiteTokensCss(
  configPath = './refrakt.config.json',
  siteName?: string,
): Promise<string> {
  const config = loadRefraktConfig(configPath);
  const { site } = resolveSite(config, siteName);
  return composeSiteTokensCss(site, dirname(resolve(configPath)));
}
```

`app/layout.tsx` calls the helper at top-level and inlines the result:

```tsx
const siteTokensCss = await getSiteTokensCss();
// ...
<head>
  <style dangerouslySetInnerHTML={{ __html: siteTokensCss }} />
</head>
```

Build-time file emit is an alternative for users who prefer a linked stylesheet — document but don't enforce.

### HTML

The HTML adapter is the lowest-level — it doesn't own a build pipeline at all. Re-exporting `composeSiteTokensCss` and documenting the `headExtra` pattern is enough:

```ts
// packages/html/src/index.ts
export { composeSiteTokensCss } from '@refrakt-md/transform/node';
```

`template-html/build.ts` then uses it directly:

```ts
const siteTokensCss = await composeSiteTokensCss(site, configDir);
// per page:
const html = renderFullPage({ theme, page }, {
  stylesheets,
  headExtra: `<style>${siteTokensCss}</style>`,
});
```

## Dependencies

- {% ref "WORK-239" /%} — `composeSiteTokensCss` must be importable from `@refrakt-md/transform/node`

## References

- {% ref "SPEC-058" /%} — adapter parity spec, "Wire site-tokens CSS through each non-SvelteKit adapter"
- `packages/eleventy/src/data.ts` — Eleventy data factory
- `packages/next/src/index.ts` — Next.js public exports
- `packages/html/src/index.ts` — HTML adapter public exports

{% /work %}

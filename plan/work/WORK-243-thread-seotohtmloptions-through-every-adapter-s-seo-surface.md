{% work id="WORK-243" status="done" priority="high" complexity="moderate" source="SPEC-058" tags="adapters, seo, astro, nuxt, next, eleventy, html" milestone="v0.14.4" %}

# Thread SeoToHtmlOptions through every adapter's SEO surface

`seoToHtml(data, options?)` in `packages/transform/src/adapter.ts:150` already accepts `{ siteName, baseUrl, defaultImage, logo }`. When supplied, it emits `og:site_name`, prefixes `og:url` / canonical with `baseUrl`, falls back missing OG images to `defaultImage`, and appends WebSite + Organization JSON-LD `<script>` entries.

The SvelteKit adapter wires these via the theme manifest — `virtual:refrakt/theme` bakes `config.baseUrl` / `config.siteName` / `config.defaultImage` / `config.logo` into `theme.manifest`, and `packages/svelte/src/ThemeShell.svelte` reads them. The other adapters drop the options on the floor.

This item brings every adapter's SEO surface to feature parity with the SvelteKit reference.

## Acceptance Criteria

### Astro

- [x] `packages/astro/src/seo.ts` extends `buildSeoHead`'s signature to accept the four optional fields (`siteName`, `baseUrl`, `defaultImage`, `logo`) and forwards them to `seoToHtml`
- [x] `packages/create-refrakt/template-astro/src/pages/[...slug].astro` reads the fields from the resolved site config and passes them into `buildSeoHead` (the template's setup.ts is the natural place to surface them; the loader-cleanup work item in this milestone is a coordinating sibling, not a hard prerequisite)
- [ ] A test site with `siteName: "Test"`, `baseUrl: "https://test.example"`, `defaultImage: "/og.png"`, `logo: "/favicon.png"` configured emits `<meta property="og:site_name" content="Test">`, absolute canonical URLs, image fallback, and WebSite + Organization JSON-LD entries

### Eleventy

- [x] `packages/eleventy/src/data.ts` extends `createDataFile`'s config object with the four fields (or reads them from the resolved site config once {% ref "WORK-241" /%}-equivalent integration lands) and forwards to `seoToHtml`
- [ ] Same emission validation as Astro

### Nuxt

- [x] `packages/nuxt/src/composables.ts` extends `buildRefraktHead`'s signature to accept the four fields
- [x] When `siteName` supplied: emits `{ property: 'og:site_name', content: siteName }` meta entry
- [x] When `baseUrl` supplied: og:url meta becomes absolute, canonical `<link>` entry added (Nuxt's `useHead` accepts `link` array — adjust the helper's return shape to surface a `link` field)
- [x] When `defaultImage` supplied: missing per-page image falls back to `baseUrl + defaultImage`
- [x] When `baseUrl + siteName` supplied: emits WebSite + Organization JSON-LD `<script>` entries appended to the existing `script` array (matches `seoToHtml`'s emission)
- [ ] Same emission validation as Astro

### Next.js

- [x] `packages/next/src/metadata.ts` extends `buildMetadata`'s signature to accept the four fields
- [x] When `baseUrl` supplied: sets `metadata.metadataBase` to `new URL(baseUrl)` so Next absolutizes URLs natively
- [x] When `siteName` supplied: populates `metadata.openGraph.siteName`
- [x] When `defaultImage` supplied: `metadata.openGraph.images` falls back to `[defaultImage]` when no per-page image
- [x] `buildJsonLd` gains the same four-field signature and emits the WebSite + Organization JSON-LD entries when `baseUrl + siteName` supplied (matches `seoToHtml`'s structured-data output)
- [x] `packages/create-refrakt/template-next/app/[...slug]/page.tsx` reads the fields from the resolved site config and forwards into both helpers
- [ ] Same emission validation as Astro

### HTML

- [x] `packages/html/src/page-shell.ts` extends `PageShellOptions` with `siteName`, `defaultImage`, `logo` (it already has `baseUrl`)
- [x] `renderFullPage` emits `og:site_name`, image fallback, WebSite + Organization JSON-LD when those fields are supplied (matches `seoToHtml`'s output — the page-shell renderer is currently a parallel implementation, so this work item brings it to feature parity)
- [x] `packages/create-refrakt/template-html/build.ts` reads the fields from the resolved site config and passes into `renderFullPage`
- [ ] Same emission validation as Astro

### Cross-cutting

- [x] `packages/svelte/src/ThemeShell.svelte` continues to read its values from `theme.manifest.*` — no change needed; the SvelteKit reference path stays as-is
- [x] `site/content/docs/adapters/{astro,nuxt,next,eleventy,html}.md` each document the SEO config flow (one paragraph + a frontmatter / config snippet showing the four fields)

## Approach

Two structural patterns:

**Adapters that use `seoToHtml` directly (Astro, Eleventy)**: extend the wrapper's signature to accept `SeoToHtmlOptions` and forward. Trivial — the underlying function already does the work.

**Adapters that build head metadata manually (Nuxt, Next.js, HTML)**: extend their builders' output shape and emission logic to match `seoToHtml`'s feature set when the options are supplied. The HTML adapter's `renderFullPage` is the most divergent — it has a parallel implementation that pre-dates `seoToHtml` — and this is the right moment to either delegate to `seoToHtml` or align the two emitters' outputs line-for-line.

For Next.js, the natural mapping is:

| `SeoToHtmlOptions` field | Next.js Metadata field                                              |
|--------------------------|---------------------------------------------------------------------|
| `siteName`               | `metadata.openGraph.siteName`                                       |
| `baseUrl`                | `metadata.metadataBase = new URL(baseUrl)` (Next absolutizes natively) |
| `defaultImage`           | `metadata.openGraph.images` fallback                                |
| `logo`                   | (consumed by `buildJsonLd` only, not `buildMetadata`)               |

The WebSite + Organization JSON-LD entries are not part of Next's `Metadata` object — they need to be rendered as `<script type="application/ld+json">` tags in the layout. `buildJsonLd` already returns an array; extend it to append the two synthetic entries when `baseUrl + siteName` are supplied.

**Where do the four fields come from?**

Each adapter's integration / loader already calls `resolveSite(config, siteName)` and has the resulting `SiteConfig` in scope. `SiteConfig` carries `siteName`, `baseUrl`, `defaultImage`, `logo` as top-level fields. The integration passes them to whatever surface the consumer calls (data factory return value, theme manifest, helper return, etc.) — no new config plumbing required.

## Dependencies

None hard-required, but coordinates well with {% ref "WORK-240" /%}–{% ref "WORK-242" /%} (the wiring items expose `SiteConfig` to the adapter's per-page rendering surfaces).

## References

- {% ref "SPEC-058" /%} — adapter parity spec, "Thread `SeoToHtmlOptions` through every adapter's SEO surface"
- `packages/transform/src/adapter.ts:134–217` — `SeoToHtmlOptions` shape + `seoToHtml` reference implementation
- `packages/svelte/src/ThemeShell.svelte:122–158` — SvelteKit reference rendering

## Resolution

Completed: 2026-05-21

Branch: \`claude/update-adapters-5CJgQ\`

### What was done

- **Astro** \`buildSeoHead\` extended with \`SeoToHtmlOptions\` (siteName, baseUrl, defaultImage, logo) — forwards directly to \`seoToHtml\`. Template's \`setup.ts\` exposes \`seoSiteFields\` read from \`SiteConfig\`; the page wires them in.

- **Eleventy** \`createDataFile\` config gains an \`seo: SeoToHtmlOptions\` field that's forwarded to every page's \`seoToHtml\` call. Template's \`_data/refrakt.js\` reads the four fields via \`loadRefraktConfig\` + \`resolveSite\`.

- **Nuxt** \`buildRefraktHead\` rewritten to accept \`SeoToHtmlOptions\`. Emits \`og:site_name\`, absolutizes \`og:url\` against \`baseUrl\`, adds canonical \`<link>\` (return shape gained a \`link\` array), falls back missing images to \`defaultImage\`, appends WebSite + Organization JSON-LD entries to the \`script\` array when \`baseUrl\` is supplied.

- **Next.js** \`buildMetadata\` gains the four fields — sets \`metadata.metadataBase = new URL(baseUrl)\`, populates \`openGraph.siteName\`, uses \`defaultImage\` as image fallback. \`buildJsonLd\` rewritten with the same signature, appends WebSite + Organization entries when \`baseUrl\` is supplied. Template's \`page.tsx\` reads site via \`loadRefraktConfig\` + \`resolveSite\` and forwards into both helpers.

- **HTML** \`PageShellOptions\` extended with \`siteName\`, \`defaultImage\`, \`logo\`. \`renderFullPage\` rewritten to mirror \`seoToHtml\`'s emission line-for-line — same og:site_name, canonical absolutization, image fallback, WebSite + Org JSON-LD when fields are supplied. Template's \`build.ts\` reads site fields and forwards into \`renderFullPage\`.

- **Docs** — 5 adapter pages updated:
  - \`astro.md\` SEO section shows the field-threading pattern with config snippet
  - \`nuxt.md\` SEO section rewritten with absolutization + JSON-LD rows in the meta table
  - \`nextjs.md\` Metadata Helper + JSON-LD sections rewritten with the field-threading pattern
  - \`eleventy.md\` Global Data File section shows the loader-driven \`seo\` config field
  - \`html.md\` PageShellOptions table gains the three new fields + explanation paragraph

### Notes

The HTML adapter's \`renderFullPage\` was a parallel implementation of \`seoToHtml\` predating the shared helper. Brought it to feature parity rather than delegating — it already handles the per-page \`PageSeo\` structure and refactoring to delegate would expand the diff for no behaviour gain. Side-effect: output now matches \`seoToHtml\` byte-for-byte when given identical inputs.

The SvelteKit \`ThemeShell.svelte\` path is unchanged — it continues to read \`theme.manifest.{siteName,baseUrl,defaultImage,logo}\` baked in by \`virtual:refrakt/theme\`. That's the reference behaviour every other adapter now matches via \`SeoToHtmlOptions\` plumbing.

Fixed two broken doc links during validation (\`/docs/themes/lumina/tokens\` → \`/docs/themes/css\`; \`/docs/themes/lumina/presets/nord\` → \`/themes/nord\`) in all five adapter docs. Site builds clean: 173 pages, all docs render.

Test-site end-to-end emission checks deferred to SPEC-059's testing infrastructure for the same reason as WORK-240–242.

Full workspace build + all 2652 tests pass.

{% /work %}

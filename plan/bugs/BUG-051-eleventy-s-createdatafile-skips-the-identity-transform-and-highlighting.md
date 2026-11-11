{% bug id="BUG-051" status="fixed" severity="major" source="" tags="" milestone="v0.49.0" pr="refrakt-md/refrakt#801" %}

# Eleventy's createDataFile skips the identity transform and highlighting

## Steps to Reproduce
1. Read `createDataFile` in `packages/eleventy/src/data.ts`.
2. It loads content with `loadContent`, then calls `renderPage({ theme, page })` from `@refrakt-md/transform` (`adapter.ts`), which runs only the layout transform and `renderToHtml`.

## Expected
Pages get the identity transform (BEM classes, structure, field-bag modifiers) and syntax highlighting, as the other adapters apply before rendering.

## Actual
Nothing in the Eleventy path calls the identity transform or the highlight transform, so runes would render without their classes and code without highlighting. Not yet confirmed in a built Eleventy site; found while checking the adapter docs against source (WORK-719).

Related, found at the same time:
- `createDataFile`'s `plugins` option takes plugin objects, not the package names `refrakt.config.json` lists.
- Lumina's `index.css` `@import`s `@refrakt-md/skeleton` as a bare package name, which a browser cannot resolve without a bundler.
- The scaffold's `permalink: "{{ page.url | slug }}/"` may flatten nested URLs.

## Environment
- `@refrakt-md/eleventy` 0.48.x

## Resolution

Completed: 2026-11-11

Branch: `claude/composition-usage-rune-pages-c87ar6`

### What was done
- Confirmed with a real build of the Eleventy scaffold: no identity transform or highlighting, plugins never loaded (`Undefined tag: 'cta'`), the manifest JSON import lacked `with { type: 'json' }` (no build at all on Node 22), pages paginated under Eleventy's reserved `page` rendered blank, the slug permalink flattened nested URLs, and Lumina's bare `@import "@refrakt-md/skeleton"` 404'd.
- `packages/eleventy/src/data.ts`: `createDataFile` loads through `createRefraktLoader` (config's content dir, plugins, theme), applies the identity transform and highlighting to pages and regions; new `configPath`/`site`; `contentDir`/`plugins` ignored with a warning; `highlightCss` per page.
- `packages/content/src/refract-loader.ts`: `basePath` option.
- `packages/eleventy/src/plugin.ts`: `localizeCssImports` copies a bare-imported package beside the stylesheet and rewrites the import.
- Scaffold template and `packages/eleventy/templates/base.njk` fixed (JSON import attribute, `alias: entry`, slash-preserving permalink, `{{ content }}`, highlight CSS); docs updated; tests added in `packages/eleventy/test/`.

### Notes
- Verified by building and serving a scaffolded Eleventy site: 0 errors, no failed requests, fully styled.
- Found BUG-053 (HTML adapter never loads the skeleton layer), filed without a milestone.

{% /bug %}

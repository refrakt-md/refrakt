{% bug id="BUG-051" status="reported" severity="major" source="" tags="" milestone="v0.49.0" %}

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

{% /bug %}

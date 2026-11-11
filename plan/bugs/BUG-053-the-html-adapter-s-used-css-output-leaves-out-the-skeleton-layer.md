{% bug id="BUG-053" status="reported" severity="major" source="" tags="html, adapters, css, skeleton" %}

# The HTML adapter's used-CSS output leaves out the skeleton layer

## Steps to Reproduce
1. Read the CSS step of `packages/create-refrakt/template-html/build.ts`.
2. With used-CSS analysis, it serves `/base.css` plus one file per used rune from Lumina's `styles/runes/` and `styles/layouts/`.
3. Without it, it copies Lumina's `index.css` as `styles.css` unchanged.

## Expected
The page loads `@refrakt-md/skeleton`: the cascade-layer order and the structural CSS (bg layer placement, drawer positioning, figure layout and the rest) that Lumina's skin builds on.

## Actual
Found while fixing BUG-051, by reading the source; not yet confirmed in a built HTML site.
- `base.css` does not import the skeleton, and the per-rune files are Lumina's skin only, so the used-CSS path never loads it.
- The fallback copies `index.css`, whose first line is `@import "@refrakt-md/skeleton"`: a bare package name a browser cannot resolve, so it 404s.

The Eleventy plugin now rewrites such an import and copies the package beside the stylesheet (`localizeCssImports` in `packages/eleventy/src/plugin.ts`); the HTML template could do the same, or the used-CSS analysis could include the skeleton's files.

## Environment
- `create-refrakt` HTML template, `@refrakt-md/html` 0.48.x

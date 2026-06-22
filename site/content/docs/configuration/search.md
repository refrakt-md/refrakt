---
title: Setting up Search
description: How the built-in search works, how to enable results with Pagefind, and how to turn search off.
---

# Setting up Search

refrakt ships a search UI as **layout chrome** — the search button in the header
and the `Cmd/Ctrl+K` dialog are part of every layout (`default`, `docs`, `blog`,
`plan`). The UI is always present, but it only returns results once you build a
**[Pagefind](https://pagefind.app/)** index and serve it from your site.

This split is deliberate: refrakt renders the chrome, and Pagefind — a static,
zero-config search index that runs as a post-build step over your generated
HTML — provides the data. There is no search server and nothing to host beyond
your static files.

## How it works

1. Every layout renders a search trigger (`data-search-trigger`) and wires the
   `search` behavior, which also binds `Cmd/Ctrl+K`.
2. On first open, the behavior lazy-loads `/pagefind/pagefind.js`.
3. If that file exists, queries run against the index and results render in the
   dialog. If it's missing, the dialog shows **"Search is not available."**

So a fresh project shows a working button that opens to an empty
"not available" state — because no index has been built yet. Enabling search is
a matter of generating that index.

{% hint type="note" %}
The index only exists in a **production build**. Under `vite dev` there's no
`/pagefind/` directory, so search will always say "not available" in dev. Test
search against `npm run build && npm run preview`.
{% /hint %}

## Enabling results (Pagefind)

Pagefind indexes the HTML your site emits, looking for the `data-pagefind-body`
attribute. refrakt's layouts already place that attribute on each page's main
content region, so there's nothing to annotate — you only need to run Pagefind
after the build and serve its output at `/pagefind/`.

### SvelteKit

Add Pagefind as a dev dependency and run it as a post-build step:

```shell
npm install --save-dev pagefind
```

```json
// package.json
{
  "scripts": {
    "build": "vite build && pagefind --site build"
  }
}
```

`vite build` writes the static site to `build/`; `pagefind --site build` indexes
that directory and writes `build/pagefind/`, which is served at `/pagefind/`.

{% hint type="note" %}
Projects scaffolded with `npx create-refrakt` (SvelteKit) now include this
`pagefind` dependency and build step out of the box. Existing projects can add
the two lines above.
{% /hint %}

### Other adapters

The principle is identical for every adapter — build, then run Pagefind over the
output directory:

| Adapter | Output dir | Build script |
|---------|-----------|--------------|
| SvelteKit (adapter-static) | `build` | `vite build && pagefind --site build` |
| Astro | `dist` | `astro build && pagefind --site dist` |
| Eleventy | `_site` | `eleventy && pagefind --site _site` |
| Next (static export) | `out` | `next build && pagefind --site out` |
| Nuxt (static) | `.output/public` | `nuxt generate && pagefind --site .output/public` |

Adjust the directory to match your adapter's configured output. The
`data-pagefind-body` content region is emitted the same way across all adapters,
so the index covers your page content automatically.

## Turning search off

If a site doesn't want search at all, set `search: false` in its `SiteConfig`.
This removes the search chrome entirely — the trigger button is never rendered
and the `search` behavior (including the `Cmd/Ctrl+K` shortcut) is never
initialized, so there's no empty "not available" dialog to stumble into.

```json
{
  "sites": {
    "main": {
      "contentDir": "./content",
      "theme": "@refrakt-md/lumina",
      "search": false
    }
  }
}
```

`search` defaults to `true`. Leaving it unset keeps the button — pair that with
the Pagefind build step above to make it return results.

### How the opt-out reaches each adapter

The **SvelteKit** adapter wires this automatically: the Vite plugin reads
`search` from `refrakt.config.json` and strips the search chrome from every
layout when it assembles the theme. Nothing else to do.

The other adapters are wired manually (you assemble the theme and render pages
yourself), so they expose `search` as a passthrough you source from your config:

| Adapter | How to pass it |
|---------|----------------|
| Astro | `<BaseLayout {theme} {page} search={config.search} />` |
| Next.js | `<RefraktContent theme={theme} page={page} search={config.search} />` |
| Nuxt | `renderPage({ theme, page, search: config.search })` |
| Eleventy | `createDataFile({ theme, search: config.search, … })` |
| HTML | `renderPage({ theme, page, search: config.search })` |

Under the hood every adapter funnels through the same stripping helper
(`withoutSearchLayout` / `withoutSearch`, exported from `@refrakt-md/transform`),
so the result is identical: no trigger button, and the `search` behavior — `Cmd/Ctrl+K`
included — is never initialized.

## Tuning what gets indexed

Indexing is controlled by Pagefind's own attributes on the rendered HTML.
refrakt sets `data-pagefind-body` on the main content region for you; from there
you can use Pagefind's standard attributes (e.g. `data-pagefind-ignore` on an
element to exclude it) directly in your content or theme. See the
[Pagefind indexing docs](https://pagefind.app/docs/indexing/) for the full set.

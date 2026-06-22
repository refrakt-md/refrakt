---
"@refrakt-md/transform": minor
"@refrakt-md/types": minor
"@refrakt-md/sveltekit": minor
"create-refrakt": minor
---

Add a `search` opt-out and document search setup.

- New `SiteConfig.search` option (`refrakt.config.json`). Defaults to `true`;
  set `false` to omit the search chrome entirely — no trigger button and the
  `search` behavior (including `Cmd/Ctrl+K`) is never initialized. Honored by
  the SvelteKit adapter via a new exported `withoutSearch(layouts)` helper from
  `@refrakt-md/transform`.
- `create-refrakt` SvelteKit scaffolds now wire Pagefind out of the box:
  `pagefind` devDependency + a `vite build && pagefind --site build` build step,
  so new projects get working search results instead of an empty
  "Search is not available." dialog.
- New docs page "Setting up Search" covering how the Pagefind index is built and
  served, the dev-vs-production gotcha, per-adapter build steps, and the
  `search: false` opt-out.

Also unifies the two header buttons: the theme toggle now shares the search
trigger's chrome (surface fill, full radius, muted colour, primary hover), and
the collapsed mobile search trigger is fully rounded to match the toggle.

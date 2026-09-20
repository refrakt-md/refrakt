---
'create-refrakt': minor
'@refrakt-md/sveltekit': minor
'@refrakt-md/eleventy': minor
'@refrakt-md/content': minor
'@refrakt-md/editor': minor
'@refrakt-md/astro': minor
'@refrakt-md/nuxt': minor
'@refrakt-md/next': minor
---

Pipeline diagnostics now print in the adapter dev server.

Previously a dev session showed **no pipeline diagnostics of any severity** —
the data was there (`loadContent` runs in dev via `createRefraktLoader` and
populates `site.pipelineWarnings`), but nothing read it. Content validation
findings, including error-severity ones, were computed on every edit and
discarded. They now appear on first load and again on each HMR reload, so a
mistyped rune name or an undefined attribute surfaces while you are editing
rather than at build time.

New in `@refrakt-md/content`:

- `PipelineReporter` — a `(stats, warnings) => void` sink.
- `stderrReporter` — the default, writing `formatPipelineSummary` to stderr.
- A `reporter` option on `loadContent`, `loadContentFromTree`,
  `createSiteLoader`, `createVirtualSiteLoader` and `createRefraktLoader`.
- An options-bag overload for `loadContent`, beside its existing positional
  form. **The positional form is unchanged and still exported** — no consumer
  needs to migrate.

Reporting happens once per *actual* content load: a cached site returned
without re-loading does not re-report, so dev prints per reload rather than per
request. `loadContent` itself stays silent unless given a reporter; the stderr
default lives on the loaders, so calling the library directly prints nothing it
did not print before.

Adapters no longer format their own summary — sveltekit, eleventy, astro, nuxt,
next and the HTML scaffold template all route through the reporter. Build output
is byte-identical.

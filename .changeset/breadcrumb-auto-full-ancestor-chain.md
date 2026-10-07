---
'@refrakt-md/runes': patch
---

`breadcrumb auto` renders the full ancestor chain at every depth (BUG-018)

A page's `parentUrl` used to be spelled with a trailing slash (`/docs/`), while
the router registers pages without one (`/docs`). Every lookup keyed on it
missed below depth 1, so four things were broken on every site with nested
content:

- `{% breadcrumb auto=true %}` on `/docs/api/ref` rendered and published `Ref`
  alone instead of `Home > Docs > API > Ref`
- the aggregated `pageTree` was flat, with every page a direct child of the root
- `{% nav auto=true %}` on a section index such as `/docs` found no child pages
- `{% pagination auto=true %}` on a nested section index was not suppressed

`parentUrl` is now spelled exactly as the parent page's `url` is, so all four
resolve. When no page sits at the parent path, `parentUrl` is that path without
the trailing slash. A query that matched the old value (`parentUrl:/docs/`) must
use `parentUrl:/docs` instead. The breadcrumb walk now steps over a directory
that has no index page instead of stopping there. An ancestor that is on the
breadcrumb path but has no page entry now produces a pipeline warning. Before,
it was dropped without one.

Pages using `breadcrumb auto` below depth 1 change their rendered HTML and their
`BreadcrumbList` JSON-LD. Structure contracts and the SEO baseline are
unchanged, because the baseline harness transforms fixtures one page at a time
and does not run the cross-page pipeline.
